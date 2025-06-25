const pool = require('../db');


const loadOrders = async (req, res) => {
    const userId = req.user.id; // `id` token se mila hai
    if (!userId)
        return res.status(404).json({ message: 'userId invalid' });
    try {
        const result = await pool.query(`
           SELECT
            o.id AS order_id,
            o.created_at,
            o.total_amount,
            o.status,
            COALESCE(sa.full_name, 'N/A') AS ship_to,
            COUNT(DISTINCT oi.product_id) AS total_unique_items,
            JSON_AGG(
                 JSON_BUILD_OBJECT(
                    'name', p.name,
                    'image_url', p.image_url
                )
            ) AS product_items
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        LEFT JOIN shipping_addresses sa ON sa.order_id = o.id
        WHERE o.user_id = $1
        GROUP BY o.id, o.created_at, o.total_amount, o.status, sa.full_name
        ORDER BY o.created_at DESC
        `, [userId]);

        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching cart:', err);
        res.status(500).json({ message: 'Server error while fetching order.' });
    }
};

module.exports = loadOrders;