import React, { useContext, useEffect, useState } from 'react';
import { Users, Calendar, CheckSquare, AlertCircle } from 'lucide-react';
import { AppContext } from '../../context/AppContext';

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

const AdminDashboard = () => {
  const { allDoctors, allAppointments, allPatients, loading } = useContext(AppContext);
  const [doctorNames, setDoctorNames] = useState({});
  const [patientNames, setPatientNames] = useState({});

  const completedAppointments = allAppointments.filter(appt => appt.status === 'completed').length;
  const pendingAppointments = allAppointments.filter(appt => appt.status === 'pending').length;

  const dashboardData = {
    doctorCount: allDoctors.length || 0,
    totalAppointments: allAppointments.length || 0,
    completedAppointments,
    pendingAppointments,
  };

  useEffect(() => {
    if (loading || !allAppointments.length) return;

    const doctorMap = {};
    const patientMap = {};
    allAppointments.forEach(appointment => {
      const doctorId = appointment.doctorId?._id?.toString() || appointment.doctorId?.toString();
      const patientId = appointment.patientId?._id?.toString() || appointment.patientId?.toString();

      const doctor = allDoctors.find(doc => doc._id?.toString() === doctorId);
      const patient = allPatients.find(pat => pat._id?.toString() === patientId);

      if (doctor) {
        doctorMap[appointment._id] = doctor.name;
      } else {
        console.warn(`Doctor not found for ID: ${doctorId}`);
      }
      if (patient) {
        patientMap[appointment._id] = patient.name;
      } else {
        console.warn(`Patient not found for ID: ${patientId}`);
      }
    });

    setDoctorNames(doctorMap);
    setPatientNames(patientMap);
  }, [allDoctors, allAppointments, allPatients, loading]);

  const latestAppointments = allAppointments.slice(-4).reverse();

  const getStatusText = status => {
    switch (status) {
      case 'completed':
        return 'Hoàn thành';
      case 'pending':
        return 'Đang chờ';
      case 'cancelled':
        return 'Đã hủy';
      default:
        console.warn(`Unexpected status: ${status}`);
        return 'Không xác định';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-50 p-6 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-50 p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-8 animate-fade-in">BẢNG ĐIỀU KHIỂN</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <SimpleCard
          title="Số bác sĩ"
          count={dashboardData.doctorCount}
          icon={<Users size={28} className="text-blue-600" />}
          color="text-blue-600"
        />
        <SimpleCard
          title="Tổng lịch hẹn"
          count={dashboardData.totalAppointments}
          icon={<Calendar size={28} className="text-purple-600" />}
          color="text-purple-600"
        />
        <SimpleCard
          title="Lịch hẹn hoàn thành"
          count={dashboardData.completedAppointments}
          icon={<CheckSquare size={28} className="text-green-600" />}
          color="text-green-600"
        />
        <SimpleCard
          title="Lịch hẹn đang chờ"
          count={dashboardData.pendingAppointments}
          icon={<AlertCircle size={28} className="text-orange-600" />}
          color="text-orange-600"
        />
      </div>

      <div className="bg-white bg-opacity-90 backdrop-blur-md p-6 rounded-xl shadow-lg animate-fade-in">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Lịch hẹn gần đây</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-100">
              <tr className="text-gray-600 text-sm font-medium">
                <th className="py-3 px-4">Bệnh nhân</th>
                <th className="py-3 px-4">Bác sĩ</th>
                <th className="py-3 px-4">Ngày hẹn</th>
                <th className="py-3 px-4">Giờ hẹn</th>
                <th className="py-3 px-4">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {latestAppointments.length > 0 ? (
                latestAppointments.map((appointment, index) => (
                  <tr
                    key={appointment._id}
                    className={`border-b border-gray-200 hover:bg-gray-50 transition-colors duration-200 animate-fade-in delay-${index}`}
                  >
                    <td className="py-4 px-4 text-gray-700">
                      {patientNames[appointment._id] || appointment.patientId?.name || 'Không xác định'}
                    </td>
                    <td className="py-4 px-4 text-gray-700">
                      {doctorNames[appointment._id] || appointment.doctorId?.name || 'Không xác định'}
                    </td>
                    <td className="py-4 px-4 text-gray-700">
                      {appointment.appointmentDate
                        ? new Date(appointment.appointmentDate).toLocaleDateString('vi-VN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                        })
                        : 'N/A'}
                    </td>
                    <td className="py-4 px-4 text-gray-700">{appointment.timeslot || 'N/A'}</td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
                          ${appointment.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : appointment.status === 'pending'
                              ? 'bg-blue-100 text-blue-800'
                              : appointment.status === 'cancelled'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'}`}
                      >
                        {getStatusText(appointment.status)}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-4 px-4 text-center text-gray-600">
                    Không có lịch hẹn nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;