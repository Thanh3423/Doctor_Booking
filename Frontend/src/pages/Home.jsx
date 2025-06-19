import React from 'react';
import Homelogo from '../assets/images/home.png';
import { Link } from 'react-router-dom';
import ServicesComp from '../components/ServicesComp';
import AboutScroll from '../components/AboutScroll';

function Home() {
  return (
    <>
      {/* Import Google Fonts để hỗ trợ tiếng Việt */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=Roboto:wght@300;400;700&display=swap');
          .font-vietnamese {
            font-family: 'Inter', 'Roboto', sans-serif;
          }
        `}
      </style>

      {/* Hero Section - Phần đầu trang */}
      <section className="relative w-full h-[90vh] overflow-hidden font-vietnamese">
        {/* Hình nền */}
        <img
          className="absolute inset-0 w-full h-full object-cover object-center transform scale-105"
          src={Homelogo}
          alt="Hình nền trang chủ"
          loading="eager"
        />

        {/* Lớp phủ (Overlay) */}
        <div className="absolute inset-0 bg-blue-900 opacity-20"></div>

        {/* Nội dung Hero */}
        <div className="absolute inset-0 flex flex-col items-start justify-center pl-8 md:pl-20 pr-8 space-y-6 text-white z-10">
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight drop-shadow-lg">
            Chăm sóc sức khỏe bạn <br />
            từng bước một.
          </h1>

          <p className="text-lg md:text-xl font-light max-w-lg text-gray-100">
            Tìm kiếm dịch vụ y tế chất lượng cao. Đặt lịch hẹn dễ dàng, nhanh chóng và hiệu quả.
          </p>

          <Link to={'/services'} className="mt-8">
            <button
              className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-full shadow-lg
                         hover:bg-blue-700 transform hover:scale-105 transition duration-300 ease-in-out
                         focus:outline-none focus:ring-4 focus:ring-blue-300"
              aria-label="Đặt lịch hẹn ngay"
            >
              Đặt lịch ngay
            </button>
          </Link>
        </div>
      </section>

      {/* Các thành phần khác */}
      <ServicesComp />
      <AboutScroll />
    </>
  );
}

export default Home;