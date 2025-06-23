const mongoose = require("mongoose");

const medicalHistorySchema = mongoose.Schema({
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    diagnosis: { type: String, trim: true, required: true, },
    treatment: { type: String, trim: true, required: true, },
    doctor: {
        type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true,
    },
    appointmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Appointment",
    },
    date: {
        type: Date,
        default: Date.now,
    },
});

// Indexes for efficient querying
medicalHistorySchema.index({ patient: 1, date: -1 });
medicalHistorySchema.index({ doctor: 1 });
medicalHistorySchema.index({ appointmentId: 1 });

module.exports = mongoose.model("medicalHistory", medicalHistorySchema);