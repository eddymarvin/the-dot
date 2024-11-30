package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// GetOrders returns the user's orders
func GetOrders(c *gin.Context) {
	userID := GetUserFromContext(c)
	userOrdersList := []Order{}

	// Get orders from the global orders map
	for _, order := range orders {
		if order.UserID == userID {
			userOrdersList = append(userOrdersList, order)
		}
	}

	c.JSON(http.StatusOK, userOrdersList)
}
