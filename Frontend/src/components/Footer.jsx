import React from "react";
import { FaFacebookF, FaTwitter, FaLinkedinIn, FaEnvelope, FaPhone } from "react-icons/fa";
import logo from '../assets/Logo/logo1.png';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-10 font-roboto">
      <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand Section */}
        <div>
          <img src={logo} alt="BookingCare" className="w-24" />
          <h2 className="text-2xl font-bold mb-3">BookingCare</h2>
          <p className="text-gray-400">
            Đối tác đáng tin cậy của bạn trong việc đặt lịch khám bác sĩ trực tuyến. Nhận dịch vụ y tế chuyên nghiệp ngay trong tầm tay.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Liên Kết Nhanh</h3>
          <ul className="space-y-2">
            <li><a href="/" className="text-gray-400 hover:text-white">Trang Chủ</a></li>
            <li><a href="/doctors" className="text-gray-400 hover:text-white">Bác sĩ</a></li>
            <li><a href="/services" className="text-gray-400 hover:text-white">Dịch Vụ</a></li>
            <li><a href="/login" className="text-gray-400 hover:text-white">Đăng Nhập</a></li>
          </ul>
        </div>

        {/* Specialties */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Chuyên Khoa Phổ Biến</h3>
          <ul className="space-y-2">
            <li><a href="/doctors/Cardiology" className="text-gray-400 hover:text-white">Tim Mạch</a></li>
            <li><a href="/doctors/Dermatologist" className="text-gray-400 hover:text-white">Da Liễu</a></li>
            <li><a href="/doctors/Neurologist" className="text-gray-400 hover:text-white">Thần Kinh</a></li>
            <li><a href="/doctors/Orthopedist" className="text-gray-400 hover:text-white">Cơ Xương Khớp</a></li>
            <li><a href="/doctors/Pediatrician" className="text-gray-400 hover:text-white">Nhi Khoa</a></li>
          </ul>
        </div>

        {/* Contact & Social Media */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Liên Hệ Với Chúng Tôi</h3>
          <p className="flex items-center gap-2 text-gray-400">
            <FaPhone /> +84 987 654 321
          </p>
          <p className="flex items-center gap-2 text-gray-400">
            <FaEnvelope /> support@bookingcare.com
          </p>

          {/* Social Media */}
          <div className="flex gap-4 mt-4">
            <a href="#" className="text-gray-400 hover:text-white text-xl"><FaFacebookF /></a>
            <a href="#" className="text-gray-400 hover:text-white text-xl"><FaTwitter /></a>
            <a href="#" className="text-gray-400 hover:text-white text-xl"><FaLinkedinIn /></a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;