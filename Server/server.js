require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

//const pool = require('./db');
const uploadRoutes = require('./routes/upload');
const productRoutes = require('./routes/product');
const accountRoutes = require('./routes/account');
const cartRoutes = require('./routes/cartRoutes');





app.use('/api', uploadRoutes);
app.use('/api', productRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/cart', cartRoutes);



app.get('/', (req, res) => {
    res.send('API is live');
});


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
