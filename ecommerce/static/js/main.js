// Main JavaScript file for handling frontend interactions

// Constants
const FREE_DELIVERY_THRESHOLD = 100;
const DELIVERY_FEE = 10;

// Authentication functions
async function login(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/v1/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('token', data.token);
            window.location.href = '/';  // Redirect to home page
        } else {
            alert(data.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
    }
}

async function register(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const email = document.getElementById('email').value;

    try {
        const response = await fetch('/api/v1/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password, email })
        });

        const data = await response.json();
        if (response.ok) {
            alert('Registration successful! Please login.');
            window.location.href = '/login';
        } else {
            alert(data.error || 'Registration failed');
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('Registration failed. Please try again.');
    }
}

// Cart functions
async function addToCart(productId, name, price) {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    try {
        const response = await fetch('/api/v1/cart/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                product_id: productId,
                name: name,
                quantity: 1,
                price: price
            })
        });

        const data = await response.json();
        if (response.ok) {
            alert('Product added to cart!');
            updateCartCount();
        } else {
            alert(data.error || 'Failed to add to cart');
        }
    } catch (error) {
        console.error('Add to cart error:', error);
        alert('Failed to add to cart. Please try again.');
    }
}

async function updateCartCount() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch('/api/v1/cart', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (response.ok) {
            const cartCount = document.getElementById('cart-count');
            if (cartCount) {
                cartCount.textContent = data.items ? data.items.length : '0';
            }
        }
    } catch (error) {
        console.error('Update cart count error:', error);
    }
}

// Fetch and display products
async function fetchProducts() {
    try {
        const response = await fetch('/api/v1/products');
        if (!response.ok) {
            throw new Error('Failed to fetch products');
        }
        
        const productList = await response.json();
        const productsContainer = document.getElementById('products-container');
        if (!productsContainer) return; // Only proceed if we're on a page with products
        
        productsContainer.innerHTML = productList.map(product => `
            <div class="product-card">
                <img src="${product.image_url}" alt="${product.name}" class="product-image">
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p>${product.description}</p>
                    <p class="price">$${product.price.toFixed(2)}</p>
                    <button onclick="addToCart('${product.id}', '${product.name}', ${product.price})" 
                            class="btn btn-primary add-to-cart"
                            ${product.stock > 0 ? '' : 'disabled'}>
                        ${product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error fetching products:', error);
        const productsContainer = document.getElementById('products-container');
        if (productsContainer) {
            productsContainer.innerHTML = '<p class="error">Failed to load products. Please try again later.</p>';
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Add event listeners to forms if they exist
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', login);
    }

    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', register);
    }

    // Update cart count on page load
    updateCartCount();

    // Fetch and display products
    fetchProducts();

    // Add smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });
});