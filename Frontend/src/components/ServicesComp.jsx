import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AppContext } from '../Context/AppContext';
import { toast } from 'react-toastify';

const ServicesComp = () => {
  const { backEndUrl, token } = useContext(AppContext); // Thêm token nếu API cần xác thực
  const navigate = useNavigate();
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSpecialties = async () => {
      try {
        setLoading(true);
        setError(null);
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios.get(`${backEndUrl}/api/specialty/all`, {
          headers: { 'Content-Type': 'application/json', ...headers },
          withCredentials: true,
        });
        if (response.data.success && Array.isArray(response.data.data)) {
          setSpecialties(response.data.data);
        } else {
          setSpecialties([]);
          setError('Không có chuyên khoa nào được tìm thấy');
        }
      } catch (error) {
        const errorMessage = error.response?.data?.message || 'Lỗi tải chuyên khoa. Vui lòng thử lại sau.';
        setError(errorMessage);
        toast.error(errorMessage);
        console.error('Error fetching specialties:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSpecialties();
  }, [backEndUrl, token]);

  // Fallback image URL
  const fallbackImage = '/fallback-specialty-image.jpg';

  // Normalize image path for specialties
  const getImageUrl = (image) => {
    if (!image) {
      console.warn('No image provided, using fallback');
      return fallbackImage;
    }
    // Loại bỏ full URL, tiền tố không cần thiết, và chỉ lấy tên file
    const cleanPath = image
      .replace(/^https?:\/\/[^/]+/, '') // Loại bỏ http://localhost:3000
      .replace(/^\/?(?:public\/)?(?:[Ii]mages\/)?(?:[Uu]ploads\/)?(?:[Ss]pecialties\/)?/, '') // Loại bỏ /public/, /images/, /Uploads/, /specialties/
      .replace(/^\/+/, ''); // Loại bỏ dấu / đầu tiên
    const finalUrl = `${backEndUrl}/images/uploads/specialties/${cleanPath}`;
    console.log('Generated image URL:', finalUrl); // Debug
    return finalUrl;
  };

  return (
    <div className="py-16 bg-gradient-to-b from-blue-100 via-blue-50 to-white">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=Roboto:wght@300;400;700&display=swap');
          .font-vietnamese {
            font-family: 'Inter', 'Roboto', sans-serif;
          }
          .spinner {
            border: 4px solid rgba(0, 0, 0, 0.1);
            border-left-color: #3b82f6;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>

      <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-12 font-vietnamese">
        Chuyên Khoa Của Chúng Tôi
      </h2>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 font-vietnamese">
        {loading ? (
          <div className="text-center">
            <div className="spinner"></div>
            <p className="text-lg text-gray-500 mt-2">Đang tải chuyên khoa...</p>
          </div>
        ) : error ? (
          <div className="text-center">
            <p className="text-lg text-red-500">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-vietnamese"
            >
              Thử lại
            </button>
          </div>
        ) : specialties.length === 0 ? (
          <p className="text-center text-lg text-gray-500">Không có chuyên khoa nào</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {specialties.slice(0, 4).map((specialty, index) => (
              <div
                key={specialty._id}
                className="bg-white rounded-xl shadow-md p-5 transform transition-all duration-300 hover:scale-105 hover:shadow-lg"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <img
                  src={getImageUrl(specialty.image)}
                  alt={`Chuyên khoa ${specialty.name}`}
                  className="w-full h-48 object-cover rounded-lg"
                  loading="lazy"
                  onError={(e) => {
                    e.target.src = fallbackImage;
                    console.warn(`Failed to load image: ${getImageUrl(specialty.image)}`);
                  }}
                />
                <h3 className="text-xl font-semibold text-gray-800 mt-4 text-center font-vietnamese">
                  {specialty.name}
                </h3>
                <p className="text-gray-600 mt-2 text-sm text-center line-clamp-3 font-vietnamese">
                  {specialty.description || 'Không có mô tả'}
                </p>
                <button
                  onClick={() => {
                    navigate(`/doctors/${encodeURIComponent(specialty.name)}`);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="mt-4 w-full px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md hover:bg-blue-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 font-vietnamese"
                  aria-label={`Xem bác sĩ chuyên khoa ${specialty.name}`}
                >
                  Xem Thêm
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-center mt-12 font-vietnamese">
        <button
          onClick={() => {
            navigate('/services');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="px-6 py-2.5 bg-blue-600 text-white text-base font-medium rounded-md hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 font-vietnamese"
          aria-label="Xem tất cả chuyên khoa"
        >
          Xem Tất Cả
        </button>
      </div>
    </div>
  );
};

export default ServicesComp;