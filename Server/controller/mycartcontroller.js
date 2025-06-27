
const pool = require('../db'); // PostgreSQL pool connection

const showcart = async (req, res) => {
    const userId = req.user.id; // `id` token se mila hai
    if (!userId)
        return res.status(404).json({ message: 'userId invalid' });
    try {
        const result = await pool.query(`
            SELECT
                p.id,
                p.name,
                p.price,
                p.image_url,
                ci.quantity
            FROM cart_items ci
            JOIN cart c ON ci.cart_id = c.id
            JOIN products p ON ci.product_id = p.id
            WHERE c.user_id = $1
        `, [userId]);

        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching cart:', err);
        res.status(500).json({ message: 'Server error while fetching cart.' });
    }
};

const clearCart = async (req, res) => {
    const userId = req.user.id;

    try {
        await pool.query(`DELETE FROM cart_items WHERE cart_id = (SELECT id FROM cart WHERE user_id = $1)`, [userId]);
        await pool.query(`DELETE FROM cart WHERE user_id = $1`, [userId]);

        res.status(200).json({ message: "Cart cleared successfully" });
    } catch (err) {
        console.error("❌ Error clearing cart:", err);
        res.status(500).json({ message: "Failed to clear cart" });
    }
};

module.exports = { showcart, clearCart };