const mongoose = require("mongoose");

const scheduleSchema = new mongoose.Schema({
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "doctor", required: true },
    weekStartDate: { type: Date, required: true }, // Ngày bắt đầu tuần (VD: 06/16/2025)
    weekNumber: { type: Number, required: true }, // Số tuần trong năm
    year: { type: Number, required: true }, // Năm của lịch
    availability: [
        {
            day: {
                type: String,
                required: true,
                enum: ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'],
            },
            date: { type: Date, required: true }, // Ngày cụ thể (VD: 06/16/2025 cho Thứ 2)
            isAvailable: { type: Boolean, default: true }, // Trạng thái ngày (bác sĩ có làm việc hay không)
            timeSlots: [
                {
                    time: {
                        type: String,
                        required: true,
                        match: [/^\d{2}:\d{2}-\d{2}:\d{2}$/, "Invalid time format (e.g., '09:00-10:00')"],
                    },
                    isBooked: { type: Boolean, default: false },
                    isAvailable: { type: Boolean, default: true }, // Trạng thái khung giờ
                    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "patient", default: null },
                },
            ],
        },
    ],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

// Index để tối ưu tìm kiếm theo bác sĩ và tuần
scheduleSchema.index({ doctorId: 1, weekStartDate: 1, year: 1 });

module.exports = mongoose.model("schedule", scheduleSchema);