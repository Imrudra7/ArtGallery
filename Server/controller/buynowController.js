const pool = require('../db');


const placeOrder = async (req, res) => {
    const userId = req.user.id;
    const {
        product_id,            // for single product checkout
        quantity,
        items,                 // for cart-based checkout
        addressId,             // existing saved address ID
        addressDetails,        // for adding new address on-the-fly
        paymentMethod = 'cod'  // default to COD
    } = req.body;

    try {
        let orderItems = [];

        // 🧠 1. Handle single product or cart items
        if (Array.isArray(items) && items.length > 0) {
            orderItems = items.map(item => ({
                product_id: item.id,
                quantity: item.quantity
            }));
        } else if (product_id && quantity) {
            orderItems = [{ product_id, quantity }];
        } else {
            return res.status(400).json({ message: "Invalid input. Provide either items[] or product_id & quantity." });
        }

        // 🧮 2. Calculate total price
        let totalAmount = 0;
        for (const item of orderItems) {
            const productRes = await pool.query(`SELECT price FROM products WHERE id = $1`, [item.product_id]);
            if (productRes.rows.length === 0) {
                return res.status(404).json({ message: `Product ID ${item.product_id} not found.` });
            }
            totalAmount += productRes.rows[0].price * item.quantity;
        }

        // 🧾 3. Insert into orders table
        const orderRes = await pool.query(
            `INSERT INTO orders (user_id, total_amount, payment_method, status)
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [userId, totalAmount, paymentMethod, paymentMethod === 'upi' ? 'Initiated' : 'Pending']
        );
        const orderId = orderRes.rows[0].id;

        // 📦 4. Insert into order_items table
        for (const item of orderItems) {
            await pool.query(
                `INSERT INTO order_items (order_id, product_id, quantity) VALUES ($1, $2, $3)`,
                [orderId, item.product_id, item.quantity]
            );
        }

        // 📮 5. Handle Shipping Address
        if (addressId) {
            await pool.query(
                `UPDATE shipping_addresses SET order_id = $1 WHERE id = $2`,
                [orderId, addressId]
            );
        } else if (addressDetails) {
            const {
                full_name,
                phone,
                address_line1,
                address_line2,
                city,
                state,
                postal_code,
                country = 'India'
            } = addressDetails;

            await pool.query(`
                INSERT INTO shipping_addresses 
                (user_id, order_id, full_name, phone, address_line1, address_line2, city, state, postal_code, country)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [userId, orderId, full_name, phone, address_line1, address_line2, city, state, postal_code, country]);
        } else {
            return res.status(400).json({ message: "No shipping address provided." });
        }

        // ✅ 6. Success Response
        res.status(201).json({
            message: "Order placed successfully!",
            order_id: orderId
        });

    } catch (err) {
        console.error("❌ Error placing order:", err);
        res.status(500).json({ message: "Server error while placing order." });
    }
};

module.exports = { placeOrder };


















// const buyNow = async (req, res) => {
//     const userId = req.user.id;
//     const { product_id, quantity, items } = req.body;

//     try {
//         let orderItems = [];

//         // 🧠 1. If coming from cart (array of products)
//         if (Array.isArray(items) && items.length > 0) {
            

//             orderItems = items.map(item => ({
//                 product_id: item.id,
//                 quantity: item.quantity
//             }));
//         }
//         // 🧠 2. If coming from product detail (single product)
//         else if (product_id && quantity) {
//             orderItems = [{ product_id, quantity }];
//         } else {
//             return res.status(400).json({ message: "Invalid input. Provide either 'items' array or 'product_id' & 'quantity'." });
//         }

//         // 🧮 3. Calculate total
//         let totalAmount = 0;
//         for (const item of orderItems) {
//             const product = await pool.query(
//                 `SELECT price FROM products WHERE id = $1`,
//                 [item.product_id]
//             );
//             if (product.rows.length === 0) {
//                 return res.status(404).json({ message: `Product ${item.product_id} not found.` });
//             }
//             totalAmount += product.rows[0].price * item.quantity;
//         }

//         // 🧾 4. Create new order
//         const orderResult = await pool.query(
//             `INSERT INTO orders (user_id, total_amount) VALUES ($1, $2) RETURNING id`,
//             [userId, totalAmount]
//         );
//         const orderId = orderResult.rows[0].id;

//         // 📦 5. Insert items into order_items table
//         for (const item of orderItems) {
//             await pool.query(
//                 `INSERT INTO order_items (order_id, product_id, quantity) VALUES ($1, $2, $3)`,
//                 [orderId, item.product_id, item.quantity]
//             );
//         }

//         return res.status(201).json({
//             message: "Order placed successfully",
//             order_id: orderId
//         });

//     } catch (error) {
//         console.error("Error in buyNow:", error);
//         res.status(500).json({ message: "Server error during order placement" });
//     }
// };

// module.exports = buyNow;
