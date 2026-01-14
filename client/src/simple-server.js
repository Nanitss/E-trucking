require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const path = require('path');

// Import document routes
const documentRoutes = require('./routes/documentRoutes');

const app = express();
const PORT = 5007;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5007'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

// Document routes
app.use('/api/documents', documentRoutes);

// Health check
app.get('/', (req, res) => res.json({ 
  status: 'ok', 
  message: '🚚 Trucking API up and running',
  timestamp: new Date().toISOString()
}));

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
  console.log(`📄 Document routes available at http://localhost:${PORT}/api/documents`);
  console.log(`⚡ Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing HTTP server...');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});

module.exports = app;
