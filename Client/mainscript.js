document.addEventListener("DOMContentLoaded", function () {



    const from = document.referrer;
    if (from && !from.includes("account") && !from.includes("register") && !from.includes("signin")
        && !from.includes("tab")) {
        localStorage.setItem("redirectAfterLogin", from);
    }

    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const token = localStorage.getItem("token");
    const env = {
        BASE_URL: isLocalhost
            ? "http://localhost:5000"
            : "https://backendmicroservicewithpostgresdb.onrender.com"
    };
    const registerForm = document.getElementById("register-form");
    const signinForm = document.getElementById("signin-form");


    function applyThemeBasedOnTime() {
        // Define the start and end hours for dark mode (24-hour format)
        const darkModeStartHour = 18; // 6 PM
        const darkModeEndHour = 6;    // 6 AM

        // Get the current hour
        const currentHour = new Date().getHours();

        const body = document.body;


        if (currentHour >= darkModeStartHour || currentHour < darkModeEndHour) {

            body.classList.add('dark-mode');
            console.log("It's nighttime. Applying dark mode.");
        } else {

            body.classList.remove('dark-mode');
            console.log("It's daytime. Applying light mode.");
        }
    }

    applyThemeBasedOnTime();


    if (signinForm) {
        document.getElementById("signin-form").addEventListener("submit", async function (e) {
            e.preventDefault();

            const email = document.getElementById("signin-email").value;
            const password = document.getElementById("signin-password").value;

            try {
                const res = await fetch(`${env.BASE_URL}/api/account/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password }),
                });

                const data = await res.json();

                if (res.ok) {
                    localStorage.setItem("token", data.token);
                    localStorage.setItem("user", JSON.stringify(data.user));
                    alert("Login successful!");

                    const redirectTo = localStorage.getItem("redirectAfterLogin");
                    localStorage.removeItem("redirectAfterLogin");
                    window.location.href = redirectTo || "index.html";
                } else {
                    alert(data.message || "Login failed");
                }
            } catch (err) {
                console.error("Login error:", err);
                alert("Something went wrong during login.");
            }
        });
    }


    if (registerForm) {
        document.getElementById("register-form").addEventListener("submit", async function (e) {
            e.preventDefault();

            const name = document.getElementById("register-name").value;
            const email = document.getElementById("register-email").value;
            const password = document.getElementById("register-password").value;
            const phone = document.getElementById("register-phone").value;
            if (!name || !email || !password || !phone) {
                alert("Please fill all the details.");
                return;
            }
            if (phone.startsWith("0")) {
                alert("Phone number should not start with 0.");
                return;
            }
            try {
                const res = await fetch(`${env.BASE_URL}/api/account/register`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, email, password, phone }),
                });

                const result = await res.json();

                if (res.ok) {

                    localStorage.setItem("token", result.token);
                    localStorage.setItem("user", JSON.stringify(result.user));
                    alert(result.message);
                    window.location.href = "account.html?tab=signin";
                } else {
                    alert(result.message || "Registration failed");
                }
            } catch (err) {
                console.error("Registration error:", err);
                alert("Something went wrong during login.");
            }
        });
    }

    const signinBtns = document.querySelectorAll("#signin-btn");
    const logoutBtns = document.querySelectorAll("#logout-btn");
    const registerBtns = document.querySelectorAll("#register-btn");
    const mycart = document.querySelectorAll("#mycart");
    const orderCard = document.getElementsByClassName('order-card');

    const show = (elems) => elems.forEach(btn => btn.style.display = "inline-block");
    const hide = (elems) => elems.forEach(btn => btn.style.display = "none");

    if (token) {
        hide(signinBtns);
        hide(registerBtns);
        show(logoutBtns);
        show(mycart);
    } else {
        show(registerBtns);
        show(signinBtns);
        hide(logoutBtns);
        hide(mycart);
    }

    logoutBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            localStorage.removeItem("token");
            localStorage.removeItem("redirectAfterLogin");
            window.location.reload();
        });
    });


    async function fetchAndRenderCategories() {
        try {
            const res = await fetch(`${env.BASE_URL}/api/categories`);
            const categories = await res.json();

            const tabsContainer = document.querySelector(".tabs");
            const container = document.querySelector("#products-tabs .container");

            // Create tab buttons and tab content containers
            categories.forEach((category, index) => {
                // Create tab button
                const tabButton = document.createElement("button");
                tabButton.classList.add("tab-button");
                tabButton.dataset.tab = `category-${category.id}`;
                tabButton.textContent = category.category_description;
                if (index === 0) tabButton.classList.add("active");
                tabsContainer.insertBefore(tabButton, tabsContainer.querySelector(".dropdown"));

                // Create tab content div
                const tabContent = document.createElement("div");
                tabContent.id = `category-${category.id}`;
                tabContent.classList.add("tab-content");
                if (index === 0) tabContent.classList.add("active");
                tabContent.innerHTML = `<h2>${category.category_description}</h2><div class="product-grid"></div>`;
                container.appendChild(tabContent);
            });

            // Load products for the default tab
            if (categories.length > 0) loadProducts(categories[0].id);

            // Attach event listeners
            document.querySelectorAll(".tab-button[data-tab]").forEach(btn => {
                btn.addEventListener("click", () => {
                    document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
                    document.querySelectorAll(".tab-content").forEach(tc => tc.classList.remove("active"));
                    btn.classList.add("active");
                    document.getElementById(btn.dataset.tab).classList.add("active");

                    const categoryId = btn.dataset.tab.split("-")[1];
                    loadProducts(categoryId);
                });
            });
        } catch (err) {
            console.error("Failed to fetch categories:", err);
        }
    }
    async function loadProducts(categoryId) {
        try {
            const res = await fetch(`${env.BASE_URL}/api/productByCategory?category_id=${categoryId}`);
            const data = await res.json();

            const grid = document.querySelector(`#category-${categoryId} .product-grid`);
            grid.innerHTML = ""; // Clear old content

            if (data.length === 0) {
                grid.innerHTML = '<p>No products available in this category.</p>';
                return;
            }

            data.forEach(product => {
                const productHTML = `
                <div class="product-item">
                    <img src="${product.image_url}" alt="${product.name}">
                    <div class="product-info">
                        <h3>${product.name}</h3>
                        <p class="description">${product.description}</p>
                        <div class="product-footer">
                            <span class="price">₹${product.price}</span>
                            <a href="product-detail.html?id=${product.id}" class="btn">View Details</a>
                        </div>
                    </div>
                </div>
            `;
                grid.insertAdjacentHTML("beforeend", productHTML);
            });
        } catch (err) {
            console.error("Failed to load products:", err);
        }
    }

    const productTabsSection = document.getElementById('products-tabs');

    if (productTabsSection) {
        window.addEventListener("DOMContentLoaded", fetchAndRenderCategories);
    }
    const addToCartBtn = document.getElementById('addToCartBtn');


    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get("id");
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            if (!token) {
                alert("Please log in to add items to cart.");
                window.location.href = "/account.html?tab=signin";
                return;
            }

            try {
                const res = await fetch(`${env.BASE_URL}/api/cart/addtocart`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        product_id: productId,
                        quantity: 1
                    })
                });

                const result = await res.json();

                if (res.ok) {
                    alert("✅ Product added to cart!");
                } else {
                    alert("❌ " + result.message);
                }
            } catch (err) {
                console.error("Error adding to cart:", err);
                alert("Something went wrong.");
            }
        });
    }
    const buyNowBtn = document.getElementById('buyNowBtn');
    if (buyNowBtn) {

        buyNowBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (!token) {
                alert("Please log in to buy this item.");
                window.location.href = "/account.html?tab=signin";
                return;
            }

            try {
                const res = await fetch(`${env.BASE_URL}/api/product/buy-now`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        product_id: productId,
                        quantity: 1,
                        items: null
                    })
                });

                const result = await res.json();
                const orderId = result.order_id;
                if (res.ok) {
                    alert(`✅ Order Placed sucessfull with order id : ${orderId}`);
                } else {
                    alert("❌ Order could not be placed!!" + result.message);
                }
            } catch (err) {
                console.error("Error buying product:", err);
                alert("Something went wrong.");
            }
        });
    }
    if (orderCard) {
        let orderItems = [];
        function renderOrderCards(orderData) {
            const ordersList = document.getElementById('orders-list');
            ordersList.innerHTML = ''; // Clear old data
            const statusClassMap = {
                Delivered: 'delivered',
                processing: 'processing',
                Cancelled: 'cancelled',
                pending: 'processing',
                Shipped: 'shipped',
            };



            orderData.forEach(order => {
                const card = document.createElement('section');
                card.className = 'order-card';
                const statusClass = statusClassMap[order.status] || '';
                card.innerHTML = `
            <div class="order-header">
                <h3>Order #${order.order_id}</h3>
                <span class="order-date">Ordered on: ${new Date(order.created_at).toDateString()}</span>
            </div>
            <div class="order-details-grid">
                <div class="detail-item"><strong>Total:</strong><span class="order-total-price"> ₹${order.total_amount}</span></div>
                <div class="detail-item"><strong>Status:</strong> <span class="order-status ${statusClass}">${order.status}</span></div>
                <div class="detail-item"><strong>Ship To:</strong> ${order.ship_to}</div>
                <div class="detail-item"><strong>Items:</strong> ${order.total_unique_items}</div>
            </div>
            <div class="order-items-preview">
                ${order.product_items?.map(item => `
                    <div class="item-preview">
                        <img src="${item.image_url}" alt="${item.name}" />
                        <p>${item.name}</p>
                    </div>
                `).join('')}
            </div>
            <button class="view-details-button primary-button">View Order Details</button>
        `;

                ordersList.appendChild(card);
            });
        }

        async function fetchAndRenderOrders(e) {


            if (!token) {
                // Show sign-in/register buttons if not logged in
                //toggleAuthButtons(false);
                showModal('Please login to view your cart.');
                window.location.href = '/account.html?tab=signin';
                return;
            }

            try {
                const res = await fetch(`${CONFIG.BASE_URL}/api/user/orders`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                if (!res.ok) {
                    if (res.status === 401) { // Unauthorized, token might be invalid
                        showModal('Session expired. Please log in again.');
                        toggleAuthButtons(false); // Switch to sign-in/register
                        localStorage.removeItem('token'); // Clear invalid token

                        localStorage.removeItem("redirectAfterLogin");
                        window.location.href = '/account.html?tab=signin';
                        return;
                    } else {
                        throw new Error(`HTTP error! status: ${res.status}`);
                    }
                }

                const data = await res.json();
                orderItems = Array.isArray(data) ? data : [];
                if (orderItems.length > 0)
                    renderOrderCards(orderItems);
            } catch (error) {
                console.error('Error fetching orders:', error);
                showModal('Failed to load order. Please log in again.');
                localStorage.removeItem('token'); // Clear invalid token
                localStorage.removeItem("redirectAfterLogin");
                window.location.href = '/account.html?tab=signin';
            }
        }
        fetchAndRenderOrders();
    }

});