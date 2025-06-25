const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/authMiddleware');
const loadOrders = require('../controller/orderController');

router.get('/orders',verifyToken, loadOrders);




module.exports = router;