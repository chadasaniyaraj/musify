const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const searchRoutes = require('./routes/searchRoutes');

// Load environment variables from .env file
dotenv.config();

const app = express();

// Connect to MongoDB Atlas
connectDB();

// Middleware
app.use(cors()); // Allows your frontend index.html to make requests to this backend
app.use(express.json()); // Allows server to parse JSON payloads

// Mount Routes
// This mounts our search and stream routes. 
// Your endpoints will be: http://localhost:PORT/api/search and http://localhost:PORT/api/stream/:id
app.use('/api', searchRoutes);

// Health Check / Test Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy and running smoothly.'
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is blasting off on port ${PORT}`);
});