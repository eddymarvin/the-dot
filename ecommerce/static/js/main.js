// Global variables
let cart = JSON.parse(localStorage.getItem('cart') || '[]');
let currentFilter = 'all';
let searchQuery = '';
let selectedPaymentMethod = null;

// Constants
const FREE_DELIVERY_THRESHOLD = 100;
const DELIVERY_FEE = 10;

// Authentication Functions
async function handleLogin(e) {
    e.preventDefault();
    console.log('Login attempt started');

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');

    console.log('Attempting login with email:', email);

    try {
        console.log('Sending login request...');
        const response = await fetch('/api/v1/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);

        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }

        console.log('Login successful, storing token');
        // Store token and user info
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        // Show success notification
        showNotification('Login successful! Redirecting...', 'success');

        // Update navigation
        updateNavigation(true);

        console.log('Redirecting to products page...');
        // Redirect to products page after a short delay
        setTimeout(() => {
            window.location.href = '/products';
        }, 1000);
    } catch (error) {
        console.error('Login error:', error);
        if (errorMessage) {
            errorMessage.textContent = error.message;
            errorMessage.style.display = 'block';
        }
        showNotification(error.message, 'error');
    }
}

// Utility Functions
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notificationMessage');
    
    if (notification && notificationMessage) {
        notification.className = `notification ${type}`;
        notificationMessage.textContent = message;
        notification.style.display = 'block';
        
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }
}

function updateNavigation(isAuthenticated) {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;

    if (isAuthenticated) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const authLinks = navLinks.innerHTML.match(/<a href="\/login".*?<\/a>\s*<a href="\/register".*?<\/a>/);
        if (authLinks) {
            navLinks.innerHTML = navLinks.innerHTML.replace(
                authLinks[0],
                `<a href="/profile"><i class="fas fa-user-circle"></i> ${user.name || 'Profile'}</a>
                 <a href="#" id="logoutBtn"><i class="fas fa-sign-out-alt"></i> Logout</a>`
            );

            // Add logout handler
            document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                showNotification('Logged out successfully');
                window.location.href = '/';
            });
        }
    }
}

function updateCartCount() {
    const cartCount = document.querySelector('.cart-count');
    if (cartCount) {
        cartCount.textContent = cart.length;
    }
}

// Main initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    const token = localStorage.getItem('token');
    
    // Set up form handlers
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        console.log('Login form found, adding event listener');
        loginForm.addEventListener('submit', handleLogin);
    } else {
        console.log('Login form not found');
    }

    // Cart link handler
    const cartLink = document.getElementById('cartLink');
    if (cartLink) {
        cartLink.addEventListener('click', (e) => {
            e.preventDefault();
            const token = localStorage.getItem('token');
            if (!token) {
                showNotification('Please login to view cart', 'error');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 1000);
            } else {
                window.location.href = '/cart';
            }
        });
    }

    // Update cart count
    updateCartCount();

    // Update navigation based on auth status
    updateNavigation(!!token);
    
    // If on login page and already logged in, redirect to products
    if (window.location.pathname === '/login' && token) {
        window.location.href = '/products';
    }
});

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
    return cart;
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

// Cart page functions
function renderCart() {
    const cartItems = document.getElementById('cartItems');
    const emptyCart = document.getElementById('emptyCart');
    const cartSummary = document.getElementById('cartSummary');
    
    if (!cartItems || !emptyCart || !cartSummary) return;

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

    const item = cart.find(item => item.productId === productId);
    if (item) {
        item.quantity = newQuantity;
        saveCart(cart);
        renderCart();
    }
}

function removeFromCart(productId) {
    const updatedCart = cart.filter(item => item.productId !== productId);
    saveCart(updatedCart);
    renderCart();
    showNotification('Item removed from cart');
}

function updateCartSummary() {
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
        const response = await fetch('/api/v1/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                items: cart,
                delivery_details: deliveryDetails,
                payment_details: paymentDetails
            })
        });

        if (!response.ok) {
            throw new Error('Failed to create order');
        }

        // Clear cart and show success
        saveCart([]);
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

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('cart');
    updateAuthUI();
    updateCartCount();
    window.location.href = '/';
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Set up form handlers
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorMessage = document.getElementById('errorMessage');
            
            // Disable submit button and show loading state
            const submitButton = e.target.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
            errorMessage.style.display = 'none';

            try {
                const response = await fetch('/api/v1/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password }),
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
        });
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const name = document.getElementById('name').value;
            const errorMessage = document.getElementById('errorMessage');

            try {
                const response = await fetch('/api/v1/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password, name }),
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
        });
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
    if (window.location.pathname === '/cart' && (!cart || cart.length === 0)) {
        // initializeTestCart();
    }

    const checkoutButton = document.getElementById('checkoutButton');
    if (checkoutButton) {
        checkoutButton.addEventListener('click', confirmPayment);
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

// Navigation Handlers
document.addEventListener('DOMContentLoaded', () => {
    // Cart link handler
    const cartLink = document.getElementById('cartLink');
    if (cartLink) {
        cartLink.addEventListener('click', (e) => {
            e.preventDefault();
            const token = localStorage.getItem('token');
            if (!token) {
                showNotification('Please login to view cart', 'error');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 1000);
            } else {
                window.location.href = '/cart';
            }
        });
    }

    // Update cart count
    updateCartCount();

    // Initialize auth state
    checkAuthState();
});

// Update navigation based on auth status
function updateNavigation(isAuthenticated) {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;

    if (isAuthenticated) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        // Replace login/register with profile/logout
        const authLinks = navLinks.innerHTML.match(/<a href="\/login".*?<\/a>\s*<a href="\/register".*?<\/a>/);
        if (authLinks) {
            navLinks.innerHTML = navLinks.innerHTML.replace(
                authLinks[0],
                `<a href="/profile"><i class="fas fa-user-circle"></i> ${user.name || 'Profile'}</a>
                 <a href="#" id="logoutBtn"><i class="fas fa-sign-out-alt"></i> Logout</a>`
            );

            // Add logout handler
            document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                showNotification('Logged out successfully');
                window.location.href = '/';
            });
        }
    }
}

// Check authentication status on page load
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    
    // Update navigation based on auth status
    updateNavigation(!!token);
    
    // If on login page and already logged in, redirect to products
    if (window.location.pathname === '/login' && token) {
        window.location.href = '/products';
    }
});

// Login form handler
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('errorMessage');

        try {
            const response = await fetch('/api/v1/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            // Store token and user info
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // Show success notification
            showNotification('Login successful! Redirecting...', 'success');

            // Update navigation
            updateNavigation(true);

            // Redirect to products page after a short delay
            setTimeout(() => {
                window.location.href = '/products';
            }, 1000);
        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.style.display = 'block';
            showNotification(error.message, 'error');
        }
    });
}

// Registration functionality
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const name = document.getElementById('name').value;
        const errorMessage = document.getElementById('errorMessage');

        try {
            const response = await fetch('/api/v1/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password, name }),
            });

            const data = await response.json();

            if (response.ok) {
                showNotification('Registration successful! Please login.', 'success');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 1500);
            } else {
                errorMessage.textContent = data.error || 'Registration failed';
            }
        } catch (error) {
            errorMessage.textContent = 'An error occurred. Please try again.';
        }
    });
}

// Cart functionality
async function addToCart(productId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login';
            return;
        }

        const response = await fetch('/api/v1/cart', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                product_id: productId,
                quantity: 1,
            }),
        });

        if (response.ok) {
            updateCartUI();
            showNotification('Product added to cart');
        } else {
            showNotification('Failed to add product to cart', 'error');
        }
    } catch (error) {
        showNotification('An error occurred', 'error');
    }
}

// Update cart UI
async function updateCartUI() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch('/api/v1/cart', {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (response.ok) {
            const cart = await response.json();
            
            // Update cart count in header
            const cartCount = document.getElementById('cartCount');
            if (cartCount) {
                cartCount.textContent = cart.Items.reduce((total, item) => total + item.Quantity, 0);
            }

            // Update cart page if on cart page
            const cartItemsContainer = document.querySelector('.cart-items');
            const cartTotal = document.querySelector('.cart-total-amount');
            const emptyCart = document.getElementById('emptyCart');
            const cartItems = document.getElementById('cartItems');

            if (cartItemsContainer) {
                if (cart.Items.length === 0) {
                    if (emptyCart) emptyCart.style.display = 'flex';
                    if (cartItems) cartItems.style.display = 'none';
                    return;
                }

                if (emptyCart) emptyCart.style.display = 'none';
                if (cartItems) cartItems.style.display = 'block';

                cartItemsContainer.innerHTML = cart.Items.map(item => `
                    <div class="cart-item">
                        <img src="${item.ProductImage}" alt="${item.Name}" class="cart-item-image">
                        <div class="cart-item-info">
                            <div class="cart-item-title">${item.Name}</div>
                            <div class="cart-item-price">$${item.Price.toFixed(2)}</div>
                            <div class="cart-item-description">${item.Description}</div>
                        </div>
                        <div class="cart-item-controls">
                            <div class="quantity-control">
                                <button class="quantity-btn" onclick="updateQuantity('${item.ProductID}', ${item.Quantity - 1})">-</button>
                                <span>${item.Quantity}</span>
                                <button class="quantity-btn" onclick="updateQuantity('${item.ProductID}', ${item.Quantity + 1})">+</button>
                            </div>
                            <button class="remove-btn" onclick="removeFromCart('${item.ProductID}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `).join('');

                if (cartTotal) {
                    cartTotal.textContent = `$${cart.Total.toFixed(2)}`;
                }
            }
        }
    } catch (error) {
        console.error('Error updating cart:', error);
    }
}

// Update item quantity in cart
async function updateQuantity(productId, newQuantity) {
    if (newQuantity < 1) {
        await removeFromCart(productId);
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/v1/cart', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                product_id: productId,
                quantity: newQuantity,
            }),
        });

        if (response.ok) {
            updateCartUI();
        }
    } catch (error) {
        showNotification('Error updating quantity', 'error');
    }
}

// Remove item from cart
async function removeFromCart(productId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/v1/cart/${productId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (response.ok) {
            updateCartUI();
            showNotification('Item removed from cart');
        }
    } catch (error) {
        showNotification('Error removing item', 'error');
    }
}

// Filter and sort functionality
function applyFiltersAndSort() {
    // Apply category filter
    const filteredProducts = products.filter(product => {
        const matchesCategory = currentFilter === 'all' || product.Category === currentFilter;
        const matchesSearch = product.Name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            product.Description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    // Apply sorting
    filteredProducts.sort((a, b) => {
        switch (currentSort) {
            case 'name-asc':
                return a.Name.localeCompare(b.Name);
            case 'name-desc':
                return b.Name.localeCompare(a.Name);
            case 'price-asc':
                return a.Price - b.Price;
            case 'price-desc':
                return b.Price - a.Price;
            default:
                return 0;
        }
    });
}

// Event listeners for filters and sorting
document.addEventListener('DOMContentLoaded', () => {
    // Initialize products on products page
    if (document.querySelector('.products-grid')) {
        fetchProducts();
    }

    // Initialize cart UI
    updateAuthUI();

    // Category filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentFilter = button.dataset.category;
            applyFiltersAndSort();
            renderProducts();
        });
    });

    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            applyFiltersAndSort();
            renderProducts();
        });
    }

    // Sort select
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            applyFiltersAndSort();
            renderProducts();
        });
    }
});

// Quick view functionality
function showQuickView(productId) {
    const product = products.find(p => p.ID === productId);
    if (!product) return;

    const modal = document.getElementById('quickViewModal');
    const quickView = modal.querySelector('.product-quick-view');
    
    quickView.innerHTML = `
        <div class="quick-view-content">
            <img src="${product.Image}" alt="${product.Name}" class="quick-view-image">
            <div class="quick-view-info">
                <h2>${product.Name}</h2>
                <p class="quick-view-description">${product.Description}</p>
                <div class="quick-view-price">$${product.Price.toFixed(2)}</div>
                <button class="add-to-cart-btn" onclick="addToCart('${product.ID}')">
                    <i class="fas fa-cart-plus"></i> Add to Cart
                </button>
            </div>
        </div>
    `;

    modal.style.display = 'block';
}

// Close modal when clicking the close button or outside the modal
document.addEventListener('click', (e) => {
    const modal = document.getElementById('quickViewModal');
    if (e.target.classList.contains('close') || e.target === modal) {
        modal.style.display = 'none';
    }
});