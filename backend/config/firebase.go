package config

import (
	"context"
	"log"
	"os"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"google.golang.org/api/option"
)

var FirebaseAuth *auth.Client

func InitFirebase() {
	ctx := context.Background()

	credsPath := os.Getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
	if credsPath == "" {
		log.Fatal("FIREBASE_SERVICE_ACCOUNT_JSON is required")
	}

	app, err := firebase.NewApp(ctx, nil, option.WithCredentialsFile(credsPath))
	if err != nil {
		log.Fatal("Failed to init Firebase app:", err)
	}

	client, err := app.Auth(ctx)
	if err != nil {
		log.Fatal("Failed to init Firebase auth client:", err)
	}

	FirebaseAuth = client
}

