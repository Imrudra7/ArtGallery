const router = require('express').Router();
const { createRazorpayOrder, verifyRazorpayPayment } = require('../controller/paymentController');
const verifyToken = require('../middleware/authMiddleware');



router.post('/create-order',verifyToken, createRazorpayOrder);
router.post('/verify-razorpay-payment', verifyToken, verifyRazorpayPayment);


module.exports = router;