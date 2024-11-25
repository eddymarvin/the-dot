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
            localStorage.setItem('token', data.token);
            localStorage.setItem('userName', data.name);
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
    localStorage.removeItem('cart');
    updateAuthUI();
    window.location.href = '/';
}

// Product functions
async function fetchProducts() {
    try {
        const response = await fetch('/api/v1/products');
        products = await response.json();
        renderProducts();
    } catch (error) {
        showNotification('Error loading products');
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

// Cart functions
function getCart() {
    const cart = localStorage.getItem('cart');
    return cart ? JSON.parse(cart) : [];
}

function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
}

function addToCart(productId, name, price) {
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
    showNotification(`${name} added to cart`);
}

function updateCartCount() {
    const cart = getCart();
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    const cartCount = document.getElementById('cartCount');
    if (cartCount) {
        cartCount.textContent = count;
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
                <button class="quantity-btn" onclick="updateQuantity('${item.id}', ${item.quantity - 1})">
                    <i class="fas fa-minus"></i>
                </button>
                <span class="quantity-display">${item.quantity}</span>
                <button class="quantity-btn" onclick="updateQuantity('${item.id}', ${item.quantity + 1})">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
            <button class="remove-item" onclick="removeFromCart('${item.id}')">
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
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity = newQuantity;
        saveCart(cart);
        renderCart();
    }
}

function removeFromCart(productId) {
    const cart = getCart();
    const updatedCart = cart.filter(item => item.id !== productId);
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

async function checkout() {
    const cart = getCart();
    if (cart.length === 0) {
        showNotification('Your cart is empty');
        return;
    }

    const cartItems = cart.map(item => ({
        id: item.id,
        quantity: item.quantity
    }));

    try {
        const response = await fetch('/api/orders/cart', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ items: cartItems })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to create order');
        }

        const data = await response.json();
        
        // Clear the cart
        localStorage.removeItem('cart');
        updateCartCount();
        
        // Show success message
        showNotification('Order placed successfully!');
        
        // Redirect to home page after a short delay
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
    } catch (error) {
        showNotification(error.message);
    }
}

function updateTotal() {
    const subtotal = calculateSubtotal();
    const deliveryFee = 10.00; // Fixed delivery fee
    const total = subtotal + deliveryFee;

    document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('deliveryFee').textContent = `$${deliveryFee.toFixed(2)}`;
    document.getElementById('total').textContent = `$${total.toFixed(2)}`;
}

function calculateSubtotal() {
    const cart = getCart();
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

document.getElementById('proceedToDelivery').addEventListener('click', function() {
    const cartItems = document.getElementById('cartItems');
    const deliveryForm = document.getElementById('deliveryForm');
    const proceedToDelivery = document.getElementById('proceedToDelivery');
    const proceedToPayment = document.getElementById('proceedToPayment');

    cartItems.style.display = 'none';
    deliveryForm.style.display = 'block';
    proceedToDelivery.style.display = 'none';
    proceedToPayment.style.display = 'block';
});

document.getElementById('proceedToPayment').addEventListener('click', function() {
    const deliveryForm = document.getElementById('deliveryForm');
    const paymentSection = document.getElementById('paymentSection');
    const proceedToPayment = document.getElementById('proceedToPayment');
    const confirmPayment = document.getElementById('confirmPayment');

    // Validate delivery form
    const form = document.getElementById('deliveryDetailsForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    deliveryForm.style.display = 'none';
    paymentSection.style.display = 'block';
    proceedToPayment.style.display = 'none';
    confirmPayment.style.display = 'block';
});

function selectPaymentMethod(method) {
    selectedPaymentMethod = method;
    
    // Update UI to show selected method
    document.querySelectorAll('.payment-method').forEach(el => {
        el.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');

    // Show/hide card form
    const cardForm = document.getElementById('cardPaymentForm');
    cardForm.style.display = method === 'card' ? 'block' : 'none';
}

document.getElementById('confirmPayment').addEventListener('click', async function() {
    if (!selectedPaymentMethod) {
        alert('Please select a payment method');
        return;
    }

    const deliveryDetails = {
        address: document.getElementById('address').value,
        city: document.getElementById('city').value,
        zipCode: document.getElementById('zipCode').value,
        phone: document.getElementById('phone').value,
        instructions: document.getElementById('deliveryInstructions').value
    };

    let paymentDetails = {};
    if (selectedPaymentMethod === 'card') {
        const cardForm = document.getElementById('cardForm');
        if (!cardForm.checkValidity()) {
            cardForm.reportValidity();
            return;
        }

        paymentDetails = {
            method: 'card',
            card_details: {
                number: document.getElementById('cardNumber').value,
                expiry_month: parseInt(document.getElementById('expiryMonth').value),
                expiry_year: parseInt(document.getElementById('expiryYear').value),
                cvv: document.getElementById('cvv').value,
                holder_name: document.getElementById('cardHolderName').value
            }
        };
    } else if (selectedPaymentMethod === 'paypal') {
        paymentDetails = {
            method: 'paypal',
            paypal_details: {
                email: localStorage.getItem('userEmail') // You'll need to store this during login
            }
        };
    } else if (selectedPaymentMethod === 'crypto') {
        paymentDetails = {
            method: 'crypto',
            crypto_details: {
                wallet_address: 'YOUR_WALLET_ADDRESS', // You'll need to implement wallet connection
                currency: 'ETH'
            }
        };
    }

    try {
        const cart = getCart();
        const response = await fetch('/api/v1/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                items: cart,
                delivery_details: deliveryDetails,
                payment_details: paymentDetails,
                total_amount: parseFloat(document.getElementById('total').textContent.slice(1))
            })
        });

        if (!response.ok) {
            throw new Error('Failed to create order');
        }

        const result = await response.json();
        
        // Process payment
        const paymentResponse = await fetch('/api/v1/payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                order_id: result.id,
                amount: result.total_amount,
                method: selectedPaymentMethod,
                ...paymentDetails
            })
        });

        if (!paymentResponse.ok) {
            throw new Error('Payment failed');
        }

        // Clear cart and redirect to success page
        localStorage.removeItem('cart');
        alert('Order placed successfully!');
        window.location.href = '/';

    } catch (error) {
        console.error('Error:', error);
        alert('Failed to process order: ' + error.message);
    }
});

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
    if (window.location.pathname === '/cart') {
        renderCart();
    }

    const checkoutButton = document.getElementById('checkoutButton');
    if (checkoutButton) {
        checkoutButton.addEventListener('click', checkout);
    }
});