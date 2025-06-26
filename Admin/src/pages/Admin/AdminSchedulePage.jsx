import React, { useState, useEffect, useContext } from 'react';
import { Search, X, Plus, Edit, Trash2, Eye, Calendar } from 'lucide-react';
import { AppContext } from '../../context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import moment from 'moment-timezone';
import 'moment/locale/vi';

moment.locale('vi');

const AdminSchedulePage = () => {
    const [schedules, setSchedules] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedSchedule, setSelectedSchedule] = useState(null);
    const [filterWeek, setFilterWeek] = useState('');

    const { aToken, backEndUrl } = useContext(AppContext);

    const initializeAvailability = (weekStart) => {
        const daysMap = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
        return daysMap.map((day, index) => ({
            day,
            date: moment.tz(weekStart, 'Asia/Ho_Chi_Minh').startOf('week').add(index, 'days').toDate(),
            timeSlots: [],
            inputValue: '',
            isAvailable: true,
        }));
    };

    const [formData, setFormData] = useState({
        doctorId: '',
        weekStartDate: moment().tz('Asia/Ho_Chi_Minh').startOf('week').format('YYYY-MM-DD'),
        availability: initializeAvailability(moment().tz('Asia/Ho_Chi_Minh').startOf('week')),
    });

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const schedulesUrl = filterWeek
                    ? `${backEndUrl}/admin/schedules?weekStartDate=${filterWeek}`
                    : `${backEndUrl}/admin/schedules`;
                console.log('[AdminSchedulePage] Fetching schedules with URL:', schedulesUrl);
                const [schedulesRes, doctorsRes] = await Promise.all([
                    axios.get(schedulesUrl, {
                        headers: { Authorization: `Bearer ${aToken}` },
                    }),
                    axios.get(`${backEndUrl}/admin/doctor`, {
                        headers: { Authorization: `Bearer ${aToken}` },
                    }),
                ]);
                setSchedules(Array.isArray(schedulesRes.data.data) ? schedulesRes.data.data : []);
                setDoctors(Array.isArray(doctorsRes.data.data) ? doctorsRes.data.data : []);
                console.log('[AdminSchedulePage] Fetched schedules:', schedulesRes.data.data);
            } catch (error) {
                console.error('[AdminSchedulePage] Error fetching data:', error);
                toast.error(error.response?.data?.message || 'Không thể tải dữ liệu.');
                setDoctors([]);
                setSchedules([]);
            } finally {
                setIsLoading(false);
            }
        };
        if (aToken && backEndUrl) fetchData();
    }, [aToken, backEndUrl, filterWeek]);

    const parseTimeSlot = (time) => {
        const [start, end] = time.split('-').map(t => {
            const [hour, minute] = t.split(':').map(Number);
            return hour * 60 + minute;
        });
        return { start, end };
    };

    const hasTimeSlotOverlap = (timeSlots, newSlot) => {
        if (!newSlot.match(/^\d{2}:\d{2}-\d{2}:\d{2}$/)) return true;
        const { start: newStart, end: newEnd } = parseTimeSlot(newSlot);
        return timeSlots.some(slot => {
            const { start, end } = parseTimeSlot(slot.time);
            return (newStart < end && newEnd > start);
        });
    };

    const handleTimeSlotInputChange = (day, value) => {
        const updatedAvailability = formData.availability.map(item =>
            item.day === day ? { ...item, inputValue: value } : item
        );
        setFormData({ ...formData, availability: updatedAvailability });
    };

    const handleAvailabilityToggle = (day) => {
        const updatedAvailability = formData.availability.map(item =>
            item.day === day
                ? {
                    ...item,
                    isAvailable: !item.isAvailable,
                    timeSlots: item.isAvailable ? item.timeSlots.filter(slot => slot.isBooked) : item.timeSlots,
                    inputValue: item.isAvailable ? item.inputValue : '',
                }
                : item
        );
        setFormData({ ...formData, availability: updatedAvailability });
    };

    const processTimeSlots = (day, inputValue) => {
        const dayData = formData.availability.find(item => item.day === day);
        const existingSlots = dayData.timeSlots;
        const bookedSlots = existingSlots.filter(slot => slot.isBooked);
        const bookedTimes = bookedSlots.map(slot => slot.time);
        const newSlots = inputValue
            .split(',')
            .map(slot => slot.trim())
            .filter(slot => slot && /^\d{2}:\d{2}-\d{2}:\d{2}$/.test(slot) && !bookedTimes.includes(slot) && !hasTimeSlotOverlap(existingSlots, slot))
            .map(slot => ({
                time: slot,
                isBooked: false,
                isAvailable: true,
                patientId: null,
            }));
        const mergedSlots = [...bookedSlots, ...newSlots];
        const updatedAvailability = formData.availability.map(item =>
            item.day === day ? { ...item, timeSlots: mergedSlots, inputValue: newSlots.map(slot => slot.time).join(', ') } : item
        );
        setFormData({ ...formData, availability: updatedAvailability });
    };

    const handleDoctorChange = e => {
        setFormData({ ...formData, doctorId: e.target.value });
    };

    const handleWeekChange = (e) => {
        const value = e.target.value;
        setFilterWeek(value);
        if (value) {
            const weekStart = moment.tz(value, 'Asia/Ho_Chi_Minh').startOf('week');
            const updatedAvailability = initializeAvailability(weekStart);
            setFormData({ ...formData, weekStartDate: value, availability: updatedAvailability });
        } else {
            setFormData({
                ...formData,
                weekStartDate: moment().tz('Asia/Ho_Chi_Minh').startOf('week').format('YYYY-MM-DD'),
                availability: initializeAvailability(moment().tz('Asia/Ho_Chi_Minh').startOf('week')),
            });
        }
    };

    const resetForm = () => {
        setFormData({
            doctorId: '',
            weekStartDate: moment().tz('Asia/Ho_Chi_Minh').startOf('week').format('YYYY-MM-DD'),
            availability: initializeAvailability(moment().tz('Asia/Ho_Chi_Minh').startOf('week')),
        });
    };

    const validateForm = () => {
        if (!formData.doctorId) return 'Bác sĩ là bắt buộc.';
        if (!formData.weekStartDate) return 'Ngày bắt đầu tuần là bắt buộc.';
        for (const item of formData.availability) {
            if (item.isAvailable) {
                for (const slot of item.timeSlots) {
                    if (!slot.time || !/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(slot.time)) {
                        return `Khung giờ không hợp lệ cho ${item.day} (VD: 09:00-10:00).`;
                    }
                }
            }
            const expectedDay = moment.tz(item.date, 'Asia/Ho_Chi_Minh').format('dddd');
            const daysMap = {
                'Monday': 'Thứ 2',
                'Tuesday': 'Thứ 3',
                'Wednesday': 'Thứ 4',
                'Thursday': 'Thứ 5',
                'Friday': 'Thứ 6',
                'Saturday': 'Thứ 7',
                'Sunday': 'Chủ nhật',
            };
            if (daysMap[expectedDay] !== item.day) {
                return `Ngày ${item.day} không khớp với ngày thực tế ${moment(item.date).format('DD/MM/YYYY')}`;
            }
        }
        return null;
    };

    const handleCreate = async e => {
        e.preventDefault();
        setIsLoading(true);
        const validationError = validateForm();
        if (validationError) {
            toast.error(validationError);
            setIsLoading(false);
            return;
        }
        try {
            const weekStart = moment.tz(formData.weekStartDate, 'Asia/Ho_Chi_Minh').startOf('week');
            const payload = {
                doctorId: formData.doctorId,
                weekStartDate: weekStart.toDate(),
                availability: formData.availability.map((item, index) => ({
                    day: item.day,
                    date: moment.tz(weekStart, 'Asia/Ho_Chi_Minh').add(index, 'days').startOf('day').toDate(),
                    isAvailable: item.isAvailable,
                    timeSlots: item.isAvailable ? item.timeSlots : [],
                })),
            };
            const response = await axios.post(`${backEndUrl}/admin/schedules`, payload, {
                headers: { Authorization: `Bearer ${aToken}` },
            });
            setSchedules([...schedules, response.data.schedule]);
            toast.success('Lịch làm việc đã được tạo.');
            setShowAddModal(false);
            resetForm();
        } catch (error) {
            console.error('[AdminSchedulePage] Error creating schedule:', error);
            toast.error(error.response?.data?.message || 'Không thể tạo lịch.');
        } finally {
            setIsLoading(false);
        }
    };

    const openEditModal = schedule => {
        const weekStart = moment.tz(schedule.weekStartDate, 'Asia/Ho_Chi_Minh').startOf('week');
        setFormData({
            doctorId: schedule.doctorId._id,
            weekStartDate: weekStart.format('YYYY-MM-DD'),
            availability: schedule.availability.map((item, index) => ({
                day: item.day,
                date: moment.tz(weekStart, 'Asia/Ho_Chi_Minh').add(index, 'days').startOf('day').toDate(),
                timeSlots: item.timeSlots.map(slot => ({
                    time: slot.time,
                    isBooked: slot.isBooked,
                    isAvailable: slot.isAvailable,
                    patientId: slot.patientId || null,
                })),
                inputValue: item.timeSlots
                    .filter(slot => !slot.isBooked)
                    .map(slot => slot.time)
                    .join(', '),
                isAvailable: item.isAvailable,
            })),
        });
        setSelectedSchedule(schedule);
        setShowEditModal(true);
    };

    const handleUpdate = async e => {
        e.preventDefault();
        setIsLoading(true);
        const validationError = validateForm();
        if (validationError) {
            toast.error(validationError);
            setIsLoading(false);
            return;
        }
        try {
            const weekStart = moment.tz(formData.weekStartDate, 'Asia/Ho_Chi_Minh').startOf('week');
            const payload = {
                weekStartDate: weekStart.toDate(),
                availability: formData.availability.map((item, index) => ({
                    day: item.day,
                    date: moment.tz(weekStart, 'Asia/Ho_Chi_Minh').add(index, 'days').startOf('day').toDate(),
                    isAvailable: item.isAvailable,
                    timeSlots: item.isAvailable
                        ? item.timeSlots.map(slot => ({
                            time: slot.time,
                            isBooked: slot.isBooked,
                            isAvailable: slot.isAvailable,
                            patientId: slot.patientId,
                        }))
                        : [],
                })),
            };
            console.log('[handleUpdate] Payload:', JSON.stringify(payload, null, 2));
            const response = await axios.put(
                `${backEndUrl}/admin/schedules/${selectedSchedule._id}`,
                payload,
                { headers: { Authorization: `Bearer ${aToken}` } }
            );
            setSchedules(schedules.map(s => (s._id === selectedSchedule._id ? response.data.schedule : s)));
            toast.success('Lịch làm việc đã được cập nhật.');
            setShowEditModal(false);
            setSelectedSchedule(null);
            resetForm();
        } catch (error) {
            console.error('[AdminSchedulePage] Error updating schedule:', error);
            const errorMessage = error.response?.data?.message || 'Không thể cập nhật lịch.';
            const conflicts = error.response?.data?.conflicts;
            if (conflicts) {
                const conflictDetails = conflicts.map(c => `${c.day} (${moment(c.date).format('DD/MM/YYYY')}): ${c.appointments.map(a => a.timeslot).join(', ')}`).join('; ');
                toast.error(`${errorMessage}: ${conflictDetails}`);
            } else {
                toast.error(errorMessage);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const confirmDelete = schedule => {
        setSelectedSchedule(schedule);
        setShowDeleteModal(true);
    };

    const handleDelete = async () => {
        setIsLoading(true);
        try {
            await axios.delete(`${backEndUrl}/admin/schedules/${selectedSchedule._id}`, {
                headers: { Authorization: `Bearer ${aToken}` },
            });
            setSchedules(schedules.filter(s => s._id !== selectedSchedule._id));
            toast.success('Lịch đã được xóa.');
            setShowDeleteModal(false);
            setSelectedSchedule(null);
        } catch (error) {
            console.error('[AdminSchedulePage] Error deleting schedule:', error);
            toast.error(error.response?.data?.message || 'Không thể xóa lịch.');
        } finally {
            setIsLoading(false);
        }
    };

    const openViewModal = schedule => {
        setSelectedSchedule(schedule);
        setShowViewModal(true);
    };

    const getAvailableDays = availability => {
        return availability
            .filter(item => item.isAvailable && item.timeSlots.length > 0)
            .map(item => item.day)
            .join(', ');
    };

    const filteredSchedules = schedules.filter(schedule =>
        schedule.doctorId.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        schedule.doctorId.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading && schedules.length === 0) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
                        <Calendar size={24} /> Quản lý lịch làm việc
                    </h1>
                    <button
                        onClick={() => {
                            resetForm();
                            setShowAddModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm text-sm font-medium"
                    >
                        <Plus size={18} /> Thêm lịch mới
                    </button>
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700">Lọc theo tuần</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={filterWeek}
                            onChange={handleWeekChange}
                            className="mt-1 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                        />
                        {filterWeek && (
                            <button
                                onClick={() => handleWeekChange({ target: { value: '' } })}
                                className="mt-1 px-2 py-1 text-sm text-gray-600 hover:text-gray-800"
                                title="Xóa bộ lọc"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm bác sĩ..."
                        className="pl-10 pr-10 py-2 w-full border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={() => setSearchTerm('')}
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>

                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Bác sĩ</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Email</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Tuần</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Ngày làm việc</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredSchedules.length > 0 ? (
                                filteredSchedules.map(schedule => (
                                    <tr key={schedule._id} className="hover:bg-gray-50 transition">
                                        <td className="px-4 py-2 text-sm text-gray-800">{schedule.doctorId.name}</td>
                                        <td className="px-4 py-2 text-sm text-gray-600">{schedule.doctorId.email}</td>
                                        <td className="px-4 py-2 text-sm text-gray-600">
                                            Tuần {schedule.weekNumber}/{schedule.year}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-600">
                                            {getAvailableDays(schedule.availability) || (
                                                <span className="text-gray-400 italic">Không có ngày làm việc</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => openViewModal(schedule)}
                                                    className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition"
                                                    title="Xem chi tiết"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button
                                                    onClick={() => openEditModal(schedule)}
                                                    className="text-blue-600 hover:text-blue-700 p-1 rounded hover:bg-blue-50 transition"
                                                    title="Chỉnh sửa"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => confirmDelete(schedule)}
                                                    className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition"
                                                    title="Xóa"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-4 py-4 text-center text-gray-500 text-sm">
                                        Không có lịch làm việc nào.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {showAddModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-2xl">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <Plus size={20} /> Thêm lịch làm việc
                            </h3>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Bác sĩ</label>
                                    <select
                                        name="doctorId"
                                        value={formData.doctorId}
                                        onChange={handleDoctorChange}
                                        className="mt-1 w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                                        required
                                    >
                                        <option value="">-- Chọn bác sĩ --</option>
                                        {Array.isArray(doctors) && doctors.length > 0 ? (
                                            doctors.map(doctor => (
                                                <option key={doctor._id} value={doctor._id}>{doctor.name}</option>
                                            ))
                                        ) : (
                                            <option value="" disabled>Không có bác sĩ</option>
                                        )}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Tuần bắt đầu</label>
                                    <input
                                        type="date"
                                        value={formData.weekStartDate}
                                        onChange={handleWeekChange}
                                        className="mt-1 w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Khung giờ làm việc</label>
                                    <p className="text-xs text-gray-500 mt-0.5 mb-2">Nhập định dạng 09:00-10:00, cách nhau bằng dấu phẩy</p>
                                    <div className="max-h-64 overflow-y-auto pr-2">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {formData.availability.map((item, index) => (
                                                <div key={index} className="mb-2">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <label className="block text-xs font-medium text-gray-600">
                                                            {item.day} ({item.date ? moment(item.date).format('DD/MM/YYYY') : 'Chưa chọn'})
                                                        </label>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleAvailabilityToggle(item.day)}
                                                            className={`px-2 py-1 text-xs rounded ${item.isAvailable ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
                                                            disabled={item.timeSlots.some(slot => slot.isBooked)}
                                                            title={item.timeSlots.some(slot => slot.isBooked) ? 'Không thể thay đổi vì có khung giờ đã đặt' : ''}
                                                        >
                                                            {item.isAvailable ? 'Làm việc' : 'Nghỉ'}
                                                        </button>
                                                    </div>
                                                    {item.isAvailable && (
                                                        <>
                                                            <input
                                                                type="text"
                                                                value={item.inputValue}
                                                                onChange={e => handleTimeSlotInputChange(item.day, e.target.value)}
                                                                onBlur={() => processTimeSlots(item.day, item.inputValue)}
                                                                placeholder="VD: 09:00-10:00, 14:00-15:00"
                                                                className="mt-1 w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                                                            />
                                                            {item.timeSlots.some(slot => slot.isBooked) && (
                                                                <p className="text-xs text-red-500 mt-0.5">
                                                                    Khung giờ đã đặt (không thể sửa): {item.timeSlots.filter(slot => slot.isBooked).map(slot => slot.time).join(', ')}
                                                                </p>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm shadow-sm"
                                    >
                                        Hủy bỏ
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm shadow-sm"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? 'Đang tạo...' : 'Tạo lịch'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showEditModal && selectedSchedule && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-2xl">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <Edit size={20} /> Cập nhật lịch làm việc
                            </h3>
                            <form onSubmit={handleUpdate} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Bác sĩ</label>
                                    <input
                                        type="text"
                                        value={doctors.find(d => d._id === formData.doctorId)?.name || ''}
                                        disabled
                                        className="mt-1 w-full p-2 border border-gray-200 rounded-lg bg-gray-50 text-sm shadow-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Tuần bắt đầu</label>
                                    <input
                                        type="date"
                                        value={formData.weekStartDate}
                                        onChange={handleWeekChange}
                                        className="mt-1 w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Khung giờ làm việc</label>
                                    <p className="text-xs text-gray-500 mt-0.5 mb-2">Nhập định dạng 09:00-10:00, cách nhau bằng dấu phẩy (khung giờ đã đặt không thể sửa)</p>
                                    <div className="max-h-64 overflow-y-auto pr-2">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {formData.availability.map((item, index) => (
                                                <div key={index} className="mb-2">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <label className="block text-xs font-medium text-gray-600">
                                                            {item.day} ({item.date ? moment(item.date).format('DD/MM/YYYY') : 'Chưa chọn'})
                                                        </label>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleAvailabilityToggle(item.day)}
                                                            className={`px-2 py-1 text-xs rounded ${item.isAvailable ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
                                                            disabled={item.timeSlots.some(slot => slot.isBooked)}
                                                            title={item.timeSlots.some(slot => slot.isBooked) ? 'Không thể thay đổi vì có khung giờ đã đặt' : ''}
                                                        >
                                                            {item.isAvailable ? 'Làm việc' : 'Nghỉ'}
                                                        </button>
                                                    </div>
                                                    {item.isAvailable && (
                                                        <>
                                                            <input
                                                                type="text"
                                                                value={item.inputValue}
                                                                onChange={e => handleTimeSlotInputChange(item.day, e.target.value)}
                                                                onBlur={() => processTimeSlots(item.day, item.inputValue)}
                                                                placeholder="VD: 09:00-10:00, 14:00-15:00"
                                                                className="mt-1 w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                                                            />
                                                            {item.timeSlots.some(slot => slot.isBooked) && (
                                                                <p className="text-xs text-red-500 mt-0.5">
                                                                    Khung giờ đã đặt (không thể sửa): {item.timeSlots.filter(slot => slot.isBooked).map(slot => slot.time).join(', ')}
                                                                </p>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowEditModal(false);
                                            setSelectedSchedule(null);
                                        }}
                                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm shadow-sm"
                                    >
                                        Hủy bỏ
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm shadow-sm"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? 'Đang cập nhật...' : 'Cập nhật lịch'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showDeleteModal && selectedSchedule && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Xác nhận xóa lịch</h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Bạn có chắc chắn muốn xóa lịch làm việc của bác sĩ{' '}
                                <span className="font-medium">{selectedSchedule.doctorId.name}</span> trong tuần{' '}
                                {selectedSchedule.weekNumber}/{selectedSchedule.year}?
                            </p>
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm shadow-sm"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm shadow-sm"
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Đang xóa...' : 'Xóa'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {showViewModal && selectedSchedule && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-2xl">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <Eye size={20} /> Chi tiết lịch làm việc
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Bác sĩ</label>
                                    <p className="mt-1 text-sm text-gray-600">{selectedSchedule.doctorId.name}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Email</label>
                                    <p className="mt-1 text-sm text-gray-600">{selectedSchedule.doctorId.email}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Tuần</label>
                                    <p className="mt-1 text-sm text-gray-600">
                                        Tuần {selectedSchedule.weekNumber}/{selectedSchedule.year}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Lịch làm việc</label>
                                    <div className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-64 overflow-y-auto pr-2">
                                        {selectedSchedule.availability.map((item, index) => (
                                            <div key={index} className="mb-2">
                                                <p className="text-xs font-medium text-gray-600">
                                                    {item.day} ({moment(item.date).format('DD/MM/YYYY')})
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {item.isAvailable ? (
                                                        item.timeSlots.length > 0 ? (
                                                            item.timeSlots.map((slot, idx) => (
                                                                <span key={idx} className="inline-block mr-2">
                                                                    {slot.time} {slot.isBooked ? '(Đã đặt)' : ''}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-gray-400">Không có khung giờ</span>
                                                        )
                                                    ) : (
                                                        <span className="text-red-500">Nghỉ</span>
                                                    )}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end mt-6">
                                <button
                                    onClick={() => setShowViewModal(false)}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm shadow-sm"
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminSchedulePage;