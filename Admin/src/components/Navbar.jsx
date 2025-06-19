import React, { useState, useContext } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { AdminContext } from "../context/AdminContext";
import { DoctorContext } from "../context/DoctorContext";

const Navbar = ({ userType }) => {
  const { setAToken } = useContext(AdminContext);
  const { setDToken } = useContext(DoctorContext);
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    if (userType === "admin") {
      localStorage.removeItem("aToken");
      setAToken(null);
      toast.success("Đăng xuất thành công!");
      navigate("/admin/login");
    } else {
      localStorage.removeItem("dToken");
      setDToken(null);
      toast.success("Đăng xuất thành công!");
      navigate("/doctor/login");
    }
    setIsOpen(false); // Đóng menu di động khi đăng xuất
  };

  return (
    <nav className="bg-gradient-to-r from-blue-700 via-blue-600 to-teal-500 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Tên thương hiệu */}
          <div className="flex-shrink-0 flex items-center">
            <button
              onClick={() => navigate(userType === "admin" ? "/admin" : "/doctor")}
              className="flex items-center group"
              aria-label="Vào bảng điều khiển"
              title="Vào bảng điều khiển"
            >
              <h1 className="text-2xl font-bold text-white tracking-tight group-hover:scale-105 transition-transform duration-200">
                BookingCare
              </h1>
              <span className="ml-2 text-teal-100 text-sm font-medium bg-white bg-opacity-10 px-2 py-1 rounded-full">
                {userType === "admin" ? "Quản trị viên" : "Bác sĩ"}
              </span>
            </button>
          </div>

          {/* Menu máy tính */}
          <div className="hidden md:flex items-center space-x-4">
            <button
              onClick={handleLogout}
              className="flex items-center px-4 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 hover:shadow-md transition-all duration-300 font-medium text-sm focus:ring-2 focus:ring-teal-300 focus:outline-none"
              aria-label="Đăng xuất"
              title="Đăng xuất"
            >
              <LogOut size={16} className="mr-2" />
              Đăng xuất
            </button>
          </div>

          {/* Nút menu di động */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-white hover:text-teal-100 focus:outline-none focus:ring-2 focus:ring-teal-300 p-2 rounded-md"
              aria-label={isOpen ? "Đóng menu" : "Mở menu"}
              aria-expanded={isOpen}
              title={isOpen ? "Đóng menu" : "Mở menu"}
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Menu di động */}
      <div
        className={`md:hidden fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        onClick={() => setIsOpen(false)}
        aria-hidden={!isOpen}
      >
        <div
          className={`bg-gradient-to-b from-blue-700 to-teal-500 w-3/4 max-w-xs h-full shadow-xl transform transition-transform duration-300 ${isOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 pt-4 pb-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Menu</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-teal-100 focus:outline-none focus:ring-2 focus:ring-teal-300 p-2 rounded-md"
                aria-label="Đóng menu"
                title="Đóng menu"
              >
                <X size={20} />
              </button>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-3 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 hover:shadow-md transition-all duration-300 font-medium text-base focus:ring-2 focus:ring-teal-300 focus:outline-none"
              aria-label="Đăng xuất"
              title="Đăng xuất"
            >
              <LogOut size={18} className="mr-2" />
              Đăng xuất
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;