
import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AppContext } from '../Context/AppContext';
import { toast } from 'react-toastify';

// Import Google Fonts để hỗ trợ tiếng Việt
const fontStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=Roboto:wght@300;400;700&display=swap');
  .font-vietnamese {
    font-family: 'Roboto', 'Inter', sans-serif;
  }
`;

// Hàm hiển thị các ngôi sao Font Awesome dựa trên đánh giá
const renderStars = (rating) => {
  return Array.from({ length: 5 }, (_, i) => {
    if (i < Math.floor(rating)) {
      return <i key={i} className="fa-solid fa-star text-yellow-500 text-base" aria-hidden="true"></i>;
    }
    if (i === Math.floor(rating) && rating % 1 !== 0) {
      return <i key={i} className="fa-solid fa-star-half-stroke text-yellow-500 text-base" aria-hidden="true"></i>;
    }
    return <i key={i} className="fa-regular fa-star text-yellow-400 text-base" aria-hidden="true"></i>;
  });
};

const TopDoctors = () => {
  const navigate = useNavigate();
  const { allDoctors, backEndUrl } = useContext(AppContext);
  const [processedDoctors, setProcessedDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDoctorsAndRatings = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log("allDoctors:", allDoctors); // Debug: Kiểm tra allDoctors

        if (!allDoctors || allDoctors.length === 0) {
          console.warn("Không có bác sĩ nào trong allDoctors");
          setProcessedDoctors([]);
          return;
        }

        // Lấy đánh giá từ API
        const response = await axios.get(`${backEndUrl}/doctor/get-all-ratings`);
        const ratingsData = response.data || [];
        console.log("Dữ liệu đánh giá:", ratingsData); // Debug: Kiểm tra ratings

        // Gắn đánh giá vào danh sách bác sĩ
        const updatedDoctors = allDoctors.map((doc) => {
          const ratingInfo = ratingsData.find((r) => String(r._id) === String(doc._id));
          return {
            ...doc,
            averageRating: ratingInfo ? parseFloat(ratingInfo.averageRating) : 0,
            totalReviews: ratingInfo ? ratingInfo.totalReviews : 0,
          };
        });

        console.log("Danh sách bác sĩ đã cập nhật:", updatedDoctors); // Debug: Kiểm tra sau khi gắn ratings

        // Lấy tối đa 4 bác sĩ để hiển thị
        setProcessedDoctors(updatedDoctors.slice(0, 4));
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu:", error);
        setError("Không thể tải danh sách bác sĩ. Vui lòng thử lại sau.");
        toast.error("Không thể tải danh sách bác sĩ. Vui lòng thử lại sau.");
        setProcessedDoctors([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDoctorsAndRatings();
  }, [allDoctors, backEndUrl]);

  if (isLoading) {
    return (
      <div className="text-center py-10 font-vietnamese">
        <p className="text-blue-500 text-lg">Đang tải danh sách bác sĩ...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10 font-vietnamese">
        <p className="text-red-500 text-lg">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-6 py-2.5 bg-blue-600 text-white text-base font-medium rounded-xl hover:bg-blue-700"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="py-16 bg-gradient-to-b from-blue-50 to-white font-vietnamese">
      {/* Thêm style cho font tiếng Việt */}
      <style>{fontStyle}</style>
      <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-12">
        Bác sĩ hàng đầu
      </h2>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {processedDoctors.length === 0 ? (
          <div className="text-center">
            <p className="text-lg text-gray-500 mb-4">Không tìm thấy bác sĩ nào</p>
            <button
              onClick={() => {
                navigate('/doctors');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-6 py-2.5 bg-blue-600 text-white text-base font-medium rounded-xl hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Xem tất cả bác sĩ"
            >
              Xem tất cả bác sĩ
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {processedDoctors.map((doctor, index) => (
              <div
                key={doctor._id}
                className="w-full max-w-sm p-6 bg-white shadow-lg rounded-xl transform transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <img
                  className="w-full h-60 object-cover rounded-lg"
                  src={doctor.image ? `${backEndUrl}/images/uploads/${doctor.image}` : '/fallback-image.jpg'}
                  alt={`Ảnh hồ sơ của ${doctor.name || 'Bác sĩ'}`}
                  loading="lazy"
                />
                <div className="p-4 flex flex-col gap-3">
                  <h3 className="text-xl font-semibold text-gray-800 text-center">
                    {doctor.name || 'Bác sĩ chưa xác định'}
                  </h3>
                  <p className="text-gray-600 text-base text-center">
                    Kinh nghiệm: {doctor.experience || 0} năm
                  </p>
                  <p className="text-blue-500 font-medium text-base text-center">
                    {doctor.specialty?.name || 'Chuyên khoa chưa xác định'}
                  </p>
                  <div className="flex items-center justify-center gap-1 mt-2">
                    {renderStars(doctor.averageRating || 0)}
                    <span className="text-gray-600 text-base ml-1">
                      ({doctor.averageRating || 0})
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      navigate(`/appointment/${doctor._id}`);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="mt-5 px-5 py-2.5 bg-blue-600 text-white text-base font-medium rounded-xl hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label={`Đặt lịch hẹn với ${doctor.name || 'Bác sĩ'}`}
                  >
                    Đặt lịch hẹn
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TopDoctors;
