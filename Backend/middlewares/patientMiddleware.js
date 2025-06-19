const jwt = require("jsonwebtoken");
const patientModel = require("../models/patient.model"); // Đảm bảo import đúng model

module.exports.patientMiddleware = async function (req, res, next) {
  try {
    // Lấy token từ header Authorization hoặc cookies
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      console.log("No token found in headers or cookies");
      return res.status(401).json({ success: false, message: "Unauthorized: Please log in" });
    }

    // Xác minh token
    const decoded = jwt.verify(token, process.env.JWT_KEY);

    // Kiểm tra thời gian hết hạn (tùy chọn, vì jwt.verify đã xử lý)
    const currentTime = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < currentTime) {
      return res.status(401).json({ success: false, message: "Unauthorized: Token expired" });
    }

    // Tìm user trong database
    const user = await patientModel
      .findOne({ email: decoded.email })
      .select("-password");

    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized: User not found" });
    }

    // Gán user vào req và tiếp tục
    req.user = user;
    next();
  } catch (err) {
    console.error("Middleware error:", {
      message: err.message,
      name: err.name,
    });
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, message: "Unauthorized: Invalid token" });
    }
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Unauthorized: Token expired" });
    }
    return res.status(401).json({ success: false, message: "Unauthorized: Authentication failed" });
  }
};