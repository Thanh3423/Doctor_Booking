import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { AppContext } from "../Context/AppContext";

const ChangePassword = () => {
    const [formData, setFormData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
    });
    const [loading, setLoading] = useState(false);
    const { backEndUrl } = useContext(AppContext);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem("token");
            if (!token) {
                toast.error("Vui lòng đăng nhập lại");
                navigate("/login");
                return;
            }

            const response = await axios.post(
                `${backEndUrl}/patient/change-password`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            toast.success(response.data.message || "Đổi mật khẩu thành công");
            navigate("/home");
        } catch (error) {
            const message =
                error.response?.data?.message || "Lỗi đổi mật khẩu. Vui lòng thử lại.";
            toast.error(message);
            if (error.response?.status === 401) {
                localStorage.clear();
                navigate("/login");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8 font-roboto">
            <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                    Đổi Mật Khẩu
                </h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label
                            htmlFor="currentPassword"
                            className="block text-sm font-medium text-gray-700"
                        >
                            Mật Khẩu Hiện Tại
                        </label>
                        <input
                            id="currentPassword"
                            name="currentPassword"
                            type="password"
                            value={formData.currentPassword}
                            onChange={handleChange}
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Nhập mật khẩu hiện tại"
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="newPassword"
                            className="block text-sm font-medium text-gray-700"
                        >
                            Mật Khẩu Mới
                        </label>
                        <input
                            id="newPassword"
                            name="newPassword"
                            type="password"
                            value={formData.newPassword}
                            onChange={handleChange}
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Nhập mật khẩu mới"
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="confirmNewPassword"
                            className="block text-sm font-medium text-gray-700"
                        >
                            Xác Nhận Mật Khẩu Mới
                        </label>
                        <input
                            id="confirmNewPassword"
                            name="confirmNewPassword"
                            type="password"
                            value={formData.confirmNewPassword}
                            onChange={handleChange}
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Xác nhận mật khẩu mới"
                        />
                    </div>
                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${loading
                                ? "bg-blue-400 cursor-not-allowed"
                                : "bg-blue-600 hover:bg-blue-700"
                                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition`}
                        >
                            {loading ? "Đang xử lý..." : "Đổi Mật Khẩu"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChangePassword;