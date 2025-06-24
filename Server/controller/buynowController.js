const pool = require('../db');

const buyNow = async (req, res) => {
    const userId = req.user.id;
    const { product_id, quantity, items } = req.body;

    try {
        let orderItems = [];

        // 🧠 1. If coming from cart (array of products)
        if (Array.isArray(items) && items.length > 0) {
            orderItems = items;
        }
        // 🧠 2. If coming from product detail (single product)
        else if (product_id && quantity) {
            orderItems = [{ product_id, quantity }];
        } else {
            return res.status(400).json({ message: "Invalid input. Provide either 'items' array or 'product_id' & 'quantity'." });
        }

        // 🧮 3. Calculate total
        let totalAmount = 0;
        for (const item of orderItems) {
            const product = await pool.query(
                `SELECT price FROM products WHERE id = $1`,
                [item.product_id]
            );
            if (product.rows.length === 0) {
                return res.status(404).json({ message: `Product ${item.product_id} not found.` });
            }
            totalAmount += product.rows[0].price * item.quantity;
        }

        // 🧾 4. Create new order
        const orderResult = await pool.query(
            `INSERT INTO orders (user_id, total_amount) VALUES ($1, $2) RETURNING id`,
            [userId, totalAmount]
        );
        const orderId = orderResult.rows[0].id;

        // 📦 5. Insert items into order_items table
        for (const item of orderItems) {
            await pool.query(
                `INSERT INTO order_items (order_id, product_id, quantity) VALUES ($1, $2, $3)`,
                [orderId, item.product_id, item.quantity]
            );
        }

        return res.status(201).json({
            message: "Order placed successfully",
            order_id: orderId
        });

    } catch (error) {
        console.error("Error in buyNow:", error);
        res.status(500).json({ message: "Server error during order placement" });
    }
};

module.exports = buyNow;
