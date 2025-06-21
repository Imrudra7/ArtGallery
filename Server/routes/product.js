// Server/routes/products.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const upload = require('../middleware/Multer');

router.post('/addNewProduct', upload.single('image'), async (req, res) => {
    const { name, description, price, stock, art_form, medium, material, motif, size, care_instructions, origin, note } = req.body;

    const image_url = req.file?.path;
    const publicId = req.file?.filename;
    console.log("Upload Response:", req.file); // or uploadResult if done manually

    try {
        const newProduct = await pool.query(
            `INSERT INTO products 
            (name, description, price, image_url, stock, art_form, medium, material, motif, size, care_instructions, origin, note)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *`,
            [name, description, price, image_url, stock, art_form, medium, material, motif, size, care_instructions, origin, note]
        );

        return res.status(201).json({ success: true, product: newProduct.rows[0] });
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
        return res.status(500).json({ error: "Failed to add product" + err });
    }
});

router.get('/products/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('❌ Error fetching product by ID:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
