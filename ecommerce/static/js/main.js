// Constants
const FREE_DELIVERY_THRESHOLD = 100;
const DELIVERY_FEE = 10;

// Cart functionality
let cart = [];
let cartTotal = 0;

// Update cart count
function updateCartCount() {
    const cartCount = document.querySelector('.cart-count');
    if (cartCount) {
        cartCount.textContent = cart.length;
    }
}

// Calculate delivery fee
function calculateDelivery(total) {
    return total >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
}

// Add to cart function
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
                'Authorization': token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                product_id: productId,
                quantity: 1
            })
        });

        if (response.ok) {
            window.location.href = '/cart';
        } else {
            const data = await response.json();
            showNotification(data.error || 'Failed to add item to cart');
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        showNotification('Failed to add item to cart');
    }
}

// Show notification
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Fetch and display products
async function fetchProducts() {
    try {
        const response = await fetch('/api/v1/products');
        const products = await response.json();
        const productsDiv = document.getElementById('products');
        
        if (!productsDiv) return;
        
        productsDiv.innerHTML = products.map(product => `
            <div class="col-md-4 col-lg-3 mb-4">
                <div class="card product-card">
                    <img src="${product.image_url}" class="card-img-top" alt="${product.name}">
                    <div class="card-body">
                        <h5 class="card-title">${product.name}</h5>
                        <p class="card-text">${product.description}</p>
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <span class="price">$${product.price.toFixed(2)}</span>
                            <span class="stock">Stock: ${product.stock}</span>
                        </div>
                        <button onclick="addToCart('${product.id}', '${product.name}', ${product.price})" 
                                class="btn btn-gold w-100">
                            Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error fetching products:', error);
        showNotification('Error loading products');
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    updateAuthNav(); // From auth.js
    
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