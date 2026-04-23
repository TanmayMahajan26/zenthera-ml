const express = require('express');
const Report = require('../models/Report');
const Patient = require('../models/Patient');
const auth = require('../middleware/auth');
const router = express.Router();

// GET /api/analytics
router.get('/', auth, async (req, res) => {
  try {
    // Total counts
    const totalPatients = await Patient.countDocuments();
    const totalReports = await Report.countDocuments();
    const criticalPatients = await Patient.countDocuments({ status: 'Critical' });

    // Resistance distribution across all reports
    const resistanceAgg = await Report.aggregate([
      { $unwind: '$predictions' },
      {
        $group: {
          _id: '$predictions.phenotype',
          count: { $sum: 1 },
        },
      },
    ]);

    const resistantCount = resistanceAgg.find(r => r._id === 'Resistant')?.count || 0;
    const susceptibleCount = resistanceAgg.find(r => r._id === 'Susceptible')?.count || 0;

    // Top resistant antibiotics
    const topResistant = await Report.aggregate([
      { $unwind: '$predictions' },
      { $match: { 'predictions.phenotype': 'Resistant' } },
      {
        $group: {
          _id: '$predictions.antibiotic',
          count: { $sum: 1 },
          avgConfidence: { $avg: '$predictions.confidence' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]);

    // Monthly report submissions (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyReports = await Report.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Top organisms detected
    const topOrganisms = await Report.aggregate([
      { $match: { organism: { $ne: 'Unknown' } } },
      {
        $group: {
          _id: '$organism',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // Patient status distribution
    const patientStatus = await Patient.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      overview: {
        totalPatients,
        totalReports,
        criticalPatients,
        resistantCount,
        susceptibleCount,
      },
      topResistant,
      monthlyReports,
      topOrganisms,
      patientStatus,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
