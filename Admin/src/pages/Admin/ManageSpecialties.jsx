
import React, { useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { AdminContext } from '../../context/AdminContext';
import { Camera, Search, X, Eye, Trash2, Edit, Plus, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DEFAULT_IMAGE = 'https://via.placeholder.com/600x300?text=Specialty';

const ManageSpecialties = () => {
    const [specialties, setSpecialties] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [specialtyToDelete, setSpecialtyToDelete] = useState(null);
    const [selectedSpecialty, setSelectedSpecialty] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        image: null,
        existingImage: '',
    });
    const [imagePreview, setImagePreview] = useState('');
    const { aToken, backendUrl } = useContext(AdminContext);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    // Fetch specialties
    const fetchSpecialties = async () => {
        setIsLoading(true);
        try {
            if (!aToken) {
                toast.error('Bạn phải đăng nhập để xem chuyên khoa.');
                navigate('/login');
                return;
            }
            const response = await axios.get(`${backendUrl}/admin/specialties`, {
                headers: { Authorization: `Bearer ${aToken}` },
            });
            setSpecialties(response.data || []);
        } catch (error) {
            console.error('Lỗi khi lấy chuyên khoa:', error);
            if (error.response?.status === 401 || error.response?.status === 403) {
                toast.error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
                navigate('/login');
            } else {
                toast.error(error.response?.data?.message || 'Không thể tải chuyên khoa.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSpecialties();
    }, [aToken, backendUrl, navigate]);

    // Handle image load error
    const handleImageError = (e) => {
        e.target.src = DEFAULT_IMAGE;
    };

    // Handle search
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const filteredSpecialties = specialties.filter(
        (specialty) =>
            specialty.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (specialty.description && specialty.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Handle form input change
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    // Handle image upload
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error('Vui lòng chọn một file hình ảnh.');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Hình ảnh không được vượt quá 5MB.');
                return;
            }
            setFormData({ ...formData, image: file, existingImage: '' });
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    // Trigger file input
    const triggerFileInput = () => fileInputRef.current.click();

    // Reset form
    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            image: null,
            existingImage: '',
        });
        setImagePreview('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Open add modal
    const openAddModal = () => {
        resetForm();
        setShowAddModal(true);
    };

    // Open edit modal
    const openEditModal = (specialty) => {
        const imagePath =
            specialty.image && specialty.image !== 'https://via.placeholder.com/150'
                ? `${backendUrl}${specialty.image}`
                : DEFAULT_IMAGE;
        setFormData({
            name: specialty.name || '',
            description: specialty.description || '',
            image: null,
            existingImage: specialty.image || '',
        });
        setImagePreview(imagePath);
        setSelectedSpecialty(specialty);
        setShowEditModal(true);
    };

    // View specialty
    const viewSpecialty = (specialty) => {
        const imagePath =
            specialty.image && specialty.image !== 'https://via.placeholder.com/150'
                ? `${backendUrl}${specialty.image}`
                : DEFAULT_IMAGE;
        setSelectedSpecialty({ ...specialty, image: imagePath });
        setShowViewModal(true);
    };

    // Add specialty
    const handleAdd = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        if (!aToken) {
            toast.error('Bạn phải đăng nhập để thực hiện hành động này.');
            navigate('/login');
            setIsLoading(false);
            return;
        }

        if (!formData.name.trim()) {
            toast.error('Tên chuyên khoa là bắt buộc.');
            setIsLoading(false);
            return;
        }

        try {
            const submitData = new FormData();
            submitData.append('name', formData.name);
            submitData.append('description', formData.description);
            if (formData.image) submitData.append('image', formData.image);

            const response = await axios.post(`${backendUrl}/admin/specialties`, submitData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${aToken}`,
                },
            });
            toast.success(`${formData.name} đã được thêm thành công.`);
            setShowAddModal(false);
            resetForm();
            fetchSpecialties(); // Refresh specialties
        } catch (error) {
            console.error('Lỗi khi thêm chuyên khoa:', error);
            toast.error(error.response?.data?.message || 'Không thể thêm chuyên khoa.');
        } finally {
            setIsLoading(false);
        }
    };

    // Edit specialty
    const handleEdit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        if (!aToken) {
            toast.error('Bạn phải đăng nhập để thực hiện hành động này.');
            navigate('/login');
            setIsLoading(false);
            return;
        }

        if (!formData.name.trim()) {
            toast.error('Tên chuyên khoa là bắt buộc.');
            setIsLoading(false);
            return;
        }

        try {
            const submitData = new FormData();
            submitData.append('name', formData.name);
            submitData.append('description', formData.description);
            if (formData.image) {
                submitData.append('image', formData.image);
            } else if (formData.existingImage) {
                submitData.append('existingImage', formData.existingImage);
            }

            const response = await axios.put(`${backendUrl}/admin/specialties/${selectedSpecialty._id}`, submitData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${aToken}`,
                },
            });
            toast.success(`${formData.name} đã được cập nhật thành công.`);
            setShowEditModal(false);
            resetForm();
            fetchSpecialties(); // Refresh specialties
        } catch (error) {
            console.error('Lỗi khi cập nhật chuyên khoa:', error);
            toast.error(error.response?.data?.message || 'Không thể cập nhật chuyên khoa.');
        } finally {
            setIsLoading(false);
        }
    };

    // Confirm delete
    const confirmDelete = (specialty) => {
        setSpecialtyToDelete(specialty);
        setShowDeleteModal(true);
    };

    // Delete specialty
    const handleDelete = async () => {
        if (!specialtyToDelete) return;
        setIsLoading(true);

        try {
            await axios.delete(`${backendUrl}/admin/specialties/${specialtyToDelete._id}`, {
                headers: { Authorization: `Bearer ${aToken}` },
            });
            toast.success(`${specialtyToDelete.name} đã được xóa thành công.`);
            setShowDeleteModal(false);
            setSpecialtyToDelete(null);
            fetchSpecialties(); // Refresh specialties
        } catch (error) {
            console.error('Lỗi khi xóa chuyên khoa:', error);
            toast.error(error.response?.data?.message || 'Không thể xóa chuyên khoa.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading && specialties.length === 0) {
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
                        <Tag size={24} /> Quản lý chuyên khoa
                    </h1>
                    <button
                        onClick={openAddModal}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm text-sm font-medium"
                    >
                        <Plus size={18} /> Thêm chuyên khoa
                    </button>
                </div>

                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm chuyên khoa theo tên hoặc mô tả..."
                        className="pl-10 pr-10 py-2 w-full border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm"
                        value={searchTerm}
                        onChange={handleSearchChange}
                    />
                    {searchTerm && (
                        <button
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={() => setSearchTerm('')}
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>

                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-4/12">
                                    Tên
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-5/12">
                                    Mô tả
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider w-3/12">
                                    Hành động
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredSpecialties.length > 0 ? (
                                filteredSpecialties.map((specialty) => (
                                    <tr key={specialty._id} className="hover:bg-gray-50 transition">
                                        <td className="px-4 py-2 text-sm text-gray-800">{specialty.name}</td>
                                        <td className="px-4 py-2 text-sm text-gray-600">
                                            {specialty.description || 'Chưa có mô tả'}
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => viewSpecialty(specialty)}
                                                    className="text-teal-600 hover:text-teal-800 p-1 rounded hover:bg-teal-50 transition"
                                                    title="Xem chi tiết"
                                                    aria-label="Xem chi tiết chuyên khoa"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button
                                                    onClick={() => openEditModal(specialty)}
                                                    className="text-blue-500 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition"
                                                    title="Chỉnh sửa"
                                                    aria-label="Chỉnh sửa chuyên khoa"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => confirmDelete(specialty)}
                                                    className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition"
                                                    title="Xóa"
                                                    aria-label="Xóa chuyên khoa"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="3" className="px-4 py-4 text-center text-gray-500 text-sm">
                                        Không tìm thấy chuyên khoa nào khớp với "{searchTerm}"
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Add Specialty Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                    <Plus size={20} /> Thêm chuyên khoa
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowAddModal(false);
                                        resetForm();
                                    }}
                                    className="text-gray-500 hover:text-gray-700 transition"
                                    aria-label="Đóng modal"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleAdd} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Tên chuyên khoa <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Nhập tên chuyên khoa"
                                        required
                                        className="mt-1 w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Mô tả</label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        placeholder="Nhập mô tả chuyên khoa"
                                        className="mt-1 w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm shadow-sm resize-y"
                                        rows="4"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Hình ảnh</label>
                                    <div className="mt-1 relative w-48 h-32 rounded-lg overflow-hidden border-2 border-gray-200 shadow-sm">
                                        <img
                                            src={imagePreview || DEFAULT_IMAGE}
                                            alt="Specialty Preview"
                                            className="w-full h-full object-cover"
                                            onError={handleImageError}
                                        />
                                        <button
                                            type="button"
                                            onClick={triggerFileInput}
                                            className="absolute bottom-2 right-2 bg-gray-800 bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition"
                                            title="Chọn hình ảnh"
                                            aria-label="Tải lên hình ảnh"
                                        >
                                            <Camera size={18} />
                                        </button>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            ref={fileInputRef}
                                            className="hidden"
                                            onChange={handleImageChange}
                                        />
                                    </div>
                                    <p className="mt-2 text-xs text-gray-500">Kích thước tối đa: 5MB. Định dạng: JPG, PNG.</p>
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
                                        {isLoading ? 'Đang thêm...' : 'Thêm'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Edit Specialty Modal */}
                {showEditModal && selectedSpecialty && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                    <Edit size={20} /> Cập nhật chuyên khoa
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowEditModal(false);
                                        resetForm();
                                    }}
                                    className="text-gray-500 hover:text-gray-700 transition"
                                    aria-label="Đóng modal"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleEdit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Tên chuyên khoa <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Nhập tên chuyên khoa"
                                        required
                                        className="mt-1 w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Mô tả</label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        placeholder="Nhập mô tả chuyên khoa"
                                        className="mt-1 w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm shadow-sm resize-y"
                                        rows="4"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Hình ảnh</label>
                                    <div className="mt-1 relative w-48 h-32 rounded-lg overflow-hidden border-2 border-gray-200 shadow-sm">
                                        <img
                                            src={imagePreview || DEFAULT_IMAGE}
                                            alt="Specialty Preview"
                                            className="w-full h-full object-cover"
                                            onError={handleImageError}
                                        />
                                        <button
                                            type="button"
                                            onClick={triggerFileInput}
                                            className="absolute bottom-2 right-2 bg-gray-800 bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition"
                                            title="Chọn hình ảnh"
                                            aria-label="Tải lên hình ảnh"
                                        >
                                            <Camera size={18} />
                                        </button>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            ref={fileInputRef}
                                            className="hidden"
                                            onChange={handleImageChange}
                                        />
                                    </div>
                                    <p className="mt-2 text-xs text-gray-500">Kích thước tối đa: 5MB. Định dạng: JPG, PNG.</p>
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
                                        {isLoading ? 'Đang cập nhật...' : 'Cập nhật'}
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
                                Bạn có chắc muốn xóa chuyên khoa "{specialtyToDelete?.name}"? Hành động này không thể hoàn tác.
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
                                    {isLoading ? 'Đang xóa...' : 'Xóa'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* View Specialty Modal */}
                {showViewModal && selectedSpecialty && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                    <Eye size={20} /> Xem chuyên khoa
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowViewModal(false);
                                        setSelectedSpecialty(null);
                                    }}
                                    className="text-gray-500 hover:text-gray-700 transition"
                                    aria-label="Đóng modal"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Tên chuyên khoa
                                    </label>
                                    <p className="mt-1 w-full p-2 border border-gray-200 rounded-lg text-sm bg-gray-50">
                                        {selectedSpecialty.name}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Mô tả</label>
                                    <p className="mt-1 w-full p-2 border border-gray-200 rounded-lg text-sm bg-gray-50 h-24 overflow-y-auto">
                                        {selectedSpecialty.description || 'Chưa có mô tả'}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Hình ảnh</label>
                                    <div className="mt-1 relative w-48 h-32 rounded-lg overflow-hidden border-2 border-gray-200 shadow-sm">
                                        <img
                                            src={selectedSpecialty.image || DEFAULT_IMAGE}
                                            alt={selectedSpecialty.name}
                                            className="w-full h-full object-cover"
                                            onError={handleImageError}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-4">
                                    <button
                                        onClick={() => {
                                            setShowViewModal(false);
                                            openEditModal(selectedSpecialty);
                                        }}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm shadow-sm"
                                    >
                                        Chỉnh sửa
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowViewModal(false);
                                            setSelectedSpecialty(null);
                                        }}
                                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition text-sm shadow-sm"
                                    >
                                        Đóng
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManageSpecialties;
