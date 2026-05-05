package models

import (
	"time"
)

type User struct {
	ID                       uint       `json:"id,string"`
	UID                      *string    `json:"uid"`
	Name                     string     `json:"name"`
	Email                    string     `json:"email"`
	PhotoURL                 *string    `json:"photo_url"`
	Provider                 string     `json:"provider"`
	Password                 *string    `json:"password,omitempty"`
	IsVerified               bool       `json:"is_verified"`
	EmailVerified            bool       `json:"email_verified"`
	VerificationToken        *string    `json:"-"`
	VerificationTokenExpires *time.Time `json:"-"`
	VerificationSentAt       *time.Time `json:"-"`
	Field                    *string    `json:"field"`
	CollegeName              *string    `json:"college_name"`
	Year                     *string    `json:"year"`
	CreatedAt                time.Time  `json:"created_at"`
	UpdatedAt                time.Time  `json:"updated_at"`
}
