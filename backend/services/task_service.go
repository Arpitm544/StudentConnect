package services

import (
	"backend/config"
	"backend/models"
	"database/sql"
	"strings"
)

func FetchTasksByQuery(query string, args ...any) ([]models.Task, error) {
	rows, err := config.DB.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tasks := make([]models.Task, 0)

	for rows.Next() {
		var t models.Task
		var assigneeName, assigneePhoto, creatorName, creatorPhoto, description, subject, attachmentURL, priority sql.NullString
		var aiOptimized sql.NullBool
		if err := rows.Scan(&t.ID, &t.Title, &description, &t.Status, &t.Accepted, &t.CreatorID, &t.AssigneeID, &t.Deadline, &t.Progress, &subject, &attachmentURL, &t.CreatedAt, &t.UpdatedAt, &assigneeName, &assigneePhoto, &creatorName, &creatorPhoto, &priority, &aiOptimized); err != nil {
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

		// Fetch assignees from join table
		t.Assignees = make([]models.TaskAssignee, 0)
		aRows, aErr := config.DB.Query(`
			SELECT ta.task_id, ta.user_id, ta.status, ta.progress, ta.submission_link, ta.accepted_at,
			       u.name, u.email, u.photo_url
			FROM task_assignees ta JOIN users u ON ta.user_id = u.id
			WHERE ta.task_id = $1`, t.ID)
		if aErr == nil {
			for aRows.Next() {
				var a models.TaskAssignee
				var sl sql.NullString
				if err := aRows.Scan(&a.TaskID, &a.UserID, &a.Status, &a.Progress, &sl, &a.AcceptedAt, &a.Name, &a.Email, &a.PhotoURL); err == nil {
					if sl.Valid {
						a.SubmissionLink = &sl.String
					}
					t.Assignees = append(t.Assignees, a)
				}
			}
			aRows.Close()
		}
		t.SlotsFilled = len(t.Assignees)

		// Fetch capacity
		config.DB.QueryRow(`SELECT COALESCE(capacity, 1) FROM tasks WHERE id = $1`, t.ID).Scan(&t.Capacity)
		if t.Capacity < 1 {
			t.Capacity = 1
		}

		tasks = append(tasks, t)
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

	_, err = config.DB.Exec(`UPDATE tasks SET status = $1, progress = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`, newStatus, progress, taskID)
	if err == nil {
		// Sync all assignees' progress with the global milestone state
		_, _ = config.DB.Exec(`UPDATE task_assignees SET status = $1, progress = $2 WHERE task_id = $3`, newStatus, progress, taskID)
	}
	return err
}
