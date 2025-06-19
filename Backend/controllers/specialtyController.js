const Specialty = require('../models/specialty.model');

const getAllSpecialties = async (req, res) => {
    try {
        const specialties = await Specialty.find().select('name description image').lean();
        // Chuẩn hóa image để chỉ chứa tên file
        const normalizedSpecialties = specialties.map(specialty => ({
            ...specialty,
            image: specialty.image
                ? specialty.image.replace(/^.*[\/\\]([0-9a-f-]+\.jpg)$/, '$1')
                : null,
        }));
        res.status(200).json({
            success: true,
            message: 'Lấy danh sách chuyên khoa thành công',
            data: normalizedSpecialties,
        });
    } catch (error) {
        console.error('Lỗi lấy chuyên khoa:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi máy chủ',
            error: error.message,
        });
    }
};

module.exports = { getAllSpecialties };