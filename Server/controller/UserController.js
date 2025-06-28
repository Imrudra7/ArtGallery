const db = require('../db');
const bcrypt = require('bcrypt');

const loadUserProfile = async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const result = await db.query(
            `SELECT id, name, email, phone, created_at, last_login FROM users WHERE id = $1`,
            [userId]
        );

        const rows = result.rows;

        if (rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const totalOrdersResult = await db.query(
            `SELECT COUNT(*) AS total_orders FROM orders WHERE user_id = $1`,
            [userId]
        );

        const user = rows[0];
        user.total_orders = totalOrdersResult.rows[0].total_orders;

        res.json(user);
    } catch (err) {
        console.error("❌ Error loading user profile:", err);
        res.status(500).json({ message: "Internal server error" });
    }
};


const updateUserProfile = async (req, res) => {
    try {


        const userId = req.user.id;
        const { name, phone } = req.body;

        if (!name || !phone) {
            return res.status(400).json({ message: "Full name and phone are required" });
        }

        const updateQuery = `
            UPDATE users
            SET name = $1, phone = $2, updated_at = NOW()
            WHERE id = $3
            RETURNING id, name, email, phone, updated_at
        `;

        const result = await db.query(updateQuery, [name, phone, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            message: "Profile updated successfully",
            user: result.rows[0]
        });
    } catch (err) {
        console.error("❌ Error updating user profile:", err);
        res.status(500).json({ message: "Server error while updating profile" });
    }
};
const addAddress = async (req, res) => {
    const userId = req.user.id;
    const {
        label,
        full_name,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        phone,
        is_default
    } = req.body;

    try {

        if (is_default) {
            await db.query(`UPDATE user_addresses SET is_default = false WHERE user_id = $1`, [userId]);
        }

        const result = await db.query(`
            INSERT INTO user_addresses (
                user_id, label, full_name, address_line1, address_line2, city,
                state, postal_code, phone, is_default
            ) VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10
            ) RETURNING *
        `, [userId, label, full_name, address_line1, address_line2, city, state, postal_code, phone, is_default]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("❌ Error adding address:", err);
        res.status(500).json({ message: "Failed to add address." });
    }
};

const loadMyAddresses = async (req, res) => {
    const userId = req.user.id;

    try {
        const result = await db.query(
            `SELECT 
                id, 
                label, 
                address_line1, 
                address_line2, 
                city, 
                state, 
                postal_code, 
                phone, 
                is_default 
            FROM user_addresses 
            WHERE user_id = $1 
            ORDER BY is_default DESC, created_at DESC`,
            [userId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching addresses:", err);
        res.status(500).json({ message: "Failed to load addresses" });
    }
};
const deleteAddress = async (req, res) => {
    const userId = req.user.id;
    const addressId = req.params.id;

    try {
        const result = await db.query(
            `DELETE FROM user_addresses WHERE id = $1 AND user_id = $2`,
            [addressId, userId]
        );
        res.status(200).json({ message: "✅ Address deleted" });
    } catch (err) {
        console.error("❌ Error deleting address:", err);
        res.status(500).json({ message: "Failed to delete address." });
    }
};
const updateAddress = async (req, res) => {
    const userId = req.user.id;
    const addressId = req.params.id;
    const { address_line1, city, state, postal_code, phone } = req.body;

    try {
        const result = await db.query(
            `UPDATE user_addresses 
             SET address_line1 = $1, city = $2, state = $3, postal_code = $4, phone = $5, updated_at = NOW()
             WHERE id = $6 AND user_id = $7 RETURNING *`,
            [address_line1, city, state, postal_code, phone, addressId, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Address not found or not authorized' });
        }

        res.json({ message: '✅ Address updated successfully' });
    } catch (err) {
        console.error("Error updating address:", err);
        res.status(500).json({ message: "❌ Failed to update address" });
    }
};

const changePassword = async (req, res) => {
    const userId = req.user.id;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.trim().length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long." });
    }

    try {
        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password
        await db.query(
            `UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2`,
            [hashedPassword, userId]
        );

        res.json({ message: "Password updated successfully." });
    } catch (err) {
        console.error("❌ Error changing password:", err);
        res.status(500).json({ message: "Server error while changing password." });
    }
};


const deactivateAccount = async (req, res) => {
    const userId = req.user.id;

    try {
        await db.query(`DELETE FROM users WHERE id = $1`, [userId]);
        res.json({ message: "Account permanently deleted." });
    } catch (err) {
        console.error("❌ Error deleting account:", err);
        res.status(500).json({ message: "Server error while deleting account." });
    }
};



module.exports = { loadUserProfile, updateUserProfile, loadMyAddresses, addAddress, deleteAddress, updateAddress, changePassword, deactivateAccount };
