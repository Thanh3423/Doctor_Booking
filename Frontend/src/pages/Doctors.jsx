import React, { useEffect, useState, useContext, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AppContext } from '../Context/AppContext';
import { toast } from 'react-toastify';

const normalizeString = (str) => {
  return str
    ?.trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-');
};

const fontStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&display=swap');
  .font-vietnamese {
    font-family: 'Roboto', 'Arial', sans-serif;
  }
`;

function DoctorCard() {
  const { allDoctors, setAllDoctors, backEndUrl, specializations, token } = useContext(AppContext);
  const { speciality } = useParams();
  const navigate = useNavigate();
  const [filterDoc, setFilterDoc] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loggedImages, setLoggedImages] = useState(new Set());
  const [ratingsFetched, setRatingsFetched] = useState(false);

  const renderStars = (ratingValue) => {
    const stars = [];
    const normalizedRating = Math.max(0, Math.min(5, ratingValue || 0));
    for (let i = 1; i <= 5; i++) {
      if (i <= normalizedRating) {
        stars.push(<i key={i} className="fa-solid fa-star text-yellow-500 text-lg"></i>);
      } else if (i - 0.5 === normalizedRating) {
        stars.push(<i key={i} className="fa-solid fa-star-half-stroke text-yellow-500 text-lg"></i>);
      } else {
        stars.push(<i key={i} className="fa-regular fa-star text-gray-300 text-lg"></i>);
      }
    }
    return stars;
  };

  const getImageUrl = (image) => {
    if (!image || !image.trim()) return '/fallback-doctor-image.jpg';
    return `${backEndUrl}/images/uploads/doctors/${image.split('/').pop()}`;
  };

  const imageUrls = useMemo(() => {
    const urls = {};
    filterDoc.forEach((doctor) => {
      urls[doctor._id] = getImageUrl(doctor.image);
    });
    return urls;
  }, [filterDoc, backEndUrl]);

  const fetchAndIntegrateRatings = useCallback(async () => {
    if (ratingsFetched) return;
    try {
      setIsLoading(true);
      const response = await axios.get(`${backEndUrl}/doctor/all-ratings`);
      const ratingsData = response.data || [];
      const updatedDoctors = allDoctors.map((doc) => {
        const ratingInfo = ratingsData.find((r) => String(r._id) === String(doc._id));
        return {
          ...doc,
          averageRating: ratingInfo ? parseFloat(ratingInfo.averageRating) : 0,
          totalReviews: ratingInfo ? ratingInfo.totalReviews : 0,
        };
      });
      setAllDoctors(updatedDoctors);
      setRatingsFetched(true);
    } catch (err) {
      setError('Không thể tải đánh giá bác sĩ.');
      toast.error('Không thể tải đánh giá bác sĩ.');
    } finally {
      setIsLoading(false);
    }
  }, [allDoctors, backEndUrl, setAllDoctors, ratingsFetched]);

  const handleBookAppointment = (doctorId) => {
    if (!token) {
      toast.error("Vui lòng đăng nhập để đặt lịch hẹn");
      navigate("/login");
      return;
    }
    navigate(`/appointment/${doctorId}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (allDoctors.length > 0 && !ratingsFetched) {
      fetchAndIntegrateRatings();
    } else if (allDoctors.length === 0) {
      setIsLoading(false);
      setFilterDoc([]);
    }
  }, [allDoctors, fetchAndIntegrateRatings, ratingsFetched]);

  useEffect(() => {
    if (allDoctors.length === 0) {
      setFilterDoc([]);
      return;
    }
    const uniqueDoctors = Array.from(new Map(allDoctors.map((doc) => [doc._id, doc])).values());
    let currentFiltered = uniqueDoctors;
    if (speciality) {
      const formattedSpeciality = normalizeString(speciality);
      currentFiltered = currentFiltered.filter((doc) => normalizeString(doc.specialty?.name) === formattedSpeciality);
    }
    if (searchQuery.trim() !== '') {
      const formattedQuery = normalizeString(searchQuery);
      currentFiltered = currentFiltered.filter((doc) => {
        const matchesName = normalizeString(doc.name).includes(formattedQuery);
        const matchesSpecialty = normalizeString(doc.specialty?.name).includes(formattedQuery);
        const matchesRating = doc.averageRating?.toString().includes(formattedQuery);
        return matchesName || matchesSpecialty || matchesRating;
      });
    }
    setFilterDoc(currentFiltered);
  }, [speciality, searchQuery, allDoctors]);

  if (isLoading) {
    return (
      <section className="bg-gray-50 py-12 px-4 sm:px-6 font-vietnamese">
        <style>{fontStyle}</style>
        <div className="text-center">
          <p className="text-blue-500 text-lg">Đang tải danh sách bác sĩ...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-gray-50 py-12 px-4 sm:px-6 font-vietnamese">
        <style>{fontStyle}</style>
        <div className="text-center">
          <p className="text-red-500 text-lg">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2.5 bg-blue-600 text-white text-base font-medium rounded-xl hover:bg-blue-700"
          >
            Thử lại
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-gray-50 py-12 px-4 sm:px-6 font-vietnamese">
      <style>{fontStyle}</style>
      <div className="lg:px-10 max-w-full mx-auto">
        <div className="flex flex-col lg:flex-row gap-10">
          <aside className="w-full lg:w-72 p-6 bg-white rounded-2xl shadow-xl flex-shrink-0">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <i className="fa-solid fa-filter mr-3 text-blue-500"></i>
              Lọc theo chuyên khoa
            </h3>
            <nav>
              <ul className="space-y-3">
                {specializations && specializations.length > 0 ? (
                  specializations.slice(0, 8).map((specialty, index) => (
                    <li key={index}>
                      <button
                        onClick={() => {
                          navigate(`/doctors/${encodeURIComponent(normalizeString(specialty.name))}`);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`w-full text-left px-5 py-3 rounded-xl font-medium transition-all duration-200 ease-in-out
                          ${normalizeString(speciality) === normalizeString(specialty.name)
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          } focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2`}
                      >
                        {specialty.name}
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="text-gray-500">Không có chuyên khoa nào được tải.</li>
                )}
              </ul>
            </nav>
            {speciality && (
              <button
                onClick={() => {
                  navigate('/doctors');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="mt-6 w-full px-5 py-3 bg-red-500 text-white rounded-xl font-medium
                  hover:bg-red-600 transition-all duration-200 ease-in-out
                  focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
              >
                Xóa bộ lọc
              </button>
            )}
          </aside>
          <div className="flex-1">
            <h1 className="text-4xl font-extrabold text-center text-gray-800 mb-12">
              Tìm bác sĩ phù hợp
            </h1>
            <div className="flex justify-center mb-12">
              <div className="relative w-full max-w-2xl">
                <input
                  type="text"
                  placeholder="Tìm bác sĩ theo tên, chuyên khoa hoặc đánh giá..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="p-4 pl-12 w-full border border-gray-300 rounded-full shadow-sm
                    focus:outline-none focus:ring-3 focus:ring-blue-400 focus:border-transparent
                    transition duration-200 ease-in-out text-lg text-gray-700"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    aria-label="Xóa tìm kiếm"
                  >
                    <i className="fas fa-times-circle"></i>
                  </button>
                )}
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <i className="fas fa-search"></i>
                </span>
              </div>
            </div>
            {filterDoc.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filterDoc.map((doctor) => (
                  <div
                    key={doctor._id}
                    className="bg-white rounded-2xl shadow-xl overflow-hidden
                      transform transition-transform duration-300 hover:-translate-y-2 hover:shadow-2xl"
                  >
                    <img
                      className="w-full h-56 object-cover object-top rounded-t-2xl"
                      src={imageUrls[doctor._id]}
                      alt={`BS. ${doctor.name || 'Bác sĩ'}`}
                      onError={(e) => {
                        if (e.target.src !== '/fallback-doctor-image.jpg' && !loggedImages.has(doctor.image)) {
                          console.log(`Failed to load image for doctor: ${doctor.name || 'Unknown'} (ID: ${doctor._id}, Image: ${doctor.image})`);
                          setLoggedImages((prev) => new Set(prev).add(doctor.image));
                          e.target.src = '/fallback-doctor-image.jpg';
                        }
                      }}
                      loading="lazy"
                    />
                    <div className="p-6">
                      <h2 className="text-2xl font-bold text-gray-800 mb-2">
                        BS. {doctor.name || 'Chưa xác định'}
                      </h2>
                      <p className="text-blue-600 font-semibold text-lg mb-2">
                        {doctor.specialty?.name || 'Chưa xác định'}
                      </p>
                      <div className="flex justify-between items-center text-gray-600 text-base mb-3">
                        <span>
                          Kinh nghiệm: <span className="font-medium">{doctor.experience || 0} năm</span>
                        </span>
                        <div className="flex items-center gap-1">
                          {renderStars(doctor.averageRating || 0)}
                          <span className="ml-1">({doctor.totalReviews || 0})</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleBookAppointment(doctor._id)}
                        className="mt-4 w-full px-6 py-3 bg-blue-600 text-white text-lg font-semibold rounded-xl
                          hover:bg-blue-700 transition duration-300 ease-in-out
                          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        aria-label={`Đặt lịch hẹn với BS. ${doctor.name || 'Bác sĩ'}`}
                      >
                        Đặt lịch ngay
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-2xl text-gray-500 font-medium">
                  {allDoctors.length === 0
                    ? 'Không có bác sĩ nào được tải. Vui lòng kiểm tra kết nối.'
                    : 'Không tìm thấy bác sĩ nào phù hợp với tiêu chí của bạn.'}
                </p>
                {(speciality || searchQuery) && (
                  <button
                    onClick={() => {
                      navigate('/doctors');
                      setSearchQuery('');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="mt-6 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium
                      hover:bg-gray-300 transition-all duration-200"
                  >
                    Xóa tất cả bộ lọc
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default DoctorCard;