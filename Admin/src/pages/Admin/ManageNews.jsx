import React, { useContext, useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { AdminContext } from "../../context/AdminContext";
import { Camera, Search, X, Eye, Trash2, Edit, Plus, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const ManageNews = () => {
    const [news, setNews] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [newsToDelete, setNewsToDelete] = useState(null);
    const [selectedNews, setSelectedNews] = useState(null);
    const [formData, setFormData] = useState({
        title: "",
        content: "",
        image: null,
        category: "Health Tips",
        status: "draft",
        publishAt: null,
        existingImage: null,
    });
    const [imagePreview, setImagePreview] = useState("");
    const { aToken, backendUrl } = useContext(AdminContext);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    // Category mapping: English values (for backend) to Vietnamese labels (for display)
    const categoryMap = {
        "Health Tips": "Mẹo sức khỏe",
        "Clinic Updates": "Cập nhật phòng khám",
        Promotions: "Khuyến mãi",
        Events: "Sự kiện",
        Other: "Khác",
    };

    // Fetch news
    useEffect(() => {
        const fetchNews = async () => {
            setIsLoading(true);
            try {
                if (!aToken) {
                    toast.error("Bạn phải đăng nhập để xem tin tức.");
                    navigate("/login");
                    return;
                }
                const response = await axios.get(`${backendUrl}/admin/news`, {
                    headers: { Authorization: `Bearer ${aToken}` },
                });
                setNews(response.data || []);
            } catch (error) {
                console.error("Lỗi khi lấy tin tức:", error);
                if (error.response?.status === 401 || error.response?.status === 403) {
                    toast.error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
                    navigate("/login");
                } else {
                    toast.error(error.response?.data?.message || "Không thể tải tin tức.");
                }
            } finally {
                setIsLoading(false);
            }
        };
        if (aToken) fetchNews();
    }, [aToken, backendUrl, navigate]);

    // Handle image load error (no default image, just log)
    const handleImageError = (e) => {
        console.error("Lỗi tải hình ảnh:", e.target.src);
        e.target.style.display = "none"; // Hide the image element on error
    };

    // Handle search
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const filteredNews = news.filter(
        (item) =>
            item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
            categoryMap[item.category].toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Handle form input change
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    // Handle publishAt change
    const handlePublishAtChange = (date) => {
        setFormData({ ...formData, publishAt: date });
    };

    // Handle image upload
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith("image/")) {
                toast.error("Vui lòng chọn một file hình ảnh.");
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                toast.error("Hình ảnh không được vượt quá 5MB.");
                return;
            }
            setFormData({ ...formData, image: file, existingImage: null });
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
            title: "",
            content: "",
            image: null,
            category: "Health Tips",
            status: "draft",
            publishAt: null,
            existingImage: null,
        });
        setImagePreview("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // Open add modal
    const openAddModal = () => {
        resetForm();
        setShowAddModal(true);
    };

    // Open edit modal
    const openEditModal = (newsItem) => {
        const imagePath = newsItem.image && newsItem.image.startsWith("/images/uploads/news/")
            ? `${backendUrl}${newsItem.image}`
            : "";
        setFormData({
            title: newsItem.title || "",
            content: newsItem.content || "",
            image: null,
            existingImage: newsItem.image || null,
            category: newsItem.category || "Health Tips",
            status: newsItem.status || "draft",
            publishAt: newsItem.publishAt ? new Date(newsItem.publishAt) : null,
        });
        setImagePreview(imagePath);
        setSelectedNews(newsItem);
        setShowEditModal(true);
    };

    // View news
    const viewNews = (newsItem) => {
        const imagePath = newsItem.image && newsItem.image.startsWith("/images/uploads/news/")
            ? `${backendUrl}${newsItem.image}`
            : "";
        setSelectedNews({ ...newsItem, image: imagePath });
        setShowViewModal(true);
    };

    // Add news
    const handleAdd = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        if (!aToken) {
            toast.error("Bạn phải đăng nhập để thực hiện hành động này.");
            navigate("/login");
            setIsLoading(false);
            return;
        }

        if (!formData.title.trim() || !formData.content.trim()) {
            toast.error("Tiêu đề và nội dung là bắt buộc.");
            setIsLoading(false);
            return;
        }

        try {
            const submitData = new FormData();
            submitData.append("title", formData.title);
            submitData.append("content", formData.content);
            submitData.append("category", formData.category);
            submitData.append("status", formData.status);
            if (formData.publishAt) submitData.append("publishAt", formData.publishAt.toISOString());
            if (formData.image) submitData.append("image", formData.image);

            const response = await axios.post(`${backendUrl}/admin/news`, submitData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    Authorization: `Bearer ${aToken}`,
                },
            });
            setNews([...news, response.data.news]);
            toast.success(`${formData.title} đã được thêm thành công.`);
            setShowAddModal(false);
            resetForm();
        } catch (error) {
            console.error("Lỗi khi thêm tin tức:", error);
            toast.error(error.response?.data?.message || "Không thể thêm tin tức.");
        } finally {
            setIsLoading(false);
        }
    };

    // Edit news
    const handleEdit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        if (!aToken) {
            toast.error("Bạn phải đăng nhập để thực hiện hành động này.");
            navigate("/login");
            setIsLoading(false);
            return;
        }

        if (!formData.title.trim() || !formData.content.trim()) {
            toast.error("Tiêu đề và nội dung là bắt buộc.");
            setIsLoading(false);
            return;
        }

        try {
            const submitData = new FormData();
            submitData.append("title", formData.title);
            submitData.append("content", formData.content);
            submitData.append("category", formData.category);
            submitData.append("status", formData.status);
            if (formData.publishAt) submitData.append("publishAt", formData.publishAt.toISOString());
            if (formData.image) {
                submitData.append("image", formData.image);
            } else if (formData.existingImage) {
                submitData.append("existingImage", formData.existingImage);
            }

            const response = await axios.put(`${backendUrl}/admin/news/${selectedNews._id}`, submitData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    Authorization: `Bearer ${aToken}`,
                },
            });
            setNews(news.map((n) => (n._id === selectedNews._id ? response.data.news : n)));
            toast.success(`${formData.title} đã được cập nhật thành công.`);
            setShowEditModal(false);
            resetForm();
        } catch (error) {
            console.error("Lỗi khi cập nhật tin tức:", error);
            toast.error(error.response?.data?.message || "Không thể cập nhật tin tức.");
        } finally {
            setIsLoading(false);
        }
    };

    // Confirm delete
    const confirmDelete = (newsItem) => {
        setNewsToDelete(newsItem);
        setShowDeleteModal(true);
    };

    // Delete news
    const handleDelete = async () => {
        if (!newsToDelete) return;
        setIsLoading(true);

        try {
            await axios.delete(`${backendUrl}/admin/news/${newsToDelete._id}`, {
                headers: { Authorization: `Bearer ${aToken}` },
            });
            setNews(news.filter((n) => n._id !== newsToDelete._id));
            toast.success(`${newsToDelete.title} đã được xóa thành công.`);
            setShowDeleteModal(false);
            setNewsToDelete(null);
        } catch (error) {
            console.error("Lỗi khi xóa tin tức:", error);
            toast.error(error.response?.data?.message || "Không thể xóa tin tức.");
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading && news.length === 0) {
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
                        <Calendar size={24} /> Quản lý tin tức
                    </h1>
                    <button
                        onClick={openAddModal}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm text-sm font-medium"
                    >
                        <Plus size={18} /> Thêm tin tức
                    </button>
                </div>

                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm tin tức theo tiêu đề, nội dung hoặc danh mục..."
                        className="pl-10 pr-10 py-2 w-full border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm"
                        value={searchTerm}
                        onChange={handleSearchChange}
                    />
                    {searchTerm && (
                        <button
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={() => setSearchTerm("")}
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>

                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-1/4">
                                    Tiêu đề
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-1/6">
                                    Danh mục
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-1/6">
                                    Trạng thái
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-1/6">
                                    Lượt xem
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
                            {filteredNews.length > 0 ? (
                                filteredNews.map((n) => (
                                    <tr key={n._id} className="hover:bg-gray-50 transition">
                                        <td className="px-4 py-2 text-sm text-gray-800">{n.title}</td>
                                        <td className="px-4 py-2 text-sm text-gray-600">{categoryMap[n.category]}</td>
                                        <td className="px-4 py-2 text-sm text-gray-600">
                                            {n.status === "published" ? "Đã xuất bản" : "Bản nháp"}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-600">{n.views}</td>
                                        <td className="px-4 py-2 text-sm text-gray-600">
                                            {new Date(n.createdAt).toLocaleDateString("vi-VN")}
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => viewNews(n)}
                                                    className="text-teal-600 hover:text-teal-800 p-1 rounded hover:bg-teal-50 transition"
                                                    title="Xem chi tiết"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button
                                                    onClick={() => openEditModal(n)}
                                                    className="text-blue-500 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition"
                                                    title="Chỉnh sửa"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => confirmDelete(n)}
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
                                        Không tìm thấy tin tức nào khớp với "{searchTerm}"
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Add News Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                    <Plus size={20} /> Thêm tin tức
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Tiêu đề <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            name="title"
                                            value={formData.title}
                                            onChange={handleChange}
                                            placeholder="Nhập tiêu đề tin tức"
                                            required
                                            className="mt-1 w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Danh mục <span className="text-red-500">*</span></label>
                                        <select
                                            name="category"
                                            value={formData.category}
                                            onChange={handleChange}
                                            className="mt-1 w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                                        >
                                            {Object.entries(categoryMap).map(([value, label]) => (
                                                <option key={value} value={value}>
                                                    {label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Nội dung <span className="text-red-500">*</span></label>
                                    <textarea
                                        name="content"
                                        value={formData.content}
                                        onChange={handleChange}
                                        placeholder="Nhập nội dung tin tức"
                                        required
                                        className="mt-1 w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm shadow-sm resize-y"
                                        rows="6"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Trạng thái <span className="text-red-500">*</span></label>
                                        <select
                                            name="status"
                                            value={formData.status}
                                            onChange={handleChange}
                                            className="mt-1 w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                                        >
                                            <option value="draft">Bản nháp</option>
                                            <option value="published">Đã xuất bản</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Ngày xuất bản</label>
                                        <DatePicker
                                            selected={formData.publishAt}
                                            onChange={handlePublishAtChange}
                                            showTimeSelect
                                            dateFormat="Pp"
                                            placeholderText="Chọn ngày xuất bản"
                                            className="mt-1 w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Hình ảnh</label>
                                    <div className="mt-1 relative w-48 h-32 rounded-lg overflow-hidden border-2 border-gray-200 shadow-sm">
                                        {imagePreview && (
                                            <img
                                                src={imagePreview}
                                                alt="News Preview"
                                                className="w-full h-full object-cover"
                                                onError={handleImageError}
                                            />
                                        )}
                                        <button
                                            type="button"
                                            onClick={triggerFileInput}
                                            className="absolute bottom-2 right-2 bg-gray-800 bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition"
                                            title="Chọn hình ảnh"
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
                                        {isLoading ? "Đang thêm..." : "Thêm"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Edit News Modal */}
                {showEditModal && selectedNews && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                    <Edit size={20} /> Cập nhật tin tức
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Tiêu đề <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            name="title"
                                            value={formData.title}
                                            onChange={handleChange}
                                            placeholder="Nhập tiêu đề tin tức"
                                            required
                                            className="mt-1 w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Danh mục <span className="text-red-500">*</span></label>
                                        <select
                                            name="category"
                                            value={formData.category}
                                            onChange={handleChange}
                                            className="mt-1 w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                                        >
                                            {Object.entries(categoryMap).map(([value, label]) => (
                                                <option key={value} value={value}>
                                                    {label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Nội dung <span className="text-red-500">*</span></label>
                                    <textarea
                                        name="content"
                                        value={formData.content}
                                        onChange={handleChange}
                                        placeholder="Nhập nội dung tin tức"
                                        required
                                        className="mt-1 w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm shadow-sm resize-y"
                                        rows="6"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Trạng thái <span className="text-red-500">*</span></label>
                                        <select
                                            name="status"
                                            value={formData.status}
                                            onChange={handleChange}
                                            className="mt-1 w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                                        >
                                            <option value="draft">Bản nháp</option>
                                            <option value="published">Đã xuất bản</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Ngày xuất bản</label>
                                        <DatePicker
                                            selected={formData.publishAt}
                                            onChange={handlePublishAtChange}
                                            showTimeSelect
                                            dateFormat="Pp"
                                            placeholderText="Chọn ngày xuất bản"
                                            className="mt-1 w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Hình ảnh</label>
                                    <div className="mt-1 relative w-48 h-32 rounded-lg overflow-hidden border-2 border-gray-200 shadow-sm">
                                        {imagePreview && (
                                            <img
                                                src={imagePreview}
                                                alt="News Preview"
                                                className="w-full h-full object-cover"
                                                onError={handleImageError}
                                            />
                                        )}
                                        <button
                                            type="button"
                                            onClick={triggerFileInput}
                                            className="absolute bottom-2 right-2 bg-gray-800 bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition"
                                            title="Chọn hình ảnh"
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
                                Bạn có chắc muốn xóa tin tức "{newsToDelete?.title}"? Hành động này không thể hoàn tác.
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

                {/* View News Modal */}
                {showViewModal && selectedNews && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Eye className="h-5 w-5 text-teal-600" />
                                    <h3 className="text-lg font-semibold text-gray-800">{selectedNews.title}</h3>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowViewModal(false);
                                        setSelectedNews(null);
                                    }}
                                    className="text-gray-500 hover:text-gray-700 transition"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="space-y-4">
                                {selectedNews.image && (
                                    <div className="rounded-lg overflow-hidden shadow-sm">
                                        <img
                                            src={selectedNews.image}
                                            alt={selectedNews.title}
                                            className="w-full h-48 object-cover"
                                            onError={handleImageError}
                                        />
                                    </div>
                                )}
                                <div className="p-4 bg-gray-50 rounded-lg shadow-sm">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Nội dung</h4>
                                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedNews.content}</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-lg shadow-sm">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Thông tin</h4>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={16} className="text-gray-500" />
                                            <span className="text-sm text-gray-600">
                                                <span className="font-medium">Danh mục:</span> {categoryMap[selectedNews.category]}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar size={16} className="text-gray-500" />
                                            <span className="text-sm text-gray-600">
                                                <span className="font-medium">Trạng thái:</span>{" "}
                                                {selectedNews.status === "published" ? "Đã xuất bản" : "Bản nháp"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar size={16} className="text-gray-500" />
                                            <span className="text-sm text-gray-600">
                                                <span className="font-medium">Ngày xuất bản:</span>{" "}
                                                {selectedNews.publishAt
                                                    ? new Date(selectedNews.publishAt).toLocaleString("vi-VN")
                                                    : "Chưa đặt"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Eye size={16} className="text-gray-500" />
                                            <span className="text-sm text-gray-600">
                                                <span className="font-medium">Lượt xem:</span> {selectedNews.views}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar size={16} className="text-gray-500" />
                                            <span className="text-sm text-gray-600">
                                                <span className="font-medium">Ngày tạo:</span>{" "}
                                                {new Date(selectedNews.createdAt).toLocaleDateString("vi-VN", {
                                                    year: "numeric",
                                                    month: "long",
                                                    day: "numeric",
                                                })}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar size={16} className="text-gray-500" />
                                            <span className="text-sm text-gray-600">
                                                <span className="font-medium">Ngày cập nhật:</span>{" "}
                                                {new Date(selectedNews.updatedAt).toLocaleDateString("vi-VN", {
                                                    year: "numeric",
                                                    month: "long",
                                                    day: "numeric",
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">

                                <button
                                    onClick={() => {
                                        setShowViewModal(false);
                                        setSelectedNews(null);
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

export default ManageNews;