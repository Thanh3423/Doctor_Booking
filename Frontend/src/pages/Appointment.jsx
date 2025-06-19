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
    const fetchDoctor = async () => {
      try {
        setIsLoading(true);
        const doctorData = await getDoctorData(docId);
        console.log('Fetched doctor data:', doctorData);
        if (!doctorData) {
          setError('Không tìm thấy bác sĩ');
          toast.error('Không tìm thấy bác sĩ');
        }
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching doctor data:', err);
        setError('Không thể tải thông tin bác sĩ');
        toast.error('Không thể tải thông tin bác sĩ');
        setIsLoading(false);
      }
    };
    if (!docId.match(/^[0-9a-fA-F]{24}$/)) {
      setError('ID bác sĩ không hợp lệ');
      toast.error('ID bác sĩ không hợp lệ');
      setIsLoading(false);
    } else {
      fetchDoctor();
    }
  }, [docId, getDoctorData]);

  useEffect(() => {
    console.log('Current doctor state:', doctor);
  }, [doctor]);

  useEffect(() => {
    const fetchAvailableSlots = async () => {
      if (!appointmentData.appointmentDate || !token) return;
      try {
        setError(null);
        const formattedDate = moment(appointmentData.appointmentDate)
          .tz('Asia/Ho_Chi_Minh')
          .format('YYYY-MM-DD');
        const { data } = await axios.get(
          `${backEndUrl}/patient/doctor/schedule/${docId}?date=${formattedDate}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          }
        );
        if (data.success && Array.isArray(data.slots)) {
          setAvailableSlots(data.slots);
          setError(null);
        } else {
          setAvailableSlots([]);
          setError(data.message || 'Không có khung giờ trống cho ngày này');
        }
      } catch (err) {
        console.error('Error fetching time slots:', {
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
    try {
      setIsSubmitting(true);
      const formattedDate = moment(appointmentData.appointmentDate)
        .tz('Asia/Ho_Chi_Minh')
        .format('YYYY-MM-DD');
      const response = await axios.post(
        `${backEndUrl}/patient/book-appointment`,
        {
          doctorId: docId,
          appointmentDate: formattedDate,
          timeslot: appointmentData.timeslot,
          notes: appointmentData.notes,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );
      if (response.data.message === 'Đặt lịch hẹn thành công') {
        toast.success('Đặt lịch hẹn thành công!');
        navigate('/my-appointments');
      } else {
        toast.error(response.data.message || 'Lỗi khi đặt lịch hẹn');
      }
    } catch (err) {
      console.error('Error booking appointment:', err.response?.data);
      toast.error(err.response?.data?.message || 'Lỗi khi đặt lịch hẹn');
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
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
              src={`${backEndUrl}/images/uploads/doctors/${doctor?.image?.split('/').pop() || 'fallback-doctor-image.jpg'}`}
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
                {doctor?.specialty?.name || 'Chưa xác định'}
              </p>
              <p>
                <span className="font-medium">Email:</span>{' '}
                {doctor?.email || 'Chưa cung cấp'}
              </p>
              <p>
                <span className="font-medium">Số điện thoại:</span>{' '}
                {doctor?.phone || 'Chưa cung cấp'}
              </p>
              <p>
                <span className="font-medium">Địa điểm:</span>{' '}
                {doctor?.location || 'Chưa cung cấp'}
              </p>
              <p>
                <span className="font-medium">Kinh nghiệm:</span>{' '}
                {doctor?.experience || 0} năm
              </p>
              <p>
                <span className="font-medium">Phí khám:</span>{' '}
                {formatCurrency(doctor?.fees)}
              </p>
              <p>
                <span className="font-medium">Giới thiệu:</span>{' '}
                {doctor?.about?.length > 200
                  ? `${doctor.about.slice(0, 200)}...`
                  : doctor?.about || 'Chưa cung cấp'}
              </p>
              <div className="flex items-center gap-1">
                <span className="font-medium">Đánh giá:</span>{' '}
                {Array.from({ length: 5 }, (_, i) => (
                  <i
                    key={i}
                    className={`fa-star ${i < Math.round(doctor?.averageRating || 0) ? 'fa-solid text-yellow-500' : 'fa-regular text-gray-300'}`}
                  />
                ))}
                <span className="ml-1">
                  ({doctor?.averageRating?.toFixed(1) || 0}/5, {doctor?.totalReviews || 0} đánh giá)
                </span>
              </div>
            </div>
          </div>
          <div className="md:w-1/2 bg-white p-6 rounded-xl shadow-lg">
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-1">Chọn ngày</label>
                <input
                  type="date"
                  name="appointmentDate"
                  value={appointmentData.appointmentDate}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  min={moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD')}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-1">Chọn khung giờ</label>
                <select
                  name="timeslot"
                  value={appointmentData.timeslot}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  required
                  disabled={!appointmentData.appointmentDate || !token || availableSlots.length === 0}
                >
                  <option value="">
                    {availableSlots.length === 0
                      ? appointmentData.appointmentDate
                        ? 'Không có khung giờ trống'
                        : 'Vui lòng chọn ngày trước'
                      : 'Chọn khung giờ'}
                  </option>
                  {availableSlots.map((slot, index) => (
                    <option key={index} value={slot.time}>
                      {slot.time}
                    </option>
                  ))}
                </select>
                {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-1">Ghi chú (tùy chọn)</label>
                <textarea
                  name="notes"
                  value={appointmentData.notes}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  rows="4"
                  placeholder="Nhập ghi chú nếu có..."
                />
              </div>
              <button
                type="submit"
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={
                  isSubmitting ||
                  !appointmentData.appointmentDate ||
                  !appointmentData.timeslot ||
                  !token
                }
              >
                {isSubmitting ? 'Đang xử lý...' : 'Xác nhận đặt lịch'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Appointment;