const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uploadRoutes = require('./routes/upload');
app.use('/api', uploadRoutes);




app.get('/', (req, res) => {
    res.send('API is live');
});


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
