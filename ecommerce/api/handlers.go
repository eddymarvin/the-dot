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

	// Add the following line to import the required package
	_ "github.com/lib/pq"
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

func LoginUser(c *gin.Context) {
	var credentials LoginCredentials
	if err := c.ShouldBindJSON(&credentials); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
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
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	// Compare passwords
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(credentials.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
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
		"name":  user.Name,
		"email": user.Email,
	})
}

func RegisterUser(c *gin.Context) {
	var newUser User
	if err := c.ShouldBindJSON(&newUser); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Check if email already exists
	for _, u := range users {
		if u.Email == newUser.Email {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Email already registered"})
			return
		}
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newUser.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process registration"})
		return
	}

	// Create new user
	newUser.ID = uuid.New().String()
	newUser.Password = string(hashedPassword)
	newUser.CreatedAt = time.Now()

	// Save user
	users[newUser.ID] = newUser

	// Generate JWT token
	token, err := generateJWT(newUser.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"name":  newUser.Name,
		"email": newUser.Email,
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
	// Initialize default test user
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("test123"), bcrypt.DefaultCost)
	defaultUser := User{
		ID:        uuid.New().String(),
		Email:     "test@thedot.com",
		Password:  string(hashedPassword),
		Name:      "Test User",
		CreatedAt: time.Now(),
	}
	users[defaultUser.ID] = defaultUser

	// Sample products with images
	sampleProducts := []Product{
		{
			ID:          "1",
			Name:        "Macallan 18 Years",
			Price:       299.99,
			Description: "Single Malt Scotch Whisky, aged for 18 years in exceptional oak casks",
			ImageURL:    "/static/images/macallan18.jpg",
			Category:    "Whisky",
			Stock:       15,
			CreatedAt:   time.Now(),
		},
		{
			ID:          "2",
			Name:        "Dom Pérignon Vintage",
			Price:       249.99,
			Description: "Prestigious champagne with exceptional aging potential",
			ImageURL:    "/static/images/domperignon.jpg",
			Category:    "Champagne",
			Stock:       20,
			CreatedAt:   time.Now(),
		},
		{
			ID:          "3",
			Name:        "Grey Goose Original",
			Price:       49.99,
			Description: "Premium French vodka made with the finest ingredients",
			ImageURL:    "/static/images/greygoose.jpg",
			Category:    "Vodka",
			Stock:       30,
			CreatedAt:   time.Now(),
		},
		{
			ID:          "4",
			Name:        "Hennessy XO",
			Price:       199.99,
			Description: "Extra Old Cognac blended from over 100 eaux-de-vie",
			ImageURL:    "/static/images/hennessyxo.jpg",
			Category:    "Cognac",
			Stock:       25,
			CreatedAt:   time.Now(),
		},
		{
			ID:          "5",
			Name:        "Don Julio 1942",
			Price:       159.99,
			Description: "Handcrafted luxury añejo tequila aged for a minimum of two and a half years",
			ImageURL:    "/static/images/donjulio1942.jpg",
			Category:    "Tequila",
			Stock:       18,
			CreatedAt:   time.Now(),
		},
		{
			ID:          "6",
			Name:        "Dalmore 15 Year",
			Price:       89.99,
			Description: "Highland Single Malt Scotch matured in three different types of wood",
			ImageURL:    "/static/images/dalmore15.jpg",
			Category:    "Whisky",
			Stock:       22,
			CreatedAt:   time.Now(),
		},
	}

	// Add sample products to the products map
	for _, product := range sampleProducts {
		products[product.ID] = product
	}
}
