const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/authMiddleware');
const {loadOrders, loadOrderDetail} = require('../controller/orderController');

router.get('/orders',verifyToken, loadOrders);

router.post('/order-detail', verifyToken,loadOrderDetail);


module.exports = router;