package models

import "time"

type Milestone struct {
	ID        uint      `json:"id,string"`
	TaskID    uint      `json:"task_id,string"`
	Title     string    `json:"title"`
	Status    string    `json:"status"`
	SubmissionLink *string `json:"submission_link"`
	SubmissionNote *string `json:"submission_note"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Task struct {
	ID            uint       `json:"id,string"`
	Title         string     `json:"title"`
	Description   string     `json:"description"`
	Status        string     `json:"status"`
	Accepted      bool       `json:"accepted"`
	CreatorID     *uint      `json:"creator_id,string"`
	AssigneeID    *uint      `json:"assignee_id,string"`
	Deadline      *time.Time `json:"deadline"`
	Progress      int        `json:"progress"`
	Subject       string     `json:"subject"`
	AttachmentURL *string    `json:"attachment_url"`

	// Proof of Work Submissions
	SubmissionGithub *string `json:"submission_github"`
	SubmissionDocs   *string `json:"submission_docs"`
	SubmissionDrive  *string `json:"submission_drive"`
	SubmissionNotes  *string `json:"submission_notes"`

	Milestones    []Milestone `json:"milestones"`
	
	AssigneeName     string     `json:"assignee_name"`
	AssigneeEmail    string     `json:"assignee_email"`
	AssigneePhotoURL string     `json:"assignee_photo_url"`
	CreatorName      string     `json:"creator_name"`
	CreatorEmail     string     `json:"creator_email"`
	CreatorPhotoURL  string     `json:"creator_photo_url"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}
