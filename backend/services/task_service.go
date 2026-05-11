package services

import (
	"backend/config"
	"backend/models"
	"database/sql"
	"fmt"
	"strings"

	"github.com/lib/pq"
)

func FetchTasksByQuery(query string, args ...any) ([]models.Task, error) {
	rows, err := config.DB.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tasks := make([]models.Task, 0)
	taskIDs := make([]int64, 0)
	taskMap := make(map[int64]*models.Task)

	for rows.Next() {
		var t models.Task
		var assigneeName, assigneePhoto, creatorName, creatorPhoto, description, subject, attachmentURL, priority, issueType sql.NullString
		var labels []string
		var aiOptimized sql.NullBool
		if err := rows.Scan(&t.ID, &t.Title, &description, &t.Status, &t.Accepted, &t.CreatorID, &t.AssigneeID, &t.Deadline, &t.Progress, &subject, &attachmentURL, &t.CreatedAt, &t.UpdatedAt, &assigneeName, &assigneePhoto, &creatorName, &creatorPhoto, &priority, &aiOptimized, &t.Capacity, &issueType, pq.Array(&labels)); err != nil {
			return nil, err
		}
		t.Priority = priority.String
		t.IssueType = issueType.String
		t.Labels = labels
		if t.IssueType == "" {
			t.IssueType = "Task"
		}
		if t.Labels == nil {
			t.Labels = []string{}
		}
		t.AiOptimized = aiOptimized.Bool
		t.AssigneeName = assigneeName.String
		t.AssigneePhotoURL = assigneePhoto.String
		t.CreatorName = creatorName.String
		t.CreatorPhotoURL = creatorPhoto.String
		t.Description = description.String
		t.Subject = subject.String
		if attachmentURL.Valid {
			t.AttachmentURL = &attachmentURL.String
		}
		if t.Capacity < 1 {
			t.Capacity = 1
		}

		t.Milestones = make([]models.Milestone, 0)
		t.Assignees = make([]models.TaskAssignee, 0)
		t.SlotsFilled = 0

		tasks = append(tasks, t)
	}

	if len(tasks) == 0 {
		return tasks, nil
	}

	for i := range tasks {
		taskIDs = append(taskIDs, tasks[i].ID)
		taskMap[tasks[i].ID] = &tasks[i]
	}

	mRows, err := config.DB.Query(`SELECT id, task_id, title, status, submission_link, submission_note, created_at, updated_at FROM milestones WHERE task_id = ANY($1) ORDER BY id ASC`, pq.Array(taskIDs))
	if err == nil {
		defer mRows.Close()
		for mRows.Next() {
			var m models.Milestone
			if err := mRows.Scan(&m.ID, &m.TaskID, &m.Title, &m.Status, &m.SubmissionLink, &m.SubmissionNote, &m.CreatedAt, &m.UpdatedAt); err == nil {
				if t, ok := taskMap[m.TaskID]; ok {
					t.Milestones = append(t.Milestones, m)
				}
			}
		}
	}

	aRows, aErr := config.DB.Query(`
		SELECT ta.task_id, ta.user_id, ta.status, ta.progress, ta.submission_link, ta.accepted_at,
		       u.name, u.email, u.photo_url
		FROM task_assignees ta JOIN users u ON ta.user_id = u.id
		WHERE ta.task_id = ANY($1)`, pq.Array(taskIDs))
	if aErr == nil {
		defer aRows.Close()
		for aRows.Next() {
			var a models.TaskAssignee
			var sl sql.NullString
			if err := aRows.Scan(&a.TaskID, &a.UserID, &a.Status, &a.Progress, &sl, &a.AcceptedAt, &a.Name, &a.Email, &a.PhotoURL); err == nil {
				if sl.Valid {
					a.SubmissionLink = &sl.String
				}
				if t, ok := taskMap[a.TaskID]; ok {
					t.Assignees = append(t.Assignees, a)
					t.SlotsFilled++
				}
			}
		}
	}

	return tasks, nil
}

func SyncTaskStatusWithMilestones(taskID int64) error {
	var isAccepted bool
	var inTasksTable bool = true
	err := config.DB.QueryRow(`SELECT accepted FROM tasks WHERE id = $1`, taskID).Scan(&isAccepted)
	if err != nil {
		if err == sql.ErrNoRows {
			var exists bool
			errW := config.DB.QueryRow(`SELECT EXISTS(SELECT 1 FROM workspace_tasks WHERE id = $1)`, taskID).Scan(&exists)
			if errW != nil || !exists {
				return fmt.Errorf("task not found in any table")
			}
			isAccepted = true
			inTasksTable = false
		} else {
			return err
		}
	}

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
		return nil
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

	doneCount := 0
	for _, s := range statuses {
		if s == "done" {
			doneCount++
		}
	}
	progress = (doneCount * 100) / len(statuses)

	if isAccepted {
		if allDone {
			newStatus = "completed"
			progress = 100
		} else if anyInReview {
			newStatus = "submitted"
		} else if anyInProgress {
			newStatus = "in_progress"
		}
	} else {
		newStatus = "pending"
	}

	if inTasksTable {
		_, err = config.DB.Exec(`UPDATE tasks SET status = $1, progress = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`, newStatus, progress, taskID)
		if err == nil {
			_, _ = config.DB.Exec(`UPDATE task_assignees SET status = $1, progress = $2 WHERE task_id = $3`, newStatus, progress, taskID)
		}
	} else {
		_, err = config.DB.Exec(`UPDATE workspace_tasks SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, newStatus, taskID)
	}
	
	return err
}

func LogActivity(taskID int64, userID int64, action string, details string) {
	_, err := config.DB.Exec(`INSERT INTO activities (task_id, user_id, action, details) VALUES ($1, $2, $3, $4)`, taskID, userID, action, details)
	if err != nil {
		fmt.Printf("❌ Failed to log activity: %v\n", err)
	} else {
		fmt.Printf("✅ Activity logged: %s for task %d\n", action, taskID)
	}
}

func FetchActivities(taskID int64) ([]models.Activity, error) {
	rows, err := config.DB.Query(`
		SELECT a.id, a.task_id, a.user_id, a.action, a.details, a.created_at, u.name
		FROM activities a
		JOIN users u ON a.user_id = u.id
		WHERE a.task_id = $1
		ORDER BY a.created_at DESC`, taskID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var activities []models.Activity
	for rows.Next() {
		var a models.Activity
		if err := rows.Scan(&a.ID, &a.TaskID, &a.UserID, &a.Action, &a.Details, &a.CreatedAt, &a.UserName); err == nil {
			activities = append(activities, a)
		}
	}
	return activities, nil
}

func FetchTaskLinks(taskID int64) ([]models.TaskLink, error) {
	rows, err := config.DB.Query(`
		SELECT tl.id, tl.source_task_id, tl.target_task_id, tl.link_type, tl.created_at,
		       t.title as target_title, t.status as target_status
		FROM task_links tl
		JOIN tasks t ON tl.target_task_id = t.id
		WHERE tl.source_task_id = $1`, taskID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var links []models.TaskLink
	for rows.Next() {
		var l models.TaskLink
		if err := rows.Scan(&l.ID, &l.SourceTaskID, &l.TargetTaskID, &l.LinkType, &l.CreatedAt, &l.TargetTitle, &l.TargetStatus); err == nil {
			links = append(links, l)
		}
	}
	return links, nil
}
