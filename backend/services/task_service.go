package services

import (
	"backend/config"
	"backend/models"
	"database/sql"
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
		var assigneeName, assigneePhoto, creatorName, creatorPhoto, description, subject, attachmentURL, priority sql.NullString
		var aiOptimized sql.NullBool
		if err := rows.Scan(&t.ID, &t.Title, &description, &t.Status, &t.Accepted, &t.CreatorID, &t.AssigneeID, &t.Deadline, &t.Progress, &subject, &attachmentURL, &t.CreatedAt, &t.UpdatedAt, &assigneeName, &assigneePhoto, &creatorName, &creatorPhoto, &priority, &aiOptimized, &t.Capacity); err != nil {
			return nil, err
		}
		t.Priority = priority.String
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

	// Bulk fetch milestones
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

	// Bulk fetch assignees
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
	err := config.DB.QueryRow(`SELECT accepted FROM tasks WHERE id = $1`, taskID).Scan(&isAccepted)
	if err != nil {
		return err
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

	var oldStatus string
	config.DB.QueryRow(`SELECT status FROM tasks WHERE id = $1`, taskID).Scan(&oldStatus)

	_, err = config.DB.Exec(`UPDATE tasks SET status = $1, progress = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`, newStatus, progress, taskID)
	if err == nil {
		// Sync all assignees' progress with the global milestone state
		_, _ = config.DB.Exec(`UPDATE task_assignees SET status = $1, progress = $2 WHERE task_id = $3`, newStatus, progress, taskID)
		
		if newStatus == "completed" && oldStatus != "completed" {
			// Gamification removed
		}
	}
	return err
}
