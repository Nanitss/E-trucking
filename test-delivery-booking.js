const axios = require('axios');

// Test script to check delivery booking and driver assignment
async function testDeliveryBooking() {
  try {
    console.log('🧪 Testing delivery booking and driver assignment...');
    
    // First, let's check if there are active drivers
    console.log('\n1. Checking active drivers...');
    try {
      const driversResponse = await axios.get('http://localhost:5007/api/deliveries/debug/drivers', {
        headers: {
          'Authorization': 'Bearer test-token' // This might fail but will show us the data structure
        }
      });
      console.log('Active drivers:', driversResponse.data);
    } catch (error) {
      console.log('Driver check failed (expected if no auth):', error.response?.status);
    }
    
    // Check recent deliveries
    console.log('\n2. Checking recent deliveries...');
    try {
      const deliveriesResponse = await axios.get('http://localhost:5007/api/deliveries/debug/recent', {
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });
      console.log('Recent deliveries:', deliveriesResponse.data);
    } catch (error) {
      console.log('Deliveries check failed (expected if no auth):', error.response?.status);
    }
    
    // Test basic server connectivity
    console.log('\n3. Testing server connectivity...');
    try {
      const testResponse = await axios.get('http://localhost:5007/api/test');
      console.log('Server test:', testResponse.data);
    } catch (error) {
      console.log('Server test failed:', error.message);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
testDeliveryBooking(); 