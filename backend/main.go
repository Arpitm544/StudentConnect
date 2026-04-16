package main

import (
	"log"
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
		log.Println("No .env file found")
	}

	// Connect DB
	config.ConnectDatabase()

	config.InitFirebase()

	r := gin.Default()

	// CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins: []string{
			"http://localhost:5173",
			"https://main.d63s59pcpq7j4.amplifyapp.com",
			"http://127.0.0.1:5173",
			"http://13.201.37.135:5173",
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	r.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "Welcome to StudentConnect Backend"})
	})

	// Routes
	routes.SetupRoutes(r)

	log.Println("🚀 Server running on :8080")
	r.Run(":8080")
}