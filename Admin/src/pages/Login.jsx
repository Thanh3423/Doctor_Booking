import React, { useContext, useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { AdminContext } from "../context/AdminContext";
import { DoctorContext } from "../context/DoctorContext";

const LoginPage = () => {
  const [role, setRole] = useState("Admin"); // Vai trò mặc định: Quản trị viên

  const { setAToken, backendUrl } = useContext(AdminContext);
  const { setDToken } = useContext(DoctorContext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); // Ngăn tải lại trang
    setLoading(true);

    const endpoint = role === "Admin" ? "/admin/login" : "/doctor/login";
    const data = { email, password };

    try {
      const res = await axios.post(backendUrl + endpoint, data);

      if (role === "Admin") {
        // Lưu token vào localStorage và context
        localStorage.setItem("aToken", res.data.token);
        setAToken(res.data.token);
        navigate("/admin/dashboard");
      } else {
        localStorage.setItem("dToken", res.data.token);
        setDToken(res.data.token);
        navigate("/doctor/dashboard");
      }
      toast.success("Đăng nhập thành công!");

    } catch (error) {
      console.error("Lỗi:", error.response?.data);
      toast.error(error.response?.data?.message || "Đăng nhập thất bại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white shadow-2xl rounded-2xl outline-none">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">
          Đăng nhập {role === "Admin" ? "Quản trị viên" : "Bác sĩ"}
        </h2>

        {/* Chọn vai trò: Quản trị viên & Bác sĩ */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            className={`px-4 py-2 text-lg font-medium rounded-lg ${role === "Admin"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-800"
              }`}
            onClick={() => setRole("Admin")}
            aria-label="Chọn vai trò Quản trị viên"
            title="Chọn vai trò Quản trị viên"
          >
            Quản trị viên
          </button>
          <button
            className={`px-4 py-2 text-lg font-medium rounded-lg ${role === "Doctor"
              ? "bg-green-600 text-white"
              : "bg-gray-200 text-gray-800"
              }`}
            onClick={() => setRole("Doctor")}
            aria-label="Chọn vai trò Bác sĩ"
            title="Chọn vai trò Bác sĩ"
          >
            Bác sĩ
          </button>
        </div>

        {/* Form đăng nhập */}
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-gray-600 font-medium">Email</label>
            <input
              type="email"
              placeholder="Nhập email của bạn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
              required
              aria-label="Nhập email"
              title="Nhập email"
            />
          </div>

          <div>
            <label className="block text-gray-600 font-medium">Mật khẩu</label>
            <input
              type="password"
              placeholder="Nhập mật khẩu của bạn"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
              required
              aria-label="Nhập mật khẩu"
              title="Nhập mật khẩu"
            />
          </div>

          <button
            type="submit"
            className={`w-full py-3 mt-4 text-white font-semibold rounded-lg ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
              } transition duration-200`}
            disabled={loading}
            aria-label="Đăng nhập"
            title="Đăng nhập"
          >
            {loading ? "Đang xử lý..." : "Đăng nhập"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;