const express = require('express');
const router = express.Router();

const  loginUser  = require('../controller/loginController');

const  registerUser  = require('../controller/registerController');

router.post('/register', registerUser);


router.post('/login', loginUser);

module.exports = router;