// Firebase Client SDK Configuration
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// These values are loaded from environment variables for security
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
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
