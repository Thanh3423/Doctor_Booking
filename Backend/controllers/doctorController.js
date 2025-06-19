const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const doctorModel = require("../models/doctor.model");
const specialtyModel = require("../models/specialty.model");
const reviewModel = require("../models/review.model");
const appointmentModel = require("../models/appointment.model");
const scheduleModel = require("../models/schedule.model");
const medicalHistoryModel = require("../models/medicalHistory.model");

const loginDoctor = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const doctor = await doctorModel.findOne({ email });

    if (!doctor) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, doctor.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    if (!process.env.JWT_KEY) {
      throw new Error("JWT_SECRET_KEY is not defined in environment variables");
    }

    const token = jwt.sign(
      { id: doctor._id, role: "doctor" },
      process.env.JWT_KEY
    );
    res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    console.error("Error during doctor login:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getAllDoctors = async (req, res) => {
  try {
    const doctors = await doctorModel.find().populate('specialty');
    res.status(200).json({ success: true, data: doctors });
  } catch (error) {
    console.error("Error fetching doctors:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

const deleteDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const doctor = await doctorModel.findByIdAndDelete(id);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }
    res.status(200).json({ message: "Doctor deleted successfully", doctor });
  } catch (error) {
    console.error("Error deleting doctor:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const addManyDoctors = async (req, res) => {
  try {
    if (!Array.isArray(req.body) || req.body.length === 0) {
      return res.status(400).json({ error: "Invalid input: Expected an array of doctors" });
    }

    const bulkOps = req.body.map((doc) => ({
      updateOne: {
        filter: { email: doc.email },
        update: { $set: doc },
        upsert: true,
      },
    }));

    const result = await doctorModel.bulkWrite(bulkOps);
    res.status(201).json({ message: "Doctors added/updated successfully", result });
  } catch (error) {
    console.error("Error adding/updating doctors:", error);
    res.status(500).json({ error: "Failed to add/update doctors", details: error.message });
  }
};

const getDoctorData = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Doctor ID is required" });
    }

    const doctor = await doctorModel.findById(id).populate('specialty', 'name');

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    res.status(200).json({ success: true, data: doctor });
  } catch (error) {
    console.error("Error fetching doctor data:", error);
    res.status(500).json({ message: "Server error", error: error.message });
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
    console.error("Error calculating average rating:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getAllDoctorRatings = async (req, res) => {
  console.log("Hit /doctor/all-ratings endpoint");
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

    console.log("Ratings fetched:", ratings);

    if (!ratings || ratings.length === 0) {
      return res.status(200).json([]);
    }

    res.status(200).json(ratings);
  } catch (error) {
    console.error("Error fetching doctor ratings:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    res.status(500).json({
      message: "Failed to fetch doctor ratings",
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
    console.error('Error fetching all appointments:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
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
      appointmentDate: appt.appointmentDate,
      timeslot: appt.timeslot,
      status: appt.status || "pending",
      notes: appt.notes || "",
      createdAt: appt.createdAt,
    }));

    res.status(200).json({ success: true, data: formattedAppointments });
  } catch (error) {
    console.error("Lỗi khi lấy lịch hẹn:", error);
    res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, appointmentDate, timeslot, notes } = req.body;
    const doctorId = req.user?.id;

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
    res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
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
    res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const doctorId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid appointment ID" });
    }

    if (!doctorId) {
      return res.status(401).json({ message: "Unauthorized: Doctor ID not found" });
    }

    const appointment = await appointmentModel.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (appointment.doctorId.toString() !== doctorId) {
      return res.status(403).json({ message: "Unauthorized: You can only delete your own appointments" });
    }

    const reviewCount = await reviewModel.countDocuments({ appointmentId: id });
    if (reviewCount > 0) {
      return res.status(400).json({ message: "Cannot delete appointment with associated reviews" });
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
    res.status(200).json({ message: "Appointment deleted successfully" });
  } catch (error) {
    console.error("Error deleting appointment:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getId = async (req, res) => {
  try {
    const doctorId = req.user?.id;
    if (!doctorId) {
      return res.status(401).json({ message: "Unauthorized: ID not found" });
    }
    res.status(200).json({ id: doctorId });
  } catch (error) {
    console.error("Error fetching doctor ID:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedDoctor = await doctorModel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate('specialty', 'name');

    if (!updatedDoctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    res.status(200).json({ message: "Profile updated", updatedProfile: updatedDoctor });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Chưa chọn ảnh" });
    }
    const imageUrl = req.file.filename;
    console.log("Uploaded file:", req.file);
    const doctor = await doctorModel.findByIdAndUpdate(
      req.params.id,
      { image: imageUrl },
      { new: true }
    ).populate("specialty", "name");
    if (!doctor) {
      return res.status(404).json({ message: "Không tìm thấy bác sĩ" });
    }
    res.status(200).json({ message: "Cập nhật ảnh hồ sơ thành công", imageUrl });
  } catch (error) {
    console.error("Lỗi khi tải ảnh lên:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    const doctorId = req.user?.id;

    if (!doctorId) {
      return res.status(401).json({ message: "Không có ID bác sĩ" });
    }

    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "Vui lòng điền đầy đủ các trường" });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Mật khẩu mới và xác nhận không khớp" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự" });
    }

    const doctor = await doctorModel.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: "Không tìm thấy bác sĩ" });
    }

    const isMatch = await bcrypt.compare(oldPassword, doctor.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Mật khẩu cũ không đúng" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    doctor.password = hashedPassword;
    await doctor.save();

    console.log("Password changed for doctor:", doctor.email);
    res.status(200).json({ message: "Đổi mật khẩu thành công" });
  } catch (error) {
    console.error("Lỗi khi đổi mật khẩu:", error.message, error.stack);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

const getMySchedule = async (req, res) => {
  try {
    const doctorId = req.user?.id;
    if (!doctorId) {
      return res.status(401).json({ success: false, message: 'Không được phép: Thiếu ID bác sĩ.' });
    }

    const schedule = await scheduleModel
      .findOne({ doctorId: new mongoose.Types.ObjectId(doctorId) })
      .populate('doctorId', 'name email');

    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch làm việc.' });
    }

    res.status(200).json({ success: true, data: schedule });
  } catch (error) {
    console.error('Lỗi khi lấy lịch làm việc:', error);
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

const getPublicDoctors = async (req, res) => {
  try {
    console.log("Fetching public doctors...");
    const doctors = await doctorModel.find()
      .select("_id name specialty experience image averageRating totalReviews email location fees about phone")
      .populate({
        path: "specialty",
        select: "name",
        model: specialtyModel,
      });
    console.log("Public Doctors:", doctors);
    res.json({ success: true, data: doctors });
  } catch (error) {
    console.error("Error fetching public doctors:", error.message, error.stack);
    res.status(500).json({ success: false, message: "Error fetching public doctors", error: error.message });
  }
};

const getPublicDoctorData = async (req, res) => {
  const doctorId = req.params.doctorId; // Define doctorId outside try-catch
  try {
    console.log('[getPublicDoctorData] Received doctorId:', doctorId);
    console.log('[getPublicDoctorData] doctorId details:', {
      raw: doctorId,
      length: doctorId?.length,
      isHex: /^[0-9a-fA-F]{24}$/.test(doctorId),
      isValidObjectId: mongoose.Types.ObjectId.isValid(doctorId),
    });

    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      console.warn('[getPublicDoctorData] Invalid doctorId:', doctorId);
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
      doctorId: doctorId || 'undefined', // Use defined doctorId
    });
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
};

// New Medical History Functions
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
      return res.status(400).json({ success: false, message: "Chẩn đoán và điều trị là bắt buộc." });
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
    res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

const getMedicalHistoryByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const doctorId = req.user?.id;

    if (!doctorId) {
      return res.status(401).json({ success: false, message: "Không được phép: Thiếu ID bác sĩ." });
    }

    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({ success: false, message: "ID bệnh nhân không hợp lệ." });
    }

    const medicalHistories = await medicalHistoryModel
      .find({ patient: patientId, doctor: doctorId })
      .populate("patient", "name email")
      .populate("doctor", "name")
      .populate("appointmentId", "appointmentDate timeslot")
      .sort({ date: -1 });

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
    res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
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
    res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
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
    res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
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
      hasMedicalHistory: false, // Will check if medical history exists
    }));

    // Check for existing medical histories
    for (let appt of formattedAppointments) {
      const medicalHistory = await medicalHistoryModel.findOne({ appointmentId: appt._id });
      appt.hasMedicalHistory = !!medicalHistory;
    }

    res.status(200).json({ success: true, data: formattedAppointments });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách cuộc hẹn đã hoàn thành:", error);
    res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
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
  getMedicalHistoryByPatient,
  updateMedicalHistory,
  deleteMedicalHistory,
  getCompletedAppointments,
};