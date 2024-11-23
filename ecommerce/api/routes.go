package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// SetupRoutes configures all the routes for our application
func SetupRoutes(router *gin.Engine) {
	// Middleware
	router.Use(gin.Logger())
	router.Use(gin.Recovery())
	router.Use(DebugMiddleware())

	// Load templates and static files (only once)
	router.LoadHTMLGlob("templates/*")
	router.Static("/static", "./static")

	// Public routes
	router.POST("/api/v1/register", RegisterUser)
	router.POST("/api/v1/login", LoginUser)
	router.GET("/api/v1/products", GetProducts)

	// Frontend routes
	router.GET("/", func(c *gin.Context) {
		c.HTML(http.StatusOK, "index.html", nil)
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

	// Protected routes
	protected := router.Group("/api/v1")
	protected.Use(AuthMiddleware())
	{
		// Cart routes
		protected.GET("/cart", GetCart)
		protected.POST("/cart/add", AddToCart)
		protected.DELETE("/cart/:product_id", RemoveFromCart)

		// Order routes
		protected.GET("/orders", GetOrders)

		// M-Pesa routes
		protected.POST("/mpesa/stkpush", handleMpesaSTKPush)
		protected.GET("/mpesa/status/:id", getMpesaTransactionStatus)
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
