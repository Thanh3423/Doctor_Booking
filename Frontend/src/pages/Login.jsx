import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { AppContext } from "../Context/AppContext";

// Import font Roboto từ Google Fonts
const fontStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
  .font-vietnamese {
    font-family: 'Roboto', 'Noto Sans', Arial, sans-serif;
  }
`;

const LoginPage = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { setToken, setUserData, backEndUrl } = useContext(AppContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Reset fields when switching between login and register
  useEffect(() => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setName("");
  }, [isRegister]);

  // Kiểm tra trạng thái xác thực
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          console.log("[LoginPage] Checking token validity, backEndUrl:", backEndUrl);
          await axios.get(`${backEndUrl}/patient/my-profile`, {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          });
          const redirectTo = location.state?.from || "/";
          navigate(redirectTo, { replace: true });
          toast.info("Bạn đã đăng nhập!");
        } catch (error) {
          console.error("[LoginPage] Token invalid:", {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
          });
          localStorage.removeItem("token");
          localStorage.removeItem("userData");
          setToken("");
          setUserData(null);
        }
      }
    };
    checkAuth();
  }, [navigate, backEndUrl, setToken, setUserData, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Kiểm tra xác nhận mật khẩu khi đăng ký
    if (isRegister && password !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp!");
      setLoading(false);
      return;
    }

    const endpoint = isRegister ? "/patient/register" : "/patient/login";
    const data = { email, password };
    if (isRegister) data.name = name;

    try {
      console.log("[LoginPage] Sending request to:", `${backEndUrl}${endpoint}`);
      console.log("[LoginPage] Request data:", data);
      const res = await axios.post(`${backEndUrl}${endpoint}`, data, {
        withCredentials: true,
      });
      console.log("[LoginPage] Response:", res.data);
      const { token, user } = res.data.data;
      localStorage.setItem("token", token);
      if (user) {
        localStorage.setItem("userData", JSON.stringify(user));
        setUserData(user);
      }
      setToken(token);
      const redirectTo = location.state?.from || "/";
      navigate(redirectTo, { replace: true });
      toast.success(isRegister ? "Đăng ký thành công!" : "Đăng nhập thành công!");
    } catch (error) {
      console.error("[LoginPage] API error:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      const errorMessage =
        error.response?.status === 404
          ? "Không tìm thấy endpoint. Vui lòng kiểm tra server!"
          : error.response?.data?.message ||
          error.response?.data?.error ||
          (isRegister ? "Lỗi đăng ký tài khoản!" : "Email hoặc mật khẩu không đúng!");
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 font-vietnamese">
      <style>{fontStyle}</style>
      <div className="w-full max-w-md p-8 bg-white shadow-2xl rounded-2xl">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">
          {isRegister ? "Đăng ký tài khoản" : "Đăng nhập"}
        </h2>

        {/* Form */}
        <form
          className="flex flex-col gap-4 outline-none"
          onSubmit={handleSubmit}
          autoComplete={isRegister ? "off" : "on"}
        >
          {/* Dummy fields to trick autofill */}
          {isRegister && (
            <>
              <input
                type="email"
                name="dummy-email"
                style={{ display: "none" }}
                autoComplete="email"
              />
              <input
                type="password"
                name="dummy-password"
                style={{ display: "none" }}
                autoComplete="current-password"
              />
            </>
          )}

          {/* Hiển thị trường Họ và tên khi đăng ký */}
          {isRegister && (
            <div>
              <label className="block text-gray-600 font-medium">Họ và tên</label>
              <input
                type="text"
                name="register-name"
                placeholder="Nhập họ và tên của bạn"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
                required
                autoComplete="off"
              />
            </div>
          )}

          <div>
            <label className="block text-gray-600 font-medium">Email</label>
            <input
              type="email"
              name={isRegister ? "register-email" : "email"}
              placeholder="Nhập email của bạn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
              required
              autoComplete={isRegister ? "off" : "email"}
            />
          </div>

          <div>
            <label className="block text-gray-600 font-medium">Mật khẩu</label>
            <input
              type="password"
              name={isRegister ? "register-password" : "password"}
              placeholder="Nhập mật khẩu của bạn"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
              required
              autoComplete={isRegister ? "new-password" : "current-password"}
            />
          </div>

          {/* Xác nhận mật khẩu khi đăng ký */}
          {isRegister && (
            <div>
              <label className="block text-gray-600 font-medium">Xác nhận mật khẩu</label>
              <input
                type="password"
                name="register-confirm-password"
                placeholder="Nhập lại mật khẩu"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
                required
                autoComplete="new-password"
              />
            </div>
          )}

          <button
            type="submit"
            className={`w-full py-3 mt-4 text-white font-semibold rounded-lg ${isRegister ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"
              } transition ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={loading}
          >
            {loading ? "Đang xử lý..." : isRegister ? "Đăng ký" : "Đăng nhập"}
          </button>
        </form>

        {/* Chuyển đổi giữa Đăng nhập và Đăng ký */}
        <p className="text-gray-600 text-center mt-4">
          {isRegister ? "Đã có tài khoản?" : "Người dùng mới?"}{" "}
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-blue-600 font-medium hover:underline"
          >
            {isRegister ? "Đăng nhập" : "Đăng ký"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;