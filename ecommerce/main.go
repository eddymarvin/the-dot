package main

import (
	"log"

	"ecommerce/api"

	"github.com/gin-gonic/gin"
)

func setupRouter() *gin.Engine {
	r := gin.Default()

	// Serve static files
	r.Static("/static", "./static")
	r.LoadHTMLGlob("templates/*")

	// Public routes
	r.GET("/", func(c *gin.Context) {
		c.HTML(200, "index.html", nil)
	})

	// Add frontend routes
	r.GET("/login", func(c *gin.Context) {
		c.HTML(200, "login.html", nil)
	})
	r.GET("/register", func(c *gin.Context) {
		c.HTML(200, "register.html", nil)
	})
	r.GET("/cart", func(c *gin.Context) {
		c.HTML(200, "cart.html", nil)
	})
	r.GET("/profile", func(c *gin.Context) {
		c.HTML(200, "profile.html", nil)
	})

	// API routes
	v1 := r.Group("/api/v1")
	{
		// Auth routes
		v1.POST("/register", api.RegisterUser)
		v1.POST("/login", api.LoginUser)

		// Product routes
		v1.GET("/products", api.GetProducts)
		v1.GET("/products/:id", api.GetProduct)

		// Protected routes
		authorized := v1.Group("/")
		authorized.Use(api.AuthMiddleware())
		{
			// Order routes
			authorized.POST("/orders", api.CreateOrderHandler)
			authorized.GET("/orders", api.GetOrders)
			authorized.GET("/orders/:id", api.GetOrder)

			// M-Pesa routes
			authorized.POST("/mpesa/stkpush", api.HandleMpesaSTKPush)
			authorized.POST("/mpesa/callback", api.HandleMpesaCallback)
			authorized.GET("/mpesa/status/:id", api.GetMpesaTransactionStatus)
		}
	}

	return r
}

func main() {
	router := setupRouter()
	log.Fatal(router.Run(":8080"))
}
