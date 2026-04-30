package controllers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"backend/config"
	"backend/models"
	"backend/services"

	"github.com/gin-gonic/gin"
)

// CreateTask - Endpoint to post a new assignment
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
	var id int64
	err := config.DB.QueryRow(
		`INSERT INTO tasks (title, description, status, accepted, creator_id, deadline, progress, subject, attachment_url)
		 VALUES ($1,$2,'pending',FALSE,$3,$4,0,$5,$6) RETURNING id`,
		input.Title, input.Description, userID, input.Deadline, input.Subject, input.AttachmentURL,
	).Scan(&id)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create task"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": strconv.FormatInt(id, 10)})

	// Async Email Notification
	go func() {
		var name string
		config.DB.QueryRow("SELECT name FROM users WHERE id=$1", userID).Scan(&name)
		rows, _ := config.DB.Query("SELECT email FROM users WHERE id <> $1", userID)
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

// ListTasks - Publicly available assignments (excludes tasks created by the current user)
func ListTasks(c *gin.Context) {
	userID := c.GetInt("user_id")

	query := `SELECT t.id, t.title, t.description, t.status, t.accepted, t.creator_id, t.assignee_id, t.deadline, t.progress, t.subject, t.attachment_url, t.created_at, t.updated_at,
	          u_a.name as assignee_name, u_a.photo_url as assignee_photo_url, u_c.name as creator_name, u_c.photo_url as creator_photo_url
	          FROM tasks t LEFT JOIN users u_a ON t.assignee_id = u_a.id LEFT JOIN users u_c ON t.creator_id = u_c.id
	          WHERE t.status = 'pending' AND t.assignee_id IS NULL AND t.accepted = FALSE AND t.creator_id <> $1 ORDER BY t.id DESC`
	
	tasks, err := services.FetchTasksByQuery(query, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list tasks"})
		return
	}
	c.JSON(http.StatusOK, tasks)
}

// ListDashboardTasks - User's active view (Created or Accepted)
func ListDashboardTasks(c *gin.Context) {
	userID := c.GetInt("user_id")
	query := `SELECT t.id, t.title, t.description, t.status, t.accepted, t.creator_id, t.assignee_id, t.deadline, t.progress, t.subject, t.attachment_url, t.created_at, t.updated_at,
	          u_a.name as assignee_name, u_a.photo_url as assignee_photo_url, u_c.name as creator_name, u_c.photo_url as creator_photo_url
	          FROM tasks t LEFT JOIN users u_a ON t.assignee_id = u_a.id LEFT JOIN users u_c ON t.creator_id = u_c.id
	          WHERE t.creator_id = $1 OR t.assignee_id = $2 ORDER BY t.id DESC`
	
	tasks, err := services.FetchTasksByQuery(query, userID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch dashboard"})
		return
	}
	c.JSON(http.StatusOK, tasks)
}

// AcceptTask - User takes on an assignment
func AcceptTask(c *gin.Context) {
	taskID, _ := strconv.Atoi(c.Param("id"))
	userID := c.GetInt("user_id")

	// 1. Validation Logic
	var creatorID int
	var status string
	err := config.DB.QueryRow(`SELECT creator_id, status FROM tasks WHERE id = $1`, taskID).Scan(&creatorID, &status)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	if creatorID == userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You cannot accept your own assignment"})
		return
	}
	if status != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Task is no longer open"})
		return
	}

	// 2. Atomic Update
	result, _ := config.DB.Exec(`UPDATE tasks SET accepted = TRUE, assignee_id = $1, status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND status = 'pending'`, userID, taskID)
	if rows, _ := result.RowsAffected(); rows == 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Task was just taken by someone else"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Assignment accepted"})

	// 3. Notify parties
	go func() {
		var title string
		var cEmail, cName, aEmail, aName string
		config.DB.QueryRow(`SELECT t.title, u_c.email, u_c.name, u_a.email, u_a.name FROM tasks t JOIN users u_c ON t.creator_id = u_c.id JOIN users u_a ON t.assignee_id = u_a.id WHERE t.id = $1`, taskID).Scan(&title, &cEmail, &cName, &aEmail, &aName)
		services.SendAssignmentAcceptedEmail(cEmail, title, fmt.Sprintf("Accepted by %s", aName))
		services.SendAssignmentAcceptedEmail(aEmail, title, fmt.Sprintf("You accepted %s's assignment", cName))
	}()
}

// GetTask - Detailed view including milestones
func GetTask(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	userID := c.GetInt("user_id")

	query := `SELECT t.id, t.title, t.description, t.status, t.accepted, t.creator_id, t.assignee_id, t.deadline, t.progress, t.subject, t.attachment_url, 
	          t.submission_github as submission_link, t.created_at, t.updated_at,
	          u_c.name, u_c.email, u_c.photo_url, u_a.name, u_a.email, u_a.photo_url
	          FROM tasks t LEFT JOIN users u_c ON t.creator_id = u_c.id LEFT JOIN users u_a ON t.assignee_id = u_a.id WHERE t.id = $1`
	
	var t models.Task
	var desc, subj, attach, subL sql.NullString
	var cn, ce, cp, an, ae, ap sql.NullString
	var cid, aid sql.NullInt64

	err := config.DB.QueryRow(query, id).Scan(
		&t.ID, &t.Title, &desc, &t.Status, &t.Accepted, &cid, &aid, &t.Deadline, &t.Progress, &subj, &attach,
		&subL, &t.CreatedAt, &t.UpdatedAt,
		&cn, &ce, &cp, &an, &ae, &ap,
	)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	// Simple Mapping
	t.Description = desc.String
	t.Subject = subj.String
	if attach.Valid { t.AttachmentURL = &attach.String }
	t.CreatorName, t.CreatorEmail, t.CreatorPhotoURL = cn.String, ce.String, cp.String
	t.AssigneeName, t.AssigneeEmail, t.AssigneePhotoURL = an.String, ae.String, ap.String
	if subL.Valid { t.SubmissionLink = &subL.String }

	// Map IDs for frontend checks
	if cid.Valid { 
		ucid := uint(cid.Int64)
		t.CreatorID = &ucid 
	}
	if aid.Valid { 
		uaid := uint(aid.Int64)
		t.AssigneeID = &uaid 
	}

	// Auth check for private tasks
	if t.Status != "pending" && t.Accepted {
		isCreator := cid.Valid && int(cid.Int64) == userID
		isAssignee := aid.Valid && int(aid.Int64) == userID
		if !isCreator && !isAssignee {
			c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized access"})
			return
		}
	}

	// Fetch Milestones
	mRows, _ := config.DB.Query(`SELECT id, title, status, submission_link, submission_note, created_at, updated_at FROM milestones WHERE task_id = $1 ORDER BY id ASC`, id)
	defer mRows.Close()
	for mRows.Next() {
		var m models.Milestone
		var sl, sn sql.NullString
		mRows.Scan(&m.ID, &m.Title, &m.Status, &sl, &sn, &m.CreatedAt, &m.UpdatedAt)
		if sl.Valid { m.SubmissionLink = &sl.String }
		if sn.Valid { m.SubmissionNote = &sn.String }
		t.Milestones = append(t.Milestones, m)
	}

	c.JSON(http.StatusOK, t)
}

// Milestone Management
func AddMilestone(c *gin.Context) {
	taskID, _ := strconv.Atoi(c.Param("id"))
	var input struct{ Title string `json:"title"` }
	c.BindJSON(&input)

	config.DB.Exec(`INSERT INTO milestones (task_id, title, status) VALUES ($1, $2, 'pending')`, taskID, input.Title)
	services.SyncTaskStatusWithMilestones(uint(taskID))
	c.JSON(http.StatusCreated, gin.H{"message": "Milestone added"})
}

func UpdateMilestoneStatus(c *gin.Context) {
	taskID, _ := strconv.Atoi(c.Param("id"))
	mid, _ := strconv.Atoi(c.Param("mid"))
	var input struct{ Status string `json:"status"` }
	c.BindJSON(&input)

	config.DB.Exec(`UPDATE milestones SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND task_id = $3`, strings.ToLower(input.Status), mid, taskID)
	services.SyncTaskStatusWithMilestones(uint(taskID))
	c.JSON(http.StatusOK, gin.H{"message": "Milestone updated"})
}

// SubmitMilestoneForReview handles the submission of a specific milestone
func SubmitMilestoneForReview(c *gin.Context) {
	taskID, _ := strconv.Atoi(c.Param("id"))
	mid, _ := strconv.Atoi(c.Param("mid"))
	var input struct{ Link string `json:"link"`; Note string `json:"note"` }
	c.BindJSON(&input)

	config.DB.Exec(`UPDATE milestones SET status = 'submitted', submission_link = $1, submission_note = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND task_id = $4`, input.Link, input.Note, mid, taskID)
	services.SyncTaskStatusWithMilestones(uint(taskID))
	c.JSON(http.StatusOK, gin.H{"message": "Milestone submitted"})
}

// UpdateTaskStatus - Manual status update (only if no milestones)
func UpdateTaskStatus(c *gin.Context) {
	taskID, _ := strconv.Atoi(c.Param("id"))
	
	var count int
	config.DB.QueryRow("SELECT COUNT(*) FROM milestones WHERE task_id = $1", taskID).Scan(&count)
	if count > 0 {
		c.JSON(http.StatusForbidden, gin.H{"error": "Managed by milestones"})
		return
	}

	var input struct{ Status string `json:"status"`; Progress int `json:"progress"` }
	c.BindJSON(&input)
	
	config.DB.Exec(`UPDATE tasks SET status = $1, progress = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`, strings.ToLower(input.Status), input.Progress, taskID)
	c.JSON(http.StatusOK, gin.H{"message": "Updated"})
}

func DeleteTask(c *gin.Context) {
	taskID, _ := strconv.Atoi(c.Param("id"))
	userID := c.GetInt("user_id")
	
	var creatorID int
	config.DB.QueryRow("SELECT creator_id FROM tasks WHERE id = $1", taskID).Scan(&creatorID)
	if creatorID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized"})
		return
	}

	config.DB.Exec(`DELETE FROM tasks WHERE id = $1`, taskID)
	c.JSON(http.StatusOK, gin.H{"message": "Task deleted"})
}

// Omitted: LeaveTask, ListMyTasks, ListPostedTasks, ListActiveTasks would follow the same pattern
func LeaveTask(c *gin.Context) {
	taskID, _ := strconv.Atoi(c.Param("id"))
	userID := c.GetInt("user_id")

	config.DB.Exec(`UPDATE tasks SET assignee_id = NULL, accepted = FALSE, status = 'pending', progress = 0 WHERE id = $1 AND assignee_id = $2`, taskID, userID)
	config.DB.Exec(`UPDATE milestones SET status = 'pending', submission_link = NULL WHERE task_id = $1`, taskID)
	c.JSON(http.StatusOK, gin.H{"message": "Left task"})
}

func ListMyTasks(c *gin.Context) {
	userID := c.GetInt("user_id")
	query := `SELECT t.id, t.title, t.description, t.status, t.accepted, t.creator_id, t.assignee_id, t.deadline, t.progress, t.subject, t.attachment_url, t.created_at, t.updated_at,
	          u_a.name, u_a.photo_url, u_c.name, u_c.photo_url FROM tasks t LEFT JOIN users u_a ON t.assignee_id = u_a.id LEFT JOIN users u_c ON t.creator_id = u_c.id WHERE t.assignee_id = $1`
	tasks, _ := services.FetchTasksByQuery(query, userID)
	c.JSON(http.StatusOK, tasks)
}

func ListPostedTasks(c *gin.Context) {
	userID := c.GetInt("user_id")
	query := `SELECT t.id, t.title, t.description, t.status, t.accepted, t.creator_id, t.assignee_id, t.deadline, t.progress, t.subject, t.attachment_url, t.created_at, t.updated_at,
	          u_a.name, u_a.photo_url, u_c.name, u_c.photo_url FROM tasks t LEFT JOIN users u_a ON t.assignee_id = u_a.id LEFT JOIN users u_c ON t.creator_id = u_c.id WHERE t.creator_id = $1`
	tasks, _ := services.FetchTasksByQuery(query, userID)
	c.JSON(http.StatusOK, tasks)
}

func ListActiveTasks(c *gin.Context) {
	userID := c.GetInt("user_id")
	query := `SELECT t.id, t.title, t.description, t.status, t.accepted, t.creator_id, t.assignee_id, t.deadline, t.progress, t.subject, t.attachment_url, t.created_at, t.updated_at,
	          u_a.name, u_a.photo_url, u_c.name, u_c.photo_url FROM tasks t LEFT JOIN users u_a ON t.assignee_id = u_a.id LEFT JOIN users u_c ON t.creator_id = u_c.id WHERE (t.creator_id = $1 OR t.assignee_id = $2) AND t.status IN ('accepted', 'in_progress', 'submitted')`
	tasks, _ := services.FetchTasksByQuery(query, userID, userID)
	c.JSON(http.StatusOK, tasks)
}
