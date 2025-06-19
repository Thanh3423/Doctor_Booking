const jwt = require('jsonwebtoken');

const adminAuth = (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            console.log('No token provided in Authorization header');
            return res.status(401).json({ message: 'Không có token, vui lòng đăng nhập' });
        }

        if (!process.env.JWT_KEY) {
            console.error('JWT_KEY not configured in environment variables');
            return res.status(500).json({ message: 'Lỗi cấu hình server: Khóa JWT không được thiết lập' });
        }

        const decoded = jwt.verify(token, process.env.JWT_KEY);
        console.log('Token decoded:', { id: decoded.id, role: decoded.role });

        if (decoded.role !== 'admin') {
            console.log(`Invalid role: ${decoded.role}`);
            return res.status(403).json({ message: 'Không có quyền truy cập, yêu cầu vai trò admin' });
        }

        req.admin = decoded;
        next();
    } catch (error) {
        console.error('Error in adminAuth middleware:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
        });
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Token không hợp lệ' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token đã hết hạn' });
        }
        res.status(500).json({ message: 'Lỗi server khi xác thực', error: error.message });
    }
};

module.exports = adminAuth;