const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const adminAuth = require("../middlewares/adminMiddleware");
const upload = require("../middlewares/multer");

// Admin Login
router.post("/login", adminController.loginAdmin);

// Doctor Routes
router.post("/add-doctor", adminAuth, upload.single('image'), adminController.addDoctor);
router.get("/doctor/:id", adminAuth, adminController.getDoctorById);
router.put("/doctor/update/:id", adminAuth, upload.single('image'), adminController.editDoctor);
router.delete("/doctor/:id", adminAuth, adminController.deleteDoctor);
router.get("/doctor", adminAuth, adminController.getAllDoctors);

// Patient Routes
router.get("/patient/all", adminAuth, adminController.getAllPatients);
router.get("/patient/:id", adminAuth, adminController.getPatientById);
router.put("/patient/update/:id", adminAuth, upload.single('image'), adminController.editPatient);
router.delete("/patient/delete/:id", adminAuth, adminController.deletePatient);

// Schedule management routes
router.get('/schedules', adminAuth, adminController.getAllSchedules);
router.get('/schedules/:id', adminAuth, adminController.getScheduleById);
router.post('/schedules', adminAuth, adminController.createSchedule);
router.put('/schedules/:id', adminAuth, adminController.updateSchedule);
router.delete('/schedules/:id', adminAuth, adminController.deleteSchedule);

// Appointment Routes
router.get('/appointment/:id', adminAuth, adminController.getAppointmentById);
router.get('/appointments', adminAuth, adminController.getAllAppointments);
router.delete('/appointment/delete/:id', adminAuth, adminController.deleteAppointment);

// Specialty Routes
router.get("/specialties", adminAuth, adminController.getAllSpecialties);
router.post("/specialties", adminAuth, upload.single('image'), adminController.addSpecialty);
router.put("/specialties/:id", adminAuth, upload.single('image'), adminController.updateSpecialty);
router.delete("/specialties/:id", adminAuth, adminController.deleteSpecialty);

// News Routes
router.get("/news", adminAuth, adminController.getAllNews);
router.post("/news", adminAuth, upload.single('image'), adminController.addNews);
router.put("/news/:id", adminAuth, upload.single('image'), adminController.updateNews);
router.delete("/news/:id", adminAuth, adminController.deleteNews);

// Appointment Route (Placeholder - Remove if not needed)
router.get("/appointment", adminAuth, (req, res) => {
    res.send("Appointment Page - Protected Route");
});

module.exports = router;