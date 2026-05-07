package controllers

import (
	"backend/config"
	"backend/services"
	"fmt"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

func JoinWaitlist(c *gin.Context) {
	var input struct {
		Email string `json:"email"`
	}

	if err := c.BindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email is required"})
		return
	}

	if input.Email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email cannot be empty"})
		return
	}

	_, err := config.DB.Exec("INSERT INTO waitlist (email) VALUES ($1) ON CONFLICT (email) DO NOTHING", input.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to join waitlist"})
		return
	}

	adminEmail := os.Getenv("ADMIN_EMAIL")
	if adminEmail != "" {
		go func() {
			subject := "New Waitlist Signup: " + input.Email
			body := fmt.Sprintf("<html><body><h3>New Pro Waitlist Signup</h3><p>Email: <b>%s</b></p></body></html>", input.Email)
			_ = services.SendEmail([]string{adminEmail}, subject, body, true)
		}()
	}

	c.JSON(http.StatusOK, gin.H{"message": "Successfully joined the waitlist!"})
}
