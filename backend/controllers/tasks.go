package controllers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"backend/config"
	"backend/models"

	"github.com/gin-gonic/gin"
)

func CreateTask(c *gin.Context) {
	var input struct {
		Title       string  `json:"title"`
		Description string  `json:"description"`
		Subject     string  `json:"subject"`
		Deadline    *string `json:"deadline"`
	}

	if err := c.BindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	if strings.TrimSpace(input.Title) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Title is required"})
		return
	}

	userID, _ := c.Get("user_id")

	// Treat empty string deadline as nil so Postgres doesn't reject it
	var deadline interface{}
	if input.Deadline != nil && strings.TrimSpace(*input.Deadline) != "" {
		deadline = *input.Deadline
	}

	var t models.Task
	query := `INSERT INTO tasks (title, description, status, accepted, creator_id, deadline, progress, subject)
	          VALUES ($1, $2, 'pending', FALSE, $3, $4, 0, $5)
	          RETURNING id, title, description, status, accepted, creator_id, assignee_id, deadline, progress, subject, created_at, updated_at`
	if err := config.DB.QueryRow(query, input.Title, input.Description, userID, deadline, input.Subject).
		Scan(&t.ID, &t.Title, &t.Description, &t.Status, &t.Accepted, &t.CreatorID, &t.AssigneeID, &t.Deadline, &t.Progress, &t.Subject, &t.CreatedAt, &t.UpdatedAt); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create task: " + err.Error()})
		return
	}
	t.AssigneeName = "" // New task has no assignee

	c.JSON(http.StatusCreated, t)
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
		var assigneeName, description, subject sql.NullString
		if err := rows.Scan(&t.ID, &t.Title, &description, &t.Status, &t.Accepted, &t.CreatorID, &t.AssigneeID, &t.Deadline, &t.Progress, &subject, &t.CreatedAt, &t.UpdatedAt, &assigneeName); err != nil {
			return nil, err
		}
		t.AssigneeName = assigneeName.String
		t.Description = description.String
		t.Subject = subject.String
		tasks = append(tasks, t)
	}
	return tasks, nil
}

func ListTasks(c *gin.Context) {
	query := `SELECT t.id, t.title, t.description, t.status, t.accepted, t.creator_id, t.assignee_id, t.deadline, t.progress, t.subject, t.created_at, t.updated_at, u.name as assignee_name 
	          FROM tasks t LEFT JOIN users u ON t.assignee_id = u.id ORDER BY t.id DESC`
	tasks, err := fetchTasksByQuery(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list tasks: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, tasks)
}

func ListMyTasks(c *gin.Context) {
	userID, _ := c.Get("user_id")
	query := `SELECT t.id, t.title, t.description, t.status, t.accepted, t.creator_id, t.assignee_id, t.deadline, t.progress, t.subject, t.created_at, t.updated_at, u.name as assignee_name 
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
	query := `SELECT t.id, t.title, t.description, t.status, t.accepted, t.creator_id, t.assignee_id, t.deadline, t.progress, t.subject, t.created_at, t.updated_at, u.name as assignee_name 
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
	query := `SELECT t.id, t.title, t.description, t.status, t.accepted, t.creator_id, t.assignee_id, t.deadline, t.progress, t.subject, t.created_at, t.updated_at, u.name as assignee_name 
	          FROM tasks t LEFT JOIN users u ON t.assignee_id = u.id 
	          WHERE (t.creator_id = $1 OR t.assignee_id = $1) 
	          AND t.status IN ('accepted', 'in_progress', 'submitted') 
	          ORDER BY t.id DESC`
	tasks, err := fetchTasksByQuery(query, userID)
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

	userID, _ := c.Get("user_id")

	// Get task to check creator and current status
	var creatorID *uint
	var accepted bool
	err = config.DB.QueryRow(`SELECT creator_id, accepted FROM tasks WHERE id = $1`, id).Scan(&creatorID, &accepted)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Assignment not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to look up assignment: " + err.Error()})
		}
		return
	}

	// Verify the user is NOT the creator
	if creatorID != nil && *creatorID == uint(userID.(int)) {
		c.JSON(http.StatusForbidden, gin.H{"error": "You cannot accept your own assignment"})
		return
	}

	if accepted {
		c.JSON(http.StatusBadRequest, gin.H{"error": "This assignment has already been accepted"})
		return
	}

	result, err := config.DB.Exec(`UPDATE tasks SET accepted = TRUE, assignee_id = $2, status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, id, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to accept assignment: " + err.Error()})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Assignment not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Assignment accepted successfully"})
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

	// Get task info first to check permissions and status
	var creatorID *uint
	var assigneeID *uint
	var currentStatus string
	err = config.DB.QueryRow(`SELECT creator_id, assignee_id, status FROM tasks WHERE id = $1`, id).Scan(&creatorID, &assigneeID, &currentStatus)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Assignment not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to look up assignment: " + err.Error()})
		}
		return
	}

	// Loking: Cannot change status of COMPLETED assignment
	if currentStatus == "completed" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "This assignment is completed and locked. No further changes allowed."})
		return
	}

	// Verify user is involved with this task
	if (creatorID == nil || *creatorID != userID) && (assigneeID == nil || *assigneeID != userID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not authorized to update this assignment"})
		return
	}

	var input struct {
		Status   string `json:"status"`
		Progress *int   `json:"progress"`
	}

	if err := c.BindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	status := strings.TrimSpace(strings.ToLower(input.Status))
	
	// RESTRICTION: Only creator can mark as COMPLETED
	if status == "completed" && (creatorID == nil || *creatorID != userID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only the assignment creator can mark it as completed"})
		return
	}

	if status != "pending" && status != "in_progress" && status != "completed" && status != "cancelled" && status != "submitted" && status != "accepted" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status, expected pending|accepted|in_progress|submitted|completed|cancelled"})
		return
	}

	progress := 0
	if status == "completed" {
		progress = 100
	} else if status == "submitted" {
		progress = 75 
	} else if status == "accepted" {
		progress = 5 
	} else if status == "in_progress" && input.Progress != nil {
		progress = *input.Progress
		if progress < 0 || progress > 100 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Progress must be between 0 and 100"})
			return
		}
	} else if status == "pending" {
		progress = 0
	}

	result, err := config.DB.Exec(`UPDATE tasks SET status = $1, progress = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`, status, progress, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update status: " + err.Error()})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Assignment not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Status updated successfully"})
}

func DeleteTask(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task id"})
		return
	}

	result, err := config.DB.Exec(`DELETE FROM tasks WHERE id = $1`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete task"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Task deleted"})
}

func GetTask(c *gin.Context) {
	idStr := c.Param("id")
	fmt.Printf("Fetching task details for ID: %s\n", idStr)
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task id"})
		return
	}

	query := `
		SELECT 
			t.id, t.title, t.description, t.status, t.accepted, t.creator_id, t.assignee_id, 
			t.deadline, t.progress, t.subject, t.created_at, t.updated_at,
			u_creator.name as creator_name, u_creator.email as creator_email,
			u_assignee.name as assignee_name, u_assignee.email as assignee_email
		FROM tasks t
		LEFT JOIN users u_creator ON t.creator_id = u_creator.id
		LEFT JOIN users u_assignee ON t.assignee_id = u_assignee.id
		WHERE t.id = $1
	`

	var t models.Task
	var creatorName, creatorEmail, assigneeName, assigneeEmail, description, subject sql.NullString

	if err := config.DB.QueryRow(query, id).Scan(
		&t.ID, &t.Title, &description, &t.Status, &t.Accepted, &t.CreatorID, &t.AssigneeID,
		&t.Deadline, &t.Progress, &subject, &t.CreatedAt, &t.UpdatedAt,
		&creatorName, &creatorEmail, &assigneeName, &assigneeEmail,
	); err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch task details: " + err.Error()})
		}
		return
	}

	t.Description = description.String
	t.Subject = subject.String
	t.CreatorName = creatorName.String
	t.CreatorEmail = creatorEmail.String
	t.AssigneeName = assigneeName.String
	t.AssigneeEmail = assigneeEmail.String

	c.JSON(http.StatusOK, t)
}
