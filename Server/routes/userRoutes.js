const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/authMiddleware');
const { loadOrders, loadOrderDetail } = require('../controller/orderController');
const { loadUserProfile, updateUserProfile, loadMyAddresses, addAddress, deleteAddress, updateAddress, changePassword, deactivateAccount } = require('../controller/UserController');

router.get('/orders', verifyToken, loadOrders);

router.post('/order-detail', verifyToken, loadOrderDetail);
router.get('/profile', verifyToken, loadUserProfile);
router.put('/update', verifyToken, updateUserProfile);
router.get('/myaddresses', verifyToken, loadMyAddresses);
router.post('/add-address', verifyToken, addAddress);
router.delete('/addresses/:id', verifyToken, deleteAddress);
router.put('/update-addresses/:id', verifyToken, updateAddress);
router.post('/change-password', verifyToken, changePassword);
router.delete('/deactivate', verifyToken, deactivateAccount)

module.exports = router;