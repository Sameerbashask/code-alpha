const API_BASE_URL = `${window.location.origin}/api`;

const storage = {
  getCart() {
    return JSON.parse(localStorage.getItem("cartItems") || "[]");
  },
  saveCart(items) {
    localStorage.setItem("cartItems", JSON.stringify(items));
  },
  getUser() {
    return JSON.parse(localStorage.getItem("userInfo") || "null");
  },
  saveUser(user) {
    localStorage.setItem("userInfo", JSON.stringify(user));
  },
  clearUser() {
    localStorage.removeItem("userInfo");
  },
  saveLastOrder(order) {
    localStorage.setItem("lastOrder", JSON.stringify(order));
  },
  getLastOrder() {
    return JSON.parse(localStorage.getItem("lastOrder") || "null");
  },
};

const formatPrice = (value) => `Rs. ${Number(value).toFixed(2)}`;
const getCartCount = () => storage.getCart().reduce((sum, item) => sum + item.quantity, 0);
const getCartTotal = () => storage.getCart().reduce((sum, item) => sum + item.price * item.quantity, 0);
const getCurrentPath = () => window.location.pathname.split("/").pop() || "index.html";
const isLoggedIn = () => Boolean(storage.getUser()?.token);

const showToast = (containerId, message, type = "success") => {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `<div class="message ${type}">${message}</div>`;
};

const renderHeader = () => {
  const root = document.getElementById("app-header");
  if (!root) return;

  const path = getCurrentPath();
  const user = storage.getUser();

  root.innerHTML = `
    <header class="site-header">
      <div class="container nav">
        <a class="brand" href="index.html">NovaCart</a>
        <nav class="nav-links">
          <a class="nav-link ${path === "index.html" ? "active" : ""}" href="index.html">Home</a>
          <a class="nav-link ${path === "products.html" || path === "product-details.html" ? "active" : ""}" href="products.html">Products</a>
          <a class="nav-link ${path === "orders.html" ? "active" : ""}" href="orders.html">My Orders</a>
        </nav>
        <div class="nav-actions">
          <a class="cart-pill" href="cart.html">
            <span>Cart</span>
            <span class="cart-count" id="nav-cart-count">${getCartCount()}</span>
          </a>
          ${
            user
              ? `
                <span class="nav-link">Hi, ${user.name.split(" ")[0]}</span>
                <button class="btn btn-secondary" id="logout-btn" type="button">Logout</button>
              `
              : `
                <a class="btn btn-secondary" href="login.html">Login</a>
                <a class="btn btn-primary" href="register.html">Register</a>
              `
          }
        </div>
      </div>
    </header>
  `;

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      storage.clearUser();
      window.location.href = "index.html";
    });
  }
};

const renderFooter = () => {
  const root = document.getElementById("app-footer");
  if (!root) return;

  root.innerHTML = `
    <footer class="site-footer">
      <div class="container footer-grid">
        <div>
          <h4>NovaCart</h4>
          <p>Simple, modern, and responsive e-commerce shopping for everyday essentials.</p>
        </div>
        <div>
          <h4>Quick Links</h4>
          <p><a href="index.html">Home</a></p>
          <p><a href="products.html">Products</a></p>
          <p><a href="cart.html">Cart</a></p>
        </div>
        <div>
          <h4>Support</h4>
          <p>Email: support@novacart.demo</p>
          <p>Cash on Delivery available on all eligible orders.</p>
        </div>
      </div>
    </footer>
  `;
};

const updateNavCartCount = () => {
  const countEl = document.getElementById("nav-cart-count");
  if (countEl) countEl.textContent = getCartCount();
};

const apiRequest = async (endpoint, options = {}) => {
  const user = storage.getUser();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (user?.token) {
    headers.Authorization = `Bearer ${user.token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
};

const addToCart = (product, quantity = 1) => {
  const cart = storage.getCart();
  const existingItem = cart.find((item) => item.productId === product._id);

  if (existingItem) {
    const updatedQuantity = existingItem.quantity + quantity;
    existingItem.quantity = Math.min(updatedQuantity, product.stock);
  } else {
    cart.push({
      productId: product._id,
      name: product.name,
      image: product.image,
      price: product.price,
      stock: product.stock,
      quantity: Math.min(quantity, product.stock),
    });
  }

  storage.saveCart(cart);
  updateNavCartCount();
};

const removeFromCart = (productId) => {
  storage.saveCart(storage.getCart().filter((item) => item.productId !== productId));
  updateNavCartCount();
};

const changeCartQuantity = (productId, delta) => {
  const cart = storage.getCart()
    .map((item) => {
      if (item.productId !== productId) return item;
      const nextQuantity = Math.max(1, Math.min(item.quantity + delta, item.stock));
      return { ...item, quantity: nextQuantity };
    });
  storage.saveCart(cart);
  updateNavCartCount();
};

const clearCart = () => {
  storage.saveCart([]);
  updateNavCartCount();
};

const createProductCard = (product) => `
  <article class="product-card">
    <img src="${product.image}" alt="${product.name}">
    <div class="product-body">
      <div class="product-meta">
        <span>${product.category}</span>
        <span>${product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}</span>
      </div>
      <h3 class="product-title">${product.name}</h3>
      <p class="product-description">${product.description}</p>
      <div class="meta-row">
        <span class="price">${formatPrice(product.price)}</span>
      </div>
      <div class="card-actions">
        <a class="btn btn-secondary" href="product-details.html?id=${product._id}">View Details</a>
        <button class="btn btn-primary add-to-cart-btn" data-product='${JSON.stringify(product)}' ${product.stock < 1 ? "disabled" : ""}>
          Add to Cart
        </button>
      </div>
    </div>
  </article>
`;

const attachAddToCartHandlers = () => {
  document.querySelectorAll(".add-to-cart-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const product = JSON.parse(button.dataset.product);
      addToCart(product, 1);
      button.textContent = "Added";
      setTimeout(() => {
        button.textContent = "Add to Cart";
      }, 900);
    });
  });
};

const loadHomePage = async () => {
  const featuredContainer = document.getElementById("featured-products");
  const categoriesContainer = document.getElementById("home-categories");
  if (!featuredContainer || !categoriesContainer) return;

  try {
    featuredContainer.innerHTML = `<div class="loader">Loading featured products...</div>`;
    categoriesContainer.innerHTML = `<div class="loader">Loading categories...</div>`;

    const [featured, categories] = await Promise.all([
      apiRequest("/products/featured"),
      apiRequest("/products/categories"),
    ]);

    featuredContainer.innerHTML = featured.length
      ? featured.map(createProductCard).join("")
      : `<div class="empty-state">No featured products available right now.</div>`;

    categoriesContainer.innerHTML = categories.length
      ? categories
          .map(
            (category) => `
              <a class="category-card" href="products.html?category=${encodeURIComponent(category)}">
                <h3>${category}</h3>
                <span>Explore products in ${category}</span>
              </a>
            `
          )
          .join("")
      : `<div class="empty-state">No categories found.</div>`;

    attachAddToCartHandlers();
  } catch (error) {
    featuredContainer.innerHTML = `<div class="message error">${error.message}</div>`;
    categoriesContainer.innerHTML = "";
  }
};

const loadProductsPage = async () => {
  const list = document.getElementById("products-list");
  const searchInput = document.getElementById("search-input");
  const categorySelect = document.getElementById("category-select");
  const sortSelect = document.getElementById("sort-select");
  if (!list || !searchInput || !categorySelect || !sortSelect) return;

  const params = new URLSearchParams(window.location.search);
  searchInput.value = params.get("search") || "";
  categorySelect.value = params.get("category") || "";
  sortSelect.value = params.get("sort") || "";

  const populateCategories = async () => {
    const categories = await apiRequest("/products/categories");
    categorySelect.innerHTML = `<option value="">All Categories</option>${categories
      .map((category) => `<option value="${category}">${category}</option>`)
      .join("")}`;
    categorySelect.value = params.get("category") || "";
  };

  const renderProducts = async () => {
    list.innerHTML = `<div class="loader">Loading products...</div>`;

    const query = new URLSearchParams({
      search: searchInput.value.trim(),
      category: categorySelect.value,
      sort: sortSelect.value,
    });

    const products = await apiRequest(`/products?${query.toString()}`);
    list.innerHTML = products.length
      ? products.map(createProductCard).join("")
      : `<div class="empty-state">No products found. Try a different search or filter.</div>`;
    attachAddToCartHandlers();
  };

  try {
    await populateCategories();
    await renderProducts();
  } catch (error) {
    list.innerHTML = `<div class="message error">${error.message}</div>`;
  }

  [searchInput, categorySelect, sortSelect].forEach((input) => {
    input.addEventListener("input", async () => {
      const nextParams = new URLSearchParams();
      if (searchInput.value.trim()) nextParams.set("search", searchInput.value.trim());
      if (categorySelect.value) nextParams.set("category", categorySelect.value);
      if (sortSelect.value) nextParams.set("sort", sortSelect.value);
      history.replaceState({}, "", `products.html${nextParams.toString() ? `?${nextParams.toString()}` : ""}`);
      await renderProducts();
    });
    input.addEventListener("change", async () => {
      const nextParams = new URLSearchParams();
      if (searchInput.value.trim()) nextParams.set("search", searchInput.value.trim());
      if (categorySelect.value) nextParams.set("category", categorySelect.value);
      if (sortSelect.value) nextParams.set("sort", sortSelect.value);
      history.replaceState({}, "", `products.html${nextParams.toString() ? `?${nextParams.toString()}` : ""}`);
      await renderProducts();
    });
  });
};

const loadProductDetailsPage = async () => {
  const root = document.getElementById("product-detail-root");
  if (!root) return;

  const productId = new URLSearchParams(window.location.search).get("id");
  if (!productId) {
    root.innerHTML = `<div class="message error">Product ID is missing.</div>`;
    return;
  }

  try {
    root.innerHTML = `<div class="loader">Loading product details...</div>`;
    const product = await apiRequest(`/products/${productId}`);
    root.innerHTML = `
      <div class="detail-grid">
        <div class="detail-image card"><img src="${product.image}" alt="${product.name}"></div>
        <div class="detail-content card">
          <p class="section-subtitle">${product.category}</p>
          <h1>${product.name}</h1>
          <p>${product.description}</p>
          <p class="price">${formatPrice(product.price)}</p>
          <p><strong>Available Stock:</strong> ${product.stock}</p>
          <div class="quantity-row">
            <label for="quantity">Quantity</label>
            <input class="input quantity-input" id="quantity" type="number" min="1" max="${product.stock}" value="1">
          </div>
          <div class="card-actions">
            <button class="btn btn-primary" id="detail-add-btn" ${product.stock < 1 ? "disabled" : ""}>Add to Cart</button>
            <a class="btn btn-secondary" href="products.html">Back to Products</a>
          </div>
          <div id="detail-message"></div>
        </div>
      </div>
    `;

    const addButton = document.getElementById("detail-add-btn");
    const quantityInput = document.getElementById("quantity");
    addButton?.addEventListener("click", () => {
      const quantity = Math.min(Math.max(Number(quantityInput.value) || 1, 1), product.stock);
      addToCart(product, quantity);
      showToast("detail-message", "Product added to cart.");
    });
  } catch (error) {
    root.innerHTML = `<div class="message error">${error.message}</div>`;
  }
};

const loadCartPage = () => {
  const cartList = document.getElementById("cart-items");
  const summary = document.getElementById("cart-summary");
  if (!cartList || !summary) return;

  const renderCart = () => {
    const cart = storage.getCart();
    if (!cart.length) {
      cartList.innerHTML = `<div class="empty-state">Your cart is empty. Start adding products you love.</div>`;
      summary.innerHTML = `
        <div class="summary-card">
          <h3>Order Summary</h3>
          <p class="section-subtitle">No items in cart yet.</p>
          <a class="btn btn-primary btn-block" href="products.html">Browse Products</a>
        </div>
      `;
      return;
    }

    cartList.innerHTML = cart
      .map(
        (item) => `
          <article class="cart-item">
            <img src="${item.image}" alt="${item.name}">
            <div class="cart-item-body">
              <div class="meta-row">
                <h3>${item.name}</h3>
                <span>${formatPrice(item.price)}</span>
              </div>
              <p class="section-subtitle">Subtotal: ${formatPrice(item.price * item.quantity)}</p>
              <div class="cart-actions">
                <button class="btn btn-secondary qty-btn" data-id="${item.productId}" data-delta="-1">-</button>
                <span>Quantity: ${item.quantity}</span>
                <button class="btn btn-secondary qty-btn" data-id="${item.productId}" data-delta="1">+</button>
                <button class="btn btn-danger remove-btn" data-id="${item.productId}">Remove</button>
              </div>
            </div>
          </article>
        `
      )
      .join("");

    summary.innerHTML = `
      <div class="summary-card">
        <h3>Order Summary</h3>
        <div class="summary-row"><span>Total Products</span><strong>${getCartCount()}</strong></div>
        <div class="summary-row total"><span>Grand Total</span><strong>${formatPrice(getCartTotal())}</strong></div>
        <div class="card-actions">
          <a class="btn btn-primary btn-block" href="checkout.html">Proceed to Checkout</a>
          <button class="btn btn-danger btn-block" id="clear-cart-btn">Clear Cart</button>
        </div>
      </div>
    `;

    document.querySelectorAll(".qty-btn").forEach((button) => {
      button.addEventListener("click", () => {
        changeCartQuantity(button.dataset.id, Number(button.dataset.delta));
        renderCart();
      });
    });

    document.querySelectorAll(".remove-btn").forEach((button) => {
      button.addEventListener("click", () => {
        removeFromCart(button.dataset.id);
        renderCart();
      });
    });

    document.getElementById("clear-cart-btn")?.addEventListener("click", () => {
      clearCart();
      renderCart();
    });
  };

  renderCart();
};

const loadRegisterPage = () => {
  const form = document.getElementById("register-form");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    try {
      const user = await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      storage.saveUser(user);
      showToast("register-message", "Registration successful. Redirecting...");
      setTimeout(() => {
        window.location.href = "products.html";
      }, 900);
    } catch (error) {
      showToast("register-message", error.message, "error");
    }
  });
};

const loadLoginPage = () => {
  const form = document.getElementById("login-form");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    try {
      const user = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      storage.saveUser(user);
      showToast("login-message", "Login successful. Redirecting...");
      setTimeout(() => {
        window.location.href = "checkout.html";
      }, 900);
    } catch (error) {
      showToast("login-message", error.message, "error");
    }
  });
};

const loadCheckoutPage = () => {
  const form = document.getElementById("checkout-form");
  const summary = document.getElementById("checkout-summary");
  if (!form || !summary) return;

  const cart = storage.getCart();
  if (!cart.length) {
    summary.innerHTML = `<div class="empty-state">Your cart is empty. Add products before checkout.</div>`;
    form.innerHTML = `<a class="btn btn-primary" href="products.html">Shop Now</a>`;
    return;
  }

  if (!isLoggedIn()) {
    window.location.href = "login.html";
    return;
  }

  summary.innerHTML = `
    <div class="summary-card">
      <h3>Order Summary</h3>
      ${cart
        .map(
          (item) => `
            <div class="summary-row">
              <span>${item.name} x ${item.quantity}</span>
              <strong>${formatPrice(item.price * item.quantity)}</strong>
            </div>
          `
        )
        .join("")}
      <div class="summary-row"><span>Payment Method</span><strong>Cash on Delivery</strong></div>
      <div class="summary-row total"><span>Total</span><strong>${formatPrice(getCartTotal())}</strong></div>
    </div>
  `;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const shippingAddress = Object.fromEntries(formData.entries());
    const items = storage.getCart().map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    }));

    try {
      const order = await apiRequest("/orders", {
        method: "POST",
        body: JSON.stringify({ items, shippingAddress }),
      });
      storage.saveLastOrder(order);
      clearCart();
      window.location.href = `order-success.html?id=${order._id}`;
    } catch (error) {
      showToast("checkout-message", error.message, "error");
    }
  });
};

const loadOrderSuccessPage = async () => {
  const root = document.getElementById("order-success-root");
  if (!root) return;

  const orderId = new URLSearchParams(window.location.search).get("id");
  const cachedOrder = storage.getLastOrder();

  if (cachedOrder && cachedOrder._id === orderId) {
    renderOrderSuccess(cachedOrder);
    return;
  }

  if (!orderId || !isLoggedIn()) {
    root.innerHTML = `<div class="empty-state">No recent order found.</div>`;
    return;
  }

  try {
    const order = await apiRequest(`/orders/${orderId}`);
    renderOrderSuccess(order);
  } catch (error) {
    root.innerHTML = `<div class="message error">${error.message}</div>`;
  }

  function renderOrderSuccess(order) {
    root.innerHTML = `
      <div class="summary-card">
        <h1>Order Placed Successfully</h1>
        <p class="section-subtitle">Thank you for shopping with NovaCart.</p>
        <div class="summary-row"><span>Order ID</span><strong>${order.orderId}</strong></div>
        <div class="summary-row"><span>Order Total</span><strong>${formatPrice(order.totalAmount)}</strong></div>
        <div class="summary-row"><span>Order Date</span><strong>${new Date(order.createdAt).toLocaleString()}</strong></div>
        <div class="shipping-block">
          <h3>Delivery Information</h3>
          <p>${order.shippingAddress.fullName}</p>
          <p>${order.shippingAddress.address}, ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.postalCode}</p>
          <p>Phone: ${order.shippingAddress.phone}</p>
        </div>
        <div class="card-actions">
          <a class="btn btn-primary" href="products.html">Continue Shopping</a>
          <a class="btn btn-secondary" href="orders.html">View My Orders</a>
        </div>
      </div>
    `;
  }
};

const loadOrdersPage = async () => {
  const root = document.getElementById("orders-root");
  if (!root) return;

  if (!isLoggedIn()) {
    window.location.href = "login.html";
    return;
  }

  try {
    root.innerHTML = `<div class="loader">Loading your orders...</div>`;
    const orders = await apiRequest("/orders/my-orders");

    root.innerHTML = orders.length
      ? `<div class="orders-grid">${orders
          .map(
            (order) => `
              <article class="order-card">
                <div class="detail-content">
                  <div class="meta-row">
                    <h3>${order.orderId}</h3>
                    <span>${order.orderStatus}</span>
                  </div>
                  <p class="section-subtitle">${new Date(order.createdAt).toLocaleString()}</p>
                  <ul class="order-products">
                    ${order.products
                      .map(
                        (product) =>
                          `<li>${product.name} x ${product.quantity} - ${formatPrice(product.price * product.quantity)}</li>`
                      )
                      .join("")}
                  </ul>
                  <p><strong>Total:</strong> ${formatPrice(order.totalAmount)}</p>
                  <p><strong>Delivery Address:</strong> ${order.shippingAddress.address}, ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.postalCode}</p>
                </div>
              </article>
            `
          )
          .join("")}</div>`
      : `<div class="empty-state">You have not placed any orders yet.</div>`;
  } catch (error) {
    root.innerHTML = `<div class="message error">${error.message}</div>`;
  }
};

const initializeApp = () => {
  renderHeader();
  renderFooter();
  loadHomePage();
  loadProductsPage();
  loadProductDetailsPage();
  loadCartPage();
  loadRegisterPage();
  loadLoginPage();
  loadCheckoutPage();
  loadOrderSuccessPage();
  loadOrdersPage();
};

document.addEventListener("DOMContentLoaded", initializeApp);
