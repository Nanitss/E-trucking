//# server/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const path = require('path');
// const { initDatabase } = require('./utils/initDatabase');
const authRoutes = require('./routes/auth');

// Import user management routes
const driversRoutes = require('./routes/driversRoutes');
const operatorsRoutes = require('./routes/operatorsRoutes');
const helpersRoutes = require('./routes/helpersRoutes');
const staffRoutes = require('./routes/staffRoutes');
const clientRoutes = require('./routes/clientRoutes');
const truckRoutes = require('./routes/truckRoutes');
const documentRoutes = require('./routes/documentRoutes');

const app = express();
const PORT = process.env.PORT || 5007;

// Add environment variables check
console.log('\n=== Environment Check ===');
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('===================\n');

// Warning if JWT_SECRET is missing
if (!process.env.JWT_SECRET) {
  console.error('⚠️ WARNING: JWT_SECRET not found in environment variables!');
  console.error('Please check your .env file');
}

// Add debugging for client routes
console.log('🔍 Checking if clientRoutes is loaded:', typeof clientRoutes);
console.log('🔍 clientRoutes object:', clientRoutes);

// Init DB with better error handling
// initDatabase()
//   .then(() => console.log('✅ Database initialized'))
//   .catch(err => {
//     console.error('❌ DB init error:', err);
//     process.exit(1); // Exit if DB connection fails
//   });

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5007'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

// Enhanced logging middleware for debugging
app.use((req, res, next) => {
  console.log('\n===== Incoming Request =====');
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  console.log('Query:', req.query);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', req.body);
  }
  console.log('=============================\n');
  next();
});

// Auth routes
app.use('/api/auth', authRoutes);

// User management routes
app.use('/api/drivers', driversRoutes);
app.use('/api/operators', operatorsRoutes);
app.use('/api/helpers', helpersRoutes);
app.use('/api/staffs', staffRoutes);

// Mount client routes with enhanced logging
console.log('🔍 Mounting client routes...');
app.use('/api/clients', (req, res, next) => {
  console.log(`📍 Client route request: ${req.method} ${req.url}`);
  console.log('📍 Request path:', req.path);
  console.log('📍 Request base URL:', req.baseUrl);
  next();
}, clientRoutes);

// Log if clientRoutes was successfully mounted
console.log('✅ Client routes mounted at /api/clients');

app.use('/api/trucks', truckRoutes);

// Document routes
app.use('/api/documents', documentRoutes);

// Health check
app.get('/', (req, res) => res.json({ 
  status: 'ok', 
  message: '🚚 Trucking API up and running',
  timestamp: new Date().toISOString()
}));

// Add this after mounting all routes to log registered routes
console.log('\n🔍 All registered routes:');
app._router.stack.forEach((middleware, index) => {
  if (middleware.route) {
    console.log(`  ${index}: ${middleware.route.path} [${Object.keys(middleware.route.methods).join(', ')}]`);
  } else if (middleware.name === 'router') {
    console.log(`  ${index}: Router mounted`);
  }
});
console.log('\n');

// List all available routes for debugging
app.get('/debug/routes', (req, res) => {
  const routes = [];
  
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') {
      const baseRoute = middleware.regexp.toString();
      const subRoutes = [];
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          subRoutes.push({
            path: handler.route.path,
            methods: Object.keys(handler.route.methods)
          });
        }
      });
      routes.push({
        baseRoute,
        subRoutes
      });
    }
  });
  
  res.json({ routes, message: 'All registered routes' });
});

// Add a test route for debugging
app.get('/api/test', (req, res) => {
  console.log('Test route hit');
  res.json({ message: 'Test route working' });
});

// Serve static files if in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  // Handle React routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  console.log(`❌ 404 Error: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    message: `API endpoint not found: ${req.originalUrl}`,
    available_endpoints: [
      '/api/auth',
      '/api/drivers',
      '/api/operators',
      '/api/helpers',
      '/api/staffs',
      '/api/clients',
      '/api/trucks'
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ 
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
  console.log(`📝 API documentation available at http://localhost:${PORT}/api-docs`);
  console.log(`🔍 Debug routes available at http://localhost:${PORT}/debug/routes`);
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

module.exports = app