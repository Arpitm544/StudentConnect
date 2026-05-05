package controllers

import (
	"context"
	"crypto/rand"
	"database/sql"
	"fmt"
	"math/big"
	"net/http"
	"os"
	"strconv"
	"time"

	"backend/config"
	"backend/models"
	"backend/services"
	"backend/utils"

	"github.com/gin-gonic/gin"
)

var isSecure = os.Getenv("GIN_MODE") == "release"

func generateVerificationOTP() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", n.Int64()), nil
}

func Signup(c *gin.Context) {

	var input struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.BindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	if input.Name == "" || input.Email == "" || len(input.Password) < 6 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input, ensure all fields are provided and password is at least 6 characters"})
		return
	}

	hashedPassword, _ := utils.HashPassword(input.Password)
	otp, _ := generateVerificationOTP()
	expiry := time.Now().Add(10 * time.Minute)

	id, isVerified, provider, err := services.CheckUserExists(input.Email)
	if err == nil { // User exists
		if isVerified {
			c.JSON(http.StatusConflict, gin.H{"error": "A user with this email already exists"})
			return
		}
		if provider != "password" {
			c.JSON(http.StatusConflict, gin.H{"error": "This email is associated with a social login. Please use Google."})
			return
		}
		// Update existing unverified user
		config.DB.Exec("UPDATE users SET password = $1, verification_token = $2, verification_token_expires = $3, verification_sent_at = $4 WHERE id = $5", hashedPassword, otp, expiry, time.Now(), id)
	} else { // New user
		query := `INSERT INTO users (name, email, password, provider, email_verified, is_verified, verification_token, verification_token_expires, verification_sent_at) VALUES ($1, $2, $3, 'password', FALSE, FALSE, $4, $5, $6)`
		if _, err := config.DB.Exec(query, input.Name, input.Email, hashedPassword, otp, expiry, time.Now()); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
			return
		}
	}

	_ = services.SendVerificationEmail(input.Email, input.Name, otp)
	c.JSON(http.StatusCreated, gin.H{"message": "User created. 6-digit OTP sent to your email."})
}

func Login(c *gin.Context) {

	var input struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.BindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	user, err := services.FindUserByEmail(input.Email)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	if user.Password == nil || !utils.CheckPasswordHash(input.Password, *user.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	tokenString, _ := utils.GenerateToken(int(user.ID))
	setAuthCookie(c, tokenString)
	c.JSON(http.StatusOK, gin.H{"message": "Login successful"})
}

func GoogleAuth(c *gin.Context) {
	var input struct {
		Token string `json:"token"`
	}
	if err := c.BindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Token is required"})
		return
	}

	decoded, err := config.FirebaseAuth.VerifyIDToken(context.Background(), input.Token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid Firebase token"})
		return
	}

	uid := decoded.UID
	email, _ := decoded.Claims["email"].(string)
	name, _ := decoded.Claims["name"].(string)
	picture, _ := decoded.Claims["picture"].(string)

	var userID int64

	err = config.DB.QueryRow("SELECT id FROM users WHERE uid = $1", uid).Scan(&userID)
	if err != nil {
		err = config.DB.QueryRow("SELECT id FROM users WHERE email = $1", email).Scan(&userID)
		if err == nil { // Link existing email to UID
			config.DB.Exec("UPDATE users SET uid = $1, provider = 'google', is_verified = TRUE WHERE id = $2", uid, userID)
		} else { // Create new
			config.DB.QueryRow("INSERT INTO users (uid, name, email, photo_url, provider, is_verified) VALUES ($1, $2, $3, $4, 'google', TRUE) RETURNING id", uid, name, email, services.NullableString(picture)).Scan(&userID)
			services.SendWelcomeEmail(email, name)
		}
	}

	tokenString, _ := utils.GenerateToken(int(userID))
	setAuthCookie(c, tokenString)
	c.JSON(http.StatusOK, gin.H{"id": strconv.FormatInt(userID, 10), "name": name, "email": email})
}

func CheckAuth(c *gin.Context) {
	token, err := c.Cookie("token")
	if err != nil || token == "" {
		c.JSON(http.StatusOK, gin.H{"authenticated": false})
		return
	}

	userID, err := utils.ValidateToken(token)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"authenticated": false})
		return
	}

	var isVerified bool
	config.DB.QueryRow("SELECT COALESCE(is_verified, FALSE) FROM users WHERE id = $1", userID).Scan(&isVerified)
	c.JSON(http.StatusOK, gin.H{"authenticated": true, "user_id": strconv.Itoa(userID), "is_verified": isVerified})
}

func Logout(c *gin.Context) {
	setAuthCookie(c, "")
	c.JSON(http.StatusOK, gin.H{"message": "Logout successful"})
}
func GetProfile(c *gin.Context) {
	userID, _ := c.Get("user_id")
	var user models.User
	var uid, photo, field, college, year sql.NullString

	query := "SELECT id, uid, name, email, photo_url, provider, field, college_name, year, is_verified, created_at FROM users WHERE id = $1"
	err := config.DB.QueryRow(query, userID).Scan(&user.ID, &uid, &user.Name, &user.Email, &photo, &user.Provider, &field, &college, &year, &user.IsVerified, &user.CreatedAt)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":   strconv.FormatUint(uint64(user.ID), 10),
		"name": user.Name, "email": user.Email, "photo_url": services.NullToEmpty(photo),
		"field": services.NullToEmpty(field), "college_name": services.NullToEmpty(college), "year": services.NullToEmpty(year),
		"is_verified": user.IsVerified, "created_at": user.CreatedAt,
	})
}

func UpdateProfile(c *gin.Context) {
	userID, _ := c.Get("user_id")
	if err := c.Request.ParseMultipartForm(10 << 20); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse form"})
		return
	}

	name := c.Request.FormValue("name")
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name cannot be empty"})
		return
	}
	query := "UPDATE users SET name = $1, field = $2, college_name = $3, year = $4 WHERE id = $5"
	config.DB.Exec(query, name, services.NullableString(c.Request.FormValue("field")), services.NullableString(c.Request.FormValue("college_name")), services.NullableString(c.Request.FormValue("year")), userID)

	if file, header, err := c.Request.FormFile("photo"); err == nil {
		photoURL, _ := services.UploadFile(file, header.Filename)
		config.DB.Exec("UPDATE users SET photo_url = $1 WHERE id = $2", photoURL, userID)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Profile updated successfully"})
}

// Internal Helper for Cookies
func setAuthCookie(c *gin.Context, token string) {
	maxAge := 86400
	if token == "" {
		maxAge = -1
	}
	if isSecure {
		c.SetSameSite(http.SameSiteNoneMode)
	} else {
		c.SetSameSite(http.SameSiteLaxMode)
	}
	c.SetCookie("token", token, maxAge, "/", "", isSecure, true)
}

// VerifyEmail and ResendVerification omitted for brevity in this example but would follow the same pattern
func VerifyEmail(c *gin.Context) {
	var input struct {
		Email string `json:"email"`
		OTP   string `json:"otp"`
	}
	if err := c.BindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email and OTP required"})
		return
	}

	var userID int64
	var storedOTP sql.NullString
	var expiresAt time.Time

	err := config.DB.QueryRow("SELECT id, verification_token, verification_token_expires FROM users WHERE email = $1 AND provider = 'password' AND is_verified = FALSE", input.Email).Scan(&userID, &storedOTP, &expiresAt)

	if err != nil || !storedOTP.Valid || input.OTP != storedOTP.String || time.Now().After(expiresAt) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired OTP"})
		return
	}

	config.DB.Exec("UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE id = $1", userID)
	tokenString, _ := utils.GenerateToken(int(userID))
	setAuthCookie(c, tokenString)
	c.JSON(http.StatusOK, gin.H{"message": "Email verified successfully"})
}

func ResendVerification(c *gin.Context) {
	var input struct {
		Email string `json:"email"`
	}
	c.BindJSON(&input)

	var id int64
	var name string
	err := config.DB.QueryRow("SELECT id, name FROM users WHERE email = $1 AND is_verified = FALSE", input.Email).Scan(&id, &name)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "If account exists, OTP sent."})
		return
	}

	otp, _ := generateVerificationOTP()
	config.DB.Exec("UPDATE users SET verification_token = $1, verification_token_expires = $2, verification_sent_at = $3 WHERE id = $4", otp, time.Now().Add(10*time.Minute), time.Now(), id)
	services.SendVerificationEmail(input.Email, name, otp)
	c.JSON(http.StatusOK, gin.H{"message": "Verification OTP sent"})
}
