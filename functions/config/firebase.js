// Firebase configuration for the trucking app
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin SDK
// You'll need to replace this with your actual Firebase service account details
// Download this from Firebase Console > Project Settings > Service Accounts
try {
  if (!admin.apps.length) {
    // Check if Firebase credentials are available
    const hasFirebaseCredentials = process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY;

    if (hasFirebaseCredentials) {
      // Production/Development with real Firebase
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, '')
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL
      });
      console.log('✅ Firebase Admin SDK initialized successfully with credentials');
    } else {
      // Development mode without Firebase credentials
      console.log('⚠️ Firebase credentials not found in environment variables');
      console.log('🔧 Running in development mode - some features may not work');
      console.log('📝 To fix this, set these environment variables:');
      console.log('   - FIREBASE_PROJECT_ID');
      console.log('   - FIREBASE_CLIENT_EMAIL');
      console.log('   - FIREBASE_PRIVATE_KEY');

      // Initialize with minimal config for development
      admin.initializeApp({
        projectId: 'trucking-dev-mode',
        // Use application default credentials or emulator
      });
      console.log('✅ Firebase Admin SDK initialized in development mode');
    }
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  console.log('🔧 Attempting to continue in development mode...');
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
  const hasDatabaseUrl = process.env.FIREBASE_DATABASE_URL;
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