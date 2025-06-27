import React, { useState, useEffect, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaBars } from 'react-icons/fa';
import axios from 'axios';
import { toast } from 'react-toastify';
import { AppContext } from '../Context/AppContext';
import Logo1 from '../assets/Logo/logo2.png';
import MyProfile_Pic from '../assets/profile_pic/p1.webp';

const Navbar = () => {
  const { userData, backEndUrl, token, setToken, setUserData } = useContext(AppContext);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setIsLoggedIn(!!token);
    console.log('[Navbar] Token from AppContext:', token ? '[PRESENT]' : '[MISSING]');
  }, [token]);

  useEffect(() => {
    console.log('[Navbar] userData:', userData);
    console.log(
      '[Navbar] Profile image URL:',
      userData?.image ? getImageUrl(userData.image) : MyProfile_Pic
    );
  }, [userData, backEndUrl]);

  // Normalize image URL
  const getImageUrl = (image) => {
    if (!image || !image.trim()) {
      console.log('[Navbar getImageUrl] Không có hình ảnh, sử dụng mặc định');
      return MyProfile_Pic;
    }
    // Check if image is already a full URL
    if (image.startsWith('http://') || image.startsWith('https://')) {
      console.log('[Navbar getImageUrl] Hình ảnh là URL đầy đủ:', image);
      return image;
    }
    const backendUrl = backEndUrl || import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    const cleanPath = image
      .replace(/^\/?(?:public\/)?(?:[Uu]ploads\/)?(?:misc\/)?/, '') // Remove /public/, /Uploads/, /misc/
      .replace(/^\/+/, ''); // Remove leading slashes
    const url = `${backendUrl}/images/uploads/misc/${cleanPath}`;
    console.log('[Navbar getImageUrl] Đã tạo URL:', url, 'từ hình ảnh:', image);
    return url;
  };

  const handleLogout = async () => {
    try {
      console.log('[Navbar handleLogout] Bắt đầu đăng xuất');
      const response = await axios.post(
        `${backEndUrl}/patient/logout`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          withCredentials: true,
        }
      );

      console.log('[Navbar handleLogout] Phản hồi:', response.data);
      if (response.status === 200) {
        localStorage.clear();
        setToken(''); // Clear token in AppContext
        setUserData(null); // Clear userData in AppContext
        setIsLoggedIn(false);
        toast.success(response.data.message || 'Đăng xuất thành công');
        navigate('/home');
      }
    } catch (error) {
      console.error('[Navbar handleLogout] Lỗi:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      localStorage.clear();
      setToken(''); // Clear token even on error
      setUserData(null); // Clear userData even on error
      setIsLoggedIn(false);
      const message =
        error.response?.status === 401
          ? 'Phiên hết hạn. Vui lòng đăng nhập lại.'
          : error.response?.data?.message || 'Đăng xuất thất bại. Vui lòng thử lại.';
      toast.error(message);
      navigate('/login');
    }
  };

  const navLinks = [
    { label: 'Trang Chủ', to: '/' },
    { label: 'Dịch Vụ', to: '/services' },
    { label: 'Tìm Bác Sĩ', to: '/doctors' },
    { label: 'Tin tức', to: '/news' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar bg-white shadow-sm px-3 py-0 flex justify-between items-center font-roboto">
      <Link to="/">
        <img src={Logo1} alt="BookingCare" className="w-[5rem] object-contain" />
      </Link>

      <ul className="hidden md:flex gap-6 items-center text-[15px]">
        {navLinks.map((link, index) => (
          <li key={index}>
            <Link
              to={link.to}
              className={`py-1 px-2 transition font-medium ${isActive(link.to)
                ? 'text-blue-600 border-b-2 border-blue-500'
                : 'text-gray-700 hover:text-blue-500'
                }`}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>

      <div className="hidden md:block">
        {isLoggedIn ? (
          <div
            className="relative inline-block"
            onMouseEnter={() => setIsDropdownOpen(true)}
            onMouseLeave={() => setIsDropdownOpen(false)}
          >
            <button
              className="focus:outline-none"
              aria-haspopup="true"
              aria-expanded={isDropdownOpen}
            >
              <img
                className="w-9 h-9 rounded-full object-cover border border-blue-500 cursor-pointer"
                src={userData?.image ? getImageUrl(userData.image) : MyProfile_Pic}
                alt="Hồ Sơ"
                onError={(e) => {
                  console.error('[Navbar img onError] Tải hình ảnh thất bại:', {
                    originalUrl: userData?.image,
                    constructedUrl: getImageUrl(userData.image),
                    error: e.message,
                    targetSrc: e.target.src,
                  });
                  e.target.src = MyProfile_Pic;
                  e.target.onerror = null; // Prevent infinite error loops
                }}
              />
            </button>

            <div
              className={`absolute right-0 mt-0 top-full w-40 bg-white rounded shadow-md z-20 transition-all duration-150 ${isDropdownOpen ? 'block' : 'hidden'
                }`}
            >
              <button
                onClick={() => {
                  navigate('/my-profile');
                  setIsDropdownOpen(false);
                }}
                className="block w-full text-left px-4 py-2 hover:bg-blue-50 text-sm"
              >
                Hồ Sơ Của Tôi
              </button>
              <button
                onClick={() => {
                  navigate('/my-appointment');
                  setIsDropdownOpen(false);
                }}
                className="block w-full text-left px-4 py-2 hover:bg-blue-50 text-sm"
              >
                Lịch Hẹn Của Tôi
              </button>
              <button
                onClick={() => {
                  navigate('/change-password');
                  setIsDropdownOpen(false);
                }}
                className="block w-full text-left px-4 py-2 hover:bg-blue-50 text-sm"
              >
                Đổi Mật Khẩu
              </button>
              <button
                onClick={() => {
                  handleLogout();
                  setIsDropdownOpen(false);
                }}
                className="block w-full text-left px-4 py-2 text-red-600 hover:bg-blue-50 text-sm"
              >
                Đăng Xuất
              </button>
            </div>
          </div>
        ) : (
          <Link to="/login">
            <button className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-4 py-1.5 rounded transition">
              Đăng Nhập
            </button>
          </Link>
        )}
      </div>

      <div className="md:hidden">
        <button onClick={() => setMenuOpen(!menuOpen)} className="text-xl">
          <FaBars className="text-gray-700" />
        </button>
      </div>

      {menuOpen && (
        <div className="absolute top-14 right-4 w-48 bg-white rounded shadow-md z-50 md:hidden p-3 space-y-2">
          {navLinks.map((link, idx) => (
            <Link
              key={idx}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className={`block text-sm py-2 px-3 rounded ${isActive(link.to) ? 'bg-blue-100 text-blue-600 font-medium' : 'text-gray-700 hover:bg-blue-50'
                }`}
            >
              {link.label}
            </Link>
          ))}
          {isLoggedIn ? (
            <>
              <hr />
              <button
                onClick={() => {
                  navigate('/my-profile');
                  setMenuOpen(false);
                }}
                className="block text-sm w-full text-left px-3 py-2 hover:bg-blue-50"
              >
                Hồ Sơ Của Tôi
              </button>
              <button
                onClick={() => {
                  navigate('/my-appointment');
                  setMenuOpen(false);
                }}
                className="block text-sm w-full text-left px-3 py-2 hover:bg-blue-50"
              >
                Lịch Hẹn Của Tôi
              </button>
              <button
                onClick={() => {
                  navigate('/change-password');
                  setMenuOpen(false);
                }}
                className="block text-sm w-full text-left px-3 py-2 hover:bg-blue-50"
              >
                Đổi Mật Khẩu
              </button>
              <button
                onClick={() => {
                  handleLogout();
                  setMenuOpen(false);
                }}
                className="block text-sm w-full text-left px-3 py-2 text-red-600 hover:bg-blue-50"
              >
                Đăng Xuất
              </button>
            </>
          ) : (
            <Link to="/login">
              <button
                onClick={() => setMenuOpen(false)}
                className="block w-full text-left text-sm px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Đăng Nhập
              </button>
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;