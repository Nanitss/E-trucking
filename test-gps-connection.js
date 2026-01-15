// Test script to simulate GPS data updates for truck_12345
const axios = require('axios');

// Configuration
const SERVER_URL = 'http://localhost:5007';
const TRUCK_ID = 'truck_12345';

// Sample GPS coordinates around Metro Manila
const testLocations = [
  { lat: 14.903787, lon: 120.788956, speed: 25 }, // Starting location
  { lat: 14.905123, lon: 120.790234, speed: 30 }, // Moving north
  { lat: 14.907456, lon: 120.792567, speed: 35 }, // Continuing
  { lat: 14.909789, lon: 120.794890, speed: 40 }, // Speeding up
  { lat: 14.912123, lon: 120.797234, speed: 45 }, // Still moving
  { lat: 14.914456, lon: 120.799567, speed: 50 }, // Faster
  { lat: 14.916789, lon: 120.801890, speed: 55 }, // Even faster
  { lat: 14.919123, lon: 120.804234, speed: 60 }, // High speed
];

let currentLocationIndex = 0;

async function sendGPSUpdate() {
  try {
    const location = testLocations[currentLocationIndex];
    
    const gpsData = {
      truckId: TRUCK_ID,
      lat: location.lat,
      lon: location.lon,
      speed: location.speed,
      heading: Math.random() * 360, // Random heading
      accuracy: Math.floor(Math.random() * 10) + 5, // 5-15m accuracy
      gpsFix: true,
      satellites: Math.floor(Math.random() * 5) + 8 // 8-12 satellites
    };

    console.log(`📡 Sending GPS update for ${TRUCK_ID}:`, {
      lat: gpsData.lat,
      lon: gpsData.lon,
      speed: gpsData.speed,
      heading: Math.round(gpsData.heading),
      accuracy: gpsData.accuracy,
      satellites: gpsData.satellites
    });

    const response = await axios.post(`${SERVER_URL}/api/tracking/gps/update`, gpsData);
    
    if (response.data.success) {
      console.log('✅ GPS update successful');
    } else {
      console.log('❌ GPS update failed:', response.data.message);
    }

    // Move to next location
    currentLocationIndex = (currentLocationIndex + 1) % testLocations.length;

  } catch (error) {
    console.error('❌ Error sending GPS update:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

async function testTrackingAPI() {
  try {
    console.log('🔍 Testing tracking API...');
    
    // First, let's check if we can get tracking data for a delivery
    // You'll need to replace 'your-delivery-id' with an actual delivery ID
    const deliveryId = 'test-delivery-id';
    
    console.log(`📋 Attempting to get tracking data for delivery: ${deliveryId}`);
    
    try {
      const response = await axios.get(`${SERVER_URL}/api/tracking/delivery/${deliveryId}`);
      console.log('✅ Tracking API response:', response.data);
    } catch (err) {
      console.log('ℹ️ No delivery found (expected if no test delivery exists)');
    }

  } catch (error) {
    console.error('❌ Error testing tracking API:', error.message);
  }
}

// Main execution
async function main() {
  console.log('🚛 GPS Module Connection Test');
  console.log('==============================');
  console.log(`Server: ${SERVER_URL}`);
  console.log(`Truck ID: ${TRUCK_ID}`);
  console.log('==============================\n');

  // Test the tracking API first
  await testTrackingAPI();

  console.log('\n🔄 Starting GPS simulation...');
  console.log('Press Ctrl+C to stop\n');

  // Send initial GPS update
  await sendGPSUpdate();

  // Set up interval to send GPS updates every 15 seconds
  const interval = setInterval(sendGPSUpdate, 15000);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping GPS simulation...');
    clearInterval(interval);
    console.log('✅ GPS simulation stopped');
    process.exit(0);
  });
}

// Run the test
main().catch(console.error); 