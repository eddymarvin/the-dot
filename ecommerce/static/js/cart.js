// Check authentication
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
    }
    return token;
}

// Load cart items
async function loadCart() {
    const token = checkAuth();
    try {
        const response = await fetch('/api/v1/cart', {
            headers: {
                'Authorization': token
            }
        });
        const data = await response.json();
        displayCart(data);
    } catch (error) {
        console.error('Error loading cart:', error);
    }
}

// Display cart items
function displayCart(cartData) {
    const cartItems = document.getElementById('cartItems');
    const cartSummary = document.getElementById('cartSummary');
    
    if (!cartData.items || cartData.items.length === 0) {
        cartItems.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-shopping-cart fa-3x mb-3"></i>
                <h3>Your cart is empty</h3>
                <a href="/" class="btn btn-gold mt-3">Continue Shopping</a>
            </div>
        `;
        cartSummary.innerHTML = '';
        return;
    }

    // Display items
    cartItems.innerHTML = cartData.items.map(item => `
        <div class="card mb-3">
            <div class="row g-0">
                <div class="col-md-2">
                    <img src="${item.image_url}" class="img-fluid rounded-start" alt="${item.name}">
                </div>
                <div class="col-md-8">
                    <div class="card-body">
                        <h5 class="card-title">${item.name}</h5>
                        <p class="card-text">$${item.price.toFixed(2)}</p>
                        <div class="quantity-controls">
                            <button class="btn btn-sm btn-outline-gold" onclick="updateQuantity('${item.id}', ${item.quantity - 1})">-</button>
                            <span class="mx-2">${item.quantity}</span>
                            <button class="btn btn-sm btn-outline-gold" onclick="updateQuantity('${item.id}', ${item.quantity + 1})">+</button>
                        </div>
                    </div>
                </div>
                <div class="col-md-2 d-flex align-items-center justify-content-center">
                    <button class="btn btn-outline-danger" onclick="removeItem('${item.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    // Update summary
    const subtotal = cartData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = subtotal >= 100 ? 0 : 10;
    const total = subtotal + deliveryFee;

    cartSummary.innerHTML = `
        <div class="d-flex justify-content-between mb-2">
            <span>Subtotal:</span>
            <span>$${subtotal.toFixed(2)}</span>
        </div>
        <div class="d-flex justify-content-between mb-2">
            <span>Delivery Fee:</span>
            <span>${deliveryFee === 0 ? 'FREE' : '$' + deliveryFee.toFixed(2)}</span>
        </div>
        <hr>
        <div class="d-flex justify-content-between mb-2">
            <strong>Total:</strong>
            <strong>$${total.toFixed(2)}</strong>
        </div>
        ${deliveryFee === 0 ? 
            '<div class="delivery-status free"><i class="fas fa-truck"></i> Free Delivery Applied!</div>' :
            `<div class="delivery-status pending">Add $${(100 - subtotal).toFixed(2)} more for Free Delivery!</div>`
        }
    `;
}

// Update quantity
async function updateQuantity(productId, newQuantity) {
    if (newQuantity < 1) return;
    
    const token = checkAuth();
    try {
        const response = await fetch('/api/v1/cart/add', {
            method: 'POST',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                product_id: productId,
                quantity: newQuantity
            })
        });
        
        if (response.ok) {
            loadCart();
        }
    } catch (error) {
        console.error('Error updating quantity:', error);
    }
}

// Remove item
async function removeItem(productId) {
    const token = checkAuth();
    try {
        const response = await fetch(`/api/v1/cart/${productId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': token
            }
        });
        
        if (response.ok) {
            loadCart();
        }
    } catch (error) {
        console.error('Error removing item:', error);
    }
}

// Handle payment method selection
function handlePaymentMethodChange() {
    const selectedMethod = document.querySelector('input[name="payment"]:checked').value;
    const paymentDetails = document.getElementById('paymentDetails');
    
    switch(selectedMethod) {
        case 'card':
            paymentDetails.innerHTML = `
                <div class="mb-3">
                    <label class="form-label">Card Number</label>
                    <input type="text" class="form-control" placeholder="**** **** **** ****">
                </div>
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label">Expiry Date</label>
                        <input type="text" class="form-control" placeholder="MM/YY">
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">CVV</label>
                        <input type="text" class="form-control" placeholder="***">
                    </div>
                </div>
            `;
            break;
        case 'crypto':
            paymentDetails.innerHTML = `
                <div class="mb-3">
                    <label class="form-label">Select Cryptocurrency</label>
                    <select class="form-control">
                        <option value="btc">Bitcoin (BTC)</option>
                        <option value="eth">Ethereum (ETH)</option>
                        <option value="usdt">Tether (USDT)</option>
                    </select>
                </div>
                <div class="qr-code text-center">
                    <i class="fas fa-qrcode fa-5x gold-text"></i>
                    <p class="mt-2">Scan QR code to pay</p>
                </div>
            `;
            break;
        case 'wallet':
            paymentDetails.innerHTML = `
                <div class="mb-3">
                    <label class="form-label">Select Wallet</label>
                    <select class="form-control">
                        <option value="apple">Apple Pay</option>
                        <option value="google">Google Pay</option>
                        <option value="paypal">PayPal</option>
                    </select>
                </div>
                <div class="text-center mt-3">
                    <i class="fas fa-wallet fa-3x gold-text"></i>
                    <p class="mt-2">You'll be redirected to complete payment</p>
                </div>
            `;
            break;
        case 'mpesa':
            paymentDetails.innerHTML = `
                <div class="mb-3">
                    <label class="form-label">M-Pesa Phone Number</label>
                    <div class="input-group">
                        <span class="input-group-text">+254</span>
                        <input type="tel" class="form-control" placeholder="7XX XXX XXX" maxlength="9" pattern="[0-9]{9}">
                    </div>
                    <small class="form-text text-muted">Enter your M-Pesa registered number</small>
                </div>
                <div class="mpesa-info alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    <p class="mb-0">You will receive an M-Pesa prompt on your phone to complete the payment</p>
                </div>
                <div class="text-center mt-3">
                    <img src="/static/images/mpesa-logo.png" alt="M-Pesa" class="mpesa-logo">
                </div>
            `;

            // Add phone number formatting
            const phoneInput = paymentDetails.querySelector('input[type="tel"]');
            phoneInput?.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length > 9) value = value.slice(0, 9);
                
                // Format as 7XX XXX XXX
                if (value.length > 6) {
                    value = value.slice(0, 3) + ' ' + value.slice(3, 6) + ' ' + value.slice(6);
                } else if (value.length > 3) {
                    value = value.slice(0, 3) + ' ' + value.slice(3);
                }
                
                e.target.value = value;
            });
            break;
    }
}

// Add event listeners for payment method changes
document.querySelectorAll('input[name="payment"]').forEach(radio => {
    radio.addEventListener('change', handlePaymentMethodChange);
});

// Handle M-Pesa payment
async function handleMpesaPayment(phoneNumber, amount) {
    try {
        // Initiate STK Push
        const response = await fetch('/api/v1/mpesa/stkpush', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': checkAuth()
            },
            body: JSON.stringify({
                phone_number: phoneNumber.replace(/\D/g, ''),
                amount: amount
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            // Show processing state
            const paymentDetails = document.getElementById('paymentDetails');
            paymentDetails.innerHTML = `
                <div class="mpesa-processing">
                    <div class="spinner-border text-gold" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <div class="mt-3">
                        <h5>Processing M-Pesa Payment</h5>
                        <p>Please check your phone and enter your M-Pesa PIN to complete the payment</p>
                        <div class="progress mt-3">
                            <div class="progress-bar progress-bar-striped progress-bar-animated bg-gold" 
                                 role="progressbar" style="width: 100%"></div>
                        </div>
                    </div>
                </div>
            `;

            // Start checking transaction status
            return checkTransactionStatus(data.checkout_request_id);
        } else {
            throw new Error(data.error || 'Failed to initiate M-Pesa payment');
        }
    } catch (error) {
        console.error('M-Pesa payment error:', error);
        alert(error.message);
        return false;
    }
}

// Check M-Pesa transaction status
async function checkTransactionStatus(checkoutRequestId) {
    let attempts = 0;
    const maxAttempts = 10;
    const interval = 5000; // 5 seconds

    while (attempts < maxAttempts) {
        try {
            const response = await fetch(`/api/v1/mpesa/status/${checkoutRequestId}`, {
                headers: {
                    'Authorization': checkAuth()
                }
            });

            const data = await response.json();

            if (response.ok) {
                switch (data.status) {
                    case 'COMPLETED':
                        return true;
                    case 'FAILED':
                        throw new Error(data.reason || 'Payment failed');
                    case 'CANCELLED':
                        throw new Error('Payment was cancelled');
                    case 'PENDING':
                        // Continue waiting
                        break;
                }
            }
        } catch (error) {
            console.error('Status check error:', error);
            throw error;
        }

        attempts++;
        if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, interval));
        }
    }

    throw new Error('Payment timeout. Please check your M-Pesa messages for the status.');
}

// Handle checkout
document.getElementById('checkoutBtn')?.addEventListener('click', async () => {
    const token = checkAuth();
    const selectedMethod = document.querySelector('input[name="payment"]:checked').value;
    
    try {
        if (selectedMethod === 'mpesa') {
            const phoneInput = document.querySelector('input[type="tel"]');
            if (!phoneInput.value.replace(/\D/g, '').match(/^[7][0-9]{8}$/)) {
                throw new Error('Please enter a valid M-Pesa phone number starting with 7');
            }

            const cartTotal = parseFloat(document.querySelector('#cartSummary .total-amount').textContent.replace('$', ''));
            
            // Handle M-Pesa payment first
            const paymentSuccess = await handleMpesaPayment(phoneInput.value, cartTotal);
            if (!paymentSuccess) return;
        }

        // Proceed with order creation
        const response = await fetch('/api/v1/orders', {
            method: 'POST',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                payment_method: selectedMethod
            })
        });
        
        const data = await response.json();
        if (response.ok) {
            alert('Order placed successfully!');
            window.location.href = '/orders';
        } else {
            throw new Error(data.error || 'Failed to place order');
        }
    } catch (error) {
        console.error('Checkout error:', error);
        alert(error.message || 'Failed to place order. Please try again.');
    }
});

// Check authentication status
function checkAuthStatus() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    
    const authLinks = document.querySelector('.auth-links');
    if (authLinks) {
        if (token && user) {
            authLinks.innerHTML = `
                <span class="nav-link text-gold">Welcome, ${user.name}</span>
                <a href="#" class="nav-link" onclick="logout()">Logout</a>
            `;
        } else {
            authLinks.innerHTML = `
                <a href="/login" class="nav-link">Login</a>
                <a href="/register" class="nav-link">Register</a>
            `;
        }
    }
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
}

// Add to cart function
function addToCart(productId, name, price) {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    // Add to cart API call
    fetch('/api/v1/cart/add', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token
        },
        body: JSON.stringify({ product_id: productId, quantity: 1 })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showNotification(data.error);
        } else {
            window.location.href = '/cart';
        }
    })
    .catch(error => {
        console.error('Error adding to cart:', error);
        showNotification('Failed to add item to cart');
    });
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
        
        productsDiv.innerHTML = products.map(product => `
            <div class="col-md-4 col-lg-3">
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
    checkAuthStatus();
    fetchProducts();
    loadCart();
    handlePaymentMethodChange();
    
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