const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const searchRoutes = require('./routes/searchRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const songRoutes = require('./routes/songRoutes');
const dns = require('dns');

// Force Node.js to use Google Public DNS (fixes querySrv ECONNREFUSED error on some networks)
dns.setServers(['8.8.8.8', '8.8.4.4']);

const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();

// Connect to MongoDB Atlas
connectDB();

// Middleware
app.use(cors()); // Allows frontend to make requests to backend
app.use(express.json()); // Allows server to parse JSON payloads

// Mount Routes
app.use('/api', searchRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/songs', songRoutes);

// Health Check / Test Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy and running smoothly.'
  });
});

// 1. Serve page templates (HTML) from the templates folder
app.use(express.static(path.join(__dirname, '../templates')));
app.use('/templates', express.static(path.join(__dirname, '../templates')));

// 2. Serve CSS files explicitly from the css folder
app.use('/css', express.static(path.join(__dirname, '../css')));

// 3. Serve static assets (JS, Assets, Homework Assets) from the root folder
app.use(express.static(path.join(__dirname, '..')));

// Page Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../templates/index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../templates/login.html'));
});

app.get('/song/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '../templates/song-details.html'));
});

app.get('/song', (req, res) => {
  res.sendFile(path.join(__dirname, '../templates/song-details.html'));
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Local App:    http://localhost:${PORT}`);
  console.log(`API Health:   http://localhost:${PORT}/api/health`);
});