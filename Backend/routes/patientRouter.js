const express = require("express");
const router = express.Router();
const {
    registerUser,
    loginUser,
    logout,
    updateProfile,
    updateProfileImage,
    getAppointments,
    getProfile,
    bookAppointment,
    cancelAppointment,
    submitReview,
    getAppointmentById,
    myReviews,
    getMedicalHistory,
    completeAppointment,
    getAllPatients,
    changePassword,
    getAvailableSlots,
} = require("../controllers/patientController");
const { patientMiddleware } = require("../middlewares/patientMiddleware");
const adminAuth = require("../middlewares/adminMiddleware");
const upload = require("../middlewares/multer");

router.get("/", function (req, res) {
    res.send("Patient Page");
});

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/my-appointment", patientMiddleware, getAppointments);
router.get("/my-profile", patientMiddleware, getProfile);
router.post("/my-profile", patientMiddleware, updateProfile); // Remove upload middleware
router.post("/my-profile/image", patientMiddleware, upload.single("image"), updateProfileImage); // Dedicated image upload route
router.post("/book-appointment", patientMiddleware, bookAppointment);
router.post("/cancel-appointment/:id", patientMiddleware, cancelAppointment);
router.post("/submit-review", patientMiddleware, submitReview);
router.get("/my-reviews", patientMiddleware, myReviews);
router.post("/complete-appointment/:id", patientMiddleware, completeAppointment);
router.get("/all", adminAuth, getAllPatients);
router.post("/logout", patientMiddleware, logout);
router.post("/change-password", patientMiddleware, changePassword);
router.get("/doctor/schedule/:docId", patientMiddleware, getAvailableSlots);
router.get("/appointment/:id", patientMiddleware, getAppointmentById);
router.get("/medical-history", patientMiddleware, getMedicalHistory);

module.exports = router;