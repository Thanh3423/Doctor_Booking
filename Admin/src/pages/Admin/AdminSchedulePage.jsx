import React, { useState, useEffect, useContext } from 'react';
import { Search, X, Plus, Edit, Trash2, Eye, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { AdminContext } from '../../context/AdminContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import moment from 'moment-timezone';
import 'moment/locale/vi'; // Import Vietnamese locale

// Set moment to use Vietnamese locale
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
    const [filterWeek, setFilterWeek] = useState(moment().tz('Asia/Ho_Chi_Minh').startOf('week').format('YYYY-MM-DD'));
    const [filterMonth, setFilterMonth] = useState(moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM'));
    const { aToken, backendUrl } = useContext(AdminContext);

    const [formData, setFormData] = useState({
        doctorId: '',
        weekStartDate: moment().tz('Asia/Ho_Chi_Minh').startOf('week').format('YYYY-MM-DD'),
        availability: [
            { day: 'Thứ 2', date: '', timeSlots: [], inputValue: '', isAvailable: true },
            { day: 'Thứ 3', date: '', timeSlots: [], inputValue: '', isAvailable: true },
            { day: 'Thứ 4', date: '', timeSlots: [], inputValue: '', isAvailable: true },
            { day: 'Thứ 5', date: '', timeSlots: [], inputValue: '', isAvailable: true },
            { day: 'Thứ 6', date: '', timeSlots: [], inputValue: '', isAvailable: true },
            { day: 'Thứ 7', date: '', timeSlots: [], inputValue: '', isAvailable: true },
            { day: 'Chủ nhật', date: '', timeSlots: [], inputValue: '', isAvailable: true },
        ],
    });

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [schedulesRes, doctorsRes] = await Promise.all([
                    axios.get(`${backendUrl}/admin/schedules?month=${filterMonth}`, {
                        headers: { Authorization: `Bearer ${aToken}` },
                    }),
                    axios.get(`${backendUrl}/admin/doctor`, {
                        headers: { Authorization: `Bearer ${aToken}` },
                    }),
                ]);
                setSchedules(Array.isArray(schedulesRes.data.data) ? schedulesRes.data.data : []);
                setDoctors(Array.isArray(doctorsRes.data.data) ? doctorsRes.data.data : []);
            } catch (error) {
                console.error('Error fetching data:', error);
                toast.error(error.response?.data?.message || 'Không thể tải dữ liệu.');
                setDoctors([]);
                setSchedules([]);
            } finally {
                setIsLoading(false);
            }
        };
        if (aToken && backendUrl) fetchData();
    }, [aToken, backendUrl, filterMonth]);

    const handleTimeSlotInputChange = (day, value) => {
        const updatedAvailability = formData.availability.map(item =>
            item.day === day ? { ...item, inputValue: value } : item
        );
        setFormData({ ...formData, availability: updatedAvailability });
    };

    const handleAvailabilityToggle = (day) => {
        const updatedAvailability = formData.availability.map(item =>
            item.day === day ? { ...item, isAvailable: !item.isAvailable, timeSlots: [] } : item
        );
        setFormData({ ...formData, availability: updatedAvailability });
    };

    const processTimeSlots = (day, inputValue) => {
        const slots = inputValue
            .split(',')
            .map(slot => ({
                time: slot.trim(),
                isBooked: false,
                isAvailable: true,
                patientId: null,
            }))
            .filter(slot => slot.time && /^\d{2}:\d{2}-\d{2}:\d{2}$/.test(slot.time));
        const updatedAvailability = formData.availability.map(item =>
            item.day === day ? { ...item, timeSlots: slots, inputValue } : item
        );
        setFormData({ ...formData, availability: updatedAvailability });
    };

    const handleDoctorChange = e => {
        setFormData({ ...formData, doctorId: e.target.value });
    };

    const handleWeekChange = (e) => {
        const weekStart = moment(e.target.value).tz('Asia/Ho_Chi_Minh').startOf('week');
        const updatedAvailability = formData.availability.map((item, index) => {
            const date = moment(weekStart).add(index, 'days').toDate();
            return { ...item, date };
        });
        setFormData({ ...formData, weekStartDate: e.target.value, availability: updatedAvailability });
        setFilterWeek(e.target.value);
        setFilterMonth(moment(e.target.value).format('YYYY-MM'));
    };

    const handleMonthChange = (e) => {
        setFilterMonth(e.target.value);
        setFilterWeek(moment(e.target.value).startOf('month').startOf('week').format('YYYY-MM-DD'));
    };

    const resetForm = () => {
        setFormData({
            doctorId: '',
            weekStartDate: moment().tz('Asia/Ho_Chi_Minh').startOf('week').format('YYYY-MM-DD'),
            availability: [
                { day: 'Thứ 2', date: '', timeSlots: [], inputValue: '', isAvailable: true },
                { day: 'Thứ 3', date: '', timeSlots: [], inputValue: '', isAvailable: true },
                { day: 'Thứ 4', date: '', timeSlots: [], inputValue: '', isAvailable: true },
                { day: 'Thứ 5', date: '', timeSlots: [], inputValue: '', isAvailable: true },
                { day: 'Thứ 6', date: '', timeSlots: [], inputValue: '', isAvailable: true },
                { day: 'Thứ 7', date: '', timeSlots: [], inputValue: '', isAvailable: true },
                { day: 'Chủ nhật', date: '', timeSlots: [], inputValue: '', isAvailable: true },
            ],
        });
    };

    const validateForm = () => {
        if (!formData.doctorId) return 'Bác sĩ là bắt buộc.';
        if (!formData.weekStartDate) return 'Ngày bắt đầu tuần là bắt buộc.';
        for (const item of formData.availability) {
            if (item.isAvailable) {
                processTimeSlots(item.day, item.inputValue);
                for (const slot of item.timeSlots) {
                    if (!slot.time || !/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(slot.time)) {
                        return `Khung giờ không hợp lệ cho ${item.day} (VD: 09:00-10:00).`;
                    }
                }
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
            const weekStart = moment(formData.weekStartDate).tz('Asia/Ho_Chi_Minh').startOf('week');
            const payload = {
                doctorId: formData.doctorId,
                weekStartDate: weekStart.toDate(),
                weekNumber: weekStart.week(),
                year: weekStart.year(),
                availability: formData.availability.map((item, index) => ({
                    day: item.day,
                    date: moment(weekStart).add(index, 'days').toDate(),
                    isAvailable: item.isAvailable,
                    timeSlots: item.isAvailable ? item.timeSlots : [],
                })),
            };
            const response = await axios.post(`${backendUrl}/admin/schedules`, payload, {
                headers: { Authorization: `Bearer ${aToken}` },
            });
            setSchedules([...schedules, response.data.schedule]);
            toast.success('Lịch làm việc đã được tạo.');
            setShowAddModal(false);
            resetForm();
        } catch (error) {
            console.error('Error creating schedule:', error);
            toast.error(error.response?.data?.message || 'Không thể tạo lịch.');
        } finally {
            setIsLoading(false);
        }
    };

    const openEditModal = schedule => {
        const weekStart = moment(schedule.weekStartDate).tz('Asia/Ho_Chi_Minh').startOf('week');
        setFormData({
            doctorId: schedule.doctorId._id,
            weekStartDate: weekStart.format('YYYY-MM-DD'),
            availability: schedule.availability.map((item, index) => ({
                day: item.day,
                date: moment(weekStart).add(index, 'days').toDate(),
                timeSlots: item.timeSlots.map(slot => ({
                    time: slot.time,
                    isBooked: slot.isBooked,
                    isAvailable: slot.isAvailable,
                    patientId: slot.patientId || null,
                })),
                inputValue: item.timeSlots.map(slot => slot.time).join(', '),
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
            const weekStart = moment(formData.weekStartDate).tz('Asia/Ho_Chi_Minh').startOf('week');
            const payload = {
                weekStartDate: weekStart.toDate(),
                weekNumber: weekStart.week(),
                year: weekStart.year(),
                availability: formData.availability.map((item, index) => ({
                    day: item.day,
                    date: moment(weekStart).add(index, 'days').toDate(),
                    isAvailable: item.isAvailable,
                    timeSlots: item.isAvailable ? item.timeSlots : [],
                })),
            };
            const response = await axios.put(
                `${backendUrl}/admin/schedules/${selectedSchedule._id}`,
                payload,
                { headers: { Authorization: `Bearer ${aToken}` } }
            );
            setSchedules(schedules.map(s => (s._id === selectedSchedule._id ? response.data.schedule : s)));
            toast.success('Lịch làm việc đã được cập nhật.');
            setShowEditModal(false);
            setSelectedSchedule(null);
            resetForm();
        } catch (error) {
            console.error('Error updating schedule:', error);
            toast.error(error.response?.data?.message || 'Không thể cập nhật lịch.');
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
            await axios.delete(`${backendUrl}/admin/schedules/${selectedSchedule._id}`, {
                headers: { Authorization: `Bearer ${aToken}` },
            });
            setSchedules(schedules.filter(s => s._id !== selectedSchedule._id));
            toast.success('Lịch đã được xóa.');
            setShowDeleteModal(false);
            setSelectedSchedule(null);
        } catch (error) {
            console.error('Error deleting schedule:', error);
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

    // Format month display in Vietnamese
    const formatMonthDisplay = (month) => {
        return moment(month, 'YYYY-MM').format('MMMM YYYY').replace(/^\w/, c => c.toUpperCase());
    };

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

                <div className="flex gap-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Lọc theo tuần</label>
                        <input
                            type="date"
                            value={filterWeek}
                            onChange={handleWeekChange}
                            className="mt-1 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Lọc theo tháng</label>
                        <input
                            type="month"
                            value={filterMonth}
                            onChange={handleMonthChange}
                            className="mt-1 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                        />
                        {/* //<p className="text-xs text-gray-500 mt-1">{formatMonthDisplay(filterMonth)}</p> */}
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
                                                    className="text-teal-600 hover:text-teal-800 p-1 rounded hover:bg-teal-50 transition"
                                                    title="Xem chi tiết"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button
                                                    onClick={() => openEditModal(schedule)}
                                                    className="text-blue-500 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition"
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
                                                        >
                                                            {item.isAvailable ? 'Làm việc' : 'Nghỉ'}
                                                        </button>
                                                    </div>
                                                    {item.isAvailable && (
                                                        <input
                                                            type="text"
                                                            value={item.inputValue}
                                                            onChange={e => handleTimeSlotInputChange(item.day, e.target.value)}
                                                            onBlur={() => processTimeSlots(item.day, item.inputValue)}
                                                            placeholder="VD: 09:00-10:00, 14:00-15:00"
                                                            className="mt-1 w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                                                        />
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
                                                                <p className="text-xs text-red-500 mt-0.5">Có khung giờ đã được đặt.</p>
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
                                        {isLoading ? 'Đang cập nhật...' : 'Cập nhật'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showDeleteModal && selectedSchedule && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
                            <div className="flex items-center gap-2 mb-4">
                                <Trash2 className="h-5 w-5 text-red-600" />
                                <h3 className="text-lg font-semibold text-gray-800">Xác nhận xóa</h3>
                            </div>
                            <p className="text-sm text-gray-600 mb-6">
                                Bạn có chắc chắn muốn xóa lịch làm việc của bác sĩ{' '}
                                <span className="font-semibold">{selectedSchedule.doctorId.name}</span> tuần {selectedSchedule.weekNumber}/{selectedSchedule.year}? Hành động này không thể hoàn tác.
                            </p>
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => {
                                        setShowDeleteModal(false);
                                        setSelectedSchedule(null);
                                    }}
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
                        <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Eye className="h-5 w-5 text-teal-600" />
                                    <h3 className="text-lg font-semibold text-gray-800">
                                        Lịch làm việc của {selectedSchedule.doctorId.name} (Tuần {selectedSchedule.weekNumber}/{selectedSchedule.year})
                                    </h3>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowViewModal(false);
                                        setSelectedSchedule(null);
                                    }}
                                    className="text-gray-500 hover:text-gray-700 transition"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
                                {selectedSchedule.availability.map((item, index) => (
                                    <div
                                        key={index}
                                        className="p-4 bg-gray-50 rounded-lg shadow-sm hover:shadow-md transition"
                                    >
                                        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                                            {item.day} ({moment(item.date).format('DD/MM/YYYY')})
                                            {item.isAvailable ? (
                                                <span className="text-xs text-green-600 ml-2">
                                                    (Làm việc, {item.timeSlots.length} khung giờ)
                                                </span>
                                            ) : (
                                                <span className="text-xs text-red-600 ml-2">(Nghỉ)</span>
                                            )}
                                        </h4>
                                        {item.isAvailable && item.timeSlots.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {item.timeSlots.map(slot => (
                                                    <div
                                                        key={slot._id}
                                                        className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${slot.isBooked
                                                            ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                                            : slot.isAvailable
                                                                ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                            }`}
                                                    >
                                                        {slot.isBooked ? (
                                                            <XCircle size={14} className="text-red-500" />
                                                        ) : slot.isAvailable ? (
                                                            <CheckCircle size={14} className="text-blue-500" />
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
                            </div>
                            <div className="flex justify-end mt-6">
                                <button
                                    onClick={() => {
                                        setShowViewModal(false);
                                        setSelectedSchedule(null);
                                    }}
                                    className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold shadow-sm"
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