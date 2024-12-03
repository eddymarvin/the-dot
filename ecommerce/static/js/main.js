// Global variables
let cart = JSON.parse(localStorage.getItem('cart') || '[]');
let currentFilter = 'all';
let searchQuery = '';
let selectedPaymentMethod = null;

// Constants
const FREE_DELIVERY_THRESHOLD = 100;
const DELIVERY_FEE = 10;

// Authentication State Management
let currentUser = null;

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    checkAuthState();
    setupNavigation();
    setupAuthForms();
    setupCartFunctions();
    setupProfileFunctions();
    setupModalClosers();
    updateNavigation(!!localStorage.getItem('token'));
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
        setupProductButtons();
    }

    // Initialize cart page
    if (window.location.pathname.includes('/cart')) {
        renderCart();
        setupCartPage();
    }
});

// Authentication Functions
function checkAuthState() {
    const token = localStorage.getItem('token');
    const userName = localStorage.getItem('userName');
    
    if (token && userName) {
        currentUser = { name: userName };
        updateUIForAuthenticatedUser();
    } else {
        updateUIForUnauthenticatedUser();
    }
}

function updateUIForAuthenticatedUser() {
    const authLinks = document.getElementById('authLinks');
    const userLinks = document.getElementById('userLinks');
    const userName = document.getElementById('userName');
    
    if (authLinks) authLinks.style.display = 'none';
    if (userLinks) userLinks.style.display = 'flex';
    if (userName) userName.textContent = currentUser.name;
}

function updateUIForUnauthenticatedUser() {
    const authLinks = document.getElementById('authLinks');
    const userLinks = document.getElementById('userLinks');
    
    if (authLinks) authLinks.style.display = 'flex';
    if (userLinks) userLinks.style.display = 'none';
}

function setupAuthForms() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('userName', data.name);
            window.location.href = '/';
        } else {
            errorMessage.textContent = data.error || 'Login failed';
            errorMessage.style.display = 'block';
        }
    } catch (error) {
        errorMessage.textContent = 'An error occurred. Please try again.';
        errorMessage.style.display = 'block';
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const errorMessage = document.getElementById('errorMessage');

    if (password !== confirmPassword) {
        errorMessage.textContent = 'Passwords do not match';
        errorMessage.style.display = 'block';
        return;
    }

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('userName', data.name);
            window.location.href = '/';
        } else {
            errorMessage.textContent = data.error || 'Registration failed';
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
    localStorage.removeItem('cart');
    window.location.href = '/login';
}

// Navigation Setup
function setupNavigation() {
    const homeBtn = document.querySelector('.nav-link[href="/"]');
    const cartBtn = document.querySelector('.nav-link[href="/cart"]');
    const profileBtn = document.querySelector('.nav-link[href="/profile"]');
    const logoutBtn = document.querySelector('.nav-link[href="/logout"]');

    if (homeBtn) {
        homeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '/';
        });
    }

    if (cartBtn) {
        cartBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '/cart';
        });
    }

    if (profileBtn) {
        profileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (!currentUser) {
                showNotification('Please log in to view your profile', 'error');
                return;
            }
            window.location.href = '/profile';
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
}

// Cart Management Functions
function setupCartFunctions() {
    const addToCartButtons = document.querySelectorAll('.add-to-cart');
    const checkoutButton = document.getElementById('checkoutBtn');
    const checkoutForm = document.getElementById('checkoutForm');

    addToCartButtons.forEach(button => {
        button.addEventListener('click', handleAddToCart);
    });

    if (checkoutButton) {
        checkoutButton.addEventListener('click', showCheckoutModal);
    }

    if (checkoutForm) {
        checkoutForm.addEventListener('submit', handleCheckout);
    }

    // Load cart on cart page
    if (window.location.pathname === '/cart') {
        loadCart();
    }
}

function handleAddToCart(e) {
    const productId = e.target.dataset.productId;
    const productName = e.target.dataset.name;
    const productPrice = parseFloat(e.target.dataset.price);

    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: productId,
            name: productName,
            price: productPrice,
            quantity: 1
        });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    showNotification('Item added to cart!');
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Profile Management Functions
function setupProfileFunctions() {
    const updateProfileForm = document.getElementById('updateProfileForm');
    
    if (updateProfileForm) {
        loadProfileData();
        updateProfileForm.addEventListener('submit', handleUpdateProfile);
    }
}

async function loadProfileData() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch('/api/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            document.getElementById('updateName').value = data.name;
            document.getElementById('updateEmail').value = data.email;
            document.getElementById('profileName').textContent = data.name;
            document.getElementById('profileEmail').textContent = data.email;
        }
    } catch (error) {
        showNotification('Failed to load profile data');
    }
}

async function handleUpdateProfile(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;

    const formData = new FormData(e.target);
    const data = {
        name: formData.get('name'),
        currentPassword: formData.get('currentPassword'),
        newPassword: formData.get('newPassword')
    };

    try {
        const response = await fetch('/api/profile/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            showNotification('Profile updated successfully');
            localStorage.setItem('userName', data.name);
            checkAuthState();
        } else {
            const error = await response.json();
            showNotification(error.message || 'Failed to update profile');
        }
    } catch (error) {
        showNotification('An error occurred. Please try again.');
    }
}

// Modal Functions
function setupModalClosers() {
    const modals = document.querySelectorAll('.modal');
    const closeButtons = document.querySelectorAll('.close');

    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            if (modal) modal.style.display = 'none';
        });
    });

    modals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

function showCheckoutModal() {
    const modal = document.getElementById('checkoutModal');
    if (modal) modal.style.display = 'block';
}

async function handleCheckout(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    const formData = new FormData(e.target);
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    const orderData = {
        items: cart,
        deliveryDetails: {
            name: formData.get('name'),
            address: formData.get('address'),
            phone: formData.get('phone')
        },
        paymentMethod: formData.get('paymentMethod')
    };

    try {
        const response = await fetch('/api/orders/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(orderData)
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.removeItem('cart');
            window.location.href = `/order-confirmation/${data.orderId}`;
        } else {
            const error = await response.json();
            showNotification(error.message || 'Failed to create order');
        }
    } catch (error) {
        showNotification('An error occurred. Please try again.');
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

// Product Button Setup
function setupProductButtons() {
    const addToCartButtons = document.querySelectorAll('.add-to-cart');
    
    addToCartButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const { productId, name, price } = e.target.dataset;
            addToCart(productId, name, parseFloat(price));
            showNotification(`${name} added to cart!`, 'success');
            updateCartCount();
        });
    });
}

// Cart Page Setup
function setupCartPage() {
    const proceedToDeliveryBtn = document.getElementById('proceedToDelivery');
    const proceedToPaymentBtn = document.getElementById('proceedToPayment');
    const confirmPaymentBtn = document.getElementById('confirmPayment');
    
    if (proceedToDeliveryBtn) {
        proceedToDeliveryBtn.addEventListener('click', () => {
            if (getCart().length === 0) {
                showNotification('Your cart is empty', 'error');
                return;
            }
            proceedToDelivery();
        });
    }

    if (proceedToPaymentBtn) {
        proceedToPaymentBtn.addEventListener('click', () => {
            if (validateDeliveryForm()) {
                proceedToPayment();
            } else {
                showNotification('Please fill in all required delivery details', 'error');
            }
        });
    }

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