// Firebase Client SDK Configuration
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// These values are loaded from environment variables for security
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

// Check if Firebase config is properly set
const hasFirebaseConfig = firebaseConfig.projectId && firebaseConfig.apiKey;

// Initialize Firebase
let app = null;
let database = null;
let analytics = null;

if (hasFirebaseConfig) {
  try {
    app = initializeApp(firebaseConfig);

    // Only initialize Realtime Database if databaseURL is provided
    if (firebaseConfig.databaseURL) {
      database = getDatabase(app);
      console.log("✅ Realtime Database connected for GPS tracking");
    } else {
      console.log("⚠️ Firebase Realtime Database not configured - GPS tracking may not work");
    }

    // Only initialize analytics in browser environment
    if (typeof window !== 'undefined') {
      try {
        analytics = getAnalytics(app);
      } catch (analyticsError) {
        console.log("⚠️ Firebase Analytics not available");
      }
    }

    console.log("✅ Firebase initialized successfully");
  } catch (error) {
    console.error("❌ Firebase initialization error:", error);
  }
} else {
  console.log("⚠️ Firebase configuration not found - running in API-only mode");
  console.log("📝 This is normal if you're using the backend API without client-side Firebase features");
}

export { app, database, analytics };
