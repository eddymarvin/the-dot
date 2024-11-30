package api

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// Cart represents a shopping cart
type Cart struct {
	UserID    string
	Items     []CartItem
	Total     float64
	CreatedAt time.Time
	UpdatedAt time.Time
}

// CartItem represents an item in the cart
type CartItem struct {
	ProductID          string  `json:"product_id"`
	Name               string  `json:"name"`
	Price              float64 `json:"price"`
	Quantity           int     `json:"quantity"`
	ProductImage       string  `json:"product_image"`
	ProductDescription string  `json:"product_description"`
}

// In-memory storage for carts
var userCarts = make(map[string]*Cart)

// GetCart returns the user's cart
func GetCart(c *gin.Context) {
	userID := GetUserFromContext(c)
	AppLogger.Info.Printf("Getting cart for user: %s", userID)

	if userID == "" {
		AppLogger.Error.Printf("User ID not found in context")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	cart, exists := userCarts[userID]
	if !exists {
		cart = &Cart{
			UserID:    userID,
			Items:     []CartItem{},
			CreatedAt: time.Now(),
		}
		userCarts[userID] = cart
	}

	AppLogger.Info.Printf("Retrieved cart: %+v", cart)
	c.JSON(http.StatusOK, cart)
}

// AddToCart adds an item to the cart
func AddToCart(c *gin.Context) {
	userID := GetUserFromContext(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var item CartItem
	if err := c.BindJSON(&item); err != nil {
		AppLogger.Error.Printf("Error binding JSON: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	cart, exists := userCarts[userID]
	if !exists {
		cart = &Cart{
			UserID:    userID,
			Items:     []CartItem{},
			CreatedAt: time.Now(),
		}
		userCarts[userID] = cart
	}

	// Check if item already exists
	for i, existingItem := range cart.Items {
		if existingItem.ProductID == item.ProductID {
			cart.Items[i].Quantity += item.Quantity
			cart.Total = calculateTotal(cart.Items)
			cart.UpdatedAt = time.Now()
			AppLogger.Info.Printf("Updated cart: %+v", cart)
			c.JSON(http.StatusOK, cart)
			return
		}
	}

	// Add new item
	cart.Items = append(cart.Items, item)
	cart.Total = calculateTotal(cart.Items)
	cart.UpdatedAt = time.Now()

	AppLogger.Info.Printf("Updated cart: %+v", cart)
	c.JSON(http.StatusOK, cart)
}

// RemoveFromCart removes an item from the cart
func RemoveFromCart(c *gin.Context) {
	userID := GetUserFromContext(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	productID := c.Param("product_id")
	AppLogger.Info.Printf("Removing product %s from cart for user: %s", productID, userID)

	cart, exists := userCarts[userID]
	if !exists {
		AppLogger.Error.Printf("Cart not found for user: %s", userID)
		c.JSON(http.StatusNotFound, gin.H{"error": "Cart not found"})
		return
	}

	var newItems []CartItem
	for _, item := range cart.Items {
		if item.ProductID != productID {
			newItems = append(newItems, item)
		}
	}

	cart.Items = newItems
	cart.Total = calculateTotal(cart.Items)
	cart.UpdatedAt = time.Now()

	AppLogger.Info.Printf("Updated cart: %+v", cart)
	c.JSON(http.StatusOK, cart)
}

// Helper function to calculate cart total
func calculateTotal(items []CartItem) float64 {
	var total float64
	for _, item := range items {
		total += item.Price * float64(item.Quantity)
	}
	return total
}
