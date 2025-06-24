const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

function verifyToken(req, res, next) {
    console.log("Verifing token");
    
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1]; // 'Bearer <token>'

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Attach to req for later use
        next();
    } catch (err) {
        return res.status(403).json({ message: 'Invalid or expired token.', err });
    }
}

module.exports = verifyToken;
