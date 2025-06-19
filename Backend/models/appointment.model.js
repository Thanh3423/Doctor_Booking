const mongoose = require('mongoose');

const appointmentSchema = mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'patient', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'doctor', required: true },
  appointmentDate: { type: Date, required: true },
  timeslot: {
    type: String,
    required: true,
    match: [/^\d{2}:\d{2}-\d{2}:\d{2}$/, 'Invalid timeslot format (e.g., "10:00-10:30")'],
  },
  status: { type: String, default: 'pending', enum: ['pending', 'completed', 'cancelled'] },
  notes: { type: String, required: false, trim: true },
  createdAt: { type: Date, default: Date.now },
});

appointmentSchema.index({ doctorId: 1, appointmentDate: 1, timeslot: 1 }, { unique: true });
module.exports = mongoose.model('appointment', appointmentSchema);