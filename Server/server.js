require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


const uploadRoutes = require('./routes/upload');
const productRoutes = require('./routes/product');
const accountRoutes = require('./routes/account');
const cartRoutes = require('./routes/cartRoutes');
const userRoutes = require('./routes/userRoutes');
const pdfRoutes = require ('./routes/pdfRoute');
const mailRoutes = require('./routes/mailRoutes');
const checkoutSessionRoutes = require('./routes/checkoutSessionRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

app.use((req, res, next) => {
    console.log("🟢 METHOD:", req.method);
    console.log("🟢 BODY:", req.body);
    next();
});


app.use('/api/checkout', checkoutSessionRoutes);

app.use('/api', uploadRoutes);
app.use('/api', productRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/user', userRoutes);
app.use('/api/downloadPDF', pdfRoutes);
app.use('/api/mail', mailRoutes);
app.use('/api/razorpay',paymentRoutes);

app.get('/', (req, res) => {
    res.send('API is live');
});


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
