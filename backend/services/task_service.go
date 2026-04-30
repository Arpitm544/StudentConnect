package services

import (
	"backend/config"
	"backend/models"
	"database/sql"
	"strings"
)

// FetchTasksByQuery executes a task list query and returns hydrated task models
func FetchTasksByQuery(query string, args ...any) ([]models.Task, error) {
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

// SyncTaskStatusWithMilestones recalculates task status based on its milestones
func SyncTaskStatusWithMilestones(taskID uint) error {
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

	// Calculate Progress %
	doneCount := 0
	for _, s := range statuses {
		if s == "done" {
			doneCount++
		}
	}
	progress = (doneCount * 100) / len(statuses)

	if allDone {
		newStatus = "completed"
		progress = 100
	} else if anyInReview {
		newStatus = "submitted"
	} else if anyInProgress {
		newStatus = "in_progress"
	}

	_, err = config.DB.Exec(`UPDATE tasks SET status = $1, progress = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`, newStatus, progress, taskID)
	return err
}
