const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.WEBSITE_EMAIL,
        pass: process.env.WEBSITE_EMAIL_PASS
    }
});
module.exports = transporter;