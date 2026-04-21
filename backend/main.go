package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"backend/config"
	"backend/routes"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load env
	if err := godotenv.Load(); err != nil {
		log.Println("Note: No .env file found, using system environment variables")
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
		c.Header("Cross-Origin-Opener-Policy", "same-origin-allow-popups")
		c.Header("Cross-Origin-Embedder-Policy", "unsafe-none")
		c.Next()
	})

	// Routes
	routes.SetupRoutes(r)

	// API welcome message
	r.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "Welcome to StudentConnect Backend"})
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
	r.Run(":" + port)
}