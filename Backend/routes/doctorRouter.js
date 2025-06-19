const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/doctorController');
const doctorAuth = require('../middlewares/doctorMiddleware');
const adminAuth = require('../middlewares/adminMiddleware');
const upload = require('../middlewares/multer');

router.post('/login', loginDoctor);
router.get('/public-all', getPublicDoctors);
router.get('/public-profile/:id', getPublicDoctorData);
router.get('/all', adminAuth, getAllDoctors);
router.delete('/:id', adminAuth, deleteDoctor);
router.post('/add-many', adminAuth, addManyDoctors);
router.get('/profile/:id', getDoctorData);
router.get('/rating/:id', getDoctorRating);
router.get('/all-ratings', getAllDoctorRatings);
router.get('/all-appointments', adminAuth, getAllAppointments);
router.get('/my-appointments', doctorAuth, getMyAppointments);
router.get('/my-reviews', doctorAuth, getAllReviews);
router.put('/appointment/:id', doctorAuth, updateAppointment);
router.delete('/appointment/:id', doctorAuth, deleteAppointment);
router.get('/id', doctorAuth, getId);
router.put('/profile/:id', doctorAuth, updateProfile);
router.put('/upload-image/:id', doctorAuth, upload.single('image'), uploadImage);
router.get('/my-schedule', doctorAuth, getMySchedule);
router.post('/change-password', doctorAuth, changePassword);
router.post('/medical-history', doctorAuth, createMedicalHistory);
router.get('/medical-history', doctorAuth, getAllMedicalHistories);
router.get('/medical-history/:patientId', doctorAuth, getMedicalHistoryByPatient);
router.put('/medical-history/:id', doctorAuth, updateMedicalHistory);
router.delete('/medical-history/:id', doctorAuth, deleteMedicalHistory);
router.get('/completed-appointments', doctorAuth, getCompletedAppointments);

console.log('Doctor routes initialized');

module.exports = router;