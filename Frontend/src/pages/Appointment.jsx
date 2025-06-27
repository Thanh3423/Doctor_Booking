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
  const { doctor, getDoctorData, backEndUrl, token, userData, loadUserProfileData } = useContext(AppContext);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [appointmentData, setAppointmentData] = useState({
    appointmentDate: '',
    timeslot: '',
    notes: '',
  });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [error, setError] = useState(null);

  // Fetch doctor data
  useEffect(() => {
    const fetchDoctor = async () => {
      try {
        setIsLoading(true);
        const cleanDocId = docId?.trim();
        console.log('[Appointment] ID bác sĩ đã làm sạch:', cleanDocId);
        if (!cleanDocId || !cleanDocId.match(/^[0-9a-fA-F]{24}$/)) {
          throw new Error('ID bác sĩ không hợp lệ');
        }
        const doctorData = await getDoctorData(cleanDocId);
        console.log('[Appointment] Dữ liệu bác sĩ đã lấy:', doctorData);
        if (!doctorData) {
          throw new Error('Không tìm thấy bác sĩ');
        }
        setIsLoading(false);
      } catch (err) {
        console.error('[Appointment] Lỗi khi lấy dữ liệu bác sĩ:', {
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

  // Log doctor state changes
  useEffect(() => {
    console.log('[Appointment] Trạng thái bác sĩ hiện tại:', doctor);
  }, [doctor]);

  // Fetch available slots
  useEffect(() => {
    const fetchAvailableSlots = async () => {
      if (!appointmentData.appointmentDate) {
        setAvailableSlots([]);
        setError(null);
        console.log('[Appointment] Không có ngày được chọn, bỏ qua lấy khung giờ');
        return;
      }
      if (!token || !userData) {
        setAvailableSlots([]);
        setError('Vui lòng đăng nhập để xem khung giờ trống');
        console.log('[Appointment] Thiếu token hoặc userData:', {
          token: token ? '[PRESENT]' : '[MISSING]',
          userData: userData ? '[PRESENT]' : '[MISSING]'
        });
        return;
      }
      try {
        setError(null);
        setAvailableSlots([]);
        const formattedDate = moment(appointmentData.appointmentDate)
          .tz('Asia/Ho_Chi_Minh')
          .format('YYYY-MM-DD');
        if (!moment(formattedDate, 'YYYY-MM-DD', true).isValid()) {
          console.warn('[Appointment] Định dạng ngày không hợp lệ:', formattedDate);
          setError('Định dạng ngày không hợp lệ');
          return;
        }
        console.log('[Appointment] Lấy khung giờ cho ngày:', formattedDate, 'doctorId:', docId);
        console.log('[Appointment] URL yêu cầu:', `${backEndUrl}/patient/doctor/schedule/${docId}?date=${formattedDate}`);
        console.log('[Appointment] Token gửi:', token ? '[PRESENT]' : '[MISSING]');
        console.log('[Appointment] UserData:', userData ? { id: userData._id, email: userData.email } : '[MISSING]');
        const { data } = await axios.get(
          `${backEndUrl}/patient/doctor/schedule/${docId}?date=${formattedDate}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          }
        );
        console.log('[Appointment] Phản hồi API lịch:', data);
        if (data.success && Array.isArray(data.data)) {
          setAvailableSlots(data.data);
          setError(null);
        } else {
          setAvailableSlots([]);
          setError(data.message || 'Không có khung giờ trống cho ngày này');
        }
      } catch (err) {
        console.error('[Appointment] Lỗi khi lấy khung giờ:', {
          error: err.message,
          response: err.response?.data,
          status: err.response?.status,
        });
        const message = err.response?.data?.message || 'Không thể tải khung giờ trống';
        setAvailableSlots([]);
        setError(message);
        if (err.response?.status === 401) {
          toast.error('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
          navigate('/login');
        } else if (err.response?.status === 404) {
          toast.warn(message);
        } else {
          toast.error(message);
        }
      }
    };
    if (doctor && appointmentData.appointmentDate) {
      console.log('[Appointment] Kích hoạt fetchAvailableSlots với:', {
        hasDoctor: !!doctor,
        appointmentDate: appointmentData.appointmentDate
      });
      fetchAvailableSlots();
    }
  }, [appointmentData.appointmentDate, docId, backEndUrl, doctor, token, userData, navigate]);

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
    if (!token || !userData) {
      console.log('[Appointment] Thiếu token hoặc userData, chuyển hướng đến đăng nhập');
      toast.error('Vui lòng đăng nhập để đặt lịch hẹn');
      navigate('/login');
      return;
    }

    // Validate token
    try {
      console.log('[Appointment] Xác thực token trước khi đặt lịch');
      await loadUserProfileData(true); // Force reload to validate token
    } catch (err) {
      console.error('[Appointment] Xác thực token thất bại:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      toast.error('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
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
        notes: appointmentData.notes.trim() || undefined,
      };
      console.log('[Appointment] Gửi yêu cầu đặt lịch:', payload);
      const response = await axios.post(
        `${backEndUrl}/patient/book-appointment`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );
      console.log('[Appointment] Phản hồi đặt lịch:', response.data);
      if (response.data.success) {
        toast.success('Đặt lịch hẹn thành công!');
        navigate('/my-appointments');
      } else {
        toast.error(response.data.message || 'Lỗi khi đặt lịch hẹn');
      }
    } catch (err) {
      console.error('[Appointment] Lỗi khi đặt lịch hẹn:', {
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
      } else {
        setAppointmentData((prev) => ({ ...prev, timeslot: '' }));
        try {
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
          console.log('[Appointment] Làm mới khung giờ sau lỗi:', data);
          if (data.success && Array.isArray(data.data)) {
            setAvailableSlots(data.data);
            setError(null);
          } else {
            setAvailableSlots([]);
            setError(data.message || 'Không có khung giờ trống cho ngày này');
          }
        } catch (refreshErr) {
          console.error('[Appointment] Lỗi khi làm mới khung giờ:', refreshErr);
          setAvailableSlots([]);
          setError('Không thể làm mới khung giờ trống');
        }
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
              src={`${backEndUrl}${doctor?.image || '/fallback-doctor-image.jpg'}?t=${Date.now()}`}
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
                  disabled={!appointmentData.appointmentDate || availableSlots.length === 0}
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
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Đang xử lý...' : 'Đặt lịch'}
              </button>
              {!token && (
                <p className="text-gray-600 text-sm mt-2 text-center">
                  Bạn cần <a href="/login" className="text-blue-500 hover:underline">đăng nhập</a> để đặt lịch hẹn
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Appointment;