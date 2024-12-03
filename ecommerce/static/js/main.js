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

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        showNotification('Login successful! Redirecting...', 'success');
        updateNavigation(true);

        setTimeout(() => {
            window.location.href = '/';
        }, 1000);
    } catch (error) {
        errorMessage.textContent = error.message;
        errorMessage.style.display = 'block';
        showNotification(error.message, 'error');
    }
}

async function handleRegister(e) {
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

        if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
        }

        showNotification('Registration successful! Please login.', 'success');
        setTimeout(() => {
            window.location.href = '/login';
        }, 1500);
    } catch (error) {
        errorMessage.textContent = error.message;
        errorMessage.style.display = 'block';
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

            document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
                e.preventDefault();
                logout();
            });
        }
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('cart');
    showNotification('Logged out successfully');
    window.location.href = '/';
}

async function authenticatedFetch(url, options = {}) {
    const token = localStorage.getItem('token');
    if (token) {
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };
    }
    return fetch(url, options);
}

// Product Functions
async function fetchProducts() {
    try {
        const response = await fetch('/api/v1/products');
        const products = await response.json();
        displayProducts(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        showNotification('Failed to load products', 'error');
    }
}

function displayProducts(products) {
    const productsGrid = document.querySelector('.products-grid');
    if (!productsGrid) return;

    productsGrid.innerHTML = products.map(product => `
        <div class="product-card">
            <div class="product-image">
                <img src="${product.Image || 'https://placehold.co/300x300/2a2a2a/FFD700?text=' + encodeURIComponent(product.Name)}" 
                     alt="${product.Name}">
            </div>
            <div class="product-info">
                <h3>${product.Name}</h3>
                <p>${product.Description}</p>
                <div class="product-price">$${product.Price.toFixed(2)}</div>
                <button onclick="addToCart('${product.ID}', '${product.Name}', ${product.Price})" class="btn-primary">
                    <i class="fas fa-cart-plus"></i> Add to Cart
                </button>
            </div>
        </div>
    `).join('');
}

// Payment validation functions
function validateDeliveryForm() {
    const requiredFields = ['name', 'address', 'city', 'phone'];
    let isValid = true;
    
    requiredFields.forEach(field => {
        const input = document.getElementById(field);
        if (!input || !input.value.trim()) {
            isValid = false;
            input?.classList.add('invalid');
        } else {
            input?.classList.remove('invalid');
        }
    });
    
    return isValid;
}

function validatePaymentMethod() {
    const selectedMethod = document.querySelector('input[name="paymentMethod"]:checked');
    if (!selectedMethod) {
        showNotification('Please select a payment method', 'error');
        return false;
    }

    const methodForm = document.getElementById(`${selectedMethod.value}Form`);
    if (!methodForm) return true;

    const inputs = methodForm.querySelectorAll('input[required]');
    let isValid = true;

    inputs.forEach(input => {
        if (!input.value.trim()) {
            isValid = false;
            input.classList.add('invalid');
        } else {
            input.classList.remove('invalid');
        }
    });

    return isValid;
}

// Main initialization
document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    updateNavigation(!!token);
    updateCartCount();

    // Set up form handlers
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // Initialize products page
    if (document.querySelector('.products-grid')) {
        fetchProducts();
    }

    // Initialize cart page
    if (window.location.pathname === '/cart') {
        renderCart();
        
        // Cart navigation buttons
        const proceedToDeliveryBtn = document.getElementById('proceedToDelivery');
        if (proceedToDeliveryBtn) {
            proceedToDeliveryBtn.addEventListener('click', () => {
                if (getCart().length === 0) {
                    showNotification('Your cart is empty', 'error');
                    return;
                }
                proceedToDelivery();
            });
        }

        const proceedToPaymentBtn = document.getElementById('proceedToPayment');
        if (proceedToPaymentBtn) {
            proceedToPaymentBtn.addEventListener('click', () => {
                if (validateDeliveryForm()) {
                    proceedToPayment();
                } else {
                    showNotification('Please fill in all required delivery details', 'error');
                }
            });
        }

        const confirmPaymentBtn = document.getElementById('confirmPayment');
        if (confirmPaymentBtn) {
            confirmPaymentBtn.addEventListener('click', () => {
                if (validatePaymentMethod()) {
                    confirmPayment();
                }
            });
        }

        // Payment method selection
        const paymentMethods = document.querySelectorAll('input[name="paymentMethod"]');
        paymentMethods.forEach(method => {
            method.addEventListener('change', (e) => {
                document.querySelectorAll('.payment-form').forEach(form => {
                    form.style.display = 'none';
                });
                const selectedForm = document.getElementById(`${e.target.value}Form`);
                if (selectedForm) {
                    selectedForm.style.display = 'block';
                }
            });
        });
    }
});

// Cart functions
function getCart() {
    const cartData = localStorage.getItem('cart');
    return cartData ? JSON.parse(cartData) : [];
}

function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
}

function updateCartCount() {
    const cartCount = document.querySelector('.cart-count');
    if (cartCount) {
        const cart = getCart();
        cartCount.textContent = cart.length;
    }
}

function addToCart(productId, name, price) {
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('Please login to add items to cart', 'error');
        setTimeout(() => {
            window.location.href = '/login';
        }, 1500);
        return;
    }

    const cart = getCart();
    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: productId,
            name: name,
            price: price,
            quantity: 1
        });
    }

    saveCart(cart);
    showNotification('Item added to cart', 'success');
}

function removeFromCart(productId) {
    const cart = getCart();
    const updatedCart = cart.filter(item => item.id !== productId);
    saveCart(updatedCart);
    renderCart();
    showNotification('Item removed from cart', 'success');
}

function updateQuantity(productId, delta) {
    const cart = getCart();
    const item = cart.find(item => item.id === productId);
    
    if (item) {
        item.quantity = Math.max(1, item.quantity + delta);
        saveCart(cart);
        renderCart();
    }
}

function calculateTotal(cart) {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

async function confirmPayment() {
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked');
    if (!paymentMethod) {
        showNotification('Please select a payment method', 'error');
        return;
    }

    const cart = getCart();
    if (cart.length === 0) {
        showNotification('Your cart is empty', 'error');
        return;
    }

    const deliveryForm = document.getElementById('deliveryForm');
    const formData = new FormData(deliveryForm);
    const deliveryDetails = Object.fromEntries(formData.entries());

    try {
        const response = await authenticatedFetch('/api/v1/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                items: cart.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity
                })),
                delivery_details: {
                    name: deliveryDetails.name,
                    address: deliveryDetails.address,
                    city: deliveryDetails.city,
                    phone: deliveryDetails.phone,
                    instructions: deliveryDetails.instructions || ''
                },
                payment_method: paymentMethod.value,
                total: calculateTotal(cart) + DELIVERY_FEE
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create order');
        }

        localStorage.removeItem('cart');
        updateCartCount();
        showNotification('Order placed successfully!', 'success');
        
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function renderCart() {
    const cartContainer = document.getElementById('cartItems');
    const totalElement = document.getElementById('cartTotal');
    const cart = getCart();

    if (!cartContainer) return;

    if (cart.length === 0) {
        cartContainer.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
        if (totalElement) totalElement.textContent = '$0.00';
        return;
    }

    cartContainer.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="item-details">
                <h3>${item.name}</h3>
                <p class="price">$${(item.price * item.quantity).toFixed(2)}</p>
            </div>
            <div class="quantity-controls">
                <button onclick="updateQuantity('${item.id}', -1)" class="btn-quantity">-</button>
                <span>${item.quantity}</span>
                <button onclick="updateQuantity('${item.id}', 1)" class="btn-quantity">+</button>
            </div>
            <button onclick="removeFromCart('${item.id}')" class="btn-remove">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');

    if (totalElement) {
        const subtotal = calculateTotal(cart);
        const total = subtotal + DELIVERY_FEE;
        totalElement.innerHTML = `
            <div class="subtotal">Subtotal: $${subtotal.toFixed(2)}</div>
            <div class="delivery-fee">Delivery Fee: $${DELIVERY_FEE.toFixed(2)}</div>
            <div class="total">Total: $${total.toFixed(2)}</div>
        `;
    }
}

// Checkout Process
function proceedToDelivery() {
    const cartSection = document.getElementById('cartSection');
    const deliverySection = document.getElementById('deliverySection');
    
    if (cartSection && deliverySection) {
        cartSection.style.display = 'none';
        deliverySection.style.display = 'block';
    }
}

function proceedToPayment() {
    const deliveryForm = document.getElementById('deliveryForm');
    if (!deliveryForm.checkValidity()) {
        deliveryForm.reportValidity();
        return;
    }

    const deliverySection = document.getElementById('deliverySection');
    const paymentSection = document.getElementById('paymentSection');
    
    if (deliverySection && paymentSection) {
        deliverySection.style.display = 'none';
        paymentSection.style.display = 'block';
    }
}