// Server/routes/upload.js
const express = require('express');
const router = express.Router();
const upload = require('../middleware/Multer');

router.post('/upload', upload.single('image'), (req, res) => {
  try {
    return res.status(200).json({
      imageUrl: req.file.path,
      publicId: req.file.filename,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = router;
