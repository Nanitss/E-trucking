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

// Initialize Firebase
let app;
let database;
let analytics;

try {
  app = initializeApp(firebaseConfig);
  database = getDatabase(app); // ✅ This connects to Realtime Database for GPS tracking
  analytics = getAnalytics(app);
  console.log("✅ Firebase initialized successfully");
  console.log("✅ Realtime Database connected for GPS tracking");
} catch (error) {
  console.error("❌ Firebase initialization error:", error);
}

export { app, database, analytics };
