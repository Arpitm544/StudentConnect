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
	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		log.Fatal("Failed to resolve backend source directory")
	}

	envPath := filepath.Join(filepath.Dir(currentFile), ".env")
	if err := godotenv.Overload(envPath); err != nil {
		log.Println("Note: No backend .env file found, using system environment variables")
	}

	config.ConnectDatabase()
	
	// Run migrations
	fmt.Println("Running database migrations...")
	config.DB.Exec("ALTER TABLE workspace_tasks ADD COLUMN IF NOT EXISTS ai_milestone_count INT DEFAULT 0")
	config.DB.Exec("ALTER TABLE workspace_tasks ADD COLUMN IF NOT EXISTS ai_optimized BOOLEAN DEFAULT FALSE")
	config.DB.Exec("ALTER TABLE milestones DROP CONSTRAINT IF EXISTS milestones_task_id_fkey")
	config.DB.Exec("ALTER TABLE milestones ADD COLUMN IF NOT EXISTS assignee_id BIGINT")
	config.DB.Exec("ALTER TABLE milestones ADD COLUMN IF NOT EXISTS position INT DEFAULT 0")
	
	// Unify statuses
	config.DB.Exec("UPDATE workspace_tasks SET status = 'pending' WHERE status = 'todo'")
	config.DB.Exec("UPDATE workspace_tasks SET status = 'in_review' WHERE status = 'submitted'")
	config.DB.Exec("UPDATE workspace_tasks SET status = 'completed' WHERE status = 'done'")
	
	fmt.Println("Migrations completed.")
	config.InitFirebase()

	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	allowedOrigins := []string{
		"http://localhost:5173",
		"http://localhost:5173/",
		"http://localhost:5174",
		"http://localhost:5174/",
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

	r.OPTIONS("/*path", func(c *gin.Context) {
		c.Status(204)
	})
	r.Use(func(c *gin.Context) {
		fmt.Printf("DEBUG: Incoming %s %s\n", c.Request.Method, c.Request.URL.Path)
		c.Header("Cross-Origin-Opener-Policy", "same-origin-allow-popups")
		c.Header("Cross-Origin-Embedder-Policy", "unsafe-none")
		c.Next()
	})

	routes.SetupRoutes(r)

	r.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "Welcome to TaskNest Backend"})
	})

	workDir, _ := os.Getwd()
	frontendPath := filepath.Join(workDir, "dist")
	if info, err := os.Stat(frontendPath); err == nil && info.IsDir() {
		log.Println("📦 Serving frontend from:", frontendPath)
		r.StaticFS("/assets", http.Dir(filepath.Join(frontendPath, "assets")))
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

	services.StartBackgroundTaskRunner()

	r.Run(":" + port)
}
