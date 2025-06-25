import { useEffect, useState, useContext } from "react";
import { Search, Filter, Calendar, Clock, X, Eye, Trash2 } from "lucide-react";
import { AppContext } from "../../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";

const AppointmentsPage = () => {
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const appointmentsPerPage = 10;

  const { allDoctors, allAppointments, allPatients, backEndUrl, aToken, logout } = useContext(AppContext);

  // Enrich appointments with doctor and patient info
  useEffect(() => {
    setIsLoading(true);
    setError(null);

    if (!allAppointments?.length) {
      console.warn("No appointments available:", { appointments: allAppointments?.length || 0 });
      setAppointments([]);
      setIsLoading(false);
      setError("Không có lịch hẹn nào để hiển thị.");
      return;
    }

    try {
      const enrichedAppointments = allAppointments.map((appointment) => {
        // Safely handle doctorId and patientId
        const doctorId = appointment.doctorId?._id || appointment.doctorId;
        const patientId = appointment.patientId?._id || appointment.patientId;

        const doctor = doctorId && allDoctors?.length
          ? allDoctors.find((doc) => doc._id?.toString() === doctorId?.toString()) || {}
          : {};
        const patient = patientId && allPatients?.length
          ? allPatients.find((pat) => pat._id?.toString() === patientId?.toString()) || {}
          : {};

        return {
          ...appointment,
          doctorName: doctor.name || "Unknown",
          doctorSpecialization: doctor.specialty?.name || "N/A",
          patientName: patient.name || "Unknown",
          patientEmail: patient.email || "N/A",
          patientPhone: patient.phoneNumber || "N/A",
          status: appointment.status?.toLowerCase() || "pending", // Normalize status
        };
      }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Sort by createdAt descending

      setAppointments(enrichedAppointments);
      setIsLoading(false);
    } catch (err) {
      console.error("Error enriching appointments:", err);
      setError("Lỗi khi xử lý dữ liệu lịch hẹn.");
      setAppointments([]);
      setIsLoading(false);
    }
  }, [allAppointments, allDoctors, allPatients]);

  // Handle search
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  // Filter and paginate appointments
  const filteredAppointments = appointments.filter((appointment) => {
    const appointmentDate = new Date(appointment.appointmentDate).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const matchesSearch =
      appointment.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.doctorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.patientEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointmentDate.includes(searchTerm);

    const matchesFilter =
      filterStatus === "all" || appointment.status === filterStatus.toLowerCase();

    return matchesSearch && matchesFilter;
  });

  // Pagination logic
  const indexOfLastAppointment = currentPage * appointmentsPerPage;
  const indexOfFirstAppointment = indexOfLastAppointment - appointmentsPerPage;
  const currentAppointments = filteredAppointments.slice(
    indexOfFirstAppointment,
    indexOfLastAppointment
  );
  const totalPages = Math.ceil(filteredAppointments.length / appointmentsPerPage);

  // View appointment
  const viewAppointment = async (appointment) => {
    if (!appointment?._id || !aToken) {
      toast.error("Thông tin lịch hẹn hoặc token không hợp lệ.");
      return;
    }

    try {
      const response = await axios.get(`${backEndUrl}/admin/appointment/${appointment._id}`, {
        headers: { Authorization: `Bearer ${aToken}` },
        withCredentials: true,
      });

      if (response.data?.success && response.data.data) {
        setSelectedAppointment(response.data.data);
        setShowViewModal(true);
      } else {
        throw new Error(response.data?.message || "Invalid response data");
      }
    } catch (error) {
      console.error("Error fetching appointment details:", error.response?.data || error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        logout();
      } else {
        toast.error(error.response?.data?.message || "Không thể tải chi tiết lịch hẹn.");
      }
    }
  };

  // Confirm delete
  const confirmDelete = (appointment) => {
    if (!appointment?._id) {
      toast.error("Lịch hẹn không hợp lệ.");
      return;
    }
    setAppointmentToDelete(appointment);
    setShowDeleteModal(true);
  };

  // Handle delete
  const handleDelete = async () => {
    if (!appointmentToDelete?._id || !aToken) {
      toast.error("Lịch hẹn hoặc token không hợp lệ.");
      logout();
      setShowDeleteModal(false);
      setAppointmentToDelete(null);
      return;
    }

    setIsLoading(true);

    try {
      await axios.delete(`${backEndUrl}/admin/appointment/delete/${appointmentToDelete._id}`, {
        headers: { Authorization: `Bearer ${aToken}` },
        withCredentials: true,
      });

      setAppointments(appointments.filter((a) => a._id !== appointmentToDelete._id));
      toast.success(`Lịch hẹn của ${appointmentToDelete.patientName} đã được xóa.`);
      setShowDeleteModal(false);
      setAppointmentToDelete(null);
    } catch (error) {
      console.error("Error deleting appointment:", error.response?.data || error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        logout();
      } else {
        toast.error(error.response?.data?.message || "Không thể xóa lịch hẹn.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Render loading, error, or content
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-100 min-h-screen w-full text-center text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen w-full">
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
        .table-container {
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .status-pending {
          background-color: #fefcbf;
          color: #b45309;
        }
        .status-completed {
          background-color: #dcfce7;
          color: #15803d;
        }
        .status-cancelled {
          background-color: #fee2e2;
          color: #b91c1c;
        }
        .pagination button {
          margin: 0 4px;
          padding: 4px 12px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          background: white;
          cursor: pointer;
        }
        .pagination button:disabled {
          background: #f3f4f6;
          cursor: not-allowed;
        }
        .pagination button.active {
          background: #2563eb;
          color: white;
          border-color: #2563eb;
        }
      `}</style>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Quản lý lịch hẹn</h1>

      <div className="flex flex-col lg:flex-row gap-4 mb-8">
        {/* Search Bar */}
        <div className="relative flex-grow">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm theo bệnh nhân, bác sĩ hoặc ngày (dd/mm/yyyy)"
            className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            value={searchTerm}
            onChange={handleSearchChange}
            aria-label="Tìm kiếm lịch hẹn"
          />
          {searchTerm && (
            <button
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => setSearchTerm("")}
              aria-label="Xóa tìm kiếm"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div className="w-full lg:w-64">
          <div className="relative">
            <Filter size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm appearance-none"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Lọc theo trạng thái"
            >
              <option value="all">Tất cả</option>
              <option value="pending">Đang chờ</option>
              <option value="completed">Đã hoàn thành</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>
        </div>
      </div>

      {/* Appointments Table */}
      <div className="table-container overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Bệnh nhân
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Bác sĩ
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    <Calendar size={14} />
                    Ngày
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    Thời gian
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentAppointments.length > 0 ? (
                currentAppointments.map((appointment) => (
                  <tr key={appointment._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900 text-sm">{appointment.patientName}</div>
                      <div className="text-xs text-gray-500">{appointment.patientEmail}</div>
                      <div className="text-xs text-gray-500">{appointment.patientPhone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900 text-sm">{appointment.doctorName}</div>
                      <div className="text-xs text-gray-500">{appointment.doctorSpecialization}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(appointment.appointmentDate).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {appointment.timeslot || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full status-${appointment.status}`}
                      >
                        {appointment.status === "pending"
                          ? "Đang chờ"
                          : appointment.status === "completed"
                            ? "Đã hoàn thành"
                            : "Đã hủy"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => viewAppointment(appointment)}
                          className="text-green-600 hover:text-green-800 p-1 transition-colors"
                          title="Xem chi tiết"
                          aria-label="Xem chi tiết lịch hẹn"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => confirmDelete(appointment)}
                          className="text-red-600 hover:text-red-800 p-1 transition-colors"
                          title="Xóa lịch hẹn"
                          aria-label="Xóa lịch hẹn"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500 text-sm">
                    Không tìm thấy lịch hẹn nào khớp với tiêu chí
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination mt-4 flex justify-center">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Trước
          </button>
          {[...Array(totalPages).keys()].map((page) => (
            <button
              key={page + 1}
              onClick={() => setCurrentPage(page + 1)}
              className={currentPage === page + 1 ? "active" : ""}
            >
              {page + 1}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Sau
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && appointmentToDelete && (
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
                Xác nhận xóa lịch hẹn
              </h3>
            </div>
            <p id="delete-modal-description" className="text-sm text-gray-600 mb-6">
              Bạn có chắc chắn muốn xóa lịch hẹn của{" "}
              <span className="font-semibold">{appointmentToDelete.patientName}</span> với{" "}
              <span className="font-semibold">{appointmentToDelete.doctorName}</span> vào ngày{" "}
              <span className="font-semibold">
                {new Date(appointmentToDelete.appointmentDate).toLocaleDateString("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </span>? Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setAppointmentToDelete(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors"
                aria-label="Hủy bỏ xóa"
              >
                Hủy
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                disabled={isLoading}
                aria-label="Xác nhận xóa lịch hẹn"
              >
                {isLoading ? "Đang xóa..." : "Xóa"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Appointment Modal */}
      {showViewModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto modal-enter modal-enter-active">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Chi tiết lịch hẹn</h3>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="font-medium text-gray-700">Bệnh nhân</p>
                  <p className="text-gray-600">{selectedAppointment.patientName || "N/A"}</p>
                  <p className="text-gray-600">{selectedAppointment.patientEmail || "N/A"}</p>
                  <p className="text-gray-600">{selectedAppointment.patientPhone || "N/A"}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Bác sĩ</p>
                  <p className="text-gray-600">{selectedAppointment.doctorName || "N/A"}</p>
                  <p className="text-gray-600">{selectedAppointment.doctorSpecialization || "N/A"}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Ngày hẹn</p>
                  <p className="text-gray-600">
                    {new Date(selectedAppointment.appointmentDate).toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Thời gian</p>
                  <p className="text-gray-600">{selectedAppointment.timeslot || "N/A"}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Trạng thái</p>
                  <p className="text-gray-600">
                    {selectedAppointment.status === "pending"
                      ? "Đang chờ"
                      : selectedAppointment.status === "completed"
                        ? "Đã hoàn thành"
                        : "Đã hủy"}
                  </p>
                </div>
                <div className="col-span-full">
                  <p className="font-medium text-gray-700">Đánh giá</p>
                  {selectedAppointment.review ? (
                    <div className="text-gray-600">
                      <p>Điểm: {selectedAppointment.review.rating} ⭐</p>
                      <p>Nội dung: {selectedAppointment.review.comment || "N/A"}</p>
                      <p>
                        Ngày đánh giá:{" "}
                        {new Date(selectedAppointment.review.createdAt).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-600">Chưa có đánh giá</p>
                  )}
                </div>
                <div className="col-span-full">
                  <p className="font-medium text-gray-700">Ghi chú</p>
                  <p className="text-gray-600">{selectedAppointment.notes || "Không có ghi chú"}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Ngày tạo</p>
                  <p className="text-gray-600">
                    {selectedAppointment.createdAt
                      ? new Date(selectedAppointment.createdAt).toLocaleDateString("vi-VN")
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedAppointment(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors"
                aria-label="Đóng chi tiết lịch hẹn"
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

export default AppointmentsPage;