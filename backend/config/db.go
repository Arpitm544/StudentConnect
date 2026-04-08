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
	// PostgreSQL DSN format
	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
	)

	database, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatal("Failed to open database connection:", err)
	}

	if err := database.Ping(); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	DB = database

	// 1. Create tables if they don't exist
	createUsersTable := `
	CREATE TABLE IF NOT EXISTS users (
		id BIGSERIAL PRIMARY KEY,
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
		log.Fatal("Failed to create users table:", err)
	}

	// 2. MIGRATION: Column check (for existing tables missing Google Auth columns)
	// PostgreSQL 9.6+ supports 'ADD COLUMN IF NOT EXISTS'
	migrations := []string{
		"ALTER TABLE users ADD COLUMN IF NOT EXISTS uid VARCHAR(128) UNIQUE",
		"ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT",
		"ALTER TABLE users ADD COLUMN IF NOT EXISTS provider VARCHAR(32) DEFAULT 'password'",
	}

	for _, m := range migrations {
		_, _ = DB.Exec(m)
	}

	tasksTableQuery := `
	CREATE TABLE IF NOT EXISTS tasks (
		id BIGSERIAL PRIMARY KEY,
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
	}
	for _, m := range tasksMigrations {
		_, _ = DB.Exec(m)
	}
}
