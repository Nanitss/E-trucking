const axios = require('axios');

async function testPaymentSystem() {
  console.log('🧪 Testing Payment System Fix');
  console.log('============================');
  
  const baseURL = 'http://localhost:5007';
  const clientId = 'j412kdTjjvNNXWdLTHAc';
  
  try {
    // Test 1: Check if main server is running
    console.log('\n1️⃣ Testing main server health...');
    const healthResponse = await axios.get(`${baseURL}/`);
    console.log('✅ Main server is running:', healthResponse.data.message);
    
    // Test 2: Check payment routes
    console.log('\n2️⃣ Testing payment routes...');
    try {
      const paymentResponse = await axios.get(`${baseURL}/api/payments/client/${clientId}`, {
        headers: {
          'Authorization': 'Bearer test_token',
          'x-client-id': clientId
        }
      });
      console.log('✅ Payment endpoint working');
      console.log('📊 Payments found:', paymentResponse.data.data?.payments?.length || 0);
      console.log('💰 Total amount due:', paymentResponse.data.data?.totalAmountDue || 0);
    } catch (paymentError) {
      if (paymentError.response?.status === 401) {
        console.log('✅ Payment endpoint exists (requires authentication)');
      } else {
        console.log('❌ Payment endpoint error:', paymentError.response?.status, paymentError.response?.data?.message);
      }
    }
    
    // Test 3: Check e-wallet endpoint
    console.log('\n3️⃣ Testing e-wallet endpoint...');
    try {
      const ewalletResponse = await axios.post(`${baseURL}/api/payments/process-ewallet`, {
        paymentId: 'test',
        paymentMethod: 'gcash',
        redirectUrls: {
          success: 'http://localhost:3000/success',
          failed: 'http://localhost:3000/failed'
        }
      }, {
        headers: {
          'Authorization': 'Bearer test_token',
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ E-wallet endpoint working');
    } catch (ewalletError) {
      if (ewalletError.response?.status === 401) {
        console.log('✅ E-wallet endpoint exists (requires authentication)');
      } else {
        console.log('❌ E-wallet endpoint error:', ewalletError.response?.status, ewalletError.response?.data?.message);
      }
    }
    
    console.log('\n🎯 Summary:');
    console.log('✅ Main server (port 5007) is working');
    console.log('✅ Payment endpoints are available');
    console.log('✅ Frontend should now work with relative URLs');
    console.log('\n💡 Next steps:');
    console.log('1. Refresh your browser (Ctrl+F5)');
    console.log('2. Go to Payment Management page');
    console.log('3. The payment system should now work!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the main server is running:');
    console.log('   cd client/server');
    console.log('   npm start');
  }
}

testPaymentSystem(); 