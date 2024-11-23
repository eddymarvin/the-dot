package main

import (
	"ecommerce/api"
	"log"

	"github.com/gin-gonic/gin"
)

func setupRouter() *gin.Engine {
	r := gin.Default()

	// Setup routes (includes static files and templates)
	api.SetupRoutes(r)

	return r
}

func main() {
	r := setupRouter()

	log.Println("Starting server on :8080...")
	if err := r.Run(":8080"); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}
