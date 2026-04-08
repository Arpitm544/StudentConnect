package routes

import (
	"backend/controllers"
	"backend/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {
	auth := r.Group("/api/auth")
	{
		auth.POST("/signup", controllers.Signup)
		auth.POST("/login", controllers.Login)
		auth.POST("/google", controllers.GoogleAuth)
		auth.POST("/logout", controllers.Logout)
		auth.GET("/check", controllers.CheckAuth)
	}

	// Protect task APIs so the frontend dashboard is truly private.
	requireAuth := func(c *gin.Context) {
		token, err := c.Cookie("token")
		if err != nil || token == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		userID, err := utils.ValidateToken(token)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		// Not used by current handlers, but useful if you later make tasks user-specific.
		c.Set("user_id", userID)
		c.Next()
	}

	tasks := r.Group("/tasks")
	tasks.Use(requireAuth)
	{
		tasks.POST("", controllers.CreateTask)
		tasks.GET("", controllers.ListTasks)
		tasks.GET("/dashboard", controllers.ListDashboardTasks)
		tasks.GET("/mine", controllers.ListMyTasks)
		tasks.GET("/posted", controllers.ListPostedTasks)
		tasks.GET("/active", controllers.ListActiveTasks)
		tasks.GET("/detail/:id", controllers.GetTask)
		tasks.POST("/:id/accept", controllers.AcceptTask)
		tasks.POST("/:id/status", controllers.UpdateTaskStatus)
		tasks.DELETE("/:id", controllers.DeleteTask)
	}

	user := r.Group("/api/user")
	user.Use(requireAuth)
	{
		user.GET("/profile", controllers.GetProfile)
		user.PUT("/profile", controllers.UpdateProfile)
	}

	r.POST("/api/upload", requireAuth, controllers.UploadHandler)
}
