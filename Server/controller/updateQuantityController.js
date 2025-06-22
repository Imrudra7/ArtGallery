const pool = require('../db');

const updateQuantity = async (req, res) => {
    const userId = req.user.id;
    const { productId, operation } = req.body;

    try {
        // Get cart ID
        const cartResult = await pool.query(
            `SELECT id FROM cart WHERE user_id = $1`,
            [userId]
        );

        if (cartResult.rows.length === 0) {
            return res.status(404).json({ message: "Cart not found." });
        }

        const cartId = cartResult.rows[0].id;

        if (operation === 'increase') {
            await pool.query(
                `UPDATE cart_items SET quantity = quantity + 1 WHERE cart_id = $1 AND product_id = $2`,
                [cartId, productId]
            );
        } else if (operation === 'decrease') {
            const check = await pool.query(
                `SELECT quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2`,
                [cartId, productId]
            );

            if (check.rows[0].quantity <= 1) {
                await pool.query(
                    `DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2`,
                    [cartId, productId]
                );
            } else {
                await pool.query(
                    `UPDATE cart_items SET quantity = quantity - 1 WHERE cart_id = $1 AND product_id = $2`,
                    [cartId, productId]
                );
            }
        }else if(operation === 'remove') {
            await pool.query(
                `DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2`,
                [cartId, productId]
            );
        }
         else {
            return res.status(400).json({ message: 'Invalid operation.' });
        }

        // Return updated cart
        const updatedCart = await pool.query(`
            SELECT p.id, p.name, p.price, p.image_url, ci.quantity
            FROM cart_items ci
            JOIN cart c ON ci.cart_id = c.id
            JOIN products p ON ci.product_id = p.id
            WHERE c.user_id = $1
        `, [userId]);

        res.json(updatedCart.rows);

    } catch (err) {
        console.error("Error updating quantity:", err);
        res.status(500).json({ message: "Server error." });
    }
};

module.exports = updateQuantity;