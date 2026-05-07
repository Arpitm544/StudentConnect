package routes

import (
	"backend/controllers"
	"backend/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {
	// Public routes
	r.GET("/api/public/stats", controllers.GetPublicStats)

	auth := r.Group("/api/auth")
	{
		auth.POST("/signup", controllers.Signup)
		auth.POST("/login", controllers.Login)
		auth.POST("/verify-otp", controllers.VerifyEmail)
		auth.POST("/verify", controllers.VerifyEmail) // Legacy compatibility
		auth.POST("/resend-verification", controllers.ResendVerification)
		auth.POST("/google", controllers.GoogleAuth)
		auth.POST("/logout", controllers.Logout)
		auth.GET("/check", controllers.CheckAuth)
	}

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

		c.Set("user_id", userID)
		c.Next()
	}

	// ✅ EMERGENCY FIX: Direct AI Routes
	r.POST("/api/tasks/ai/predict-priority", requireAuth, controllers.PredictPriority)
	r.POST("/api/tasks/ai/generate-milestones", requireAuth, controllers.GenerateMilestones)
	r.POST("/api/tasks/ai/recommend-users", requireAuth, controllers.RecommendUsers)

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
		tasks.POST("/:id/leave", controllers.LeaveTask)
		tasks.POST("/:id/status", controllers.UpdateTaskStatus)
		tasks.PUT("/:id", controllers.UpdateTask)
		tasks.DELETE("/:id", controllers.DeleteTask)
		
		tasks.POST("/:id/invite", controllers.InviteUser)
		tasks.GET("/invitations", controllers.ListInvitations)
		tasks.POST("/invitations/:id/respond", controllers.RespondToInvitation)

		tasks.POST("/:id/milestones", controllers.AddMilestone)
		tasks.POST("/:id/milestones/:mid/status", controllers.UpdateMilestoneStatus)
		tasks.POST("/:id/milestones/:mid/submit", controllers.SubmitMilestoneForReview)
		tasks.DELETE("/:id/milestones/:mid", controllers.DeleteMilestone)
		tasks.POST("/:id/comments", controllers.AddComment)
	}

	user := r.Group("/api/user")
	user.Use(requireAuth)
	{
		user.GET("/profile", controllers.GetProfile)
		user.PUT("/profile", controllers.UpdateProfile)
		user.POST("/request-password-otp", controllers.RequestPasswordOTP)
		user.POST("/change-password", controllers.ChangePassword)
		user.POST("/request-delete-otp", controllers.RequestDeleteOTP)
		user.POST("/delete-account", controllers.DeleteAccount)
	}

	r.POST("/api/upload", requireAuth, controllers.UploadHandler)
}
