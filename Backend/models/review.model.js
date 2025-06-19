const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Patient",
        required: true,
    },
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Doctor",
        required: true,
    },
    appointmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Appointment",
        required: true,
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
    },
    review: {
        type: String,
        trim: true, // Added trim
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

reviewSchema.index({ doctorId: 1 });
reviewSchema.index({ patientId: 1 });
module.exports = mongoose.model("Review", reviewSchema);