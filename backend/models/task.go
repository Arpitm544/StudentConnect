package models

import "time"

type Task struct {
	ID            uint       `json:"id"`
	Title         string     `json:"title"`
	Description   string     `json:"description"`
	Status        string     `json:"status"`
	Accepted      bool       `json:"accepted"`
	CreatorID     *uint      `json:"creator_id"`
	AssigneeID    *uint      `json:"assignee_id"`
	Deadline      *time.Time `json:"deadline"`
	Progress      int        `json:"progress"`
	Subject       string     `json:"subject"`
	AttachmentURL *string    `json:"attachment_url"`
	AssigneeName  string     `json:"assignee_name"`
	AssigneeEmail string     `json:"assignee_email"`
	CreatorName   string     `json:"creator_name"`
	CreatorEmail  string     `json:"creator_email"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}
