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
	router := setupRouter()

	// Load HTML templates
	router.LoadHTMLGlob("templates/*")

	log.Println("Starting server on :8080...")
	if err := router.Run(":8080"); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}
