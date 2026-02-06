//# server/server.js
console.log('🔧 SERVER.JS STARTING - FIREBASE VERSION');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const path = require('path');
const { db } = require('./config/firebase');
const os = require('os');
const fs = require('fs');

// Import route modules
const authRoutes = require('./routes/authRoutes');
const mobileDriverRoutes = require('./routes/mobileDriverRoutes');
const driversRoutes = require('./routes/driversRoutes');
const operatorsRoutes = require('./routes/operatorsRoutes');
const helpersRoutes = require('./routes/helpersRoutes');
const staffRoutes = require('./routes/staffRoutes');
const clientRoutes = require('./routes/clientRoutes');
const adminRoutes = require('./routes/adminRoutes');
const validationRoutes = require('./routes/validation');
const auditRoutes = require('./routes/auditRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const trackingRoutes = require('./routes/trackingRoutes');
const simpleFileRoutes = require('./routes/simpleFileRoutes');
const truckRoutes = require('./routes/truckRoutes');
const pinnedLocationsRoutes = require('./routes/pinnedLocationsRoutes');
const documentRoutes = require('./routes/documentRoutes');
const enhancedUploadRoutes = require('./routes/enhancedUpload');
const reportRoutes = require('./routes/reportRoutes');
const migrationRoutes = require('./routes/migrationRoutes');

// Import services
const AuditService = require('./services/AuditService');
const MobileDriverService = require('./services/MobileDriverService');

// Import document upload middleware
const { uploadTruckDocuments } = require('./middleware/documentUpload');

const app = express();
const PORT = process.env.PORT || 5007;

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`🌐 INCOMING REQUEST - Method: ${req.method}`);
  console.log(`🌐 Path: ${req.path}`);
  console.log(`🌐 Original URL: ${req.originalUrl}`);
  console.log(`🌐 Base URL: ${req.baseUrl}`);
  console.log(`🌐 Full URL: ${req.protocol}://${req.get('host')}${req.originalUrl}`);
  console.log(`🌐 Timestamp: ${new Date().toISOString()}`);
  if (req.path.includes('/admin/trucks') && (req.method === 'POST' || req.method === 'PUT')) {
    console.log('🚛 Truck request detected:', req.method, req.path);
    console.log('📄 Files:', req.files ? Object.keys(req.files) : 'No files');
    console.log('📄 Body keys:', Object.keys(req.body || {}));
  }

  // URL Normalization Middleware
  // Firebase Hosting rewrite + Cloud Function name can cause URL doubling (e.g. /api/api/auth/login)
  // Converting all variations to clean paths (e.g. /auth/login) to match our route definitions
  if (req.url.startsWith('/api/api/')) {
    const newUrl = req.url.replace('/api/api', '');
    console.log(`🔄 Rewriting Path (Double API): ${req.url} -> ${newUrl}`);
    req.url = newUrl;
  } else if (req.url.startsWith('/api/')) {
    const newUrl = req.url.replace('/api', '');
    console.log(`🔄 Rewriting Path (Single API): ${req.url} -> ${newUrl}`);
    req.url = newUrl;
  }

  next();
});

// Add environment variables check
console.log('\n=== Environment Check ===');
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('FB_PROJECT_ID exists:', !!(process.env.FB_PROJECT_ID || process.env.FIREBASE_PROJECT_ID));
console.log('FB_CLIENT_EMAIL exists:', !!(process.env.FB_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL));
console.log('FB_PRIVATE_KEY exists:', !!(process.env.FB_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY));
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('===================\n');

// Warning if JWT_SECRET is missing
if (!process.env.JWT_SECRET) {
  console.error('⚠️ WARNING: JWT_SECRET not found in environment variables!');
  console.error('Please check your .env file');
}

// Warning if Firebase variables are missing
const projectId = process.env.FB_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FB_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FB_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;
if (!projectId || !clientEmail || !privateKey) {
  console.error('⚠️ WARNING: Firebase configuration is incomplete in environment variables!');
  console.error('Please check your .env file');
}

// Add debugging for client routes
console.log('🔍 Checking if clientRoutes is loaded:', typeof clientRoutes);
if (clientRoutes && clientRoutes.stack) {
  console.log('🔍 Client routes has', clientRoutes.stack.length, 'routes');
}

// Middleware
console.log('⚙️ Setting up middleware...');
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // Allow localhost development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }

    // Allow mobile app requests (they don't have an origin)
    // You can add your production domains here
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5007',
      'https://your-production-domain.com', // Add your production domain
      // Mobile apps don't send origin, so null is allowed above
    ];

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS: Allowing origin:', origin);
      callback(null, true); // Allow all origins for now, restrict in production
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'x-client-id'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(fileUpload({
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  abortOnLimit: true,
  responseOnLimit: "File size limit has been reached (max 25MB)",
  createParentPath: true,
  useTempFiles: true, // Use temp files for large uploads
  tempFileDir: path.join(__dirname, 'tmp'),
  debug: true,
  preserveExtension: true,
  safeFileNames: true
}));



// Test file upload endpoint
app.post('/api/test-upload', (req, res) => {
  try {
    console.log('🧪 Test upload endpoint called');
    console.log('📄 Files received:', req.files ? Object.keys(req.files) : 'No files');
    console.log('📋 Request body:', req.body);

    if (req.files && Object.keys(req.files).length > 0) {
      const fileNames = Object.keys(req.files);

      // Use the project uploads folder
      const DOCUMENTS_BASE_PATH = path.join(process.cwd(), 'uploads');
      console.log('📁 Documents base path:', DOCUMENTS_BASE_PATH);

      // Test write access to base folder
      try {
        const testFile = path.join(DOCUMENTS_BASE_PATH, 'test-write-access.txt');
        fs.writeFileSync(testFile, 'Testing write access');
        console.log('✅ Write access test successful');
        fs.unlinkSync(testFile); // Clean up test file
      } catch (error) {
        console.error('❌ Write access test failed:', error);
      }

      const documentTypes = {
        orDocument: { folder: 'OR-CR-Files', prefix: 'OR' },
        crDocument: { folder: 'OR-CR-Files', prefix: 'CR' },
        insuranceDocument: { folder: 'Insurance-Papers', prefix: 'INSURANCE' }
      };

      const uploadedFiles = [];
      const errors = [];

      console.log('🔄 Starting file processing...');

      Object.entries(req.files).forEach(([docType, file]) => {
        console.log(`📄 Processing ${docType}:`, file.name, file.size, 'bytes');

        if (documentTypes[docType]) {
          const config = documentTypes[docType];
          // Use Truck-Documents level but save OR/CR files directly in OR-CR-Files folder
          const folderPath = path.join(DOCUMENTS_BASE_PATH, 'Truck-Documents', config.folder);

          console.log(`📁 Checking folder: ${folderPath}`);
          console.log(`📁 Full absolute path: ${path.resolve(folderPath)}`);

          if (fs.existsSync(folderPath)) {
            console.log(`✅ Folder exists: ${folderPath}`);

            // Use original filename with prefix to avoid conflicts
            const originalName = path.basename(file.name, path.extname(file.name));
            const cleanPlate = (req.body.truckPlate || 'TEST').replace(/[^a-zA-Z0-9]/g, '');
            const fileExtension = path.extname(file.name);
            const fileName = `${originalName}_${config.prefix}${fileExtension}`;
            const filePath = path.join(folderPath, fileName);

            console.log(`📄 Saving file: ${fileName} to ${filePath}`);

            try {
              console.log(`📄 Moving file to: ${filePath}`);
              file.mv(filePath);
              console.log(`✅ File moved successfully to: ${filePath}`);

              // Add to uploaded files list without complex verification
              uploadedFiles.push({
                docType,
                fileName,
                path: filePath,
                size: file.size
              });
              console.log(`✅ File saved: ${fileName} (${file.size} bytes)`);

            } catch (error) {
              console.error(`❌ Failed to save ${docType}:`, error);
              errors.push(`Failed to save ${docType}: ${error.message}`);
            }
          } else {
            console.error(`❌ Folder doesn't exist: ${folderPath}`);
            errors.push(`Required folder ${config.folder} doesn't exist`);
          }
        } else {
          console.log(`⚠️ Unknown document type: ${docType}`);
        }
      });

      console.log(`📄 Upload summary: ${uploadedFiles.length} files saved, ${errors.length} errors`);

      res.json({
        message: errors.length > 0 ? 'Files received but some failed to save' : 'Files received and saved successfully',
        files: fileNames,
        fileCount: fileNames.length,
        uploadedFiles: uploadedFiles,
        errors: errors
      });
    } else {
      console.log('⚠️ No files received in request');
      res.json({
        message: 'No files received',
        files: [],
        fileCount: 0
      });
    }
  } catch (error) {
    console.error('❌ Test upload endpoint error:', error);
    res.status(500).json({
      message: 'Internal server error in test upload',
      error: error.message
    });
  }
});

// Test truck creation with file uploads
app.post('/api/test-truck-create', uploadTruckDocuments, (req, res) => {
  try {
    console.log('🧪 Test truck creation called');
    console.log('📄 Uploaded documents:', req.uploadedDocuments);

    // Create a test truck
    const testTruck = {
      id: 'test-truck-' + Date.now(),
      truckPlate: req.body.truckPlate || 'TEST_PLATE',
      truckType: req.body.truckType || 'Test Truck',
      truckCapacity: req.body.truckCapacity || '1000',
      truckBrand: req.body.truckBrand || 'Test Brand',
      modelYear: req.body.modelYear || '2025',
      truckStatus: 'available',
      allocationStatus: 'available',
      operationalStatus: 'active',
      availabilityStatus: 'free',
      maintenanceScheduled: false,
      lastStatusReason: '',
      documents: req.uploadedDocuments || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('✅ Test truck created:', testTruck);

    res.json({
      message: 'Test truck created successfully',
      truck: testTruck,
      filesProcessed: req.uploadedDocuments ? Object.keys(req.uploadedDocuments) : [],
      documentsStored: req.uploadedDocuments ? Object.keys(req.uploadedDocuments) : []
    });
  } catch (error) {
    console.error('❌ Error in test truck creation:', error);
    res.status(500).json({ message: 'Test truck creation failed', error: error.message });
  }
});

// Test truck update endpoint (bypasses auth for testing)
app.put('/api/test-truck-update/:id', uploadTruckDocuments, (req, res) => {
  try {
    console.log('🚛 ===== TEST TRUCK UPDATE ENDPOINT CALLED =====');
    console.log('📝 Truck ID:', req.params.id);
    console.log('📝 Request body:', req.body);
    console.log('📄 Files received:', req.files ? Object.keys(req.files) : 'No files');
    console.log('📄 Uploaded documents:', req.uploadedDocuments ? Object.keys(req.uploadedDocuments) : 'No uploaded documents');

    // Simulate truck update response
    const updatedTruckData = {
      id: req.params.id,
      truckPlate: req.body.truckPlate || 'UPDATED123',
      truckType: req.body.truckType || 'updated truck',
      truckCapacity: req.body.truckCapacity || '3',
      truckBrand: req.body.truckBrand || 'Updated Brand',
      modelYear: req.body.modelYear || '2025',
      truckStatus: 'available',
      allocationStatus: 'available',
      operationalStatus: 'active',
      availabilityStatus: 'free',
      maintenanceScheduled: false,
      lastStatusReason: '',
      documents: req.uploadedDocuments || {},
      updated_at: new Date().toISOString()
    };

    console.log('🚛 Updated test truck data:', updatedTruckData);

    res.json({
      message: 'Test truck updated successfully',
      truck: updatedTruckData,
      filesProcessed: req.files ? Object.keys(req.files) : [],
      documentsStored: req.uploadedDocuments ? Object.keys(req.uploadedDocuments) : []
    });

  } catch (error) {
    console.error('❌ Test truck update error:', error);
    res.status(500).json({
      message: 'Internal server error in test truck update',
      error: error.message
    });
  }
});

// Test file scanning functionality (bypasses authentication)
app.get('/api/test-file-scanning', async (req, res) => {
  try {
    console.log('🔍 Test file scanning endpoint called');

    // Simple file scanning without TruckService dependencies
    const fs = require('fs');
    const path = require('path');
    const os = require('os');

    const documentsPath = path.join(os.homedir(), 'Documents', 'TruckingApp-Files');
    const truckDocsPath = path.join(documentsPath, 'Truck-Documents');

    if (!fs.existsSync(truckDocsPath)) {
      return res.json({
        message: 'Truck documents folder not found',
        path: truckDocsPath
      });
    }

    const subfolders = fs.readdirSync(truckDocsPath);
    const results = [];

    subfolders.forEach(folder => {
      const folderPath = path.join(truckDocsPath, folder);
      if (fs.statSync(folderPath).isDirectory()) {
        const files = fs.readdirSync(folderPath);
        results.push({
          folder: folder,
          fileCount: files.length,
          files: files.slice(0, 5) // Show first 5 files
        });
      }
    });

    console.log(`✅ File scanning completed, found ${results.length} folders`);

    res.json({
      message: 'File scanning test completed successfully',
      basePath: documentsPath,
      truckDocsPath: truckDocsPath,
      folders: results
    });

  } catch (error) {
    console.error('❌ Error in test file scanning:', error);
    res.status(500).json({
      message: 'File scanning test failed',
      error: error.message
    });
  }
});

// Serve test upload page
app.get('/test-upload', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-upload.html'));
});

// Serve truck endpoints test page
app.get('/test-truck-endpoints', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-truck-endpoints.html'));
});

console.log('✅ Middleware setup complete');

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

// Audit trail middleware for logging authenticated user actions
app.use((req, res, next) => {
  // Store the original end method
  const originalEnd = res.end;

  // Override the end method to log actions after response is sent
  res.end = function () {
    // Call the original end method first
    originalEnd.apply(this, arguments);

    // Only log actions for specific endpoints and methods
    const skipLogging =
      req.path.startsWith('/debug') ||
      req.path === '/api/firestore-test' ||
      req.path === '/api/test' ||
      req.path.startsWith('/api/audit') || // Avoid recursive logging
      req.path === '/' || // Skip health check
      req.path.startsWith('/static/') || // Skip static assets
      req.path.startsWith('/uploads/'); // Skip file uploads

    // Log successful API operations with authenticated users
    const isLoggedAction =
      req.path.startsWith('/api/') &&
      (res.statusCode >= 200 && res.statusCode < 300) &&
      (req.user || req.driver); // Log actions from authenticated users or drivers

    if (!skipLogging && isLoggedAction) {
      // Extract entity type and ID from the URL
      const urlParts = req.path.split('/').filter(Boolean);
      const entityType = urlParts[1]; // The first part after /api/
      const entityId = urlParts[2] || (req.body?.id || req.params?.id || ''); // ID from URL or body

      // Determine the action type
      let action = 'unknown';

      // Set action based on HTTP method
      if (req.method === 'GET') action = 'view';
      if (req.method === 'POST') action = 'create';
      if (req.method === 'PUT') action = 'update';
      if (req.method === 'DELETE') action = 'delete';
      if (req.method === 'PATCH') action = 'patch';

      // Add specific action overrides based on the URL
      if (req.path.includes('/complete')) action = 'delivery_completed';
      if (req.path.includes('/status')) action = 'status_change';
      if (req.path.includes('/assign')) action = 'assignment';
      if (req.path.includes('/approve')) action = 'approval';
      if (req.path.includes('/reject')) action = 'rejection';
      if (req.path.includes('/accept')) action = 'delivery_accepted';
      if (req.path.includes('/start')) action = 'delivery_started';
      if (req.path.includes('/location')) action = 'location_update';

      // Get user info (could be web user or mobile driver)
      const userId = req.user?.id || req.driver?.id || 'unknown';
      const username = req.user?.username || req.driver?.username || 'unknown';

      // Log the action
      AuditService.logAction(
        userId,
        username,
        action,
        entityType,
        entityId,
        {
          path: req.path,
          method: req.method,
          statusCode: res.statusCode,
          userType: req.user ? 'web_user' : req.driver ? 'mobile_driver' : 'unknown',
          requestBody: req.method !== 'GET' ? req.body : undefined,
          query: Object.keys(req.query).length > 0 ? req.query : undefined
        }
      ).catch(err => {
        console.error('Error logging audit action:', err);
      });
    }
  };

  next();
});

// Auth routes
console.log('🔗 Mounting auth routes at /auth');
app.use('/auth', authRoutes);

// Mobile driver routes (mount before web routes to avoid conflicts)
console.log('🔗 Mounting mobile driver routes at /mobile');
app.use('/mobile', mobileDriverRoutes);

// User management routes
console.log('🔗 Mounting management routes...');
app.use('/drivers', driversRoutes);
app.use('/operators', operatorsRoutes);
app.use('/helpers', helpersRoutes);
app.use('/staffs', staffRoutes);

// Mount client routes with enhanced logging
console.log('🔗 Mounting client routes at /clients...');
app.use('/clients', (req, res, next) => {
  console.log(`📍 Client route request: ${req.method} ${req.originalUrl}`);
  console.log('📍 Request path:', req.path);
  console.log('📍 Base URL:', req.baseUrl);
  next();
}, clientRoutes);
console.log('✅ Client routes mounted successfully');

// Mount truck routes
app.use('/trucks', truckRoutes);

// Mount admin routes
console.log('🔗 Mounting admin routes at /admin');
app.use('/admin', adminRoutes);

// Mount validation routes
console.log('🔗 Mounting validation routes at /validation');
app.use('/validation', validationRoutes);
app.use('/client/pinned-locations', pinnedLocationsRoutes);

// Mount audit routes
console.log('🔗 Mounting audit routes at /audit');
app.use('/audit', auditRoutes);

// Mount delivery routes with driver assignment integration
console.log('🔗 Mounting delivery routes at /deliveries');
app.use('/deliveries', (req, res, next) => {
  // Add driver assignment hook for new deliveries
  if (req.method === 'POST' && req.path === '/') {
    const originalEnd = res.end;
    res.end = function () {
      originalEnd.apply(this, arguments);

      // If delivery was created successfully, assign a driver
      if (res.statusCode >= 200 && res.statusCode < 300 && req.deliveryId) {
        console.log('🚛 New delivery created, attempting driver assignment...');

        // Async driver assignment (don't wait for it)
        setTimeout(async () => {
          try {
            await MobileDriverService.assignRandomDriver(req.deliveryId, req.deliveryData);
          } catch (error) {
            console.error('❌ Failed to assign driver:', error.message);
          }
        }, 1000); // 1 second delay to ensure delivery is fully created
      }
    };
  }
  next();
}, deliveryRoutes);

// Mount notification routes
console.log('🔗 Mounting notification routes at /notifications');
app.use('/notifications', notificationRoutes);

// Mount payment routes
console.log('🔗 Mounting payment routes at /payments');
app.use('/payments', paymentRoutes);

// Mount tracking routes
console.log('🔗 Mounting tracking routes at /tracking');
app.use('/tracking', trackingRoutes);

// Simple file scanning routes (no authentication required for testing)
app.use('/simple-files', simpleFileRoutes);

// Document routes
app.use('/documents', documentRoutes);

// Enhanced upload routes with file replacement and better organization
app.use('/upload', enhancedUploadRoutes);

// Report routes for filtered data exports
console.log('🔗 Mounting report routes at /reports');
app.use('/reports', reportRoutes);

// Migration routes for one-time database updates
console.log('🔗 Mounting migration routes at /migrations');
app.use('/migrations', migrationRoutes);

// PayMongo routes removed


app.get('/payments/failed', (req, res) => {
  const { deliveryId } = req.query;
  console.log('❌ Payment failed for delivery:', deliveryId);

  res.send(`
    <html>
      <head>
        <title>Payment Failed - Trucking Management</title>
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .failed-container { 
            background: white; 
            padding: 40px; 
            border-radius: 15px; 
            display: inline-block; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            max-width: 500px;
            width: 90%;
          }
          .failed-icon { 
            font-size: 80px; 
            color: #ef4444; 
            margin-bottom: 20px;
          }
          h1 { 
            color: #dc2626; 
            margin-bottom: 10px; 
            font-size: 2.5em;
            font-weight: 300;
          }
          p { 
            color: #6b7280; 
            margin: 15px 0; 
            font-size: 1.1em;
            line-height: 1.6;
          }
          .delivery-id { 
            background: #fef2f2; 
            padding: 15px; 
            border-radius: 8px; 
            font-family: 'Courier New', monospace; 
            margin: 25px 0; 
            border-left: 4px solid #ef4444;
            font-size: 1.1em;
          }
          .mode-badge { 
            background: #ef4444; 
            color: white; 
            padding: 10px 20px; 
            border-radius: 25px; 
            font-size: 14px; 
            font-weight: bold; 
            margin: 15px 0; 
            display: inline-block;
          }
          .retry-btn {
            background: #10b981;
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            margin: 10px;
            text-decoration: none;
            display: inline-block;
            transition: transform 0.2s;
          }
          .retry-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
          }
          .close-btn { 
            background: #6b7280; 
            color: white; 
            border: none; 
            padding: 15px 30px; 
            border-radius: 8px; 
            cursor: pointer; 
            font-size: 16px; 
            margin: 10px;
            transition: transform 0.2s;
          }
          .close-btn:hover { 
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
          }
        </style>
      </head>
      <body>
        <div class="failed-container">
          <div class="failed-icon">❌</div>
          <h1>Payment Failed</h1>
          <p>Your payment could not be processed. This may be due to insufficient funds, network issues, or payment cancellation.</p>
          <div class="delivery-id">Delivery ID: ${deliveryId || 'N/A'}</div>
          <div class="mode-badge">REAL PAYMONGO INTEGRATION</div>
          <p>You can retry the payment from your dashboard or contact support if the issue persists.</p>
          <a href="/client/payment-management" class="retry-btn">Return to Dashboard</a>
          <button class="close-btn" onclick="window.close()">Close Window</button>
        </div>
        <script>
          // Auto-redirect after 15 seconds
          setTimeout(() => {
            if (window.opener) {
              window.opener.location.reload();
              window.close();
            } else {
              window.location.href = '/client/payment-management';
            }
          }, 15000);
        </script>
      </body>
    </html>
  `);
});

// Health check
app.get('/', (req, res) => res.json({
  status: 'ok',
  message: '🚚 Trucking API up and running (Firebase Edition with Mobile Support)',
  timestamp: new Date().toISOString(),
  database: 'Firebase Firestore',
  features: ['Web Dashboard', 'Mobile Driver App', 'Real-time Notifications']
}));

// Add a specific route to check Firebase connection
app.get('/api/firestore-test', async (req, res) => {
  try {
    // Attempt to access a Firestore collection
    const testDoc = await db.collection('_test_connection').doc('test').get();

    if (!testDoc.exists) {
      // Create test document if it doesn't exist
      await db.collection('_test_connection').doc('test').set({
        message: 'Connection successful',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      status: 'success',
      message: 'Firebase Firestore connection is working properly'
    });
  } catch (error) {
    console.error('Firestore test error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to connect to Firebase Firestore',
      error: error.message
    });
  }
});

// Add a specific route to list all client routes
app.get('/debug/client-routes', (req, res) => {
  const clientRoutesList = [];
  clientRoutes.stack.forEach((r) => {
    if (r.route) {
      clientRoutesList.push({
        path: r.route.path,
        methods: Object.keys(r.route.methods)
      });
    }
  });
  res.json({ clientRoutes: clientRoutesList });
});

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

  res.json({ routes });
});

// Add a test route for debugging
console.log('➕ Adding test route at /api/test');
app.get('/api/test', (req, res) => {
  console.log('🧪 Test route hit');
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
      '/api/mobile',
      '/api/drivers',
      '/api/operators',
      '/api/helpers',
      '/api/staffs',
      '/api/clients',
      '/api/trucks',
      '/api/deliveries',
      '/api/notifications',
      '/api/audit',
      '/api/firestore-test'
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

// Start server only if this file is run directly (not imported by Cloud Functions)
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server listening on http://localhost:${PORT}`);
    console.log(`📝 API documentation available at http://localhost:${PORT}/api-docs`);
    console.log(`🔍 Debug routes available at http://localhost:${PORT}/debug/routes`);
    console.log(`🔍 Client routes debug at http://localhost:${PORT}/debug/client-routes`);
    console.log(`⚡ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔥 Database: Firebase Firestore`);

    // Log all registered routes after server starts
    console.log('\n📋 Registered API routes:');
    app._router.stack.forEach((middleware) => {
      if (middleware.route) {
        console.log(`   ${middleware.route.path}`);
      } else if (middleware.name === 'router') {
        console.log(`   Router middleware: ${middleware.regexp}`);
      }
    });
    console.log('\n');
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received. Closing HTTP server...');
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  });
}

module.exports = app