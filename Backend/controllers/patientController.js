
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const moment = require('moment');
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
  if (!user._id) {
    throw new Error('User ID is undefined');
  }
  if (!process.env.JWT_KEY) {
    throw new Error('JWT_KEY is not defined');
  }
  console.log('[generateToken] Generating token for user:', user._id);
  return jwt.sign({ id: user._id }, process.env.JWT_KEY, { expiresIn: '7d' });
};

// Register user
const registerUser = async (req, res) => {
  try {
    console.log('[registerUser] Request body:', req.body);
    const { error } = registerSchema.validate(req.body);
    if (error) {
      console.log('[registerUser] Validation error:', error.details[0].message);
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { email, password, name } = req.body;

    const existingUser = await patientModel.findOne({ email });
    if (existingUser) {
      console.log('[registerUser] Email already used:', email);
      return res.status(400).json({ success: false, message: 'Email đã được sử dụng' });
    }

    console.log('[registerUser] Creating new user:', email);
    const user = await patientModel.create({ email, password, name });

    let token;
    try {
      token = generateToken(user);
      console.log('[registerUser] Token generated:', token);
    } catch (tokenError) {
      console.error('[registerUser] Token generation error:', {
        message: tokenError.message,
        stack: tokenError.stack,
      });
      return res.status(500).json({ success: false, message: `Lỗi tạo token: ${tokenError.message}` });
    }

    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });

    console.log('[registerUser] User registered successfully:', user._id);
    return res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      data: { token, user: { id: user._id, name, email } },
    });
  } catch (error) {
    console.error('[registerUser] Error:', {
      message: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
};

// Login user
const loginUser = async (req, res) => {
  try {
    console.log('[loginUser] Request body:', req.body);
    const { error } = loginSchema.validate(req.body, { abortEarly: false });
    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join(", ");
      console.log('[loginUser] Validation error:', errorMessage);
      return res.status(400).json({ success: false, message: `Dữ liệu không hợp lệ: ${errorMessage}` });
    }

    const { email, password } = req.body;

    console.log('[loginUser] Finding user with email:', email);
    const user = await patientModel.findOne({ email }).select("+password");
    if (!user) {
      console.log('[loginUser] User not found:', email);
      return res.status(401).json({ success: false, message: "Email không tồn tại" });
    }

    console.log('[loginUser] Comparing password for user:', user._id);
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('[loginUser] Password mismatch for user:', user._id);
      return res.status(401).json({ success: false, message: "Mật khẩu không đúng" });
    }

    console.log('[loginUser] Generating token for user:', user._id);
    let token;
    try {
      token = generateToken(user);
      console.log('[loginUser] Token generated:', token);
    } catch (tokenError) {
      console.error('[loginUser] Token generation error:', {
        message: tokenError.message,
        stack: tokenError.stack,
      });
      return res.status(500).json({ success: false, message: `Lỗi tạo token: ${tokenError.message}` });
    }

    console.log('[loginUser] Setting cookie for token');
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    };
    res.cookie("token", token, cookieOptions);

    console.log('[loginUser] Sending response for user:', user._id);
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
    console.error('[loginUser] Error:', {
      message: error.message,
      stack: error.stack,
    });
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
    if (error) {
      console.log('[updateProfile] Validation error:', error.details[0].message);
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { name, email, phoneNumber, password, address } = req.body;
    const userId = req.user.id;

    const user = await patientModel.findById(userId);
    if (!user) {
      console.warn('[updateProfile] User not found:', userId);
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    if (email && email !== user.email) {
      const existingUser = await patientModel.findOne({ email });
      if (existingUser) {
        console.log('[updateProfile] Email already used:', email);
        return res.status(400).json({ success: false, message: 'Email đã được sử dụng' });
      }
      user.email = email;
    }

    if (password) user.password = await bcrypt.hash(password, 10);
    if (name) user.name = name;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (address) user.address = address;

    await user.save();

    const imageUrl = user.image ? `${req.protocol}://${req.get('host')}/images${user.image}?t=${Date.now()}` : null;

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
    console.error('[updateProfile] Error:', {
      message: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ success: false, message: 'Lỗi cập nhật hồ sơ', error: error.message });
  }
};

// Update profile image
const updateProfileImage = async (req, res) => {
  try {
    const userId = req.user.id;
    const image = req.file;

    if (!image) {
      console.warn('[updateProfileImage] No image provided');
      return res.status(400).json({ success: false, message: 'Vui lòng chọn một file ảnh' });
    }

    const user = await patientModel.findById(userId);
    if (!user) {
      console.warn('[updateProfileImage] User not found:', userId);
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    // Delete old image if exists
    if (user.image) {
      const oldImagePath = path.join(__dirname, '..', 'public', user.image);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
        console.log('[updateProfileImage] Deleted old image:', oldImagePath);
      }
    }

    user.image = `/images/uploads/misc/${image.filename}`;
    await user.save();

    const imageUrl = user.image ? `${req.protocol}://${req.get('host')}${user.image}?t=${Date.now()}` : null;

    return res.status(200).json({
      success: true,
      message: 'Cập nhật ảnh đại diện thành công',
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
    console.error('[updateProfileImage] Error:', {
      message: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ success: false, message: 'Lỗi cập nhật ảnh đại diện', error: error.message });
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
    const imageUrl = user.image ? `${req.protocol}://${req.get('host')}/images${user.image}?t=${Date.now()}` : null;
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
    console.log('[bookAppointment] Request body:', req.body);
    const { error } = bookAppointmentSchema.validate(req.body);
    if (error) {
      console.warn('[bookAppointment] Validation error:', error.details[0].message);
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    // Check if user is authenticated
    if (!req.user?.id) {
      console.error('[bookAppointment] No user ID in request');
      return res.status(401).json({ success: false, message: 'Không xác thực được người dùng' });
    }

    const { doctorId, appointmentDate, timeslot, notes } = req.body;
    const patientId = req.user.id;

    console.log('[bookAppointment] Parameters:', { doctorId, appointmentDate, timeslot, notes, patientId });

    if (!mongoose.Types.ObjectId.isValid(doctorId) || !mongoose.Types.ObjectId.isValid(patientId)) {
      console.warn('[bookAppointment] Invalid ID:', { doctorId, patientId });
      return res.status(400).json({ success: false, message: 'ID bác sĩ hoặc bệnh nhân không hợp lệ' });
    }

    const doctor = await doctorModel.findById(doctorId);
    if (!doctor) {
      console.log('[bookAppointment] Doctor not found:', doctorId);
      return res.status(404).json({ success: false, message: 'Bác sĩ không tồn tại' });
    }

    const selectedDate = moment.tz(appointmentDate, 'YYYY-MM-DD', 'Asia/Ho_Chi_Minh').startOf('day');
    if (selectedDate.isBefore(moment().tz('Asia/Ho_Chi_Minh').startOf('day'))) {
      console.warn('[bookAppointment] Past date:', appointmentDate);
      return res.status(400).json({ success: false, message: 'Không thể đặt lịch hẹn trong quá khứ' });
    }

    const startOfDay = selectedDate.clone().utc().toDate();
    const endOfDay = selectedDate.clone().endOf('day').utc().toDate();

    console.log('[bookAppointment] Date range:', { startOfDay, endOfDay });

    const schedule = await scheduleModel.findOne({
      doctorId: new mongoose.Types.ObjectId(doctorId),
      'availability.date': { $gte: startOfDay, $lte: endOfDay },
    });

    if (!schedule) {
      console.log('[bookAppointment] No schedule found for date:', appointmentDate, 'doctorId:', doctorId);
      return res.status(400).json({ success: false, message: 'Bác sĩ không làm việc vào ngày này' });
    }

    const daysMap = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const dayOfWeek = daysMap[selectedDate.day()];
    console.log('[bookAppointment] Day of week:', dayOfWeek);

    const availability = schedule.availability.find(
      (avail) => avail.day === dayOfWeek && moment(avail.date).utc().isSame(selectedDate, 'day')
    );

    if (!availability || !availability.isAvailable) {
      console.log('[bookAppointment] No availability for day:', dayOfWeek, 'date:', appointmentDate);
      return res.status(400).json({ success: false, message: 'Bác sĩ không làm việc vào ngày này' });
    }

    const timeSlot = availability.timeSlots.find((slot) => slot.time === timeslot && !slot.isBooked);
    if (!timeSlot) {
      console.warn('[bookAppointment] Invalid or booked timeslot:', timeslot);
      return res.status(400).json({ success: false, message: 'Khung giờ không hợp lệ hoặc đã được đặt' });
    }

    const existingAppointment = await appointmentModel.findOne({
      doctorId,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
      timeslot,
      status: { $ne: 'cancelled' },
    });
    if (existingAppointment) {
      console.warn('[bookAppointment] Timeslot already booked:', timeslot);
      return res.status(400).json({ success: false, message: 'Khung giờ này đã được đặt' });
    }

    timeSlot.isBooked = true;
    timeSlot.patientId = new mongoose.Types.ObjectId(patientId);
    await schedule.save();
    console.log('[bookAppointment] Schedule updated with booked slot');

    const appointment = await appointmentModel.create({
      patientId: new mongoose.Types.ObjectId(patientId),
      doctorId: new mongoose.Types.ObjectId(doctorId),
      appointmentDate: selectedDate.toDate(),
      timeslot,
      notes: notes || '',
      status: 'pending',
    });
    console.log('[bookAppointment] Appointment created:', appointment._id);

    return res.status(201).json({
      success: true,
      message: 'Đặt lịch hẹn thành công',
      data: appointment,
    });
  } catch (error) {
    console.error('[bookAppointment] Detailed Error:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name,
      request: req.body,
      patientId: req.user?.id || 'undefined', // Safely handle patientId
    });
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

    // Parse timeslot (e.g., "09:00-10:00" -> start time "09:00")
    const [startTime] = appointment.timeslot.split('-'); // Get "09:00"
    const [hours, minutes] = startTime.split(':').map(Number); // Parse hours and minutes

    // Normalize appointment date and time to Asia/Ho_Chi_Minh
    const appointmentDateTime = moment.tz(appointment.appointmentDate, 'Asia/Ho_Chi_Minh')
      .set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });

    // Current time in Asia/Ho_Chi_Minh
    const currentDateTime = moment.tz('Asia/Ho_Chi_Minh');

    console.log('[cancelAppointment] Appointment DateTime:', appointmentDateTime.toISOString());
    console.log('[cancelAppointment] Current DateTime:', currentDateTime.toISOString());

    // Check if appointment is in the past
    if (appointmentDateTime.isBefore(currentDateTime)) {
      console.warn('[cancelAppointment] Past appointment:', {
        appointmentDateTime: appointmentDateTime.format(),
        currentDateTime: currentDateTime.format(),
      });
      return res.status(400).json({ success: false, message: 'Không thể hủy lịch hẹn đã qua' });
    }

    // Mark appointment as cancelled
    appointment.status = 'cancelled';
    await appointment.save();

    // Update schedule
    const selectedDate = moment.tz(appointment.appointmentDate, 'Asia/Ho_Chi_Minh');
    const daysMap = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const dayOfWeek = daysMap[selectedDate.day()];
    console.log('[cancelAppointment] Day of week:', dayOfWeek);

    const schedule = await scheduleModel.findOne({ doctorId: appointment.doctorId });
    if (schedule) {
      const availability = schedule.availability.find(
        (avail) => avail.day === dayOfWeek && moment(avail.date).utc().isSame(selectedDate, 'day')
      );
      if (availability) {
        const timeSlot = availability.timeSlots.find((slot) => slot.time === appointment.timeslot);
        if (timeSlot) {
          timeSlot.isBooked = false;
          timeSlot.patientId = null;
          await schedule.save();
          console.log('[cancelAppointment] Timeslot updated:', appointment.timeslot);
        } else {
          console.warn('[cancelAppointment] Không tìm thấy khung giờ:', appointment.timeslot);
        }
      } else {
        console.warn('[cancelAppointment] Không tìm thấy tính khả dụng cho ngày:', dayOfWeek);
      }
    } else {
      console.warn('[cancelAppointment] Không tìm thấy lịch hẹn cho bác sĩ:', appointment.doctorId);
    }

    return res.status(200).json({
      success: true,
      message: 'Hủy lịch hẹn thành công',
      data: appointment,
    });
  } catch (error) {
    console.error('[cancelAppointment] Error:', {
      message: error.message,
      stack: error.stack,
      appointmentId,
      patientId,
    });
    return res.status(500).json({ success: false, message: 'Lỗi hủy lịch hẹn', error: error.message });
  }
};

// Get appointment by ID
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

// Get public doctor data
const getPublicDoctorData = async (req, res) => {
  try {
    const doctorId = req.params.doctorId || req.params.id; // Support both :doctorId and :id
    console.log('[getPublicDoctorData] Received doctorId:', doctorId);

    if (!doctorId) {
      console.warn('[getPublicDoctorData] No doctorId provided in request');
      return res.status(400).json({ success: false, message: 'ID bác sĩ không được cung cấp' });
    }

    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      console.warn('[getPublicDoctorData] Invalid doctorId format:', doctorId);
      return res.status(400).json({ success: false, message: 'ID bác sĩ không hợp lệ' });
    }

    const doctor = await doctorModel
      .findById(doctorId)
      .select('name specialty image')
      .populate('specialty', 'name');

    if (!doctor) {
      console.log('[getPublicDoctorData] Doctor not found for ID:', doctorId);
      return res.status(404).json({ success: false, message: 'Bác sĩ không tồn tại' });
    }

    const transformedDoctor = {
      ...doctor.toObject(),
      specialty: doctor.specialty?.name || doctor.specialty || 'Không xác định',
    };

    res.status(200).json({ success: true, data: transformedDoctor });
  } catch (error) {
    console.error('[getPublicDoctorData] Error fetching doctor profile:', {
      message: error.message,
      stack: error.stack,
      doctorId,
    });
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
};

// Get available slots
const getAvailableSlots = async (req, res) => {
  try {
    const { docId } = req.params;
    const { date } = req.query;
    console.log('[getAvailableSlots] Request:', { docId, date });

    if (!mongoose.Types.ObjectId.isValid(docId)) {
      console.warn('[getAvailableSlots] Invalid docId:', docId);
      return res.status(400).json({ success: false, message: 'ID bác sĩ không hợp lệ' });
    }

    if (!date || !moment(date, 'YYYY-MM-DD', true).isValid()) {
      console.warn('[getAvailableSlots] Invalid date:', date);
      return res.status(400).json({ success: false, message: 'Ngày không hợp lệ' });
    }

    const doctor = await doctorModel.findById(docId);
    if (!doctor) {
      console.log('[getAvailableSlots] Doctor not found:', docId);
      return res.status(404).json({ success: false, message: 'Bác sĩ không tồn tại' });
    }

    const selectedDate = moment.tz(date, 'YYYY-MM-DD', 'Asia/Ho_Chi_Minh').startOf('day');
    const startOfDay = selectedDate.clone().utc().toDate();
    const endOfDay = selectedDate.clone().endOf('day').utc().toDate();

    console.log('[getAvailableSlots] Date range:', { startOfDay, endOfDay });

    const schedule = await scheduleModel.findOne({
      doctorId: new mongoose.Types.ObjectId(docId),
      'availability.date': { $gte: startOfDay, $lte: endOfDay },
    });

    if (!schedule) {
      console.log('[getAvailableSlots] No schedule found for date:', date, 'doctorId:', docId);
      return res.status(200).json({ success: true, data: [], message: 'Bác sĩ không làm việc vào ngày này' });
    }

    console.log('[getAvailableSlots] Schedule found:', schedule.availability);

    const daysMap = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const dayOfWeek = daysMap[moment.tz(date, 'Asia/Ho_Chi_Minh').day()];
    console.log('[getAvailableSlots] Day of week:', dayOfWeek);

    const availability = schedule.availability.find(
      (avail) => avail.day === dayOfWeek && moment(avail.date).utc().isSame(selectedDate, 'day')
    );

    if (!availability || !availability.isAvailable) {
      console.log('[getAvailableSlots] No availability for day:', dayOfWeek, 'date:', date, 'availability:', availability);
      return res.status(200).json({ success: true, data: [], message: 'Bác sĩ không làm việc vào ngày này' });
    }

    console.log('[getAvailableSlots] Availability found:', availability);

    const bookedSlots = await appointmentModel
      .find({
        doctorId: docId,
        appointmentDate: { $gte: startOfDay, $lte: endOfDay },
        status: { $ne: 'cancelled' },
      })
      .select('timeslot');

    const bookedTimes = bookedSlots.map((slot) => slot.timeslot);
    console.log('[getAvailableSlots] Booked times:', bookedTimes);

    const availableSlots = availability.timeSlots
      .filter((slot) => !bookedTimes.includes(slot.time) && !slot.isBooked && slot.isAvailable)
      .map((slot) => ({ time: slot.time }));

    console.log('[getAvailableSlots] Available slots:', availableSlots);
    return res.status(200).json({
      success: true,
      message: availableSlots.length ? 'Lấy khung giờ thành công' : 'Không có khung giờ trống',
      data: availableSlots,
    });
  } catch (error) {
    console.error('[getAvailableSlots] Error:', {
      message: error.message,
      stack: error.stack,
      docId,
      date,
    });
    return res.status(500).json({ success: false, message: 'Lỗi lấy khung giờ', error: error.message });
  }
};

// Get medical history
const getMedicalHistory = async (req, res) => {
  try {
    const patientId = req.user.id;
    console.log('[getMedicalHistory] Fetching medical history for patientId:', patientId);

    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      console.warn('[getMedicalHistory] Invalid patientId:', patientId);
      return res.status(400).json({ success: false, message: 'ID bệnh nhân không hợp lệ' });
    }

    const medicalHistory = await medicalHistoryModel
      .find({ patient: patientId })
      .populate({
        path: 'patient',
        select: 'name email',
      })
      .populate({
        path: 'doctor',
        select: 'name',
      })
      .populate({
        path: 'appointmentId',
        select: 'appointmentDate timeslot',
      })
      .sort({ date: -1 })
      .lean();

    if (!medicalHistory.length) {
      console.log('[getMedicalHistory] No medical history found for patientId:', patientId);
      return res.status(200).json({
        success: true,
        message: 'Không tìm thấy lịch sử y tế',
        data: [],
      });
    }

    const formattedHistory = medicalHistory.map((record) => ({
      _id: record._id,
      patientId: record.patient?._id || null,
      patientName: record.patient?.name || 'Không xác định',
      patientEmail: record.patient?.email || 'Không xác định',
      doctorId: record.doctor?._id || null,
      doctorName: record.doctor?.name || 'Không xác định',
      appointmentId: record.appointmentId?._id || null,
      appointmentDate: record.appointmentId?.appointmentDate
        ? moment.tz(record.appointmentId.appointmentDate, 'Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm')
        : 'Không xác định',
      timeslot: record.appointmentId?.timeslot || 'Không xác định',
      diagnosis: record.diagnosis || 'Không có thông tin',
      treatment: record.treatment || 'Không có thông tin',
      date: moment.tz(record.date, 'Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm'),
    }));

    console.log('[getMedicalHistory] Formatted medical history:', formattedHistory);
    return res.status(200).json({
      success: true,
      message: 'Lấy lịch sử y tế thành công',
      data: formattedHistory,
    });
  } catch (error) {
    console.error('[getMedicalHistory] Error:', {
      message: error.message,
      stack: error.stack,
      patientId: req.user.id,
    });
    return res.status(500).json({ success: false, message: 'Lỗi lấy lịch sử y tế', error: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  logout,
  updateProfile,
  updateProfileImage,
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
  getPublicDoctorData,
  getAvailableSlots,
  getMedicalHistory,
};
