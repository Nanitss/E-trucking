const axios = require('axios');

async function testEWalletEndpoint() {
  try {
    console.log('🔍 Testing e-wallet payment endpoint...');
    
    // Test data
    const testData = {
      paymentId: 'T7jIsLWeXa2YujzVyBNM', // One of your existing delivery IDs
      paymentMethod: 'gcash',
      redirectUrls: {
        success: 'http://localhost:3000/client/payment-management?status=success',
        failed: 'http://localhost:3000/client/payment-management?status=failed',
        cancel: 'http://localhost:3000/client/payment-management?status=cancelled'
      }
    };
    
    // Test the e-wallet endpoint
    const response = await axios.post('http://localhost:5000/api/payments/process-ewallet', testData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test_token' // Will need proper auth in real usage
      }
    });
    
    console.log('✅ E-wallet endpoint response:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
    if (response.data?.success) {
      console.log('\n🎉 E-wallet endpoint is working!');
      console.log('Redirect URL:', response.data.data?.redirectUrl);
      console.log('Source ID:', response.data.data?.sourceId);
    }
    
  } catch (error) {
    console.error('❌ Error testing e-wallet endpoint:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testEWalletEndpoint(); 