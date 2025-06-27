import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../Context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import moment from 'moment-timezone';

// Google Fonts for Vietnamese
const fontStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  .font-vietnamese {
    font-family: 'Inter', 'Roboto', 'Noto Sans', Arial, sans-serif;
  }
`;

const MyAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [pastAppointments, setPastAppointments] = useState([]);
  const [selectedTab, setSelectedTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const appointmentsPerPage = 10;
  const { token, setToken, setUserData, backEndUrl } = useContext(AppContext);
  const navigate = useNavigate();

  // Helper function to construct image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath || !imagePath.trim()) {
      console.log('[getImageUrl] No image path provided, returning null');
      return null;
    }
    const cleanPath = imagePath.replace(/^\/?(?:images\/)?(?:uploads\/)?(?:doctors\/)?/, '');
    const url = `${backEndUrl}/images/uploads/doctors/${cleanPath}?t=${Date.now()}`;
    console.log('[getImageUrl] Constructed URL:', url, 'from path:', imagePath);
    return url;
  };

  // Check if appointment is within 1 hour of current time
  const isWithinOneHour = (appointmentDate, timeslot) => {
    try {
      const [startTime] = timeslot.split('-');
      const [hours, minutes] = startTime.split(':').map(Number);
      const apptDateTime = moment.tz(appointmentDate, 'Asia/Ho_Chi_Minh')
        .set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
      const currentDateTime = moment.tz('Asia/Ho_Chi_Minh');
      const timeDiff = apptDateTime.diff(currentDateTime, 'minutes');
      console.log('[isWithinOneHour] Appointment:', {
        appointmentDate: apptDateTime.format(),
        currentDateTime: currentDateTime.format(),
        timeDiff,
      });
      return timeDiff < 60;
    } catch (error) {
      console.warn('[isWithinOneHour] Error parsing date:', { appointmentDate, timeslot, error: error.message });
      return false;
    }
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
      setCurrentPage(1);
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

  // Format date
  const formatDate = (dateString) => {
    try {
      const date = moment.tz(dateString, 'Asia/Ho_Chi_Minh');
      return date.format('DD MMM YYYY');
    } catch (error) {
      console.warn('[formatDate] Invalid date:', dateString);
      return dateString;
    }
  };

  // Filter and paginate appointments
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

  const paginatedAppointments = () => {
    const filtered = filteredAppointments();
    const startIndex = (currentPage - 1) * appointmentsPerPage;
    const endIndex = startIndex + appointmentsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredAppointments().length / appointmentsPerPage);

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    const sidePages = 2;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      let startPage = Math.max(1, currentPage - sidePages);
      let endPage = Math.min(totalPages, currentPage + sidePages);

      if (currentPage <= sidePages + 1) {
        endPage = maxPagesToShow - 1;
      } else if (currentPage >= totalPages - sidePages) {
        startPage = totalPages - maxPagesToShow + 2;
      }

      if (startPage > 1) {
        pageNumbers.push(1);
        if (startPage > 2) pageNumbers.push('...');
      }

      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }

      if (endPage < totalPages) {
        if (endPage < totalPages - 1) pageNumbers.push('...');
        pageNumbers.push(totalPages);
      }
    }
    return pageNumbers;
  };

  const handlePageChange = (page) => {
    if (page !== '...' && page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      console.log('[handlePageChange] Changed to page:', page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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
      const current = moment.tz('Asia/Ho_Chi_Minh');
      setUpcomingAppointments(
        appointments.filter((appt) => moment.tz(appt.appointmentDate, 'Asia/Ho_Chi_Minh') >= current)
      );
      setPastAppointments(
        appointments.filter((appt) => moment.tz(appt.appointmentDate, 'Asia/Ho_Chi_Minh') < current)
      );
      setCurrentPage(1);
    }
  }, [appointments]);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-vietnamese">
      <style>{fontStyle}</style>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Lịch Hẹn Của Tôi
        </h1>

        {/* Search and Filter */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full sm:w-auto">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên bác sĩ, chuyên khoa hoặc ngày..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            />
          </div>
          <div className="w-full sm:w-48">
            <select
              id="filter"
              value={selectedTab}
              onChange={(e) => {
                setSelectedTab(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full p-3 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 text-sm transition-all duration-200"
            >
              <option value="all">Tất cả</option>
              <option value="upcoming">Sắp tới</option>
              <option value="past">Đã qua</option>
            </select>
          </div>
        </div>

        {/* Appointment List */}
        {isLoading ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600 text-lg animate-pulse">Đang tải lịch hẹn...</p>
          </div>
        ) : filteredAppointments().length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600 text-lg mb-4">
              Không tìm thấy lịch hẹn {selectedTab === 'upcoming' ? 'sắp tới' : selectedTab === 'past' ? 'đã qua' : ''}.
            </p>
            <button
              onClick={() => navigate('/book-appointment')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200"
            >
              Đặt Lịch Hẹn
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-6">
              {paginatedAppointments().map((appt) => (
                <div
                  key={appt._id}
                  className="bg-white rounded-lg shadow-md p-6 flex items-center gap-6 hover:shadow-xl transition-all duration-200"
                >
                  {/* Doctor Image */}
                  {appt.doctorId?.image ? (
                    <img
                      src={getImageUrl(appt.doctorId.image)}
                      alt={appt.doctorId?.name || 'Bác sĩ'}
                      className="w-16 h-16 rounded-full object-cover border border-gray-200"
                      onError={(e) => {
                        console.warn('[MyAppointments] Image load failed:', e.target.src);
                        e.target.src = '/images/fallback-doctor.jpg';
                      }}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-lg font-medium border border-gray-200">
                      BS
                    </div>
                  )}

                  {/* Appointment Details */}
                  <div className="flex-1">
                    <p className="text-xl font-semibold text-gray-900">
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
                  <div className="flex flex-col gap-3 items-end">
                    <span
                      className={`text-sm font-medium px-3 py-1 rounded-full ${appt.status === 'cancelled'
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
                        disabled={isWithinOneHour(appt.appointmentDate, appt.timeslot)}
                        className={`px-4 py-2 text-sm rounded-md transition-all duration-200 ${isWithinOneHour(appt.appointmentDate, appt.timeslot)
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200'
                          }`}
                        title={
                          isWithinOneHour(appt.appointmentDate, appt.timeslot)
                            ? 'Không thể hủy trong vòng 1 giờ trước giờ khám'
                            : 'Hủy lịch hẹn'
                        }
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
                        className="px-4 py-2 text-sm bg-blue-50 text-blue-600 rounded-md border border-blue-200 hover:bg-blue-600 hover:text-white transition-all duration-200"
                      >
                        Xem chi tiết
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center items-center gap-2">
                {getPageNumbers().map((page, index) => (
                  <button
                    key={index}
                    onClick={() => handlePageChange(page)}
                    disabled={page === '...' || page === currentPage}
                    className={`px-4 py-2 text-sm rounded-md transition-all duration-200 ${page === currentPage
                        ? 'bg-blue-600 text-white'
                        : page === '...'
                          ? 'text-gray-500 cursor-default'
                          : 'bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-600'
                      }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MyAppointments;