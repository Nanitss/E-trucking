/**
 * E-Trucking API Cloud Functions Entry Point
 * 
 * This file exports the Express app as a Firebase Cloud Function (1st Gen).
 * Using v1 functions to maintain compatibility with existing deployed function.
 */

const functions = require('firebase-functions/v1');

// Import the Express app from the local server.js
const app = require('./server');

// Export the Express app as a Cloud Function (1st Gen)
exports.api = functions.https.onRequest(app);
