const express = require('express');
const Report = require('../models/Report');
const auth = require('../middleware/auth');
const router = express.Router();

// GET /api/reports
router.get('/', auth, async (req, res) => {
  try {
    const reports = await Report.find()
      .populate('patient', 'name age gender')
      .populate('analyzedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('patient', 'name age gender ward')
      .populate('analyzedBy', 'name email');
    if (!report) return res.status(404).json({ error: 'Report not found.' });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reports
router.post('/', auth, async (req, res) => {
  try {
    const report = await Report.create({ ...req.body, analyzedBy: req.user.id });
    res.status(201).json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
