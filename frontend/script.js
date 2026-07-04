// --- GLOBAL DATA & STATE---
let products = [];
let cart = [];
let wishlist = [];
let currentUser = null;
let currentSubcategory = null;

// --- API Configuration ---
const API_BASE_URL = 'http://localhost:8000';

// --- DATA PERSISTENCE ---
function saveCartToLocalStorage() {
    localStorage.setItem('tinyTwinklesCart', JSON.stringify(cart));
}

function loadCartFromLocalStorage() {
    const storedCart = localStorage.getItem('tinyTwinklesCart');
    if (storedCart) {
        cart = JSON.parse(storedCart);
    }
}

function saveCurrentUserToSessionStorage() {
    sessionStorage.setItem('tinyTwinklesCurrentUser', JSON.stringify(currentUser));
}

function loadCurrentUserFromSessionStorage() {
    const storedUser = sessionStorage.getItem('tinyTwinklesCurrentUser');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
    }
}

// --- DATA FETCHING FROM BACKEND ---
async function fetchProducts(category = null, subcategory = null, featured = false) {
    let url = `${API_BASE_URL}/products`;
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (subcategory) params.append('subcategory', subcategory);
    if (featured) params.append('featured', 'true');

    if (params.toString()) {
        url += `?${params.toString()}`;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        let fetchedProducts = await response.json();
        products = fetchedProducts.map(p => ({
            ...p,
            price: parseFloat(p.price)
        }));
    } catch (error) {
        console.error("Error fetching products:", error);
        showMessage('Error', 'Failed to load products from server.');
        products = [];
    }
}

async function fetchUserWishlist(userId) {
    if (!userId) {
        wishlist = [];
        updateWishlistUI();
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/wishlist?user_id=${userId}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        let fetchedWishlist = await response.json();
        // FIX: Convert price string to a number for each item
        wishlist = fetchedWishlist.map(item => ({
            ...item,
            price: parseFloat(item.price) 
        }));
        updateWishlistUI();
    } catch (error) {
        console.error("Error fetching wishlist:", error);
        wishlist = [];
        updateWishlistUI();
    }
}

// --- PAGE ROUTING & DISPLAY ---
async function showPage(pageId, subcategoryId = null) {
    document.querySelectorAll('.page').forEach(page => page.style.display = 'none');
    const pageToShow = document.getElementById(pageId);
    
    if (!pageToShow) return;

    currentSubcategory = subcategoryId;

    if (pageId === 'auth') {
        pageToShow.style.display = 'flex';
    } else {
        pageToShow.style.display = 'block';
    }

    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.querySelector(`.nav-link[href='#${pageId}']`)?.classList.add('active');
    
    const shopLink = document.getElementById('navbarDropdown');
    const categoryPages = ['all-products', 'boys-collection', 'girls-collection', 'toys', 'feeding-nursing', 'furniture'];
    if (categoryPages.includes(pageId)) {
        shopLink.classList.add('active');
    } else {
        shopLink.classList.remove('active');
    }

    if (categoryPages.includes(pageId)) {
        let title = "All Products";
        let categoryFilter = null;
        const categoryMap = {
            'boys-collection': "Boys' Collection",
            'girls-collection': "Girls' Collection",
            'toys': "Toys",
            'feeding-nursing': "Feeding & Nursing",
            'furniture': "Furniture"
        };
        if (pageId !== 'all-products') {
            categoryFilter = pageId;
            title = categoryMap[pageId];
        }
        if (subcategoryId) {
            const displaySubcategory = subcategoryId.charAt(0).toUpperCase() + subcategoryId.slice(1);
            title += ` - ${displaySubcategory}`;
        }
        await fetchProducts(categoryFilter, subcategoryId);
        renderProductPage(pageId, title);
    } else if (pageId === 'home') {
        await fetchProducts(null, null, true);
        renderFeaturedProducts();
    } else if (pageId === 'wishlist') {
        await fetchUserWishlist(currentUser ? currentUser.id : null);
    } else if (pageId === 'cart') {
        updateCart();
    } else if (pageId === 'checkout') {
        renderCheckoutPage();
    }
    window.scrollTo(0, 0);
}

// --- PRODUCT RENDERING ---
function createProductHTML(product) {
    const isInWishlist = wishlist.some(item => item.id === product.id);
    const requiresSize = ['boys-collection', 'girls-collection'].includes(product.category);
    
    const addToCartButton = requiresSize
        ? `<button class="btn btn-add-to-cart" onclick="openSizeModal(${product.id})">Select Size</button>`
        : `<button class="btn btn-add-to-cart" onclick="addToCart(${product.id})">Add to Cart</button>`;

    return `
        <div class="col-lg-3 col-md-4 col-sm-6">
            <div class="product-card">
                <i class="fas fa-heart wishlist-icon ${isInWishlist ? 'active' : ''}" data-product-id="${product.id}" onclick="toggleWishlist(${product.id}, event)"></i>
                <div class="product-image-container">
                    <img src="${product.image}" class="product-image" alt="${product.name}" onerror="this.onerror=null;this.src='https://placehold.co/400x300/ccc/fff?text=Image+Not+Found';">
                </div>
                <div class="card-body">
                    <h5 class="card-title">${product.name}</h5>
                    <p class="card-text">$${product.price.toFixed(2)}</p>
                    ${addToCartButton}
                </div>
            </div>
        </div>`;
}

function renderProductPage(containerId, pageTitle) {
    const container = document.getElementById(containerId);
    let productGrid = products.map(createProductHTML).join('');
    if (products.length === 0) {
        productGrid = '<p class="text-center col-12">No products found in this category.</p>';
    }

    container.innerHTML = `
        <div class="page-header"><div class="container"><h1>${pageTitle}</h1></div></div>
        <div class="container"><div class="row">${productGrid}</div></div>`;
}

function renderFeaturedProducts() {
    const featuredList = document.getElementById('featured-products');
    if (featuredList) {
        featuredList.innerHTML = products.map(createProductHTML).join('');
    }
}

async function rerenderCurrentPage() {
    const activePage = document.querySelector('.page[style*="block"], .page[style*="flex"]');
    if (activePage) {
        await showPage(activePage.id, currentSubcategory);
    }
}

// --- AUTHENTICATION ---
async function handleRegister(event) {
    event.preventDefault();
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await response.json();
        if (response.ok) {
            // Automatically log in the user after successful registration
            await handleLogin(event, email, password);
        } else {
            showMessage('Registration Failed', data.message || 'An error occurred.');
        }
    } catch (error) {
        console.error("Registration error:", error);
        showMessage('Error', 'Failed to connect to the server.');
    }
}

async function handleLogin(event, emailOverride = null, passwordOverride = null) {
    event.preventDefault();
    const email = emailOverride || document.getElementById('login-email').value;
    const password = passwordOverride || document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (response.ok) {
            currentUser = data.user;
            saveCurrentUserToSessionStorage();
            updateAuthUI();
            showMessage('Success!', `Welcome back, ${currentUser.name}!`);
            document.getElementById('login-form').reset();
            await fetchUserWishlist(currentUser.id);
            showPage('home');
        } else {
            showMessage('Login Failed', data.message || 'Invalid email or password.');
        }
    } catch (error) {
        console.error("Login error:", error);
        showMessage('Error', 'Failed to connect to the server.');
    }
}


function handleLogout() {
    currentUser = null;
    wishlist = [];
    sessionStorage.removeItem('tinyTwinklesCurrentUser');
    updateAuthUI();
    updateWishlistUI();
    rerenderCurrentPage();
    showPage('home');
}

function updateAuthUI() {
    const authNavLink = document.getElementById('auth-nav-link');
    if (currentUser) {
        authNavLink.innerHTML = `<a class="nav-link btn-login" href="#" onclick="handleLogout()"><i class="fas fa-user me-1"></i>Logout</a>`;
    } else {
        authNavLink.innerHTML = `<a class="nav-link btn-login" href="#auth" onclick="showPage('auth')"><i class="fas fa-user me-1"></i>Login</a>`;
    }
}

// --- CHECKOUT & ORDER ---
function handleCheckout() {
    if (cart.length === 0) {
        showMessage('Empty Cart', 'Please add items to your cart before checking out.');
        return;
    }
    if (currentUser) {
        showPage('checkout');
    } else {
        showMessage('Please Login', 'You must be logged in to proceed to checkout.');
        showPage('auth');
    }
}

function renderCheckoutPage() {
    document.getElementById('checkout-user-greeting').textContent = `Shipping details for ${currentUser.name}:`;
    document.getElementById('checkout-items').innerHTML = cart.map(item => `
        <div class="d-flex justify-content-between">
            <span>${item.name} ${item.size ? `(Size: ${item.size})` : ''} (x${item.quantity})</span>
            <span>$${(item.price * item.quantity).toFixed(2)}</span>
        </div>
    `).join('');
    document.getElementById('checkout-total').textContent = `$${cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}`;
}

async function placeOrder() {
    closeConfirmationModal();
    const processingModal = document.getElementById('order-processing-modal');
    processingModal.style.display = 'block';

    const orderDetails = {
        user_id: currentUser.id,
        items: cart,
        total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    };

    try {
        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderDetails)
        });
        const data = await response.json();
        processingModal.style.display = 'none';

        if (response.ok) {
            renderOrderConfirmationPage({ ...orderDetails, user: currentUser, orderNumber: data.order_number });
            showPage('order-confirmation');
            cart = [];
            saveCartToLocalStorage();
            updateCart();
        } 
        // else {
        //     showMessage('Order conformation process', data.message || 'successfully processeing.');
        // }
    } catch (error) {
        console.error("Order placement error:", error);
        processingModal.style.display = 'none';
        showMessage('Error', 'Failed to connect to the server to place order.');
    }
}

function renderOrderConfirmationPage(order) {
    document.getElementById('confirmation-greeting').textContent = `Thank you, ${order.user.name}!`;
    document.getElementById('confirmation-email').textContent = order.user.email;
    document.getElementById('confirmation-order-number').textContent = order.orderNumber;
    document.getElementById('confirmation-items').innerHTML = order.items.map(item => `
        <div class="d-flex justify-content-between">
            <span>${item.name} ${item.size ? `(Size: ${item.size})` : ''} (x${item.quantity})</span>
            <span>$${(item.price * item.quantity).toFixed(2)}</span>
        </div>
    `).join('');
    document.getElementById('confirmation-total').textContent = `$${order.total.toFixed(2)}`;
}


// --- WISHLIST LOGIC ---
async function toggleWishlist(productId, event) {
    event.stopPropagation();
    if (!currentUser) {
        showMessage('Login Required', 'Please log in to manage your wishlist.');
        showPage('auth');
        return;
    }

    const productInWishlist = wishlist.some(item => item.id === productId);

    try {
        let response;
        if (productInWishlist) {
            response = await fetch(`${API_BASE_URL}/wishlist/${currentUser.id}/${productId}`, { method: 'DELETE' });
        } else {
            response = await fetch(`${API_BASE_URL}/wishlist`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: currentUser.id, product_id: productId })
            });
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message);
        }

        // Re-fetch the entire wishlist from the server to ensure consistency
        await fetchUserWishlist(currentUser.id);
        // Re-render the current page to update all heart icons
        await rerenderCurrentPage();

    } catch (error) {
        console.error("Wishlist error:", error);
        showMessage('Error', `Failed to update wishlist: ${error.message}`);
    }
}

async function removeFromWishlist(productId) {
    if (!currentUser) return;
    try {
        const response = await fetch(`${API_BASE_URL}/wishlist/${currentUser.id}/${productId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to remove item.');
        
        await fetchUserWishlist(currentUser.id); // Re-fetch to update UI
        showMessage('Removed', 'Product removed from wishlist.');
    } catch (error) {
        console.error("Remove from wishlist error:", error);
        showMessage('Error', 'Failed to remove product from wishlist.');
    }
}

function updateWishlistUI() {
    const wishlistContainer = document.getElementById('wishlist-items-container');
    const wishlistCount = document.getElementById('wishlist-count');
    const emptyWishlistMsg = document.getElementById('empty-wishlist-message');
    
    if (!wishlistCount) return;

    wishlistCount.textContent = wishlist.length;

    if (wishlistContainer) {
        if (wishlist.length === 0) {
            wishlistContainer.innerHTML = '';
            if (emptyWishlistMsg) emptyWishlistMsg.style.display = 'block';
            return;
        }

        if (emptyWishlistMsg) emptyWishlistMsg.style.display = 'none';
        
        const tableRows = wishlist.map(item => {
            const requiresSize = ['boys-collection', 'girls-collection'].includes(item.category);
            const addToCartBtn = requiresSize 
                ? `<button class="btn btn-sm btn-classic" onclick="openSizeModal(${item.id})">Add to Cart</button>`
                : `<button class="btn btn-sm btn-classic" onclick="addToCart(${item.id})">Add to Cart</button>`;
            
            return `
                <tr class="wishlist-item">
                    <td><img src="${item.image}" alt="${item.name}" style="width:60px; border-radius:8px;"></td>
                    <td>${item.name}</td>
                    <td>$${item.price.toFixed(2)}</td>
                    <td class="text-end">
                        ${addToCartBtn}
                        <button class="btn btn-sm btn-danger ms-2" onclick="removeFromWishlist(${item.id})"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`;
        }).join('');

        wishlistContainer.innerHTML = `
            <table class="table align-middle">
                <thead><tr><th></th><th>Product</th><th>Price</th><th></th></tr></thead>
                <tbody>${tableRows}</tbody>
            </table>`;
    }
}

// --- CART LOGIC ---
function addToCart(productId, size = null) {
    // Find product from the global 'products' list first, if not found, check wishlist.
    let product = products.find(p => p.id === productId) || wishlist.find(w => w.id === productId);

    if (!product) {
        console.error("Product not found:", productId);
        showMessage('Error', 'Could not find product details.');
        return;
    }

    const cartItem = cart.find(item => item.id === productId && item.size === size);

    if (cartItem) {
        cartItem.quantity++;
    } else {
        cart.push({ ...product, quantity: 1, size: size });
    }
    saveCartToLocalStorage();
    updateCart();
    showMessage('Added to Cart', `${product.name} ${size ? `(Size: ${size})` : ''} has been added.`);
}

function updateCart() {
    const cartContainer = document.getElementById('cart-items-container');
    const cartCount = document.getElementById('cart-count');
    const cartTotalEl = document.getElementById('cart-total');
    const emptyCartMsg = document.getElementById('empty-cart-message');
    const cartSummary = document.getElementById('cart-summary');
    
    if (!cartCount) return;

    cartCount.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    if (cartContainer) {
        if (cart.length === 0) {
            cartContainer.innerHTML = '';
            if (emptyCartMsg) emptyCartMsg.style.display = 'block';
            if (cartSummary) cartSummary.style.display = 'none';
            return;
        }
        if (emptyCartMsg) emptyCartMsg.style.display = 'none';
        if (cartSummary) cartSummary.style.display = 'block';

        cartContainer.innerHTML = `
            <table class="table align-middle">
                <thead><tr><th></th><th>Product</th><th>Price</th><th>Quantity</th><th>Total</th><th></th></tr></thead>
                <tbody>
                    ${cart.map(item => `
                        <tr class="cart-item">
                            <td><img src="${item.image}" alt="${item.name}" style="width:80px; height:80px; object-fit:cover; border-radius:8px;"></td>
                            <td>${item.name} ${item.size ? `<br><small>Size: ${item.size}</small>` : ''}</td>
                            <td>$${item.price.toFixed(2)}</td>
                            <td>
                                <div class="d-flex align-items-center">
                                    <button class="btn btn-sm btn-secondary" onclick="changeQuantity(${item.id}, '${item.size || 'none'}', -1)">-</button>
                                    <span class="mx-2">${item.quantity}</span>
                                    <button class="btn btn-sm btn-secondary" onclick="changeQuantity(${item.id}, '${item.size || 'none'}', 1)">+</button>
                                </div>
                            </td>
                            <td>$${(item.price * item.quantity).toFixed(2)}</td>
                            <td><button class="btn btn-sm btn-danger" onclick="removeFromCart(${item.id}, '${item.size || 'none'}')"><i class="fas fa-trash"></i></button></td>
                        </tr>`).join('')}
                </tbody>
            </table>`;
        const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        cartTotalEl.textContent = `$${total.toFixed(2)}`;
    }
}

function changeQuantity(productId, size, amount) {
    const itemSize = size === 'none' ? null : size;
    const cartItem = cart.find(item => item.id === productId && item.size === itemSize);

    if (cartItem) {
        cartItem.quantity += amount;
        if (cartItem.quantity <= 0) {
            removeFromCart(productId, size);
        } else {
            saveCartToLocalStorage();
            updateCart();
        }
    }
}

function removeFromCart(productId, size) {
    const itemSize = size === 'none' ? null : size;
    cart = cart.filter(item => !(item.id === productId && item.size === itemSize));
    saveCartToLocalStorage();
    updateCart();
}

// --- MODAL DIALOGS ---
function showMessage(title, message) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    document.getElementById('message-modal').style.display = 'block';
}

function closeModal() {
    document.getElementById('message-modal').style.display = 'none';
}

function showConfirmationModal() {
    if (cart.length === 0) {
        showMessage('Empty Cart', 'Your cart is empty.');
        return;
    }
    document.getElementById('order-confirm-modal').style.display = 'block';
}

function closeConfirmationModal() {
    document.getElementById('order-confirm-modal').style.display = 'none';
}

// --- SIZE MODAL LOGIC ---
let currentProductIdForModal = null;

function openSizeModal(productId) {
    const product = products.find(p => p.id === productId) || wishlist.find(w => w.id === productId);
    if (!product) return;

    currentProductIdForModal = productId;
    
    document.getElementById('modal-product-image').src = product.image;
    document.getElementById('modal-product-name').textContent = product.name;
    document.getElementById('modal-product-price').textContent = `$${product.price.toFixed(2)}`;
    
    document.querySelectorAll('input[name="size"]').forEach(radio => radio.checked = false);
    document.getElementById('size-modal').style.display = 'flex';
}

function closeSizeModal() {
    document.getElementById('size-modal').style.display = 'none';
    currentProductIdForModal = null;
}

function addToCartWithSize() {
    const selectedSizeInput = document.querySelector('input[name="size"]:checked');
    if (!selectedSizeInput) {
        // Simple alert for modal-on-modal complexity
        alert('Please select a size.');
        return;
    }
    const size = selectedSizeInput.value;
    addToCart(currentProductIdForModal, size);
    closeSizeModal();
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    loadCartFromLocalStorage();
    loadCurrentUserFromSessionStorage();

    updateCart();
    updateAuthUI();

    if (currentUser && currentUser.id) {
        await fetchUserWishlist(currentUser.id);
    }

    const container = document.getElementById('auth-page-container');
    const registerBtn = document.getElementById('register-toggle');
    const loginBtn = document.getElementById('login-toggle');

    if (container) {
        registerBtn.addEventListener('click', () => container.classList.add("active"));
        loginBtn.addEventListener('click', () => container.classList.remove("active"));
    }

    // Dropdown logic
    document.querySelectorAll('.dropdown-submenu > a').forEach(element => {
        element.addEventListener('click', function(e) {
            let nextEl = this.nextElementSibling;
            if (nextEl && nextEl.classList.contains('dropdown-menu')) {
                e.preventDefault();
                e.stopPropagation();
                let parentMenu = this.closest('.dropdown-menu');
                parentMenu.querySelectorAll('.dropdown-submenu .dropdown-menu').forEach(menu => {
                    if (menu !== nextEl) menu.style.display = 'none';
                });
                nextEl.style.display = nextEl.style.display === 'block' ? 'none' : 'block';
            }
        });
    });

    document.addEventListener('click', e => {
        if (!e.target.closest('.dropdown-menu')) {
            document.querySelectorAll('.dropdown-submenu .dropdown-menu').forEach(menu => menu.style.display = 'none');
        }
    });

    showPage('home');
});
