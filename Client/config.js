// config.js

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const CONFIG = {
    BASE_URL: isLocalhost
        ? "http://localhost:5000"
        : "https://backendmicroservicewithpostgresdb.onrender.com"
};
