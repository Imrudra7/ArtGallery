// server/db.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false, // because Neon requires SSL
    },
});
(async () => {
    try {
        const res = await pool.query('SELECT NOW()');
        console.log("✅ Connected to DB at:", res.rows[0].now);
    } catch (err) {
        console.error("❌ DB Connection Error:", err);
    }
})();
module.exports = pool;
