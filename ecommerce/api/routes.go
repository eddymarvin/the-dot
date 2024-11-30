package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// SetupRoutes configures all the routes for our application
func SetupRoutes(router *gin.Engine) {
	// Middleware
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	router.Use(gin.Logger())
	router.Use(gin.Recovery())

	// Serve static files
	router.Static("/static", "./static")

	// Public API routes
	router.POST("/api/v1/register", RegisterUser)
	router.POST("/api/v1/login", LoginUser)
	router.GET("/api/v1/products", GetProducts)
	router.GET("/api/v1/products/:id", GetProduct)

	// Frontend routes
	router.GET("/", func(c *gin.Context) {
		c.HTML(http.StatusOK, "index.html", nil)
	})
	router.GET("/products", func(c *gin.Context) {
		c.HTML(http.StatusOK, "products.html", nil)
	})
	router.GET("/login", func(c *gin.Context) {
		c.HTML(http.StatusOK, "login.html", nil)
	})
	router.GET("/register", func(c *gin.Context) {
		c.HTML(http.StatusOK, "register.html", nil)
	})
	router.GET("/cart", func(c *gin.Context) {
		c.HTML(http.StatusOK, "cart.html", nil)
	})

	// Protected API routes
	protected := router.Group("/api/v1")
	protected.Use(AuthMiddleware())
	{
		// Cart routes
		protected.GET("/cart", GetCart)
		protected.POST("/cart", AddToCart)
		protected.DELETE("/cart/:product_id", RemoveFromCart)

		// Order routes
		protected.POST("/orders", CreateOrder)
		protected.GET("/orders/:id", GetOrder)
		protected.GET("/orders", GetOrders)
	}

	// Public M-Pesa callback
	router.POST("/api/v1/mpesa/callback", handleMpesaCallback)

	// Admin routes
	admin := router.Group("/admin")
	admin.Use(AuthMiddleware())
	{
		admin.GET("/dashboard", handleAdminDashboard)
		admin.GET("/transactions", func(c *gin.Context) {
			var transactions []*MpesaTransaction
			for _, t := range mpesaTransactions {
				transactions = append(transactions, t)
			}
			c.JSON(http.StatusOK, transactions)
		})
	}
}
