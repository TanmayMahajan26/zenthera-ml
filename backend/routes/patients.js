const express = require('express');
const Patient = require('../models/Patient');
const auth = require('../middleware/auth');
const router = express.Router();

// GET /api/patients
router.get('/', auth, async (req, res) => {
  try {
    const query = {};
    if (req.user.role === 'doctor') {
      query.addedBy = req.user.id;
    }
    const patients = await Patient.find(query).sort({ createdAt: -1 }).limit(100);
    res.json(patients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/patients
router.post('/', auth, async (req, res) => {
  try {
    const patient = await Patient.create({ ...req.body, addedBy: req.user.id });
    res.status(201).json(patient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/patients/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found.' });

    if (req.user.role === 'doctor' && patient.addedBy.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to edit this patient.' });
    }

    Object.assign(patient, req.body);
    await patient.save();
    res.json(patient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/patients/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found.' });

    if (req.user.role === 'doctor' && patient.addedBy.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this patient.' });
    }

    await Patient.findByIdAndDelete(req.params.id);
    res.json({ message: 'Patient deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
