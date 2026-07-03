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

let uploadedImagesArray = [];
let displayLimit = 4; // Render chunk boundaries to speed up visual paint

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

// Fetch database configurations efficiently
database.ref('products').on('value', (snapshot) => {
    document.getElementById('loading-indicator').style.display = 'none';
    const data = snapshot.val();
    products = [];
    if (data) {
        Object.keys(data).forEach(key => {
            products.push({ dbKey: key, ...data[key] });
        });
    }
    displayLimit = 4;
    filterStore();
}, (error) => {
    console.error(error);
});

// Clean up and safely split images without c*****g base64 tags
function sanitizeImageString(imgStr) {
    const fallbackPlaceholder = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%23cbd5e1' stroke-width='2'><rect x='3' y='3' width='18' height='18' rx='2'/><circle cx='8.5' cy='8.5' r='1.5'/><path d='M21 15l-5-5L5 21'/></svg>";
    if (!imgStr || imgStr === "Local Image Loaded" || String(imgStr).trim() === "") {
        return [fallbackPlaceholder];
    }
    
    // Support both old commas and our safe new pipe character '|'
    let rawArray = [];
    if (String(imgStr).includes('|')) {
        rawArray = String(imgStr).split('|');
    } else {
        // If old data format has multiple data URLs separated by comma
        if (String(imgStr).includes('data:image')) {
            rawArray = String(imgStr).split(/,(?=data:image)/);
        } else {
            rawArray = String(imgStr).split(',');
        }
    }

    // Clean data fragments, drop broken text links, discard blank items
    let cleanArray = rawArray.map(item => {
        let clean = item.trim();
        if (!clean) return null;
        
        // If raw base64 data strings are missing headers, add them back
        if (clean.startsWith('/9j/') || clean.startsWith('iVBORw0KGg')) {
            return 'data:image/jpeg;base64,' + clean;
        }
        return clean;
    }).filter(item => item !== null && item.length > 15); // Drop short corrupt strings

    return cleanArray.length > 0 ? cleanArray : [fallbackPlaceholder];
}

function filterStore() {
    const searchQuery = document.getElementById('search-box').value.toLowerCase().trim();
    const container = document.getElementById('products-container');
    container.innerHTML = '';

    const filtered = products.filter(p => {
        if (selectedCategoryFilter !== "All" && p.status !== selectedCategoryFilter) return false;
        
        const matchesName = p.name ? p.name.toLowerCase().includes(searchQuery) : false;
        const matchesCode = p.code ? p.code.toLowerCase().includes(searchQuery) : false;
        return searchQuery === "" || matchesName || matchesCode;
    });

    if (filtered.length === 0) {
        container.innerHTML = '<div class="loading" style="grid-column: span 2;">No products found.</div>';
        return;
    }

    const itemsToRender = filtered.slice(0, displayLimit);

    itemsToRender.forEach(product => {
        let overlayHTML = '';
        let displayPriceHTML = `<div class="product-price">₹${parseFloat(String(product.price || '0').replace(/[^0-9.]/g, '')) || 0}</div>`;
        let buttonHTML = '';
        let discountBadgeHTML = '';

        if (product.mrp && product.price && product.status !== "Coming Soon") {
            let numMRP = parseFloat(String(product.mrp).replace(/[^0-9.]/g, '')) || 0;
            let numPrice = parseFloat(String(product.price).replace(/[^0-9.]/g, '')) || 0;
            if (numMRP > numPrice) {
                let pct = Math.round(((numMRP - numPrice) / numMRP) * 100);
                if (pct > 0) discountBadgeHTML = `<div class="discount-badge">${pct}% OFF</div>`;
                displayPriceHTML = `<div class="product-price">₹${numPrice}</div><div class="product-mrp-crossed">₹${numMRP}</div>`;
            }
        }

        let stockCountHTML = (product.stock && parseInt(product.stock) > 0 && product.status === "In Stock") 
            ? `<div class="stock-count-label">Stock: ${product.stock}</div>` : '';

        const currentQty = shoppingCart[product.dbKey] || 0;
        if (currentQty > 0) {
            buttonHTML = `
                <div class="inline-qty-selector">
                    <button class="btn-qty" onclick="event.stopPropagation(); changeQty('${product.dbKey}', -1)">-</button>
                    <span>${currentQty}</span>
                    <button class="btn-qty" onclick="event.stopPropagation(); changeQty('${product.dbKey}', 1)">+</button>
                </div>`;
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

        let adminButtons = isAdmin ? `
            <div class="admin-actions">
                <button class="btn btn-secondary" onclick="event.stopPropagation(); editProduct('${product.dbKey}')">Edit</button>
                <button class="btn btn-danger" onclick="event.stopPropagation(); deleteProduct('${product.dbKey}')">Delete</button>
            </div>` : '';

        const sanitizedImages = sanitizeImageString(product.img);
        const firstImg = sanitizedImages[0];

        container.innerHTML += `
            <div class="product-card" onclick="openDetailsModal('${product.dbKey}')">
                <div class="img-container">
                    <img src="${firstImg}" class="product-img" loading="lazy" alt="Product Image" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'100\\' height=\\'100\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'%23cbd5e1\\' stroke-width=\\'2\\'><rect x=\\'3\\' y=\\'3\\' width=\\'18\\' height=\\'18\\' rx=\\'2\\'/><circle cx=\\'8.5\\' cy=\\'8.5\\' r=\\'1.5\\'/><path d=\\'M21 15l-5-5L5 21\\'/></svg>'">
                    ${discountBadgeHTML}
                    ${stockCountHTML}
                    ${overlayHTML}
                </div>
                <div class="product-info">
                    <div>
                        <div class="product-code">${product.code || ''}</div>
                        <h3 class="product-title">${product.name || ''}</h3>
                        <div class="price-layout-container">${displayPriceHTML}</div>
                    </div>
                    <div>
                        <div class="card-actions">${buttonHTML}</div>
                        ${adminButtons}
                    </div>
                </div>
            </div>`;
    });

    if (filtered.length > displayLimit) {
        container.innerHTML += `
            <div style="grid-column: span 2; text-align: center; padding: 1rem;">
                <button class="btn btn-secondary" style="width:100%; max-width: 300px;" onclick="event.stopPropagation(); loadMoreProducts()">Load More Products...</button>
            </div>`;
    }
}

function loadMoreProducts() {
    displayLimit += 4;
    filterStore();
}

function selectCategory(category, element) {
    selectedCategoryFilter = category;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    element.classList.add('active');
    displayLimit = 4;
    filterStore();
}

function addToCart(dbKey) {
    if (!shoppingCart[dbKey] && Object.keys(shoppingCart).length >= 20) {
        alert("Cart Limit Reached");
        return;
    }
    shoppingCart[dbKey] = 1;
    updateCartUI();
    filterStore();
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
    filterStore();
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
            let numericPrice = parseFloat(String(prod.price || '0').replace(/[^0-9.]/g, '')) || 0;
            totalPrice += (numericPrice * qty);
        }
    });

    document.getElementById('cart-count').innerText = totalItems;
    document.getElementById('cart-total-price').innerText = "₹" + totalPrice;
}

function openDetailsModal(dbKey) {
    const prod = products.find(p => p.dbKey === dbKey);
    if (!prod) return;

    document.getElementById('details-code').innerText = prod.code || '';
    document.getElementById('details-title').innerText = prod.name || '';
    document.getElementById('details-desc').innerText = prod.description || "No description provided.";
    
    let cleanPrice = parseFloat(String(prod.price || '0').replace(/[^0-9.]/g, '')) || 0;
    document.getElementById('details-price-block').innerHTML = `<span style="font-size:1.4rem; font-weight:bold;">₹${cleanPrice}</span>`;

    const sanitizedImages = sanitizeImageString(prod.img);
    document.getElementById('details-main-img').src = sanitizedImages[0];

    const thumbsContainer = document.getElementById('details-thumbs');
    thumbsContainer.innerHTML = '';

    if (sanitizedImages.length > 1) {
        sanitizedImages.forEach((imgUrl, index) => {
            thumbsContainer.innerHTML += `
                <img src="${imgUrl}" class="thumb-img ${index === 0 ? 'active' : ''}" onclick="document.getElementById('details-main-img').src='${imgUrl}'" onerror="this.style.display='none'">
            `;
        });
    }

    document.getElementById('detailsModal').style.display = "flex";
}

function closeDetailsModal() {
    document.getElementById('detailsModal').style.display = "none";
}

function handleImageUpload(event) {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                const MAX_WIDTH = 500;
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH) {
                    height = Math.round((height * MAX_WIDTH) / width);
                    width = MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
                uploadedImagesArray.push(compressedBase64);
                renderAdminPreviews();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
    event.target.value = ""; 
}

function removePreviewImage(index) {
    uploadedImagesArray.splice(index, 1);
    renderAdminPreviews();
}

function renderAdminPreviews() {
    const wrapper = document.getElementById('admin-preview-wrapper');
    wrapper.innerHTML = '';
    
    // Discard any empty or corrupt items before rendering previews
    uploadedImagesArray = uploadedImagesArray.filter(img => img && img.trim().length > 15);

    uploadedImagesArray.forEach((base64Data, index) => {
        wrapper.innerHTML += `
            <div class="thumb-preview-container">
                <img src="${base64Data}" onerror="this.parentElement.style.display='none'">
                <span class="remove-thumb-btn" onclick="removePreviewImage(${index})">✕</span>
            </div>`;
    });
}

function openAdminPopup() { clearForm(); document.getElementById('adminModal').style.display = "flex"; }
function closeAdminPopup() { document.getElementById('adminModal').style.display = "none"; }

function saveProduct(e) {
    e.preventDefault();
    const dbKey = document.getElementById('product-id').value;
    const name = document.getElementById('prod-name').value;
    const price = document.getElementById('prod-price').value;
    const mrp = document.getElementById('prod-mrp').value;
    const stock = document.getElementById('prod-stock').value || "1";
    const description = document.getElementById('prod-desc').value || "";
    let code = document.getElementById('prod-code').value.trim();
    const status = document.getElementById('prod-status').value;

    // Filter out blank slots before storing strings
    uploadedImagesArray = uploadedImagesArray.filter(img => img && img.trim().length > 15);

    if (uploadedImagesArray.length === 0) {
        alert("Please add at least one image.");
        return;
    }

    if (!code) code = "PRD-" + Math.floor(1000 + Math.random() * 9000);
    const userPass = prompt("Enter Password:");
    if (!userPass) return;

    // Use pipe '|' instead of comma to ensure clean database array storage splits
    const imgPayloadString = uploadedImagesArray.join('|');
    const productPayload = { code, name, price, mrp, stock, description, img: imgPayloadString, status, updatedTime: Date.now() };

    database.ref('admin_pass').once('value').then((snapshot) => {
        if (snapshot.val() === userPass) {
            const refPath = dbKey ? 'products/' + dbKey : 'products';
            const operation = dbKey ? database.ref(refPath).set(productPayload) : database.ref(refPath).push(productPayload);
            
            operation.then(() => {
                closeAdminPopup();
                alert("Saved successfully!");
            });
        } else {
            alert("Wrong password!");
        }
    });
}

function editProduct(dbKey) {
    const prod = products.find(p => p.dbKey === dbKey);
    if (!prod) return;
    
    document.getElementById('product-id').value = prod.dbKey;
    document.getElementById('prod-code').value = prod.code || '';
    document.getElementById('prod-name').value = prod.name || '';
    document.getElementById('prod-price').value = prod.price || '';
    document.getElementById('prod-mrp').value = prod.mrp || '';
    document.getElementById('prod-stock').value = prod.stock || "1";
    document.getElementById('prod-desc').value = prod.description || '';
    document.getElementById('prod-status').value = prod.status;
    
    uploadedImagesArray = sanitizeImageString(prod.img);
    renderAdminPreviews();
    
    document.getElementById('form-title').innerText = "Edit Product";
    document.getElementById('adminModal').style.display = "flex";
}

function deleteProduct(dbKey) {
    if (confirm("Delete permanently?")) {
        const userPass = prompt("Enter Password:");
        database.ref('admin_pass').once('value').then((snapshot) => {
            if (snapshot.val() === userPass) {
                database.ref('products/' + dbKey).remove();
            } else {
                alert("Wrong password!");
            }
        });
    }
}

function clearForm() {
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = "";
    uploadedImagesArray = [];
    document.getElementById('admin-preview-wrapper').innerHTML = '';
}
