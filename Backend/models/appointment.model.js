const mongoose = require('mongoose');

const appointmentSchema = mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: [true, 'Patient ID is required'],
    validate: {
      validator: async function (value) {
        const patient = await mongoose.model('Patient').findById(value);
        return !!patient; // Ensure patientId references an existing patient
      },
      message: 'Invalid patient ID: Patient does not exist',
    },
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: [true, 'Doctor ID is required'],
  },
  appointmentDate: { type: Date, required: true },
  timeslot: {
    type: String,
    required: true,
    match: [/^\d{2}:\d{2}-\d{2}:\d{2}$/, 'Timeslot must be in the format HH:mm-HH:mm'],
  },
  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'completed', 'cancelled'],
  },
  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

appointmentSchema.index({ doctorId: 1, appointmentDate: 1, timeslot: 1 }, { unique: true });

module.exports = mongoose.model('Appointment', appointmentSchema);