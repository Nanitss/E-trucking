const axios = require('axios');

async function testBookingEndpoint() {
  try {
    console.log('🧪 Testing booking endpoint...');
    
    // Test if server is running
    const healthCheck = await axios.get('http://localhost:5007/api/clients/test');
    console.log('✅ Server is running:', healthCheck.data);
    
    // Test booking endpoint (this will fail due to auth, but should not hang)
    try {
      const bookingTest = await axios.post('http://localhost:5007/api/clients/truck-rental', {
        pickupLocation: 'Test Pickup',
        dropoffLocation: 'Test Dropoff',
        weight: 5,
        deliveryDate: '2024-12-25',
        deliveryTime: '10:00',
        selectedTrucks: ['test-truck-id']
      }, {
        timeout: 10000 // 10 second timeout
      });
      console.log('✅ Booking endpoint responded:', bookingTest.data);
    } catch (bookingError) {
      if (bookingError.response) {
        console.log('✅ Booking endpoint responded with error (expected):', bookingError.response.status, bookingError.response.data);
      } else if (bookingError.code === 'ECONNABORTED') {
        console.log('❌ Booking endpoint timed out - this indicates a hanging issue');
      } else {
        console.log('❌ Booking endpoint error:', bookingError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testBookingEndpoint(); 