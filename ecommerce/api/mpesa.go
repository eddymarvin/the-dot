package api

import (
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
)

// MpesaConfig holds M-Pesa API configuration
type MpesaConfig struct {
	ConsumerKey    string
	ConsumerSecret string
	BusinessCode   string
	PassKey        string
	CallbackURL    string
}

// Initialize M-Pesa config from environment variables
var mpesaConfig = MpesaConfig{
	ConsumerKey:    os.Getenv("MPESA_CONSUMER_KEY"),
	ConsumerSecret: os.Getenv("MPESA_CONSUMER_SECRET"),
	BusinessCode:   os.Getenv("MPESA_BUSINESS_CODE"),
	PassKey:        os.Getenv("MPESA_PASS_KEY"),
	CallbackURL:    os.Getenv("MPESA_CALLBACK_URL"),
}

// MpesaTransaction represents an M-Pesa payment transaction
type MpesaTransaction struct {
	CheckoutRequestID string    `json:"checkout_request_id"`
	OrderID          string    `json:"order_id"`
	PhoneNumber      string    `json:"phone_number"`
	Amount           float64   `json:"amount"`
	Status           string    `json:"status"`
	ResultCode       string    `json:"result_code"`
	ResultDesc       string    `json:"result_desc"`
	CreatedAt        time.Time `json:"created_at"`
}

// STKPushRequest represents the request for M-Pesa payment
type STKPushRequest struct {
	PhoneNumber string  `json:"phone_number" binding:"required"`
	Amount      float64 `json:"amount" binding:"required,gt=0"`
	OrderID     string  `json:"order_id" binding:"required"`
}

// In-memory storage for M-Pesa transactions
var mpesaTransactions = make(map[string]*MpesaTransaction)

func handleMpesaPayment(order Order) error {
	if order.PaymentDetails.Phone == "" {
		return fmt.Errorf("phone number required for M-Pesa payment")
	}

	// Create M-Pesa transaction record
	transaction := &MpesaTransaction{
		OrderID:     order.ID,
		PhoneNumber: order.PaymentDetails.Phone,
		Amount:      order.TotalAmount,
		Status:      "pending",
		CreatedAt:   time.Now(),
	}

	// Store transaction
	mpesaTransactions[order.ID] = transaction

	// In production, initiate actual M-Pesa STK push here
	// For now, simulate success
	transaction.Status = "completed"
	transaction.ResultCode = "0"
	transaction.ResultDesc = "Success"

	return nil
}

// HandleMpesaSTKPush initiates an M-Pesa payment
func HandleMpesaSTKPush(c *gin.Context) {
	var req STKPushRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Format phone number (remove leading zero or +254)
	phone := req.PhoneNumber
	if len(phone) > 9 {
		phone = phone[len(phone)-9:]
	}
	phone = "254" + phone

	// Create transaction record
	transaction := &MpesaTransaction{
		OrderID:     req.OrderID,
		PhoneNumber: phone,
		Amount:      req.Amount,
		Status:      "pending",
		CreatedAt:   time.Now(),
	}

	// Store transaction
	mpesaTransactions[req.OrderID] = transaction

	// TODO: Implement actual M-Pesa STK push
	// For development, simulate success
	transaction.Status = "completed"
	transaction.ResultCode = "0"
	transaction.ResultDesc = "Success"

	c.JSON(http.StatusOK, gin.H{
		"message": "Payment initiated successfully",
		"data":    transaction,
	})
}

// HandleMpesaCallback processes M-Pesa payment callbacks
func HandleMpesaCallback(c *gin.Context) {
	// TODO: Implement actual M-Pesa callback handling
	// This will be called by M-Pesa to update the transaction status
	c.JSON(http.StatusOK, gin.H{"message": "Callback processed"})
}

// GetMpesaTransactionStatus retrieves the status of an M-Pesa transaction
func GetMpesaTransactionStatus(c *gin.Context) {
	orderID := c.Param("id")
	transaction, exists := mpesaTransactions[orderID]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Transaction not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": transaction.Status,
		"reason": transaction.ResultDesc,
	})
}