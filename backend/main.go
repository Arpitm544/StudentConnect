package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"
	"fmt"
	"backend/config"
	"backend/routes"
	"backend/services"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load env
	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		log.Fatal("Failed to resolve backend source directory")
	}

	envPath := filepath.Join(filepath.Dir(currentFile), ".env")
	if err := godotenv.Overload(envPath); err != nil {
		log.Println("Note: No backend .env file found, using system environment variables")
	}

	// Connect DB
	config.ConnectDatabase()
	config.InitFirebase()

	// Use release mode if in production
	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	// ✅ Production-Ready CORS
	allowedOrigins := []string{
		"http://localhost:5173",
		"http://localhost:5173/",
		"http://localhost:5174",
		"http://localhost:5174/",
		"http://localhost:5175",
		"http://localhost:5175/",
		"https://main.d63s59pcpq7j4.amplifyapp.com",
		"https://main.d63s59pcpq7j4.amplifyapp.com/",
		"https://main.d3dt3rmwfypl05.amplifyapp.com",
		"https://main.d3dt3rmwfypl05.amplifyapp.com/",
		"https://api.tasknest.tech",
		"https://api.tasknest.tech/",
		"https://web.tasknest.tech",
		"https://web.tasknest.tech/",
		"https://studentconnect-n538.onrender.com/",
		"https://studentconnect-n538.onrender.com",
		"https://student-connect-tan.vercel.app/",
		"https://student-connect-tan.vercel.app",
	}

	// Add production domains from environment variable
	if prodDomain := os.Getenv("PRODUCTION_DOMAIN"); prodDomain != "" {
		if !strings.HasPrefix(prodDomain, "http") {
			prodDomain = "https://" + prodDomain
		}
		allowedOrigins = append(allowedOrigins, prodDomain)
	}

	r.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "Accept", "X-Requested-With"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// ✅ Manual OPTIONS catch-all
	r.OPTIONS("/*path", func(c *gin.Context) {
		c.Status(204)
	})

	// ✅ Support Firebase Popup Authentication
	r.Use(func(c *gin.Context) {
		fmt.Printf("DEBUG: Incoming %s %s\n", c.Request.Method, c.Request.URL.Path)
		c.Header("Cross-Origin-Opener-Policy", "same-origin-allow-popups")
		c.Header("Cross-Origin-Embedder-Policy", "unsafe-none")
		c.Next()
	})

	// Routes
	routes.SetupRoutes(r)

	// API welcome message
	r.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "Welcome to TaskNest Backend"})
	})

	// ✅ Serve Static Frontend (Production Only)
	// This allows the Go backend to serve the compiled frontend if the 'dist' folder exists.
	workDir, _ := os.Getwd()
	frontendPath := filepath.Join(workDir, "dist")

	// Check if dist folder exists
	if info, err := os.Stat(frontendPath); err == nil && info.IsDir() {
		log.Println("📦 Serving frontend from:", frontendPath)
		r.StaticFS("/assets", http.Dir(filepath.Join(frontendPath, "assets")))

		// Catch-all for React Router
		r.NoRoute(func(c *gin.Context) {
			if !strings.HasPrefix(c.Request.URL.Path, "/api") && !strings.HasPrefix(c.Request.URL.Path, "/tasks") {
				c.File(filepath.Join(frontendPath, "index.html"))
			}
		})
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 Server running on :%s\n", port)

	// Start background tasks (cleanup, notifications)
	services.StartBackgroundTaskRunner()

	r.Run(":" + port)
}
