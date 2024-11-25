// Constants
const FREE_DELIVERY_THRESHOLD = 100;
const DELIVERY_FEE = 10;

// State management
let products = [];
let currentFilter = 'all';
let searchQuery = '';
let selectedPaymentMethod = null;

// Authentication functions
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');
    const submitButton = event.target.querySelector('button[type="submit"]');
    
    // Disable submit button and show loading state
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    errorMessage.style.display = 'none';

    try {
        const response = await fetch('/api/v1/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Store token with Bearer prefix
            localStorage.setItem('token', `Bearer ${data.token}`);
            localStorage.setItem('userName', data.name);
            localStorage.setItem('userEmail', data.email);
            
            // Update UI immediately
            updateAuthUI();
            
            // Redirect to home
            window.location.href = '/';
        } else {
            errorMessage.textContent = data.error || 'Login failed. Please check your credentials and try again.';
            errorMessage.style.display = 'block';
            errorMessage.classList.add('show');
        }
    } catch (error) {
        console.error('Login error:', error);
        errorMessage.textContent = 'Network error. Please check your connection and try again.';
        errorMessage.style.display = 'block';
        errorMessage.classList.add('show');
    } finally {
        // Re-enable submit button and restore original text
        submitButton.disabled = false;
        submitButton.innerHTML = '<span>Login</span><i class="fas fa-arrow-right"></i>';
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');

    try {
        const response = await fetch('/api/v1/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('userName', data.name);
            window.location.href = '/';
        } else {
            errorMessage.textContent = data.error || 'Registration failed. Please try again.';
            errorMessage.style.display = 'block';
        }
    } catch (error) {
        errorMessage.textContent = 'An error occurred. Please try again.';
        errorMessage.style.display = 'block';
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('cart');
    updateAuthUI();
    updateCartCount();
    window.location.href = '/';
}

// Product functions
async function fetchProducts() {
    try {
        const response = await fetch('/api/v1/products');
        const products = await response.json();
        displayProducts(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        showNotification('Failed to load products');
    }
}

function filterProducts() {
    return products.filter(product => {
        const matchesCategory = currentFilter === 'all' || product.Category === currentFilter;
        const matchesSearch = product.Name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            product.Description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    const imageContainer = document.createElement('div');
    imageContainer.className = 'product-image';
    
    if (product.Image && product.Image.startsWith('http')) {
        // For external images
        const img = document.createElement('img');
        img.src = product.Image;
        img.alt = product.Name;
        img.onerror = function() {
            this.remove();
            imageContainer.textContent = product.Name;
        };
        imageContainer.appendChild(img);
    } else {
        // For placeholder or local images
        imageContainer.textContent = product.Name;
    }
    
    card.innerHTML = `
        ${imageContainer.outerHTML}
        <h3>${product.Name}</h3>
        <p class="description">${product.Description}</p>
        <p class="price">$${product.Price.toFixed(2)}</p>
        <button onclick="addToCart('${product.ID}', '${product.Name}', ${product.Price})">Add to Cart</button>
    `;
    
    return card;
}

function renderProducts() {
    const container = document.getElementById('productsContainer');
    if (!container) return;

    const filteredProducts = filterProducts();
    container.innerHTML = '';
    filteredProducts.forEach(product => {
        const card = createProductCard(product);
        container.appendChild(card);
    });
}

// Product display functions
function displayProducts(products) {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;

    productsGrid.innerHTML = products.map(product => `
        <div class="product-card">
            <img src="${product.Image}" alt="${product.Name}" class="product-image">
            <div class="product-details">
                <h3>${product.Name}</h3>
                <p class="price">$${product.Price.toFixed(2)}</p>
                <p class="description">${product.Description}</p>
                <button onclick="addToCart('${product.ID}', '${product.Name}', ${product.Price})">
                    <i class="fas fa-cart-plus"></i> Add to Cart
                </button>
            </div>
        </div>
    `).join('');
}

// Cart functions
function getCart() {
    const cartData = localStorage.getItem('cart');
    return cartData ? JSON.parse(cartData) : [];
}

function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
}

async function addToCart(productId, name, price) {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    const cart = getCart();
    const existingItem = cart.find(item => item.productId === productId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            productId,
            name,
            price,
            quantity: 1
        });
    }

    saveCart(cart);
    showNotification('Item added to cart');
}

function updateCartCount() {
    const cart = getCart();
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    const cartCount = document.getElementById('cartCount');
    if (cartCount) {
        cartCount.textContent = count;
    }
}

async function checkout() {
    try {
        const cart = getCart();
        if (cart.length === 0) {
            showNotification('Your cart is empty');
            return;
        }

        const response = await authenticatedFetch('/api/v1/orders', {
            method: 'POST',
            body: JSON.stringify({ items: cart })
        });

        if (!response.ok) {
            throw new Error('Failed to create order');
        }

        const data = await response.json();
        localStorage.removeItem('cart');
        updateCartCount();
        showNotification('Order placed successfully!');
        window.location.href = '/orders/' + data.order.id;
    } catch (error) {
        showNotification(error.message);
    }
}

// Cart page functions
function renderCart() {
    const cartItems = document.getElementById('cartItems');
    const emptyCart = document.getElementById('emptyCart');
    const cartSummary = document.getElementById('cartSummary');
    
    if (!cartItems || !emptyCart || !cartSummary) return;

    const cart = getCart();
    
    if (cart.length === 0) {
        cartItems.style.display = 'none';
        cartSummary.style.display = 'none';
        emptyCart.style.display = 'block';
        return;
    }

    cartItems.style.display = 'block';
    cartSummary.style.display = 'block';
    emptyCart.style.display = 'none';

    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <img src="https://placehold.co/200x200/2a2a2a/FFD700?text=${encodeURIComponent(item.name)}" 
                 alt="${item.name}" 
                 class="cart-item-image">
            <div class="cart-item-details">
                <h3>${item.name}</h3>
                <div class="cart-item-price">$${item.price.toFixed(2)}</div>
            </div>
            <div class="quantity-controls">
                <button class="quantity-btn" onclick="updateQuantity('${item.productId}', ${item.quantity - 1})">
                    <i class="fas fa-minus"></i>
                </button>
                <span class="quantity-display">${item.quantity}</span>
                <button class="quantity-btn" onclick="updateQuantity('${item.productId}', ${item.quantity + 1})">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
            <button class="remove-item" onclick="removeFromCart('${item.productId}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');

    updateCartSummary();
}

function updateQuantity(productId, newQuantity) {
    if (newQuantity < 1) {
        removeFromCart(productId);
        return;
    }

    const cart = getCart();
    const item = cart.find(item => item.productId === productId);
    if (item) {
        item.quantity = newQuantity;
        saveCart(cart);
        renderCart();
    }
}

function removeFromCart(productId) {
    const cart = getCart();
    const updatedCart = cart.filter(item => item.productId !== productId);
    saveCart(updatedCart);
    renderCart();
    showNotification('Item removed from cart');
}

function updateCartSummary() {
    const cart = getCart();
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
    const total = subtotal + deliveryFee;
    const remainingForFree = FREE_DELIVERY_THRESHOLD - subtotal;

    document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('deliveryFee').textContent = `$${deliveryFee.toFixed(2)}`;
    document.getElementById('total').textContent = `$${total.toFixed(2)}`;

    const freeDeliveryMessage = document.getElementById('freeDeliveryMessage');
    const checkoutButton = document.getElementById('checkoutButton');

    if (freeDeliveryMessage) {
        if (subtotal >= FREE_DELIVERY_THRESHOLD) {
            freeDeliveryMessage.textContent = 'You have free delivery!';
            freeDeliveryMessage.style.color = '#4CAF50';
        } else {
            document.getElementById('remainingForFree').textContent = `$${remainingForFree.toFixed(2)}`;
        }
    }

    if (checkoutButton) {
        checkoutButton.disabled = cart.length === 0;
    }
}

// Cart and Checkout Process
let selectedPaymentMethod = null;

function proceedToDelivery() {
    const cartItems = document.getElementById('cartItems');
    const deliveryForm = document.getElementById('deliveryForm');
    const proceedToDeliveryBtn = document.getElementById('proceedToDelivery');
    const proceedToPaymentBtn = document.getElementById('proceedToPayment');

    if (cartItems) cartItems.style.display = 'none';
    if (deliveryForm) deliveryForm.style.display = 'block';
    if (proceedToDeliveryBtn) proceedToDeliveryBtn.style.display = 'none';
    if (proceedToPaymentBtn) proceedToPaymentBtn.style.display = 'block';
}

function proceedToPayment() {
    const deliveryForm = document.getElementById('deliveryDetailsForm');
    if (!deliveryForm.checkValidity()) {
        deliveryForm.reportValidity();
        return;
    }

    document.getElementById('deliveryForm').style.display = 'none';
    document.getElementById('paymentSection').style.display = 'block';
    document.getElementById('proceedToPayment').style.display = 'none';
    document.getElementById('confirmPayment').style.display = 'block';
}

function selectPaymentMethod(method) {
    selectedPaymentMethod = method;
    
    // Hide all payment forms
    document.querySelectorAll('.payment-form').forEach(form => {
        form.style.display = 'none';
    });
    
    // Remove selected class from all methods
    document.querySelectorAll('.payment-method').forEach(el => {
        el.classList.remove('selected');
    });
    
    // Show selected method's form and highlight selection
    const selectedEl = event.currentTarget;
    selectedEl.classList.add('selected');
    
    if (method === 'mpesa') {
        document.getElementById('mpesaForm').style.display = 'block';
    } else if (method === 'card') {
        document.getElementById('cardForm').style.display = 'block';
    }
}

async function confirmPayment() {
    if (!selectedPaymentMethod) {
        showNotification('Please select a payment method');
        return;
    }

    const deliveryDetails = {
        address: document.getElementById('address').value,
        city: document.getElementById('city').value,
        phone: document.getElementById('phone').value,
        instructions: document.getElementById('deliveryInstructions').value
    };

    let paymentDetails = {};
    if (selectedPaymentMethod === 'mpesa') {
        const mpesaPhone = document.getElementById('mpesaPhone').value;
        if (!mpesaPhone || !/^[0-9]{10}$/.test(mpesaPhone)) {
            showNotification('Please enter a valid M-Pesa phone number');
            return;
        }
        paymentDetails = {
            method: 'mpesa',
            phone: mpesaPhone
        };
    } else if (selectedPaymentMethod === 'card') {
        const cardForm = document.getElementById('cardForm');
        if (!cardForm.checkValidity()) {
            cardForm.reportValidity();
            return;
        }
        paymentDetails = {
            method: 'card',
            card_number: document.getElementById('cardNumber').value,
            expiry: document.getElementById('expiryDate').value,
            cvv: document.getElementById('cvv').value
        };
    }

    try {
        const response = await authenticatedFetch('/api/v1/orders', {
            method: 'POST',
            body: JSON.stringify({
                items: getCart(),
                delivery_details: deliveryDetails,
                payment_details: paymentDetails
            })
        });

        if (!response.ok) {
            throw new Error('Failed to create order');
        }

        // Clear cart and show success
        localStorage.removeItem('cart');
        updateCartCount();
        showNotification('Order placed successfully! Redirecting to home page...');
        
        // Redirect to home page after 2 seconds
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
    } catch (error) {
        showNotification(error.message);
    }
}

// Initialize test cart items
function initializeTestCart() {
    const cart = [
        {
            productId: "1",
            name: "Macallan 18 Years",
            price: 299.99,
            quantity: 1
        },
        {
            productId: "2",
            name: "Dom Pérignon Vintage",
            price: 249.99,
            quantity: 1
        }
    ];
    
    saveCart(cart);
    updateCartCount();
    renderCart();
    showNotification('Test items added to cart');
}

// UI functions
function showNotification(message) {
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notificationMessage');
    
    if (notification && notificationMessage) {
        notificationMessage.textContent = message;
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
}

function updateAuthUI() {
    const token = localStorage.getItem('token');
    const userName = localStorage.getItem('userName');
    const authLinks = document.getElementById('authLinks');
    const userLinks = document.getElementById('userLinks');
    const userNameSpan = document.getElementById('userName');

    if (token && authLinks && userLinks) {
        authLinks.style.display = 'none';
        userLinks.style.display = 'flex';
        if (userNameSpan) {
            userNameSpan.textContent = userName || 'User';
        }
    } else if (authLinks && userLinks) {
        authLinks.style.display = 'flex';
        userLinks.style.display = 'none';
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Set up form handlers
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // Set up search and filter handlers
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            renderProducts();
        });
    }

    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentFilter = button.dataset.category;
            renderProducts();
        });
    });

    // Initialize
    updateAuthUI();
    updateCartCount();
    fetchProducts();

    // Initialize cart page if we're on it
    if (window.location.pathname === '/cart' && (!getCart() || getCart().length === 0)) {
        initializeTestCart();
    }

    const checkoutButton = document.getElementById('checkoutButton');
    if (checkoutButton) {
        checkoutButton.addEventListener('click', checkout);
    }

    // Cart page buttons
    const proceedToDeliveryBtn = document.getElementById('proceedToDelivery');
    if (proceedToDeliveryBtn) {
        proceedToDeliveryBtn.addEventListener('click', proceedToDelivery);
    }

    const proceedToPaymentBtn = document.getElementById('proceedToPayment');
    if (proceedToPaymentBtn) {
        proceedToPaymentBtn.addEventListener('click', proceedToPayment);
    }

    const confirmPaymentBtn = document.getElementById('confirmPayment');
    if (confirmPaymentBtn) {
        confirmPaymentBtn.addEventListener('click', confirmPayment);
    }
});

// Helper function for authenticated fetch
function authenticatedFetch(url, options) {
    const token = localStorage.getItem('token');
    if (token) {
        options.headers = options.headers || {};
        options.headers.Authorization = `Bearer ${token}`;
    }
    return fetch(url, options);
}