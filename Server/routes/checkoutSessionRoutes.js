const express = require('express');
const router = express.Router();
const { createCheckoutSession, getCheckoutSession, finalizeOrder } = require('../controller/checkoutsessioncontroller');
const verifyToken = require('../middleware/authMiddleware');

// 🔒 Protected routes
router.post('/create', verifyToken, createCheckoutSession);
router.get('/:sessionId', verifyToken, getCheckoutSession);
router.post('/finalize', verifyToken,finalizeOrder);


module.exports = router;
