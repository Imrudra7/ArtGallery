const PDFDocument = require('pdfkit');
const path = require('path');

const stream = require('stream');
const transporter = require('../utils/mailer');
const { createInvoice, getOrderDetailsFromDB } = require('./dowloadInvoiceController');

const WEBSITE_NAME = process.env.WEBSITE_NAME;
const WEBSITE_EMAIL = process.env.WEBSITE_EMAIL;

async function sendInvoiceEmail(req, res) {
    console.log("sendInvoiceEmail MEthod");

    const { orderId } = req.body;
    const userId = req.user.id;
    const userEmail = req.user.email;
    const order = await getOrderDetailsFromDB(orderId, userId);
    console.log(order, userEmail);

    try {
        

        // 1. PDF stream setup
        const doc = new PDFDocument({ margin: 50 });
        //const buffer = await getStream(doc);
        const getStream = (await import('get-stream')).default;
        const passthrough = new stream.PassThrough(); // create the output stream
        const pdfBufferPromise = getStream.buffer(passthrough); // buffer that output

        console.log("📤 piping doc to passthrough");
        doc.pipe(passthrough);

        console.log("✍ calling createInvoice...");
        createInvoice(doc, order);

        console.log("📦 calling doc.end()");
        //doc.end();

        const pdfBuffer = await pdfBufferPromise;

        // 2. Send email
        const mailOptions = {
            from: `"${WEBSITE_NAME}" <${WEBSITE_EMAIL}>`,
            to: userEmail,
            subject: `Invoice for Order #${order.order_id}`,
            text: `Thank you for your order! Please find your invoice attached.`,
            attachments: [
                {
                    filename: `invoice-${order.order_id}.pdf`,
                    content: pdfBuffer
                }
            ]
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Invoice sent to ${userEmail}`);
        res.status(200).json({ message: "Invoice sent successfully" });
    } catch (err) {
        console.error("❌ Failed to send invoice email:", err);
        throw new Error("Invoice email failed");
    }
}

module.exports = {
    sendInvoiceEmail
};
