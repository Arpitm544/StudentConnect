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
		log.Println("⚠️ Firebase disabled (no credentials)")
		return
	}

	app, err := firebase.NewApp(ctx, nil, option.WithCredentialsFile(credsPath))
	if err != nil {
		log.Println("❌ Firebase init error:", err)
		return
	}

	client, err := app.Auth(ctx)
	if err != nil {
		log.Println("❌ Firebase auth error:", err)
		return
	}

	FirebaseAuth = client
	log.Println("✅ Firebase initialized")
}