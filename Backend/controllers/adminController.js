const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const adminModel = require('../models/admin.model');
const doctorModel = require('../models/doctor.model');
const specialtyModel = require('../models/specialty.model');
const newsModel = require('../models/news.model');
const appointmentModel = require('../models/appointment.model');
const patientModel = require('../models/patient.model');
const reviewModel = require('../models/review.model');
const scheduleModel = require('../models/schedule.model');
const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');

const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email và mật khẩu là bắt buộc' });
        }

        const admin = await adminModel.findOne({ email }).select('+password');
        if (!admin) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
        }

        if (!process.env.JWT_KEY) {
            throw new Error('Khóa JWT không được cấu hình');
        }

        const token = jwt.sign({ id: admin._id, role: 'admin' }, process.env.JWT_KEY, { expiresIn: '1d' });
        res.status(200).json({ message: 'Đăng nhập thành công', token, admin: { id: admin._id, name: admin.name, email: admin.email } });
    } catch (error) {
        console.error('Lỗi khi đăng nhập admin:', error);
        res.status(500).json({ message: 'Lỗi server khi đăng nhập', error: error.message });
    }
};

const registerAdmin = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Tên, email và mật khẩu là bắt buộc' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Mật khẩu phải dài ít nhất 6 ký tự' });
        }

        const existingAdmin = await adminModel.findOne({ email });
        if (existingAdmin) {
            return res.status(400).json({ message: 'Email đã được sử dụng' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newAdmin = new adminModel({ name, email, password: hashedPassword });
        await newAdmin.save();

        res.status(201).json({ message: 'Đăng ký admin thành công', admin: { id: newAdmin._id, name, email } });
    } catch (error) {
        console.error('Lỗi khi đăng ký admin:', error);
        res.status(500).json({ message: 'Lỗi server khi đăng ký', error: error.message });
    }
};

const getAllSchedules = async (req, res) => {
    try {
        const { weekStartDate } = req.query;
        let query = {};

        if (weekStartDate) {
            const startDate = moment.tz(weekStartDate, 'Asia/Ho_Chi_Minh').startOf('week').toDate();
            query.weekStartDate = startDate;
            console.log('[getAllSchedules] Filtering by weekStartDate:', startDate);
        } else {
            console.log('[getAllSchedules] No weekStartDate provided, fetching all schedules');
        }

        const schedules = await scheduleModel
            .find(query)
            .populate('doctorId', 'name email')
            .sort({ weekStartDate: -1, createdAt: -1 });

        console.log('[getAllSchedules] Fetched schedules count:', schedules.length);
        res.status(200).json({ success: true, data: schedules });
    } catch (error) {
        console.error('[getAllSchedules] Error fetching schedules:', error);
        res.status(500).json({ message: 'Lỗi server khi lấy lịch', error: error.message });
    }
};

const getScheduleById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid schedule ID' });
        }
        const schedule = await scheduleModel
            .findById(id)
            .populate('doctorId', 'name email');
        if (!schedule) {
            return res.status(404).json({ message: 'Schedule not found' });
        }
        res.status(200).json({ success: true, data: schedule });
    } catch (error) {
        console.error('Error fetching schedule:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const createSchedule = async (req, res) => {
    try {
        const { doctorId, weekStartDate, availability } = req.body;
        if (!doctorId || !weekStartDate || !availability || !Array.isArray(availability)) {
            return res.status(400).json({ message: 'Doctor ID, week start date, and availability are required' });
        }

        const doctor = await doctorModel.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        const startDate = moment.tz(weekStartDate, 'Asia/Ho_Chi_Minh').startOf('week').startOf('day').toDate();
        const weekNumber = moment.tz(startDate, 'Asia/Ho_Chi_Minh').week();
        const year = moment.tz(startDate, 'Asia/Ho_Chi_Minh').year();

        const existingSchedule = await scheduleModel.findOne({ doctorId, weekStartDate: startDate });
        if (existingSchedule) {
            return res.status(400).json({ message: 'Schedule already exists for this doctor and week' });
        }

        const validDays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
        const daysMap = {
            'Monday': 'Thứ 2',
            'Tuesday': 'Thứ 3',
            'Wednesday': 'Thứ 4',
            'Thursday': 'Thứ 5',
            'Friday': 'Thứ 6',
            'Saturday': 'Thứ 7',
            'Sunday': 'Chủ nhật',
        };

        const isValidAvailability = availability.every((slot, index) => {
            const expectedDate = moment.tz(startDate, 'Asia/Ho_Chi_Minh').add(index, 'days').startOf('day');
            const actualDay = moment.tz(slot.date, 'Asia/Ho_Chi_Minh').format('dddd');
            return (
                validDays.includes(slot.day) &&
                slot.day === daysMap[actualDay] &&
                moment.tz(slot.date, 'Asia/Ho_Chi_Minh').isSame(expectedDate, 'day') &&
                typeof slot.isAvailable === 'boolean' &&
                Array.isArray(slot.timeSlots) &&
                (slot.isAvailable
                    ? slot.timeSlots.every(ts =>
                        /^\d{2}:\d{2}-\d{2}:\d{2}$/.test(ts.time) &&
                        typeof ts.isAvailable === 'boolean')
                    : slot.timeSlots.length === 0)
            );
        });

        if (!isValidAvailability) {
            return res.status(400).json({ message: 'Invalid availability format or day-date mismatch' });
        }

        const newSchedule = new scheduleModel({
            doctorId,
            weekStartDate: startDate,
            weekNumber,
            year,
            availability: availability.map((slot, index) => ({
                day: slot.day,
                date: moment.tz(startDate, 'Asia/Ho_Chi_Minh').add(index, 'days').startOf('day').toDate(),
                isAvailable: slot.isAvailable,
                timeSlots: slot.isAvailable ? slot.timeSlots.map(ts => ({
                    time: ts.time,
                    isBooked: ts.isBooked || false,
                    isAvailable: ts.isAvailable !== undefined ? ts.isAvailable : true,
                    patientId: ts.patientId || null,
                })) : [],
            })),
        });

        await newSchedule.save();
        const populatedSchedule = await scheduleModel
            .findById(newSchedule._id)
            .populate('doctorId', 'name email');

        res.status(201).json({ message: 'Schedule created successfully', schedule: populatedSchedule });
    } catch (error) {
        console.error('Error creating schedule:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const updateSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        const { weekStartDate, availability } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid schedule ID' });
        }

        if (!weekStartDate || !availability || !Array.isArray(availability)) {
            return res.status(400).json({ message: 'Week start date and availability are required' });
        }

        const schedule = await scheduleModel.findById(id).populate('doctorId', 'name email');
        if (!schedule) {
            return res.status(404).json({ message: 'Schedule not found' });
        }

        const startDate = moment.tz(weekStartDate, 'Asia/Ho_Chi_Minh').startOf('week').startOf('day').toDate();
        const weekNumber = moment.tz(startDate, 'Asia/Ho_Chi_Minh').week();
        const year = moment.tz(startDate, 'Asia/Ho_Chi_Minh').year();

        const validDays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
        const daysMap = {
            'Monday': 'Thứ 2',
            'Tuesday': 'Thứ 3',
            'Wednesday': 'Thứ 4',
            'Thursday': 'Thứ 5',
            'Friday': 'Thứ 6',
            'Saturday': 'Thứ 7',
            'Sunday': 'Chủ nhật',
        };

        const isValidAvailability = availability.every((slot, index) => {
            const expectedDate = moment.tz(startDate, 'Asia/Ho_Chi_Minh').add(index, 'days').startOf('day');
            const actualDay = moment.tz(slot.date, 'Asia/Ho_Chi_Minh').format('dddd');
            return (
                validDays.includes(slot.day) &&
                slot.day === daysMap[actualDay] &&
                moment.tz(slot.date, 'Asia/Ho_Chi_Minh').isSame(expectedDate, 'day') &&
                typeof slot.isAvailable === 'boolean' &&
                Array.isArray(slot.timeSlots) &&
                (slot.isAvailable
                    ? slot.timeSlots.every(ts =>
                        /^\d{2}:\d{2}-\d{2}:\d{2}$/.test(ts.time) &&
                        typeof ts.isAvailable === 'boolean')
                    : slot.timeSlots.length === 0)
            );
        });

        if (!isValidAvailability) {
            return res.status(400).json({ message: 'Invalid availability format or day-date mismatch' });
        }

        const conflictingAppointments = await appointmentModel.find({
            doctorId: schedule.doctorId._id,
            appointmentDate: { $gte: startDate, $lte: moment.tz(startDate, 'Asia/Ho_Chi_Minh').endOf('week').toDate() },
            timeslot: {
                $in: availability
                    .flatMap(slot => slot.timeSlots)
                    .filter(ts => ts.isBooked)
                    .map(ts => ts.time),
            },
        });

        if (conflictingAppointments.length > 0) {
            return res.status(400).json({ message: 'Cannot update schedule due to conflicting appointments' });
        }

        schedule.weekStartDate = startDate;
        schedule.weekNumber = weekNumber;
        schedule.year = year;
        schedule.availability = availability.map((slot, index) => ({
            day: slot.day,
            date: moment.tz(startDate, 'Asia/Ho_Chi_Minh').add(index, 'days').startOf('day').toDate(),
            isAvailable: slot.isAvailable,
            timeSlots: slot.isAvailable ? slot.timeSlots.map(ts => ({
                time: ts.time,
                isBooked: ts.isBooked || false,
                isAvailable: ts.isAvailable !== undefined ? ts.isAvailable : true,
                patientId: ts.isBooked ? ts.patientId || null : null,
            })) : [],
        }));

        await schedule.save();
        const populatedSchedule = await scheduleModel
            .findById(schedule._id)
            .populate('doctorId', 'name email');

        res.status(200).json({ message: 'Schedule updated successfully', schedule: populatedSchedule });
    } catch (error) {
        console.error('Error updating schedule:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const deleteSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid schedule ID' });
        }

        const schedule = await scheduleModel.findById(id).populate('doctorId', 'name email');
        if (!schedule) {
            return res.status(404).json({ message: 'Schedule not found' });
        }

        const hasBookedSlots = schedule.availability.some(slot =>
            slot.timeSlots.some(ts => ts.isBooked)
        );
        if (hasBookedSlots) {
            return res.status(400).json({ message: 'Cannot delete schedule with booked time slots' });
        }

        const conflictingAppointments = await appointmentModel.find({
            doctorId: schedule.doctorId._id,
            appointmentDate: {
                $gte: schedule.weekStartDate,
                $lte: moment(schedule.weekStartDate).endOf('week').toDate(),
            },
        });

        if (conflictingAppointments.length > 0) {
            return res.status(400).json({ message: 'Cannot delete schedule due to existing appointments in this week' });
        }

        await scheduleModel.findByIdAndDelete(id);
        res.status(200).json({ message: 'Schedule deleted successfully' });
    } catch (error) {
        console.error('Error deleting schedule:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const getAllAppointments = async (req, res) => {
    try {
        const appointments = await appointmentModel
            .find()
            .populate({
                path: 'patientId',
                select: 'name email phoneNumber',
                strictPopulate: false,
            })
            .populate({
                path: 'doctorId',
                select: 'name specialty',
                populate: { path: 'specialty', select: 'name' },
                strictPopulate: false,
            });
        res.status(200).json({
            success: true,
            data: appointments.map(a => ({
                _id: a._id,
                patientId: a.patientId || null,
                doctorId: a.doctorId || null,
                appointmentDate: a.appointmentDate,
                timeslot: a.timeslot,
                status: a.status,
                createdAt: a.createdAt,
            })),
        });
    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy danh sách lịch hẹn', error: error.message });
    }
};

const getAppointmentById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID lịch hẹn không hợp lệ' });
        }

        const appointment = await appointmentModel
            .findById(id)
            .populate('patientId', 'name email phoneNumber')
            .populate('doctorId', 'name specialty')
            .populate({
                path: 'doctorId',
                populate: { path: 'specialty', select: 'name' },
            });

        if (!appointment) {
            return res.status(404).json({ message: 'Không tìm thấy lịch hẹn' });
        }

        const review = await reviewModel.findOne({ appointmentId: id }).select('rating review createdAt');

        res.status(200).json({
            success: true,
            data: {
                _id: appointment._id,
                patientName: appointment.patientId.name,
                patientEmail: appointment.patientId.email,
                patientPhone: appointment.patientId.phoneNumber || 'N/A',
                doctorName: appointment.doctorId.name,
                doctorSpecialization: appointment.doctorId.specialty?.name || 'N/A',
                appointmentDate: appointment.appointmentDate,
                timeslot: appointment.timeslot,
                status: appointment.status,
                notes: appointment.notes || 'Không có ghi chú',
                review: review
                    ? {
                        rating: review.rating,
                        comment: review.review || 'Không có nội dung đánh giá',
                        createdAt: review.createdAt,
                    }
                    : null,
                createdAt: appointment.createdAt,
            },
        });
    } catch (error) {
        console.error('Lỗi khi lấy thông tin lịch hẹn:', error);
        res.status(500).json({ message: 'Lỗi server khi lấy thông tin lịch hẹn', error: error.message });
    }
};

const deleteAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID lịch hẹn không hợp lệ' });
        }

        const appointment = await appointmentModel.findById(id);
        if (!appointment) {
            return res.status(404).json({ message: 'Không tìm thấy lịch hẹn' });
        }

        const reviewCount = await reviewModel.countDocuments({ appointmentId: id });
        if (reviewCount > 0) {
            return res.status(400).json({ message: 'Không thể xóa lịch hẹn vì có đánh giá liên quan' });
        }

        await appointmentModel.findByIdAndDelete(id);
        res.status(200).json({ message: 'Xóa lịch hẹn thành công' });
    } catch (error) {
        console.error('Lỗi khi xóa lịch hẹn:', error);
        res.status(500).json({ message: 'Lỗi server khi xóa lịch hẹn', error: error.message });
    }
};

const addDoctor = async (req, res) => {
    try {
        const { name, email, password, specialty, location, experience, about, fees, phone } = req.body;
        if (!name || !email || !password || !specialty || !location || !experience || !about || !fees || !req.file) {
            return res.status(400).json({ message: 'Tất cả các trường bắt buộc phải được cung cấp, bao gồm hình ảnh' });
        }

        const existingDoctor = await doctorModel.findOne({ email });
        if (existingDoctor) {
            return res.status(400).json({ message: 'Email đã được sử dụng' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Mật khẩu phải dài ít nhất 6 ký tự' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newDoctor = new doctorModel({
            name,
            email,
            password: hashedPassword,
            specialty,
            location,
            experience,
            about,
            fees,
            image: `/images/uploads/doctors/${req.file.filename}`,
            phone: phone || '',
        });

        await newDoctor.save();
        const populatedDoctor = await doctorModel.findById(newDoctor._id).populate('specialty');

        res.status(201).json({
            message: 'Thêm bác sĩ thành công',
            doctor: {
                _id: populatedDoctor._id,
                name: populatedDoctor.name,
                email: populatedDoctor.email,
                specialty: populatedDoctor.specialty,
                location: populatedDoctor.location,
                experience: populatedDoctor.experience,
                about: populatedDoctor.about,
                fees: populatedDoctor.fees,
                image: populatedDoctor.image,
                phone: populatedDoctor.phone,
                createdAt: populatedDoctor.createdAt,
            },
        });
    } catch (error) {
        console.error('Lỗi khi thêm bác sĩ:', error);
        res.status(500).json({ message: 'Lỗi server khi thêm bác sĩ', error: error.message });
    }
};

const editDoctor = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, password, specialty, phone, location, experience, about, fees, existingImage } = req.body;
        if (!name || !email || !specialty || !location || !experience || !about || !fees) {
            return res.status(400).json({ message: 'Tất cả các trường bắt buộc phải được cung cấp' });
        }

        const doctor = await doctorModel.findById(id);
        if (!doctor) {
            return res.status(404).json({ message: 'Không tìm thấy bác sĩ' });
        }

        const existingDoctor = await doctorModel.findOne({ email, _id: { $ne: id } });
        if (existingDoctor) {
            return res.status(400).json({ message: 'Email đã được sử dụng bởi bác sĩ khác' });
        }

        if (password && password.length < 6) {
            return res.status(400).json({ message: 'Mật khẩu phải dài ít nhất 6 ký tự' });
        }

        const updateData = {
            name,
            email,
            specialty,
            phone: phone || '',
            location,
            experience,
            about,
            fees,
        };

        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        if (req.file) {
            updateData.image = `/images/uploads/doctors/${req.file.filename}`;
        } else if (existingImage) {
            updateData.image = existingImage;
        } else {
            updateData.image = doctor.image || '';
        }

        const updatedDoctor = await doctorModel.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        }).populate('specialty');

        res.status(200).json({
            message: 'Cập nhật bác sĩ thành công',
            doctor: {
                _id: updatedDoctor._id,
                name: updatedDoctor.name,
                email: updatedDoctor.email,
                specialty: updatedDoctor.specialty,
                phone: updatedDoctor.phone,
                location: updatedDoctor.location,
                experience: updatedDoctor.experience,
                about: updatedDoctor.about,
                fees: updatedDoctor.fees,
                image: updatedDoctor.image,
                createdAt: updatedDoctor.createdAt,
            },
        });
    } catch (error) {
        console.error('Lỗi khi cập nhật bác sĩ:', error);
        res.status(500).json({ message: 'Lỗi server khi cập nhật bác sĩ', error: error.message });
    }
};

const deleteDoctor = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID bác sĩ không hợp lệ' });
        }

        const doctor = await doctorModel.findById(id);
        if (!doctor) {
            return res.status(404).json({ message: 'Không tìm thấy bác sĩ' });
        }

        const appointmentCount = await appointmentModel.countDocuments({ doctorId: id });
        if (appointmentCount > 0) {
            return res.status(400).json({ message: 'Không thể xóa bác sĩ vì đang có lịch hẹn' });
        }

        await doctorModel.findByIdAndDelete(id);
        res.status(200).json({ message: 'Xóa bác sĩ thành công' });
    } catch (error) {
        console.error('Lỗi khi xóa bác sĩ:', error);
        res.status(500).json({ message: 'Lỗi server khi xóa bác sĩ', error: error.message });
    }
};

const getDoctorById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID bác sĩ không hợp lệ' });
        }

        const doctor = await doctorModel.findById(id).populate('specialty');
        if (!doctor) {
            return res.status(404).json({ message: 'Không tìm thấy bác sĩ' });
        }

        res.status(200).json({
            success: true,
            data: {
                _id: doctor._id,
                name: doctor.name,
                email: doctor.email,
                specialty: doctor.specialty,
                phone: doctor.phone,
                location: doctor.location,
                experience: doctor.experience,
                about: doctor.about,
                fees: doctor.fees,
                image: doctor.image || '',
                createdAt: doctor.createdAt,
            },
        });
    } catch (error) {
        console.error('Lỗi khi lấy thông tin bác sĩ:', error);
        res.status(500).json({ message: 'Lỗi server khi lấy thông tin bác sĩ', error: error.message });
    }
};

const getAllDoctors = async (req, res) => {
    try {
        const doctors = await doctorModel.find().populate('specialty');
        res.status(200).json({ success: true, data: doctors });
    } catch (error) {
        console.error('Error fetching doctors:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const getAllSpecialties = async (req, res) => {
    try {
        const specialties = await specialtyModel.find();
        res.status(200).json(specialties);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách chuyên khoa:', error);
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách chuyên khoa', error: error.message });
    }
};

const getAllPatients = async (req, res) => {
    try {
        const patients = await patientModel.find().populate({
            path: 'medicalHistory.doctor',
            select: 'name',
            strictPopulate: false,
        });
        res.status(200).json({ success: true, data: patients });
    } catch (error) {
        console.error('Error fetching all patients:', error);
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách bệnh nhân', error: error.message });
    }
};

const getPatientById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID bệnh nhân không hợp lệ' });
        }
        const patient = await patientModel
            .findById(id)
            .populate({
                path: 'medicalHistory.doctor',
                select: 'name',
                strictPopulate: false,
            })
            .populate({
                path: 'reviews',
                select: 'rating review doctorId createdAt',
                populate: {
                    path: 'doctorId',
                    select: 'name',
                    strictPopulate: false,
                },
            })
            .populate({
                path: 'appointment',
                select: 'appointmentDate timeslot status doctorId createdAt',
                populate: {
                    path: 'doctorId',
                    select: 'name',
                    strictPopulate: false,
                },
            });
        if (!patient) {
            return res.status(404).json({ message: 'Không tìm thấy bệnh nhân' });
        }
        res.status(200).json({
            success: true,
            data: {
                _id: patient._id,
                name: patient.name,
                email: patient.email,
                phoneNumber: patient.phoneNumber || '',
                address: patient.address || '',
                image: patient.image || '',
                reviews: patient.reviews || [],
                medicalHistory: patient.medicalHistory || [],
                appointment: patient.appointment || [],
                createdAt: patient.createdAt,
            },
        });
    } catch (error) {
        console.error('Error fetching patient by ID:', error);
        res.status(500).json({ message: 'Lỗi server khi lấy thông tin bệnh nhân', error: error.message });
    }
};

const deletePatient = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID bệnh nhân không hợp lệ' });
        }

        const patient = await patientModel.findById(id);
        if (!patient) {
            return res.status(404).json({ message: 'Không tìm thấy bệnh nhân' });
        }

        const appointmentCount = await appointmentModel.countDocuments({ patientId: id });
        if (appointmentCount > 0) {
            return res.status(400).json({
                message: `Không thể xóa bệnh nhân "${patient.name}" vì đang có ${appointmentCount} lịch hẹn liên quan`,
            });
        }

        const reviewCount = await reviewModel.countDocuments({ patientId: id });
        if (reviewCount > 0) {
            return res.status(400).json({
                message: `Không thể xóa bệnh nhân "${patient.name}" vì có ${reviewCount} đánh giá liên quan`,
            });
        }

        await patientModel.deleteOne({ _id: id });
        res.status(200).json({ message: 'Xóa bệnh nhân thành công' });
    } catch (error) {
        console.error('Lỗi khi xóa bệnh nhân:', error);
        res.status(500).json({ message: 'Lỗi server khi xóa bệnh nhân', error: error.message });
    }
};

const editPatient = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, password, phoneNumber, address } = req.body;
        if (!name || !email || !address) {
            return res.status(400).json({ message: 'Tên, email và địa chỉ là bắt buộc' });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID bệnh nhân không hợp lệ' });
        }

        const patient = await patientModel.findById(id);
        if (!patient) {
            return res.status(404).json({ message: 'Không tìm thấy bệnh nhân' });
        }

        const existingPatient = await patientModel.findOne({ email, _id: { $ne: id } });
        if (existingPatient) {
            return res.status(400).json({ message: 'Email đã được sử dụng bởi bệnh nhân khác' });
        }

        if (password && password.length < 6) {
            return res.status(400).json({ message: 'Mật khẩu phải dài ít nhất 6 ký tự' });
        }

        if (phoneNumber && !/^\+?\d{10,15}$/.test(phoneNumber)) {
            return res.status(400).json({ message: 'Số điện thoại không hợp lệ' });
        }

        const updateData = {
            name,
            email,
            phoneNumber: phoneNumber || '',
            address,
        };

        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        if (req.file) {
            if (patient.image) {
                const oldImagePath = path.join(__dirname, '..', 'public', patient.image);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
            updateData.image = `/uploads/misc/${req.file.filename}`;
        }

        const updatedPatient = await patientModel.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        }).populate('medicalHistory.doctor', 'name');

        const imageUrl = updatedPatient.image ? `${req.protocol}://${req.get('host')}/images${updatedPatient.image}?t=${Date.now()}` : null;

        res.status(200).json({
            message: 'Cập nhật bệnh nhân thành công',
            patient: {
                _id: updatedPatient._id,
                name: updatedPatient.name,
                email: updatedPatient.email,
                phoneNumber: updatedPatient.phoneNumber,
                address: updatedPatient.address,
                image: imageUrl,
                reviews: updatedPatient.reviews || [],
                medicalHistory: updatedPatient.medicalHistory || [],
                appointment: updatedPatient.appointment || [],
                createdAt: updatedPatient.createdAt,
            },
        });
    } catch (error) {
        console.error('[editPatient] Error:', error);
        res.status(500).json({ message: 'Lỗi server khi cập nhật bệnh nhân', error: error.message });
    }
};

const addSpecialty = async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Tên chuyên khoa là bắt buộc' });
        }

        const specialtyData = {
            name,
            description: description || '',
            image: req.file ? `/images/uploads/specialties/${req.file.filename}` : '',
        };

        const specialty = new specialtyModel(specialtyData);
        await specialty.save();
        res.status(201).json({ message: 'Thêm chuyên khoa thành công', specialty });
    } catch (error) {
        console.error('Lỗi khi thêm chuyên khoa:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Tên chuyên khoa đã tồn tại' });
        }
        res.status(500).json({ message: 'Lỗi server khi thêm chuyên khoa', error: error.message });
    }
};

const updateSpecialty = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, existingImage } = req.body;
        const newImage = req.file;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID chuyên khoa không hợp lệ' });
        }

        const specialty = await specialtyModel.findById(id);
        if (!specialty) {
            return res.status(404).json({ message: 'Chuyên khoa không tồn tại' });
        }

        let imagePath = existingImage || specialty.image;
        if (newImage) {
            if (specialty.image) {
                const oldImagePath = path.join(__dirname, '..', 'public', specialty.image);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
            imagePath = `/images/uploads/specialties/${newImage.filename}`;
        }

        specialty.name = name || specialty.name;
        specialty.description = description || specialty.description;
        specialty.image = imagePath;

        await specialty.save();

        res.status(200).json({ message: 'Cập nhật chuyên khoa thành công', specialty });
    } catch (error) {
        console.error('Error updating specialty:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Tên chuyên khoa đã tồn tại' });
        }
        res.status(500).json({ message: 'Lỗi khi cập nhật chuyên khoa', error: error.message });
    }
};

const deleteSpecialty = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID chuyên khoa không hợp lệ' });
        }

        const specialty = await specialtyModel.findById(id);
        if (!specialty) {
            return res.status(404).json({ message: 'Không tìm thấy chuyên khoa' });
        }

        const doctorCount = await doctorModel.countDocuments({ specialty: id });
        if (doctorCount > 0) {
            return res.status(400).json({ message: 'Không thể xóa chuyên khoa vì đang được sử dụng bởi bác sĩ' });
        }

        await specialtyModel.findByIdAndDelete(id);
        res.status(200).json({ message: 'Xóa chuyên khoa thành công' });
    } catch (error) {
        console.error('Lỗi khi xóa chuyên khoa:', error);
        res.status(500).json({ message: 'Lỗi server khi xóa chuyên khoa', error: error.message });
    }
};

const getAllNews = async (req, res) => {
    try {
        const news = await newsModel.find().sort({ createdAt: -1 });
        res.status(200).json(news);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách tin tức:', error);
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách tin tức', error: error.message });
    }
};

const addNews = async (req, res) => {
    try {
        const { title, content, category, status, publishAt } = req.body;
        if (!title || !content) {
            return res.status(400).json({ message: 'Tiêu đề và nội dung là bắt buộc' });
        }

        const newsData = {
            title,
            content,
            category: category || 'Other',
            status: status || 'draft',
            publishAt: publishAt ? new Date(publishAt) : null,
            image: req.file ? `/images/uploads/news/${req.file.filename}` : '',
        };

        const news = new newsModel(newsData);
        await news.save();
        res.status(201).json({ message: 'Thêm tin tức thành công', news });
    } catch (error) {
        console.error('Lỗi khi thêm tin tức:', error);
        res.status(500).json({ message: 'Lỗi server khi thêm tin tức', error: error.message });
    }
};

const updateNews = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, category, status, publishAt, existingImage } = req.body;
        if (!title || !content) {
            return res.status(400).json({ message: 'Tiêu đề và nội dung là bắt buộc' });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID tin tức không hợp lệ' });
        }

        const news = await newsModel.findById(id);
        if (!news) {
            return res.status(404).json({ message: 'Không tìm thấy tin tức' });
        }

        const newsData = {
            title,
            content,
            category: category || 'Other',
            status: status || 'draft',
            publishAt: publishAt ? new Date(publishAt) : null,
        };

        if (req.file) {
            newsData.image = `/images/uploads/news/${req.file.filename}`;
        } else if (existingImage) {
            newsData.image = existingImage;
        } else {
            newsData.image = news.image || '';
        }

        const updatedNews = await newsModel.findByIdAndUpdate(id, newsData, {
            new: true,
            runValidators: true,
        });

        res.status(200).json({ message: 'Cập nhật tin tức thành công', news: updatedNews });
    } catch (error) {
        console.error('Lỗi khi cập nhật tin tức:', error);
        res.status(500).json({ message: 'Lỗi server khi cập nhật tin tức', error: error.message });
    }
};

const deleteNews = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID tin tức không hợp lệ' });
        }

        const news = await newsModel.findById(id);
        if (!news) {
            return res.status(404).json({ message: 'Không tìm thấy tin tức' });
        }

        await newsModel.findByIdAndDelete(id);
        res.status(200).json({ message: 'Xóa tin tức thành công' });
    } catch (error) {
        console.error('Lỗi khi xóa tin tức:', error);
        res.status(500).json({ message: 'Lỗi server khi xóa tin tức', error: error.message });
    }
};

module.exports = {
    loginAdmin,
    registerAdmin,
    addDoctor,
    editDoctor,
    deleteDoctor,
    getDoctorById,
    getAllDoctors,
    getAllSpecialties,
    addSpecialty,
    updateSpecialty,
    deleteSpecialty,
    getAllNews,
    addNews,
    updateNews,
    deleteNews,
    getAllPatients,
    getPatientById,
    editPatient,
    deletePatient,
    getAllAppointments,
    getAppointmentById,
    deleteAppointment,
    getAllSchedules,
    getScheduleById,
    createSchedule,
    updateSchedule,
    deleteSchedule,
};