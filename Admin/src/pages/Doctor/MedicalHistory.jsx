import React, { useContext, useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { DoctorContext } from "../../context/DoctorContext";
import { Search, X, Eye, Trash2, Edit, Plus, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ManageMedicalHistory = () => {
    const [medicalHistories, setMedicalHistories] = useState([]);
    const [completedAppointments, setCompletedAppointments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchPatientName, setSearchPatientName] = useState("");
    const [searchAppointmentDate, setSearchAppointmentDate] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [historyToDelete, setHistoryToDelete] = useState(null);
    const [selectedHistory, setSelectedHistory] = useState(null);
    const [formData, setFormData] = useState({
        appointmentId: "",
        diagnosis: "",
        treatment: "",
    });
    const { dToken, backendUrl } = useContext(DoctorContext);
    const navigate = useNavigate();

    // Fetch completed appointments
    useEffect(() => {
        const fetchCompletedAppointments = async () => {
            try {
                if (!dToken) {
                    toast.error("Bạn phải đăng nhập để xem dữ liệu.");
                    navigate("/doctor/login");
                    return;
                }
                console.log("Fetching completed appointments with URL:", `${backendUrl}/doctor/completed-appointments`);
                const response = await axios.get(`${backendUrl}/doctor/completed-appointments`, {
                    headers: { Authorization: `Bearer ${dToken}` },
                });
                setCompletedAppointments(response.data.data || []);
            } catch (error) {
                console.error("Lỗi khi lấy cuộc hẹn:", {
                    message: error.message,
                    response: error.response?.data,
                    status: error.response?.status,
                });
                toast.error(error.response?.data?.message || "Không thể tải danh sách cuộc hẹn.");
            } finally {
                setIsLoading(false);
            }
        };
        if (dToken) fetchCompletedAppointments();
    }, [dToken, backendUrl, navigate]);

    // Fetch all medical histories or by search criteria
    useEffect(() => {
        const fetchMedicalHistories = async () => {
            setIsLoading(true);
            try {
                let url = `${backendUrl}/doctor/medical-history`;
                const params = {};
                if (searchPatientName.trim()) {
                    params.patientName = searchPatientName.trim();
                }
                if (searchAppointmentDate) {
                    params.appointmentDate = searchAppointmentDate;
                }
                console.log("Fetching medical histories with URL:", url, "Params:", params);
                const response = await axios.get(url, {
                    headers: { Authorization: `Bearer ${dToken}` },
                    params,
                });
                setMedicalHistories(response.data.data || []);
            } catch (error) {
                console.error("Lỗi khi lấy bệnh án:", {
                    message: error.message,
                    response: error.response?.data,
                    status: error.response?.status,
                    url: error.config?.url,
                });
                toast.error(error.response?.data?.message || "Không thể tải bệnh án.");
                if (error.response?.status === 401 || error.response?.status === 403) {
                    toast.error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
                    navigate("/doctor/login");
                }
            } finally {
                setIsLoading(false);
            }
        };
        if (dToken) fetchMedicalHistories();
    }, [dToken, backendUrl, navigate, searchPatientName, searchAppointmentDate]);

    // Handle patient name input change
    const handlePatientNameChange = (e) => {
        const value = e.target.value.trimStart();
        console.log("Search patient name:", { value });
        setSearchPatientName(value);
    };

    // Handle appointment date input change
    const handleAppointmentDateChange = (e) => {
        const value = e.target.value;
        console.log("Search appointment date:", { value });
        setSearchAppointmentDate(value);
    };

    // Clear search fields
    const clearSearch = () => {
        setSearchPatientName("");
        setSearchAppointmentDate("");
    };

    // Handle form input change
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    // Reset form
    const resetForm = () => {
        setFormData({
            appointmentId: "",
            diagnosis: "",
            treatment: "",
        });
    };

    // Open add modal
    const openAddModal = () => {
        resetForm();
        setShowAddModal(true);
    };

    // Open edit modal
    const openEditModal = (history) => {
        setFormData({
            appointmentId: history.appointmentId || "",
            diagnosis: history.diagnosis || "",
            treatment: history.treatment || "",
        });
        setSelectedHistory(history);
        setShowEditModal(true);
    };

    // View history details
    const viewHistory = (history) => {
        setSelectedHistory(history);
        setShowViewModal(true);
    };

    // Add medical history
    const handleAdd = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        if (!dToken) {
            toast.error("Bạn phải đăng nhập để thực hiện hành động này.");
            navigate("/doctor/login");
            setIsLoading(false);
            return;
        }

        if (!formData.appointmentId || !formData.diagnosis.trim() || !formData.treatment.trim()) {
            toast.error("Vui lòng điền đầy đủ các trường bắt buộc.");
            setIsLoading(false);
            return;
        }

        const payload = {
            appointmentId: formData.appointmentId,
            diagnosis: formData.diagnosis.trim(),
            treatment: formData.treatment.trim(),
        };

        try {
            console.log("Adding medical history with payload:", payload);
            const response = await axios.post(`${backendUrl}/doctor/medical-history`, payload, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${dToken}`,
                },
            });
            setMedicalHistories([...medicalHistories, response.data.data]);
            setCompletedAppointments(
                completedAppointments.map((appt) =>
                    appt._id === formData.appointmentId ? { ...appt, hasMedicalHistory: true } : appt
                )
            );
            toast.success("Thêm bệnh án thành công.");
            setShowAddModal(false);
            resetForm();
        } catch (error) {
            console.error("Lỗi khi thêm bệnh án:", {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
            });
            toast.error(error.response?.data?.message || "Không thể thêm bệnh án. Vui lòng thử lại.");
        } finally {
            setIsLoading(false);
        }
    };

    // Edit medical history
    const handleEdit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        if (!dToken) {
            toast.error("Bạn phải đăng nhập để thực hiện hành động này.");
            navigate("/doctor/login");
            setIsLoading(false);
            return;
        }

        if (!formData.diagnosis.trim() || !formData.treatment.trim()) {
            toast.error("Chẩn đoán và điều trị là bắt buộc.");
            setIsLoading(false);
            return;
        }

        try {
            console.log("Updating medical history with ID:", selectedHistory._id);
            const response = await axios.put(
                `${backendUrl}/doctor/medical-history/${selectedHistory._id}`,
                {
                    diagnosis: formData.diagnosis.trim(),
                    treatment: formData.treatment.trim(),
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${dToken}`,
                    },
                }
            );
            setMedicalHistories(
                medicalHistories.map((h) => (h._id === selectedHistory._id ? response.data.data : h))
            );
            toast.success("Cập nhật bệnh án thành công.");
            setShowEditModal(false);
            resetForm();
        } catch (error) {
            console.error("Lỗi khi cập nhật bệnh án:", {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
            });
            toast.error(error.response?.data?.message || "Không thể cập nhật bệnh án.");
        } finally {
            setIsLoading(false);
        }
    };

    // Confirm delete
    const confirmDelete = (history) => {
        setHistoryToDelete(history);
        setShowDeleteModal(true);
    };

    // Delete medical history
    const handleDelete = async () => {
        if (!historyToDelete) return;
        setIsLoading(true);

        try {
            await axios.delete(`${backendUrl}/doctor/medical-history/${historyToDelete._id}`, {
                headers: { Authorization: `Bearer ${dToken}` },
            });
            setMedicalHistories(medicalHistories.filter((h) => h._id !== historyToDelete._id));
            setCompletedAppointments(
                completedAppointments.map((appt) =>
                    appt._id === historyToDelete.appointmentId ? { ...appt, hasMedicalHistory: false } : appt
                )
            );
            toast.success("Xóa bệnh án thành công.");
            setShowDeleteModal(false);
            setHistoryToDelete(null);
        } catch (error) {
            console.error("Lỗi khi xóa bệnh án:", {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
            });
            toast.error(error.response?.data?.message || "Không thể xóa bệnh án.");
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading && medicalHistories.length === 0 && completedAppointments.length === 0) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
                        <Calendar size={24} /> Quản lý bệnh án
                    </h1>
                    <button
                        onClick={openAddModal}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm text-sm font-medium"
                    >
                        <Plus size={18} /> Thêm bệnh án
                    </button>
                </div>

                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo tên bệnh nhân"
                            className="pl-10 pr-10 py-2 w-full border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm"
                            value={searchPatientName}
                            onChange={handlePatientNameChange}
                        />
                        {searchPatientName && (
                            <button
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                onClick={clearSearch}
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="date"
                            placeholder="Chọn ngày hẹn"
                            className="pl-10 pr-10 py-2 w-full border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm"
                            value={searchAppointmentDate}
                            onChange={handleAppointmentDateChange}
                        />
                        {searchAppointmentDate && (
                            <button
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                onClick={clearSearch}
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-1/4">
                                    Tên bệnh nhân
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-1/6">
                                    Chẩn đoán
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-1/6">
                                    Ngày hẹn
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-1/6">
                                    Khung giờ
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-1/6">
                                    Ngày tạo
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider w-1/6">
                                    Hành động
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {medicalHistories.length > 0 ? (
                                medicalHistories.map((history) => (
                                    <tr key={history._id} className="hover:bg-gray-50 transition">
                                        <td className="px-4 py-2 text-sm text-gray-800">{history.patientName}</td>
                                        <td className="px-4 py-2 text-sm text-gray-600">{history.diagnosis}</td>
                                        <td className="px-4 py-2 text-sm text-gray-600">
                                            {history.appointmentDate
                                                ? new Date(history.appointmentDate).toLocaleDateString("vi-VN")
                                                : "N/A"}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-600">{history.timeslot || "N/A"}</td>
                                        <td className="px-4 py-2 text-sm text-gray-600">
                                            {new Date(history.date).toLocaleDateString("vi-VN")}
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => viewHistory(history)}
                                                    className="text-teal-600 hover:text-teal-800 p-1 rounded hover:bg-teal-50 transition"
                                                    title="Xem chi tiết"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button
                                                    onClick={() => openEditModal(history)}
                                                    className="text-blue-500 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition"
                                                    title="Chỉnh sửa"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => confirmDelete(history)}
                                                    className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition"
                                                    title="Xóa"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-4 py-4 text-center text-gray-500 text-sm">
                                        {(searchPatientName || searchAppointmentDate)
                                            ? `Không tìm thấy bệnh án nào cho ${searchPatientName ? `tên "${searchPatientName}"` : ""}${searchPatientName && searchAppointmentDate ? " và " : ""
                                            }${searchAppointmentDate ? `ngày "${searchAppointmentDate}"` : ""}`
                                            : "Chưa có bệnh án nào được tạo"}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Add Medical History Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                    <Plus size={20} /> Thêm bệnh án
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowAddModal(false);
                                        resetForm();
                                    }}
                                    className="text-gray-500 hover:text-gray-700 transition"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleAdd} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Cuộc hẹn <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        name="appointmentId"
                                        value={formData.appointmentId}
                                        onChange={handleChange}
                                        required
                                        className="mt-1 w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                                    >
                                        <option value="">Chọn cuộc hẹn</option>
                                        {completedAppointments
                                            .filter((appt) => !appt.hasMedicalHistory)
                                            .map((appt) => (
                                                <option key={appt._id} value={appt._id}>
                                                    {appt.patientName} - {new Date(appt.appointmentDate).toLocaleDateString("vi-VN")} - {appt.timeslot}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Chẩn đoán <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        name="diagnosis"
                                        value={formData.diagnosis}
                                        onChange={handleChange}
                                        placeholder="Nhập chẩn đoán"
                                        required
                                        className="mt-1 w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm shadow-sm resize-y"
                                        rows="4"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Điều trị <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        name="treatment"
                                        value={formData.treatment}
                                        onChange={handleChange}
                                        placeholder="Nhập phương pháp điều trị"
                                        required
                                        className="mt-1 w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm shadow-sm resize-y"
                                        rows="4"
                                    />
                                </div>
                                <div className="flex justify-end gap-2 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowAddModal(false);
                                            resetForm();
                                        }}
                                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm shadow-sm"
                                    >
                                        Hủy bỏ
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm shadow-sm disabled:bg-blue-400"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? "Đang thêm..." : "Thêm"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Edit Medical History Modal */}
                {showEditModal && selectedHistory && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                    <Edit size={20} /> Cập nhật bệnh án
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowEditModal(false);
                                        resetForm();
                                    }}
                                    className="text-gray-500 hover:text-gray-700 transition"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleEdit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Cuộc hẹn
                                    </label>
                                    <input
                                        type="text"
                                        value={`${selectedHistory.patientName} - ${new Date(selectedHistory.appointmentDate).toLocaleDateString("vi-VN")} - ${selectedHistory.timeslot}`}
                                        disabled
                                        className="mt-1 w-full p-2 border border-gray-200 rounded-lg text-sm shadow-sm bg-gray-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Chẩn đoán <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        name="diagnosis"
                                        value={formData.diagnosis}
                                        onChange={handleChange}
                                        placeholder="Nhập chẩn đoán"
                                        required
                                        className="mt-1 w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm shadow-sm resize-y"
                                        rows="4"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Điều trị <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        name="treatment"
                                        value={formData.treatment}
                                        onChange={handleChange}
                                        placeholder="Nhập phương pháp điều trị"
                                        required
                                        className="mt-1 w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm shadow-sm resize-y"
                                        rows="4"
                                    />
                                </div>
                                <div className="flex justify-end gap-2 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowEditModal(false);
                                            resetForm();
                                        }}
                                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm shadow-sm"
                                    >
                                        Hủy bỏ
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm shadow-sm disabled:bg-blue-400"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? "Đang cập nhật..." : "Cập nhật"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {showDeleteModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
                            <div className="flex items-center gap-2 mb-4">
                                <Trash2 className="h-5 w-5 text-red-600" />
                                <h3 className="text-lg font-semibold text-gray-800">Xác nhận xóa</h3>
                            </div>
                            <p className="text-sm text-gray-600 mb-6">
                                Bạn có chắc muốn xóa bệnh án của "{historyToDelete?.patientName}"? Hành động này không thể hoàn tác.
                            </p>
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm shadow-sm"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm shadow-sm disabled:bg-red-400"
                                    disabled={isLoading}
                                >
                                    {isLoading ? "Đang xóa..." : "Xóa"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* View Medical History Modal */}
                {showViewModal && selectedHistory && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Eye className="h-5 w-5 text-teal-600" />
                                    <h3 className="text-lg font-semibold text-gray-800">{selectedHistory.patientName}</h3>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowViewModal(false);
                                        setSelectedHistory(null);
                                    }}
                                    className="text-gray-500 hover:text-gray-700 transition"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div className="p-4 bg-gray-50 rounded-lg shadow-sm">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Chẩn đoán</h4>
                                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedHistory.diagnosis}</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-lg shadow-sm">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Điều trị</h4>
                                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedHistory.treatment}</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-lg shadow-sm">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Thông tin</h4>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={16} className="text-gray-500" />
                                            <span className="text-sm text-gray-600">
                                                <span className="font-medium">Bệnh nhân:</span> {selectedHistory.patientName}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar size={16} className="text-gray-500" />
                                            <span className="text-sm text-gray-600">
                                                <span className="font-medium">Email:</span> {selectedHistory.patientEmail}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar size={16} className="text-gray-500" />
                                            <span className="text-sm text-gray-600">
                                                <span className="font-medium">Ngày hẹn:</span>{" "}
                                                {selectedHistory.appointmentDate
                                                    ? new Date(selectedHistory.appointmentDate).toLocaleDateString("vi-VN")
                                                    : "N/A"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar size={16} className="text-gray-500" />
                                            <span className="text-sm text-gray-600">
                                                <span className="font-medium">Khung giờ:</span> {selectedHistory.timeslot || "N/A"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar size={16} className="text-gray-500" />
                                            <span className="text-sm text-gray-600">
                                                <span className="font-medium">Ngày tạo:</span>{" "}
                                                {new Date(selectedHistory.date).toLocaleDateString("vi-VN")}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    onClick={() => {
                                        setShowViewModal(false);
                                        openEditModal(selectedHistory);
                                    }}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm shadow-sm"
                                >
                                    Chỉnh sửa
                                </button>
                                <button
                                    onClick={() => {
                                        setShowViewModal(false);
                                        setSelectedHistory(null);
                                    }}
                                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition text-sm shadow-sm"
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManageMedicalHistory;