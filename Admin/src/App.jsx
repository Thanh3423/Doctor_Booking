import React, { useContext } from "react";
import { AdminContext } from "./context/AdminContext";
import { DoctorContext } from "./context/DoctorContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/Login";
import PatientsPage from "./pages/Admin/PatientsPage";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import Doctors from "./pages/Admin/Doctors";
import Appointments from "./pages/Admin/Appointments";
import DoctorDashboard from "./pages/Doctor/DoctorDashboard";
import ProfileDoctor from "./pages/Doctor/ProfileDoctor";
import Appointment from "./pages/Doctor/AppointmentsDoctor";
import DoctorSchedulePage from "./pages/Doctor/ScheduleDoctor";
import ManageSpecialties from "./pages/Admin/ManageSpecialties";
import ManageNews from "./pages/Admin/ManageNews";
import AdminSchedulePage from "./pages/Admin/AdminSchedulePage";
import ChangePassword from "./pages/Doctor/ChangePassword";
import MedicalHistory from "./pages/Doctor/MedicalHistory"; // Thêm import mới

const App = () => {
  const { aToken } = useContext(AdminContext);
  const { dToken } = useContext(DoctorContext);

  // For admin users
  if (aToken) {
    return (
      <div className="bg-[#f0f2f5]">
        <ToastContainer />
        <Navbar userType="admin" />
        <div className="flex items-start">
          <Sidebar userType="admin" />
          <div className="flex-1 p-4">
            <Routes>
              <Route path="/" element={<Navigate to="/admin/dashboard" />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/doctors" element={<Doctors />} />
              <Route path="/admin/appointments" element={<Appointments />} />
              <Route path="/admin/patients" element={<PatientsPage />} />
              <Route path="/admin/schedule" element={<AdminSchedulePage />} />
              <Route path="/admin/specialties" element={<ManageSpecialties />} />
              <Route path="/admin/news" element={<ManageNews />} />
              <Route path="/admin/*" element={<Navigate to="/admin/dashboard" />} />
              <Route path="/doctor/*" element={<Navigate to="/admin/dashboard" />} />
            </Routes>
          </div>
        </div>
      </div>
    );
  }

  // For doctor users
  if (dToken) {
    return (
      <div className="bg-[#f0f2f5]">
        <ToastContainer />
        <Navbar userType="doctor" />
        <div className="flex items-start">
          <Sidebar userType="doctor" />
          <div className="flex-1 p-4">
            <Routes>
              <Route path="/" element={<Navigate to="/doctor/dashboard" />} />
              <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
              <Route path="/doctor/appointments" element={<Appointment />} />
              <Route path="/doctor/schedule" element={<DoctorSchedulePage />} />
              <Route path="/doctor/profile" element={<ProfileDoctor />} />
              <Route path="/doctor/change-password" element={<ChangePassword />} />
              <Route path="/doctor/medical-history" element={<MedicalHistory />} /> {/* Route mới */}
              <Route path="/doctor/*" element={<Navigate to="/doctor/dashboard" />} />
              <Route path="/admin/*" element={<Navigate to="/doctor/dashboard" />} />
            </Routes>
          </div>
        </div>
      </div>
    );
  }

  // If no token, show login page
  return (
    <>
      <LoginPage />
      <ToastContainer />
    </>
  );
};

export default App;