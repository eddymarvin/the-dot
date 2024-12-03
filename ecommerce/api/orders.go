package api

import (
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// OrderItem represents an item in an order
type OrderItem struct {
	ID       string  `json:"id"`
	Name     string  `json:"name"`
	Price    float64 `json:"price"`
	Quantity int     `json:"quantity"`
}

// DeliveryDetails contains shipping information
type DeliveryDetails struct {
	Name    string `json:"name" binding:"required"`
	Address string `json:"address" binding:"required"`
	City    string `json:"city" binding:"required"`
	Phone   string `json:"phone" binding:"required"`
}

// PaymentDetails contains payment method and related information
type PaymentDetails struct {
	Method     string `json:"method" binding:"required"`
	Phone      string `json:"phone"`
	CardNumber string `json:"card_number"`
	Expiry     string `json:"expiry"`
	CVV        string `json:"cvv"`
}

// OrderRequest represents the incoming order creation request
type OrderRequest struct {
	Items           []OrderItem     `json:"items" binding:"required,dive"`
	DeliveryDetails DeliveryDetails `json:"delivery_details" binding:"required"`
	PaymentMethod   string          `json:"payment_method" binding:"required"`
	Total           float64         `json:"total"`
}

// Order represents a created order
type Order struct {
	ID              string          `json:"id"`
	UserID          string          `json:"user_id"`
	Items           []OrderItem     `json:"items"`
	DeliveryDetails DeliveryDetails `json:"delivery_details"`
	PaymentDetails  PaymentDetails  `json:"payment_details"`
	TotalAmount     float64         `json:"total_amount"`
	Status          string          `json:"status"`
	CreatedAt       time.Time       `json:"created_at"`
}

// Store orders in memory
var orders = make(map[string]Order)

// CreateOrderHandler handles the creation of new orders
func CreateOrderHandler(c *gin.Context) {
	var req OrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := GetUserFromContext(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Validate total
	var total float64
	for _, item := range req.Items {
		total += item.Price * float64(item.Quantity)
	}

	if total != req.Total {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid total amount"})
		return
	}

	// Create order
	orderID := uuid.New().String()
	order := Order{
		ID:              orderID,
		UserID:          userID,
		Items:           req.Items,
		DeliveryDetails: req.DeliveryDetails,
		PaymentDetails: PaymentDetails{
			Method: req.PaymentMethod,
		},
		TotalAmount: total,
		Status:      "pending",
		CreatedAt:   time.Now(),
	}

	// Handle different payment methods
	var err error
	switch req.PaymentMethod {
	case "mpesa":
		if req.DeliveryDetails.Phone == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Phone number required for M-Pesa payment"})
			return
		}
		order.PaymentDetails.Phone = req.DeliveryDetails.Phone
		err = handleMpesaPayment(order)
	case "card":
		err = handleCardPayment(order)
	case "paypal":
		err = handlePayPalPayment(order)
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payment method"})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Store order
	orders[orderID] = order

	c.JSON(http.StatusCreated, order)
}

func handleCardPayment(order Order) error {
	// TODO: Implement card payment integration
	return errors.New("Card payment not implemented yet")
}

func handlePayPalPayment(order Order) error {
	// TODO: Implement PayPal integration
	return errors.New("PayPal payment not implemented yet")
}

// GetOrders returns the user's orders
func GetOrders(c *gin.Context) {
	userID := GetUserFromContext(c)
	userOrdersList := []Order{}

	for _, order := range orders {
		if order.UserID == userID {
			userOrdersList = append(userOrdersList, order)
		}
	}

	c.JSON(http.StatusOK, userOrdersList)
}

// GetOrder returns a specific order
func GetOrder(c *gin.Context) {
	userID := GetUserFromContext(c)
	orderID := c.Param("id")

	order, exists := orders[orderID]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	if order.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to view this order"})
		return
	}

	c.JSON(http.StatusOK, order)
}