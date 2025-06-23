import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../Context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

// Google Fonts for Vietnamese
const fontStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&display=swap');
  .font-vietnamese {
    font-family: 'Roboto', 'Noto Sans', Arial, sans-serif;
  }
`;

const MyAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [pastAppointments, setPastAppointments] = useState([]);
  const [selectedTab, setSelectedTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { token, setToken, setUserData, backEndUrl } = useContext(AppContext);
  const navigate = useNavigate();

  // Helper function to construct image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath || !imagePath.trim()) {
      console.log('[getImageUrl] No image path provided, returning null');
      return null;
    }
    // Remove any leading path segments to get just the filename
    const cleanPath = imagePath.replace(/^\/?(?:images\/)?(?:uploads\/)?(?:doctors\/)?/, '');
    const url = `${backEndUrl}/images/uploads/doctors/${cleanPath}?t=${Date.now()}`;
    console.log('[getImageUrl] Constructed URL:', url, 'from path:', imagePath);
    return url;
  };

  // Fetch Appointments
  const fetchAppointments = async () => {
    try {
      setIsLoading(true);
      if (!token) {
        toast.error('Vui lòng đăng nhập để xem lịch hẹn');
        navigate('/login');
        console.log('[fetchAppointments] No token, redirecting to login');
        return;
      }

      const backendUrl = backEndUrl || import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const endpoint = `${backendUrl}/patient/my-appointment`;
      console.log('[fetchAppointments] Fetching appointments from:', endpoint);

      const response = await axios.get(endpoint, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('[fetchAppointments] Raw API response:', response.data);

      let appointmentsData = [];
      if (Array.isArray(response.data)) {
        console.warn('[fetchAppointments] Received array directly, expected object with data');
        appointmentsData = response.data;
      } else if (response.data.success && Array.isArray(response.data.data)) {
        appointmentsData = response.data.data;
      } else {
        throw new Error(response.data.message || 'Dữ liệu lịch hẹn không hợp lệ');
      }

      setAppointments(appointmentsData);
      console.log('[fetchAppointments] Set appointments:', appointmentsData.length);
    } catch (error) {
      console.error('[fetchAppointments] Error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      toast.error(error.response?.data?.message || 'Không thể tải lịch hẹn');
      setAppointments([]);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        setToken('');
        setUserData(null);
        navigate('/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel Appointment
  const cancelAppointment = async (id) => {
    const isConfirmed = window.confirm('Bạn có chắc chắn muốn hủy lịch hẹn này?');
    if (!isConfirmed) {
      console.log('[cancelAppointment] User cancelled action for appointment:', id);
      return;
    }

    try {
      console.log(`[cancelAppointment] Cancelling appointment ID: ${id}`);
      const response = await axios.post(
        `${backEndUrl}/patient/cancel-appointment/${id}`,
        {},
        {
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log('[cancelAppointment] Cancel response:', response.data);
      if (response.data.success) {
        toast.success('Hủy lịch hẹn thành công');
        setAppointments((prev) =>
          prev.map((appt) => (appt._id === id ? { ...appt, status: 'cancelled' } : appt))
        );
      } else {
        toast.error(response.data.message || 'Lỗi khi hủy lịch hẹn');
        console.warn('[cancelAppointment] Failed to cancel:', response.data);
      }
    } catch (error) {
      console.error('[cancelAppointment] Error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      toast.error(error.response?.data?.message || 'Lỗi khi hủy lịch hẹn');
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        setToken('');
        setUserData(null);
        navigate('/login');
      }
    }
  };

  // Format date (exclude time)
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      console.warn('[formatDate] Invalid date:', dateString);
      return dateString;
    }
  };

  // Filter appointments
  const filteredAppointments = () => {
    let filtered = selectedTab === 'upcoming' ? upcomingAppointments : selectedTab === 'past' ? pastAppointments : appointments;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (appt) =>
          appt.doctorId?.name?.toLowerCase().includes(query) ||
          appt.doctorId?.specialty?.name?.toLowerCase().includes(query) ||
          formatDate(appt.appointmentDate).toLowerCase().includes(query) ||
          appt.timeslot?.toLowerCase().includes(query)
      );
    }
    return filtered;
  };

  useEffect(() => {
    if (token) {
      fetchAppointments();
    } else {
      navigate('/login');
    }
  }, [token, backEndUrl, navigate]);

  // Separate past and upcoming appointments
  useEffect(() => {
    if (appointments.length > 0) {
      const current = new Date();
      setUpcomingAppointments(appointments.filter((appt) => new Date(appt.appointmentDate) >= current));
      setPastAppointments(appointments.filter((appt) => new Date(appt.appointmentDate) < current));
    }
  }, [appointments]);

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 flex flex-col items-center font-vietnamese">
      <style>{fontStyle}</style>
      <div className="w-full max-w-4xl">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 text-center">
          Lịch Hẹn Của Tôi
        </h1>

        {/* Search and Filter */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên bác sĩ, chuyên khoa hoặc ngày..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>
          <div className="bg-white rounded-lg shadow-sm p-2 w-full md:w-48">
            <select
              id="filter"
              value={selectedTab}
              onChange={(e) => setSelectedTab(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">Tất cả</option>
              <option value="upcoming">Sắp tới</option>
              <option value="past">Đã qua</option>
            </select>
          </div>
        </div>

        {/* Appointment List */}
        {isLoading ? (
          <div className="w-full bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-500 text-lg">Đang tải lịch hẹn...</p>
          </div>
        ) : filteredAppointments().length === 0 ? (
          <div className="w-full bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-500 text-lg">
              Không tìm thấy lịch hẹn {selectedTab === 'upcoming' ? 'sắp tới' : selectedTab === 'past' ? 'đã qua' : ''}.
            </p>
            <button
              onClick={() => navigate('/book-appointment')}
              className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-all"
            >
              Đặt Lịch Hẹn
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAppointments().map((appt) => (
              <div
                key={appt._id}
                className="bg-white rounded-lg shadow-md p-4 flex items-center gap-4 hover:shadow-lg transition-all"
              >
                {/* Doctor Image */}
                {appt.doctorId?.image ? (
                  <img
                    src={getImageUrl(appt.doctorId.image)}
                    alt={appt.doctorId?.name || 'Bác sĩ'}
                    className="w-12 h-12 rounded-full object-cover border border-gray-200"
                    onError={(e) => {
                      console.warn('[MyAppointments] Image load failed:', e.target.src);
                      e.target.src = '/path/to/placeholder-image.jpg'; // Replace with actual placeholder path
                    }}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 border border-gray-200">
                    BS
                  </div>
                )}

                {/* Appointment Details */}
                <div className="flex-1">
                  <p className="text-lg font-semibold text-gray-800">
                    {appt.doctorId?.name || 'Bác sĩ không xác định'}
                  </p>
                  <p className="text-gray-600 text-sm">
                    Chuyên khoa: {appt.doctorId?.specialty?.name || 'Không có thông tin'}
                  </p>
                  <p className="text-gray-500 text-sm">
                    Ngày: {formatDate(appt.appointmentDate)}
                  </p>
                  <p className="text-gray-500 text-sm">
                    Giờ: {appt.timeslot || 'Không xác định'}
                  </p>
                </div>

                {/* Status and Action Buttons */}
                <div className="flex flex-col gap-2">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full w-28 text-center ${appt.status === 'cancelled'
                        ? 'bg-red-100 text-red-700'
                        : appt.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                  >
                    {appt.status === 'cancelled' ? 'Đã hủy' : appt.status === 'pending' ? 'Chờ xác nhận' : 'Hoàn thành'}
                  </span>
                  {appt.status === 'pending' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        cancelAppointment(appt._id);
                      }}
                      className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-md border border-red-200 hover:bg-red-600 hover:text-white transition-all w-28 text-center"
                    >
                      Hủy
                    </button>
                  )}
                  {appt.status === 'completed' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/appointments/${appt._id}`);
                      }}
                      className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-md border border-blue-200 hover:bg-blue-600 hover:text-white transition-all w-28 text-center"
                    >
                      Xem chi tiết
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyAppointments;