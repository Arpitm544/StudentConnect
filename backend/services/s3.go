package services

import (
	"context"
	"fmt"
	"mime/multipart"
	"os"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

func UploadFile(file multipart.File, filename string) (string, error) {
	// Load AWS config
	cfg, err := config.LoadDefaultConfig(context.TODO())
	if err != nil {
		return "", err
	}

	// Create S3 client
	client := s3.NewFromConfig(cfg)

	bucket := os.Getenv("AWS_S3_BUCKET")
	region := os.Getenv("AWS_REGION")

	// Folder path (optional)
	key := "images/" + filename

	// Upload file
	_, err = client.PutObject(context.TODO(), &s3.PutObjectInput{
		Bucket: &bucket,
		Key:    &key,
		Body:   file,
	})
	if err != nil {
		return "", err
	}

	// Return file URL
	url := fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", bucket, region, key)

	return url, nil
}