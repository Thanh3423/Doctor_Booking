import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppContext } from "../Context/AppContext";

const RelatedDoc = () => {
  const { docId } = useParams();
  const navigate = useNavigate();
  const { backEndUrl, doctor, allDoctors, getDoctorData } = useContext(AppContext);
  const [docInfo, setDocInfo] = useState(null);

  useEffect(() => {
    if (docId) {
      getDoctorData(docId);
    }
  }, [docId]);

  useEffect(() => {
    if (doctor) {
      setDocInfo(doctor);
    }
  }, [doctor]);

  const relatedDoctors = docInfo
    ? allDoctors.filter((doc) => doc.specialty === doctor.specialty && doc._id !== doctor._id)
    : [];

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

  return (
    <div className="flex flex-col items-center min-h-screen px-4 py-12 bg-gray-50">
      {/* Heading */}
      <h2 className="text-3xl md:text-4xl font-bold text-blue-700 text-center mb-8">
        Related Doctors
      </h2>

      {/* Loading State */}
      {!docInfo ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-7xl">
          {[...Array(3)].map((_, idx) => (
            <div
              key={idx}
              className="w-full max-w-sm p-6 bg-white shadow-lg rounded-2xl animate-pulse"
            >
              <div className="w-full h-60 bg-gray-200 rounded-lg"></div>
              <div className="p-4 space-y-4">
                <div className="h-6 bg-gray-200 rounded w-3/4 mx-auto"></div>
                <div className="flex justify-between">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div className="flex justify-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-4 w-4 bg-gray-200 rounded-full"></div>
                  ))}
                </div>
                <div className="h-10 bg-gray-200 rounded-xl w-full"></div>
              </div>
            </div>
          ))}
        </div>
      ) : relatedDoctors.length === 0 ? (
        <p className="text-lg text-gray-500 mt-4">No Related Doctors Found</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-7xl">
          {relatedDoctors.map((doc) => (
            <div
              key={doc._id}
              className="w-full max-w-sm p-6 bg-white shadow-lg rounded-2xl transform transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
            >
              <img
                className="w-full h-60 object-cover rounded-lg mx-auto"
                src={`${backEndUrl}/images/uploads/${doc.image}`}
                alt={doc.name}
                loading="lazy"
                onError={(e) => (e.target.src = "/fallback-image.jpg")} // Fallback image
                aria-label={`Profile picture of ${doc.name}`}
              />
              <div className="p-4 text-center">
                <h3 className="text-xl font-semibold text-gray-800">{doc.name}</h3>
                <div className="flex justify-between mt-2 text-gray-600">
                  <div className="text-blue-500 font-medium text-base">
                    {Array.isArray(doc.specialty) ? (
                      doc.specialty.map((specialty, index) => (
                        <p key={index}>{specialty}</p>
                      ))
                    ) : (
                      <p>{doc.specialty}</p>
                    )}
                  </div>
                  <p>Exp: {doc.experience} years</p>
                </div>
                <div className="flex items-center justify-center gap-1 mt-2">
                  {renderStars(doc.rating)}
                  <span className="text-gray-600 text-base ml-1">({doc.rating})</span>
                </div>
                <button
                  onClick={() => {
                    navigate(`/appointment/${doc._id}`);
                    window.scrollTo(0, 0);
                  }}
                  className="mt-5 px-5 py-2.5 bg-blue-600 text-white text-base font-medium rounded-xl hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={`Book an appointment with ${doc.name}`}
                >
                  Book Now
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RelatedDoc;