const newsModel = require("../models/news.model");
const mongoose = require("mongoose");

const getAllNews = async (req, res) => {
    try {
        const { category, limit = 10, page = 1 } = req.query;
        const query = { status: "published", publishAt: { $lte: new Date() } };

        if (category && ["Health Tips", "Clinic Updates", "Promotions", "Events", "Other"].includes(category)) {
            query.category = category;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const news = await newsModel
            .find(query)
            .sort({ publishAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .select("title content image category publishAt views");

        const total = await newsModel.countDocuments(query);

        await newsModel.updateMany(
            { _id: { $in: news.map((item) => item._id) } },
            { $inc: { views: 1 } }
        );

        res.status(200).json({
            success: true,
            message: "Lấy tin tức thành công",
            data: news,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Lỗi lấy tin tức:", error);
        res.status(500).json({ success: false, message: "Lỗi máy chủ", error: error.message });
    }
};

const getNewsById = async (req, res) => {
    const { id } = req.params;

    if (!id || id === "undefined" || !mongoose.isValidObjectId(id)) {
        return res.status(400).json({
            message: "ID tin tức không hợp lệ.",
            error: "Invalid ObjectId",
        });
    }

    try {
        const news = await newsModel.findById(id); // Fixed: Changed News to newsModel
        if (!news) {
            return res.status(404).json({
                message: "Không tìm thấy tin tức.",
                error: "News not found",
            });
        }
        res.status(200).json({ data: news });
    } catch (error) {
        console.error("Lỗi lấy chi tiết tin tức:", error);
        res.status(500).json({
            message: "Lỗi máy chủ khi lấy chi tiết tin tức.",
            error: error.message,
        });
    }
};

const incrementNewsView = async (req, res) => {
    const { id } = req.params;

    if (!id || id === "undefined" || !mongoose.isValidObjectId(id)) {
        return res.status(400).json({
            message: "ID tin tức không hợp lệ.",
            error: "Invalid ObjectId",
        });
    }

    try {
        const news = await newsModel.findByIdAndUpdate( // Fixed: Changed News to newsModel
            id,
            { $inc: { views: 1 } },
            { new: true }
        );
        if (!news) {
            return res.status(404).json({
                message: "Không tìm thấy tin tức.",
                error: "News not found",
            });
        }
        res.status(200).json({ message: "Lượt xem đã được cập nhật." });
    } catch (error) {
        console.error("Lỗi cập nhật lượt xem:", error);
        res.status(500).json({
            message: "Lỗi máy chủ khi cập nhật lượt xem.",
            error: error.message,
        });
    }
};

module.exports = {
    getAllNews,
    getNewsById,
    incrementNewsView,
};