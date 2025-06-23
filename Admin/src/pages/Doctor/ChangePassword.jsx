import React, { useState, useContext } from "react";
import { toast } from "react-toastify";
import { DoctorContext } from "../../context/DoctorContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const ChangePassword = () => {
    const { dToken, backendUrl } = useContext(DoctorContext);
    const navigate = useNavigate();
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    console.log("Backend URL:", backendUrl);
    console.log("Doctor Token:", dToken);

    if (!dToken) {
        navigate("/doctor/login");
        return null;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (!oldPassword || !newPassword || !confirmPassword) {
            toast.error("Vui lòng điền đầy đủ các trường");
            setLoading(false);
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error("Mật khẩu mới và xác nhận không khớp");
            setLoading(false);
            return;
        }
        if (newPassword.length < 6) {
            toast.error("Mật khẩu mới phải có ít nhất 6 ký tự");
            setLoading(false);
            return;
        }

        try {
            const response = await axios.post(
                `${backendUrl}/doctor/change-password`,
                { oldPassword, newPassword, confirmPassword },
                {
                    headers: { Authorization: `Bearer ${dToken}` },
                }
            );
            console.log("Change password response:", response.data);
            toast.success("Đổi mật khẩu thành công");
            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (error) {
            console.error("Error details:", {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                headers: error.response?.headers,
            });
            toast.error(error.response?.data?.message || "Đổi mật khẩu thất bại");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 bg-white shadow-2xl rounded-2xl">
                <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">
                    Đổi mật khẩu
                </h2>
                <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                    <div>
                        <label className="block text-gray-600 font-medium">Mật khẩu cũ</label>
                        <input
                            type="password"
                            placeholder="Nhập mật khẩu cũ"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-600 font-medium">Mật khẩu mới</label>
                        <input
                            type="password"
                            placeholder="Nhập mật khẩu mới"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-600 font-medium">Xác nhận mật khẩu</label>
                        <input
                            type="password"
                            placeholder="Xác nhận mật khẩu mới"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className={`w-full py-3 mt-4 text-white font-semibold rounded-lg ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                            } transition duration-200`}
                        disabled={loading}
                    >
                        {loading ? "Đang xử lý..." : "Đổi mật khẩu"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChangePassword;