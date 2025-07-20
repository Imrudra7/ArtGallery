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
    console.log("Inside finalize", req.body);

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
        save_address,
        payment_method,
        razorpay_order_id,
        razorpay_payment_id
    } = req.body;
    if (!payment_method || !['COD', 'UPI'].includes(payment_method)) {
        return res.status(400).json({ message: 'Invalid payment method' });
    }
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
        const isUPI = payment_method === 'UPI';
        const paidAt = isUPI ? new Date() : null;
        const paymentStatus = isUPI ? 'paid' : 'pending';
        const paymentReference = isUPI ? razorpay_payment_id : null;
        let orderRes;

        if (isUPI) {
            orderRes = await pool.query(
                `INSERT INTO orders (user_id, total_amount,payment_status, razorpay_order_id) VALUES ($1, $2, $3, $4) RETURNING id`,
                [userId, totalAmount, paymentStatus, razorpay_order_id]
            );
        } else {
            // COD or other methods
            orderRes = await pool.query(
                `INSERT INTO orders (user_id, total_amount) VALUES ($1, $2) RETURNING id`,
                [userId, totalAmount]
            );
        }

        const orderId = orderRes.rows[0].id;

        // 🧾 Items
        for (const item of orderItems) {
            await pool.query(
                `INSERT INTO order_items (order_id, product_id, quantity) VALUES ($1, $2, $3)`,
                [orderId, item.product_id, item.quantity]
            );
        }
        // MAIN PAYMENT AREA


        await pool.query(
            `INSERT INTO payments 
        (order_id, payment_method, payment_status, payment_reference, paid_at)
            VALUES ($1, $2, $3, $4, $5)`,
            [
                orderId,
                payment_method,
                paymentStatus,
                paymentReference,
                paidAt
            ]
        );

        await clearCartAfterOrder(userId);

        // Payment area end
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
        console.log("use: ", use_saved, " savad:", save_address);

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

const finalizeOrderHelper = async (payload) => {
    console.log("Inside finalize", payload);

    const sessionId = payload.session_id;
    const userId = payload.userId;
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
        save_address,
        payment_method,
        razorpay_order_id,
        razorpay_payment_id
    } = payload;
    if (!payment_method || !['COD', 'UPI'].includes(payment_method)) {
        return { success: false, status: 400, message: 'Invalid payment method' };
    }
    try {
        const sessionRes = await pool.query(
            `SELECT * FROM checkout_sessions WHERE id = $1 AND user_id = $2 AND status = 'pending'`,
            [sessionId, userId]
        );
        if (sessionRes.rows.length === 0) {
            return { success: false, status: 400, message: 'Invalid session' };

        }

        const session = sessionRes.rows[0];

        // 🔐 Expiry Check
        if (new Date(session.expires_at) < new Date()) {
            return { success: false, status: 410, message: 'Session expired. Please start checkout again.' };
        }

        let shippingAddress;

        if (use_saved) {
            // ✅ Use existing address
            if (!address_id) {
                return { success: false, status: 400, message: 'Saved address ID missing' };
            }

            const addressRes = await pool.query(
                `SELECT * FROM user_addresses WHERE id = $1 AND user_id = $2`,
                [address_id, userId]
            );
            if (addressRes.rows.length === 0) {
                return { success: false, status: 404, message: 'Saved address not found' };
            }

            shippingAddress = addressRes.rows[0];

        } else {
            // ✅ Use new address
            if (!full_name || !phone || !address_line1 || !city || !state || !postal_code) {
                return { status: 400, message: 'Missing required address fields' };
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

        let orderRes;
        const isUPI = payment_method === 'UPI';
        const paidAt = isUPI ? new Date() : null;
        const paymentStatus = isUPI ? 'paid' : 'pending';
        const paymentReference = isUPI ? razorpay_payment_id : null;
        if (isUPI) {
            orderRes = await pool.query(
                `INSERT INTO orders (user_id, total_amount, razorpay_order_id) VALUES ($1, $2, $3) RETURNING id`,
                [userId, totalAmount, razorpay_order_id]
            );
        } else {
            // COD or other methods
            orderRes = await pool.query(
                `INSERT INTO orders (user_id, total_amount) VALUES ($1, $2) RETURNING id`,
                [userId, totalAmount]
            );
        }

        const orderId = orderRes.rows[0].id;

        // 🧾 Items
        for (const item of orderItems) {
            await pool.query(
                `INSERT INTO order_items (order_id, product_id, quantity) VALUES ($1, $2, $3)`,
                [orderId, item.product_id, item.quantity]
            );
        }
        // MAIN PAYMENT AREA

        await pool.query(
            `INSERT INTO payments 
        (order_id, payment_method, payment_status, payment_reference, paid_at)
            VALUES ($1, $2, $3, $4, $5)`,
            [
                orderId,
                payment_method,
                paymentStatus,
                paymentReference,
                paidAt
            ]
        );
        await clearCartAfterOrder(userId);


        // Payment area end
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
        console.log("use: ", use_saved, " savad:", save_address);

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

        return { success: true, status: 201, message: 'Order placed', order_id: orderId };

    } catch (err) {
        console.error('❌ Error finalizing order:', err);
        return { success: false, status: 500, message: 'Server error' };
    }
};
const clearCartAfterOrder = async (userId) => {
    try {
        // 1. Get cart_id using user_id
        const cartRes = await pool.query(
            'SELECT id FROM cart WHERE user_id = $1',
            [userId]
        );

        if (cartRes.rows.length === 0) {
            console.log('No cart found for this user.');
            return;
        }

        const cartId = cartRes.rows[0].id;

        // 2. Delete all items from cart_items
        await pool.query(
            'DELETE FROM cart_items WHERE cart_id = $1',
            [cartId]
        );

        // 3. Optionally delete cart itself
        await pool.query(
            'DELETE FROM cart WHERE id = $1',
            [cartId]
        );

        console.log('Cart and items cleared.');
    } catch (error) {
        console.error('Error clearing cart:', error);
        throw error;
    }
};

module.exports = {
    createCheckoutSession,
    getCheckoutSession,
    finalizeOrder,
    finalizeOrderHelper
};
