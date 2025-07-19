// backend/controllers/paymentController.js
const Razorpay = require("razorpay");
const pool = require('../db');

const crypto = require("crypto");

const { finalizeOrderHelper } = require('./checkoutsessioncontroller')

const instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});
const createRazorpayOrder = async (req, res) => {
    const {
        session_id,
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
        payment_method
    } = req.body;

    const userId = req.user.id;

    if (!payment_method || payment_method !== 'UPI') {
        return res.status(400).json({ message: 'Invalid payment method for UPI flow' });
    }

    try {
        // ✅ Validate Session
        const sessionRes = await pool.query(
            `SELECT * FROM checkout_sessions WHERE id = $1 AND user_id = $2 AND status = 'pending'`,
            [session_id, userId]
        );
        if (sessionRes.rows.length === 0) {
            return res.status(400).json({ message: 'Invalid or expired session' });
        }

        const session = sessionRes.rows[0];
        if (new Date(session.expires_at) < new Date()) {
            return res.status(410).json({ message: 'Session expired. Please start checkout again.' });
        }

        // 🧮 Total Calculation
        const orderItems = session.items;
        let totalAmount = 0;
        for (const item of orderItems) {
            const prodRes = await pool.query(`SELECT price FROM products WHERE id = $1`, [item.product_id]);
            if (prodRes.rows.length === 0) continue;
            totalAmount += prodRes.rows[0].price * item.quantity;
        }

        // 💸 Create Razorpay Order
        const razorpayOrder = await instance.orders.create({
            amount: totalAmount * 100,
            currency: "INR",
            receipt: "rcpt_" + Date.now(),
        });

        // 📨 Respond with Razorpay + required order data
        res.status(200).json({
            success: true,
            razorpayOrder,
            totalAmount,
            session_id,
            userId,
            payment_method,
            use_saved,
            save_address,
            address_id,
            full_name,
            phone,
            address_line1,
            address_line2,
            city,
            state,
            postal_code,
        });

    } catch (err) {
        console.error("❌ Error in createRazorpayOrder:", err);
        res.status(500).json({ message: 'Server error' });
    }
};

const verifyRazorpayPayment = async (req, res) => {
    console.log("Inside payment verification.");
    
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            session_id,           // extra fields needed by finalizeOrder
            userId,
            payment_method,
            use_saved,
            save_address,
            address_id,
            full_name,
            phone,
            address_line1,
            address_line2,
            city,
            state,
            postal_code,
            totalAmount,
        } = req.body;
        console.log({
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            session_id,           // extra fields needed by finalizeOrder
            userId,
            payment_method,
            use_saved,
            save_address,
            address_id,
            full_name,
            phone,
            address_line1,
            address_line2,
            city,
            state,
            postal_code,
            totalAmount,
        });
        

        // ✅ Signature Verification
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: "Invalid signature!" });
        }
        console.log("Signature verified.");
        

        // ✅ If verified, call finalizeOrder
        const finalizeResult = await finalizeOrderHelper({
            session_id,
            userId: req.user.id,
            payment_method, 
            use_saved,
            save_address,
            address_id,
            full_name,
            phone,
            address_line1,
            address_line2,
            city,
            state,
            postal_code,
            totalAmount,
            payment_status: "Paid",
            razorpay_order_id,
            razorpay_payment_id,
        });
        console.log("Payment done through RAZORPAY : ORDER SUCCESS");
        

        return res.status(200).json({ success: true, ...finalizeResult });

    } catch (err) {
        console.error("❌ Error in verifyRazorpayPayment:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};




module.exports = { instance, createRazorpayOrder, verifyRazorpayPayment };
