const router = require('express').Router();
const verifyToken = require('../middleware/authMiddleware');


const updateQuantity = require('../controller/updateQuantityController');
const addToCart = require('../controller/addCartController');
const {showcart, clearCart} = require('../controller/mycartcontroller');


router.get('/showmycart',verifyToken, showcart);
router.post('/addtocart', verifyToken, addToCart);
router.post('/updateQuantity', verifyToken, updateQuantity);
router.delete('/clearCart', verifyToken, clearCart);

module.exports = router;