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
        console.error('Error fetching orders:', err);
        res.status(500).json({ message: 'Server error while fetching orders.' });
    }
};

const loadOrderDetail = async (req, res) => {
    const { orderId } = req.body;
    console.log("LoadOrdder: " + orderId);

    if (!orderId){
        console.log("not order Id");
        
        return res.status(404).json({ message: 'orderId invalid' });
    }
    try {
        const result = await pool.query(`
                    SELECT 
                o.id AS order_id,
                o.created_at,
                o.status,
                o.total_amount,

                
                coalesce(pay.payment_method, 'N/A'),
                coalesce(pay.payment_status,'N/A'),
                pay.paid_at,

                
                COALESCE(sa.full_name, 'N/A')       AS full_name,
            COALESCE(sa.address_line1, 'N/A')   AS address_line1,
            COALESCE(sa.address_line2, 'N/A')   AS address_line2,
            COALESCE(sa.city, 'N/A')            AS city,
            COALESCE(sa.state, 'N/A')           AS state,
            COALESCE(sa.postal_code, 'N/A')     AS postal_code,
            COALESCE(sa.phone, 'N/A')           AS phone,

                
                (
                    SELECT JSON_AGG(
                        JSON_BUILD_OBJECT(
                            'product_name', p.name,
                            'image_url', p.image_url,
                            'price', p.price,
                            'quantity', oi.quantity,
                            'seller', 'Mithila Art Gallery'
                        )
                    )
                    FROM order_items oi
                    JOIN products p ON p.id = oi.product_id
                    WHERE oi.order_id = o.id
                ) AS items,

                
                (
                    SELECT SUM(p.price * oi.quantity)
                    FROM order_items oi
                    JOIN products p ON p.id = oi.product_id
                    WHERE oi.order_id = o.id
                ) AS subtotal,

                
                50 AS shipping_fee,
                50 AS discount,

                
                ((SELECT SUM(p.price * oi.quantity)
                FROM order_items oi
                JOIN products p ON p.id = oi.product_id
                WHERE oi.order_id = o.id) + 50 - 50) AS grand_total

            FROM orders o
            LEFT JOIN shipping_addresses sa ON sa.order_id = o.id
            LEFT JOIN payments pay ON pay.order_id = o.id
            WHERE o.id = $1 

        `, [orderId]);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ message: 'Server error while fetching order.' });
    }
};

module.exports = { loadOrders, loadOrderDetail };