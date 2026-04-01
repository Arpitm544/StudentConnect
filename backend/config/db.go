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
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Kolkata",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
		os.Getenv("DB_PORT"),
	)

	database, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatal("Failed to open database connection:", err)
	}

	if err := database.Ping(); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	DB = database
	fmt.Println("Database connection established")

	// Create users table if it doesn't exist
	createTableQuery := `
	CREATE TABLE IF NOT EXISTS users (
		id SERIAL PRIMARY KEY,
		name VARCHAR(255) NOT NULL,
		email TEXT UNIQUE NOT NULL,
		password TEXT NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`

	_, err = DB.Exec(createTableQuery)
	if err != nil {
		log.Fatal("Failed to create users table:", err)
	}
	fmt.Println("Users table ready")

	// Create tasks table if it doesn't exist
	tasksTableQuery := `
	CREATE TABLE IF NOT EXISTS tasks (
		id SERIAL PRIMARY KEY,
		title TEXT NOT NULL,
		description TEXT,
		status VARCHAR(50) NOT NULL DEFAULT 'pending',
		accepted BOOLEAN NOT NULL DEFAULT FALSE,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`

	_, err = DB.Exec(tasksTableQuery)
	if err != nil {
		log.Fatal("Failed to create tasks table:", err)
	}

	// Make sure creator_id and assignee_id are present
	alterTableQuery := `
	ALTER TABLE tasks 
	ADD COLUMN IF NOT EXISTS creator_id INTEGER REFERENCES users(id),
	ADD COLUMN IF NOT EXISTS assignee_id INTEGER REFERENCES users(id),
	ADD COLUMN IF NOT EXISTS deadline TIMESTAMP,
	ADD COLUMN IF NOT EXISTS progress INTEGER NOT NULL DEFAULT 0,
	ADD COLUMN IF NOT EXISTS subject TEXT;
	`
	_, err = DB.Exec(alterTableQuery)
	if err != nil {
		log.Println("Note: Failed to alter tasks table (columns might already exist or DB might not support IF NOT EXISTS in this context):", err)
	}
	
	fmt.Println("Tasks table ready")
	EnsureUserColumns()
}

func EnsureUserColumns() {
	alterUserTableQuery := `
	ALTER TABLE users 
	ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
	`
	_, err := DB.Exec(alterUserTableQuery)
	if err != nil {
		log.Println("Note: Failed to alter users table (columns might already exist):", err)
	}
}
