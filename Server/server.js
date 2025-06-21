const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./db');
const uploadRoutes = require('./routes/upload');
const productRoutes = require('./routes/product');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


app.use('/api', uploadRoutes);
app.use('/api', productRoutes);



app.get('/', (req, res) => {
    res.send('API is live');
});


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
