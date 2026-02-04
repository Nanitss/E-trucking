/**
 * API Configuration
 * 
 * This module provides the correct API base URL based on the environment:
 * - In production (Firebase Hosting): Uses relative paths ('/api/...')
 *   which get proxied to Firebase Functions via rewrites in firebase.json
 * - In development: Uses localhost:5007 for the local backend server
 */

// Detect if we're running in production (Firebase Hosting)
const isLocalhost = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const isProduction = typeof window !== 'undefined' && (
    process.env.NODE_ENV === 'production' ||
    window.location.hostname.includes('web.app') ||
    window.location.hostname.includes('firebaseapp.com')
);

// In production, use empty string (relative URLs work with firebase.json rewrites)
// In development (localhost), use localhost:5007
export const API_BASE_URL = isLocalhost
    ? (process.env.REACT_APP_API_URL || 'http://localhost:5007')
    : '';

// Helper function to get the full API path
// This handles the /api prefix correctly for both environments
export const getApiPath = (path) => {
    const cleanPath = path.startsWith('/api') ? path : `/api${path}`;
    return `${API_BASE_URL}${cleanPath}`;
};

// Helper function to get the API URL (for backward compatibility)
export const getApiBaseUrl = () => API_BASE_URL;

// Export environment detection for debugging
export const isProductionEnvironment = isProduction;
export const isLocalEnvironment = isLocalhost;

export default API_BASE_URL;
