const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const moment = require("moment-timezone");
const doctorModel = require("../models/doctor.model");
const specialtyModel = require("../models/specialty.model");
const reviewModel = require("../models/review.model");
const appointmentModel = require("../models/appointment.model");
const scheduleModel = require("../models/schedule.model");
const medicalHistoryModel = require("../models/medicalHistory.model");
const patientModel = require("../models/patient.model");

const getMySchedule = async (req, res) => {
  try {
    const doctorId = req.user?.id;
    const { weekStartDate } = req.query;

    if (!doctorId) {
      return res.status(401).json({ success: false, message: 'Không được phép: Thiếu ID bác sĩ.' });
    }

    if (!weekStartDate) {
      return res.status(400).json({ success: false, message: 'Thiếu tham số ngày bắt đầu tuần.' });
    }

    const startOfWeek = moment.tz(weekStartDate, 'Asia/Ho_Chi_Minh').startOf('week').toDate();

    const schedule = await scheduleModel
      .findOne({
        doctorId: new mongoose.Types.ObjectId(doctorId),
        weekStartDate: startOfWeek,
      })
      .populate('doctorId', 'name email');

    if (!schedule) {
      return res.status(200).json({
        success: true,
        message: 'Không tìm thấy lịch làm việc cho tuần này.',
        data: null,
      });
    }

    const formattedSchedule = {
      _id: schedule._id,
      doctorId: schedule.doctorId,
      weekStartDate: schedule.weekStartDate,
      weekNumber: schedule.weekNumber,
      year: schedule.year,
      availability: schedule.availability.map((item) => ({
        day: item.day,
        date: item.date,
        isAvailable: item.isAvailable,
        timeSlots: item.timeSlots.map((slot) => ({
          _id: slot._id,
          time: slot.time,
          isBooked: slot.isBooked,
          isAvailable: slot.isAvailable,
          patientId: slot.patientId,
        })),
      })),
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt,
    };

    res.status(200).json({ success: true, data: formattedSchedule });
  } catch (error) {
    console.error('Lỗi khi lấy lịch làm việc:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.', error: error.message });
  }
};

const loginDoctor = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email và mật khẩu là bắt buộc." });
    }

    const doctor = await doctorModel.findOne({ email });

    if (!doctor) {
      return res.status(401).json({ message: "Thông tin đăng nhập không hợp lệ." });
    }

    const isMatch = await bcrypt.compare(password, doctor.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Thông tin đăng nhập không hợp lệ." });
    }

    if (!process.env.JWT_KEY) {
      throw new Error("Khóa JWT_SECRET_KEY chưa được định nghĩa trong biến môi trường.");
    }

    const token = jwt.sign(
      { id: doctor._id, role: "doctor" },
      process.env.JWT_KEY
    );
    res.status(200).json({ message: "Đăng nhập thành công.", token });
  } catch (error) {
    console.error("Lỗi trong quá trình đăng nhập bác sĩ:", error);
    res.status(500).json({ message: "Lỗi máy chủ.", error: error.message });
  }
};

const getAllDoctors = async (req, res) => {
  try {
    const doctors = await doctorModel.find().populate('specialty');
    res.status(200).json({ success: true, data: doctors });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách bác sĩ:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ.", error: error.message });
  }
};

const deleteDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const doctor = await doctorModel.findByIdAndDelete(id);
    if (!doctor) {
      return res.status(404).json({ message: "Không tìm thấy bác sĩ." });
    }
    res.status(200).json({ message: "Xóa bác sĩ thành công.", doctor });
  } catch (error) {
    console.error("Lỗi khi xóa bác sĩ:", error);
    res.status(500).json({ message: "Lỗi máy chủ.", error: error.message });
  }
};

const addManyDoctors = async (req, res) => {
  try {
    if (!Array.isArray(req.body) || req.body.length === 0) {
      return res.status(400).json({ error: "Dữ liệu không hợp lệ: Yêu cầu một mảng danh sách bác sĩ." });
    }

    const bulkOps = req.body.map((doc) => ({
      updateOne: {
        filter: { email: doc.email },
        update: { $set: doc },
        upsert: true,
      },
    }));

    const result = await doctorModel.bulkWrite(bulkOps);
    res.status(201).json({ message: "Thêm/cập nhật danh sách bác sĩ thành công.", result });
  } catch (error) {
    console.error("Lỗi khi thêm/cập nhật danh sách bác sĩ:", error);
    res.status(500).json({ error: "Không thể thêm/cập nhật danh sách bác sĩ.", details: error.message });
  }
};

const getDoctorData = async (req, res) => {
  try {
    const doctorId = req.params.id;
    console.log('[getDoctorData] Fetching profile for doctorId:', doctorId);
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({ success: false, message: 'ID bác sĩ không hợp lệ' });
    }
    const doctor = await doctorModel
      .findById(doctorId)
      .select('-password')
      .populate('specialty', 'name');
    if (!doctor) {
      console.log('[getDoctorData] Doctor not found:', doctorId);
      return res.status(404).json({ success: false, message: 'Bác sĩ không tồn tại' });
    }
    const doctorData = {
      ...doctor.toObject(),
      image: doctor.image || null, // Return filename or null
      specialty: doctor.specialty?._id.toString() || '',
      specialtyName: doctor.specialty?.name || 'Không xác định',
    };
    console.log('[getDoctorData] Profile fetched successfully:', doctorData);
    return res.status(200).json({ success: true, data: doctorData });
  } catch (error) {
    console.error('[getDoctorData] Error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi lấy hồ sơ bác sĩ', error: error.message });
  }
};

const getDoctorRating = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await reviewModel.aggregate([
      { $match: { doctorId: new mongoose.Types.ObjectId(id) } },
      {
        $group: {
          _id: "$doctorId",
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    if (result.length > 0) {
      res.status(200).json({
        averageRating: result[0].averageRating.toFixed(1),
        totalReviews: result[0].totalReviews,
      });
    } else {
      res.status(200).json({ averageRating: "0", totalReviews: 0 });
    }
  } catch (error) {
    console.error("Lỗi khi tính điểm đánh giá trung bình:", error);
    res.status(500).json({ message: "Lỗi máy chủ.", error: error.message });
  }
};

const getAllDoctorRatings = async (req, res) => {
  console.log("Truy cập endpoint /doctor/all-ratings");
  try {
    const ratings = await reviewModel.aggregate([
      {
        $group: {
          _id: "$doctorId",
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 1,
          averageRating: { $round: ["$averageRating", 1] },
          totalReviews: 1,
        },
      },
    ]);

    console.log("Danh sách đánh giá đã lấy:", ratings);

    if (!ratings || ratings.length === 0) {
      return res.status(200).json([]);
    }

    res.status(200).json(ratings);
  } catch (error) {
    console.error("Lỗi khi lấy đánh giá bác sĩ:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    res.status(500).json({
      message: "Không thể lấy danh sách đánh giá bác sĩ.",
      error: error.message,
    });
  }
};

const getAllAppointments = async (req, res) => {
  try {
    const appointments = await appointmentModel.find()
      .populate('patientId', 'name email phoneNumber')
      .populate('doctorId', 'name specialty');
    res.status(200).json({ success: true, data: appointments });
  } catch (error) {
    console.error('Lỗi khi lấy tất cả lịch hẹn:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.', error: error.message });
  }
};

const getMyAppointments = async (req, res) => {
  try {
    const doctorId = req.user?.id;
    if (!doctorId) {
      return res.status(401).json({ success: false, message: "Không được phép: Thiếu ID bác sĩ." });
    }

    const doctorAppointments = await appointmentModel
      .find({ doctorId: new mongoose.Types.ObjectId(doctorId) })
      .populate("patientId", "name email phoneNumber image")
      .populate({
        path: "doctorId",
        select: "name specialty",
        populate: { path: "specialty", select: "name" },
      })
      .sort({ appointmentDate: 1 });

    const formattedAppointments = doctorAppointments.map((appt) => ({
      _id: appt._id,
      patientName: appt.patientId?.name || "Không xác định",
      patientEmail: appt.patientId?.email || "",
      patientPhone: appt.patientId?.phoneNumber || "N/A",
      patientImage: appt.patientId?.image || "",
      doctorName: appt.doctorId?.name || "N/A",
      doctorSpecialization: appt.doctorId?.specialty?.name || "N/A",
      appointmentDate: moment.tz(appt.appointmentDate, 'Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm'),
      timeslot: appt.timeslot || "N/A",
      status: appt.status || "pending",
      notes: appt.notes || "",
      createdAt: moment.tz(appt.createdAt, 'Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm'),
    }));

    res.status(200).json({ success: true, data: formattedAppointments });
  } catch (error) {
    console.error("Lỗi khi lấy lịch hẹn:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ.", error: error.message });
  }
};

const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const doctorId = req.user?.id;

    console.log('Cập nhật lịch hẹn:', { id, status, notes, doctorId });

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "ID lịch hẹn không hợp lệ." });
    }

    if (!doctorId) {
      return res.status(401).json({ success: false, message: "Không được phép: Thiếu ID bác sĩ." });
    }

    const appointment = await appointmentModel.findById(id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Không tìm thấy lịch hẹn." });
    }

    if (appointment.doctorId.toString() !== doctorId) {
      return res.status(403).json({ success: false, message: "Không được phép: Bạn chỉ có thể cập nhật lịch hẹn của mình." });
    }

    const validStatuses = ["pending", "completed", "cancelled"];
    if (status && !validStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({ success: false, message: "Trạng thái không hợp lệ." });
    }

    const updateData = {};
    if (status) updateData.status = status.toLowerCase();
    if (notes) updateData.notes = notes.trim();

    const updatedAppointment = await appointmentModel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("patientId", "name email phoneNumber image")
      .populate({
        path: "doctorId",
        select: "name specialty",
        populate: { path: "specialty", select: "name" },
      });

    res.status(200).json({
      success: true,
      message: "Cập nhật lịch hẹn thành công.",
      appointment: {
        _id: updatedAppointment._id,
        patientName: updatedAppointment.patientId?.name || "Không xác định",
        patientEmail: updatedAppointment.patientId?.email || "",
        patientPhone: updatedAppointment.patientId?.phoneNumber || "N/A",
        patientImage: updatedAppointment.patientId?.image || "",
        doctorName: updatedAppointment.doctorId?.name || "N/A",
        doctorSpecialization: updatedAppointment.doctorId?.specialty?.name || "N/A",
        appointmentDate: updatedAppointment.appointmentDate,
        timeslot: updatedAppointment.timeslot,
        status: updatedAppointment.status,
        notes: updatedAppointment.notes || "",
        createdAt: updatedAppointment.createdAt,
      },
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật lịch hẹn:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ.", error: error.message });
  }
};

const getAllReviews = async (req, res) => {
  try {
    const doctorId = req.user?.id;
    if (!doctorId) {
      return res.status(401).json({ success: false, message: "Không được phép: Thiếu ID bác sĩ." });
    }

    const allReviews = await reviewModel
      .find({ doctorId: new mongoose.Types.ObjectId(doctorId) })
      .populate("patientId", "name email image")
      .populate("doctorId", "name");
    res.status(200).json(allReviews);
  } catch (error) {
    console.error("Lỗi khi lấy đánh giá:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ.", error: error.message });
  }
};

const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const doctorId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID lịch hẹn không hợp lệ." });
    }

    if (!doctorId) {
      return res.status(401).json({ message: "Không được phép: Thiếu ID bác sĩ." });
    }

    const appointment = await appointmentModel.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: "Không tìm thấy lịch hẹn." });
    }

    if (appointment.doctorId.toString() !== doctorId) {
      return res.status(403).json({ message: "Không được phép: Bạn chỉ có thể xóa lịch hẹn của mình." });
    }

    const reviewCount = await reviewModel.countDocuments({ appointmentId: id });
    if (reviewCount > 0) {
      return res.status(400).json({ message: "Không thể xóa lịch hẹn đã có đánh giá liên quan." });
    }

    const schedule = await scheduleModel.findOne({
      doctorId: new mongoose.Types.ObjectId(doctorId),
      date: {
        $gte: new Date(appointment.appointmentDate.setHours(0, 0, 0, 0)),
        $lte: new Date(appointment.appointmentDate.setHours(23, 59, 59, 999)),
      },
    });

    if (schedule) {
      const timeSlot = schedule.timeSlots.find(
        (slot) => slot.time === appointment.timeslot.split('-')[0] && slot.patientId?.toString() === appointment.patientId.toString()
      );
      if (timeSlot) {
        timeSlot.isBooked = false;
        timeSlot.patientId = null;
        await schedule.save();
      }
    }

    await appointmentModel.findByIdAndDelete(id);
    res.status(200).json({ message: "Xóa lịch hẹn thành công." });
  } catch (error) {
    console.error("Lỗi khi xóa lịch hẹn:", error);
    res.status(500).json({ message: "Lỗi máy chủ.", error: error.message });
  }
};

const getId = async (req, res) => {
  try {
    const doctorId = req.user?.id;
    console.log('[getId] Fetching ID for user:', { doctorId });
    if (!doctorId) {
      console.warn('[getId] Missing doctorId in req.user');
      return res.status(401).json({ success: false, message: "Không được phép: Thiếu ID bác sĩ." });
    }
    console.log('[getId] Sending response:', { success: true, id: doctorId });
    res.status(200).json({ success: true, id: doctorId });
  } catch (error) {
    console.error('[getId] Error:', error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ.", error: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { specialty, experience, fees, about, phone, location } = req.body;
    console.log('[updateProfile] Updating doctor:', { id, specialty, experience, fees, about, phone, location });

    // Validate specialty
    if (specialty && !mongoose.Types.ObjectId.isValid(specialty)) {
      return res.status(400).json({ success: false, message: 'Chuyên khoa không hợp lệ' });
    }
    if (specialty) {
      const specialtyExists = await specialtyModel.findById(specialty);
      if (!specialtyExists) {
        return res.status(400).json({ success: false, message: 'Chuyên khoa không tồn tại' });
      }
    }

    // Build update data
    const updateData = {
      ...(specialty && { specialty }),
      ...(experience !== undefined && { experience: Number(experience) }),
      ...(fees !== undefined && { fees: Number(fees) }),
      ...(about && { about: about.trim() }),
      ...(phone !== undefined && { phone: phone.trim() }),
      ...(location !== undefined && { location: location.trim() }),
    };

    const updatedDoctor = await doctorModel
      .findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      })
      .select('-password')
      .populate('specialty', 'name');

    if (!updatedDoctor) {
      console.warn('[updateProfile] Doctor not found:', id);
      return res.status(404).json({ success: false, message: 'Bác sĩ không tồn tại' });
    }

    const doctorData = {
      ...updatedDoctor.toObject(),
      specialty: updatedDoctor.specialty?._id.toString() || '',
      specialtyName: updatedDoctor.specialty?.name || 'Không xác định',
    };

    console.log('[updateProfile] Updated doctor:', doctorData);
    res.status(200).json({ success: true, updatedProfile: doctorData });
  } catch (error) {
    console.error('[updateProfile] Error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
    }
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
};

const uploadImage = async (req, res) => {
  try {
    const doctorId = req.params.id;
    console.log('[uploadImage] Uploading image for doctorId:', doctorId);
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({ success: false, message: 'ID bác sĩ không hợp lệ' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Không có tệp được tải lên' });
    }
    const doctor = await doctorModel.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Bác sĩ không tồn tại' });
    }
    const imagePath = req.file.filename; // Store only the filename
    doctor.image = imagePath;
    await doctor.save();
    console.log('[uploadImage] Image uploaded successfully:', imagePath);
    return res.status(200).json({ success: true, imageUrl: imagePath }); // Return filename only
  } catch (error) {
    console.error('[uploadImage] Error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi tải ảnh lên', error: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    const doctorId = req.user?.id;

    if (!doctorId) {
      return res.status(401).json({ message: "Không được phép: Thiếu ID bác sĩ." });
    }

    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "Vui lòng điền đầy đủ các trường thông tin." });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Mật khẩu mới và xác nhận mật khẩu không khớp." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự." });
    }

    const doctor = await doctorModel.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: "Không tìm thấy bác sĩ." });
    }

    const isMatch = await bcrypt.compare(oldPassword, doctor.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Mật khẩu cũ không đúng." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    doctor.password = hashedPassword;
    await doctor.save();

    console.log("Đã đổi mật khẩu cho bác sĩ:", doctor.email);
    res.status(200).json({ message: "Đổi mật khẩu thành công." });
  } catch (error) {
    console.error("Lỗi khi đổi mật khẩu:", error.message, error.stack);
    res.status(500).json({ message: "Lỗi máy chủ.", error: error.message });
  }
};

const getPublicDoctors = async (req, res) => {
  try {
    console.log("Đang lấy danh sách bác sĩ công khai...");
    const doctors = await doctorModel.find()
      .select("_id name specialty experience image averageRating totalReviews email location fees about phone")
      .populate({
        path: "specialty",
        select: "name",
        model: specialtyModel,
      });
    console.log("Danh sách bác sĩ công khai:", doctors);
    res.json({ success: true, data: doctors });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách bác sĩ công khai:", error.message, error.stack);
    res.status(500).json({ success: false, message: "Lỗi khi lấy danh sách bác sĩ công khai.", error: error.message });
  }
};

const getPublicDoctorData = async (req, res) => {
  const doctorId = req.params.doctorId;
  try {
    console.log('[getPublicDoctorData] Nhận ID bác sĩ:', doctorId);
    console.log('[getPublicDoctorData] Chi tiết ID bác sĩ:', {
      raw: doctorId,
      length: doctorId?.length,
      isHex: /^[0-9a-fA-F]{24}$/.test(doctorId),
      isValidObjectId: mongoose.Types.ObjectId.isValid(doctorId),
    });

    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      console.warn('[getPublicDoctorData] ID bác sĩ không hợp lệ:', doctorId);
      return res.status(400).json({ success: false, message: 'ID bác sĩ không hợp lệ.' });
    }

    const doctor = await doctorModel
      .findById(doctorId)
      .select('name specialty image')
      .populate('specialty', 'name');

    if (!doctor) {
      console.log('[getPublicDoctorData] Không tìm thấy bác sĩ với ID:', doctorId);
      return res.status(404).json({ success: false, message: 'Bác sĩ không tồn tại.' });
    }

    const transformedDoctor = {
      ...doctor.toObject(),
      specialty: doctor.specialty?.name || doctor.specialty || 'Không xác định',
    };

    res.status(200).json({ success: true, data: transformedDoctor });
  } catch (error) {
    console.error('[getPublicDoctorData] Lỗi khi lấy hồ sơ bác sĩ:', {
      message: error.message,
      stack: error.stack,
      doctorId: doctorId || 'undefined',
    });
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.', error: error.message });
  }
};

const createMedicalHistory = async (req, res) => {
  try {
    const { appointmentId, diagnosis, treatment } = req.body;
    const doctorId = req.user?.id;

    if (!doctorId) {
      return res.status(401).json({ success: false, message: "Không được phép: Thiếu ID bác sĩ." });
    }

    if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
      return res.status(400).json({ success: false, message: "ID lịch hẹn không hợp lệ." });
    }

    if (!diagnosis || !treatment) {
      return res.status(400).json({ success: false, message: "Chẩn đoán và phương pháp điều trị là bắt buộc." });
    }

    const appointment = await appointmentModel.findById(appointmentId).populate("patientId", "name email");
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Không tìm thấy lịch hẹn." });
    }

    if (appointment.doctorId.toString() !== doctorId) {
      return res.status(403).json({ success: false, message: "Không được phép: Bạn chỉ có thể thêm bệnh án cho lịch hẹn của mình." });
    }

    if (appointment.status !== "completed") {
      return res.status(400).json({ success: false, message: "Chỉ có thể tạo bệnh án cho các cuộc hẹn đã hoàn thành." });
    }

    const existingMedicalHistory = await medicalHistoryModel.findOne({ appointmentId });
    if (existingMedicalHistory) {
      return res.status(400).json({ success: false, message: "Bệnh án cho cuộc hẹn này đã tồn tại." });
    }

    const medicalHistory = new medicalHistoryModel({
      patient: appointment.patientId._id,
      doctor: doctorId,
      appointmentId,
      diagnosis: diagnosis.trim(),
      treatment: treatment.trim(),
      date: new Date(),
    });

    await medicalHistory.save();

    res.status(201).json({
      success: true,
      message: "Thêm bệnh án thành công.",
      data: {
        _id: medicalHistory._id,
        patientId: medicalHistory.patient,
        patientName: appointment.patientId.name,
        patientEmail: appointment.patientId.email,
        doctorId: medicalHistory.doctor,
        appointmentId: medicalHistory.appointmentId,
        appointmentDate: appointment.appointmentDate,
        timeslot: appointment.timeslot,
        diagnosis: medicalHistory.diagnosis,
        treatment: medicalHistory.treatment,
        date: medicalHistory.date,
      },
    });
  } catch (error) {
    console.error("Lỗi khi thêm bệnh án:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ.", error: error.message });
  }
};

const getAllMedicalHistories = async (req, res) => {
  try {
    const doctorId = req.user?.id;
    const { patientName, appointmentDate } = req.query;

    if (!doctorId) {
      return res.status(401).json({ success: false, message: "Không được phép: Thiếu ID bác sĩ." });
    }

    let query = { doctor: doctorId };

    if (patientName) {
      query["patient"] = {
        $in: await patientModel.find(
          { name: { $regex: patientName, $options: "i" } },
          "_id"
        ).distinct("_id"),
      };
    }

    if (appointmentDate) {
      const startOfDay = new Date(appointmentDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(appointmentDate);
      endOfDay.setHours(23, 59, 59, 999);
      query["appointmentId"] = {
        $in: await appointmentModel.find(
          {
            appointmentDate: { $gte: startOfDay, $lte: endOfDay },
          },
          "_id"
        ).distinct("_id"),
      };
    }

    const medicalHistories = await medicalHistoryModel
      .find(query)
      .populate("patient", "name email")
      .populate("doctor", "name")
      .populate("appointmentId", "appointmentDate timeslot")
      .sort({ date: -1 });

    if (!medicalHistories.length) {
      return res.status(200).json({
        success: true,
        message: "Không tìm thấy bệnh án nào.",
        data: [],
      });
    }

    const formattedHistories = medicalHistories.map((history) => ({
      _id: history._id,
      patientName: history.patient?.name || "Không xác định",
      patientEmail: history.patient?.email || "",
      doctorName: history.doctor?.name || "Không xác định",
      appointmentDate: history.appointmentId?.appointmentDate || null,
      timeslot: history.appointmentId?.timeslot || "",
      diagnosis: history.diagnosis,
      treatment: history.treatment,
      date: history.date,
    }));

    res.status(200).json({ success: true, data: formattedHistories });
  } catch (error) {
    console.error("Lỗi khi lấy tất cả bệnh án:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ.", error: error.message });
  }
};

const getMedicalHistoryByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const doctorId = req.user?.id;

    console.log('[getMedicalHistoryByPatient] Nhận ID bệnh nhân:', {
      patientId,
      length: patientId?.length,
      isHex: patientId ? /^[0-9a-fA-F]{24}$/.test(patientId) : false,
      isValidObjectId: patientId ? mongoose.Types.ObjectId.isValid(patientId) : false,
    });

    if (!doctorId) {
      return res.status(401).json({ success: false, message: "Không được phép: Thiếu ID bác sĩ." });
    }

    if (!patientId || !mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({
        success: false,
        message: "ID bệnh nhân không hợp lệ. Vui lòng cung cấp chuỗi 24 ký tự hexadecimal."
      });
    }

    const medicalHistories = await medicalHistoryModel
      .find({ patient: patientId, doctor: doctorId })
      .populate("patient", "name email")
      .populate("doctor", "name")
      .populate("appointmentId", "appointmentDate timeslot")
      .sort({ date: -1 });

    if (!medicalHistories.length) {
      return res.status(200).json({
        success: true,
        message: `Không tìm thấy bệnh án nào cho bệnh nhân có ID "${patientId}".`,
        data: []
      });
    }

    const formattedHistories = medicalHistories.map((history) => ({
      _id: history._id,
      patientName: history.patient?.name || "Không xác định",
      patientEmail: history.patient?.email || "",
      doctorName: history.doctor?.name || "Không xác định",
      appointmentDate: history.appointmentId?.appointmentDate || null,
      timeslot: history.appointmentId?.timeslot || "",
      diagnosis: history.diagnosis,
      treatment: history.treatment,
      date: history.date,
    }));

    res.status(200).json({ success: true, data: formattedHistories });
  } catch (error) {
    console.error("Lỗi khi lấy bệnh án:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ.", error: error.message });
  }
};

const updateMedicalHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { diagnosis, treatment } = req.body;
    const doctorId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "ID bệnh án không hợp lệ." });
    }

    if (!doctorId) {
      return res.status(401).json({ success: false, message: "Không được phép: Thiếu ID bác sĩ." });
    }

    const medicalHistory = await medicalHistoryModel.findById(id);
    if (!medicalHistory) {
      return res.status(404).json({ success: false, message: "Không tìm thấy bệnh án." });
    }

    if (medicalHistory.doctor.toString() !== doctorId) {
      return res.status(403).json({ success: false, message: "Không được phép: Bạn chỉ có thể cập nhật bệnh án của mình." });
    }

    const updateData = {};
    if (diagnosis) updateData.diagnosis = diagnosis.trim();
    if (treatment) updateData.treatment = treatment.trim();

    const updatedMedicalHistory = await medicalHistoryModel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("patient", "name email")
      .populate("doctor", "name")
      .populate("appointmentId", "appointmentDate timeslot");

    res.status(200).json({
      success: true,
      message: "Cập nhật bệnh án thành công.",
      data: {
        _id: updatedMedicalHistory._id,
        patientName: updatedMedicalHistory.patient?.name || "Không xác định",
        patientEmail: updatedMedicalHistory.patient?.email || "",
        doctorName: updatedMedicalHistory.doctor?.name || "Không xác định",
        appointmentDate: updatedMedicalHistory.appointmentId?.appointmentDate || null,
        timeslot: updatedMedicalHistory.appointmentId?.timeslot || "",
        diagnosis: updatedMedicalHistory.diagnosis,
        treatment: updatedMedicalHistory.treatment,
        date: updatedMedicalHistory.date,
      },
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật bệnh án:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ.", error: error.message });
  }
};

const deleteMedicalHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const doctorId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "ID bệnh án không hợp lệ." });
    }

    if (!doctorId) {
      return res.status(401).json({ success: false, message: "Không được phép: Thiếu ID bác sĩ." });
    }

    const medicalHistory = await medicalHistoryModel.findById(id);
    if (!medicalHistory) {
      return res.status(404).json({ success: false, message: "Không tìm thấy bệnh án." });
    }

    if (medicalHistory.doctor.toString() !== doctorId) {
      return res.status(403).json({ success: false, message: "Không được phép: Bạn chỉ có thể xóa bệnh án của mình." });
    }

    await medicalHistoryModel.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Xóa bệnh án thành công." });
  } catch (error) {
    console.error("Lỗi khi xóa bệnh án:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ.", error: error.message });
  }
};

const getCompletedAppointments = async (req, res) => {
  try {
    const doctorId = req.user?.id;
    if (!doctorId) {
      return res.status(401).json({ success: false, message: "Không được phép: Thiếu ID bác sĩ." });
    }

    const appointments = await appointmentModel
      .find({
        doctorId: new mongoose.Types.ObjectId(doctorId),
        status: "completed",
      })
      .populate("patientId", "name email")
      .sort({ appointmentDate: -1 });

    const formattedAppointments = appointments.map((appt) => ({
      _id: appt._id,
      patientId: appt.patientId._id,
      patientName: appt.patientId?.name || "Không xác định",
      patientEmail: appt.patientId?.email || "",
      appointmentDate: appt.appointmentDate,
      timeslot: appt.timeslot,
      hasMedicalHistory: false,
    }));

    for (let appt of formattedAppointments) {
      const medicalHistory = await medicalHistoryModel.findOne({ appointmentId: appt._id });
      appt.hasMedicalHistory = !!medicalHistory;
    }

    res.status(200).json({ success: true, data: formattedAppointments });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách cuộc hẹn đã hoàn thành:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ.", error: error.message });
  }
};

module.exports = {
  loginDoctor,
  getAllDoctors,
  getPublicDoctorData,
  deleteDoctor,
  getPublicDoctors,
  addManyDoctors,
  getDoctorData,
  getDoctorRating,
  getAllDoctorRatings,
  getAllAppointments,
  getMyAppointments,
  getAllReviews,
  updateAppointment,
  deleteAppointment,
  getId,
  updateProfile,
  uploadImage,
  getMySchedule,
  changePassword,
  createMedicalHistory,
  getAllMedicalHistories,
  getMedicalHistoryByPatient,
  updateMedicalHistory,
  deleteMedicalHistory,
  getCompletedAppointments,
};