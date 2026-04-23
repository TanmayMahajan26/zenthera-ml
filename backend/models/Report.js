const mongoose = require('mongoose');

const predictionDetailSchema = new mongoose.Schema({
  antibiotic:      { type: String, required: true },
  phenotype:       { type: String, enum: ['Resistant', 'Susceptible'], required: true },
  confidence:      { type: Number, required: true },
  model:           { type: String, default: 'XGBoost' },
  confidence_tier: { type: String, default: 'Medium' },
}, { _id: false });

const reportSchema = new mongoose.Schema({
  patient:      { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  fileName:     { type: String, required: true },
  organism:     { type: String, default: 'Unknown' },
  seqLength:    { type: Number, default: 0 },
  gcContent:    { type: Number, default: 0 },
  predictions:  [predictionDetailSchema],
  totalResistant:    { type: Number, default: 0 },
  totalSusceptible:  { type: Number, default: 0 },
  recommendedDrug:   { type: String, default: '' },
  analyzedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lab:          { type: String, default: 'Zenthera Central Lab' },
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
