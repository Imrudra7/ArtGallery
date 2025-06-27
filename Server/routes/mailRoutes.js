const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/authMiddleware');
const { sendInvoiceEmail } = require('../controller/mailController');

router.post('/send-invoice', verifyToken, sendInvoiceEmail);

module.exports = router;
