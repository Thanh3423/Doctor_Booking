import React, { useContext, useEffect, useState } from "react";
import { Calendar, CheckSquare, AlertCircle, Ban } from "lucide-react";
import axios from "axios";
import { AppContext } from "../../context/AppContext";
import { DoctorContext } from "../../context/DoctorContext";
import { toast } from "react-toastify";
import moment from "moment-timezone";

const SimpleCard = ({ title, count, icon, color }) => (
  <div className="bg-white bg-opacity-80 backdrop-blur-md p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 animate-fade-in">
    <div className="flex items-center">
      <div className={`p-3 rounded-full ${color} bg-opacity-10 mr-4`}>{icon}</div>
      <div>
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{title}</h3>
        <p className="text-3xl font-bold text-gray-800 mt-1">{count}</p>
      </div>
    </div>
  </div>
);

const DoctorDashboard = () => {
  const [appointments, setAppointments] = useState([]);
  const [patientNames, setPatientNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { backEndUrl } = useContext(AppContext);
  const { dToken } = useContext(DoctorContext);

  useEffect(() => {
    if (!dToken) {
      setLoading(false);
      setError("Thiếu mã xác thực. Vui lòng đăng nhập.");
      toast.error("Vui lòng đăng nhập để tiếp tục.");
      console.error("No token found! Ensure user is logged in.");
      return;
    }

    const fetchAppointment = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data } = await axios.get(`${backEndUrl}/doctor/my-appointments`, {
          withCredentials: true,
          headers: { Authorization: `Bearer ${dToken}` },
        });

        console.log("API response:", data);
        if (data.success && Array.isArray(data.data)) {
          console.log("Fetched appointments:", data.data, "Count:", data.data.length);
          setAppointments(data.data);
        } else {
          throw new Error(data.message || "Không nhận được dữ liệu lịch hẹn.");
        }
      } catch (error) {
        console.error("Error fetching appointments:", {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
        const message =
          error.response?.status === 401
            ? "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại."
            : error.response?.data?.message || "Lỗi khi tải dữ liệu lịch hẹn.";
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointment();
  }, [backEndUrl, dToken]);

  useEffect(() => {
    if (!appointments.length) return;

    const patientMap = {};
    appointments.forEach((appointment) => {
      patientMap[appointment._id] = appointment.patientName || "Không xác định";
    });
    console.log("Patient Names Map:", patientMap);
    setPatientNames(patientMap);
  }, [appointments]);

  const completedAppointments = appointments.filter(
    (appt) => appt.status.toLowerCase() === "completed"
  ).length;
  const pendingAppointments = appointments.filter(
    (appt) => appt.status.toLowerCase() === "pending"
  ).length;
  const cancelledAppointments = appointments.filter(
    (appt) => appt.status.toLowerCase() === "cancelled"
  ).length;

  const dashboardData = {
    totalAppointments: appointments.length || 0,
    completedAppointments: completedAppointments || 0,
    pendingAppointments: pendingAppointments || 0,
    cancelledAppointments: cancelledAppointments || 0,
  };

  const latestAppointments = appointments.slice(-4).reverse();

  // Format date and timeslot
  const formatDateTime = (date, timeslot) => {
    try {
      if (!date || !timeslot) return "N/A";
      const momentDate = moment.tz(date, "Asia/Ho_Chi_Minh");
      if (!momentDate.isValid()) throw new Error("Invalid date");

      const [startTime] = timeslot.split("-"); // e.g., "09:00-10:00" -> "09:00"
      if (!startTime.match(/^\d{2}:\d{2}$/)) throw new Error("Invalid timeslot format");

      return momentDate.format("DD/MM/YYYY") + " " + startTime;
    } catch (error) {
      console.warn("Date formatting error:", error.message, { date, timeslot });
      return "N/A";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-50 p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-8 animate-fade-in">Bảng Điều Khiển Bác Sĩ</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <SimpleCard
          title="Tổng Lịch Hẹn"
          count={dashboardData.totalAppointments}
          icon={<Calendar size={28} className="text-purple-600" />}
          color="text-purple-600"
        />
        <SimpleCard
          title="Hoàn Thành"
          count={dashboardData.completedAppointments}
          icon={<CheckSquare size={28} className="text-green-600" />}
          color="text-green-600"
        />
        <SimpleCard
          title="Đang Chờ"
          count={dashboardData.pendingAppointments}
          icon={<AlertCircle size={28} className="text-orange-600" />}
          color="text-orange-600"
        />
        <SimpleCard
          title="Đã Hủy"
          count={dashboardData.cancelledAppointments}
          icon={<Ban size={28} className="text-red-600" />}
          color="text-red-600"
        />
      </div>

      <div className="bg-white bg-opacity-90 backdrop-blur-md p-6 rounded-xl shadow-lg animate-fade-in">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Lịch Hẹn Gần Đây</h2>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-12">
              <svg
                className="animate-spin h-10 w-10 text-blue-600 mx-auto"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <p className="mt-4 text-gray-600 text-lg">Đang tải lịch hẹn...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-lg text-red-600">{error}</div>
          ) : latestAppointments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Không có lịch hẹn nào.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-100">
                <tr className="text-gray-600 text-sm font-medium">
                  <th className="py-3 px-4">Bệnh Nhân</th>
                  <th className="py-3 px-4">Ngày & Giờ</th>
                  <th className="py-3 px-4">Trạng Thái</th>
                </tr>
              </thead>
              <tbody>
                {latestAppointments.map((appointment, index) => (
                  <tr
                    key={appointment._id}
                    className={`border-b border-gray-200 hover:bg-gray-50 transition-colors duration-200 animate-fade-in delay-${index}`}
                  >
                    <td className="py-4 px-4 text-gray-700">
                      {patientNames[appointment._id] || "Không xác định"}
                    </td>
                    <td className="py-4 px-4 text-gray-700">
                      {formatDateTime(appointment.appointmentDate, appointment.timeslot)}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
                          ${appointment.status.toLowerCase() === "completed"
                            ? "bg-green-100 text-green-800"
                            : appointment.status.toLowerCase() === "pending"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-red-100 text-red-800"}`}
                      >
                        {appointment.status === "completed"
                          ? "Hoàn thành"
                          : appointment.status === "pending"
                            ? "Đang chờ"
                            : "Đã hủy"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;