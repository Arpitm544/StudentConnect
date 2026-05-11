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
	AssigneeID     *int64    `json:"assignee_id,string"`
	SubmissionLink *string   `json:"submission_link"`
	SubmissionNote *string   `json:"submission_note"`
	Position       int       `json:"position"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`

	AssigneeName     string `json:"assignee_name"`
	AssigneePhotoURL string `json:"assignee_photo_url"`
}

type TaskAssignee struct {
	TaskID         int64     `json:"task_id,string"`
	UserID         int64     `json:"user_id,string"`
	Status         string    `json:"status"`
	Progress       int       `json:"progress"`
	SubmissionLink *string   `json:"submission_link"`
	AcceptedAt     time.Time `json:"accepted_at"`

	Name     string `json:"name"`
	Email    string `json:"email"`
	PhotoURL string `json:"photo_url"`
}

type Activity struct {
	ID        int64     `json:"id,string"`
	TaskID    int64     `json:"task_id,string"`
	UserID    int64     `json:"user_id,string"`
	Action    string    `json:"action"`
	Details   string    `json:"details"`
	CreatedAt time.Time `json:"created_at"`
	UserName  string    `json:"user_name"`
}

type TaskLink struct {
	ID           int64     `json:"id,string"`
	SourceTaskID int64     `json:"source_task_id,string"`
	TargetTaskID int64     `json:"target_task_id,string"`
	LinkType     string    `json:"link_type"`
	CreatedAt    time.Time `json:"created_at"`

	TargetTitle  string `json:"target_title"`
	TargetStatus string `json:"target_status"`
}

type Task struct {
	ID            int64      `json:"id,string"`
	Title         string     `json:"title"`
	Description   string     `json:"description"`
	Status        string     `json:"status"`
	Accepted      bool       `json:"accepted"`
	CreatorID     *int64     `json:"creator_id,string"`
	AssigneeID    *int64     `json:"assignee_id,string"`
	Deadline      *time.Time `json:"deadline"`
	Progress      int        `json:"progress"`
	Subject       string     `json:"subject"`
	AttachmentURL *string    `json:"attachment_url"`
	ExtensionEmailSent bool  `json:"extension_email_sent"`
	SubmissionLink *string   `json:"submission_link"`

	Capacity    int            `json:"capacity"`
	SlotsFilled int            `json:"slots_filled"`
	Assignees   []TaskAssignee `json:"assignees"`

	Milestones []Milestone `json:"milestones"`
	Activities []Activity  `json:"activities"`
	Links      []TaskLink  `json:"links"`
	Priority          string      `json:"priority"`
	IssueType         string      `json:"issue_type"`
	Labels            []string    `json:"labels"`
	AiOptimized       bool        `json:"ai_optimized"`
	AiMilestoneCount int         `json:"ai_milestone_count"`

	AssigneeName     string    `json:"assignee_name"`
	AssigneeEmail    string    `json:"assignee_email"`
	AssigneePhotoURL string    `json:"assignee_photo_url"`
	CreatorName      string    `json:"creator_name"`
	CreatorEmail     string    `json:"creator_email"`
	CreatorPhotoURL  string    `json:"creator_photo_url"`

	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
	WorkspaceID      *int64    `json:"workspace_id,string"`
	UserRole         string    `json:"user_role"`
}

type TaskInvitation struct {
	ID           int64     `json:"id,string"`
	TaskID       int64     `json:"task_id,string"`
	InviteeEmail string    `json:"invitee_email"`
	Status       string    `json:"status"`
	CreatedAt    time.Time `json:"created_at"`
	
	TaskTitle       string     `json:"task_title"`
	TaskDescription string     `json:"task_description"`
	TaskSubject     string     `json:"task_subject"`
	TaskDeadline    *time.Time `json:"task_deadline"`
	CreatorName     string     `json:"creator_name"`
}
