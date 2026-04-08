package controllers

import (
	"context"
	"database/sql"
	"net/http"
	"strings"

	"backend/config"
	"backend/models"
	"backend/services"
	"backend/utils"

	"github.com/gin-gonic/gin"
)

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

	query := "INSERT INTO users (name, email, password, provider) VALUES ($1, $2, $3, 'password')"
	if _, err := config.DB.Exec(query, input.Name, input.Email, hashedPassword); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	// Send Welcome Email
	services.SendWelcomeEmail(input.Email, input.Name)

	c.JSON(http.StatusCreated, gin.H{"message": "User created successfully"})
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
	query := "SELECT id, name, email, password FROM users WHERE email = $1"
	var password sql.NullString
	err := config.DB.QueryRow(query, input.Email).Scan(&user.ID, &user.Name, &user.Email, &password)
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

	tokenString, err := utils.GenerateToken(int(user.ID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.SetCookie("token", tokenString, 86400, "/", "", false, true)
	c.JSON(http.StatusOK, gin.H{"message": "Login successful"})
}

func Logout(c *gin.Context) {
	c.SetCookie("token", "", -1, "/", "", false, true)
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
		_, _ = config.DB.Exec("UPDATE users SET name = $1, email = $2, photo_url = $3, provider = 'google' WHERE id = $4", name, email, nullableString(picture), userID)
	} else if err == sql.ErrNoRows {
		// 2. UID not found. Check if a user with the same email exists but no UID.
		err = config.DB.QueryRow("SELECT id FROM users WHERE email = $1", email).Scan(&userID)
		if err == nil {
			// 3. Email found! User exists (maybe via password provider). Link the account with the UID.
			_, err = config.DB.Exec("UPDATE users SET uid = $1, name = $2, photo_url = $3, provider = 'google' WHERE id = $4", uid, name, nullableString(picture), userID)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error linking account: " + err.Error()})
				return
			}
		} else if err == sql.ErrNoRows {
			// 4. Neither UID nor Email found. Create a new user.
			err = config.DB.QueryRow(
				"INSERT INTO users (uid, name, email, photo_url, provider) VALUES ($1, $2, $3, $4, 'google') RETURNING id",
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
	c.SetCookie("token", tokenString, 86400, "/", "", false, true)

	c.JSON(http.StatusOK, gin.H{
		"id":        userID,
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

	c.JSON(http.StatusOK, gin.H{
		"authenticated": true,
		"user_id":       userID,
	})
}

func GetProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var user models.User
	query := "SELECT id, uid, name, email, photo_url, provider, created_at FROM users WHERE id = $1"
	var uid sql.NullString
	var photo sql.NullString
	err := config.DB.QueryRow(query, userID).Scan(&user.ID, &uid, &user.Name, &user.Email, &photo, &user.Provider, &user.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":         user.ID,
		"uid":        nullToEmpty(uid),
		"name":       user.Name,
		"email":      user.Email,
		"photo_url":  nullToEmpty(photo),
		"provider":   user.Provider,
		"created_at": user.CreatedAt,
	})
}

func UpdateProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var input struct {
		Name string `json:"name"`
	}

	if err := c.BindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	if input.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name cannot be empty"})
		return
	}

	query := "UPDATE users SET name = $1 WHERE id = $2"
	_, err := config.DB.Exec(query, input.Name, userID)
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
