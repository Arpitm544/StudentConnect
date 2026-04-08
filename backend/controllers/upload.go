package controllers

import (
	"fmt"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"backend/services"
	"github.com/gin-gonic/gin"
)

func UploadHandler(c *gin.Context) {
	file, header, err := c.Request.FormFile("attachment")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse file upload: " + err.Error()})
		return
	}
	defer file.Close()

	// Validate file type
	contentType := header.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "image/") && contentType != "application/pdf" {
		c.JSON(http.StatusUnsupportedMediaType, gin.H{"error": "Only images and PDFs are allowed"})
		return
	}

	// Generate unique filename to avoid overriding
	filename := fmt.Sprintf("%d-%s", time.Now().UnixNano(), filepath.Base(header.Filename))

	// Ensure there are no spaces or special characters causing problems in the URL
	filename = strings.ReplaceAll(filename, " ", "_")

	// Upload to S3
	url, err := services.UploadFile(file, filename)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload file: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"url": url})
}
