document.addEventListener("DOMContentLoaded", function () {



    const from = document.referrer;
    if (from && !from.includes("account" && !from.includes("register") && !from.includes("login"))) {
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
            window.location.reload();
        });
    });
});