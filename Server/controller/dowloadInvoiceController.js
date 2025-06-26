const pool = require('../db');
const PDFDocument = require('pdfkit');
const path = require('path');

async function getOrderDetailsFromDB(orderId, userId) {
    const { rows } = await pool.query(`
    SELECT
      o.id AS order_id,
      o.created_at,
      o.total_amount,
      o.status,
      sa.full_name,
      sa.phone,
      sa.address_line1,
      sa.address_line2,
      sa.city,
      sa.state,
      sa.postal_code,
      p.paid_at,
      o.total_amount - 50 + 50 AS subtotal, -- dummy logic, update as per your logic
      50 AS shipping_fee,
      50 AS discount,
      o.total_amount AS grand_total,
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'product_name', pr.name,
          'price', pr.price,
          'quantity', oi.quantity
        )
      ) AS items
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN products pr ON pr.id = oi.product_id
    LEFT JOIN shipping_addresses sa ON sa.order_id = o.id
    LEFT JOIN payments p ON p.order_id = o.id
    WHERE o.id = $1 AND o.user_id = $2
    GROUP BY o.id, sa.full_name, sa.phone, sa.address_line1, sa.address_line2, sa.city, sa.state, sa.postal_code, p.paid_at
  `, [orderId, userId]);

    if (rows.length === 0) throw new Error("Order not found");
    return rows[0];
}


function createInvoice(doc, order) {
    const imagePath = path.join(__dirname, '../image/logo.png');
    const imageWidth = 150;
    const imageHeight = 100;

    const pageWidth = doc.page.width;
    const x = (pageWidth - imageWidth) / 2;

    doc.image(imagePath, x, 40, {
        fit: [imageWidth, imageHeight],
        align: 'center',
        valign: 'center'
    });

    doc.y = 40 + imageHeight + 20;

    doc.fontSize(28)
        .fillColor('#2c3e50')
        .text("INVOICE", {
            align: 'center',
            underline: true,
            characterSpacing: 1
        });

    doc.moveDown(0.5);

    doc.fontSize(16)
        .fillColor('#34495e')
        .text("Mithila Art Gallery", {
            align: 'center'
        });

    doc.moveDown(1.5);

    doc.fontSize(12)
        .fillColor('#34495e');

    const detailY = doc.y;
    const detailStartX = doc.x;

    doc.text(`Invoice Number: #${order.order_id}`, detailStartX, detailY);
    doc.text(`Order ID: ${order.order_id}`, detailStartX, detailY + 15);
    doc.text(`Payment Status: ${order.paid_at ? 'Paid' : 'Unpaid'}`, detailStartX, detailY + 30);

    const detailRightColX = detailStartX + 200;
    doc.text(`Invoice Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, detailRightColX, detailY);
    doc.text(`Order Date: ${new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, detailRightColX, detailY + 15);
    doc.text(`Payment Date: ${order.paid_at ? new Date(order.paid_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}`, detailRightColX, detailY + 30);

    doc.y = Math.max(doc.y, detailY + 30 + 15);
    doc.moveDown(1.5);


    doc.fontSize(14)
        .fillColor('#2c3e50')
        .text("Billing Information:", { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(12)
        .fillColor('#34495e');

    doc.text(`Customer Name: ${order.full_name}`);
    doc.text(`Phone Number: ${order.phone}`);
    doc.text(`Billing Address: ${order.address_line1}, ${order.address_line2 ? order.address_line2 + ', ' : ''}${order.city}, ${order.state} - ${order.postal_code}`);

    doc.moveDown(2);

    doc.fontSize(14)
        .fillColor('#2c3e50')
        .text("Items Purchased:", { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(12)
        .fillColor('#34495e');

    const tableTop = doc.y;
    const itemX = 50;
    const qtyX = 350;
    const priceX = 420;
    const totalX = 500;

    doc.font('Helvetica-Bold')
        .text('Product Name', itemX, tableTop, { width: 280 })
        .text('Qty', qtyX, tableTop, { width: 50, align: 'center' })
        .text('Unit Price (₹)', priceX, tableTop, { width: 70, align: 'right' })
        .text('Total (₹)', totalX, tableTop, { width: 60, align: 'right' });

    doc.font('Helvetica')
        .strokeColor('#aaaaaa')
        .lineWidth(1)
        .moveTo(itemX, tableTop + 20)
        .lineTo(pageWidth - 50, tableTop + 20)
        .stroke();

    doc.moveDown(1);

    let currentY = doc.y;
    order.items.forEach((item) => {
        const itemTotal = (item.price * item.quantity).toFixed(2);
        doc.text(item.product_name, itemX, currentY, { width: 280 })
            .text(item.quantity.toString(), qtyX, currentY, { width: 50, align: 'center' })
            .text(item.price.toFixed(2), priceX, currentY, { width: 70, align: 'right' })
            .text(itemTotal, totalX, currentY, { width: 60, align: 'right' });
        currentY += 20;
    });

    doc.moveDown(2);

    
    // Adjusted Summary Totals Section
    
        doc.fontSize(12)
            .fillColor('#34495e');

    // **Adjusted X coordinates to shift the entire block further left**
    // Decreased from 300 to 250 (you can adjust this value as needed)
    const totalLabelStartX = 250;
    // Keep the same relative distance from label start to value end
    const totalValueEndX = totalLabelStartX + 250; // Maintains a consistent width for the total block

    let summaryY = doc.y;

    doc.text(`Subtotal:`, totalLabelStartX, summaryY, { width: 140, align: 'right' });
    doc.text(`₹${order.subtotal.toFixed(2)}`, totalValueEndX, summaryY, { width: 60, align: 'right' });
    summaryY += 15;

    doc.text(`Shipping Fee:`, totalLabelStartX, summaryY, { width: 140, align: 'right' });
    doc.text(`₹${order.shipping_fee.toFixed(2)}`, totalValueEndX, summaryY, { width: 60, align: 'right' });
    summaryY += 15;

    doc.text(`Discount:`, totalLabelStartX, summaryY, { width: 140, align: 'right' });
    doc.text(`- ₹${order.discount.toFixed(2)}`, totalValueEndX, summaryY, { width: 60, align: 'right' });
    summaryY += 15;

    doc.font('Helvetica-Bold')
        .strokeColor('#2c3e50')
        .lineWidth(2)
        .moveTo(totalLabelStartX, summaryY + 5)
        .lineTo(totalValueEndX + 5, summaryY + 5)
        .stroke();
    summaryY += 10;

    doc.fontSize(16)
        .fillColor('#e74c3c');
    doc.text(`GRAND TOTAL:`, totalLabelStartX, summaryY, { width: 140, align: 'right' });
    doc.text(`₹${order.grand_total.toFixed(2)}`, totalValueEndX, summaryY, { width: 60, align: 'right' });

    doc.moveDown(3);

    // ---
    // ### Footer Section
    // ---
        doc.fontSize(10)
            .fillColor('#7f8c8d');

    const footerWidth = 400;
    const footerX = (pageWidth - footerWidth) / 2;

    let footerY = doc.y;

    doc.text("Thank you for your purchase from Mithila Art Gallery!", footerX, footerY, { align: 'center', width: footerWidth });
    footerY += 15;

    const supportEmail = process.env.SUPPORT_EMAIL || 'support@mithilaartgallery.com';
    const websiteURL = process.env.WEBSITE_URL || 'https://www.mithilaartgallery.com';

    doc.fillColor('blue')
        .text(`For any queries, contact us at ${supportEmail}`, footerX, footerY, {
            align: 'center',
            link: `mailto:${supportEmail}`,
            underline: true,
            width: footerWidth
        });
    footerY += 15;

    doc.text(`Visit our website: ${websiteURL}`, footerX, footerY, {
        align: 'center',
        link: `${websiteURL}`,
        underline: true,
        width: footerWidth
    });

    doc.end();
}
const generateInvoice = async (req, res) => {
    const { orderId } = req.body;
    const userId = req.user.id;

    try {
        const order = await getOrderDetailsFromDB(orderId, userId);
        const doc = new PDFDocument({ margin: 50 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${orderId}.pdf`);
        doc.pipe(res);
        createInvoice(doc, order);
    } catch (err) {
        console.error("Error generating invoice:", err);

        // ✅ Only write to res if headers NOT already sent
        if (!res.headersSent) {
            res.status(500).json({ message: "Failed to generate invoice" });
        } else {
            // ✅ Stream error: end PDF gracefully if not ended
            res.end();
        }
    }
};



module.exports = { generateInvoice };