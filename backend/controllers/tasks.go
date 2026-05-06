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

func CreateTask(c *gin.Context) {
	var input struct {
		Title         string  `json:"title"`
		Description   string  `json:"description"`
		Subject       string  `json:"subject"`
		Deadline      *string `json:"deadline"`
		AttachmentURL *string `json:"attachment_url"`
		Capacity      int     `json:"capacity"`
		MaxAssignees  int     `json:"max_assignees"`
	}

	if c.BindJSON(&input) != nil || strings.TrimSpace(input.Title) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	cap := input.Capacity
	if cap < 1 {
		cap = input.MaxAssignees
	}
	if cap < 1 {
		cap = 1
	}

	userID := c.GetInt("user_id")
	var id int64
	err := config.DB.QueryRow(
		`INSERT INTO tasks (title, description, status, accepted, creator_id, deadline, progress, subject, attachment_url, capacity)
		 VALUES ($1,$2,'pending',FALSE,$3,$4,0,$5,$6,$7) RETURNING id`,
		input.Title, input.Description, userID, input.Deadline, input.Subject, input.AttachmentURL, cap,
	).Scan(&id)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create task"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": strconv.FormatInt(id, 10)})

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

func UpdateTask(c *gin.Context) {
	taskID, _ := strconv.Atoi(c.Param("id"))
	userID := c.GetInt("user_id")

	var creatorID int
	err := config.DB.QueryRow("SELECT creator_id FROM tasks WHERE id = $1", taskID).Scan(&creatorID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	if creatorID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized"})
		return
	}

	var input struct {
		Title         string  `json:"title"`
		Description   string  `json:"description"`
		Subject       string  `json:"subject"`
		Deadline      *string `json:"deadline"`
		AttachmentURL *string `json:"attachment_url"`
		Capacity      int     `json:"capacity"`
		MaxAssignees  int     `json:"max_assignees"`
	}

	if c.BindJSON(&input) != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	cap := input.Capacity
	if cap < 1 {
		cap = input.MaxAssignees
	}
	if cap < 1 {
		cap = 1
	}

	_, err = config.DB.Exec(
		`UPDATE tasks 
		 SET title = $1, description = $2, subject = $3, deadline = $4, attachment_url = $5, 
		     capacity = $6, extension_email_sent = FALSE, updated_at = CURRENT_TIMESTAMP 
		 WHERE id = $7`,
		input.Title, input.Description, input.Subject, input.Deadline, input.AttachmentURL, cap, taskID,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update task"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Task updated successfully"})
}

func ListTasks(c *gin.Context) {
	userID := c.GetInt("user_id")

	query := `SELECT t.id, t.title, t.description, t.status, t.accepted, t.creator_id, t.assignee_id, t.deadline, t.progress, t.subject, t.attachment_url, t.created_at, t.updated_at,
	          u_a.name as assignee_name, u_a.photo_url as assignee_photo_url, u_c.name as creator_name, u_c.photo_url as creator_photo_url
	          FROM tasks t LEFT JOIN users u_a ON t.assignee_id = u_a.id LEFT JOIN users u_c ON t.creator_id = u_c.id
	          WHERE t.creator_id <> $1
	            AND (SELECT COUNT(*) FROM task_assignees ta WHERE ta.task_id = t.id) < COALESCE(t.capacity, 1)
	            AND NOT EXISTS (SELECT 1 FROM task_assignees ta2 WHERE ta2.task_id = t.id AND ta2.user_id = $2)
	          ORDER BY t.id DESC`

	tasks, err := services.FetchTasksByQuery(query, userID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list tasks"})
		return
	}
	c.JSON(http.StatusOK, tasks)
}

func ListDashboardTasks(c *gin.Context) {
	userID := c.GetInt("user_id")
	query := `SELECT t.id, t.title, t.description, t.status, t.accepted, t.creator_id, t.assignee_id, t.deadline, t.progress, t.subject, t.attachment_url, t.created_at, t.updated_at,
	          u_a.name as assignee_name, u_a.photo_url as assignee_photo_url, u_c.name as creator_name, u_c.photo_url as creator_photo_url
	          FROM tasks t LEFT JOIN users u_a ON t.assignee_id = u_a.id LEFT JOIN users u_c ON t.creator_id = u_c.id
	          WHERE t.creator_id = $1
	             OR EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = $2)
	          ORDER BY t.id DESC`

	tasks, err := services.FetchTasksByQuery(query, userID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch dashboard"})
		return
	}
	c.JSON(http.StatusOK, tasks)
}

func AcceptTask(c *gin.Context) {
	taskID, _ := strconv.Atoi(c.Param("id"))
	userID := c.GetInt("user_id")

	var creatorID int
	var title string
	var capacity int
	err := config.DB.QueryRow(
		`SELECT creator_id, title, COALESCE(capacity, 1) FROM tasks WHERE id = $1`, taskID,
	).Scan(&creatorID, &title, &capacity)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	if creatorID == userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You cannot accept your own assignment"})
		return
	}

	var exists bool
	config.DB.QueryRow(
		`SELECT EXISTS(SELECT 1 FROM task_assignees WHERE task_id=$1 AND user_id=$2)`, taskID, userID,
	).Scan(&exists)
	if exists {
		c.JSON(http.StatusConflict, gin.H{"error": "You have already accepted this assignment"})
		return
	}

	var currentCount int
	config.DB.QueryRow(
		`SELECT COUNT(*) FROM task_assignees WHERE task_id=$1`, taskID,
	).Scan(&currentCount)
	if currentCount >= capacity {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No slots available — this assignment is full"})
		return
	}
	_, err = config.DB.Exec(
		`INSERT INTO task_assignees (task_id, user_id, status) VALUES ($1, $2, 'accepted')`, taskID, userID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to accept task"})
		return
	}
	config.DB.Exec(
		`UPDATE tasks SET accepted = TRUE, assignee_id = COALESCE(assignee_id, $1), status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
		userID, taskID,
	)

	c.JSON(http.StatusOK, gin.H{"message": "Assignment accepted"})

	go func() {
		var cEmail, aEmail string
		config.DB.QueryRow(`SELECT email FROM users WHERE id=$1`, creatorID).Scan(&cEmail)
		config.DB.QueryRow(`SELECT email FROM users WHERE id=$1`, userID).Scan(&aEmail)
		services.SendAssignmentAcceptedEmail(cEmail, title, "Your assignment has been accepted")
		services.SendAssignmentAcceptedEmail(aEmail, title, "You have accepted this assignment")
	}()
}

func GetTask(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	userID := c.GetInt("user_id")

	query := `SELECT t.id, t.title, t.description, t.status, t.accepted, t.creator_id, t.assignee_id, t.deadline, t.progress, t.subject, t.attachment_url, 
	          t.submission_github as submission_link, COALESCE(t.capacity, 1), t.created_at, t.updated_at,
	          u_c.name, u_c.email, u_c.photo_url, u_a.name, u_a.email, u_a.photo_url
	          FROM tasks t LEFT JOIN users u_c ON t.creator_id = u_c.id LEFT JOIN users u_a ON t.assignee_id = u_a.id WHERE t.id = $1`

	var t models.Task
	var desc, subj, attach, subL sql.NullString
	var cn, ce, cp, an, ae, ap sql.NullString
	var cid, aid sql.NullInt64

	err := config.DB.QueryRow(query, id).Scan(
		&t.ID, &t.Title, &desc, &t.Status, &t.Accepted, &cid, &aid, &t.Deadline, &t.Progress, &subj, &attach,
		&subL, &t.Capacity, &t.CreatedAt, &t.UpdatedAt,
		&cn, &ce, &cp, &an, &ae, &ap,
	)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	t.Description = desc.String
	t.Subject = subj.String
	if attach.Valid {
		t.AttachmentURL = &attach.String
	}
	t.CreatorName, t.CreatorEmail, t.CreatorPhotoURL = cn.String, ce.String, cp.String
	t.AssigneeName, t.AssigneeEmail, t.AssigneePhotoURL = an.String, ae.String, ap.String
	if subL.Valid {
		t.SubmissionLink = &subL.String
	}

	if cid.Valid {
		ucid := uint(cid.Int64)
		t.CreatorID = &ucid
	}
	if aid.Valid {
		uaid := uint(aid.Int64)
		t.AssigneeID = &uaid
	}
	t.Assignees = make([]models.TaskAssignee, 0)
	aRows, _ := config.DB.Query(`
		SELECT ta.task_id, ta.user_id, ta.status, ta.progress, ta.submission_link, ta.accepted_at,
		       u.name, u.email, u.photo_url
		FROM task_assignees ta JOIN users u ON ta.user_id = u.id
		WHERE ta.task_id = $1
	`, id)
	if aRows != nil {
		defer aRows.Close()
		for aRows.Next() {
			var a models.TaskAssignee
			var sl sql.NullString
			aRows.Scan(&a.TaskID, &a.UserID, &a.Status, &a.Progress, &sl, &a.AcceptedAt, &a.Name, &a.Email, &a.PhotoURL)
			if sl.Valid {
				a.SubmissionLink = &sl.String
			}
			t.Assignees = append(t.Assignees, a)
		}
	}
	t.SlotsFilled = len(t.Assignees)

	if t.Status != "pending" && t.Accepted {
		isCreator := cid.Valid && int(cid.Int64) == userID
		isAssignee := false
		for _, a := range t.Assignees {
			if int(a.UserID) == userID {
				isAssignee = true
				break
			}
		}
		if !isCreator && !isAssignee && t.SlotsFilled >= t.Capacity {
			c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized access (Task is full)"})
			return
		}
	}

	mRows, _ := config.DB.Query(`SELECT id, title, status, submission_link, submission_note, created_at, updated_at FROM milestones WHERE task_id = $1 ORDER BY id ASC`, id)
	defer mRows.Close()
	for mRows.Next() {
		var m models.Milestone
		var sl, sn sql.NullString
		mRows.Scan(&m.ID, &m.Title, &m.Status, &sl, &sn, &m.CreatedAt, &m.UpdatedAt)
		if sl.Valid {
			m.SubmissionLink = &sl.String
		}
		if sn.Valid {
			m.SubmissionNote = &sn.String
		}
		t.Milestones = append(t.Milestones, m)
	}

	c.JSON(http.StatusOK, t)

}

func InviteUser(c *gin.Context) {
	taskID, _ := strconv.Atoi(c.Param("id"))
	userID := c.GetInt("user_id")

	var input struct {
		Email string `json:"email"`
	}
	if err := c.BindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid email"})
		return
	}

	var creatorID int
	var taskTitle string
	err := config.DB.QueryRow(`SELECT creator_id, title FROM tasks WHERE id = $1`, taskID).Scan(&creatorID, &taskTitle)
	if err != nil || creatorID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only creators can invite users"})
		return
	}

	_, err = config.DB.Exec(`INSERT INTO task_invitations (task_id, invitee_email) VALUES ($1, $2)`, taskID, input.Email)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Invitation already sent to this user"})
		return
	}
	go func() {
		var creatorName string
		config.DB.QueryRow(`SELECT name FROM users WHERE id = $1`, userID).Scan(&creatorName)
		services.SendAssignmentAcceptedEmail(input.Email, taskTitle, fmt.Sprintf("%s has requested you to work on their assignment", creatorName))
	}()

	c.JSON(http.StatusOK, gin.H{"message": "Invitation sent successfully"})
}

func ListInvitations(c *gin.Context) {
	userEmail := c.GetString("user_email")
	if userEmail == "" {
		userID := c.GetInt("user_id")
		config.DB.QueryRow(`SELECT email FROM users WHERE id = $1`, userID).Scan(&userEmail)
	}

	rows, err := config.DB.Query(`
		SELECT i.id, i.task_id, i.invitee_email, i.status, i.created_at, t.title, u.name
		FROM task_invitations i
		JOIN tasks t ON i.task_id = t.id
		JOIN users u ON t.creator_id = u.id
		WHERE i.invitee_email = $1 AND i.status = 'pending'`, userEmail)
	
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch invitations"})
		return
	}
	defer rows.Close()

	invitations := make([]models.TaskInvitation, 0)
	for rows.Next() {
		var i models.TaskInvitation
		rows.Scan(&i.ID, &i.TaskID, &i.InviteeEmail, &i.Status, &i.CreatedAt, &i.TaskTitle, &i.CreatorName)
		invitations = append(invitations, i)
	}

	c.JSON(http.StatusOK, invitations)
}

// RespondToInvitation - Accept or Reject
func RespondToInvitation(c *gin.Context) {
	invitationID, _ := strconv.Atoi(c.Param("id"))
	userID := c.GetInt("user_id")
	userEmail := c.GetString("user_email")
	if userEmail == "" {
		config.DB.QueryRow(`SELECT email FROM users WHERE id = $1`, userID).Scan(&userEmail)
	}

	var input struct {
		Action string `json:"action"` // "accept" or "reject"
	}
	c.BindJSON(&input)

	var taskID int
	var inviteeEmail string
	err := config.DB.QueryRow(`SELECT task_id, invitee_email FROM task_invitations WHERE id = $1`, invitationID).Scan(&taskID, &inviteeEmail)
	if err != nil || inviteeEmail != userEmail {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized"})
		return
	}

	if input.Action == "reject" {
		config.DB.Exec(`UPDATE task_invitations SET status = 'rejected' WHERE id = $1`, invitationID)
		c.JSON(http.StatusOK, gin.H{"message": "Invitation rejected"})
		return
	}

	tx, _ := config.DB.Begin()
	
	tx.Exec(`INSERT INTO task_assignees (task_id, user_id, status) VALUES ($1, $2, 'accepted') ON CONFLICT DO NOTHING`, taskID, userID)
	tx.Exec(`UPDATE tasks SET accepted = TRUE, assignee_id = COALESCE(assignee_id, $1), status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE id = $2`, userID, taskID)
	tx.Exec(`UPDATE task_invitations SET status = 'accepted' WHERE id = $1`, invitationID)
	
	tx.Commit()

	c.JSON(http.StatusOK, gin.H{"message": "Invitation accepted"})
}

func AddMilestone(c *gin.Context) {
	taskID, _ := strconv.Atoi(c.Param("id"))
	var input struct {
		Title string `json:"title"`
	}
	c.BindJSON(&input)

	config.DB.Exec(`INSERT INTO milestones (task_id, title, status) VALUES ($1, $2, 'pending')`, taskID, input.Title)
	services.SyncTaskStatusWithMilestones(uint(taskID))
	c.JSON(http.StatusCreated, gin.H{"message": "Milestone added"})
}

func UpdateMilestoneStatus(c *gin.Context) {
	taskID, _ := strconv.Atoi(c.Param("id"))
	mid, _ := strconv.Atoi(c.Param("mid"))
	var input struct {
		Status string `json:"status"`
	}
	c.BindJSON(&input)

	config.DB.Exec(`UPDATE milestones SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND task_id = $3`, strings.ToLower(input.Status), mid, taskID)
	services.SyncTaskStatusWithMilestones(uint(taskID))
	c.JSON(http.StatusOK, gin.H{"message": "Milestone updated"})
}

// SubmitMilestoneForReview handles the submission of a specific milestone
func SubmitMilestoneForReview(c *gin.Context) {
	taskID, _ := strconv.Atoi(c.Param("id"))
	mid, _ := strconv.Atoi(c.Param("mid"))
	var input struct {
		Link string `json:"link"`
		Note string `json:"note"`
	}
	c.BindJSON(&input)

	config.DB.Exec(`UPDATE milestones SET status = 'submitted', submission_link = $1, submission_note = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND task_id = $4`, input.Link, input.Note, mid, taskID)
	services.SyncTaskStatusWithMilestones(uint(taskID))
	c.JSON(http.StatusOK, gin.H{"message": "Milestone submitted"})
}

func UpdateTaskStatus(c *gin.Context) {
	taskID, _ := strconv.Atoi(c.Param("id"))
	userID := c.GetInt("user_id")

	var input struct {
		Status   string `json:"status"`
		Progress int    `json:"progress"`
	}
	if err := c.BindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	var creatorID int
	err := config.DB.QueryRow("SELECT creator_id FROM tasks WHERE id = $1", taskID).Scan(&creatorID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	if creatorID == userID {
		config.DB.Exec(`UPDATE tasks SET status = $1, progress = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`, 
			strings.ToLower(input.Status), input.Progress, taskID)
		c.JSON(http.StatusOK, gin.H{"message": "Global status updated"})
		return
	}

	var exists bool
	config.DB.QueryRow(`SELECT EXISTS(SELECT 1 FROM task_assignees WHERE task_id=$1 AND user_id=$2)`, taskID, userID).Scan(&exists)
	if exists {
		config.DB.Exec(`UPDATE task_assignees SET status = $1, progress = $2 WHERE task_id = $3 AND user_id = $4`, 
			strings.ToLower(input.Status), input.Progress, taskID, userID)
		

		c.JSON(http.StatusOK, gin.H{"message": "Your progress updated"})
		return
	}

	c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized to update status"})
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

func LeaveTask(c *gin.Context) {
	taskID, _ := strconv.Atoi(c.Param("id"))
	userID := c.GetInt("user_id")
	config.DB.Exec(`DELETE FROM task_assignees WHERE task_id = $1 AND user_id = $2`, taskID, userID)
	var count int
	config.DB.QueryRow(`SELECT COUNT(*) FROM task_assignees WHERE task_id = $1`, taskID).Scan(&count)
	if count == 0 {
		config.DB.Exec(`UPDATE tasks SET accepted = FALSE, assignee_id = NULL, status = 'pending', progress = 0, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, taskID)
		config.DB.Exec(`UPDATE milestones SET status = 'pending', submission_link = NULL WHERE task_id = $1`, taskID)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Left task"})
}

func ListMyTasks(c *gin.Context) {
	userID := c.GetInt("user_id")
	query := `SELECT t.id, t.title, t.description, t.status, t.accepted, t.creator_id, t.assignee_id, t.deadline, t.progress, t.subject, t.attachment_url, t.created_at, t.updated_at,
	          u_a.name, u_a.photo_url, u_c.name, u_c.photo_url
	          FROM tasks t LEFT JOIN users u_a ON t.assignee_id = u_a.id LEFT JOIN users u_c ON t.creator_id = u_c.id
	          WHERE EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = $1)`
	tasks, _ := services.FetchTasksByQuery(query, userID)
	c.JSON(http.StatusOK, tasks)
}

func ListPostedTasks(c *gin.Context) {
	userID := c.GetInt("user_id")
	query := `SELECT t.id, t.title, t.description, t.status, t.accepted, t.creator_id, t.assignee_id, t.deadline, t.progress, t.subject, t.attachment_url, t.created_at, t.updated_at,
	          u_a.name, u_a.photo_url, u_c.name, u_c.photo_url
	          FROM tasks t LEFT JOIN users u_a ON t.assignee_id = u_a.id LEFT JOIN users u_c ON t.creator_id = u_c.id WHERE t.creator_id = $1`
	tasks, _ := services.FetchTasksByQuery(query, userID)
	c.JSON(http.StatusOK, tasks)
}

func ListActiveTasks(c *gin.Context) {
	userID := c.GetInt("user_id")
	query := `SELECT t.id, t.title, t.description, t.status, t.accepted, t.creator_id, t.assignee_id, t.deadline, t.progress, t.subject, t.attachment_url, t.created_at, t.updated_at,
	          u_a.name, u_a.photo_url, u_c.name, u_c.photo_url
	          FROM tasks t LEFT JOIN users u_a ON t.assignee_id = u_a.id LEFT JOIN users u_c ON t.creator_id = u_c.id 
	          WHERE (t.creator_id = $1 OR EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = $2)) 
	          AND t.status IN ('accepted', 'in_progress', 'submitted')`
	tasks, _ := services.FetchTasksByQuery(query, userID, userID)
	c.JSON(http.StatusOK, tasks)
}
