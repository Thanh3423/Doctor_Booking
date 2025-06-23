const mongoose = require('mongoose');

const appointmentSchema = mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  appointmentDate: { type: Date, required: true },
  timeslot: {
    type: String,
    required: true,
    match: [/^\d{2}:\d{2}-\d{2}:\d{2}$/],
  },
  status: { type: String, default: 'pending', enum: ['pending', 'completed', 'cancelled'] },
  notes: { type: String, default: '', },
  createdAt: { type: Date, default: Date.now },
});

appointmentSchema.index({ doctorId: 1, appointmentDate: 1, timeslot: 1 }, { unique: true });
module.exports = mongoose.model('Appointment', appointmentSchema);