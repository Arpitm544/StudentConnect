package config

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/lib/pq"
)

var DB *sql.DB

func ConnectDatabase() {
	dsn := os.Getenv("DATABASE_URL")

	if dsn == "" {
		log.Fatal("DATABASE_URL not set in environment")
	}

	database, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatal("Failed to open database connection:", err)
	}

	err = retry(5, 2*time.Second, func() error {
		return database.Ping()
	})
	if err != nil {
		log.Fatal("Failed to connect to database after retries:", err)
	}

	DB = database
	fmt.Println("✅ Connected to CockroachDB")

	createUsersTable := `
	CREATE TABLE IF NOT EXISTS users (
		id BIGINT PRIMARY KEY DEFAULT unique_rowid(),
		uid VARCHAR(128) UNIQUE,
		name VARCHAR(255) NOT NULL,
		email VARCHAR(255) NOT NULL UNIQUE,
		photo_url TEXT,
		provider VARCHAR(32) NOT NULL DEFAULT 'password',
		password TEXT,
		email_verified BOOLEAN NOT NULL DEFAULT FALSE,
		is_verified BOOLEAN NOT NULL DEFAULT FALSE,
		verification_token TEXT,
		verification_token_expires TIMESTAMP,
		verification_sent_at TIMESTAMP,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
	);`

	if _, err := DB.Exec(createUsersTable); err != nil {
		log.Fatal("Failed to create users table:", err) //Fatal means stop the program if DB setup fails
	}

	migrations := []string{
		"ALTER TABLE users ADD COLUMN IF NOT EXISTS uid VARCHAR(128) UNIQUE",
		"ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT",
		"ALTER TABLE users ADD COLUMN IF NOT EXISTS provider VARCHAR(32) DEFAULT 'password'",
		"ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE",
		"ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE",
		"ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token TEXT",
		"ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP",
		"ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_sent_at TIMESTAMP",
		"ALTER TABLE users ADD COLUMN IF NOT EXISTS field VARCHAR(255)",
		"ALTER TABLE users ADD COLUMN IF NOT EXISTS college_name VARCHAR(255)",
		"ALTER TABLE users ADD COLUMN IF NOT EXISTS year VARCHAR(50)",
		"UPDATE users SET is_verified = email_verified WHERE is_verified IS FALSE AND email_verified IS TRUE",
	}

	for _, m := range migrations {
		_, _ = DB.Exec(m)
	}

	_, _ = DB.Exec(`
		UPDATE users
		SET is_verified = TRUE, email_verified = TRUE
		WHERE provider = 'password'
		  AND COALESCE(is_verified, FALSE) = FALSE
		  AND created_at < '2026-04-22'
	`)

	tasksTableQuery := `
	CREATE TABLE IF NOT EXISTS tasks (
		id BIGINT PRIMARY KEY DEFAULT unique_rowid(),
		title TEXT NOT NULL,
		description TEXT,
		status VARCHAR(50) NOT NULL DEFAULT 'pending',
		accepted BOOLEAN NOT NULL DEFAULT FALSE,
		creator_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
		assignee_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
		deadline TIMESTAMP,
		progress INT NOT NULL DEFAULT 0,
		subject TEXT,
		attachment_url TEXT,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
	);`

	if _, err := DB.Exec(tasksTableQuery); err != nil {
		log.Fatal("Failed to create tasks table:", err)
	}


	tasksMigrations := []string{
		"ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachment_url TEXT",
		"ALTER TABLE tasks ADD COLUMN IF NOT EXISTS submission_github TEXT",
		"ALTER TABLE tasks ADD COLUMN IF NOT EXISTS submission_docs TEXT",
		"ALTER TABLE tasks ADD COLUMN IF NOT EXISTS submission_drive TEXT",
		"ALTER TABLE tasks ADD COLUMN IF NOT EXISTS submission_notes TEXT",
		"ALTER TABLE tasks ADD COLUMN IF NOT EXISTS extension_email_sent BOOLEAN DEFAULT FALSE",
		"ALTER TABLE tasks ADD COLUMN IF NOT EXISTS max_assignees INT DEFAULT 1",
		"ALTER TABLE tasks ADD COLUMN IF NOT EXISTS capacity INT NOT NULL DEFAULT 1",
		"ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'Medium'",
		"ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ai_optimized BOOLEAN DEFAULT FALSE",
		"ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ai_milestone_count INT DEFAULT 0",
	}

	for _, m := range tasksMigrations {
		_, _ = DB.Exec(m)
	}

	milestonesTableQuery := `
	CREATE TABLE IF NOT EXISTS milestones (
		id BIGINT PRIMARY KEY DEFAULT unique_rowid(),
		task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
		title TEXT NOT NULL,
		status VARCHAR(50) NOT NULL DEFAULT 'pending',
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
	);`

	if _, err := DB.Exec(milestonesTableQuery); err != nil {
		log.Fatal("Failed to create milestones table:", err)
	}


	milestonesMigrations := []string{
		"ALTER TABLE milestones ADD COLUMN IF NOT EXISTS submission_link TEXT",
		"ALTER TABLE milestones ADD COLUMN IF NOT EXISTS submission_note TEXT",
	}

	for _, m := range milestonesMigrations {
		_, _ = DB.Exec(m)
	}

	taskAssigneesTableQuery := `
	CREATE TABLE IF NOT EXISTS task_assignees (
		task_id    BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
		user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		status     VARCHAR(50) NOT NULL DEFAULT 'accepted',
		progress   INT NOT NULL DEFAULT 0,
		submission_link TEXT,
		accepted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		PRIMARY KEY (task_id, user_id)
	);`

	if _, err := DB.Exec(taskAssigneesTableQuery); err != nil {
		log.Fatal("Failed to create task_assignees table:", err)
	}

	taskAssigneesMigrations := []string{
		"ALTER TABLE task_assignees ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'accepted'",
		"ALTER TABLE task_assignees ADD COLUMN IF NOT EXISTS progress INT NOT NULL DEFAULT 0",
		"ALTER TABLE task_assignees ADD COLUMN IF NOT EXISTS submission_link TEXT",
	}
	for _, m := range taskAssigneesMigrations {
		_, _ = DB.Exec(m)
	}

	_, _ = DB.Exec(`
		INSERT INTO task_assignees (task_id, user_id, status, progress)
		SELECT id, assignee_id, status, progress
		FROM tasks
		WHERE assignee_id IS NOT NULL
		  AND status <> 'pending'
		ON CONFLICT (task_id, user_id) DO NOTHING
	`)

	taskInvitationsTableQuery := `
	CREATE TABLE IF NOT EXISTS task_invitations (
		id BIGINT PRIMARY KEY DEFAULT unique_rowid(),
		task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
		invitee_email TEXT NOT NULL,
		status VARCHAR(20) DEFAULT 'pending',
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(task_id, invitee_email)
	);`

	if _, err := DB.Exec(taskInvitationsTableQuery); err != nil {
		log.Fatal("Failed to create task_invitations table:", err)
	}
}

func retry(attempts int, sleep time.Duration, fn func() error) error {
	var err error
	for i := 0; i < attempts; i++ {
		if err = fn(); err == nil {
			return nil
		}
		time.Sleep(sleep)
	}
	return err
}
