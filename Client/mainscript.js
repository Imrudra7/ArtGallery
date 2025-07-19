document.addEventListener("DOMContentLoaded", function () {

    const checkoutState = {
        selectedAddressId: null,
        paymentMethod: "cod",
        useSaved: false,
        sessionId: null
    };

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
    const userProfileBtn = document.querySelectorAll('#profile');
    const myCartBtns = document.querySelectorAll('#mycart');

    const show = (elems) => elems.forEach(btn => btn.style.display = "inline-block");
    const hide = (elems) => elems.forEach(btn => btn.style.display = "none");

    if (token) {
        hide(signinBtns);
        hide(registerBtns);
        show(logoutBtns);
        show(mycart);
        show(userProfileBtn);
        show(myCartBtns);
    } else {
        show(registerBtns);
        show(signinBtns);
        hide(logoutBtns);
        hide(mycart);
        hide(userProfileBtn);
        hide(myCartBtns);
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

        // buyNowBtn.addEventListener('click', async (e) => {
        //     e.preventDefault();
        //     if (!token) {
        //         alert("Please log in to buy this item.");
        //         window.location.href = "/account.html?tab=signin";
        //         return;
        //     }

        //     try {
        //         const res = await fetch(`${env.BASE_URL}/api/product/buy-now`, {
        //             method: "POST",
        //             headers: {
        //                 "Content-Type": "application/json",
        //                 "Authorization": `Bearer ${token}`
        //             },
        //             body: JSON.stringify({
        //                 product_id: productId,
        //                 quantity: 1,
        //                 items: null
        //             })
        //         });

        //         const result = await res.json();
        //         const orderId = result.order_id;
        //         if (res.ok) {
        //             alert(`✅ Order Placed sucessfull with order id : ${orderId}`);
        //             try {
        //                 const mailRes = await fetch(`${env.BASE_URL}/api/mail/send-invoice`, {
        //                     method: "POST",
        //                     headers: {
        //                         "Content-Type": "application/json",
        //                         Authorization: `Bearer ${token}`
        //                     },
        //                     body: JSON.stringify({ orderId })
        //                 });

        //                 if (mailRes.ok) {
        //                     console.log("📧 Invoice sent successfully");
        //                 } else {
        //                     console.warn("❌ Invoice email failed");
        //                 }

        //             } catch (err) {
        //                 console.error("💥 Error while sending invoice email:", err);
        //             }
        //             setTimeout(() => {
        //                 window.location.href = `order-detail.html?orderId=${orderId}`
        //             }, 2500);
        //         } else {
        //             alert("❌ Order could not be placed!!" + result.message);
        //         }
        //     } catch (err) {
        //         console.error("Error buying product:", err);
        //         alert("Something went wrong.");
        //     }
        // });
        buyNowBtn.addEventListener("click", async () => {
            if (!token) {
                alert("⚠️ Please login first");
                window.location.href = "/account.html?tab=signin";
                return;
            }

            try {
                const res = await fetch(`${CONFIG.BASE_URL}/api/checkout/create`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        items: [{ product_id: productId, quantity: 1 }]
                    })
                });

                const data = await res.json();

                if (res.ok && data.session_id) {
                    // ✅ Redirect to checkout page with sessionId in URL
                    window.location.href = `checkOut.html?session=${data.session_id}`;
                } else {
                    alert("❌ Failed to start checkout session");
                }
            } catch (err) {
                console.error("❌ Error:", err);
                alert("Something went wrong");
            }
        });

    }
    const statusClassMap = {
        Delivered: 'delivered',
        processing: 'processing',
        Cancelled: 'cancelled',
        pending: 'processing',
        Shipped: 'shipped',
    };
    if (orderCard) {
        let orderItems = [];
        function renderOrderCards(orderData) {
            const ordersList = document.getElementById('orders-list');
            ordersList.innerHTML = '';
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
            <button class="view-details-button primary-button" onclick="viewOrder(${order.order_id})">View Order Details</button>
        `;

                ordersList.appendChild(card);
            });
        }

        async function fetchAndRenderOrders(e) {


            if (!token) {
                // Show sign-in/register buttons if not logged in
                //toggleAuthButtons(false);
                showModal('Please login to view your Orders.');
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
    const orderDetail = document.getElementsByClassName('orderdetailcontainer');


    if (orderDetail) {
        const orderId = urlParams.get('orderId');

        function renderOrderDetail(data) {
            const statusClass = statusClassMap[data.status] || '';


            document.getElementById("orderIdDisplay").innerText = `#OD${data.order_id}`;
            document.getElementById("orderDate").innerText = new Date(data.created_at).toDateString();
            document.getElementById("orderStatus").innerText = data.status || "N/A";
            document.getElementById("orderStatus").className = `status ${statusClass}`;
            document.getElementById("orderTotal").innerText = `₹${data.total_amount}`;
            document.getElementById("paymentMethod").innerText = data.payment_method || "N/A";

            // Shipping Info
            document.getElementById("shippingName").innerText = data.full_name;
            document.getElementById("shippingAddressLine1").innerText = data.address_line1;
            document.getElementById("shippingAddressLine2").innerText = data.address_line2;
            document.getElementById("shippingCityStateZip").innerText = `${data.city}, ${data.state} ${data.postal_code}`;
            document.getElementById("shippingPhone").innerText = `Phone: ${data.phone}`;

            // Items
            const itemsList = document.querySelector(".items-list");
            itemsList.innerHTML = "";
            data.items.forEach(item => {
                const card = document.createElement("div");
                card.className = "order-item-card";
                card.innerHTML = `
                        <img src="${item.image_url}" alt="${item.product_name}">
                        <div class="item-details">
                            <h3>${item.product_name}</h3>
                            <p>Quantity: <span class="item-qty">${item.quantity}</span></p>
                            <p>Price: <span class="item-price">₹${item.price}</span></p>
                            <p>Seller: ${item.seller}</p>
                        </div>
                        <button class="btn-secondary item-action-btn">Return/Exchange</button>
                        `;
                itemsList.appendChild(card);
            });

            // Price summary
            document.getElementById("subtotalPrice").innerText = `₹${data.subtotal}`;
            document.getElementById("shippingCost").innerText = `₹${data.shipping_fee}`;
            document.getElementById("discountAmount").innerText = `- ₹${data.discount}`;
            document.getElementById("grandTotalPrice").innerText = `₹${data.grand_total}`;
        }
        async function fetchAndRenderOrderDetail(orderId) {
            if (!token) {

                showModal('Please login to view your order.');
                window.location.href = '/account.html?tab=signin';
                return;
            }

            try {
                const res = await fetch(`${CONFIG.BASE_URL}/api/user/order-detail`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ orderId })
                });

                if (!res.ok) {
                    if (res.status === 401) {
                        showModal('Session expired. Please log in again.');
                        //toggleAuthButtons(false);
                        localStorage.removeItem('token');

                        localStorage.removeItem("redirectAfterLogin");
                        window.location.href = '/account.html?tab=signin';
                        return;
                    } else {
                        throw new Error(`HTTP error! status: ${res.status}`);
                    }
                }

                const data = await res.json();
                if (data) console.log(data);
                renderOrderDetail(data[0]);
            } catch (error) {
                console.error('Error fetching order:', error);
                showModal('Failed to load order. Please log in again.');
                localStorage.removeItem('token'); // Clear invalid token
                localStorage.removeItem("redirectAfterLogin");
                window.location.href = '/account.html?tab=signin';
            }
        }
        fetchAndRenderOrderDetail(orderId);
        const donwloadInvoice = document.getElementById("donwloadInvoice");
        if (donwloadInvoice) {
            donwloadInvoice.addEventListener('click', async (e) => {
                e.preventDefault();

                try {
                    const res = await fetch(`${CONFIG.BASE_URL}/api/downloadPDF/generateInvoice`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`
                        },
                        body: JSON.stringify({ orderId })
                    });

                    if (!res.ok) {
                        throw new Error('Failed to generate invoice');
                    }

                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);

                    // 🔽 Trigger download
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `invoice-${orderId}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                } catch (error) {
                    console.error("❌ Error downloading invoice:", error.message);
                    alert("Invoice download failed.");
                }
            });
        }
    }

    const myProfile = document.getElementsByClassName('profile-container');
    if (token && myProfile) {


        // ----------------------------
        // 🧩 Profile Overview Section
        // ----------------------------
        async function loadUserProfile() {
            try {
                const res = await fetch(`${CONFIG.BASE_URL}/api/user/profile`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error("Failed to load profile");

                const user = await res.json();

                document.getElementById("userNameDisplay").textContent = user.name || "User";
                document.getElementById("userEmailDisplay").textContent = user.email;
                document.getElementById("fullName").textContent = user.name;
                document.getElementById("emailAddress").textContent = user.email;
                document.getElementById("phoneNumber").textContent = user.phone || "N/A";
                document.getElementById("joinDate").textContent = new Date(user.created_at).toDateString();
                document.getElementById("lastLogin").textContent = new Date(user.last_login).toDateString();
                document.getElementById("totalOrders").textContent = user.total_orders;

                document.querySelector(".edit-profile-btn").addEventListener("click", async () => {
                    const newName = prompt("Enter your full name:", user.name);
                    const newPhone = prompt("Enter your phone number:", user.phone);
                    if (!newName || !newPhone) return alert("❌ Name and phone cannot be empty");

                    const updateRes = await fetch(`${CONFIG.BASE_URL}/api/user/update`, {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ name: newName, phone: newPhone }),
                    });

                    if (updateRes.ok) {
                        alert("✅ Profile updated successfully");
                        loadUserProfile();
                    } else {
                        const data = await updateRes.json();
                        alert(`❌ ${data.message || "Failed to update profile"}`);
                    }
                });
            } catch (err) {
                console.error("❌ Error loading profile:", err);
            }
        }

        // ----------------------------
        // 📦 Order History Section
        // ----------------------------
        async function loadOrderHistory() {
            try {
                const res = await fetch(`${CONFIG.BASE_URL}/api/user/orders`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const orders = await res.json();
                const container = document.querySelector("#orderHistory .orders-list");
                container.innerHTML = "";

                if (orders.length === 0) {
                    container.innerHTML = `<p>No orders found.</p>`;
                    return;
                }

                orders.forEach((order) => {
                    const previewItems = order.product_items
                        .slice(0, 2)
                        .map(item => `
                                    <img 
                                        src="${item.image_url}" 
                                        alt="${item.name}" 
                                        style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;"
                                    >
                         `).join("");

                    container.innerHTML += `
                        <div class="order-card">
                            <div class="order-header">
                                <h3>Order #OD${order.order_id}</h3>
                                <span class="order-status ${order.status.toLowerCase()}">${order.status}</span>
                            </div>
                            <p>Date: ${new Date(order.created_at).toDateString()}</p>
                            <p>Total: ₹${order.total_amount}</p>
                            <p>Recipient: ${order.ship_to}</p>
                            <div style="display: flex; gap: 8px; margin: 8px 0;">
                                ${previewItems}
                            </div>
                            <a href="order-detail.html?orderId=${order.order_id}" class="btn-secondary view-details-btn">View Details</a>
                        </div>`;
                });

            } catch (err) {
                console.error("❌ Error loading orders:", err);
                showModal("⚠️ Failed to load order history.");
            }
        }


        // ----------------------------
        // 🏠 Address Management Section
        // ----------------------------
        function renderAddressCards(addresses) {
            const container = document.querySelector(".addresses-list");
            container.innerHTML = "";

            if (!addresses || addresses.length === 0) {
                container.innerHTML = `<p>No addresses found. Please add one.</p>`;
                return;
            }

            addresses.forEach(address => {
                const card = document.createElement("div");
                card.classList.add("address-card");

                const isDefault = address.is_default ? "(Default)" : "";

                card.innerHTML = `
                    <strong>${address.label || "Address"} ${isDefault}</strong>
                    <p>${address.address_line1}${address.address_line2 ? ", " + address.address_line2 : ""}</p>
                    <p>${address.city}, ${address.state} - ${address.postal_code}</p>
                    <p>Phone: ${address.phone}</p>
                    <div class="address-actions">
                        <button class="btn-tertiary edit-address-btn" data-id="${address.id}">Edit</button>
                        <button class="btn-danger delete-address-btn" data-id="${address.id}">Delete</button>
                    </div>
                `;

                container.appendChild(card);
            });
        }

        async function loadUserAddresses() {
            const addressSection = document.getElementById("addressManagement");
            const container = addressSection.querySelector(".addresses-list");

            try {
                const res = await fetch(`${CONFIG.BASE_URL}/api/user/myaddresses`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error("Failed to fetch addresses");

                const addresses = await res.json();
                container.innerHTML = addresses.length
                    ? ""
                    : `<p>No addresses found. Please add one.</p>`;

                addresses.forEach((address) => {
                    const card = document.createElement("div");
                    card.classList.add("address-card");
                    card.innerHTML = `
                        <strong>${address.label || "Address"} ${address.is_default ? "(Default)" : ""
                        }</strong>
                        <p>${address.address_line1}${address.address_line2 ? ", " + address.address_line2 : ""
                        }</p>
                        <p>${address.city}, ${address.state} - ${address.postal_code}</p>
                        <p>Phone: ${address.phone}</p>
                        <div class="address-actions">
                        <button class="btn-tertiary edit-address-btn" data-id="${address.id}">Edit</button>
                        <button class="btn-danger delete-address-btn" data-id="${address.id}">Delete</button>
                        </div>
                    `;
                    container.appendChild(card);
                });
            } catch (err) {
                console.error("❌ Error loading addresses:", err);
            }

            // 🧹 Handle Edit/Delete
            addressSection.addEventListener("click", async (e) => {
                const id = e.target.dataset.id;
                if (e.target.classList.contains("delete-address-btn")) {
                    if (!confirm("Delete this address?")) return;
                    try {
                        const res = await fetch(`${CONFIG.BASE_URL}/api/user/addresses/${id}`, {
                            method: "DELETE",
                            headers: { Authorization: `Bearer ${token}` },
                        });
                        if (res.ok) {
                            //showModal("✅ Address deleted successfully");
                            const updated = await fetch(`${CONFIG.BASE_URL}/api/user/myaddresses`, {
                                headers: { Authorization: `Bearer ${token}` }
                            });
                            const updatedList = await updated.json();
                            renderAddressCards(updatedList);
                        } else {
                            showModal("❌ Failed to delete address");
                        }
                    } catch (err) {
                        console.error(err);
                        showModal("⚠️ Something went wrong");
                    }
                } else if (e.target.classList.contains("edit-address-btn")) {
                    alert(`✏️ Edit logic for address ID: ${id}`);


                    // You can also prefill using existing DOM content if needed
                    const card = e.target.closest(".address-card");
                    const fullLine = card.querySelector("p:nth-of-type(1)").textContent;
                    const [line1, line2] = fullLine.split(',').map(str => str.trim());
                    const currentAddressLine1 = prompt("🏠 Address Line 1:", line1 || "");
                    const currentAddressLine2 = prompt("🏢 Address Line 2:", line2 || "");
                    const currentCity = prompt("🏙 City:", card.querySelector("p:nth-of-type(2)").textContent.split(",")[0]);
                    const currentState = prompt("🗺 State:", card.querySelector("p:nth-of-type(2)").textContent.split(",")[1]?.split("-")[0]?.trim());
                    const currentPostal = prompt("📮 Postal Code:", card.querySelector("p:nth-of-type(2)").textContent.split("-")[1]?.trim());
                    const currentPhone = prompt("📞 Phone Number:", card.querySelector("p:nth-of-type(3)").textContent.replace("Phone: ", ""));

                    if (!currentAddressLine1 || !currentCity || !currentState || !currentPostal || !currentPhone) {
                        alert("❌ All fields are required!");
                        return;
                    }

                    try {
                        const res = await fetch(`${CONFIG.BASE_URL}/api/user/update-addresses/${id}`, {
                            method: "PUT",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                address_line1: currentAddressLine1,
                                address_line2: currentAddressLine2,
                                city: currentCity,
                                state: currentState,
                                postal_code: currentPostal,
                                phone: currentPhone
                            })
                        });

                        const data = await res.json();

                        if (res.ok) {
                            //showModal("✅ Address updated successfully.");
                            // Refresh address list
                            const updated = await fetch(`${CONFIG.BASE_URL}/api/user/myaddresses`, {
                                headers: { Authorization: `Bearer ${token}` }
                            });
                            const updatedList = await updated.json();
                            renderAddressCards(updatedList);
                        } else {
                            showModal(`❌ ${data.message || "Failed to update address"}`);
                        }
                    } catch (err) {
                        console.error("💥 Error updating address:", err);
                        showModal("❌ Something went wrong while updating address.");
                    }
                }
            });
        }
        document.querySelector('.add-address-btn')?.addEventListener('click', async () => {
            const label = prompt("Label (e.g., Home, Work):", "Home");
            if (!label) return alert("❌ Label is required.");

            const fullName = prompt("Full Name:");
            const addressLine1 = prompt("Address Line 1:");
            const addressLine2 = prompt("Address Line 2 (optional):", "");
            const city = prompt("City:");
            const state = prompt("State:");
            const postalCode = prompt("Postal Code:");
            const phone = prompt("Phone:");
            const isDefault = confirm("Make this your default address?");

            if (!fullName || !addressLine1 || !city || !state || !postalCode || !phone) {
                return alert("❌ All fields except address line 2 are required.");
            }

            try {
                const res = await fetch(`${CONFIG.BASE_URL}/api/user/add-address`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        label,
                        full_name: fullName,
                        address_line1: addressLine1,
                        address_line2: addressLine2,
                        city,
                        state,
                        postal_code: postalCode,
                        phone,
                        is_default: isDefault
                    })
                });

                if (!res.ok) {
                    const data = await res.json();
                    return alert(`❌ ${data.message || 'Failed to add address'}`);
                }

                const newAddressList = await (await fetch(`${CONFIG.BASE_URL}/api/user/myaddresses`, {
                    headers: { Authorization: `Bearer ${token}` }
                })).json();

                renderAddressCards(newAddressList);
                alert("✅ Address added successfully!");

            } catch (err) {
                console.error("Error adding address:", err);
                alert("❌ Something went wrong while adding the address.");
            }
        });


        // ----------------------------
        // ⚙️ Account Settings Section
        // ----------------------------
        function initAccountSettings() {
            const settingsSection = document.getElementById("accountSettings");
            const form = settingsSection.querySelector(".settings-form");
            const deactivateBtn = settingsSection.querySelector(".deactivate-account-btn");

            form.addEventListener("submit", async (e) => {
                e.preventDefault();
                const newPassword = document.getElementById("newPassword").value;
                const confirmPassword = document.getElementById("confirmPassword").value;

                if (newPassword !== confirmPassword) return alert("❌ Passwords do not match");

                try {
                    const res = await fetch(`${CONFIG.BASE_URL}/api/user/change-password`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ newPassword }),
                    });
                    const data = await res.json();
                    res.ok ? alert("✅ Password changed") : alert(`❌ ${data.message}`);
                    form.reset();
                } catch (err) {
                    console.error("Password change error:", err);
                }
            });

            deactivateBtn.addEventListener("click", async () => {
                if (!confirm("Are you sure you want to deactivate your account?")) return;
                try {
                    const res = await fetch(`${CONFIG.BASE_URL}/api/user/deactivate`, {
                        method: "DELETE",
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    if (res.ok) {
                        alert("✅ Account deactivated");
                        localStorage.removeItem("token");
                        window.location.href = "/account.html?tab=signin";
                    }
                } catch (err) {
                    console.error("Deactivation error:", err);
                }
            });
        }

        // ----------------------------
        // 🚀 Init All Sections on Load
        // ----------------------------
        (async () => {
            await loadUserProfile();
            await loadOrderHistory();
            await loadUserAddresses();
            initAccountSettings();

            // Logout button
            document.querySelectorAll(".logout-btn").forEach((btn) => {
                btn.addEventListener("click", () => {
                    localStorage.removeItem("token");
                    alert("Logged out successfully");
                    window.location.href = "/account.html?tab=signin";
                });
            });

            // Tab switching
            document.querySelectorAll(".profile-nav a").forEach((link) => {
                link.addEventListener("click", (e) => {
                    e.preventDefault();
                    document.querySelectorAll(".profile-section").forEach((sec) => sec.classList.remove("active"));
                    document.querySelectorAll(".profile-nav a").forEach((l) => l.classList.remove("active"));
                    const target = document.querySelector(link.getAttribute("href"));
                    target.classList.add("active");
                    link.classList.add("active");
                });
            });
        })();

    } else {
        myProfile.innerHTML = `
            <div class="unauthorized-message">
                <h1>Please log in to view your profile</h1>
                <p><a href="/account.html?tab=signin" class="btn-primary">Go to Login Page</a></p>
            </div>
        `;
    }
    const checkout = document.getElementsByClassName('checkout-container');
    if (checkout) {

        const tabButtons = document.querySelectorAll('.address-selection-tabs .tab-button');
        const addressTabContents = document.querySelectorAll('.address-tab-content');
        const savedAddressesList = document.querySelector('.saved-addresses-list');
        const loadingAddressesText = document.querySelector('.loading-addresses-text');
        const noAddressesText = document.querySelector('.no-addresses-text');
        const selectAddressBtn = document.querySelector('.select-address-btn');
        const shippingAddressForm = document.getElementById('shippingAddressForm');
        const sessionId = urlParams.get("session");
        // --- Tab Switching Logic ---
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTabId = button.dataset.tab;

                // Deactivate all buttons and content
                tabButtons.forEach(btn => btn.classList.remove('active'));
                addressTabContents.forEach(content => content.classList.remove('active'));

                // Activate the clicked button and its corresponding content
                button.classList.add('active');
                document.getElementById(targetTabId).classList.add('active');

                // If switching to saved addresses tab, fetch them
                if (targetTabId === 'savedAddresses') {
                    checkoutState.useSaved = true;
                    fetchSavedAddresses();
                } else {
                    checkoutState.useSaved = false;

                }
            });
        });

        // --- Function to Fetch and Render Saved Addresses ---
        async function fetchSavedAddresses() {
            savedAddressesList.innerHTML = ''; // Clear previous content
            loadingAddressesText.style.display = 'block'; // Show loading message
            noAddressesText.style.display = 'none'; // Hide no addresses message

            try {
                const response = await fetch(`${CONFIG.BASE_URL}/api/user/myaddresses`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const addresses = await response.json();
                loadingAddressesText.style.display = 'none'; // Hide loading

                if (addresses.length === 0) {
                    noAddressesText.style.display = 'block'; // Show no addresses message
                    selectAddressBtn.style.display = 'none'; // Hide "Use Selected Address" button
                } else {
                    noAddressesText.style.display = 'none'; // Hide no addresses message
                    selectAddressBtn.style.display = 'block'; // Show "Use Selected Address" button

                    addresses.forEach((address, index) => {
                        const card = document.createElement("div");
                        card.classList.add("saved-address-card");
                        card.innerHTML = `
                        <input type="radio" name="selectedSavedAddress" id="savedAddress_${address.id}" value="${address.id}" ${address.is_default ? "checked" : ""}>
                        <label for="savedAddress_${address.id}">
                            <strong>${address.label || "Address"} ${address.is_default ? "(Default)" : ""}</strong>
                            <p>${address.address_line1}${address.address_line2 ? ", " + address.address_line2 : ""}</p>
                            <p>${address.city}, ${address.state} - ${address.postal_code}</p>
                            <p>Phone: ${address.phone}</p>
                        </label>
                    `;
                        savedAddressesList.appendChild(card);
                    });

                    // Pre-select the default address if any, or the first one
                    const defaultRadio = savedAddressesList.querySelector('input[name="selectedSavedAddress"][checked]');
                    if (!defaultRadio && addresses.length > 0) {
                        savedAddressesList.querySelector('input[name="selectedSavedAddress"]').checked = true;
                    }
                }
            } catch (error) {
                console.error('Error fetching addresses:', error);
                loadingAddressesText.textContent = 'Failed to load addresses. Please try again.';
                loadingAddressesText.style.color = 'var(--secondary-color)'; // Red color for error
                loadingAddressesText.style.display = 'block';
                noAddressesText.style.display = 'none';
                selectAddressBtn.style.display = 'none';
            }
        }
        async function populateOrderSummary() {

            if (!sessionId || !token) return;

            try {
                const res = await fetch(`${CONFIG.BASE_URL}/api/checkout/${sessionId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!res.ok) throw new Error("Failed to fetch session");

                const session = await res.json();
                const orderItems = session.items;
                console.log("orderItems : Rudra ", orderItems);

                const orderItemsList = document.querySelector(".order-items-list");
                orderItemsList.innerHTML = ""; // clear old content

                let subtotal = 0;
                const shipping = 50; // flat rate (customize if needed)
                let discount = 50;

                for (const item of orderItems) {

                    const productRes = await fetch(`${CONFIG.BASE_URL}/api/products/${item.product_id}`);
                    const product = await productRes.json();

                    const itemTotal = product.price * item.quantity;
                    subtotal += itemTotal;

                    const card = document.createElement("div");
                    card.classList.add("order-item-card");
                    card.innerHTML = `
                <img src="${product.image_url}" alt="${product.name}" class="order-item-image">
                <div class="order-item-details">
                    <h3>${product.name}</h3>
                    <p>Quantity: ${item.quantity}</p>
                    <p>Price: ₹${product.price}</p>
                    <p>Total: ₹${itemTotal}</p>
                </div>
            `;
                    orderItemsList.appendChild(card);
                }

                // 🔢 Apply a dummy discount if subtotal > 2000
                //if (subtotal > 2000) discount = 100;

                const grandTotal = subtotal + shipping - discount;

                // Update Summary UI
                document.getElementById("summarySubtotal").innerText = `₹${subtotal}`;
                document.getElementById("summaryShipping").innerText = `₹${shipping}`;
                document.getElementById("summaryDiscount").innerText = `- ₹${discount}`;
                document.getElementById("summaryGrandTotal").innerText = `₹${grandTotal}`;
            } catch (err) {
                console.error("❌ Error populating order summary:", err);
                document.querySelector(".order-items-list").innerHTML = `<p style="color:red;">Failed to load order summary.</p>`;
            }
        }


        // --- Event Listener for "Use Selected Address" button (for saved addresses) ---
        selectAddressBtn.addEventListener('click', () => {
            const selectedRadio = document.querySelector('input[name="selectedSavedAddress"]:checked');
            if (selectedRadio) {
                const selectedAddressId = selectedRadio.value;
                console.log('Selected saved address ID:', selectedAddressId);
                checkoutState.useSaved = true;
                checkoutState.selectedAddressId = selectedAddressId;
                document.querySelector('.order-summary-section').classList.add('active');
                document.querySelector('.shipping-address-section').classList.remove('active');
                alert(`Using selected address: ${selectedAddressId}. Proceeding to next step.`);

                populateOrderSummary();
            } else {
                alert('Please select an address or add a new one.');
            }
        });

        // --- Initial Load: Hide messages, display default tab ---
        loadingAddressesText.style.display = 'none';
        noAddressesText.style.display = 'none';




        document.querySelectorAll('.next-step-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                event.preventDefault(); // Prevent default form submission if it's a form button

                const currentSection = event.target.closest('.checkout-section');
                currentSection.classList.remove('active');

                if (currentSection.classList.contains('shipping-address-section')) {
                    document.querySelector('.order-summary-section').classList.add('active');
                    populateOrderSummary();
                } else if (currentSection.classList.contains('order-summary-section')) {
                    document.querySelector('.payment-section').classList.add('active');
                }
            });
        });

        document.querySelectorAll('.prev-step-btn').forEach(button => {
            button.addEventListener('click', () => {
                const currentSection = event.target.closest('.checkout-section');
                currentSection.classList.remove('active');

                if (currentSection.classList.contains('order-summary-section')) {
                    document.querySelector('.shipping-address-section').classList.add('active');
                    //populateOrderSummary();
                } else if (currentSection.classList.contains('payment-section')) {
                    document.querySelector('.order-summary-section').classList.add('active');
                }

            });
        });
        async function finalizeOrderCall(payload) {
            try {
                const res = await fetch(`${CONFIG.BASE_URL}/api/checkout/finalize`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });

                const data = await res.json();
                if (!res.ok) return alert("❌ Failed: " + data.message);

                const orderId = data.order_id;

                // Optional: Send invoice
                try {
                    const mailRes = await fetch(`${CONFIG.BASE_URL}/api/mail/send-invoice`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`
                        },
                        body: JSON.stringify({ orderId })
                    });
                    if (mailRes.ok) console.log("📧 Invoice sent");
                } catch (err) {
                    console.error("📩 Mail error:", err);
                }

                alert("✅ Order placed successfully!");
                setTimeout(() => {
                    window.location.href = `order-detail.html?orderId=${orderId}`;
                }, 500);
            } catch (error) {
                console.error("❌ Finalize Order Error:", error);
                alert("❌ Something went wrong. Please try again.");
            }
        }

        // document.querySelector('.place-order-btn').addEventListener('click', async () => {
        //     if (!sessionId) return alert("❌ Session ID missing");
        //     const selectedPaymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value.toUpperCase();
        //     let payload = { session_id: sessionId, payment_method: selectedPaymentMethod };
        //     let endpoint = `${CONFIG.BASE_URL}/api/checkout/finalize`;

        //     // Use Saved Address
        //     if (checkoutState.useSaved && checkoutState.selectedAddressId) {
        //         payload.use_saved = true;
        //         payload.address_id = checkoutState.selectedAddressId;
        //     }
        //     // New Address
        //     else {
        //         const fullName = document.getElementById("fullName").value.trim();
        //         const phone = document.getElementById("phone").value.trim();
        //         const addressLine1 = document.getElementById("addressLine1").value.trim();
        //         const addressLine2 = document.getElementById("addressLine2").value.trim();
        //         const city = document.getElementById("city").value.trim();
        //         const state = document.getElementById("state").value.trim();
        //         const postalCode = document.getElementById("postalCode").value.trim();
        //         const saveAddress = document.getElementById("saveAddress").checked;

        //         if (!fullName || !phone || !addressLine1 || !city || !state || !postalCode) {
        //             return alert("❗Please fill in all required address fields.");
        //         }

        //         payload = {
        //             ...payload,
        //             use_saved: false,
        //             full_name: fullName,
        //             phone,
        //             address_line1: addressLine1,
        //             address_line2: addressLine2,
        //             city,
        //             state,
        //             postal_code: postalCode,
        //             save_address: saveAddress
        //         };
        //     }
        //     console.log(payload);


        //     try {
        //         const res = await fetch(endpoint, {
        //             method: "POST",
        //             headers: {
        //                 "Content-Type": "application/json",
        //                 Authorization: `Bearer ${token}`
        //             },
        //             body: JSON.stringify(payload)
        //         });

        //         const data = await res.json();
        //         if (!res.ok) return alert("❌ Failed: " + data.message);

        //         const orderId = data.order_id;

        //         // Email invoice
        //         try {
        //             const mailRes = await fetch(`${CONFIG.BASE_URL}/api/mail/send-invoice`, {
        //                 method: "POST",
        //                 headers: {
        //                     "Content-Type": "application/json",
        //                     Authorization: `Bearer ${token}`
        //                 },
        //                 body: JSON.stringify({ orderId })
        //             });
        //             if (mailRes.ok) console.log("📧 Invoice sent successfully");
        //         } catch (err) {
        //             console.error("💥 Error while sending invoice email:", err);
        //         }

        //         alert("✅ Order Placed Successfully!");
        //         setTimeout(() => {
        //             window.location.href = `order-detail.html?orderId=${orderId}`;
        //         }, 500);

        //     } catch (error) {
        //         console.error("❌ Final order error:", error);
        //         alert("❌ Something went wrong. Please try again.");
        //     }
        // }); BAND KIYA HAI FOR UPI
        document.querySelector('.place-order-btn').addEventListener('click', async () => {
            if (!sessionId) return alert("❌ Session ID missing");

            const selectedPaymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value.toUpperCase();
            let payload = { session_id: sessionId, payment_method: selectedPaymentMethod };
            let endpoint = `${CONFIG.BASE_URL}/api/checkout/finalize`;

            // Address block
            if (checkoutState.useSaved && checkoutState.selectedAddressId) {
                payload.use_saved = true;
                payload.address_id = checkoutState.selectedAddressId;
            } else {
                const fullName = document.getElementById("fullName").value.trim();
                const phone = document.getElementById("phone").value.trim();
                const addressLine1 = document.getElementById("addressLine1").value.trim();
                const addressLine2 = document.getElementById("addressLine2").value.trim();
                const city = document.getElementById("city").value.trim();
                const state = document.getElementById("state").value.trim();
                const postalCode = document.getElementById("postalCode").value.trim();
                const saveAddress = document.getElementById("saveAddress").checked;

                if (!fullName || !phone || !addressLine1 || !city || !state || !postalCode) {
                    return alert("❗Please fill in all required address fields.");
                }

                
                 payload = {
                    ...payload,
                    use_saved: false,
                    full_name: fullName,
                    phone,
                    address_line1: addressLine1,
                    address_line2: addressLine2,
                    city,
                    state,
                    postal_code: postalCode,
                    save_address: saveAddress,
                    totalAmount: totalAmount,
                };
            }

            // 🔁 COD: Directly finalize order
            if (selectedPaymentMethod === "COD") {
                return finalizeOrderCall(payload);
            }

            // 🧾 UPI/Razorpay Flow
            try {
                // Step 1: Create Razorpay Order from backend
                const createRes = await fetch(`${CONFIG.BASE_URL}/api/razorpay/create-order`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });

                const razorpayData = await createRes.json();
                if (!createRes.ok) return alert("❌ Razorpay order failed: " + razorpayData.message);

                const { razorpayOrder, totalAmount } = razorpayData;

                const options = {
                    key: "rzp_test_lPRCDfwNUUy24i",
                    amount: totalAmount * 100,
                    currency: "INR",
                    name: "Mithila Art Gallery",
                    description: "Order Payment",
                    order_id: razorpayOrder.id,
                    handler: async function (response) {
                        // Step 3: Payment succeeded, finalize order
                        payload.razorpay_order_id = response.razorpay_order_id;
                        payload.razorpay_payment_id = response.razorpay_payment_id;
                        payload.razorpay_signature = response.razorpay_signature;
                        const res = await fetch(`${CONFIG.BASE_URL}/api/razorpay/verify-razorpay-payment`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`
                            },
                            body: JSON.stringify(payload),
                        });

                        const data = await res.json();

                        if (data.success) {

                            const orderId = data.order_id;

                            // Email invoice
                            try {
                                const mailRes = await fetch(`${CONFIG.BASE_URL}/api/mail/send-invoice`, {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": "application/json",
                                        Authorization: `Bearer ${token}`
                                    },
                                    body: JSON.stringify({ orderId })
                                });
                                if (mailRes.ok) console.log("📧 Invoice sent successfully");
                            } catch (err) {
                                console.error("💥 Error while sending invoice email:", err);
                            }

                            alert("✅ Order Placed Successfully!");
                            setTimeout(() => {
                                window.location.href = `order-detail.html?orderId=${orderId}`;
                            }, 500);

                        } else {
                            alert("Payment verification failed. Please contact support.");
                        }
                    },
                    prefill: {
                        name: payload.full_name || "",
                        contact: payload.phone || "",
                    },
                    theme: {
                        color: "#3399cc"
                    }
                };

                const rzp = new Razorpay(options);
                rzp.open();
            } catch (err) {
                console.error("💥 Razorpay Init Error:", err);
                alert("❌ Failed to initiate payment");
            }
        });



        if (!sessionId) {
            alert("Invalid session");
            window.location.href = "/"; // Ya back to product page
        }
        (async () => {
            const res = await fetch(`${CONFIG.BASE_URL}/api/checkout/${sessionId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!res.ok) {
                throw new Error("❌ Failed to fetch session details");
            }

            const session = await res.json();
            console.log("📦 Session data:", session);

        })();



    }

});