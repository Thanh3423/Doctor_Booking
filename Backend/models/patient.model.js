const mongoose = require("mongoose");

const patientSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        minLength: 3,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, "Vui lòng nhập email hợp lệ"],
    },
    password: {
        type: String,
        required: true,
        minLength: 6,
    },
    image: {
        type: String,
        default: "",
    },
    phoneNumber: {
        type: String,
        default: "",
        match: [/^\+?\d{10,15}$/, "Định dạng số điện thoại không hợp lệ"],
    },
    address: {
        type: String,
        default: "",
        trim: true,
    },
    reviews: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "review",
        },
    ],

    appointment: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "appointment",
        },
    ],
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Ensure indexes are created properly
patientSchema.index({ "medicalHistory.doctor": 1 });
patientSchema.index({ reviews: 1 });
patientSchema.index({ appointment: 1 });

module.exports = mongoose.model("patient", patientSchema);