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

	c.JSON(http.StatusCreated, gin.H{"id": strconv.FormatInt(id, 10)})

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
		var assigneeName, assigneePhoto, creatorName, creatorPhoto, description, subject, attachmentURL sql.NullString
		if err := rows.Scan(&t.ID, &t.Title, &description, &t.Status, &t.Accepted, &t.CreatorID, &t.AssigneeID, &t.Deadline, &t.Progress, &subject, &attachmentURL, &t.CreatedAt, &t.UpdatedAt, &assigneeName, &assigneePhoto, &creatorName, &creatorPhoto); err != nil {
			return nil, err
		}
		t.AssigneeName = assigneeName.String
		t.AssigneePhotoURL = assigneePhoto.String
		t.CreatorName = creatorName.String
		t.CreatorPhotoURL = creatorPhoto.String
		t.Description = description.String
		t.Subject = subject.String
		if attachmentURL.Valid {
			t.AttachmentURL = &attachmentURL.String
		}

		// Fetch Milestones for this task
		mRows, err := config.DB.Query(`SELECT id, task_id, title, status, submission_link, submission_note, created_at, updated_at FROM milestones WHERE task_id = $1 ORDER BY id ASC`, t.ID)
		if err == nil {
			t.Milestones = make([]models.Milestone, 0)
			for mRows.Next() {
				var m models.Milestone
				if err := mRows.Scan(&m.ID, &m.TaskID, &m.Title, &m.Status, &m.SubmissionLink, &m.SubmissionNote, &m.CreatedAt, &m.UpdatedAt); err == nil {
					t.Milestones = append(t.Milestones, m)
				}
			}
			mRows.Close()
		}

		tasks = append(tasks, t)
	}
	return tasks, nil
}

// ListTasks - PUBLIC task list (only Open/Pending tasks)
func ListTasks(c *gin.Context) {
	query := `SELECT t.id, t.title, t.description, t.status, t.accepted, t.creator_id, t.assignee_id, t.deadline, t.progress, t.subject, t.attachment_url, t.created_at, t.updated_at,
	          u_a.name as assignee_name, u_a.photo_url as assignee_photo_url,
	          u_c.name as creator_name, u_c.photo_url as creator_photo_url
	          FROM tasks t 
	          LEFT JOIN users u_a ON t.assignee_id = u_a.id 
	          LEFT JOIN users u_c ON t.creator_id = u_c.id
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

	query := `SELECT t.id, t.title, t.description, t.status, t.accepted, t.creator_id, t.assignee_id, t.deadline, t.progress, t.subject, t.attachment_url, t.created_at, t.updated_at,
	          u_a.name as assignee_name, u_a.photo_url as assignee_photo_url,
	          u_c.name as creator_name, u_c.photo_url as creator_photo_url
	          FROM tasks t 
	          LEFT JOIN users u_a ON t.assignee_id = u_a.id 
	          LEFT JOIN users u_c ON t.creator_id = u_c.id
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
	query := `SELECT t.id, t.title, t.description, t.status, t.accepted, t.creator_id, t.assignee_id, t.deadline, t.progress, t.subject, t.attachment_url, t.created_at, t.updated_at,
	          u_a.name as assignee_name, u_a.photo_url as assignee_photo_url,
	          u_c.name as creator_name, u_c.photo_url as creator_photo_url
	          FROM tasks t LEFT JOIN users u_a ON t.assignee_id = u_a.id
	          LEFT JOIN users u_c ON t.creator_id = u_c.id
	          WHERE t.assignee_id = $1 ORDER BY t.id DESC`
	tasks, err := fetchTasksByQuery(query, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch my tasks: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, tasks)
}

func ListPostedTasks(c *gin.Context) {
	userID, _ := c.Get("user_id")
	query := `SELECT t.id, t.title, t.description, t.status, t.accepted, t.creator_id, t.assignee_id, t.deadline, t.progress, t.subject, t.attachment_url, t.created_at, t.updated_at,
	          u_a.name as assignee_name, u_a.photo_url as assignee_photo_url,
	          u_c.name as creator_name, u_c.photo_url as creator_photo_url
	          FROM tasks t LEFT JOIN users u_a ON t.assignee_id = u_a.id
	          LEFT JOIN users u_c ON t.creator_id = u_c.id
	          WHERE t.creator_id = $1 ORDER BY t.id DESC`
	tasks, err := fetchTasksByQuery(query, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch posted tasks: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, tasks)
}

func ListActiveTasks(c *gin.Context) {
	userID, _ := c.Get("user_id")
	query := `SELECT t.id, t.title, t.description, t.status, t.accepted, t.creator_id, t.assignee_id, t.deadline, t.progress, t.subject, t.attachment_url, t.created_at, t.updated_at,
	          u_a.name as assignee_name, u_a.photo_url as assignee_photo_url,
	          u_c.name as creator_name, u_c.photo_url as creator_photo_url
	          FROM tasks t LEFT JOIN users u_a ON t.assignee_id = u_a.id 
	          LEFT JOIN users u_c ON t.creator_id = u_c.id
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
	id64, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil || id64 <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task id"})
		return
	}
	id := uint(id64)

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

func LeaveTask(c *gin.Context) {
	idStr := c.Param("id")
	id64, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil || id64 <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task id"})
		return
	}
	id := uint(id64)

	userIDValue, _ := c.Get("user_id")
	userID := userIDValue.(int)

	// Verify the user is the assignee and check current status
	var assigneeID sql.NullInt64
	var status string
	err = config.DB.QueryRow(`SELECT assignee_id, status FROM tasks WHERE id = $1`, id).Scan(&assigneeID, &status)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	if !assigneeID.Valid || int(assigneeID.Int64) != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only the assignee can leave this task"})
		return
	}

	if status == "completed" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot leave a completed task"})
		return
	}

	// Reset task
	_, err = config.DB.Exec(`
		UPDATE tasks 
		SET assignee_id = NULL, accepted = FALSE, status = 'pending', progress = 0, updated_at = CURRENT_TIMESTAMP 
		WHERE id = $1`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to leave task"})
		return
	}

	// Reset milestones if any
	config.DB.Exec(`UPDATE milestones SET status = 'pending', submission_link = NULL, submission_note = NULL WHERE task_id = $1`, id)

	c.JSON(http.StatusOK, gin.H{"message": "Left task successfully"})
}

func GetTask(c *gin.Context) {
	idStr := c.Param("id")
	id64, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil || id64 <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task id"})
		return
	}
	id := uint(id64)

	userIDValue, _ := c.Get("user_id")
	userID := userIDValue.(int)

	query := `
		SELECT 
			t.id, t.title, t.description, t.status, t.accepted, t.creator_id, t.assignee_id, 
			t.deadline, t.progress, t.subject, t.attachment_url, 
			t.submission_github, t.submission_docs, t.submission_drive, t.submission_notes,
			t.created_at, t.updated_at,
			u_creator.name as creator_name, u_creator.email as creator_email, u_creator.photo_url as creator_photo_url,
			u_assignee.name as assignee_name, u_assignee.email as assignee_email, u_assignee.photo_url as assignee_photo_url
		FROM tasks t
		LEFT JOIN users u_creator ON t.creator_id = u_creator.id
		LEFT JOIN users u_assignee ON t.assignee_id = u_assignee.id
		WHERE t.id = $1
	`

	var t models.Task
	var creatorName, creatorEmail, creatorPhoto, assigneeName, assigneeEmail, assigneePhoto, description, subject, attachmentURL sql.NullString
	var subGithub, subDocs, subDrive, subNotes sql.NullString
	var creatorIDNull, assigneeIDNull sql.NullInt64

	if err := config.DB.QueryRow(query, id).Scan(
		&t.ID, &t.Title, &description, &t.Status, &t.Accepted, &creatorIDNull, &assigneeIDNull,
		&t.Deadline, &t.Progress, &subject, &attachmentURL, 
		&subGithub, &subDocs, &subDrive, &subNotes,
		&t.CreatedAt, &t.UpdatedAt,
		&creatorName, &creatorEmail, &creatorPhoto,
		&assigneeName, &assigneeEmail, &assigneePhoto,
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
	t.CreatorPhotoURL = creatorPhoto.String
	t.AssigneeName = assigneeName.String
	t.AssigneeEmail = assigneeEmail.String
	t.AssigneePhotoURL = assigneePhoto.String

	if subGithub.Valid { t.SubmissionGithub = &subGithub.String }
	if subDocs.Valid   { t.SubmissionDocs   = &subDocs.String   }
	if subDrive.Valid  { t.SubmissionDrive  = &subDrive.String  }
	if subNotes.Valid  { t.SubmissionNotes  = &subNotes.String  }

	// FETCH MILESTONES
	mRows, err := config.DB.Query(`SELECT id, title, status, submission_link, submission_note, created_at, updated_at FROM milestones WHERE task_id = $1 ORDER BY id ASC`, id)
	if err == nil {
		defer mRows.Close()
		for mRows.Next() {
			var m models.Milestone
			var subLink, subNote sql.NullString
			m.TaskID = uint(id)
			if err := mRows.Scan(&m.ID, &m.Title, &m.Status, &subLink, &subNote, &m.CreatedAt, &m.UpdatedAt); err == nil {
				if subLink.Valid { m.SubmissionLink = &subLink.String }
				if subNote.Valid { m.SubmissionNote = &subNote.String }
				t.Milestones = append(t.Milestones, m)
			}
		}
	}

	c.JSON(http.StatusOK, t)
}

func UpdateTaskStatus(c *gin.Context) {
	idStr := c.Param("id")
	id64, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil || id64 <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task id"})
		return
	}
	id := uint(id64)
	userIDValue, _ := c.Get("user_id")
	userID := uint(userIDValue.(int))

	var creatorIDNull, assigneeIDNull sql.NullInt64
	var currentStatus string
	err = config.DB.QueryRow(`SELECT creator_id, assignee_id, status FROM tasks WHERE id = $1`, id).Scan(&creatorIDNull, &assigneeIDNull, &currentStatus)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	// NEW: Check if task has milestones. If it does, manual status update is disabled.
	var count int
	config.DB.QueryRow("SELECT COUNT(*) FROM milestones WHERE task_id = $1", id).Scan(&count)
	if count > 0 {
		c.JSON(http.StatusForbidden, gin.H{"error": "This task status is managed by milestones. Update milestone statuses instead."})
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
	id64, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil || id64 <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task id"})
		return
	}
	id := uint(id64)

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

// syncTaskStatusWithMilestones - calculates task status based on milestones
func syncTaskStatusWithMilestones(taskID uint) error {
	rows, err := config.DB.Query(`SELECT status FROM milestones WHERE task_id = $1`, taskID)
	if err != nil {
		return err
	}
	defer rows.Close()

	var statuses []string
	for rows.Next() {
		var s string
		rows.Scan(&s)
		statuses = append(statuses, strings.ToLower(s))
	}

	if len(statuses) == 0 {
		return nil // No milestones, don't auto-update
	}

	allDone := true
	anyInReview := false
	anyInProgress := false

	for _, s := range statuses {
		if s != "done" {
			allDone = false
		}
		if s == "in_review" || s == "submitted" {
			anyInReview = true
		}
		if s == "in_progress" {
			anyInProgress = true
		}
	}

	newStatus := "accepted"
	progress := 0

	// Calculate Progress %
	doneCount := 0
	for _, s := range statuses {
		if s == "done" {
			doneCount++
		}
	}
	progress = (doneCount * 100) / len(statuses)

	if (allDone) {
		newStatus = "completed"
		progress = 100
	} else if (anyInReview) {
		newStatus = "submitted"
	} else if (anyInProgress) {
		newStatus = "in_progress"
	}

	_, err = config.DB.Exec(`UPDATE tasks SET status = $1, progress = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`, newStatus, progress, taskID)
	return err
}

func AddMilestone(c *gin.Context) {
	idStr := c.Param("id")
	id64, _ := strconv.ParseUint(idStr, 10, 64)
	taskID := uint(id64)

	var input struct {
		Title string `json:"title"`
	}
	if err := c.BindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	_, err := config.DB.Exec(`INSERT INTO milestones (task_id, title, status) VALUES ($1, $2, 'pending')`, taskID, input.Title)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add milestone"})
		return
	}

	syncTaskStatusWithMilestones(taskID)
	c.JSON(http.StatusCreated, gin.H{"message": "Milestone added"})
}

func UpdateMilestoneStatus(c *gin.Context) {
	idStr := c.Param("id")
	id64, _ := strconv.ParseUint(idStr, 10, 64)
	taskID := uint(id64)
	
	midStr := c.Param("mid")
	mid, _ := strconv.Atoi(midStr)

	var input struct {
		Status string `json:"status"`
	}
	if err := c.BindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	// SEQUENTIAL CHECK: Check if previous milestones are done
	var incompletePrevCount int
	err := config.DB.QueryRow(`SELECT count(*) FROM milestones WHERE task_id = $1 AND id < $2 AND status != 'done'`, taskID, mid).Scan(&incompletePrevCount)
	if err == nil && incompletePrevCount > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Previous milestones must be completed first"})
		return
	}

	_, err = config.DB.Exec(`UPDATE milestones SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND task_id = $3`, strings.ToLower(input.Status), mid, taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update milestone"})
		return
	}

	syncTaskStatusWithMilestones(taskID)
	c.JSON(http.StatusOK, gin.H{"message": "Milestone updated"})
}


func SubmitMilestoneForReview(c *gin.Context) {
	idStr := c.Param("id")
	id64, _ := strconv.ParseUint(idStr, 10, 64)
	taskID := uint(id64)

	midStr := c.Param("mid")
	mid, _ := strconv.Atoi(midStr)

	var input struct {
		Link string `json:"link"`
		Note string `json:"note"`
	}
	if err := c.BindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}


	// SEQUENTIAL CHECK: Check if previous milestones are done
	var incompletePrevCount int
	err := config.DB.QueryRow(`SELECT count(*) FROM milestones WHERE task_id = $1 AND id < $2 AND status != 'done'`, taskID, mid).Scan(&incompletePrevCount)
	if err == nil && incompletePrevCount > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Previous milestones must be completed first"})
		return
	}

	_, err = config.DB.Exec(`
		UPDATE milestones 
		SET status = 'submitted', 
		    submission_link = $1, 
		    submission_note = $2, 
		    updated_at = CURRENT_TIMESTAMP 
		WHERE id = $3 AND task_id = $4`, 
		input.Link, input.Note, mid, taskID)
	
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to submit milestone: " + err.Error()})
		return
	}

	syncTaskStatusWithMilestones(taskID)
	c.JSON(http.StatusOK, gin.H{"message": "Milestone submitted for review"})
}
