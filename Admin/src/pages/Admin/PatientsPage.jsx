import React, { useState, useEffect, useContext, useRef } from "react";
import { Trash2, Search, X, Eye, Edit, Camera, RefreshCw } from "lucide-react";
import { AdminContext } from '../../context/AdminContext';
import axios from "axios";
import { toast } from "react-toastify";

const PatientsPage = () => {
    const [patients, setPatients] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [patientToDelete, setPatientToDelete] = useState(null);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        phoneNumber: "",
        address: "",
        image: null,
        existingImage: "",
    });
    const [imagePreview, setImagePreview] = useState(null);
    const { backendUrl, aToken, logout } = useContext(AdminContext);
    const fileInputRef = useRef(null);

    // Helper function to get full image URL with cache-busting
    const getImageUrl = (imagePath) => {
        if (!imagePath || !imagePath.trim()) {
            console.log('[PatientsPage] No image path provided, returning null');
            return null; // No default image
        }
        if (imagePath.startsWith('http')) {
            const url = `${imagePath}${imagePath.includes('?') ? '&' : '?'}t=${Date.now()}`;
            console.log('[PatientsPage] Cache-busted image URL:', url);
            return url;
        }
        const url = `${backendUrl}/images${imagePath.startsWith('/') ? '' : '/'}${imagePath}?t=${Date.now()}`;
        console.log('[PatientsPage] Generated image URL:', url);
        return url;
    };

    // Fetch patients
    const fetchPatients = async () => {
        setIsLoading(true);
        try {
            if (!aToken || !backendUrl) {
                throw new Error("Thiếu token hoặc backendUrl");
            }
            console.log("[PatientsPage] Fetching patients with token:", aToken);
            const response = await axios.get(`${backendUrl}/admin/patient/all`, {
                headers: { Authorization: `Bearer ${aToken}` },
            });
            if (response.data?.success && Array.isArray(response.data.data)) {
                setPatients(response.data.data);
            } else {
                console.warn("[PatientsPage] Unexpected response format:", response.data);
                setPatients([]);
                toast.error("Dữ liệu bệnh nhân không đúng định dạng.");
            }
        } catch (error) {
            console.error("[PatientsPage] Error fetching patients:", {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
            });
            let errorMessage = "Không thể tải danh sách bệnh nhân.";
            if (error.response?.status === 401 || error.response?.status === 403) {
                errorMessage = "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.";
                logout();
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }
            toast.error(errorMessage);
            setPatients([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch patients on mount and set up polling
    useEffect(() => {
        if (aToken && backendUrl) {
            fetchPatients();
            const intervalId = setInterval(fetchPatients, 30000); // Poll every 30 seconds
            return () => clearInterval(intervalId);
        } else {
            console.warn("[PatientsPage] Missing aToken or backendUrl:", { aToken, backendUrl });
            setIsLoading(false);
            toast.error("Cấu hình không hợp lệ. Vui lòng kiểm tra đăng nhập.");
        }
    }, [backendUrl, aToken, logout]);

    // Handle form input change
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    // Handle image upload
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const validTypes = ["image/jpeg", "image/png", "image/webp"];
            if (!validTypes.includes(file.type)) {
                toast.error("Vui lòng chọn file ảnh (JPEG, PNG, hoặc WebP)");
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                toast.error("Kích thước ảnh không được vượt quá 5MB");
                return;
            }
            setFormData({ ...formData, image: file });
            const reader = new FileReader();
            reader.onload = () => {
                console.log('[PatientsPage] Image preview loaded:', reader.result.substring(0, 50) + '...');
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    // Trigger file input
    const triggerFileInput = () => fileInputRef.current?.click();

    // Reset form and image preview
    const resetForm = () => {
        setFormData({
            name: "",
            email: "",
            password: "",
            phoneNumber: "",
            address: "",
            image: null,
            existingImage: "",
        });
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // Open edit modal
    const openEditModal = (patient) => {
        console.log('[PatientsPage] Opening edit modal for patient:', {
            id: patient._id,
            name: patient.name,
            image: patient.image,
            imageUrl: getImageUrl(patient.image),
        });
        setFormData({
            name: patient.name || "",
            email: patient.email || "",
            password: "",
            phoneNumber: patient.phoneNumber || "",
            address: patient.address || "",
            image: null,
            existingImage: patient.image || "",
        });
        setImagePreview(getImageUrl(patient.image));
        setSelectedPatient(patient);
        setShowEditModal(true);
    };

    // Validate form fields
    const validateForm = () => {
        const requiredFields = [
            { field: "name", label: "Tên" },
            { field: "email", label: "Email" },
            { field: "address", label: "Địa chỉ" },
        ];

        for (const { field, label } of requiredFields) {
            if (!formData[field] || (typeof formData[field] === "string" && !formData[field].trim())) {
                return `Vui lòng điền ${label.toLowerCase()}.`;
            }
        }
        if (formData.password && formData.password.length < 6) {
            return "Mật khẩu phải dài ít nhất 6 ký tự.";
        }
        if (formData.phoneNumber && !/^\+?\d{10,15}$/.test(formData.phoneNumber)) {
            return "Số điện thoại không hợp lệ.";
        }
        return null;
    };

    // Handle edit patient
    const handleEdit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        if (!aToken) {
            toast.error("Bạn cần đăng nhập để thực hiện hành động này.");
            logout();
            setIsLoading(false);
            return;
        }

        if (!selectedPatient) {
            toast.error("Không tìm thấy bệnh nhân để cập nhật.");
            setIsLoading(false);
            return;
        }

        const validationError = validateForm();
        if (validationError) {
            toast.error(validationError);
            setIsLoading(false);
            return;
        }

        try {
            const submitData = new FormData();
            submitData.append("name", formData.name);
            submitData.append("email", formData.email);
            submitData.append("phoneNumber", formData.phoneNumber);
            submitData.append("address", formData.address);
            if (formData.password?.trim()) submitData.append("password", formData.password);
            if (formData.image) submitData.append("image", formData.image);
            else if (formData.existingImage) submitData.append("existingImage", formData.existingImage);

            const response = await axios.put(`${backendUrl}/admin/patient/update/${selectedPatient._id}`, submitData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    Authorization: `Bearer ${aToken}`,
                },
            });

            setPatients(patients.map((p) => (p._id === selectedPatient._id ? response.data.patient : p)));
            setSelectedPatient(response.data.patient);
            setImagePreview(getImageUrl(response.data.patient.image));
            toast.success(`Bệnh nhân ${formData.name} đã được cập nhật.`);
            setShowEditModal(false);
            resetForm();
        } catch (error) {
            console.error("[PatientsPage] Error updating patient:", {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
            });
            let errorMessage = error.response?.data?.message || "Không thể cập nhật bệnh nhân.";
            if (error.response?.status === 401 || error.response?.status === 403) {
                errorMessage = "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.";
                logout();
            }
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle search
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    // Filter patients
    const filteredPatients = patients.filter(
        (patient) =>
            patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            patient.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Confirm delete
    const confirmDelete = (patient) => {
        console.log('[PatientsPage] Confirming delete for patient:', patient);
        setPatientToDelete(patient);
        setShowDeleteModal(true);
    };

    // Handle delete
    const handleDelete = async () => {
        if (!patientToDelete || !aToken) {
            toast.error("Bệnh nhân hoặc token không hợp lệ.");
            logout();
            return;
        }
        setIsLoading(true);

        try {
            console.log(`[PatientsPage] Deleting patient with ID: ${patientToDelete._id}`);
            const response = await axios.delete(`${backendUrl}/admin/patient/delete/${patientToDelete._id}`, {
                headers: { Authorization: `Bearer ${aToken}` },
            });
            setPatients(patients.filter((p) => p._id !== patientToDelete._id));
            toast.success(`Bệnh nhân ${patientToDelete.name} đã được xóa.`);
            setShowDeleteModal(false);
            setPatientToDelete(null);
        } catch (error) {
            console.error("[PatientsPage] Error deleting patient:", {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
            });
            let errorMessage = "Không thể xóa bệnh nhân.";
            if (error.response?.status === 401 || error.response?.status === 403) {
                errorMessage = "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.";
                logout();
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // View patient
    const viewPatient = async (patient) => {
        try {
            console.log(`[PatientsPage] Fetching patient details for ID: ${patient._id}`);
            const response = await axios.get(`${backendUrl}/admin/patient/${patient._id}`, {
                headers: { Authorization: `Bearer ${aToken}` },
            });
            console.log("[PatientsPage] Patient details response:", response.data);
            if (response.data?.success && response.data.data) {
                setSelectedPatient(response.data.data);
                setImagePreview(getImageUrl(response.data.data.image));
                setShowViewModal(true);
            } else {
                throw new Error("Dữ liệu bệnh nhân không đúng định dạng");
            }
        } catch (error) {
            console.error("[PatientsPage] Error fetching patient details:", {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
            });
            let errorMessage = error.response?.data?.message || "Không thể tải chi tiết bệnh nhân.";
            if (error.response?.status === 401 || error.response?.status === 403) {
                errorMessage = "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.";
                logout();
            }
            toast.error(errorMessage);
        }
    };

    if (isLoading && patients.length === 0) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen w-full">
            <style jsx>{`
        .modal-enter {
          opacity: 0;
          transform: scale(0.95);
        }
        .modal-enter-active {
          opacity: 1;
          transform: scale(1);
          transition: opacity 300ms, transform 300ms;
        }
      `}</style>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Quản lý bệnh nhân</h1>

            </div>

            {/* Search Bar */}
            <div className="relative mb-6">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    placeholder="Tìm kiếm bệnh nhân theo tên hoặc email"
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={handleSearchChange}
                />
                {searchTerm && (
                    <button
                        className="absolute inset-y-0 right-0 flex items-center pr-3"
                        onClick={() => setSearchTerm("")}
                    >
                        <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    </button>
                )}
            </div>

            {/* Patients Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Tên
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Email
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Số điện thoại
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Địa chỉ
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Hành động
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredPatients.length > 0 ? (
                                filteredPatients.map((patient) => (
                                    <tr key={patient._id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-gray-900">{patient.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-500">{patient.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-500">{patient.phoneNumber || "N/A"}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-500">{patient.address || "N/A"}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => viewPatient(patient)}
                                                    className="text-green-600 hover:text-green-800 p-1"
                                                    title="Xem chi tiết"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button
                                                    onClick={() => openEditModal(patient)}
                                                    className="text-blue-600 hover:text-blue-800 p-1"
                                                    title="Chỉnh sửa"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => confirmDelete(patient)}
                                                    className="text-red-600 hover:text-red-800 p-1"
                                                    title="Xóa bệnh nhân"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                                        Không tìm thấy bệnh nhân nào khớp với "{searchTerm || "Không có"}"
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Patient Modal */}
            {showEditModal && selectedPatient && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto modal-enter modal-enter-active">
                        <h3 className="text-lg font-semibold mb-4">Cập nhật thông tin bệnh nhân</h3>
                        <form onSubmit={handleEdit} className="space-y-4" autoComplete="off">
                            <div className="flex justify-center">
                                <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-300">
                                    {imagePreview ? (
                                        <img
                                            src={imagePreview}
                                            alt="Patient Preview"
                                            className="object-cover w-full h-full"
                                            onError={(e) => {
                                                console.error('[PatientsPage] Image load failed:', e.target.src);
                                                setImagePreview(null);
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500">
                                            Chưa có ảnh
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={triggerFileInput}
                                        className="absolute inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center hover:bg-opacity-70 transition text-white"
                                        aria-label="Tải lên hình ảnh"
                                    >
                                        <Camera size={24} />
                                    </button>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        ref={fileInputRef}
                                        className="hidden"
                                        onChange={handleImageChange}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Tên</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Tên bệnh nhân"
                                        required
                                        className="mt-2 block w-full text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="Email bệnh nhân"
                                        required
                                        autoComplete="off"
                                        className="mt-2 block w-full text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Mật khẩu</label>
                                    <input
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="Mật khẩu mới (để trống nếu không đổi)"
                                        autoComplete="new-password"
                                        className="mt-2 block w-full text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Số điện thoại</label>
                                    <input
                                        type="text"
                                        name="phoneNumber"
                                        value={formData.phoneNumber}
                                        onChange={handleChange}
                                        placeholder="Số điện thoại"
                                        className="mt-2 block w-full text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="col-span-full">
                                    <label className="block text-sm font-medium text-gray-700">Địa chỉ</label>
                                    <input
                                        type="text"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        placeholder="Địa chỉ"
                                        required
                                        className="mt-2 block w-full text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setSelectedPatient(null);
                                        resetForm();
                                    }}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
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
            {showDeleteModal && patientToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div
                        className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full modal-enter modal-enter-active"
                        role="dialog"
                        aria-labelledby="delete-modal-title"
                        aria-describedby="delete-modal-description"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-red-100 p-2 rounded-full">
                                <Trash2 className="h-5 w-5 text-red-600" />
                            </div>
                            <h3 id="delete-modal-title" className="text-lg font-semibold text-gray-900">
                                Xác nhận xóa bệnh nhân
                            </h3>
                        </div>
                        <p id="delete-modal-description" className="text-sm text-gray-600 mb-6">
                            Bạn có chắc chắn muốn xóa bệnh nhân <span className="font-semibold">{patientToDelete?.name}</span>? Hành động này không thể hoàn tác.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setPatientToDelete(null);
                                }}
                                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors"
                                aria-label="Hủy bỏ xóa"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={handleDelete}
                                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                disabled={isLoading}
                                aria-label="Xác nhận xóa bệnh nhân"
                            >
                                {isLoading ? "Đang xóa..." : "Xóa"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Patient Modal */}
            {showViewModal && selectedPatient && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto modal-enter modal-enter-active">
                        <h3 className="text-lg font-semibold mb-4">Chi tiết bệnh nhân</h3>
                        <div className="space-y-4">
                            <div className="flex items-center space-x-4">
                                {selectedPatient.image ? (
                                    <img
                                        src={getImageUrl(selectedPatient.image)}
                                        alt={selectedPatient.name}
                                        className="w-24 h-24 object-cover rounded-full border-2 border-gray-300"
                                        onError={(e) => {
                                            console.error('[PatientsPage] Image load failed:', e.target.src);
                                            e.target.src = '';
                                            e.target.style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                                        Chưa có ảnh
                                    </div>
                                )}
                                <div>
                                    <h4 className="text-xl font-semibold text-gray-800">{selectedPatient.name}</h4>
                                    <p className="text-sm text-gray-500">{selectedPatient.email}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-gray-700">Email</p>
                                    <p className="text-sm text-gray-500">{selectedPatient.email}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-700">Số điện thoại</p>
                                    <p className="text-sm text-gray-500">{selectedPatient.phoneNumber || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-700">Địa chỉ</p>
                                    <p className="text-sm text-gray-500">{selectedPatient.address || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-700">Ngày tạo</p>
                                    <p className="text-sm text-gray-500">
                                        {selectedPatient.createdAt
                                            ? new Date(selectedPatient.createdAt).toLocaleDateString("vi-VN")
                                            : "N/A"}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end mt-6">
                            <button
                                onClick={() => {
                                    setShowViewModal(false);
                                    setSelectedPatient(null);
                                    setImagePreview(null);
                                }}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatientsPage;