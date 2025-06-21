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
const token = localStorage.getItem('token');
if (!token || isTokenExpired(token)) {
    localStorage.removeItem('token');
    alert("Session expired. Please login again.");
    window.location.href = "account.html?tab=signin";
}
document.getElementById('logoutBtn')?.addEventListener('click', () => {
    localStorage.removeItem('token');
    alert("You have been logged out.");
    window.location.href = "account.html?tab=signin";
});
