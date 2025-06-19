const express = require('express');
const router = express.Router();
const Specialty = require('../models/specialty.model');
const { getAllSpecialties } = require('../controllers/specialtyController');

router.get('/all', getAllSpecialties);

module.exports = router;