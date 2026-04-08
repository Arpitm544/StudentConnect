package controllers

import (
	"database/sql"
	"net/http"
	"strconv"
	"strings"

	"backend/config"
	"backend/models"
	"backend/services"
	"fmt"

	"github.com/gin-gonic/gin"
)

func CreateTask(c *gin.Context) {
	var input struct {
		Title         string  `json:"title"`
		Description   string  `json:"description"`
		Subject       string  `json:"subject"`
		Deadline      *string `json:"deadline"`
		AttachmentURL *string `json:"attachment_url"`
	}

	if c.BindJSON(&input) != nil || strings.TrimSpace(input.Title) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	userID := c.GetInt("user_id")

	var deadline interface{}
	if input.Deadline != nil && *input.Deadline != "" {
		deadline = *input.Deadline
	}

	var id int64
	err := config.DB.QueryRow(
		`INSERT INTO tasks (title, description, status, accepted, creator_id, deadline, progress, subject, attachment_url)
		 VALUES ($1,$2,'pending',FALSE,$3,$4,0,$5,$6) RETURNING id`,
		input.Title, input.Description, userID, deadline, input.Subject, input.AttachmentURL,
	).Scan(&id)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": id})

	// async email
	go func() {
		var name string
		config.DB.QueryRow("SELECT name FROM users WHERE id=$1", userID).Scan(&name)

		rows, err := config.DB.Query("SELECT email FROM users WHERE id <> $1", userID)
		if err != nil {
			return
		}
		defer rows.Close()

		var emails []string
		for rows.Next() {
			var e string
			rows.Scan(&e)
			emails = append(emails, e)
		}

		if len(emails) > 0 {
			services.SendNewAssignmentEmail(emails, input.Title, input.Description, name)
		}
	}()
}

func fetchTasksByQuery(query string, args ...any) ([]models.Task, error) {
	rows, err := config.DB.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tasks := make([]models.Task, 0)
	
	for rows.Next() {
		var t models.Task
		var assigneeName, description, subject, attachmentURL sql.NullString
		if err := rows.Scan(&t.ID, &t.Title, &description, &t.Status, &t.Accepted, &t.CreatorID, &t.AssigneeID, &t.Deadline, &t.Progress, &subject, &attachmentURL, &t.CreatedAt, &t.UpdatedAt, &assigneeName); err != nil {
			return nil, err
		}
		t.AssigneeName = assigneeName.String
		t.Description = description.String
		t.Subject = subject.String
		if attachmentURL.Valid {
			t.AttachmentURL = &attachmentURL.String
		}
		tasks = append(tasks, t)
	}
	return tasks, nil
}

// ListTasks - PUBLIC task list (only Open/Pending tasks)
func ListTasks(c *gin.Context) {
	query := `SELECT t.id, t.title, t.description, t.status, t.accepted, t.creator_id, t.assignee_id, t.deadline, t.progress, t.subject, t.attachment_url, t.created_at, t.updated_at, u.name as assignee_name
	          FROM tasks t 
	          LEFT JOIN users u ON t.assignee_id = u.id 
	          WHERE t.status = 'pending' AND t.assignee_id IS NULL AND t.accepted = FALSE 
	          ORDER BY t.id DESC`
	tasks, err := fetchTasksByQuery(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list public tasks: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, tasks)
}

// ListDashboardTasks - User's PRIVATE dashboard (Tasks Created OR Accepted)
func ListDashboardTasks(c *gin.Context) {
	userIDValue, _ := c.Get("user_id")
	userID := userIDValue.(int)

	query := `SELECT t.id, t.title, t.description, t.status, t.accepted, t.creator_id, t.assignee_id, t.deadline, t.progress, t.subject, t.attachment_url, t.created_at, t.updated_at, u.name as assignee_name
	          FROM tasks t 
	          LEFT JOIN users u ON t.assignee_id = u.id 
	          WHERE t.creator_id = $1 OR t.assignee_id = $2
	          ORDER BY t.id DESC`
	tasks, err := fetchTasksByQuery(query, userID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch dashboard tasks: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, tasks)
}

func ListMyTasks(c *gin.Context) {
	userID, _ := c.Get("user_id")
	query := `SELECT t.id, t.title, t.description, t.status, t.accepted, t.creator_id, t.assignee_id, t.deadline, t.progress, t.subject, t.attachment_url, t.created_at, t.updated_at, u.name as assignee_name 
	          FROM tasks t LEFT JOIN users u ON t.assignee_id = u.id WHERE t.assignee_id = $1 ORDER BY t.id DESC`
	tasks, err := fetchTasksByQuery(query, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch my tasks: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, tasks)
}

func ListPostedTasks(c *gin.Context) {
	userID, _ := c.Get("user_id")
	query := `SELECT t.id, t.title, t.description, t.status, t.accepted, t.creator_id, t.assignee_id, t.deadline, t.progress, t.subject, t.attachment_url, t.created_at, t.updated_at, u.name as assignee_name 
	          FROM tasks t LEFT JOIN users u ON t.assignee_id = u.id WHERE t.creator_id = $1 ORDER BY t.id DESC`
	tasks, err := fetchTasksByQuery(query, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch posted tasks: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, tasks)
}

func ListActiveTasks(c *gin.Context) {
	userID, _ := c.Get("user_id")
	query := `SELECT t.id, t.title, t.description, t.status, t.accepted, t.creator_id, t.assignee_id, t.deadline, t.progress, t.subject, t.attachment_url, t.created_at, t.updated_at, u.name as assignee_name 
	          FROM tasks t LEFT JOIN users u ON t.assignee_id = u.id 
	          WHERE (t.creator_id = $1 OR t.assignee_id = $2) 
	          AND t.status IN ('accepted', 'in_progress', 'submitted') 
	          ORDER BY t.id DESC`
	tasks, err := fetchTasksByQuery(query, userID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch active tasks: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, tasks)
}

func AcceptTask(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task id"})
		return
	}

	userIDValue, _ := c.Get("user_id")
	userID := userIDValue.(int)

	// Get task to check creator and current status
	var creatorIDInt int
	var status string
	var accepted bool
	err = config.DB.QueryRow(`SELECT creator_id, status, accepted FROM tasks WHERE id = $1`, id).Scan(&creatorIDInt, &status, &accepted)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Assignment not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database lookup failed: " + err.Error()})
		}
		return
	}

	// 1. Verify the user is NOT the creator
	if creatorIDInt == userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You cannot accept your own assignment"})
		return
	}

	// 2. Concurrency Check: Verify task is still OPEN (pending)
	if status != "pending" || accepted {
		c.JSON(http.StatusBadRequest, gin.H{"error": "This task is no longer open for acceptance"})
		return
	}

	// 3. Atomically update the task
	result, err := config.DB.Exec(
		`UPDATE tasks SET accepted = TRUE, assignee_id = $1, status = 'accepted', updated_at = CURRENT_TIMESTAMP 
		 WHERE id = $2 AND status = 'pending'`,
		userID, id,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to accept assignment: " + err.Error()})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "This task was just accepted by another user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Assignment accepted successfully"})

	// Notify relevant parties (goroutine to avoid blocking)
	go func() {
		var title string
		var creatorEmail, creatorName, assigneeEmail, assigneeName string

		err := config.DB.QueryRow(`
			SELECT t.title, u_c.email, u_c.name, u_a.email, u_a.name
			FROM tasks t
			JOIN users u_c ON t.creator_id = u_c.id
			JOIN users u_a ON t.assignee_id = u_a.id
			WHERE t.id = $1
		`, id).Scan(&title, &creatorEmail, &creatorName, &assigneeEmail, &assigneeName)

		if err == nil {
			// Notify Creator
			services.SendAssignmentAcceptedEmail(creatorEmail, title, fmt.Sprintf("Your assignment has been accepted by %s.", assigneeName))
			// Notify Assignee
			services.SendAssignmentAcceptedEmail(assigneeEmail, title, fmt.Sprintf("You have successfully accepted the assignment posted by %s.", creatorName))
		}
	}()
}

func GetTask(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task id"})
		return
	}

	userIDValue, _ := c.Get("user_id")
	userID := userIDValue.(int)

	query := `
		SELECT 
			t.id, t.title, t.description, t.status, t.accepted, t.creator_id, t.assignee_id, 
			t.deadline, t.progress, t.subject, t.attachment_url, t.created_at, t.updated_at,
			u_creator.name as creator_name, u_creator.email as creator_email,
			u_assignee.name as assignee_name, u_assignee.email as assignee_email
		FROM tasks t
		LEFT JOIN users u_creator ON t.creator_id = u_creator.id
		LEFT JOIN users u_assignee ON t.assignee_id = u_assignee.id
		WHERE t.id = $1
	`

	var t models.Task
	var creatorName, creatorEmail, assigneeName, assigneeEmail, description, subject, attachmentURL sql.NullString
	var creatorIDNull, assigneeIDNull sql.NullInt64

	if err := config.DB.QueryRow(query, id).Scan(
		&t.ID, &t.Title, &description, &t.Status, &t.Accepted, &creatorIDNull, &assigneeIDNull,
		&t.Deadline, &t.Progress, &subject, &attachmentURL, &t.CreatedAt, &t.UpdatedAt,
		&creatorName, &creatorEmail, &assigneeName, &assigneeEmail,
	); err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch task details: " + err.Error()})
		}
		return
	}

	// Fix types for IDs
	if creatorIDNull.Valid { v := uint(creatorIDNull.Int64); t.CreatorID = &v }
	if assigneeIDNull.Valid { v := uint(assigneeIDNull.Int64); t.AssigneeID = &v }

	// AUTHORIZATION CHECK
	// If task is not pending (meaning it's in a private state), only involved parties can view it.
	if t.Status != "pending" && t.Accepted {
		isCreator := creatorIDNull.Valid && int(creatorIDNull.Int64) == userID
		isAssignee := assigneeIDNull.Valid && int(assigneeIDNull.Int64) == userID
		if !isCreator && !isAssignee {
			c.JSON(http.StatusForbidden, gin.H{"error": "You are not authorized to view this task details"})
			return
		}
	}

	t.Description = description.String
	t.Subject = subject.String
	if attachmentURL.Valid {
		t.AttachmentURL = &attachmentURL.String
	}
	t.CreatorName = creatorName.String
	t.CreatorEmail = creatorEmail.String
	t.AssigneeName = assigneeName.String
	t.AssigneeEmail = assigneeEmail.String

	c.JSON(http.StatusOK, t)
}

func UpdateTaskStatus(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task id"})
		return
	}
	userIDValue, _ := c.Get("user_id")
	userID := uint(userIDValue.(int))

	var creatorIDNull, assigneeIDNull sql.NullInt64
	var currentStatus string
	err = config.DB.QueryRow(`SELECT creator_id, assignee_id, status FROM tasks WHERE id = $1`, id).Scan(&creatorIDNull, &assigneeIDNull, &currentStatus)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	// Verify user is involved
	isOwner := creatorIDNull.Valid && uint(creatorIDNull.Int64) == userID
	isAssignee := assigneeIDNull.Valid && uint(assigneeIDNull.Int64) == userID
	if !isOwner && !isAssignee {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized"})
		return
	}

	var input struct {
		Status   string `json:"status"`
		Progress *int   `json:"progress"`
	}
	if err := c.BindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload"})
		return
	}

	status := strings.ToLower(input.Status)
	// Only owner can complete
	if status == "completed" && !isOwner {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only creator can complete"})
		return
	}

	progress := 0
	if input.Progress != nil { progress = *input.Progress }
	if status == "completed" { progress = 100 }

	_, err = config.DB.Exec(`UPDATE tasks SET status = $1, progress = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`, status, progress, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Update failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Updated successfully"})
}

func DeleteTask(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task id"})
		return
	}

	userIDValue, _ := c.Get("user_id")
	userID := userIDValue.(int)

	// Only creator can delete
	var creatorID int
	err = config.DB.QueryRow("SELECT creator_id FROM tasks WHERE id = $1", id).Scan(&creatorID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}
	if creatorID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only creator can delete this task"})
		return
	}

	_, err = config.DB.Exec(`DELETE FROM tasks WHERE id = $1`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Delete failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Task deleted"})
}
