import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AppContext } from "../../context/AppContext";
import { DoctorContext } from "../../context/DoctorContext";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

// Custom debounce hook
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

const StatusBadge = ({ status, onClick }) => {
  const statusColors = {
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    pending: "bg-blue-100 text-blue-800",
  };

  const statusText = {
    completed: "Hoàn thành",
    cancelled: "Đã hủy",
    pending: "Đang chờ",
  };

  const normalizedStatus = status ? status.toLowerCase() : "pending";
  const isClickable = normalizedStatus === "pending" && onClick;

  return (
    <span
      onClick={isClickable ? onClick : undefined}
      className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium shadow-sm ${statusColors[normalizedStatus] || "bg-gray-100 text-gray-800"} ${isClickable ? "cursor-pointer hover:scale-105 hover:bg-opacity-80 transition transform" : "cursor-default"
        }`}
      title={`Trạng thái: ${statusText[normalizedStatus] || "Không xác định"}`}
    >
      {statusText[normalizedStatus] || "Không xác định"}
    </span>
  );
};

const StatusModal = ({ isOpen, onClose, onSubmit, appointmentId, status }) => {
  const [note, setNote] = useState("");
  const [newStatus, setNewStatus] = useState(status || "pending");

  const statusOptions = [
    { value: "completed", label: "Hoàn thành" },
    { value: "cancelled", label: "Đã hủy" },
  ].filter(option => option.value !== status?.toLowerCase());

  const handleSubmit = () => {
    onSubmit(appointmentId, newStatus, note.trim());
    setNote("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl transform transition-all duration-300 scale-100">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Cập nhật trạng thái lịch hẹn</h3>
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Trạng thái</label>
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            aria-label="Chọn trạng thái lịch hẹn"
          >
            <option value="" disabled>Chọn trạng thái</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Lý do (tùy chọn)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nhập lý do nếu có"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            rows="4"
            aria-label="Nhập lý do"
            title="Nhập lý do"
          />
        </div>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
            aria-label="Hủy"
            title="Hủy"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={!newStatus}
            className={`px-4 py-2 rounded-lg transition font-medium ${newStatus ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            aria-label="Xác nhận"
            title="Xác nhận"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
};

const Appointment = () => {
  const [activeTab, setActiveTab] = useState("upcoming");
  const [appointments, setAppointments] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [doctorId, setDoctorId] = useState(null);
  const [patientNames, setPatientNames] = useState({});
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedAppointmentId, setSelectedId] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("pending");

  const { backEndUrl } = useContext(AppContext);
  const { dToken, backendUrl, logout } = useContext(DoctorContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!dToken) {
      console.log('No dToken found, redirecting to login');
      setLoading(false);
      setError("Thiếu mã xác thực. Vui lòng đăng nhập.");
      toast.error("Vui lòng đăng nhập để tiếp tục.");
      navigate('/doctor/login');
      return;
    }

    const fetchDoctorId = async () => {
      try {
        console.log('Fetching doctor ID with dToken:', dToken);
        const { data } = await axios.get(`${backendUrl}/doctor/id`, {
          headers: { Authorization: `Bearer ${dToken}` },
        });
        console.log("Fetched Doctor ID:", data.id);
        setDoctorId(data.id);
      } catch (error) {
        console.error("Lỗi lấy ID bác sĩ:", error);
        toast.error("Không thể lấy thông tin bác sĩ.");
        setError("Không thể lấy thông tin bác sĩ.");
        if (error.response?.status === 401) {
          logout();
        }
      }
    };

    fetchDoctorId();
  }, [dToken, backendUrl, logout, navigate]);

  useEffect(() => {
    if (!dToken || !doctorId) return;

    const fetchAppointments = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching appointments with dToken:', dToken);
        const { data } = await axios.get(`${backendUrl}/doctor/my-appointments`, {
          headers: { Authorization: `Bearer ${dToken}` },
        });
        if (data.success && Array.isArray(data.data)) {
          console.log("Lịch hẹn đã lấy:", data.data);
          setAppointments(data.data);
        } else {
          throw new Error("Không nhận được dữ liệu lịch hẹn.");
        }
      } catch (error) {
        console.error("Lỗi lấy lịch hẹn:", error);
        const message =
          error.response?.status === 401
            ? "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại."
            : error.response?.data?.message || "Lỗi khi tải dữ liệu lịch hẹn.";
        setError(message);
        toast.error(message);
        if (error.response?.status === 401) {
          logout();
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [dToken, doctorId, backendUrl, logout]);

  useEffect(() => {
    if (!appointments.length) return;
    const patientMap = {};
    appointments.forEach((appointment) => {
      patientMap[appointment._id] = {
        name: appointment.patientName || "Không xác định",
        email: appointment.patientEmail || "",
        phone: appointment.patientPhone || "",
      };
    });
    console.log("Patient Names Map:", patientMap);
    setPatientNames(patientMap);
  }, [appointments]);

  useEffect(() => {
    if (!dToken || !doctorId) return;

    const fetchRating = async () => {
      try {
        console.log('Fetching rating with dToken:', dToken);
        const { data } = await axios.get(`${backendUrl}/doctor/rating/${doctorId}`, {
          headers: { Authorization: `Bearer ${dToken}` },
        });
        console.log("Fetched Rating:", data);
        setRating(data);
      } catch (error) {
        console.error("Lỗi lấy đánh giá:", error);
        toast.error("Không thể tải đánh giá.");
        if (error.response?.status === 401) {
          logout();
        }
      }
    };

    fetchRating();
  }, [dToken, doctorId, backendUrl, logout]);

  useEffect(() => {
    if (!dToken || !doctorId) return;

    const fetchReviews = async () => {
      try {
        console.log("Fetching reviews with doctorId:", doctorId, "dToken:", dToken);
        const { data } = await axios.get(`${backendUrl}/doctor/my-reviews`, {
          headers: { Authorization: `Bearer ${dToken}` },
        });
        console.log("Fetched Reviews:", data);
        if (!Array.isArray(data)) {
          console.warn("Reviews data is not an array:", data);
          setReviews([]);
          return;
        }
        setReviews(data);
      } catch (error) {
        console.error("Lỗi lấy đánh giá:", error);
        toast.error("Không thể tải đánh giá bệnh nhân.");
        setReviews([]);
        if (error.response?.status === 401) {
          logout();
        }
      }
    };

    fetchReviews();
  }, [dToken, doctorId, backendUrl, logout]);

  const updateAppointmentStatus = async (appointmentId, newStatus, note = "") => {
    try {
      console.log('Updating appointment status with dToken:', dToken);
      const updateData = { status: newStatus };
      if (note) updateData.notes = note;

      const response = await axios.put(`${backendUrl}/doctor/appointment/update/${appointmentId}`, updateData, {
        headers: { Authorization: `Bearer ${dToken}` },
      });

      if (response.data.success) {
        setAppointments((prevAppointments) =>
          prevAppointments.map((appointment) =>
            appointment._id === appointmentId
              ? { ...appointment, status: newStatus, notes: note || appointment.notes }
              : appointment
          )
        );
        const statusText = {
          completed: "Hoàn thành",
          cancelled: "Đã hủy",
          pending: "Đang chờ",
        };
        toast.success(`Cập nhật trạng thái lịch hẹn thành công: ${statusText[newStatus.toLowerCase()]}`);
      } else {
        throw new Error(response.data.message || "Cập nhật trạng thái thất bại.");
      }
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái lịch hẹn:", error);
      toast.error(error.response?.data?.message || "Cập nhật trạng thái lịch hẹn thất bại.");
      if (error.response?.status === 401) {
        logout();
        navigate('/doctor/login');
      }
    }
  };

  const handleStatusClick = (appointmentId, status) => {
    if (status?.toLowerCase() === "pending") {
      setSelectedId(appointmentId);
      setSelectedStatus(status);
      setModalOpen(true);
    }
  };

  const handleModalSubmit = (appointmentId, newStatus, note) => {
    if (newStatus) {
      updateAppointmentStatus(appointmentId, newStatus, note);
    }
  };

  const normalizeStatus = (status) => {
    return status ? status.toLowerCase() : "pending";
  };

  const filteredAppointments = appointments.filter((appointment) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const appointmentDate = new Date(appointment.appointmentDate);
    if (isNaN(appointmentDate.getTime())) {
      console.warn(`Ngày không hợp lệ cho lịch hẹn ${appointment._id}:`, appointment.appointmentDate);
      return activeTab === "upcoming" && normalizeStatus(appointment.status) === "pending";
    }
    appointmentDate.setHours(0, 0, 0, 0);

    const status = normalizeStatus(appointment.status);

    let tabMatch = false;
    if (activeTab === "upcoming") {
      tabMatch = appointmentDate >= today && status === "pending";
    } else if (activeTab === "past") {
      tabMatch = appointmentDate < today || status === "completed" || status === "cancelled";
    }
    if (!tabMatch) return false;

    if (statusFilter !== "all" && status !== normalizeStatus(statusFilter)) {
      return false;
    }

    if (debouncedSearchQuery) {
      const patient = patientNames[appointment._id] || { name: "", email: "" };
      const searchLower = debouncedSearchQuery.toLowerCase().trim();
      const matches =
        patient.name.toLowerCase().includes(searchLower) ||
        patient.email.toLowerCase().includes(searchLower);
      console.log(`Search Query: ${searchLower}, Appointment ID: ${appointment._id}, Matches: ${matches}`);
      return matches;
    }

    return true;
  });

  const stats = {
    total: appointments.length,
    upcoming: appointments.filter(
      (app) =>
        normalizeStatus(app.status) === "pending" &&
        new Date(app.appointmentDate).setHours(0, 0, 0, 0) >= new Date().setHours(0, 0, 0, 0)
    ).length,
    completed: appointments.filter((app) => normalizeStatus(app.status) === "completed").length,
    cancelled: appointments.filter((app) => normalizeStatus(app.status) === "cancelled").length,
    past: appointments.filter(
      (app) =>
        new Date(app.appointmentDate).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0) ||
        normalizeStatus(app.status) === "completed" ||
        normalizeStatus(app.status) === "cancelled"
    ).length,
    averageRating: rating?.averageRating || "N/A",
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Ho_Chi_Minh",
      });
    } catch {
      return "N/A";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 p-4 sm:p-6 font-sans">
      <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-8 animate-fade-in">
        Bảng Điều Khiển Lịch Hẹn
      </h1>

      {/* Thống kê tổng quan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-10">
        <div className="bg-white bg-opacity-90 backdrop-blur-lg p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 animate-fade-in border-l-4 border-blue-500">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-sm font-semibold text-gray-600 uppercase">Tổng Lịch Hẹn</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
        </div>
        <div className="bg-white bg-opacity-90 backdrop-blur-lg p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 animate-fade-in border-l-4 border-green-500">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-sm font-semibold text-gray-600 uppercase">Sắp Tới</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.upcoming}</p>
        </div>
        <div className="bg-white bg-opacity-90 backdrop-blur-lg p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 animate-fade-in border-l-4 border-yellow-500">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <h3 className="text-sm font-semibold text-gray-600 uppercase">Đã Hoàn Thành</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.completed}</p>
        </div>
        <div className="bg-white bg-opacity-90 backdrop-blur-lg p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 animate-fade-in border-l-4 border-purple-500">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-purple-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3 .921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784 .57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81 .588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <h3 className="text-sm font-semibold text-gray-600 uppercase">Đánh Giá Trung Bình</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2 flex items-center">
            {stats.averageRating}
            {stats.averageRating !== "N/A" && (
              <svg className="w-6 h-6 text-yellow-400 ml-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3 .921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784 .57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81 .588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            )}
          </p>
        </div>
      </div>

      {/* Điều hướng tab */}
      <div className="mb-8">
        <nav className="flex gap-4 border-b border-gray-200">
          {[
            { id: "upcoming", label: "Sắp Tới", count: stats.upcoming },
            { id: "past", label: "Đã Qua", count: stats.past },
            { id: "reviews", label: "Đánh Giá", count: reviews.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-semibold transition-colors duration-200 border-b-2 ${activeTab === tab.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-600 hover:text-blue-500"
                }`}
              aria-selected={activeTab === tab.id}
              title={tab.label}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Nội dung theo tab */}
      {activeTab !== "reviews" ? (
        <>
          {/* Bộ lọc lịch hẹn */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-gray-700">Trạng thái:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition bg-white"
                aria-label="Lọc theo trạng thái"
                title="Lọc theo trạng thái"
              >
                <option value="all">Tất cả</option>
                <option value="pending">Đang chờ</option>
                <option value="completed">Hoàn thành</option>
                <option value="cancelled">Đã hủy</option>
              </select>
            </div>
            <div className="relative w-full md:w-80">
              <input
                type="text"
                placeholder="Tìm kiếm bệnh nhân (tên hoặc email)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 pl-10 focus:ring-2 focus:ring-blue-500 focus:outline-none transition bg-white"
                aria-label="Tìm kiếm bệnh nhân"
                title="Tìm kiếm bệnh nhân"
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Bảng lịch hẹn */}
          {loading ? (
            <div className="bg-white bg-opacity-90 rounded-2xl shadow-lg p-6 animate-pulse">
              <div className="h-10 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex space-x-4">
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="bg-white bg-opacity-90 rounded-2xl shadow-lg p-6 text-center text-lg text-red-600">
              {error}
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="bg-white bg-opacity-90 rounded-2xl shadow-lg p-6 text-center text-lg text-gray-600">
              Không tìm thấy lịch hẹn {activeTab === "upcoming" ? "sắp tới" : "đã qua"}.
              {debouncedSearchQuery && (
                <p className="mt-2 text-sm text-gray-500">
                  Không có kết quả cho "{debouncedSearchQuery}".
                </p>
              )}
            </div>
          ) : (
            <div className="bg-white bg-opacity-90 rounded-2xl shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider border-r border-gray-100">
                        Bệnh Nhân
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 uppercase tracking-wider border-r border-gray-100">
                        Ngày Giờ
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 uppercase tracking-wider border-r border-gray-100">
                        Ghi Chú
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">
                        Trạng Thái
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredAppointments.map((appointment, index) => {
                      const patient = patientNames[appointment._id] || {};

                      return (
                        <tr
                          key={appointment._id}
                          className={`transition-all duration-200 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-gradient-to-r hover:from-blue-50 hover:to-white hover:border-l-2 hover:border-blue-200`}
                        >
                          <td className="px-6 py-5 whitespace-nowrap text-left border-r border-gray-100">
                            <div>
                              <div className="text-base font-medium text-gray-900">
                                {patient.name || "Bệnh nhân không xác định"}
                              </div>
                              <div className="text-sm text-gray-500">
                                {patient.email || "Không có email"}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap text-base text-center text-gray-700 border-r border-gray-100">
                            {formatDate(appointment.appointmentDate)}
                          </td>
                          <td className="px-6 py-5 text-base text-center text-gray-700 border-r border-gray-100">
                            {appointment.notes || "Không có ghi chú"}
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap text-center">
                            <StatusBadge
                              status={appointment.status}
                              onClick={() => handleStatusClick(appointment._id, appointment.status)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Modal trạng thái */}
          <StatusModal
            isOpen={isModalOpen}
            onClose={() => setModalOpen(false)}
            onSubmit={handleModalSubmit}
            appointmentId={selectedAppointmentId}
            status={selectedStatus}
          />
        </>
      ) : (
        <div className="bg-white bg-opacity-90 backdrop-blur-lg p-6 sm:p-8 rounded-2xl shadow-lg">
          <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">Đánh Giá Từ Bệnh Nhân</h3>
          {!reviews || reviews.length === 0 ? (
            <div className="text-center py-12 text-lg text-gray-600">Chưa có đánh giá nào.</div>
          ) : (
            <div className="space-y-6">
              {reviews.map((review, index) => (
                <div
                  key={review._id}
                  className="bg-white bg-opacity-90 rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {review.patientId?.name || "Ẩn danh"}
                      </h3>
                      <p className="text-sm text-gray-500">{formatDate(review.createdAt)}</p>
                    </div>
                    <div className="flex items-center mt-2">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className={`h-5 w-5 ${i < review.rating ? "text-yellow-400" : "text-gray-300"}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3 .921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784 .57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81 .588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                      <span className="ml-2 text-sm text-gray-600">{review.rating}/5</span>
                    </div>
                    <p className="mt-3 text-gray-700 leading-relaxed">
                      {review.review || "Không có phản hồi"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Appointment;