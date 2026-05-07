package services

import (
	"backend/config"
	"log"
	"time"
)

func StartBackgroundTaskRunner() {
	go func() {
		ticker := time.NewTicker(10 * time.Minute)
		for range ticker.C {
			log.Println("🧹 Running background cleanup for unverified users...")
			result, err := config.DB.Exec(`
				DELETE FROM users 
				WHERE is_verified = FALSE 
				  AND provider = 'password' 
				  AND created_at < NOW() - INTERVAL '10 minutes'
			`)
			if err != nil {
				log.Println("❌ Cleanup error:", err)
			} else {
				rows, _ := result.RowsAffected()
				if rows > 0 {
					log.Printf("✅ Deleted %d unverified users\n", rows)
				}
			}
		}
	}()
	
	go func() {
		ticker := time.NewTicker(1 * time.Hour) 
		for range ticker.C {
			log.Println("⏰ Running background task: Deadline checks...")
			rows, err := config.DB.Query(`
				SELECT t.id, t.title, u.email, u.name 
				FROM tasks t
				JOIN users u ON t.creator_id = u.id
				WHERE t.deadline > CURRENT_TIMESTAMP 
				  AND t.deadline < CURRENT_TIMESTAMP + INTERVAL '24 hours'
				  AND t.extension_email_sent = FALSE
				  AND t.status != 'completed'
				  AND (t.accepted = FALSE OR t.progress < 100)
			`)
			if err == nil {
				for rows.Next() {
					var id int64
					var title, email, name string
					if err := rows.Scan(&id, &title, &email, &name); err == nil {
						log.Printf("📧 Sending extension email for task %d to %s\n", id, email)
						SendDeadlineExtensionEmail(email, name, title)
						
						_, _ = config.DB.Exec("UPDATE tasks SET extension_email_sent = TRUE WHERE id = $1", id)
					}
				}
				rows.Close()
			} else {
				log.Println("❌ Error fetching tasks for extension emails:", err)
			}

			result, err := config.DB.Exec(`
				DELETE FROM tasks 
				WHERE deadline < CURRENT_TIMESTAMP 
				  AND status != 'completed'
				  AND (accepted = FALSE OR progress < 100)
			`)
			if err != nil {
				log.Println("❌ Error deleting expired tasks:", err)
			} else {
				rowsAffected, _ := result.RowsAffected()
				if rowsAffected > 0 {
					log.Printf("🧹 Deleted %d expired tasks\n", rowsAffected)
				}
			}
		}
	}()
}
