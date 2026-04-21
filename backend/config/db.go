package config

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
)

var DB *sql.DB

func ConnectDatabase() {
	// ✅ Use CockroachDB connection string
	dsn := os.Getenv("DATABASE_URL")

	if dsn == "" {
		log.Fatal("DATABASE_URL not set in environment")
	}

	// Open DB connection
	database, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatal("Failed to open database connection:", err)
	}

	// Test connection
	if err := database.Ping(); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	DB = database
	fmt.Println("✅ Connected to CockroachDB")

	// =========================
	// CREATE USERS TABLE
	// =========================
	createUsersTable := `
	CREATE TABLE IF NOT EXISTS users (
		id BIGINT PRIMARY KEY DEFAULT unique_rowid(),
		uid VARCHAR(128) UNIQUE,
		name VARCHAR(255) NOT NULL,
		email VARCHAR(255) NOT NULL UNIQUE,
		photo_url TEXT,
		provider VARCHAR(32) NOT NULL DEFAULT 'password',
		password TEXT,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
	);`

	if _, err := DB.Exec(createUsersTable); err != nil {
		log.Fatal("Failed to create users table:", err)  //Fatal means stop the program if DB setup fails
	}

	// =========================
	// USERS MIGRATIONS
	// =========================
	migrations := []string{
		"ALTER TABLE users ADD COLUMN IF NOT EXISTS uid VARCHAR(128) UNIQUE",
		"ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT",
		"ALTER TABLE users ADD COLUMN IF NOT EXISTS provider VARCHAR(32) DEFAULT 'password'",
		"ALTER TABLE users ADD COLUMN IF NOT EXISTS field VARCHAR(255)",
		"ALTER TABLE users ADD COLUMN IF NOT EXISTS college_name VARCHAR(255)",
		"ALTER TABLE users ADD COLUMN IF NOT EXISTS year VARCHAR(50)",
	}

	for _, m := range migrations {
		_, _ = DB.Exec(m)
	}

	// =========================
	// CREATE TASKS TABLE
	// =========================
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

	// =========================
	// TASKS MIGRATIONS
	// =========================
	tasksMigrations := []string{
		"ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachment_url TEXT",
		"ALTER TABLE tasks ADD COLUMN IF NOT EXISTS submission_github TEXT",
		"ALTER TABLE tasks ADD COLUMN IF NOT EXISTS submission_docs TEXT",
		"ALTER TABLE tasks ADD COLUMN IF NOT EXISTS submission_drive TEXT",
		"ALTER TABLE tasks ADD COLUMN IF NOT EXISTS submission_notes TEXT",
	}

	for _, m := range tasksMigrations {
		_, _ = DB.Exec(m)
	}

	// =========================
	// CREATE MILESTONES TABLE
	// =========================
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

	// =========================
	// MILESTONES MIGRATIONS
	// =========================
	milestonesMigrations := []string{
		"ALTER TABLE milestones ADD COLUMN IF NOT EXISTS submission_link TEXT",
		"ALTER TABLE milestones ADD COLUMN IF NOT EXISTS submission_note TEXT",
	}

	for _, m := range milestonesMigrations {
		_, _ = DB.Exec(m)
	}
}