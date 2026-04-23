const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  age:         { type: Number, required: true },
  gender:      { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  contact:     { type: String, default: '' },
  diagnosis:   { type: String, default: '' },
  ward:        { type: String, default: 'General' },
  status:      { type: String, enum: ['Active', 'Discharged', 'Critical'], default: 'Active' },
  addedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lab:         { type: String, default: 'Zenthera Central Lab' },
}, { timestamps: true });

module.exports = mongoose.model('Patient', patientSchema);
