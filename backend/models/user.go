package models

import (
	"time"
)

type User struct {
	ID        uint
	UID       *string
	Name      string
	Email     string
	PhotoURL  *string
	Provider  string
	Password  *string
	CreatedAt time.Time
	UpdatedAt time.Time
}
