package api

import (
    "bytes"
    "encoding/base64"
    "encoding/json"
    "fmt"
    "net/http"
    "os"
    "time"
    "github.com/gin-gonic/gin"
)
// M-Pesa configuration
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

// Transaction status enum
type TransactionStatus string

const (
	StatusPending   TransactionStatus = "PENDING"
	StatusCompleted TransactionStatus = "COMPLETED"
	StatusFailed    TransactionStatus = "FAILED"
	StatusCancelled TransactionStatus = "CANCELLED"
)

// M-Pesa transaction struct
type MpesaTransaction struct {
	CheckoutRequestID string
	PhoneNumber      string
	Amount           float64
	Status           TransactionStatus
	Reason           string
	Timestamp        time.Time
}

// In-memory transaction storage
var mpesaTransactions = make(map[string]*MpesaTransaction)

// Generate M-Pesa access token
func getMpesaAccessToken() (string, error) {
	auth := base64.StdEncoding.EncodeToString([]byte(mpesaConfig.ConsumerKey + ":" + mpesaConfig.ConsumerSecret))
	
	req, err := http.NewRequest("GET", "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", nil)
	if err != nil {
		return "", err
	}
	
	req.Header.Add("Authorization", "Basic "+auth)
	
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	
	var result struct {
		AccessToken string `json:"access_token"`
	}
	
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}
	
	return result.AccessToken, nil
}

// Handle M-Pesa STK push request
func handleMpesaSTKPush(c *gin.Context) {
	var req struct {
		PhoneNumber string  `json:"phone_number" binding:"required"`
		Amount      float64 `json:"amount" binding:"required,gt=0"`
	}
	
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	
	accessToken, err := getMpesaAccessToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get M-Pesa access token"})
		return
	}
	
	timestamp := time.Now().Format("20060102150405")
	password := base64.StdEncoding.EncodeToString([]byte(mpesaConfig.BusinessCode + mpesaConfig.PassKey + timestamp))
	
	stkRequest := map[string]interface{}{
		"BusinessShortCode": mpesaConfig.BusinessCode,
		"Password":          password,
		"Timestamp":         timestamp,
		"TransactionType":   "CustomerPayBillOnline",
		"Amount":            fmt.Sprintf("%.0f", req.Amount),
		"PartyA":            req.PhoneNumber,
		"PartyB":            mpesaConfig.BusinessCode,
		"PhoneNumber":       req.PhoneNumber,
		"CallBackURL":       mpesaConfig.CallbackURL,
		"AccountReference":  "DotLiquor",
		"TransactionDesc":   "Payment for order",
	}
	
	jsonData, _ := json.Marshal(stkRequest)
	request, _ := http.NewRequest("POST", "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest", bytes.NewBuffer(jsonData))
	request.Header.Set("Authorization", "Bearer "+accessToken)
	request.Header.Set("Content-Type", "application/json")
	
	client := &http.Client{}
	resp, err := client.Do(request)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initiate M-Pesa payment"})
		return
	}
	defer resp.Body.Close()
	
	var result struct {
		CheckoutRequestID string `json:"CheckoutRequestID"`
		ResponseCode     string `json:"ResponseCode"`
		ResponseDesc     string `json:"ResponseDescription"`
	}
	
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse M-Pesa response"})
		return
	}
	
	if result.ResponseCode != "0" {
		c.JSON(http.StatusBadRequest, gin.H{"error": result.ResponseDesc})
		return
	}
	
	mpesaTransactions[result.CheckoutRequestID] = &MpesaTransaction{
		CheckoutRequestID: result.CheckoutRequestID,
		PhoneNumber:      req.PhoneNumber,
		Amount:           req.Amount,
		Status:           StatusPending,
		Timestamp:        time.Now(),
	}
	
	c.JSON(http.StatusOK, gin.H{
		"checkout_request_id": result.CheckoutRequestID,
	})
}

// Handle M-Pesa callback
func handleMpesaCallback(c *gin.Context) {
	var callback struct {
		Body struct {
			StkCallback struct {
				CheckoutRequestID string `json:"CheckoutRequestID"`
				ResultCode       string `json:"ResultCode"`
				ResultDesc      string `json:"ResultDesc"`
			} `json:"stkCallback"`
		} `json:"Body"`
	}
	
	if err := c.BindJSON(&callback); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid callback data"})
		return
	}
	
	transaction, exists := mpesaTransactions[callback.Body.StkCallback.CheckoutRequestID]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Transaction not found"})
		return
	}
	
	if callback.Body.StkCallback.ResultCode == "0" {
		transaction.Status = StatusCompleted
	} else {
		transaction.Status = StatusFailed
		transaction.Reason = callback.Body.StkCallback.ResultDesc
	}
	
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

// Get M-Pesa transaction status
func getMpesaTransactionStatus(c *gin.Context) {
	checkoutRequestID := c.Param("id")
	
	transaction, exists := mpesaTransactions[checkoutRequestID]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Transaction not found"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"status": transaction.Status,
		"reason": transaction.Reason,
	})
}