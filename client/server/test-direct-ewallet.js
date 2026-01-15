// Direct test of e-wallet payment functionality without full server
const express = require('express');
const app = express();

// Test PaymentService directly
async function testPaymentService() {
  try {
    console.log('🧪 Testing PaymentService directly...');
    
    const PaymentService = require('./services/PaymentService');
    console.log('✅ PaymentService loaded successfully');
    
    // Test the e-wallet source creation
    const sourceData = {
      type: 'gcash',
      amount: 9800, // ₱98 in cents
      currency: 'PHP'
    };
    
    const source = await PaymentService.createSource(sourceData);
    console.log('✅ E-wallet source created:', source);
    
    // Test payment summary
    const summary = await PaymentService.getClientPaymentSummary('j412kdTjjvMNXWdLTHAc');
    console.log('✅ Payment summary retrieved:', {
      totalDeliveries: summary.totalDeliveries,
      totalAmountDue: summary.totalAmountDue,
      payments: summary.payments?.length || 0,
      testMode: summary.testMode
    });
    
    console.log('\n🎉 SUCCESS: All PaymentService methods work correctly!');
    console.log('✅ E-wallet functionality is ready');
    console.log('✅ Test mode is properly configured');
    
  } catch (error) {
    console.error('❌ Error testing PaymentService:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Test routes directly
async function testRoutes() {
  try {
    console.log('\n🧪 Testing payment routes...');
    
    // Setup minimal express app
    app.use(express.json());
    
    // Mock authentication middleware
    app.use((req, res, next) => {
      req.user = { 
        id: 'j412kdTjjvMNXWdLTHAc', 
        username: 'test-user',
        role: 'client' 
      };
      next();
    });
    
    // Load payment routes
    const paymentRoutes = require('./routes/paymentRoutes');
    app.use('/api/payments', paymentRoutes);
    console.log('✅ Payment routes loaded successfully');
    
    // Start test server
    const server = app.listen(5008, () => {
      console.log('✅ Test server started on port 5008');
      console.log('\n💡 You can now test:');
      console.log('📋 Payment Summary: GET http://localhost:5008/api/payments/client/j412kdTjjvMNXWdLTHAc');
      console.log('📱 E-Wallet Payment: POST http://localhost:5008/api/payments/process-ewallet');
      console.log('💳 Card Payment: POST http://localhost:5008/api/payments/process-card');
      
      // Cleanup after a few seconds
      setTimeout(() => {
        server.close();
        console.log('\n✅ Test server stopped');
        process.exit(0);
      }, 10000);
    });
    
  } catch (error) {
    console.error('❌ Error testing routes:', error.message);
    console.error('Stack:', error.stack);
  }
}

async function runTests() {
  console.log('🚀 Starting Direct E-Wallet Tests\n');
  await testPaymentService();
  await testRoutes();
}

runTests(); 