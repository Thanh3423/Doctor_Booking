import React, { useEffect, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../Context/AppContext';

const normalizeString = (str) => {
  return str
    ?.trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-') || '';
};

const fontStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
  .font-vietnamese {
    font-family: 'Roboto', 'Arial', sans-serif;
  }
`;

const Services = () => {
  const { specializations, backEndUrl } = useContext(AppContext);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    console.log("Specializations:", specializations);
    specializations.forEach((specialty, index) => {
      console.log(`Specialty ${index} image URL:`, getSpecialtyImageUrl(specialty.image));
    });
    if (specializations.length > 0 || specializations.length === 0) {
      setIsLoading(false);
    }
  }, [specializations]);

  const getSpecialtyImageUrl = (image) => {
    if (!image || !image.trim()) return '/fallback-specialty-image.jpg';
    return `${backEndUrl}/images/uploads/specialties/${image.split('/').pop()}`;
  };

  return (
    <>
      <style>{fontStyle}</style>
      <section className='bg-gradient-to-br from-blue-50 to-indigo-100 py-16 lg:py-20 font-vietnamese'>
        <div className="container mx-auto px-4">
          <h2 className='text-3xl lg:text-4xl font-extrabold text-center text-gray-800 mb-10 drop-shadow-sm'>
            Chuyên Khoa
          </h2>

          {isLoading ? (
            <div className="text-center py-10">
              <p className="text-2xl text-gray-500 font-medium">Đang tải chuyên khoa...</p>
            </div>
          ) : specializations.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-2xl text-gray-500 font-medium">
                Không có chuyên khoa nào được tải.
              </p>
            </div>
          ) : (
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 lg:gap-10'>
              {specializations.map((specialty, index) => (
                <div
                  key={index}
                  className='bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col
                             transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl
                             cursor-pointer group'
                  onClick={() => {
                    navigate(`/doctors/${normalizeString(specialty.name)}`);
                    window.scrollTo(0, 0);
                  }}
                >
                  <img
                    src={getSpecialtyImageUrl(specialty.image)}
                    alt={specialty.name}
                    className='w-full h-48 object-cover rounded-t-3xl group-hover:brightness-90 transition-all duration-300 bg-gray-200'
                    onError={(e) => {
                      e.target.src = '/fallback-specialty-image.jpg';
                      console.log(`Image failed for ${specialty.name}:`, e.target.src);
                    }}
                  />
                  <div className='p-6 flex flex-col flex-grow'>
                    <h3 className='text-2xl font-bold text-gray-800 mb-2 group-hover:text-blue-700 transition-colors'>
                      {specialty.name}
                    </h3>
                    <p className='text-gray-600 text-base mb-4 flex-grow line-clamp-3'>
                      {specialty.description || 'Không có mô tả.'}
                    </p>
                    <button
                      className='mt-auto w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl
                                 hover:bg-blue-700 transition-colors duration-300
                                 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                      aria-label={`Xem thêm về ${specialty.name}`}
                    >
                      Xem Bác Sĩ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default Services;