// Create this file as test-route-loading.js in your server folder
// To run: node test-route-loading.js

try {
    console.log('Testing route file loading...');
    const clientRoutes = require('./routes/clientRoutes');
    console.log('✅ clientRoutes loaded successfully');
    console.log('Type:', typeof clientRoutes);
    console.log('Is function?', typeof clientRoutes === 'function');
    console.log('Routes:', clientRoutes.stack?.length || 'No routes found');
  } catch (error) {
    console.error('❌ Error loading clientRoutes:', error.message);
    console.error('Stack:', error.stack);
  }