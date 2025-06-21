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


    function isTokenExpired(token) {
        if (!token) return true;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const currentTime = Math.floor(Date.now() / 1000); // in seconds
            return payload.exp < currentTime;
        } catch (err) {
            console.error("Token check error:", err);
            return true;
        }
    }
    // const token = localStorage.getItem('token');
    // if (!token || isTokenExpired(token)) {
    //     localStorage.removeItem('token');
    //     alert("Session expired. Please login again.");
    //     window.location.href = "account.html?tab=signin";
    // }
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        localStorage.removeItem('token');
        alert("You have been logged out.");
        window.location.href = "/account.html?tab=signin";
    });

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


    const show = (elems) => elems.forEach(btn => btn.style.display = "inline-block");
    const hide = (elems) => elems.forEach(btn => btn.style.display = "none");

    if (token) {
        hide(signinBtns);
        hide(registerBtns);
        show(logoutBtns);
    } else {
        show(registerBtns);
        show(signinBtns);
        hide(logoutBtns);
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
            const res = await fetch(`http://localhost:5000/api/productByCategory?category_id=${categoryId}`);
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
                            <a href="#" class="btn">View Details</a>
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

    // ✅ Start after DOM is ready
    window.addEventListener("DOMContentLoaded", fetchAndRenderCategories);
});