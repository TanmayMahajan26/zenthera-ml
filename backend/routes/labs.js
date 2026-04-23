const express = require('express');
const Lab = require('../models/Lab');
const auth = require('../middleware/auth');
const router = express.Router();

// GET /api/labs
router.get('/', auth, async (req, res) => {
  try {
    const labs = await Lab.find().sort({ createdAt: -1 });
    res.json(labs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/labs
router.post('/', auth, async (req, res) => {
  try {
    const lab = await Lab.create(req.body);
    res.status(201).json(lab);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/labs/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const lab = await Lab.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!lab) return res.status(404).json({ error: 'Lab not found.' });
    res.json(lab);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
