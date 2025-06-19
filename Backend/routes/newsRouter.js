const express = require('express');
const router = express.Router();
const newsModel = require('../models/news.model');
const {
    getAllNews,
    getNewsById,
    incrementNewsView
} = require('../controllers/newsController');

router.get('/', getAllNews);
router.get('/:id', getNewsById);
router.patch("/:id/view", incrementNewsView);

module.exports = router;