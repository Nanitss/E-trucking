// Firebase configuration for the trucking app
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin SDK
// Cloud Functions automatically provides credentials via Application Default Credentials
try {
  if (!admin.apps.length) {
    // Check if running in Firebase Cloud Functions (FUNCTION_TARGET is set by Cloud Functions)
    const isCloudFunctions = process.env.FUNCTION_TARGET || process.env.K_SERVICE || process.env.GCLOUD_PROJECT;

    // Check for explicit credentials with either prefix
    const projectId = process.env.FB_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
    const clientEmail = process.env.FB_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FB_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;
    const databaseURL = process.env.FB_DATABASE_URL || process.env.FIREBASE_DATABASE_URL || 'https://e-trucking-8d905-default-rtdb.asia-southeast1.firebasedatabase.app';

    const hasExplicitCredentials = projectId && clientEmail && privateKey;

    if (hasExplicitCredentials) {
      // Use explicit credentials from environment
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: projectId,
          clientEmail: clientEmail,
          privateKey: privateKey?.replace(/\\n/g, '\n').replace(/"/g, '')
        }),
        databaseURL: databaseURL
      });
      console.log('✅ Firebase Admin SDK initialized with explicit credentials');
    } else if (isCloudFunctions) {
      // Running in Cloud Functions - use Application Default Credentials
      console.log('🔧 Running in Cloud Functions environment, using default credentials');
      admin.initializeApp({
        databaseURL: databaseURL
      });
      console.log('✅ Firebase Admin SDK initialized with Application Default Credentials');
    } else {
      // Local development mode
      console.log('⚠️ Firebase credentials not found in environment variables');
      console.log('🔧 Running in local development mode');

      // Try to initialize with just the project ID if available
      if (projectId) {
        admin.initializeApp({
          projectId: projectId,
          databaseURL: databaseURL
        });
        console.log('✅ Firebase Admin SDK initialized in development mode with project ID');
      } else {
        admin.initializeApp();
        console.log('✅ Firebase Admin SDK initialized in development mode');
      }
    }
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  console.log('🔧 Attempting to continue...');
}

// Initialize Firestore
let db;
try {
  db = getFirestore();

  // Configure Firestore settings to ignore undefined properties
  db.settings({
    ignoreUndefinedProperties: true
  });

  console.log('✅ Firestore initialized successfully with ignoreUndefinedProperties enabled');
} catch (error) {
  console.error('❌ Firestore initialization error:', error);
  console.log('⚠️ Some database operations may not work');
  // Create a mock db object for development
  db = {
    collection: () => ({
      doc: () => ({
        get: () => Promise.resolve({ exists: false }),
        set: () => Promise.resolve(),
        update: () => Promise.resolve(),
        delete: () => Promise.resolve()
      }),
      add: () => Promise.resolve({ id: 'mock-id' }),
      where: () => ({
        get: () => Promise.resolve({ empty: true, docs: [] })
      })
    })
  };
}

// Initialize Realtime Database
let realtimeDb;
try {
  // Only try to initialize Realtime Database if we have a database URL or proper credentials
  const hasDatabaseUrl = process.env.FIREBASE_DATABASE_URL || process.env.FB_DATABASE_URL || databaseURL;
  const hasFirebaseCredentials = process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY;

  if (admin.apps.length > 0 && (hasDatabaseUrl || hasFirebaseCredentials)) {
    realtimeDb = admin.database();
    console.log('✅ Firebase Realtime Database initialized successfully');
  } else {
    console.log('⚠️ Firebase Realtime Database not available - no database URL configured');
    // Create a mock realtimeDb for development/when not configured
    realtimeDb = {
      ref: () => ({
        once: () => Promise.resolve({ val: () => null }),
        set: () => Promise.resolve(),
        update: () => Promise.resolve(),
        push: () => Promise.resolve({ key: 'mock-key' }),
        on: () => { },
        off: () => { }
      })
    };
  }
} catch (error) {
  console.error('❌ Realtime Database initialization error:', error.message);
  console.log('⚠️ GPS tracking features may not work');
  // Create a mock realtimeDb for development
  realtimeDb = {
    ref: () => ({
      once: () => Promise.resolve({ val: () => null }),
      set: () => Promise.resolve(),
      update: () => Promise.resolve(),
      push: () => Promise.resolve({ key: 'mock-key' }),
      on: () => { },
      off: () => { }
    })
  };
}

// Export the admin SDK and database references
module.exports = {
  admin,
  db,
  realtimeDb,

  // Helper function to handle quota exceeded errors
  isQuotaExceeded: (error) => {
    return error.code === 8 ||
      error.message?.includes('RESOURCE_EXHAUSTED') ||
      error.message?.includes('Quota exceeded');
  }
}; 