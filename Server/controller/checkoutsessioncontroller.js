const pool = require('../db');

// 1️⃣ Create Checkout Session (start checkout)
const createCheckoutSession = async (req, res) => {
    const userId = req.user.id;
    const { items } = req.body; // [{product_id, quantity}]

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Invalid or empty items array" });
    }

    try {
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        const result = await pool.query(
            `INSERT INTO checkout_sessions (user_id, items, expires_at)
             VALUES ($1, $2, $3) RETURNING id`,
            [userId, JSON.stringify(items), expiresAt]
        );
        const sessionId = result.rows[0].id;
        res.status(201).json({ session_id: sessionId });
    } catch (err) {
        console.error('❌ Error creating checkout session:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// 2️⃣ Get Checkout Session Data (load on checkout.html)
const getCheckoutSession = async (req, res) => {
    const sessionId = req.params.sessionId;
    const userId = req.user.id;

    try {
        const result = await pool.query(
            `SELECT * FROM checkout_sessions WHERE id = $1 AND user_id = $2 AND status = 'pending'`,
            [sessionId, userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Session not found or expired' });
        }
        const session = result.rows[0];
        if (new Date(session.expires_at) < new Date()) {
            return res.status(410).json({ message: 'Session expired' });
        }
        res.json(session);
    } catch (err) {
        console.error('❌ Error loading session:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// 3️⃣ Finalize Order using session data
const finalizeOrder = async (req, res) => {
    const sessionId = req.body.session_id;
    const userId = req.user.id;
    const {
        address_id,
        use_saved,
        full_name,
        phone,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        save_address
    } = req.body;

    try {
        const sessionRes = await pool.query(
            `SELECT * FROM checkout_sessions WHERE id = $1 AND user_id = $2 AND status = 'pending'`,
            [sessionId, userId]
        );
        if (sessionRes.rows.length === 0) {
            return res.status(400).json({ message: 'Invalid session' });
        }

        const session = sessionRes.rows[0];

        // 🔐 Expiry Check
        if (new Date(session.expires_at) < new Date()) {
            return res.status(410).json({ message: 'Session expired. Please start checkout again.' });
        }

        let shippingAddress;

        if (use_saved) {
            // ✅ Use existing address
            if (!address_id) {
                return res.status(400).json({ message: 'Saved address ID missing' });
            }

            const addressRes = await pool.query(
                `SELECT * FROM user_addresses WHERE id = $1 AND user_id = $2`,
                [address_id, userId]
            );
            if (addressRes.rows.length === 0) {
                return res.status(404).json({ message: 'Saved address not found' });
            }

            shippingAddress = addressRes.rows[0];

        } else {
            // ✅ Use new address
            if (!full_name || !phone || !address_line1 || !city || !state || !postal_code) {
                return res.status(400).json({ message: 'Missing required address fields' });
            }

            shippingAddress = {
                full_name,
                address_line1,
                address_line2,
                city,
                state,
                postal_code,
                phone,
                country: "India" // default if needed
            };
        }

        // 🧮 Total
        const orderItems = session.items;
        let totalAmount = 0;
        for (const item of orderItems) {
            const prodRes = await pool.query(`SELECT price FROM products WHERE id = $1`, [item.product_id]);
            if (prodRes.rows.length === 0) continue;
            totalAmount += prodRes.rows[0].price * item.quantity;
        }

        const orderRes = await pool.query(
            `INSERT INTO orders (user_id, total_amount) VALUES ($1, $2) RETURNING id`,
            [userId, totalAmount]
        );
        const orderId = orderRes.rows[0].id;

        // 🧾 Items
        for (const item of orderItems) {
            await pool.query(
                `INSERT INTO order_items (order_id, product_id, quantity) VALUES ($1, $2, $3)`,
                [orderId, item.product_id, item.quantity]
            );
        }

        // 🏠 Insert shipping address (new or saved)
        await pool.query(
            `INSERT INTO shipping_addresses (
                user_id, order_id, full_name, address_line1, address_line2,
                city, state, postal_code, country, phone
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [
                userId,
                orderId,
                shippingAddress.full_name,
                shippingAddress.address_line1,
                shippingAddress.address_line2,
                shippingAddress.city,
                shippingAddress.state,
                shippingAddress.postal_code,
                shippingAddress.country,
                shippingAddress.phone
            ]
        );
        console.log("use: ",use_saved," savad:",save_address);
        
        // 📌 Save address if asked
        if (!use_saved && save_address) {
            await pool.query(
                `INSERT INTO user_addresses
                (user_id, label, full_name, address_line1, address_line2, city, state, postal_code, phone)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [userId, 'Saved', full_name, address_line1, address_line2, city, state, postal_code, phone]
            );
        }

        // ✅ Mark session used
        await pool.query(`UPDATE checkout_sessions SET status = 'used' WHERE id = $1`, [sessionId]);

        res.status(201).json({ message: 'Order placed', order_id: orderId });

    } catch (err) {
        console.error('❌ Error finalizing order:', err);
        res.status(500).json({ message: 'Server error' });
    }
};


module.exports = {
    createCheckoutSession,
    getCheckoutSession,
    finalizeOrder
};
