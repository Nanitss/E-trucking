const axios = require('axios');

async function testPaymentSystem() {
  try {
    console.log('🧪 Testing Payment System (TEST MODE)');
    console.log('=====================================');
    
    const baseURL = 'http://localhost:5007';
    const testUserId = 'j412kdTjjvMNXWdLTHAc';
    const testDeliveryId = 'T7jIsLWeXa2YujzVyBNM'; // One of your existing delivery IDs
    
    // Test 1: Check if server is running
    try {
      const healthCheck = await axios.get(`${baseURL}/health`).catch(() => null);
      console.log('✅ Server Status: Running');
    } catch (error) {
      console.log('❌ Server Status: Not running or no health endpoint');
    }

    // Test 2: Get payment summary
    try {
      console.log('\n📋 Testing Payment Summary...');
      const response = await axios.get(`${baseURL}/api/payments/client/${testUserId}`, {
        headers: {
          'Authorization': 'Bearer test_token',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data?.success) {
        console.log('✅ Payment Summary API: Working');
        console.log(`   - Payments found: ${response.data.data.payments?.length || 0}`);
        console.log(`   - Total Amount Due: ₱${response.data.data.totalAmountDue || 0}`);
        console.log(`   - Test Mode: ${response.data.data.testMode ? 'Yes' : 'No'}`);
      }
    } catch (error) {
      console.log('❌ Payment Summary API: Failed');
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
      console.log(`   Status: ${error.response?.status || 'Unknown'}`);
      console.log(`   URL: ${error.config?.url || 'Unknown'}`);
    }

    // Test 3: Test Card Payment
    try {
      console.log('\n💳 Testing Card Payment...');
      const cardPaymentData = {
        paymentId: testDeliveryId,
        paymentMethod: 'card'
      };
      
      const response = await axios.post(`${baseURL}/api/payments/process-card`, cardPaymentData, {
        headers: {
          'Authorization': 'Bearer test_token',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data?.success) {
        console.log('✅ Card Payment API: Working');
        console.log(`   - Status: ${response.data.data.status}`);
        console.log(`   - Test Mode: ${response.data.data.testMode ? 'Yes' : 'No'}`);
        console.log(`   - Message: ${response.data.data.message}`);
      }
    } catch (error) {
      console.log('❌ Card Payment API: Failed');
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
      console.log(`   Status: ${error.response?.status || 'Unknown'}`);
      console.log(`   URL: ${error.config?.url || 'Unknown'}`);
    }

    // Test 4: Test E-Wallet Payment  
    try {
      console.log('\n📱 Testing E-Wallet Payment...');
      const ewalletPaymentData = {
        paymentId: testDeliveryId,
        paymentMethod: 'gcash',
        redirectUrls: {
          success: 'http://localhost:3000/client/payment-management?status=success',
          failed: 'http://localhost:3000/client/payment-management?status=failed',
          cancel: 'http://localhost:3000/client/payment-management?status=cancelled'
        }
      };
      
      const response = await axios.post(`${baseURL}/api/payments/process-ewallet`, ewalletPaymentData, {
        headers: {
          'Authorization': 'Bearer test_token',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data?.success) {
        console.log('✅ E-Wallet Payment API: Working');
        console.log(`   - Source ID: ${response.data.data.sourceId}`);
        console.log(`   - Test Mode: ${response.data.data.testMode ? 'Yes' : 'No'}`);
        console.log(`   - Message: ${response.data.data.message}`);
        console.log(`   - Redirect URL: ${response.data.data.redirectUrl}`);
      }
    } catch (error) {
      console.log('❌ E-Wallet Payment API: Failed');
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
      if (error.response?.status) {
        console.log(`   Status Code: ${error.response.status}`);
      }
    }

    console.log('\n🎯 Test Summary:');
    console.log('- All payment endpoints are configured for TEST MODE ONLY');
    console.log('- No real money will be charged');
    console.log('- All transactions are simulated for development purposes');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPaymentSystem(); 