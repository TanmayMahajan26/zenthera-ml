/**
 * Zenthera — Express Server
 * =========================
 * MERN backend for Auth, Patients, Reports, Analytics
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const reportRoutes = require('./routes/reports');
const analyticsRoutes = require('./routes/analytics');
const labRoutes = require('./routes/labs');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/labs', labRoutes);

const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', service: 'zenthera-mern-backend' });
});

// Proxy ML requests to Flask backend running on port 5000 internally
app.use(createProxyMiddleware({
  target: 'http://127.0.0.1:5000',
  changeOrigin: true,
  pathFilter: '/api/predict'
}));

// Serve React static files
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// SPA Catch-all Route
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 4000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB Atlas');
    app.listen(PORT, () => {
      console.log(`Zenthera Backend running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
