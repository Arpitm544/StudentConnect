package controllers

import (
	"backend/config"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type DailyActivity struct {
	Day         string `json:"day"`
	Postings    int    `json:"postings"`
	Completions int    `json:"completions"`
	InProgress  int    `json:"inProgress"`
}

func GetPublicStats(c *gin.Context) {
	var totalTasks int64
	var completedTasks int64
	var activeTasks int64

	config.DB.QueryRow("SELECT COUNT(*) FROM tasks").Scan(&totalTasks)
	config.DB.QueryRow("SELECT COUNT(*) FROM tasks WHERE status = 'completed'").Scan(&completedTasks)
	config.DB.QueryRow("SELECT COUNT(*) FROM tasks WHERE status IN ('accepted', 'in_progress', 'submitted')").Scan(&activeTasks)
    days := []string{"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"}
	var dailyStats []DailyActivity

	for i := 6; i >= 0; i-- {
		date := time.Now().AddDate(0, 0, -i)
		dateStr := date.Format("2006-01-02")
		dayName := days[date.Weekday()]

		var postings int
		var completions int
		var inProgress int
		
		config.DB.QueryRow("SELECT COUNT(*) FROM tasks WHERE created_at::date = $1", dateStr).Scan(&postings)
		config.DB.QueryRow("SELECT COUNT(*) FROM tasks WHERE status = 'completed' AND updated_at::date = $1", dateStr).Scan(&completions)

		config.DB.QueryRow(`
			SELECT COUNT(*) FROM tasks 
			WHERE created_at::date <= $1 
			  AND status != 'pending'
			  AND (status != 'completed' OR updated_at::date > $1)
			  AND (deadline IS NULL OR deadline::date >= $1)
		`, dateStr).Scan(&inProgress)

		dailyStats = append(dailyStats, DailyActivity{
			Day:         dayName,
			Postings:    postings,
			Completions: completions,
			InProgress:  inProgress,
		})
	}

	launchDate := time.Date(2026, 4, 1, 0, 0, 0, 0, time.UTC) 
	daysLive := int(time.Since(launchDate).Hours() / 24)

	c.JSON(http.StatusOK, gin.H{
		"total_tasks":     totalTasks,
		"completed_tasks": completedTasks,
		"active_tasks":    activeTasks,
		"days_live":       daysLive,
		"daily_activity":  dailyStats,
	})
}
