const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const patientModel = require('../models/patient.model');
const appointmentModel = require('../models/appointment.model');
const reviewModel = require('../models/review.model');
const scheduleModel = require('../models/schedule.model');
const doctorModel = require('../models/doctor.model');
const medicalHistoryModel = require('../models/medicalHistory.model');

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Vui lòng nhập email hợp lệ',
    'any.required': 'Email là bắt buộc',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Mật khẩu phải có ít nhất 6 ký tự',
    'any.required': 'Mật khẩu là bắt buộc',
  }),
  name: Joi.string().min(3).required().messages({
    'string.min': 'Tên phải có ít nhất 3 ký tự',
    'any.required': 'Tên là bắt buộc',
  }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const updateProfileSchema = Joi.object({
  name: Joi.string().min(3).optional(),
  email: Joi.string().email().optional(),
  phoneNumber: Joi.string().pattern(/^\+?\d{10,15}$/).optional().messages({
    'string.pattern.base': 'Định dạng số điện thoại không hợp lệ',
  }),
  password: Joi.string().min(6).optional(),
  address: Joi.string().optional(),
});

const bookAppointmentSchema = Joi.object({
  doctorId: Joi.string().required(),
  appointmentDate: Joi.date().iso().required(),
  timeslot: Joi.string().pattern(/^\d{2}:\d{2}-\d{2}:\d{2}$/).required(),
  notes: Joi.string().optional(),
});

const submitReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  review: Joi.string().min(1).required(),
  doctorId: Joi.string().required(),
  appointmentId: Joi.string().required(),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
  confirmNewPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
    'any.only': 'Mật khẩu mới và xác nhận không khớp',
  }),
});

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Register user
const registerUser = async (req, res) => {
  try {
    const { error } = registerSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const { email, password, name } = req.body;

    const existingUser = await patientModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email đã được sử dụng' });
    }

    const user = await patientModel.create({ email, password, name });

    const token = generateToken(user);
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });

    return res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      data: { token, user: { id: user._id, name, email } },
    });
  } catch (error) {
    console.error('[registerUser] Error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
};

// Login user
const loginUser = async (req, res) => {
  try {
    // Validate request body
    const { error } = loginSchema.validate(req.body, { abortEarly: false });
    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join(", ");
      return res.status(400).json({ success: false, message: `Dữ liệu không hợp lệ: ${errorMessage}` });
    }

    const { email, password } = req.body;

    // Tìm người dùng theo email
    const user = await patientModel.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ success: false, message: "Email không tồn tại" });
    }

    // Kiểm tra mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Mật khẩu không đúng" });
    }

    // Tạo token
    let token;
    try {
      token = generateToken(user);
    } catch (tokenError) {
      console.error("[loginUser] Token generation error:", tokenError);
      return res.status(500).json({ success: false, message: "Lỗi tạo token" });
    }

    // Thiết lập cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 ngày
    };
    res.cookie("token", token, cookieOptions);

    // Trả về phản hồi
    return res.status(200).json({
      success: true,
      message: "Đăng nhập thành công",
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      },
    });
  } catch (error) {
    console.error("[loginUser] Error:", error);
    return res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};

// Logout user
const logout = (req, res) => {
  try {
    res.clearCookie('token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
    res.clearCookie('connect.sid', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
    return res.status(200).json({ success: true, message: 'Đăng xuất thành công' });
  } catch (error) {
    console.error('[logout] Error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
};

// Update profile
const updateProfile = async (req, res) => {
  try {
    const { error } = updateProfileSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const { name, email, phoneNumber, password, address } = req.body;
    const image = req.file;
    const userId = req.user.id;

    const user = await patientModel.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });

    if (email && email !== user.email) {
      const existingUser = await patientModel.findOne({ email });
      if (existingUser) return res.status(400).json({ success: false, message: 'Email đã được sử dụng' });
      user.email = email;
    }

    if (password) user.password = await bcrypt.hash(password, 10);
    if (name) user.name = name;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (address) user.address = address;
    if (image) user.image = `/uploads/misc/${image.filename}`;

    await user.save();

    const imageUrl = user.image ? `${req.protocol}://${req.get('host')}${user.image}` : null;

    return res.status(200).json({
      success: true,
      message: 'Cập nhật hồ sơ thành công',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        address: user.address,
        image: imageUrl,
      },
    });
  } catch (error) {
    console.error('[updateProfile] Error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi cập nhật hồ sơ', error: error.message });
  }
};

// Get profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('[getProfile] Fetching profile for patientId:', userId);
    const user = await patientModel.findById(userId).select('-password').lean();
    if (!user) {
      console.warn('[getProfile] User not found:', userId);
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }
    const imageUrl = user.image ? `${req.protocol}://${req.get('host')}/images${user.image}` : null;
    console.log('[getProfile] Profile fetched successfully:', user);
    return res.status(200).json({
      success: true,
      message: 'Lấy hồ sơ thành công',
      data: { ...user, image: imageUrl },
    });
  } catch (error) {
    console.error('[getProfile] Error:', {
      message: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ success: false, message: 'Lỗi lấy hồ sơ', error: error.message });
  }
};

// Get appointments
const getAppointments = async (req, res) => {
  try {
    if (!req.user?.id) {
      console.error('[getAppointments] No user ID in request');
      return res.status(401).json({ success: false, message: 'Không xác thực được người dùng' });
    }

    const patientId = req.user.id;
    console.log('[getAppointments] Fetching appointments for patientId:', patientId);

    const appointments = await appointmentModel
      .find({ patientId })
      .populate({
        path: 'doctorId',
        select: 'name image',
        populate: { path: 'specialty', select: 'name' },
      })
      .sort({ appointmentDate: -1 });

    console.log('[getAppointments] Found appointments:', appointments.length);

    return res.status(200).json({
      success: true,
      message: 'Lấy lịch hẹn thành công',
      data: appointments,
    });
  } catch (error) {
    console.error('[getAppointments] Error:', {
      message: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ success: false, message: 'Lỗi lấy lịch hẹn', error: error.message });
  }
};

// Book appointment
const bookAppointment = async (req, res) => {
  try {
    const { error } = bookAppointmentSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const { doctorId, appointmentDate, timeslot, notes } = req.body;
    const patientId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(doctorId) || !mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({ success: false, message: 'ID bác sĩ hoặc bệnh nhân không hợp lệ' });
    }

    const selectedDate = new Date(appointmentDate);
    if (selectedDate < new Date()) {
      return res.status(400).json({ success: false, message: 'Không thể đặt lịch hẹn trong quá khứ' });
    }

    const daysMap = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const dayOfWeek = daysMap[selectedDate.getDay()];

    const schedule = await scheduleModel.findOne({ doctorId });
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch làm việc của bác sĩ' });
    }

    const availability = schedule.availability.find((avail) => avail.day === dayOfWeek);
    if (!availability) {
      return res.status(400).json({ success: false, message: 'Bác sĩ không làm việc vào ngày này' });
    }

    const timeSlot = availability.timeSlots.find((slot) => slot.time === timeslot);
    if (!timeSlot || timeSlot.isBooked) {
      return res.status(400).json({ success: false, message: 'Khung giờ không hợp lệ hoặc đã được đặt' });
    }

    const startOfDay = new Date(selectedDate).setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate).setHours(23, 59, 59, 999);
    const existingAppointment = await appointmentModel.findOne({
      doctorId,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
      timeslot,
      status: { $ne: 'cancelled' },
    });
    if (existingAppointment) {
      return res.status(400).json({ success: false, message: 'Khung giờ này đã được đặt' });
    }

    timeSlot.isBooked = true;
    timeSlot.patientId = patientId;
    await schedule.save();

    const appointment = await appointmentModel.create({
      patientId,
      doctorId,
      appointmentDate: selectedDate,
      timeslot,
      notes: notes || '',
      status: 'pending',
    });

    return res.status(201).json({
      success: true,
      message: 'Đặt lịch hẹn thành công',
      data: appointment,
    });
  } catch (error) {
    console.error('[bookAppointment] Error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Khung giờ này đã được đặt' });
    }
    return res.status(500).json({ success: false, message: 'Lỗi đặt lịch hẹn', error: error.message });
  }
};

// Cancel appointment
const cancelAppointment = async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const patientId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
      return res.status(400).json({ success: false, message: 'ID lịch hẹn không hợp lệ' });
    }

    const appointment = await appointmentModel.findOne({ _id: appointmentId, patientId });
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch hẹn hoặc bạn không có quyền hủy' });
    }

    if (appointment.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Lịch hẹn đã được hủy trước đó' });
    }

    if (new Date(appointment.appointmentDate) < new Date()) {
      return res.status(400).json({ success: false, message: 'Không thể hủy lịch hẹn đã qua' });
    }

    appointment.status = 'cancelled';
    await appointment.save();

    const selectedDate = new Date(appointment.appointmentDate);
    const daysMap = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const dayOfWeek = daysMap[selectedDate.getDay()];

    const schedule = await scheduleModel.findOne({ doctorId: appointment.doctorId });
    if (schedule) {
      const availability = schedule.availability.find((avail) => avail.day === dayOfWeek);
      if (availability) {
        const timeSlot = availability.timeSlots.find((slot) => slot.time === appointment.timeslot);
        if (timeSlot) {
          timeSlot.isBooked = false;
          timeSlot.patientId = null;
          await schedule.save();
        } else {
          console.warn('[cancelAppointment] Timeslot not found:', appointment.timeslot);
        }
      } else {
        console.warn('[cancelAppointment] Availability not found for day:', dayOfWeek);
      }
    } else {
      console.warn('[cancelAppointment] Schedule not found for doctor:', appointment.doctorId);
    }

    return res.status(200).json({
      success: true,
      message: 'Hủy lịch hẹn thành công',
      data: appointment,
    });
  } catch (error) {
    console.error('[cancelAppointment] Error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi hủy lịch hẹn', error: error.message });
  }
};


const getAppointmentById = async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const patientId = req.user.id;
    if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
      return res.status(400).json({ success: false, message: 'ID lịch hẹn không hợp lệ' });
    }
    const appointment = await appointmentModel
      .findOne({ _id: appointmentId, patientId })
      .populate({
        path: 'doctorId',
        select: 'name image',
        populate: { path: 'specialty', select: 'name' },
      });
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch hẹn' });
    }
    return res.status(200).json({
      success: true,
      message: 'Lấy chi tiết lịch hẹn thành công',
      data: appointment,
    });
  } catch (error) {
    console.error('[getAppointmentById] Error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi lấy chi tiết lịch hẹn', error: error.message });
  }
};
// Submit review
const submitReview = async (req, res) => {
  try {
    const { error } = submitReviewSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const { rating, review, doctorId, appointmentId } = req.body;
    const patientId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(doctorId) || !mongoose.Types.ObjectId.isValid(appointmentId)) {
      return res.status(400).json({ success: false, message: 'ID bác sĩ hoặc lịch hẹn không hợp lệ' });
    }

    const appointment = await appointmentModel.findOne({
      _id: appointmentId,
      patientId,
      doctorId,
      status: 'completed',
      appointmentDate: { $lt: new Date() },
    });
    if (!appointment) {
      return res.status(400).json({
        success: false,
        message: 'Lịch hẹn không hợp lệ hoặc chưa hoàn thành',
      });
    }

    const existingReview = await reviewModel.findOne({ appointmentId });
    if (existingReview) {
      return res.status(400).json({ success: false, message: 'Bạn đã đánh giá lịch hẹn này' });
    }

    const newReview = await reviewModel.create({
      patientId,
      doctorId,
      appointmentId,
      rating,
      review,
    });

    const doctor = await doctorModel.findById(doctorId);
    await doctor.calculateAverageRating();

    return res.status(201).json({
      success: true,
      message: 'Gửi đánh giá thành công',
      data: newReview,
    });
  } catch (error) {
    console.error('[submitReview] Error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Bạn đã đánh giá lịch hẹn này' });
    }
    return res.status(500).json({ success: false, message: 'Lỗi gửi đánh giá', error: error.message });
  }
};

// Get my reviews
const myReviews = async (req, res) => {
  try {
    const patientId = req.user.id;
    const reviews = await reviewModel
      .find({ patientId })
      .populate('doctorId', 'name')
      .populate({
        path: 'doctorId',
        populate: { path: 'specialty', select: 'name' },
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'Lấy đánh giá thành công',
      data: reviews,
    });
  } catch (error) {
    console.error('[myReviews] Error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi lấy đánh giá', error: error.message });
  }
};

// Complete appointment
const completeAppointment = async (req, res) => {
  try {
    const appointmentId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
      return res.status(400).json({ success: false, message: 'ID lịch hẹn không hợp lệ' });
    }

    const appointment = await appointmentModel.findByIdAndUpdate(
      appointmentId,
      { status: 'completed' },
      { new: true }
    );
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch hẹn' });
    }

    return res.status(200).json({
      success: true,
      message: 'Lịch hẹn được đánh dấu là hoàn thành',
      data: appointment,
    });
  } catch (error) {
    console.error('[completeAppointment] Error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi hoàn thành lịch hẹn', error: error.message });
  }
};

// Get all patients (admin only)
const getAllPatients = async (req, res) => {
  try {
    const patients = await patientModel.find().select('-password');
    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách bệnh nhân thành công',
      data: patients,
    });
  } catch (error) {
    console.error('[getAllPatients] Error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách bệnh nhân', error: error.message });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { error } = changePasswordSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const user = await patientModel.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });

    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(401).json({ success: false, message: 'Mật khẩu hiện tại không đúng' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({ success: true, message: 'Đổi mật khẩu thành công' });
  } catch (error) {
    console.error('[changePassword] Error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi đổi mật khẩu', error: error.message });
  }
};

// Get available slots
const getAvailableSlots = async (req, res) => {
  try {
    const { docId } = req.params;
    const { date } = req.query;

    if (!mongoose.Types.ObjectId.isValid(docId)) {
      return res.status(400).json({ success: false, message: 'ID bác sĩ không hợp lệ' });
    }

    if (!date || isNaN(new Date(date))) {
      return res.status(400).json({ success: false, message: 'Ngày không hợp lệ' });
    }

    const selectedDate = new Date(date);
    const daysMap = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const dayOfWeek = daysMap[selectedDate.getDay()];

    const schedule = await scheduleModel.findOne({ doctorId: docId });
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch làm việc của bác sĩ' });
    }

    const availability = schedule.availability.find((avail) => avail.day === dayOfWeek);
    if (!availability) {
      return res.status(200).json({ success: true, data: [], message: 'Bác sĩ không làm việc vào ngày này' });
    }

    const startOfDay = new Date(selectedDate).setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate).setHours(23, 59, 59, 999);
    const bookedSlots = await appointmentModel
      .find({
        doctorId: docId,
        appointmentDate: { $gte: startOfDay, $lte: endOfDay },
        status: { $ne: 'cancelled' },
      })
      .select('timeslot');

    const bookedTimes = bookedSlots.map((slot) => slot.timeslot);
    const availableSlots = availability.timeSlots
      .filter((slot) => !bookedTimes.includes(slot.time) && !slot.isBooked)
      .map((slot) => ({ time: slot.time }));

    return res.status(200).json({
      success: true,
      message: availableSlots.length ? 'Lấy khung giờ thành công' : 'Không có khung giờ trống',
      data: availableSlots,
    });
  } catch (error) {
    console.error('[getAvailableSlots] Error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi lấy khung giờ', error: error.message });
  }
};

// Get medical history
const getMedicalHistory = async (req, res) => {
  try {
    const patientId = req.user.id;
    console.log('[getMedicalHistory] Fetching medical history for patientId:', patientId);
    const medicalHistory = await medicalHistoryModel
      .find({ patient: patientId })
      .populate('doctor', 'name')
      .populate('appointmentId', 'appointmentDate timeslot')
      .sort({ date: -1 });

    return res.status(200).json({
      success: true,
      message: 'Lấy lịch sử y tế thành công',
      data: { medicalHistory },
    });
  } catch (error) {
    console.error('[getMedicalHistory] Error:', {
      message: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ success: false, message: 'Lỗi lấy lịch sử y tế', error: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  logout,
  updateProfile,
  getProfile,
  getAppointments,
  bookAppointment,
  cancelAppointment,
  getAppointmentById,
  submitReview,
  myReviews,
  completeAppointment,
  getAllPatients,
  changePassword,
  getAvailableSlots,
  getMedicalHistory,
};