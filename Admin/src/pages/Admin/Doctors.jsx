import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { AdminContext } from '../../context/AdminContext';
import { Camera, Search, X, Eye, Trash2, Edit, Plus } from 'lucide-react';

const DEFAULT_IMAGE = 'https://via.placeholder.com/150?text=Doctor';

const DoctorsPage = () => {
  const [doctors, setDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [doctorToDelete, setDoctorToDelete] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    specialty: '',
    phone: '',
    location: '',
    experience: '',
    about: '',
    fees: '',
    image: null,
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [specialties, setSpecialties] = useState([]);
  const { aToken, backendUrl, logout, isTokenExpired } = useContext(AdminContext);
  const fileInputRef = useRef(null);

  // Helper function to get full image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return DEFAULT_IMAGE;
    if (imagePath.startsWith('data:') || imagePath.startsWith('http')) return imagePath;
    const url = `${backendUrl}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
    console.log('[DoctorsPage] Generated image URL:', url);
    return url;
  };

  // Log context values and check token
  useEffect(() => {
    console.log('[DoctorsPage] AdminContext:', { aToken, backendUrl });
    if (!backendUrl) {
      toast.error('Backend URL không được cấu hình!');
      setIsLoading(false);
    }
    if (aToken && isTokenExpired(aToken)) {
      logout();
    }
  }, [aToken, backendUrl, logout, isTokenExpired]);

  // Fetch doctors and specialties
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (!aToken || !backendUrl) {
          throw new Error('Thiếu token hoặc backendUrl');
        }

        const [doctorsResponse, specialtiesResponse] = await Promise.all([
          axios.get(`${backendUrl}/admin/doctor`, {
            headers: { Authorization: `Bearer ${aToken}` },
          }),
          axios.get(`${backendUrl}/admin/specialties`, {
            headers: { Authorization: `Bearer ${aToken}` },
          }),
        ]);

        console.log('[DoctorsPage] Doctors Response:', doctorsResponse.data);
        if (doctorsResponse.data?.success && Array.isArray(doctorsResponse.data.data)) {
          setDoctors(doctorsResponse.data.data);
        } else {
          console.warn('[DoctorsPage] Unexpected doctors response format:', doctorsResponse.data);
          setDoctors([]);
          toast.error('Dữ liệu bác sĩ không đúng định dạng.');
        }

        console.log('[DoctorsPage] Specialties Response:', specialtiesResponse.data);
        const specialtiesData = Array.isArray(specialtiesResponse.data) ? specialtiesResponse.data : [];
        setSpecialties(specialtiesData);
      } catch (error) {
        console.error('[DoctorsPage] Lỗi khi lấy dữ liệu:', error.response?.data || error.message);
        if (error.response?.status === 400 || error.response?.status === 401 || error.response?.status === 403) {
          toast.error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
          logout();
        } else {
          toast.error(error.response?.data?.message || 'Không thể tải danh sách bác sĩ hoặc chuyên khoa.');
        }
        setDoctors([]);
        setSpecialties([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (aToken && backendUrl) {
      fetchData();
    } else {
      setIsLoading(false);
      toast.error('Cấu hình không hợp lệ. Vui lòng kiểm tra đăng nhập.');
    }
  }, [aToken, backendUrl, logout]);

  // Handle form input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle image upload
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, image: file });
      const reader = new FileReader();
      reader.onload = () => {
        console.log('[DoctorsPage] Image preview loaded:', reader.result.substring(0, 50) + '...');
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
      name: '',
      email: '',
      password: '',
      specialty: '',
      phone: '',
      location: '',
      experience: '',
      about: '',
      fees: '',
      image: null,
    });
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Open add modal
  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  // Open edit modal
  const openEditModal = (doctor) => {
    console.log('[DoctorsPage] Opening edit modal for doctor:', doctor);
    setFormData({
      name: doctor.name || '',
      email: doctor.email || '',
      password: '',
      specialty: doctor.specialty?._id || '',
      phone: doctor.phone || '',
      location: doctor.location || '',
      experience: doctor.experience || '',
      about: doctor.about || '',
      fees: doctor.fees || '',
      image: null,
    });
    const previewUrl = getImageUrl(doctor.image);
    console.log('[DoctorsPage] Setting image preview for edit:', previewUrl);
    setImagePreview(previewUrl);
    setSelectedDoctor(doctor);
    setShowEditModal(true);
  };

  // Validate form fields
  const validateForm = (isEdit = false) => {
    const requiredFields = [
      { field: 'name', label: 'Tên' },
      { field: 'email', label: 'Email' },
      { field: 'specialty', label: 'Chuyên khoa' },
      { field: 'location', label: 'Địa điểm' },
      { field: 'experience', label: 'Kinh nghiệm' },
      { field: 'about', label: 'Giới thiệu' },
      { field: 'fees', label: 'Phí tư vấn' },
    ];

    if (!isEdit) {
      requiredFields.push({ field: 'password', label: 'Mật khẩu' });
      requiredFields.push({ field: 'image', label: 'Hình ảnh' });
    }

    for (const { field, label } of requiredFields) {
      if (!formData[field] || (typeof formData[field] === 'string' && !formData[field].trim())) {
        return `Vui lòng điền ${label.toLowerCase()}.`;
      }
    }
    return null;
  };

  // Add doctor
  const handleAdd = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!aToken) {
      toast.error('Bạn cần đăng nhập để thực hiện hành động này.');
      logout();
      setIsLoading(false);
      return;
    }

    const validationError = validateForm(false);
    if (validationError) {
      toast.error(validationError);
      setIsLoading(false);
      return;
    }

    try {
      console.log('[DoctorsPage] Sending add-doctor request with token:', aToken);
      const submitData = new FormData();
      Object.keys(formData).forEach((key) => {
        if (formData[key]) submitData.append(key, formData[key]);
      });

      const response = await axios.post(`${backendUrl}/admin/add-doctor`, submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${aToken}`,
        },
      });

      setDoctors([...doctors, response.data.doctor]);
      toast.success(`Bác sĩ ${formData.name} đã được thêm.`);
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error('[DoctorsPage] Error adding doctor:', error.response?.data || error);
      const errorMessage = error.response?.data?.message || 'Không thể thêm bác sĩ.';
      if (
        error.response?.status === 401 ||
        (error.response?.status === 400 &&
          ['Token không hợp lệ', 'Token has expired', 'No token provided'].includes(errorMessage))
      ) {
        toast.error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
        logout();
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Edit doctor
  const handleEdit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!aToken) {
      toast.error('Bạn cần đăng nhập để thực hiện hành động này.');
      logout();
      setIsLoading(false);
      return;
    }

    if (!selectedDoctor) {
      toast.error('Không tìm thấy bác sĩ để cập nhật.');
      setIsLoading(false);
      return;
    }

    const validationError = validateForm(true);
    if (validationError) {
      toast.error(validationError);
      setIsLoading(false);
      return;
    }

    try {
      console.log('[DoctorsPage] Sending update-doctor request with token:', aToken, 'for doctor ID:', selectedDoctor._id);
      const submitData = new FormData();
      Object.keys(formData).forEach((key) => {
        if (formData[key] && key !== 'password') submitData.append(key, formData[key]);
      });
      if (formData.password?.trim()) submitData.append('password', formData.password);
      if (!formData.image && selectedDoctor.image) submitData.append('existingImage', selectedDoctor.image);

      const response = await axios.put(`${backendUrl}/admin/doctor/update/${selectedDoctor._id}`, submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${aToken}`,
        },
      });

      setDoctors(doctors.map((doc) => (doc._id === selectedDoctor._id ? response.data.doctor : doc)));
      toast.success(`Bác sĩ ${formData.name} đã được cập nhật.`);
      setShowEditModal(false);
      setSelectedDoctor(null);
      resetForm();
    } catch (error) {
      console.error('[DoctorsPage] Error updating doctor:', error.response?.data || error);
      const errorMessage = error.response?.data?.message || 'Không thể cập nhật bác sĩ.';
      if (
        error.response?.status === 401 ||
        (error.response?.status === 400 &&
          ['Token không hợp lệ', 'Token has expired', 'No token provided'].includes(errorMessage))
      ) {
        toast.error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
        logout();
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // View doctor
  const viewDoctor = (doctor) => {
    console.log('[DoctorsPage] Viewing doctor:', doctor);
    setSelectedDoctor(doctor);
    setShowViewModal(true);
  };

  // Confirm delete
  const confirmDelete = (doctor) => {
    console.log('[DoctorsPage] Confirming delete for doctor:', doctor);
    setDoctorToDelete(doctor);
    setShowDeleteModal(true);
  };

  // Delete doctor
  const handleDelete = async () => {
    if (!doctorToDelete || !aToken) {
      toast.error('Bác sĩ hoặc token không hợp lệ.');
      logout();
      return;
    }
    setIsLoading(true);

    try {
      await axios.delete(`${backendUrl}/admin/doctor/${doctorToDelete._id}`, {
        headers: { Authorization: `Bearer ${aToken}` },
      });
      setDoctors(doctors.filter((doc) => doc._id !== doctorToDelete._id));
      toast.success(`Bác sĩ ${doctorToDelete.name} đã được xóa.`);
      setShowDeleteModal(false);
      setDoctorToDelete(null);
    } catch (error) {
      console.error('[DoctorsPage] Error deleting doctor:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      const errorMessage = error.response?.data?.message || 'Không thể xóa bác sĩ.';
      if (
        error.response?.status === 401 ||
        (error.response?.status === 400 &&
          ['Token không hợp lệ', 'Token has expired', 'No token provided'].includes(errorMessage))
      ) {
        toast.error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
        logout();
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle image load error
  const handleImageError = (e) => {
    console.warn('[DoctorsPage] Image failed to load:', e.target.src);
    e.target.src = DEFAULT_IMAGE;
  };

  if (isLoading && doctors.length === 0) {
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
        .modal-exit {
          opacity: 1;
          transform: scale(1);
        }
        .modal-exit-active {
          opacity: 0;
          transform: scale(0.95);
          transition: opacity 300ms, transform 300ms;
        }
      `}</style>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Quản lý bác sĩ</h1>
        <button
          onClick={openAddModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
        >
          <Plus size={18} />
          Thêm bác sĩ
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Tìm kiếm bác sĩ theo tên, chuyên khoa hoặc email"
          className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button
            className="absolute inset-y-0 right-0 flex items-center pr-3"
            onClick={() => setSearchTerm('')}
          >
            <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* Doctors Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Tên
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Chuyên ngành
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Số điện thoại
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {doctors.length > 0 ? (
                doctors
                  .filter(
                    (doctor) =>
                      doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (doctor.specialty?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                      doctor.email.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((doctor) => (
                    <tr key={doctor._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{doctor.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-sm">
                          {doctor.specialty?.name || 'Không xác định'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{doctor.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{doctor.phone || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => viewDoctor(doctor)}
                            className="text-green-600 hover:text-green-800 p-1"
                            title="Xem chi tiết"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => openEditModal(doctor)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title="Chỉnh sửa"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => confirmDelete(doctor)}
                            className="text-red-600 hover:text-red-800 p-1"
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
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    Không tìm thấy bác sĩ nào khớp với "{searchTerm || 'Không có'}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Doctor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto modal-enter modal-enter-active">
            <h3 className="text-lg font-semibold mb-4">Thêm bác sĩ</h3>
            <form onSubmit={handleAdd} className="space-y-4" autoComplete="off">
              <div className="flex justify-center">
                <div className="relative w-24 h-24 rounded-md overflow-hidden border-2 border-gray-300">
                  <img
                    src={imagePreview || DEFAULT_IMAGE}
                    alt="Doctor Preview"
                    className="object-cover w-full h-full"
                    onError={handleImageError}
                  />
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
                    placeholder="Tên bác sĩ"
                    required
                    className="mt-2 block w-full text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Email bác sĩ"
                    required
                    autoComplete="off"
                    className="mt-2 block w-full text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mật khẩu</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Mật khẩu (ít nhất 6 ký tự)"
                    required
                    autoComplete="new-password"
                    className="mt-2 block w-full text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Chuyên khoa</label>
                  <select
                    name="specialty"
                    value={formData.specialty}
                    onChange={handleChange}
                    required
                    className="mt-2 block w-full text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="">Chọn chuyên khoa</option>
                    {specialties.map((specialty) => (
                      <option key={specialty._id} value={specialty._id}>{specialty.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Số điện thoại</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Số điện thoại"
                    className="mt-2 block w-full text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Địa điểm</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="Địa điểm làm việc"
                    required
                    className="mt-2 block w-full text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Kinh nghiệm (năm)</label>
                  <input
                    type="number"
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    placeholder="Số năm kinh nghiệm"
                    required
                    min="0"
                    className="mt-2 block w-full text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phí tư vấn</label>
                  <input
                    type="number"
                    name="fees"
                    value={formData.fees}
                    onChange={handleChange}
                    placeholder="Phí tư vấn"
                    required
                    min="0"
                    className="mt-2 block w-full text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div className="col-span-full">
                  <label className="block text-sm font-medium text-gray-700">Giới thiệu</label>
                  <textarea
                    name="about"
                    value={formData.about}
                    onChange={handleChange}
                    placeholder="Thông tin giới thiệu bác sĩ"
                    required
                    rows="3"
                    className="mt-2 block w-full text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  disabled={isLoading}
                >
                  {isLoading ? 'Đang thêm...' : 'Thêm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Doctor Modal */}
      {showEditModal && selectedDoctor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto modal-enter modal-enter-active">
            <h3 className="text-lg font-semibold mb-4">Cập nhật bác sĩ</h3>
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="flex justify-center">
                <div className="relative w-24 h-24 rounded-md overflow-hidden border-2 border-gray-300">
                  <img
                    src={imagePreview || DEFAULT_IMAGE}
                    alt="Doctor Preview"
                    className="object-cover w-full h-full"
                    onError={handleImageError}
                  />
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
                    placeholder="Tên bác sĩ"
                    required
                    className="mt-2 block w-full text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Email bác sĩ"
                    required
                    className="mt-2 block w-full text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
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
                    className="mt-2 block w-full text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Chuyên khoa</label>
                  <select
                    name="specialty"
                    value={formData.specialty}
                    onChange={handleChange}
                    required
                    className="mt-2 block w-full text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="">Chọn chuyên khoa</option>
                    {specialties.map((specialty) => (
                      <option key={specialty._id} value={specialty._id}>{specialty.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Số điện thoại</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Số điện thoại"
                    className="mt-2 block w-full text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Địa điểm</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="Địa điểm làm việc"
                    required
                    className="mt-2 block w-full text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Kinh nghiệm (năm)</label>
                  <input
                    type="number"
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    placeholder="Số năm kinh nghiệm"
                    required
                    min="0"
                    className="mt-2 block w-full text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phí tư vấn</label>
                  <input
                    type="number"
                    name="fees"
                    value={formData.fees}
                    onChange={handleChange}
                    placeholder="Phí tư vấn"
                    required
                    min="0"
                    className="mt-2 block w-full text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div className="col-span-full">
                  <label className="block text-sm font-medium text-gray-700">Giới thiệu</label>
                  <textarea
                    name="about"
                    value={formData.about}
                    onChange={handleChange}
                    placeholder="Thông tin giới thiệu bác sĩ"
                    required
                    rows="3"
                    className="mt-2 block w-full text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedDoctor(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
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
      {showDeleteModal && doctorToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 modal-enter modal-enter-active"
            role="dialog"
            aria-labelledby="delete-modal-title"
            aria-describedby="delete-modal-description"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2 rounded-full">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <h3 id="delete-modal-title" className="text-lg font-semibold text-gray-900">
                Xác nhận xóa bác sĩ
              </h3>
            </div>
            <p id="delete-modal-description" className="text-sm text-gray-600 mb-6">
              Bạn có chắc chắn muốn xóa bác sĩ <span className="font-semibold">{doctorToDelete.name}</span>? Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDoctorToDelete(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors"
                aria-label="Hủy bỏ xóa"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors"
                disabled={isLoading}
                aria-label="Xác nhận xóa bác sĩ"
              >
                {isLoading ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Doctor Modal */}
      {showViewModal && selectedDoctor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto modal-enter modal-enter-active">
            <h3 className="text-lg font-semibold mb-4">Thông tin bác sĩ</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <img
                  src={getImageUrl(selectedDoctor.image)}
                  alt={selectedDoctor.name}
                  className="w-24 h-24 object-cover rounded-full border-2 border-gray-300"
                  onError={handleImageError}
                />
                <div>
                  <h4 className="text-xl font-semibold text-gray-800">{selectedDoctor.name}</h4>
                  <p className="text-sm text-gray-600">{selectedDoctor.specialty?.name || 'Không xác định'}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Email</p>
                  <p className="text-sm text-gray-500">{selectedDoctor.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Số điện thoại</p>
                  <p className="text-sm text-gray-500">{selectedDoctor.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Địa điểm</p>
                  <p className="text-sm text-gray-500">{selectedDoctor.location || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Kinh nghiệm</p>
                  <p className="text-sm text-gray-500">{selectedDoctor.experience ? `${selectedDoctor.experience} năm` : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Phí tư vấn</p>
                  <p className="text-sm text-gray-500">{selectedDoctor.fees ? `${selectedDoctor.fees} VND` : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Ngày tạo</p>
                  <p className="text-sm text-gray-500">{new Date(selectedDoctor.createdAt).toLocaleDateString('vi-VN')}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Giới thiệu</p>
                <p className="text-sm text-gray-500">{selectedDoctor.about || 'N/A'}</p>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedDoctor(null);
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

export default DoctorsPage;