package utils

import (
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func getSecretKey() []byte {
	return []byte(os.Getenv("JWT_SECRET"))
}

// Generate Token
func GenerateToken(userID int) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(24 * time.Hour).Unix(),
	})

	return token.SignedString(getSecretKey())
}

// Validate Token
func ValidateToken(tokenString string) (int, error) {
	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
		return getSecretKey(), nil
	})
	
	if err != nil {
		return 0, err
	}

	claims := token.Claims.(jwt.MapClaims)
	return int(claims["user_id"].(float64)), nil
}