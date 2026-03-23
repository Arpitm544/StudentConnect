package routes

import (
	"net/http"

	"backend/controllers"
)

func SetupRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/auth/signup", controllers.Signup)
	mux.HandleFunc("/api/auth/login", controllers.Login)
	mux.HandleFunc("/api/auth/logout", controllers.Logout)
}
