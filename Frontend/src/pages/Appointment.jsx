import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppContext } from '../Context/AppContext';
import { toast } from 'react-toastify';
import axios from 'axios';
import moment from 'moment-timezone';

const fontStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&display=swap');
  .font-vietnamese {
    font-family: 'Roboto', 'Arial', sans-serif;
  }
`;

function Appointment() {
  const { docId } = useParams();
  const navigate = useNavigate();
  const { doctor, getDoctorData, backEndUrl, token } = useContext(AppContext);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [appointmentData, setAppointmentData] = useState({
    appointmentDate: '',
    timeslot: '',
    notes: '',
  });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('[Appointment] Raw docId from useParams:', docId);
    const fetchDoctor = async () => {
      try {
        setIsLoading(true);
        const cleanDocId = docId?.trim();
        console.log('[Appointment] Cleaned docId:', cleanDocId);
        if (!cleanDocId || !cleanDocId.match(/^[0-9a-fA-F]{24}$/)) {
          throw new Error('ID bác sĩ không hợp lệ');
        }
        const doctorData = await getDoctorData(cleanDocId);
        console.log('[Appointment] Fetched doctor data:', doctorData);
        if (!doctorData) {
          throw new Error('Không tìm thấy bác sĩ');
        }
        setIsLoading(false);
      } catch (err) {
        console.error('[Appointment] Error fetching doctor data:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
        });
        let errorMessage = 'Không thể tải thông tin bác sĩ';
        if (err.response?.status === 400) {
          errorMessage = err.response?.data?.message || 'ID bác sĩ không hợp lệ';
        } else if (err.response?.status === 404) {
          errorMessage = err.response?.data?.message || 'Bác sĩ không tồn tại';
        }
        setError(errorMessage);
        toast.error(errorMessage);
        navigate('/doctors');
        setIsLoading(false);
      }
    };
    if (docId) {
      fetchDoctor();
    } else {
      setError('ID bác sĩ không được cung cấp');
      toast.error('ID bác sĩ không được cung cấp');
      navigate('/doctors');
      setIsLoading(false);
    }
  }, [docId, getDoctorData, navigate]);

  useEffect(() => {
    console.log('[Appointment] Current doctor state:', doctor);
  }, [doctor]);

  useEffect(() => {
    const fetchAvailableSlots = async () => {
      if (!appointmentData.appointmentDate || !token) {
        setAvailableSlots([]);
        return;
      }
      try {
        setError(null);
        setAvailableSlots([]); // Reset slots before fetching
        const formattedDate = moment(appointmentData.appointmentDate)
          .tz('Asia/Ho_Chi_Minh')
          .format('YYYY-MM-DD');
        console.log('[Appointment] Fetching slots for date:', formattedDate, 'doctorId:', docId);
        const { data } = await axios.get(
          `${backEndUrl}/patient/doctor/schedule/${docId}?date=${formattedDate}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          }
        );
        console.log('[Appointment] Schedule API response:', data);
        if (data.success && Array.isArray(data.data)) {
          setAvailableSlots(data.data);
          setError(null);
        } else {
          setAvailableSlots([]);
          setError(data.message || 'Không có khung giờ trống cho ngày này');
        }
      } catch (err) {
        console.error('[Appointment] Error fetching time slots:', {
          error: err.message,
          response: err.response?.data,
          status: err.response?.status,
        });
        const message = err.response?.data?.message || 'Không thể tải khung giờ trống';
        setAvailableSlots([]);
        setError(message);
        if (err.response?.status === 404) {
          toast.warn(message);
        } else if (err.response?.status === 401) {
          toast.error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
          navigate('/login');
        } else {
          toast.error(message);
        }
      }
    };
    if (doctor && token && appointmentData.appointmentDate) {
      fetchAvailableSlots();
    } else if (!token) {
      setError('Vui lòng đăng nhập để xem khung giờ trống');
      toast.error('Vui lòng đăng nhập để xem khung giờ trống');
      navigate('/login');
    }
  }, [appointmentData.appointmentDate, docId, token, backEndUrl, doctor, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAppointmentData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'appointmentDate' && { timeslot: '' }),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error('Vui lòng đăng nhập để đặt lịch hẹn');
      navigate('/login');
      return;
    }
    if (!appointmentData.appointmentDate || !appointmentData.timeslot) {
      toast.error('Vui lòng chọn ngày và khung giờ');
      return;
    }
    if (!docId.match(/^[0-9a-fA-F]{24}$/)) {
      toast.error('ID bác sĩ không hợp lệ');
      navigate('/doctors');
      return;
    }
    try {
      setIsSubmitting(true);
      const formattedDate = moment(appointmentData.appointmentDate)
        .tz('Asia/Ho_Chi_Minh')
        .format('YYYY-MM-DD');
      const payload = {
        doctorId: docId,
        appointmentDate: formattedDate,
        timeslot: appointmentData.timeslot,
        notes: appointmentData.notes.trim() || undefined, // Send undefined if notes is empty
      };
      console.log('[Appointment] Sending booking request:', payload);
      const response = await axios.post(
        `${backEndUrl}/patient/book-appointment`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );
      console.log('[Appointment] Booking response:', response.data);
      if (response.data.success) {
        // Changed to check response.data.success instead of message
        toast.success('Đặt lịch hẹn thành công!');
        navigate('/my-appointments');
      } else {
        toast.error(response.data.message || 'Lỗi khi đặt lịch hẹn');
      }
    } catch (err) {
      console.error('[Appointment] Error booking appointment:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        payload: {
          doctorId: docId,
          appointmentDate: appointmentData.appointmentDate,
          timeslot: appointmentData.timeslot,
          notes: appointmentData.notes,
        },
      });
      const errorMessage =
        err.response?.status === 400
          ? err.response?.data?.message || 'Dữ liệu đặt lịch không hợp lệ'
          : err.response?.status === 401
            ? 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'
            : err.response?.status === 404
              ? err.response?.data?.message || 'Bác sĩ hoặc khung giờ không tồn tại'
              : err.response?.data?.message || 'Lỗi máy chủ khi đặt lịch hẹn';
      toast.error(errorMessage);
      if (err.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount || 0);
  };

  if (isLoading) {
    return (
      <section className="bg-gray-50 py-8 px-4 font-vietnamese min-h-screen">
        <style>{fontStyle}</style>
        <div className="text-center">
          <p className="text-blue-500 text-lg">Đang tải thông tin...</p>
        </div>
      </section>
    );
  }

  if (error && !doctor) {
    return (
      <section className="bg-gray-50 py-8 px-4 font-vietnamese min-h-screen">
        <style>{fontStyle}</style>
        <div className="text-center">
          <p className="text-red-500 text-lg">{error}</p>
          <button
            onClick={() => navigate('/doctors')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Quay lại danh sách bác sĩ
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-gray-50 py-8 px-4 font-vietnamese min-h-screen">
      <style>{fontStyle}</style>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">
          Đặt lịch hẹn với BS. {doctor?.name || 'Không xác định'}
        </h1>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="md:w-1/2 bg-white p-6 rounded-xl shadow-lg">
            <img
              src={`${backEndUrl}/images${doctor?.image || '/fallback-doctor-image.jpg'}`} // Adjusted image path
              alt={`BS. ${doctor?.name || 'Bác sĩ'}`}
              className="w-full h-48 object-cover rounded-lg mb-4"
              onError={(e) => (e.target.src = '/fallback-doctor-image.jpg')}
              loading="lazy"
            />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              BS. {doctor?.name || 'Không xác định'}
            </h2>
            <div className="space-y-2 text-gray-600">
              <p>
                <span className="font-medium">Chuyên khoa:</span>{' '}
                {doctor?.specialty?.name || doctor?.specialty || 'Chưa xác định'}
              </p>
              <p>
                <span className="font-medium">Email:</span>{' '}
                {doctor?.email || 'Chưa cung cấp'}
              </p>
              <p>
                <span className="font-medium">Số điện thoại:</span>{' '}
                {doctor?.phone || 'N/A'}
              </p>
              <p>
                <span className="font-medium">Địa điểm:</span>{' '}
                {doctor?.location || 'Chưa cung cấp'}
              </p>
              <p>
                Kinh nghiệm: <span className="font-medium">{doctor?.experience || 0} năm</span>
              </p>
              <p>
                <span className="font-medium">Phí khám:</span>{' '}
                {formatCurrency(doctor?.fees)}
              </p>
              <p>
                <span className="font-medium">Giới thiệu:</span>{' '}
                {doctor?.about?.length > 200
                  ? `${doctor.about.slice(0, 200)}...`
                  : doctor?.about || 'N/A'}
              </p>
              <div className="flex items-center gap-1">
                <span className="font-medium">Đánh giá:</span>{' '}
                {Array.from({ length: 5 }, (_, i) => (
                  <i
                    key={i}
                    className={`fa-star ${i < Math.round(doctor?.averageRating || 0) ? 'fa-solid text-yellow-400' : 'fa-regular text-gray-300'}`}
                  ></i>
                ))}
                <span className="ml-1">
                  ({doctor?.averageRating?.toFixed(1) || 'N/A'}) ({doctor?.totalReviews || 0} đánh giá)
                </span>
              </div>
            </div>
          </div>
          <div className="md:w-1/2 bg-white p-6 rounded-md shadow-lg">
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700">Chọn ngày</label>
                <input
                  type="date"
                  name="appointmentDate"
                  value={appointmentData.appointmentDate}
                  onChange={handleInputChange}
                  className="w-full px-2 py-2 border rounded-md focus:outline-none focus:ring-blue-500"
                  min={moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD')}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700">Chọn thời gian</label>
                <select
                  name="timeslot"
                  value={appointmentData.timeslot}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-blue-500"
                  required
                  disabled={!appointmentData.appointmentDate || !token || availableSlots.length === 0}
                >
                  <option value="">
                    {availableSlots.length === 0
                      ? appointmentData.appointmentDate
                        ? error || 'Không có khung giờ trống'
                        : 'Chọn ngày trước'
                      : 'Chọn thời gian'}
                  </option>
                  {availableSlots.map((slot, index) => (
                    <option key={index} value={slot.time}>
                      {slot.time}
                    </option>
                  ))}
                </select>
                {error && (
                  <p className="text-red-500 text-sm mt-1">
                    {error === 'Bác sĩ không làm việc vào ngày này'
                      ? 'Bác sĩ không có lịch làm việc vào ngày này. Vui lòng chọn ngày khác.'
                      : error}
                  </p>
                )}
              </div>
              <div className="mb-4">
                <label className="block text-gray-700">Ghi chú (tùy chọn)</label>
                <textarea
                  name="notes"
                  value={appointmentData.notes}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-blue-500"
                  rows="4"
                  placeholder="Ghi chú nếu cần..."
                />
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300"
                disabled={
                  isSubmitting ||
                  !appointmentData.appointmentDate ||
                  !appointmentData.timeslot ||
                  !token
                }
              >
                {isSubmitting ? 'Đang xử lý...' : 'Đặt lịch'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Appointment;