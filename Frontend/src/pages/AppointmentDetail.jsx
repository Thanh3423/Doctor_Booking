import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppContext } from '../Context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { StarIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline';
import moment from 'moment-timezone';

// Google Fonts for Vietnamese
const fontStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&display=swap');
  .font-vietnamese {
    font-family: 'Roboto', 'Noto Sans', Arial, sans-serif;
  }
`;

const AppointmentDetail = () => {
    const { id } = useParams();
    const { token, setToken, setUserData, backEndUrl } = useContext(AppContext);
    const navigate = useNavigate();
    const [appointment, setAppointment] = useState(null);
    const [medicalHistory, setMedicalHistory] = useState([]);
    const [review, setReview] = useState({ rating: 0, comment: '' });
    const [isReviewed, setIsReviewed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [hoveredRating, setHoveredRating] = useState(0);

    // Format date
    const formatDate = (dateString) => {
        try {
            if (!dateString) return 'Không xác định';
            const date = moment.tz(dateString, 'Asia/Ho_Chi_Minh');
            return date.isValid()
                ? date.format('DD/MM/YYYY HH:mm')
                : 'Ngày không hợp lệ';
        } catch (error) {
            console.warn('[formatDate] Invalid date:', dateString, error);
            return 'Không xác định';
        }
    };

    // Fetch appointment, medical history, and review status
    const fetchData = async () => {
        try {
            setIsLoading(true);
            if (!token) {
                toast.error('Vui lòng đăng nhập');
                navigate('/login');
                return;
            }

            const backendUrl = backEndUrl || import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
            console.log('[fetchData] Using backendUrl:', backendUrl);

            // Fetch appointment
            console.log('[fetchData] Fetching appointment:', id);
            const apptResponse = await axios.get(`${backendUrl}/patient/appointment/${id}`, {
                withCredentials: true,
                headers: { Authorization: `Bearer ${token}` },
            });
            console.log('[fetchData] Appointment response:', apptResponse.data);
            if (apptResponse.data.success && apptResponse.data.data?._id) {
                setAppointment(apptResponse.data.data);
            } else {
                throw new Error(apptResponse.data.message || 'Không tìm thấy lịch hẹn');
            }

            // Fetch medical history
            console.log('[fetchData] Fetching medical history for patient');
            try {
                const historyResponse = await axios.get(`${backendUrl}/patient/medical-history`, {
                    withCredentials: true,
                    headers: { Authorization: `Bearer ${token}` },
                });
                console.log('[fetchData] Medical history response:', historyResponse.data);
                if (historyResponse.data.success && Array.isArray(historyResponse.data.data)) {
                    const relatedHistory = historyResponse.data.data.filter(
                        (record) => record.appointmentId?.toString() === id
                    );
                    setMedicalHistory(relatedHistory);
                } else {
                    setMedicalHistory([]);
                    console.warn('[fetchData] No medical history found:', historyResponse.data);
                }
            } catch (historyError) {
                console.error('[fetchData] Medical history error:', {
                    message: historyError.message,
                    response: historyError.response?.data,
                    status: historyError.response?.status,
                });
                setMedicalHistory([]);
                if (historyError.response?.status === 404) {
                    console.warn('[fetchData] Medical history endpoint not found, setting empty history');
                } else {
                    toast.error(historyError.response?.data?.message || 'Lỗi khi tải lịch sử y tế');
                }
            }

            // Check review status
            console.log('[fetchData] Fetching reviews');
            const reviewsResponse = await axios.get(`${backendUrl}/patient/my-reviews`, {
                withCredentials: true,
                headers: { Authorization: `Bearer ${token}` },
            });
            console.log('[fetchData] Reviews response:', reviewsResponse.data);
            if (reviewsResponse.data.success && Array.isArray(reviewsResponse.data.data)) {
                const existingReview = reviewsResponse.data.data.find((r) => r.appointmentId?.toString() === id);
                if (existingReview) {
                    setIsReviewed(true);
                    setReview({ rating: existingReview.rating, comment: existingReview.review });
                }
            }
        } catch (error) {
            const errorDetails = {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                stack: error.stack,
            };
            console.error('[fetchData] Detailed Error:', errorDetails);
            toast.error(error.response?.data?.message || error.message || 'Lỗi khi tải dữ liệu');
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('userData');
                setToken('');
                setUserData(null);
                navigate('/login');
            } else if (error.response?.status === 404) {
                navigate('/my-appointment');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Handle review submission
    const submitReview = async () => {
        const ratingNum = parseInt(review.rating);
        if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
            toast.error('Vui lòng chọn số sao từ 1 đến 5');
            return;
        }
        if (!review.comment.trim()) {
            toast.error('Vui lòng viết nhận xét');
            return;
        }
        if (!appointment?.doctorId?._id || !id) {
            toast.error('Thông tin bác sĩ hoặc lịch hẹn không hợp lệ');
            console.error('[submitReview] Missing doctorId or appointmentId:', { doctorId: appointment?.doctorId?._id, appointmentId: id });
            return;
        }

        const isConfirmed = window.confirm('Bạn có chắc chắn muốn gửi đánh giá này?');
        if (!isConfirmed) return;

        try {
            const backendUrl = backEndUrl || import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
            console.log('[submitReview] Submitting review to:', `${backendUrl}/patient/submit-review`);
            console.log('[submitReview] Request payload:', {
                rating: ratingNum,
                review: review.comment,
                doctorId: appointment.doctorId._id,
                appointmentId: id,
            });

            const response = await axios.post(
                `${backendUrl}/patient/submit-review`,
                {
                    rating: ratingNum,
                    review: review.comment,
                    doctorId: appointment.doctorId._id,
                    appointmentId: id,
                },
                {
                    withCredentials: true,
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            console.log('[submitReview] Review response:', response.data);

            if (response.data.success) {
                setIsReviewed(true);
                setShowReviewForm(false);
                setReview({ rating: response.data.data.rating, comment: response.data.data.review });
                toast.success('Gửi đánh giá thành công');
            } else {
                throw new Error(response.data.message || 'Lỗi khi gửi đánh giá');
            }
        } catch (error) {
            const errorDetails = {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                request: error.request,
                stack: error.stack,
            };
            console.error('[submitReview] Detailed Error:', errorDetails);
            const errorMsg = error.response?.data?.message || error.message || 'Lỗi khi gửi đánh giá';
            toast.error(errorMsg);
            if (errorMsg === 'Bạn đã đánh giá lịch hẹn này') {
                setIsReviewed(true);
                setShowReviewForm(false);
            }
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('userData');
                setToken('');
                setUserData(null);
                navigate('/login');
            }
        }
    };

    // Handle star rating click
    const handleRatingClick = (rating) => {
        setReview({ ...review, rating });
    };

    useEffect(() => {
        if (token) {
            fetchData();
        } else {
            navigate('/login');
        }
    }, [token, id, backEndUrl, navigate]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center font-vietnamese">
                <style>{fontStyle}</style>
                <p className="text-gray-500 text-lg">Đang tải...</p>
            </div>
        );
    }

    if (!appointment) {
        return (
            <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center font-vietnamese">
                <style>{fontStyle}</style>
                <p className="text-gray-500 text-lg">Không tìm thấy lịch hẹn</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-8 flex flex-col items-center font-vietnamese">
            <style>{fontStyle}</style>
            <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg p-6 md:p-8">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 border-b pb-2">
                    Chi Tiết Lịch Hẹn
                </h1>

                {/* Appointment Details */}
                <div className="mb-8 bg-gray-50 rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Thông Tin Lịch Hẹn</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <p className="text-gray-700">
                            <span className="font-medium">Bác sĩ:</span>{' '}
                            {appointment.doctorId?.name || 'Không xác định'}
                        </p>
                        <p className="text-gray-700">
                            <span className="font-medium">Chuyên khoa:</span>{' '}
                            {appointment.doctorId?.specialty?.name || 'Không có thông tin'}
                        </p>
                        <p className="text-gray-700">
                            <span className="font-medium">Ngày:</span>{' '}
                            {formatDate(appointment.appointmentDate)}
                        </p>
                        <p className="text-gray-700">
                            <span className="font-medium">Giờ:</span>{' '}
                            {appointment.timeslot || 'Không xác định'}
                        </p>
                        <p className="text-gray-700">
                            <span className="font-medium">Trạng thái:</span>{' '}
                            <span
                                className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${appointment.status === 'cancelled'
                                        ? 'bg-red-100 text-red-700'
                                        : appointment.status === 'pending'
                                            ? 'bg-yellow-100 text-yellow-700'
                                            : 'bg-green-100 text-green-700'
                                    }`}
                            >
                                {appointment.status === 'pending'
                                    ? 'Chờ xác nhận'
                                    : appointment.status === 'cancelled'
                                        ? 'Đã hủy'
                                        : 'Hoàn thành'}
                            </span>
                        </p>
                    </div>
                </div>

                {/* Medical History */}
                <div className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Lịch Sử Y Tế</h2>
                    {medicalHistory.length === 0 ? (
                        <p className="text-gray-600 italic">Chưa có hồ sơ y tế cho lịch hẹn này.</p>
                    ) : (
                        <div className="space-y-4">
                            {medicalHistory.map((record) => (
                                <div
                                    key={record._id}
                                    className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        <p className="text-gray-700">
                                            <span className="font-medium">Ngày:</span>{' '}
                                            {formatDate(record.date)}
                                        </p>
                                        <p className="text-gray-700">
                                            <span className="font-medium">Bác sĩ:</span>{' '}
                                            {record.doctorName || 'Không xác định'}
                                        </p>
                                        <p className="text-gray-700">
                                            <span className="font-medium">Chẩn đoán:</span>{' '}
                                            {record.diagnosis || 'Không có thông tin'}
                                        </p>
                                        <p className="text-gray-700">
                                            <span className="font-medium">Điều trị:</span>{' '}
                                            {record.treatment || 'Không có thông tin'}
                                        </p>
                                        <p className="text-gray-700">
                                            <span className="font-medium">Khung giờ:</span>{' '}
                                            {record.timeslot || 'Không xác định'}
                                        </p>
                                        <p className="text-gray-700">
                                            <span className="font-medium">Ngày hẹn:</span>{' '}
                                            {formatDate(record.appointmentDate)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Review Section */}
                {new Date(appointment.appointmentDate) < new Date() &&
                    appointment.status === 'completed' && (
                        <div>
                            <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
                                Đánh Giá Bác Sĩ
                            </h2>
                            {isReviewed ? (
                                <div className="bg-white rounded-lg p-6 shadow-sm">
                                    <div className="flex items-center mb-3">
                                        <span className="font-medium text-gray-700 mr-2">Đánh giá:</span>
                                        <div className="flex">
                                            {Array(5)
                                                .fill()
                                                .map((_, i) => (
                                                    <StarIcon
                                                        key={i}
                                                        className={`h-6 w-6 ${i < parseInt(review.rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                                                    />
                                                ))}
                                        </div>
                                    </div>
                                    <p className="text-gray-700 text-sm">
                                        <span className="font-medium">Nhận xét:</span>{' '}
                                        {review.comment || 'Không có nhận xét'}
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    {!showReviewForm && (
                                        <button
                                            onClick={() => setShowReviewForm(true)}
                                            className="w-full md:w-auto bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-2 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-md"
                                            aria-label="Đánh giá bác sĩ"
                                        >
                                            <StarIcon className="h-5 w-5" />
                                            Đánh Giá
                                        </button>
                                    )}
                                    {showReviewForm && (
                                        <div className="bg-gray-50 rounded-lg p-6 mt-4 shadow-sm transition-all duration-300">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Chọn số sao:
                                            </label>
                                            <div className="flex mb-4">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <button
                                                        key={star}
                                                        onClick={() => handleRatingClick(star)}
                                                        onMouseEnter={() => setHoveredRating(star)}
                                                        onMouseLeave={() => setHoveredRating(0)}
                                                        className="focus:outline-none"
                                                        aria-label={`Đánh giá ${star} sao`}
                                                    >
                                                        {(hoveredRating || review.rating) >= star ? (
                                                            <StarIcon
                                                                className="h-8 w-8 text-yellow-400 hover:scale-110 transition-transform duration-200"
                                                            />
                                                        ) : (
                                                            <StarOutlineIcon
                                                                className="h-8 w-8 text-gray-300 hover:scale-110 transition-transform duration-200"
                                                            />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>

                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Nhận xét:
                                            </label>
                                            <textarea
                                                value={review.comment}
                                                onChange={(e) => setReview({ ...review, comment: e.target.value })}
                                                placeholder="Viết nhận xét về trải nghiệm với bác sĩ..."
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm transition-all duration-200"
                                                rows="5"
                                                aria-label="Nhận xét bác sĩ"
                                            />

                                            <div className="flex gap-4 mt-4">
                                                <button
                                                    onClick={submitReview}
                                                    className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors duration-200 shadow-sm"
                                                    aria-label="Gửi đánh giá"
                                                >
                                                    Gửi Đánh Giá
                                                </button>
                                                <button
                                                    onClick={() => setShowReviewForm(false)}
                                                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors duration-200 shadow-sm"
                                                    aria-label="Hủy đánh giá"
                                                >
                                                    Hủy
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
            </div>
        </div>
    );
};

export default AppointmentDetail;