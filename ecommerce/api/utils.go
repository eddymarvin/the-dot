package api

import (
	"log"
	"net/http"
	"os"

	"github.com/dgrijalva/jwt-go"
	"github.com/gin-gonic/gin"
)

// Logger structure to hold our loggers
type Logger struct {
	Info  *log.Logger
	Error *log.Logger
}

// Global logger instance
var AppLogger = &Logger{
	Info:  log.New(os.Stdout, "INFO: ", log.Ldate|log.Ltime|log.Lshortfile),
	Error: log.New(os.Stderr, "ERROR: ", log.Ldate|log.Ltime|log.Lshortfile),
}

// Debug middleware to log requests
func DebugMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Log request details
		AppLogger.Info.Printf("Request: %s %s", c.Request.Method, c.Request.URL.Path)

		// Process request
		c.Next()

		// Log response status
		AppLogger.Info.Printf("Response Status: %d", c.Writer.Status())
	}
}

// Helper function to get user ID from context
func getUserIDFromContext(c *gin.Context) string {
	user, exists := c.Get("user")
	if !exists {
		return ""
	}

	claims := user.(jwt.MapClaims)
	return claims["user_id"].(string)
}

// Admin dashboard handler
func handleAdminDashboard(c *gin.Context) {
	c.HTML(http.StatusOK, "admin.html", gin.H{
		"AdminPhone": "254741168085",
	})
}
