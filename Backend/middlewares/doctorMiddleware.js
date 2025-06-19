const jwt = require("jsonwebtoken");

const doctorAuth = async (req, res, next) => {
    try {
        const authHeader = req.header("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ success: false, message: "Truy cập bị từ chối. Không có mã xác thực hợp lệ." });
        }

        const token = authHeader.replace("Bearer ", "");
        const decoded = jwt.verify(token, process.env.JWT_KEY);

        if (decoded.role !== "doctor") {
            return res.status(403).json({ success: false, message: "Truy cập bị từ chối. Chỉ dành cho bác sĩ." });
        }

        req.user = { id: decoded.id, role: decoded.role };
        next();
    } catch (error) {
        console.error("Lỗi xác thực mã:", error.message);
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ success: false, message: "Mã xác thực đã hết hạn. Vui lòng đăng nhập lại." });
        }
        if (error.name === "JsonWebTokenError") {
            return res.status(400).json({ success: false, message: "Mã xác thực không hợp lệ." });
        }
        res.status(500).json({ success: false, message: "Lỗi server trong quá trình xác thực." });
    }
};

module.exports = doctorAuth; // Fixed export syntax