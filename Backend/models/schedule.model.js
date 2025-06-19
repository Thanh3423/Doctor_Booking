const mongoose = require("mongoose");
const moment = require("moment-timezone");

const scheduleSchema = new mongoose.Schema({
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "doctor", required: true },
    weekStartDate: { type: Date, required: true },
    weekNumber: { type: Number, required: true },
    year: { type: Number, required: true },
    availability: [
        {
            day: {
                type: String,
                required: true,
                enum: ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'],
            },
            date: { type: Date, required: true },
            isAvailable: { type: Boolean, default: true },
            timeSlots: [
                {
                    time: {
                        type: String,
                        required: true,
                        match: [/^\d{2}:\d{2}-\d{2}:\d{2}$/, "Invalid time format (e.g., '09:00-10:00')"],
                    },
                    isBooked: { type: Boolean, default: false },
                    isAvailable: { type: Boolean, default: true },
                    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "patient", default: null },
                },
            ],
        },
    ],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

// Pre-save hook to validate and correct day and date fields
scheduleSchema.pre('save', function (next) {
    const daysMap = {
        0: 'Chủ nhật',
        1: 'Thứ 2',
        2: 'Thứ 3',
        3: 'Thứ 4',
        4: 'Thứ 5',
        5: 'Thứ 6',
        6: 'Thứ 7',
    };

    this.availability.forEach((avail, index) => {
        // Set date to UTC midnight
        const expectedDate = moment.tz(this.weekStartDate, 'Asia/Ho_Chi_Minh').add(index, 'days').startOf('day');
        avail.date = expectedDate.toDate();
        // Set correct day based on date
        const dayOfWeek = moment.tz(avail.date, 'Asia/Ho_Chi_Minh').day();
        avail.day = daysMap[dayOfWeek];
    });

    this.updatedAt = new Date();
    next();
});

scheduleSchema.index({ doctorId: 1, weekStartDate: 1, year: 1 });

module.exports = mongoose.model("schedule", scheduleSchema);