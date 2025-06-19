
import React, { useState, useEffect, useContext } from 'react';
import { Calendar, CheckCircle, XCircle } from 'lucide-react';
import { DoctorContext } from '../../context/DoctorContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import moment from 'moment-timezone';
import 'moment/locale/vi';

moment.locale('vi');

const DoctorSchedulePage = () => {
    const [schedule, setSchedule] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [filterWeek, setFilterWeek] = useState(moment().tz('Asia/Ho_Chi_Minh').startOf('week').format('YYYY-MM-DD'));
    const { dToken, backendUrl, logout } = useContext(DoctorContext);
    const navigate = useNavigate();

    useEffect(() => {
        if (!dToken) {
            console.log('No dToken found, redirecting to login');
            setIsLoading(false);
            toast.error('Vui lòng đăng nhập để tiếp tục.');
            navigate('/doctor/login');
            return;
        }

        const fetchSchedule = async () => {
            setIsLoading(true);
            try {
                console.log('Fetching schedule for week:', filterWeek);
                const response = await axios.get(`${backendUrl}/doctor/my-schedule`, {
                    headers: { Authorization: `Bearer ${dToken}` },
                    params: { weekStartDate: filterWeek },
                });
                if (response.data.success) {
                    setSchedule(response.data.data || null);
                } else {
                    throw new Error(response.data.message || 'Không thể tải lịch làm việc.');
                }
            } catch (error) {
                console.error('Error fetching schedule:', error);
                if (error.response?.status === 401 || error.response?.status === 403) {
                    toast.error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
                    logout();
                    navigate('/doctor/login');
                } else {
                    toast.error(error.response?.data?.message || 'Không thể tải lịch làm việc.');
                    setSchedule(null);
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchSchedule();
    }, [dToken, backendUrl, logout, navigate, filterWeek]);

    const handleWeekChange = (e) => {
        const selectedDate = moment(e.target.value).tz('Asia/Ho_Chi_Minh').startOf('week').format('YYYY-MM-DD');
        setFilterWeek(selectedDate);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-100">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-teal-600"></div>
            </div>
        );
    }

    return (
        <div className="flex justify-center items-start min-h-screen bg-gray-100 py-8">
            <div className="w-full max-w-3xl mx-4">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-3">
                        <Calendar size={28} className="text-teal-600" />
                        Lịch làm việc cá nhân
                    </h1>

                </div>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Chọn tuần</label>
                    <input
                        type="date"
                        value={filterWeek}
                        onChange={handleWeekChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm shadow-sm transition-all duration-200"
                    />
                </div>

                {!schedule ? (
                    <div className="text-center p-6 bg-white rounded-xl shadow-lg">
                        <p className="text-gray-600 text-lg font-medium">
                            Không có lịch làm việc nào cho tuần này.
                        </p>
                        <p className="text-gray-500 text-sm mt-2">
                            Vui lòng liên hệ quản trị viên hoặc chọn tuần khác.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {schedule.availability.map((item, index) => (
                            <div
                                key={index}
                                className="p-5 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                            >
                                <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                    <span>{item.day} ({moment(item.date).format('DD/MM/YYYY')})</span>
                                    {item.isAvailable ? (
                                        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                            Làm việc ({item.timeSlots.length} khung giờ)
                                        </span>
                                    ) : (
                                        <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
                                            Nghỉ
                                        </span>
                                    )}
                                </h4>
                                {item.isAvailable && item.timeSlots.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {item.timeSlots.map(slot => (
                                            <div
                                                key={slot._id}
                                                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${slot.isBooked
                                                    ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                                    : slot.isAvailable
                                                        ? 'bg-teal-100 text-teal-600 hover:bg-teal-200'
                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {slot.isBooked ? (
                                                    <XCircle size={14} className="text-red-500" />
                                                ) : slot.isAvailable ? (
                                                    <CheckCircle size={14} className="text-teal-500" />
                                                ) : (
                                                    <XCircle size={14} className="text-gray-500" />
                                                )}
                                                <span>{slot.time}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 italic">
                                        {item.isAvailable ? 'Không có khung giờ làm việc' : 'Ngày nghỉ'}
                                    </p>
                                )}
                            </div>
                        ))}
                        <div className="flex justify-end mt-6">

                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DoctorSchedulePage;