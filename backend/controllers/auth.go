package controllers

import (
	"context"
	"crypto/rand"
	"database/sql"
	"math/big"
	"net/http"
	"strconv"
	"strings"
	"time"

	"backend/config"
	"backend/models"
	"backend/services"
	"backend/utils"
	"fmt"
	"os"

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

	hashedPassword, err := utils.HashPassword(input.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	otp, err := generateVerificationOTP()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate verification code"})
		return
	}
	expiry := time.Now().Add(10 * time.Minute)
	sentAt := time.Now()

	// Check if user already exists
	var existingID int64
	var existingIsVerified bool
	var existingProvider string
	err = config.DB.QueryRow("SELECT id, is_verified, provider FROM users WHERE email = $1", input.Email).Scan(&existingID, &existingIsVerified, &existingProvider)

	if err == nil {
		// User exists
		if existingIsVerified {
			c.JSON(http.StatusConflict, gin.H{"error": "A user with this email already exists"})
			return
		}

		if existingProvider != "password" {
			c.JSON(http.StatusConflict, gin.H{"error": "This email is associated with a social login. Please use Google to sign in."})
			return
		}

		// User exists but is NOT verified. Resend OTP and update password.
		if _, err := config.DB.Exec(
			"UPDATE users SET password = $1, verification_token = $2, verification_token_expires = $3, verification_sent_at = $4 WHERE id = $5",
			hashedPassword, otp, expiry, sentAt, existingID,
		); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update verification code"})
			return
		}
	} else if err == sql.ErrNoRows {
		// New user
		query := `
			INSERT INTO users
				(name, email, password, provider, email_verified, is_verified, verification_token, verification_token_expires, verification_sent_at)
			VALUES
				($1, $2, $3, 'password', FALSE, FALSE, $4, $5, $6)`
		if _, err := config.DB.Exec(query, input.Name, input.Email, hashedPassword, otp, expiry, sentAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user: " + err.Error()})
			return
		}
	} else {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error checking user existence"})
		return
	}

	if err := services.SendVerificationEmail(input.Email, input.Name, otp); err != nil {
		c.JSON(http.StatusCreated, gin.H{
			"message": "User created, but OTP email could not be sent right now. Please use resend verification.",
		})
		return
	}

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

	var user models.User

	query := "SELECT id, name, email, password, provider, COALESCE(is_verified, FALSE) FROM users WHERE email = $1"
	var password sql.NullString
	var provider string
	var isVerified bool

	err := config.DB.QueryRow(query, input.Email).Scan(&user.ID, &user.Name, &user.Email, &password, &provider, &isVerified)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	if !password.Valid || !utils.CheckPasswordHash(input.Password, password.String) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	if provider == "password" && !isVerified {
		// Generate and send new OTP if unverified
		otp, _ := generateVerificationOTP()
		expiry := time.Now().Add(10 * time.Minute)
		config.DB.Exec("UPDATE users SET verification_token = $1, verification_token_expires = $2, verification_sent_at = $3 WHERE id = $4", otp, expiry, time.Now(), user.ID)
		services.SendVerificationEmail(user.Email, user.Name, otp)

		c.JSON(http.StatusForbidden, gin.H{
			"error":      "Please verify your email first. A new OTP has been sent to your email.",
			"error_code": "EMAIL_NOT_VERIFIED",
		})
		return
	}

	tokenString, err := utils.GenerateToken(int(user.ID))

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.SetSameSite(http.SameSiteNoneMode)
	// Force Secure=true for SameSite=None (it's mandatory in modern browsers)
	c.SetCookie("token", tokenString, 86400, "/", "", true, true)
	c.JSON(http.StatusOK, gin.H{"message": "Login successful"})
}

func Logout(c *gin.Context) {
	c.SetSameSite(http.SameSiteNoneMode)
	c.SetCookie("token", "", -1, "/", "", isSecure, true)
	c.JSON(http.StatusOK, gin.H{"message": "Logout successful"})
}

func GoogleAuth(c *gin.Context) {
	var input struct {
		Token string `json:"token"`
	}

	if err := c.BindJSON(&input); err != nil || strings.TrimSpace(input.Token) == "" {
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

	if uid == "" || email == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Token missing required claims"})
		return
	}
	if name == "" {
		name = strings.Split(email, "@")[0]
	}

	// ROBUST UPSERT LOGIC
	// First, check if a user with this UID already exists.
	var userID int64
	err = config.DB.QueryRow("SELECT id FROM users WHERE uid = $1", uid).Scan(&userID)

	if err == nil {
		// 1. UID matches. User already exists.
		// Best-effort update of profile info.
		_, _ = config.DB.Exec("UPDATE users SET name = $1, email = $2, photo_url = $3, provider = 'google', email_verified = TRUE, is_verified = TRUE WHERE id = $4", name, email, nullableString(picture), userID)
	} else if err == sql.ErrNoRows {
		// 2. UID not found. Check if a user with the same email exists but no UID.
		err = config.DB.QueryRow("SELECT id FROM users WHERE email = $1", email).Scan(&userID)
		if err == nil {
			// 3. Email found! User exists (maybe via password provider). Link the account with the UID.
			_, err = config.DB.Exec("UPDATE users SET uid = $1, name = $2, photo_url = $3, provider = 'google', email_verified = TRUE, is_verified = TRUE WHERE id = $4", uid, name, nullableString(picture), userID)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error linking account: " + err.Error()})
				return
			}
		} else if err == sql.ErrNoRows {
			// 4. Neither UID nor Email found. Create a new user.
			err = config.DB.QueryRow(
				"INSERT INTO users (uid, name, email, photo_url, provider, email_verified, is_verified) VALUES ($1, $2, $3, $4, 'google', TRUE, TRUE) RETURNING id",
				uid, name, email, nullableString(picture),
			).Scan(&userID)

			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user: " + err.Error()})
				return
			}

			// Send Welcome Email
			services.SendWelcomeEmail(email, name)
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
			return
		}
	} else {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}

	// Create app session (JWT cookie)
	tokenString, err := utils.GenerateToken(int(userID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate session"})
		return
	}
	c.SetSameSite(http.SameSiteNoneMode)
	c.SetCookie("token", tokenString, 86400, "/", "", true, true)

	c.JSON(http.StatusOK, gin.H{
		"id":        strconv.FormatInt(userID, 10),
		"uid":       uid,
		"name":      name,
		"email":     email,
		"photo_url": picture,
	})
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
	if err := config.DB.QueryRow("SELECT COALESCE(is_verified, FALSE) FROM users WHERE id = $1", userID).Scan(&isVerified); err != nil {
		c.JSON(http.StatusOK, gin.H{"authenticated": false})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"authenticated":  true,
		"user_id":        strconv.Itoa(userID),
		"is_verified":    isVerified,
		"email_verified": isVerified,
	})
}

func VerifyEmail(c *gin.Context) {
	var input struct {
		Email string `json:"email"`
		OTP   string `json:"otp"`
	}

	if err := c.BindJSON(&input); err != nil || strings.TrimSpace(input.Email) == "" || strings.TrimSpace(input.OTP) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email and OTP are required"})
		return
	}

	var userID int64
	var storedOTP sql.NullString
	var expiresAt time.Time
	err := config.DB.QueryRow(
		"SELECT id, verification_token, verification_token_expires FROM users WHERE email = $1 AND provider = 'password' AND COALESCE(is_verified, FALSE) = FALSE",
		strings.TrimSpace(input.Email),
	).Scan(&userID, &storedOTP, &expiresAt)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid email or OTP"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	if !storedOTP.Valid || strings.TrimSpace(input.OTP) != strings.TrimSpace(storedOTP.String) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid email or OTP"})
		return
	}

	if time.Now().After(expiresAt) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "OTP expired"})
		return
	}

	if _, err := config.DB.Exec(
		"UPDATE users SET email_verified = TRUE, is_verified = TRUE, verification_token = NULL, verification_token_expires = NULL, verification_sent_at = NULL WHERE id = $1",
		userID,
	); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify email"})
		return
	}

	tokenString, err := utils.GenerateToken(int(userID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.SetSameSite(http.SameSiteNoneMode)
	c.SetCookie("token", tokenString, 86400, "/", "", true, true)
	c.JSON(http.StatusOK, gin.H{"message": "Email verified successfully"})
}

func ResendVerification(c *gin.Context) {
	var input struct {
		Email string `json:"email"`
	}
	const resendCooldown = 2 * time.Minute

	if err := c.BindJSON(&input); err != nil || strings.TrimSpace(input.Email) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email is required"})
		return
	}

	var userID int64
	var userName string
	var email string
	var provider string
	var isVerified bool
	var sentAt sql.NullTime

	err := config.DB.QueryRow(
		"SELECT id, name, email, provider, COALESCE(is_verified, FALSE), verification_sent_at FROM users WHERE email = $1",
		input.Email,
	).Scan(&userID, &userName, &email, &provider, &isVerified, &sentAt)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusOK, gin.H{"message": "If this account exists, a verification email has been sent."})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	if provider != "password" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "This account uses social login and does not require manual email verification"})
		return
	}

	if isVerified {
		c.JSON(http.StatusOK, gin.H{"message": "Email is already verified"})
		return
	}

	if sentAt.Valid && time.Since(sentAt.Time) < resendCooldown {
		c.JSON(http.StatusTooManyRequests, gin.H{"error": "Please wait 2 minutes before requesting another verification email"})
		return
	}

	otp, err := generateVerificationOTP()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate OTP"})
		return
	}
	expiry := time.Now().Add(10 * time.Minute)
	now := time.Now()

	if _, err := config.DB.Exec(
		"UPDATE users SET verification_token = $1, verification_token_expires = $2, verification_sent_at = $3 WHERE id = $4",
		otp, expiry, now, userID,
	); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to store OTP"})
		return
	}

	if err := services.SendVerificationEmail(email, userName, otp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send OTP email"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Verification OTP sent"})
}

func GetProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var user models.User

	query := "SELECT id, uid, name, email, photo_url, provider, field, college_name, year, is_verified, created_at FROM users WHERE id = $1"

	var uid, photo, field, college_name, year sql.NullString

	err := config.DB.QueryRow(query, userID).Scan(&user.ID, &uid, &user.Name, &user.Email, &photo, &user.Provider, &field, &college_name, &year, &user.IsVerified, &user.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":           strconv.FormatUint(uint64(user.ID), 10),
		"uid":          nullToEmpty(uid),
		"name":         user.Name,
		"email":        user.Email,
		"photo_url":    nullToEmpty(photo),
		"provider":     user.Provider,
		"field":        nullToEmpty(field),
		"college_name": nullToEmpty(college_name),
		"year":           nullToEmpty(year),
		"is_verified":     user.IsVerified,
		"email_verified": user.IsVerified,
		"created_at":     user.CreatedAt,
	})
}

func UpdateProfile(c *gin.Context) {

	userID, exists := c.Get("user_id")

	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	if err := c.Request.ParseMultipartForm(10 << 20); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse multipart form: " + err.Error()})
		return
	}

	name := c.Request.FormValue("name")
	field := c.Request.FormValue("field")
	collegeName := c.Request.FormValue("college_name")
	year := c.Request.FormValue("year")

	if name == "" {
		// Log parsed form to help diagnose
		fields := []string{}
		if c.Request.MultipartForm != nil {
			for k := range c.Request.MultipartForm.Value {
				fields = append(fields, k)
			}
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name cannot be empty. Parsed keys: " + strings.Join(fields, ", ")})
		return
	}

	updateQuery := "UPDATE users SET name = $1, field = $2, college_name = $3, year = $4"
	args := []interface{}{name, nullableString(field), nullableString(collegeName), nullableString(year)}
	argID := 5

	file, header, err := c.Request.FormFile("photo")

	if err == nil && file != nil {
		defer file.Close()
		photoURL, uploadErr := services.UploadFile(file, header.Filename)
		if uploadErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload photo"})
			return
		}

		updateQuery += fmt.Sprintf(", photo_url = $%d", argID)
		args = append(args, photoURL)
		argID++
	}

	updateQuery += fmt.Sprintf(" WHERE id = $%d", argID)
	args = append(args, userID)

	_, err = config.DB.Exec(updateQuery, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Profile updated successfully"})
}

func nullableString(v string) interface{} {
	if strings.TrimSpace(v) == "" {
		return nil
	}
	return v
}

func nullToEmpty(ns sql.NullString) string {
	if ns.Valid {
		return ns.String
	}
	return ""
}
