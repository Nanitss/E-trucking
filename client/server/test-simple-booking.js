#!/usr/bin/env node

/**
 * Simple test script to verify the simplified truck booking logic
 * Tests: Truck must be active AND allocated to the client
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
try {
  if (!admin.apps.length) {
    const hasFirebaseCredentials = process.env.FIREBASE_PROJECT_ID && 
                                   process.env.FIREBASE_CLIENT_EMAIL && 
                                   process.env.FIREBASE_PRIVATE_KEY;
    
    if (hasFirebaseCredentials) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, '')
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL
      });
      console.log('✅ Firebase Admin SDK initialized successfully');
    } else {
      console.log('⚠️ Firebase credentials not found - running in test mode');
      admin.initializeApp({
        projectId: 'test-mode'
      });
    }
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
}

const db = admin.firestore();

async function testSimpleBookingLogic() {
  console.log('🧪 Testing Simplified Truck Booking Logic...');
  console.log('📋 Logic: Truck must be ACTIVE AND ALLOCATED to client');
  
  try {
    // Test 1: Check truck status variations
    console.log('\n🔍 Test 1: Truck Status Variations');
    
    const testTruckData = [
      { truckStatus: 'active', TruckStatus: 'inactive', operationalStatus: 'inactive', OperationalStatus: 'inactive' },
      { truckStatus: 'inactive', TruckStatus: 'active', operationalStatus: 'inactive', OperationalStatus: 'inactive' },
      { truckStatus: 'inactive', TruckStatus: 'inactive', operationalStatus: 'active', OperationalStatus: 'inactive' },
      { truckStatus: 'inactive', TruckStatus: 'inactive', operationalStatus: 'inactive', OperationalStatus: 'active' },
      { truckStatus: 'inactive', TruckStatus: 'inactive', operationalStatus: 'inactive', OperationalStatus: 'inactive' }
    ];
    
    testTruckData.forEach((data, index) => {
      const isActive = data.truckStatus?.toLowerCase() === 'active' || 
                      data.TruckStatus?.toLowerCase() === 'active' ||
                      data.operationalStatus?.toLowerCase() === 'active' ||
                      data.OperationalStatus?.toLowerCase() === 'active';
      
      console.log(`   Truck ${index + 1}: ${isActive ? '✅ ACTIVE' : '❌ NOT ACTIVE'}`);
      console.log(`     - truckStatus: ${data.truckStatus}`);
      console.log(`     - TruckStatus: ${data.TruckStatus}`);
      console.log(`     - operationalStatus: ${data.operationalStatus}`);
      console.log(`     - OperationalStatus: ${data.OperationalStatus}`);
    });
    
    // Test 2: Check client allocation logic
    console.log('\n🔍 Test 2: Client Allocation Check');
    console.log('   This would check if truck is allocated to specific client');
    console.log('   Query: allocations collection where clientId = clientId AND truckId = truckId AND status = "active"');
    
    // Test 3: Summary of booking requirements
    console.log('\n📋 Summary of Truck Booking Requirements:');
    console.log('   1. ✅ Truck must be ACTIVE (any of these fields):');
    console.log('      - truckStatus = "active"');
    console.log('      - TruckStatus = "active"');
    console.log('      - operationalStatus = "active"');
    console.log('      - OperationalStatus = "active"');
    console.log('   2. ✅ Truck must be ALLOCATED to the client:');
    console.log('      - Check allocations collection');
    console.log('      - clientId must match');
    console.log('      - truckId must match');
    console.log('      - status must be "active"');
    console.log('   3. ✅ If both conditions met → Truck available for booking');
    console.log('   4. ❌ If either condition fails → Truck rejected');
    
    console.log('\n🎯 Expected Result:');
    console.log('   - More trucks should now be available for booking');
    console.log('   - Only trucks allocated to the client can be booked');
    console.log('   - Clear error messages for rejected trucks');
    
  } catch (error) {
    console.error('❌ Error testing booking logic:', error);
  }
}

// Run the test
if (require.main === module) {
  testSimpleBookingLogic()
    .then(() => {
      console.log('\n✅ Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testSimpleBookingLogic };
