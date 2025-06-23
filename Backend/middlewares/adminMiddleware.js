const jwt = require('jsonwebtoken');
const adminModel = require('../models/admin.model');

module.exports = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            console.warn('[adminMiddleware] No token provided', { path: req.path });
            return res.status(401).json({ success: false, message: 'Không tìm thấy token' });
        }

        const decoded = jwt.verify(token, process.env.JWT_KEY);
        if (!decoded.id || decoded.role !== 'admin') {
            console.warn('[adminMiddleware] Invalid token or role', { token, role: decoded.role });
            return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
        }

        const admin = await adminModel.findById(decoded.id);
        if (!admin) {
            console.warn('[adminMiddleware] Admin not found', { id: decoded.id });
            return res.status(401).json({ success: false, message: 'Không tìm thấy quản trị viên' });
        }

        req.admin = { id: decoded.id };
        console.log('[adminMiddleware] Token verified, admin ID:', decoded.id);
        next();
    } catch (error) {
        console.error('[adminMiddleware] Error:', {
            message: error.message,
            path: req.path,
        });
        return res.status(401).json({ success: false, message: 'Token không hợp lệ' });
    }
};