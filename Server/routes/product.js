// Server/routes/products.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const upload = require('../middleware/Multer');

router.post('/products', upload.single('image'), async (req, res) => {
    const { name, description, price, stock } = req.body;
    const image_url = req.file?.path;
    const publicId = req.file?.filename;
    console.log("Upload Response:", req.file); // or uploadResult if done manually

    try {
        const newProduct = await pool.query(
            `INSERT INTO products (name, description, price, image_url, stock)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [name, description, price, image_url, stock]
        );
        res.status(201).json(newProduct.rows[0]);
    } catch (err) {
        console.error(err.message);
        if (publicId) {
            try {
                await cloudinary.uploader.destroy(publicId);
                console.log("🧹 Image deleted from Cloudinary:", publicId);
            } catch (deleteErr) {
                console.error("❌ Failed to delete from Cloudinary:", deleteErr.message);
            }
        }
        res.status(500).json({ error: "Failed to add product" });
    }
});

module.exports = router;
