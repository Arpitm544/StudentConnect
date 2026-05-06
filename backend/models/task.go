package models

import (
	"time"
)

type UserBasic struct {
	ID       int64  `json:"id,string"`
	Name     string `json:"name"`
	Email    string `json:"email"`
	PhotoURL string `json:"photo_url"`
}

type Milestone struct {
	ID             int64     `json:"id,string"`
	TaskID         int64     `json:"task_id,string"`
	Title          string    `json:"title"`
	Status         string    `json:"status"`
	SubmissionLink *string   `json:"submission_link"`
	SubmissionNote *string   `json:"submission_note"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// TaskAssignee represents one user's slot on a multi-assignee task.
type TaskAssignee struct {
	TaskID         int64     `json:"task_id,string"`
	UserID         int64     `json:"user_id,string"`
	Status         string    `json:"status"`
	Progress       int       `json:"progress"`
	SubmissionLink *string   `json:"submission_link"`
	AcceptedAt     time.Time `json:"accepted_at"`

	// Join fields (from users table)
	Name     string `json:"name"`
	Email    string `json:"email"`
	PhotoURL string `json:"photo_url"`
}

type Task struct {
	ID            int64      `json:"id,string"`
	Title         string     `json:"title"`
	Description   string     `json:"description"`
	Status        string     `json:"status"`
	Accepted      bool       `json:"accepted"`
	CreatorID     *int64     `json:"creator_id,string"`
	AssigneeID    *int64     `json:"assignee_id,string"` // kept for backward compat
	Deadline      *time.Time `json:"deadline"`
	Progress      int        `json:"progress"`
	Subject       string     `json:"subject"`
	AttachmentURL *string    `json:"attachment_url"`
	ExtensionEmailSent bool  `json:"extension_email_sent"`
	SubmissionLink *string   `json:"submission_link"`

	// Multi-assignee fields
	Capacity    int            `json:"capacity"`
	SlotsFilled int            `json:"slots_filled"` // computed: len(Assignees)
	Assignees   []TaskAssignee `json:"assignees"`

	Milestones []Milestone `json:"milestones"`
	Priority          string      `json:"priority"`
	AiOptimized       bool        `json:"ai_optimized"`
	AiMilestoneCount int         `json:"ai_milestone_count"`

	// Backward-compat join fields (used by FetchTasksByQuery)
	AssigneeName     string    `json:"assignee_name"`
	AssigneeEmail    string    `json:"assignee_email"`
	AssigneePhotoURL string    `json:"assignee_photo_url"`
	CreatorName      string    `json:"creator_name"`
	CreatorEmail     string    `json:"creator_email"`
	CreatorPhotoURL  string    `json:"creator_photo_url"`

	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

type TaskInvitation struct {
	ID           int64     `json:"id,string"`
	TaskID       int64     `json:"task_id,string"`
	InviteeEmail string    `json:"invitee_email"`
	Status       string    `json:"status"`
	CreatedAt    time.Time `json:"created_at"`
	
	// Join fields
	TaskTitle       string     `json:"task_title"`
	TaskDescription string     `json:"task_description"`
	TaskSubject     string     `json:"task_subject"`
	TaskDeadline    *time.Time `json:"task_deadline"`
	CreatorName     string     `json:"creator_name"`
}
