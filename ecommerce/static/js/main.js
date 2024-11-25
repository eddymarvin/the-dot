// Main JavaScript file for handling frontend interactions

// Constants
const FREE_DELIVERY_THRESHOLD = 100;
const DELIVERY_FEE = 10;

// Authentication functions
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');

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
            // Store the token
            localStorage.setItem('token', data.token);
            localStorage.setItem('userName', data.name);
            
            // Redirect to home page
            window.location.href = '/';
        } else {
            errorMessage.textContent = data.error || 'Login failed. Please try again.';
            errorMessage.style.display = 'block';
        }
    } catch (error) {
        errorMessage.textContent = 'An error occurred. Please try again.';
        errorMessage.style.display = 'block';
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
            // Store the token
            localStorage.setItem('token', data.token);
            localStorage.setItem('userName', name);
            
            // Redirect to home page
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

// Cart functions
function addToCart(productId, name, price) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart.push({ id: productId, name: name, price: price, quantity: 1 });
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    showNotification('Product added to cart!');
}

function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartCount = document.getElementById('cart-count');
    if (cartCount) {
        cartCount.textContent = cart.length;
    }
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Products functions
async function fetchProducts() {
    try {
        const response = await fetch('/api/v1/products');
        if (!response.ok) {
            throw new Error('Failed to fetch products');
        }
        
        const data = await response.json();
        const productsContainer = document.getElementById('products-container');
        if (!productsContainer) return;

        productsContainer.innerHTML = data.products.map(product => `
            <div class="product-card">
                <img src="${product.image_url}" alt="${product.name}" class="product-image">
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p>${product.description}</p>
                    <p class="price">$${product.price.toFixed(2)}</p>
                    <button onclick="addToCart('${product.id}', '${product.name}', ${product.price})" 
                            class="add-to-cart"
                            ${product.stock > 0 ? '' : 'disabled'}>
                        ${product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error fetching products:', error);
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    // Set up form handlers
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // Update cart count
    updateCartCount();

    // Fetch products if on home page
    if (document.getElementById('products-container')) {
        fetchProducts();
    }

    // Check authentication status and update UI
    const token = localStorage.getItem('token');
    const userName = localStorage.getItem('userName');
    if (token && userName) {
        // Update navigation for logged-in user
        const navLinks = document.querySelector('.nav-links');
        if (navLinks) {
            navLinks.innerHTML = `
                <a href="/" class="active"><i class="fas fa-home"></i> Home</a>
                <a href="/cart"><i class="fas fa-shopping-cart"></i> Cart <span id="cart-count">0</span></a>
                <span class="user-name"><i class="fas fa-user"></i> ${userName}</span>
                <a href="#" onclick="logout()"><i class="fas fa-sign-out-alt"></i> Logout</a>
            `;
        }
    }
});

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    localStorage.removeItem('cart');
    window.location.href = '/login';
}