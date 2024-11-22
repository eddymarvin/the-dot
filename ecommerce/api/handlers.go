package api

import (
	"ecommerce/blockchain"
	"errors"
	"net/http"
	"time"

	"github.com/dgrijalva/jwt-go"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type Product struct {
	ID          string    `json:"id"`
	Name        string    `json:"name" binding:"required"`
	Description string    `json:"description"`
	Price       float64   `json:"price" binding:"required,gt=0"`
	Stock       int       `json:"stock" binding:"required,gte=0"`
	ImageURL    string    `json:"image_url"`
	Category    string    `json:"category"`
	CreatedAt   time.Time `json:"created_at"`
}

type Order struct {
	ID          string    `json:"id"`
	UserID      string    `json:"user_id" binding:"required"`
	Products    []string  `json:"product_ids" binding:"required"` // List of product IDs
	TotalAmount float64   `json:"total_amount"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
}

type User struct {
	ID        string    `json:"id"`
	Email     string    `json:"email" binding:"required,email"`
	Password  string    `json:"password" binding:"required,min=6"`
	Name      string    `json:"name" binding:"required"`
	CreatedAt time.Time `json:"created_at"`
}

type LoginCredentials struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

var (
	products  = make(map[string]Product)
	orders    = make(map[string]Order)
	users     = make(map[string]User)
	jwtSecret = []byte("your-secret-key") // In production, use environment variable
)

func CreateProduct(c *gin.Context) {
	var product Product
	if err := c.ShouldBindJSON(&product); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	product.ID = uuid.New().String()
	product.CreatedAt = time.Now()

	// Set default image if none provided
	defaultPlaceholder := "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?auto=format&fit=crop&w=800&q=80"
	if product.ImageURL == "" {
		product.ImageURL = defaultPlaceholder
	}

	products[product.ID] = product
	c.JSON(http.StatusCreated, product)
}

func GetProducts(c *gin.Context) {
	productList := make([]Product, 0, len(products))
	for _, p := range products {
		productList = append(productList, p)
	}
	c.JSON(http.StatusOK, productList)
}

func GetProduct(c *gin.Context) {
	id := c.Param("id")
	product, exists := products[id]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}
	c.JSON(http.StatusOK, product)
}

func CreateOrder(c *gin.Context) {
	var order Order
	if err := c.ShouldBindJSON(&order); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Calculate total amount and verify products exist
	var totalAmount float64
	for _, productID := range order.Products {
		product, exists := products[productID]
		if !exists {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Product not found: " + productID})
			return
		}
		totalAmount += product.Price
	}

	order.ID = uuid.New().String()
	order.TotalAmount = totalAmount
	order.Status = "pending"
	order.CreatedAt = time.Now()

	// Create blockchain record
	blockData := blockchain.OrderData{
		OrderID:     order.ID,
		UserID:      order.UserID,
		ProductIDs:  order.Products,
		TotalAmount: order.TotalAmount,
		Status:      order.Status,
		CreatedAt:   order.CreatedAt,
	}

	bc := blockchain.GetInstance()
	block := bc.AddBlock(blockData)

	orders[order.ID] = order
	c.JSON(http.StatusCreated, gin.H{
		"order": order,
		"block": block,
	})
}

func GetOrder(c *gin.Context) {
	id := c.Param("id")
	order, exists := orders[id]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	bc := blockchain.GetInstance()
	block := bc.GetBlockByOrderID(id)

	c.JSON(http.StatusOK, gin.H{
		"order": order,
		"block": block,
	})
}

func RegisterUser(c *gin.Context) {
	var user User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if email already exists
	for _, u := range users {
		if u.Email == user.Email {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Email already registered"})
			return
		}
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	user.ID = uuid.New().String()
	user.Password = string(hashedPassword)
	user.CreatedAt = time.Now()

	users[user.ID] = user

	// Generate JWT token
	token, err := generateJWT(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"token": token,
		"user": gin.H{
			"id":    user.ID,
			"email": user.Email,
			"name":  user.Name,
		},
	})
}

func LoginUser(c *gin.Context) {
	var credentials LoginCredentials
	if err := c.ShouldBindJSON(&credentials); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find user by email
	var user User
	var found bool
	for _, u := range users {
		if u.Email == credentials.Email {
			user = u
			found = true
			break
		}
	}

	if !found {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Check password
	err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(credentials.Password))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Generate JWT token
	token, err := generateJWT(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user": gin.H{
			"id":    user.ID,
			"email": user.Email,
			"name":  user.Name,
		},
	})
}

func generateJWT(userID string) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(time.Hour * 24).Unix(),
	})
	return token.SignedString(jwtSecret)
}

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString := c.GetHeader("Authorization")
		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, errors.New("invalid signing method")
			}
			return jwtSecret, nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			c.Abort()
			return
		}

		c.Set("user_id", claims["user_id"])
		c.Next()
	}
}

func init() {
	// Sample products with images
	sampleProducts := []Product{
		{
			ID:          uuid.New().String(),
			Name:        "Premium Whiskey",
			Description: "Aged 12 years, smooth and rich flavor",
			Price:       89.99,
			Stock:       50,
			ImageURL:    "https://images.unsplash.com/photo-1582819509237-d6c5fb6e2c21?auto=format&fit=crop&w=800&q=80",
			Category:    "spirits",
			CreatedAt:   time.Now(),
		},
		{
			ID:          uuid.New().String(),
			Name:        "Red Wine Reserve",
			Description: "Full-bodied red wine with berry notes",
			Price:       45.99,
			Stock:       100,
			ImageURL:    "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=800&q=80",
			Category:    "wines",
			CreatedAt:   time.Now(),
		},
		{
			ID:          uuid.New().String(),
			Name:        "Craft Beer Pack",
			Description: "Selection of premium craft beers",
			Price:       24.99,
			Stock:       200,
			ImageURL:    "https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=800&q=80",
			Category:    "beers",
			CreatedAt:   time.Now(),
		},
		{
			ID:          uuid.New().String(),
			Name:        "Champagne Deluxe",
			Description: "Luxury champagne for special occasions",
			Price:       129.99,
			Stock:       30,
			ImageURL:    "https://images.unsplash.com/photo-1578911373434-0cb395d2cbfb?auto=format&fit=crop&w=800&q=80",
			Category:    "champagne",
			CreatedAt:   time.Now(),
		},
		{
			ID:          uuid.New().String(),
			Name:        "Premium Vodka",
			Description: "Triple-distilled premium vodka",
			Price:       59.99,
			Stock:       75,
			ImageURL:    "https://images.unsplash.com/photo-1607622750671-6cd9f99bc9d1?auto=format&fit=crop&w=800&q=80",
			Category:    "spirits",
			CreatedAt:   time.Now(),
		},
		{
			ID:          uuid.New().String(),
			Name:        "Gin Botanicals",
			Description: "Artisanal gin with rare botanicals",
			Price:       69.99,
			Stock:       45,
			ImageURL:    "https://images.unsplash.com/photo-1514218953589-2d7d37efd2dc?auto=format&fit=crop&w=800&q=80",
			Category:    "spirits",
			CreatedAt:   time.Now(),
		},
	}

	// Add sample products to the products map
	for _, product := range sampleProducts {
		products[product.ID] = product
	}
}
