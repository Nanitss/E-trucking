#!/usr/bin/env node

/**
 * Test script to simulate a truck booking request
 * This will help debug what fields are missing
 */

const axios = require('axios');

async function testBookingRequest() {
  console.log('🧪 Testing Truck Booking Request...');
  
  try {
    // Test 1: Complete request with all required fields
    console.log('\n🔍 Test 1: Complete Request (Should Work)');
    
    const completeRequest = {
      selectedTrucks: ['truck_12345'],
      pickupLocation: 'Manila, Philippines',
      dropoffLocation: 'Quezon City, Philippines',
      weight: '5.5',
      deliveryDate: '2024-01-20',
      deliveryTime: '09:00',
      pickupCoordinates: { lat: 14.5995, lng: 120.9842 },
      dropoffCoordinates: { lat: 14.6091, lng: 121.0223 },
      contactPerson: 'John Doe',
      contactNumber: '+63 912 345 6789'
    };
    
    console.log('📤 Sending complete request:');
    console.log(JSON.stringify(completeRequest, null, 2));
    
    // Test 2: Missing required fields
    console.log('\n🔍 Test 2: Missing Required Fields (Should Fail)');
    
    const incompleteRequest = {
      selectedTrucks: ['truck_12345'],
      pickupLocation: 'Manila, Philippines',
      // Missing: dropoffLocation, weight, deliveryDate, deliveryTime, contactPerson, contactNumber
      pickupCoordinates: { lat: 14.5995, lng: 120.9842 }
    };
    
    console.log('📤 Sending incomplete request:');
    console.log(JSON.stringify(incompleteRequest, null, 2));
    
    // Test 3: Check what the server expects
    console.log('\n📋 Server Requirements:');
    console.log('   Required Fields:');
    console.log('   ✅ selectedTrucks OR selectedTruckId');
    console.log('   ✅ pickupLocation');
    console.log('   ✅ dropoffLocation');
    console.log('   ✅ weight');
    console.log('   ✅ deliveryDate');
    console.log('   ✅ deliveryTime');
    console.log('   ✅ contactPerson');
    console.log('   ✅ contactNumber');
    console.log('   Optional Fields:');
    console.log('   📍 pickupCoordinates (defaults to Manila)');
    console.log('   📍 dropoffCoordinates (defaults to Quezon City)');
    
    console.log('\n🎯 Expected Results:');
    console.log('   - Test 1: Should pass validation');
    console.log('   - Test 2: Should fail with 400 Bad Request');
    console.log('   - Missing fields will be clearly identified');
    
    // Test 4: New simplified truck availability logic
    console.log('\n🚛 New Simplified Truck Availability Logic:');
    console.log('   ✅ Truck must be ACTIVE (any status field = "active")');
    console.log('   ❌ NO ALLOCATION REQUIRED - Any active truck can be booked');
    console.log('   ✅ More trucks should now be available for booking');
    
  } catch (error) {
    console.error('❌ Error testing booking request:', error);
  }
}

// Run the test
if (require.main === module) {
  testBookingRequest()
    .then(() => {
      console.log('\n✅ Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testBookingRequest };
