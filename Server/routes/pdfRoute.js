const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/authMiddleware');
const { generateInvoice } = require('../controller/dowloadInvoiceController');



router.post('/generateInvoice',verifyToken, generateInvoice);



module.exports = router;