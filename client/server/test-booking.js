require('dotenv').config();
const axios = require('axios');

async function testMultipleBooking() {
  console.log('🧪 Testing Multiple Truck Booking\n');
  
  try {
    // Test data for multiple truck booking
    const bookingData = {
      selectedTrucks: ['truck1', 'truck2', 'truck3'], // Multiple trucks
      pickupLocation: 'Manila, Philippines',
      pickupCoordinates: { lat: 14.5995, lng: 120.9842 },
      dropoffLocation: 'Quezon City, Philippines', 
      dropoffCoordinates: { lat: 14.6091, lng: 121.0223 },
      weight: 10, // 10 tons requiring multiple trucks
      deliveryDate: '2024-01-15',
      deliveryTime: '10:00'
    };
    
    console.log('📦 Booking Data:', JSON.stringify(bookingData, null, 2));
    
    // Check if server is running
    try {
      const healthCheck = await axios.get('http://localhost:5007/api/health');
      console.log('✅ Server is running');
    } catch (error) {
      console.log('❌ Server is not running on port 5007');
      return;
    }
    
    // Check available trucks
    console.log('\n1. Checking available trucks...');
    try {
      const trucksResponse = await axios.get('http://localhost:5007/api/trucks');
      console.log(`✅ Found ${trucksResponse.data.length} trucks in database`);
      
      const availableTrucks = trucksResponse.data.filter(truck => 
        truck.truckStatus === 'available' || truck.truckStatus === 'allocated'
      );
      console.log(`✅ ${availableTrucks.length} trucks are available for booking`);
      
      availableTrucks.forEach(truck => {
        console.log(`   - ${truck.truckPlate}: ${truck.truckCapacity} tons (${truck.truckStatus})`);
      });
      
      // Update booking data with real truck IDs
      if (availableTrucks.length >= 2) {
        bookingData.selectedTrucks = availableTrucks.slice(0, 2).map(truck => truck.id);
        console.log(`✅ Updated booking to use real truck IDs: ${bookingData.selectedTrucks}`);
      }
    } catch (error) {
      console.log('❌ Error fetching trucks:', error.message);
    }
    
    // Check active drivers
    console.log('\n2. Checking active drivers...');
    try {
      const driversResponse = await axios.get('http://localhost:5007/api/drivers');
      const activeDrivers = driversResponse.data.filter(driver => 
        driver.driverStatus === 'active'
      );
      console.log(`✅ Found ${activeDrivers.length} active drivers`);
      
      activeDrivers.forEach(driver => {
        console.log(`   - ${driver.driverName} (${driver.id})`);
      });
    } catch (error) {
      console.log('❌ Error fetching drivers:', error.message);
    }
    
    console.log('\n3. Testing booking endpoint...');
    console.log('📝 This would require authentication token');
    console.log('📝 Frontend should send this data to /api/clients/truck-rental');
    console.log('📝 Backend should create separate deliveries for each truck');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testMultipleBooking().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.error('🚨 Test failed:', error);
  process.exit(1);
}); 