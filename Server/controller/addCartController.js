const pool = require('../db'); 

const addToCart = async (req, res) => {
    const userId = req.user.id;
    const { product_id, quantity } = req.body;

    try {
        
        let result = await pool.query('SELECT id FROM cart WHERE user_id = $1', [userId]);

        let cartId;
        if (result.rows.length === 0) {
            
            const insertCart = await pool.query(
                'INSERT INTO cart (user_id) VALUES ($1) RETURNING id',
                [userId]
            );
            cartId = insertCart.rows[0].id;
        } else {
            cartId = result.rows[0].id;
        }

        
        const existingItem = await pool.query(
            'SELECT quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2',
            [cartId, product_id]
        );

        if (existingItem.rows.length > 0) {
            // Update quantity
            await pool.query(
                'UPDATE cart_items SET quantity = quantity + $1 WHERE cart_id = $2 AND product_id = $3',
                [quantity, cartId, product_id]
            );
        } else {
            // Insert new item
            await pool.query(
                'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1, $2, $3)',
                [cartId, product_id, quantity]
            );
        }

        res.json({ message: 'Item added to cart successfully.' });
    } catch (err) {
        console.error('❌ Error adding to cart:', err.message);
        res.status(500).json({ message: 'Failed to add item to cart.' });
    }
};


module.exports = addToCart;