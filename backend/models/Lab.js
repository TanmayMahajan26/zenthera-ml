const mongoose = require('mongoose');

const labSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  code:       { type: String, required: true, unique: true },
  city:       { type: String, default: '' },
  address:    { type: String, default: '' },
  type:       { type: String, enum: ['Metropolis', 'SRL', 'Dr. Lal PathLabs', 'Zenthera', 'Other'], default: 'Zenthera' },
  status:     { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  totalTests: { type: Number, default: 0 },
  contact:    { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Lab', labSchema);
