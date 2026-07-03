// --- FIREBASE LIVE ENVIRONMENT CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyAA60xkGygpG9no7Qbq3xsxpCO5hupDHPE",
  authDomain: "my-earings-85407.firebaseapp.com",
  databaseURL: "https://my-earings-85407-default-rtdb.firebaseio.com",
  projectId: "my-earings-85407",
  storageBucket: "my-earings-85407.firebasestorage.app",
  messagingSenderId: "637254172278",
  appId: "1:637254172278:web:33e9741e7017564a5f2957"
};
// --------------------------------------------

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let products = [];
let shoppingCart = {}; 
let isAdmin = false;
let selectedCategoryFilter = "In Stock"; 
const WHATSAPP_NUMBER = "918778096977";

// Run URL Query state checks
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('manage') === 'true') {
    isAdmin = true;
    selectedCategoryFilter = "All";
    document.getElementById('add-prod-btn').style.display = "inline-flex";
    document.getElementById('store-title').innerText = "Jeevan Jewellery Admin";
    document.getElementById('chip-All').classList.add('active');
} else {
    document.getElementById('chip-InStock').classList.add('active');
}

// Stream data down live
database.ref('products').on('value', (snapshot) => {
    document.getElementById('loading-indicator').style.display = 'none';
    const data = snapshot.val();
    products = [];
    if (data) {
        Object.keys(data).forEach(key => {
            products.push({ dbKey: key, ...data[key] });
        });
    }
    filterStore();
}, (error) => {
    alert("Database Connection Issue detected.");
});

// Advanced multi-value search query filter engine
function filterStore() {
    const searchQuery = document.getElementById('search-box').value.toLowerCase().trim();
    const container = document.getElementById('products-container');
    container.innerHTML = '';

    const filtered = products.filter(p => {
        const matchesName = p.name.toLowerCase().includes(searchQuery);
        const matchesCode = p.code.toLowerCase().includes(searchQuery);
        const matchesPrice = p.price && p.price.toLowerCase().includes(searchQuery);
        const matchesMRP = p.mrp && p.mrp.toLowerCase().includes(searchQuery);
        
        const matchesSearch = matchesName || matchesCode || matchesPrice || matchesMRP;
        const matchesCategory = (selectedCategoryFilter === "All") || (p.status === selectedCategoryFilter);
        return matchesSearch && matchesCategory;
    });

    if (filtered.length === 0) {
        container.innerHTML = '<div class="loading" style="grid-column: span 2;">No products match.</div>';
        return;
    }

    filtered.forEach(product => {
        let overlayHTML = '';
        let displayPriceHTML = `<div class="product-price">${product.price}</div>`;
        let buttonHTML = '';
        
        // Calculate dynamic math discounts instantly
        let discountBadgeHTML = '';
        if (product.mrp && product.price && product.status !== "Coming Soon") {
            let numMRP = parseInt(product.mrp.replace(/[^0-9]/g, '')) || 0;
            let numPrice = parseInt(product.price.replace(/[^0-9]/g, '')) || 0;
            if (numMRP > numPrice) {
                let pct = Math.round(((numMRP - numPrice) / numMRP) * 100);
                if (pct > 0) discountBadgeHTML = `<div class="discount-badge">${pct}% OFF</div>`;
                displayPriceHTML = `
                    <div class="product-price">${product.price}</div>
                    <div class="product-mrp-crossed">${product.mrp}</div>
                `;
            }
        }

        // Render stock counts safely
        let stockCountHTML = '';
        if (product.stock && parseInt(product.stock) > 0 && product.status === "In Stock") {
            stockCountHTML = `<div class="stock-count-label">Stock: ${product.stock}</div>`;
        }

        // Cart Actions mapping to inline minus-counter-plus selectors
        const currentQty = shoppingCart[product.dbKey] || 0;
        if (currentQty > 0) {
            buttonHTML = `
                <div class="inline-qty-selector">
                    <button class="btn-qty" onclick="event.stopPropagation(); changeQty('${product.dbKey}', -1)">-</button>
                    <span>${currentQty}</span>
                    <button class="btn-qty" onclick="event.stopPropagation(); changeQty('${product.dbKey}', 1)">+</button>
                </div>
            `;
        } else {
            buttonHTML = `<button class="btn btn-primary" onclick="event.stopPropagation(); addToCart('${product.dbKey}')">Add to Cart</button>`;
        }
        
        if (product.status === "Sold") {
            overlayHTML = `<div class="status-overlay" style="background-color: rgba(220,38,38,0.5)">Sold</div>`;
            buttonHTML = `<button class="btn btn-secondary" disabled>Sold Out</button>`;
        } else if (product.status === "Out of Stock") {
            overlayHTML = `<div class="status-overlay" style="background-color: rgba(234,88,12,0.5)">Out of Stock</div>`;
            buttonHTML = `<button class="btn btn-secondary" disabled>No Stock</button>`;
        } else if (product.status === "Coming Soon") {
            overlayHTML = `<div class="status-overlay" style="background-color: rgba(30,41,59,0.6)">Coming Soon</div>`;
            displayPriceHTML = `<div class="product-price">****</div>`;
            buttonHTML = `<button class="btn btn-secondary" disabled>Coming Soon</button>`;
        }

        let adminButtons = '';
        if (isAdmin) {
            adminButtons = `
                <div class="admin-actions">
                    <button class="btn btn-secondary" onclick="event.stopPropagation(); editProduct('${product.dbKey}')">Edit</button>
                    <button class="btn btn-danger" onclick="event.stopPropagation(); deleteProduct('${product.dbKey}')">Delete</button>
                </div>
            `;
        }

        // Extract the first image link for the grid card view portrait
        const imagesArray = product.img ? product.img.split(',') : [''];
        const firstImg = imagesArray[0].trim();

        container.innerHTML += `
            <div class="product-card" onclick="openDetailsModal('${product.dbKey}')">
                <div class="img-container">
                    <img src="${firstImg}" class="product-img" alt="${product.name}">
                    ${discountBadgeHTML}
                    ${stockCountHTML}
                    ${overlayHTML}
                </div>
                <div class="product-info">
                    <div>
                        <div class="product-code">${product.code}</div>
                        <h3 class="product-title">${product.name}</h3>
                        <div class="price-layout-container">${displayPriceHTML}</div>
                    </div>
                    <div>
                        <div class="card-actions">${buttonHTML}</div>
                        ${adminButtons}
                    </div>
                </div>
            </div>
        `;
    });
}

function selectCategory(category, element) {
    selectedCategoryFilter = category;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    element.classList.add('active');
    filterStore();
}

// Shopping cart calculations
function addToCart(dbKey) {
    const distinctItemsCount = Object.keys(shoppingCart).length;
    if (!shoppingCart[dbKey] && distinctItemsCount >= 20) {
        alert("Cart Limit Reached: You can only add up to 20 different items.");
        return;
    }
    shoppingCart[dbKey] = 1;
    updateCartUI();
    filterStore(); // Refresh grid layout updates instantly
    if(document.getElementById('detailsModal').style.display === "flex") {
        renderDetailsActionContainer(dbKey);
    }
}

function changeQty(dbKey, delta) {
    if (!shoppingCart[dbKey]) return;
    const targetQty = shoppingCart[dbKey] + delta;
    if (targetQty <= 0) {
        delete shoppingCart[dbKey];
    } else if (targetQty > 10) {
        alert("Maximum limit is 10 items.");
        return;
    } else {
        shoppingCart[dbKey] = targetQty;
    }
    updateCartUI();
    renderCartDrawer();
    filterStore(); // Keep screen counters flawlessly synced
    if(document.getElementById('detailsModal').style.display === "flex") {
        renderDetailsActionContainer(dbKey);
    }
}

function updateCartUI() {
    const bar = document.getElementById('cart-sticky-bar');
    const uniqueKeys = Object.keys(shoppingCart);
    if (uniqueKeys.length === 0) {
        bar.style.display = "none";
        return;
    }
    bar.style.display = "flex";

    let totalItems = 0;
    let totalPrice = 0;

    uniqueKeys.forEach(key => {
        const prod = products.find(p => p.dbKey === key);
        if (prod) {
            const qty = shoppingCart[key];
            totalItems += qty;
            let numericPrice = parseInt(prod.price.replace(/[^0-9]/g, '')) || 0;
            totalPrice += (numericPrice * qty);
        }
    });

    document.getElementById('cart-count').innerText = totalItems;
    document.getElementById('cart-total-price').innerText = "₹" + totalPrice;
    document.getElementById('drawer-total-price').innerText = "₹" + totalPrice;
}

function openCartDrawer() {
    renderCartDrawer();
    document.getElementById('cartDrawer').style.display = "flex";
}

function closeCartDrawer(e) {
    if (!e || e.target === document.getElementById('cartDrawer')) {
        document.getElementById('cartDrawer').style.none;
        document.getElementById('cartDrawer').style.display = "none";
    }
}

function renderCartDrawer() {
    const container = document.getElementById('cart-items-container');
    container.innerHTML = '';
    const uniqueKeys = Object.keys(shoppingCart);
    
    if (uniqueKeys.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:2rem; color:#64748b;">Your bag is empty!</div>';
        document.getElementById('cartDrawer').style.display = "none";
        return;
    }

    uniqueKeys.forEach(key => {
        const item = products.find(p => p.dbKey === key);
        if (item) {
            const qty = shoppingCart[key];
            container.innerHTML += `
                <div class="cart-item">
                    <div class="cart-item-details">
                        <span class="cart-item-name">${item.name}</span>
                        <span class="cart-item-code">Code: ${item.code}</span>
                    </div>
                    <div class="qty-controls">
                        <button class="btn-qty" onclick="changeQty('${key}', -1)">-</button>
                        <span style="font-weight:bold; min-width:20px; text-align:center;">${qty}</span>
                        <button class="btn-qty" onclick="changeQty('${key}', 1)">+</button>
                    </div>
                    <span style="font-weight:bold; min-width:60px; text-align:right;">${item.price}</span>
                </div>
            `;
        }
    });
}

// Product description details modal presentation channel
function openDetailsModal(dbKey) {
    const prod = products.find(p => p.dbKey === dbKey);
    if (!prod) return;

    document.getElementById('details-code').innerText = prod.code;
    document.getElementById('details-title').innerText = prod.name;
    document.getElementById('details-desc').innerText = prod.description ? prod.description : "No additional description details available for this model layout.";
    
    // Status badges handler
    let statusBadgeText = `<span style="color:var(--success); font-weight:bold;">● Available in Store</span>`;
    let priceHTML = `<span style="font-size:1.4rem; font-weight:bold; color:var(--dark);">${prod.price}</span>`;
    
    if (prod.mrp && prod.status !== "Coming Soon") {
        priceHTML += ` <span style="text-decoration:line-through; color:#94a3b8; font-size:1rem; margin-left:0.5rem;">${prod.mrp}</span>`;
    }

    if (prod.status === "Sold") {
        statusBadgeText = `<span style="color:#dc2626; font-weight:bold;">● Sold Out</span>`;
    } else if (prod.status === "Out of Stock") {
        statusBadgeText = `<span style="color:#ea580c; font-weight:bold;">● Temporarily Out of Stock</span>`;
    } else if (prod.status === "Coming Soon") {
        statusBadgeText = `<span style="color:#64748b; font-weight:bold;">● Coming Soon Collection</span>`;
        priceHTML = `<span style="font-size:1.4rem; font-weight:bold; color:#64748b;">****</span>`;
    }

    let stockText = prod.stock ? ` (Stock left: ${prod.stock})` : '';
    document.getElementById('details-stock-status').innerHTML = statusBadgeText + stockText;
    document.getElementById('details-price-block').innerHTML = priceHTML;

    // Load multi-image carousel components
    const imagesArray = prod.img ? prod.img.split(',') : [''];
    const mainImgElem = document.getElementById('details-main-img');
    mainImgElem.src = imagesArray[0].trim();

    const thumbsContainer = document.getElementById('details-thumbs');
    thumbsContainer.innerHTML = '';

    if (imagesArray.length > 1) {
        imagesArray.forEach((imgUrl, index) => {
            const cleanUrl = imgUrl.trim();
            const activeClass = index === 0 ? 'active' : '';
            thumbsContainer.innerHTML += `
                <img src="${cleanUrl}" class="thumb-img ${activeClass}" onclick="switchDetailsMainImage('${cleanUrl}', this)">
            `;
        });
    }

    renderDetailsActionContainer(dbKey);
    document.getElementById('detailsModal').style.display = "flex";
}

function switchDetailsMainImage(url, element) {
    document.getElementById('details-main-img').src = url;
    document.querySelectorAll('.thumb-img').forEach(t => t.classList.remove('active'));
    element.classList.add('active');
}

function renderDetailsActionContainer(dbKey) {
    const prod = products.find(p => p.dbKey === dbKey);
    const container = document.getElementById('details-action-container');
    container.innerHTML = '';

    if (prod.status !== "In Stock") {
        container.innerHTML = `<button class="btn btn-secondary" style="width:100%; padding:0.8rem;" disabled>Item Unavailable</button>`;
        return;
    }

    const currentQty = shoppingCart[dbKey] || 0;
    if (currentQty > 0) {
        container.innerHTML = `
            <div class="inline-qty-selector" style="padding: 0.4rem 1rem;">
                <button class="btn-qty" style="padding:0.4rem 0.8rem; font-size:1.1rem;" onclick="changeQty('${dbKey}', -1)">-</button>
                <span style="font-size:1.1rem;">${currentQty} Added in Bag</span>
                <button class="btn-qty" style="padding:0.4rem 0.8rem; font-size:1.1rem;" onclick="changeQty('${dbKey}', 1)">+</button>
            </div>
        `;
    } else {
        container.innerHTML = `<button class="btn btn-primary" style="width:100%; padding:0.8rem; font-size:1rem;" onclick="addToCart('${dbKey}')">Add to Shopping Bag</button>`;
    }
}

function closeDetailsModal(e) {
    if (!e || e.target === document.getElementById('detailsModal')) {
        document.getElementById('detailsModal').style.display = "none";
    }
}

function checkoutToWhatsApp() {
    let messageText = "Hi, I want to order from *Jeevan fansy jewellery Stall*:\n\n";
    Object.keys(shoppingCart).forEach((key, idx) => {
        const item = products.find(p => p.dbKey === key);
        if (item) {
            messageText += `${idx + 1}. [${item.code}] ${item.name}\n   Qty: ${shoppingCart[key]} x ${item.price}\n`;
        }
    });
    messageText += `\n*Grand Total: ${document.getElementById('drawer-total-price').innerText}*`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(messageText)}`, '_blank');
}

// Automatic Currency Formatting Profile Engine (Enforces Rupee Symbol Prefix)
function formatCurrencyInput(element) {
    let val = element.value.replace(/[^0-9]/g, '');
    if (val) {
        element.value = "₹" + val;
    } else {
        element.value = "";
    }
}

// Live form URL preview thumbnail builder
function updateLivePreview(value) {
    const wrapper = document.getElementById('admin-preview-wrapper');
    wrapper.innerHTML = '';
    if (!value || value === "Local Image Loaded") return;

    const links = value.split(',');
    links.forEach(link => {
        const cleanLink = link.trim();
        if (cleanLink) {
            wrapper.innerHTML += `<img src="${cleanLink}" style="width:60px; height:60px; object-fit:cover; border-radius:6px; border:1px solid #cbd5e1;">`;
        }
    });
}

function openAdminPopup() { clearForm(); document.getElementById('adminModal').style.display = "flex"; }
function closeAdminPopup() { document.getElementById('adminModal').style.display = "none"; clearForm(); }

let uploadedImageBase64 = "";
function handleImageUpload(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onloadend = function() {
        uploadedImageBase64 = reader.result;
        document.getElementById('prod-img').value = "Local Image Loaded";
        const wrapper = document.getElementById('admin-preview-wrapper');
        wrapper.innerHTML = `<img src="${uploadedImageBase64}" style="width:60px; height:60px; object-fit:cover; border-radius:6px; border:1px solid #cbd5e1;">`;
    }
    if (file) reader.readAsDataURL(file);
}

function saveProduct(e) {
    e.preventDefault();
    const dbKey = document.getElementById('product-id').value;
    const name = document.getElementById('prod-name').value;
    const price = document.getElementById('prod-price').value;
    const mrp = document.getElementById('prod-mrp').value;
    const stock = document.getElementById('prod-stock').value || "1";
    const description = document.getElementById('prod-desc').value || "";
    let code = document.getElementById('prod-code').value.trim();
    let img = document.getElementById('prod-img').value;
    const status = document.getElementById('prod-status').value;

    if (img === "Local Image Loaded") img = uploadedImageBase64;
    if (!code) code = "PRD-" + Math.floor(1000 + Math.random() * 9000);

    const userPass = prompt("Enter Admin Password to save changes:");
    if (!userPass) {
        alert("Action cancelled. Password is required.");
        return;
    }

    // Fully backwards compatible database schema wrapper object payload layout mapping channels
    const productPayload = { code, name, price, mrp, stock, description, img, status, updatedTime: Date.now() };

    const successCallback = () => {
        document.getElementById('adminModal').style.display = "none";
        clearForm();
        alert("Product saved successfully!");
    };

    database.ref('admin_pass').once('value').then((snapshot) => {
        if (snapshot.val() === userPass) {
            if (dbKey) {
                database.ref('products/' + dbKey).set(productPayload).then(successCallback);
            } else {
                database.ref('products').push(productPayload).then(successCallback);
            }
        } else {
            alert("Incorrect password! Access Denied.");
        }
    }).catch((err) => {
        alert("Error connecting to validation node: " + err.message);
    });
}

function editProduct(dbKey) {
    const prod = products.find(p => p.dbKey === dbKey);
    if (!prod) return;
    
    document.getElementById('product-id').value = prod.dbKey;
    document.getElementById('prod-code').value = prod.code;
    document.getElementById('prod-name').value = prod.name;
    document.getElementById('prod-price').value = prod.price || "";
    document.getElementById('prod-mrp').value = prod.mrp || "";
    document.getElementById('prod-stock').value = prod.stock || "1";
    document.getElementById('prod-desc').value = prod.description || "";
    document.getElementById('prod-img').value = prod.img;
    document.getElementById('prod-status').value = prod.status;
    
    updateLivePreview(prod.img)
    document.getElementById('form-title').innerText = "Edit " + prod.code;
    document.getElementById('adminModal').style.display = "flex";
}

function deleteProduct(dbKey) {
    if (confirm("Permanently delete this item?")) {
        const userPass = prompt("Enter Admin Password to confirm deletion:");
        if (!userPass) return;

        database.ref('admin_pass').once('value').then((snapshot) => {
            if (snapshot.val() === userPass) {
                database.ref('products/' + dbKey).remove().then(() => {
                    alert("Product deleted successfully!");
                });
            } else {
                alert("Incorrect password! Access Denied.");
            }
        });
    }
}

function clearForm() {
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = "";
    document.getElementById('form-title').innerText = "Add Product";
    document.getElementById('admin-preview-wrapper').innerHTML = '';
    uploadedImageBase64 = "";
}

