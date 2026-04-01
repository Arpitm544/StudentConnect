package controllers

import (
	"database/sql"
	"log"
	"net/http"

	"backend/config"
	"backend/models"
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

	query := "INSERT INTO users (name, email, password) VALUES ($1, $2, $3)"
	if _, err := config.DB.Exec(query, input.Name, input.Email, hashedPassword); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

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

	if input.Email == "" || input.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email and password are required"})
		return
	}

	var user models.User
	query := "SELECT id, name, email, password FROM users WHERE email = $1"
	err := config.DB.QueryRow(query, input.Email).Scan(&user.ID, &user.Name, &user.Email, &user.Password)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	if !utils.CheckPasswordHash(input.Password, user.Password) {
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

// CheckAuth verifies the JWT stored in the `token` cookie.
// This is used by the frontend to restore session state after refresh.
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

// GetProfile retrieves the profile details of the authenticated user
func GetProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var user models.User
	query := "SELECT id, name, email, created_at FROM users WHERE id = $1"
	err := config.DB.QueryRow(query, userID).Scan(&user.ID, &user.Name, &user.Email, &user.CreatedAt)
	if err != nil {
		log.Println("GetProfile Error:", err)
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":         user.ID,
		"name":       user.Name,
		"email":      user.Email,
		"created_at": user.CreatedAt,
	})
}

// UpdateProfile updates the profile of the authenticated user
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
