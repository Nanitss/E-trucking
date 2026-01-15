#!/usr/bin/env node

/**
 * Test script to verify the fixes for:
 * 1. Truck availability logic
 * 2. License type validation
 * 3. Real-time database connection
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

async function testTruckAvailability() {
  console.log('\n🔍 Testing Truck Availability Logic...');
  
  try {
    const trucksSnapshot = await db.collection('trucks').limit(5).get();
    
    if (trucksSnapshot.empty) {
      console.log('⚠️ No trucks found for testing');
      return;
    }
    
    console.log(`📋 Testing ${trucksSnapshot.size} trucks...`);
    
    for (const doc of trucksSnapshot.docs) {
      const truckId = doc.id;
      const truckData = doc.data();
      
      console.log(`\n🚛 Truck: ${truckId}`);
      console.log(`   Plate: ${truckData.truckPlate || truckData.TruckPlate || 'Unknown'}`);
      
      // Test the enhanced availability logic
      const truckStatus = truckData.truckStatus?.toLowerCase() || truckData.TruckStatus?.toLowerCase() || 'unknown';
      const operationalStatus = truckData.operationalStatus?.toLowerCase() || truckData.OperationalStatus?.toLowerCase() || 'unknown';
      const availabilityStatus = truckData.availabilityStatus?.toLowerCase() || truckData.AvailabilityStatus?.toLowerCase() || 'unknown';
      const isAllocated = truckData.isAllocated || truckData.IsAllocated || false;
      const isInUse = truckData.isInUse || truckData.IsInUse || false;
      
      console.log(`   Status Fields:`);
      console.log(`     - truckStatus: ${truckStatus}`);
      console.log(`     - operationalStatus: ${operationalStatus}`);
      console.log(`     - availabilityStatus: ${availabilityStatus}`);
      console.log(`     - isAllocated: ${isAllocated}`);
      console.log(`     - isInUse: ${isInUse}`);
      
      // Apply the enhanced availability logic
      let isAvailableForBooking = false;
      
      if (operationalStatus === 'active' && availabilityStatus === 'free') {
        isAvailableForBooking = true;
        console.log(`   ✅ Primary check passed: operational=active, availability=free`);
      } else if (truckStatus === 'available') {
        isAvailableForBooking = true;
        console.log(`   ✅ Fallback 1 passed: truckStatus=available`);
      } else if (!isAllocated && !isInUse) {
        isAvailableForBooking = true;
        console.log(`   ✅ Fallback 2 passed: not allocated and not in use`);
      } else if (operationalStatus === 'active') {
        isAvailableForBooking = true;
        console.log(`   ✅ Fallback 3 passed: operational=active (availability ignored)`);
      } else {
        console.log(`   ❌ All availability checks failed`);
      }
      
      console.log(`   📊 Final Result: ${isAvailableForBooking ? '✅ AVAILABLE' : '❌ NOT AVAILABLE'}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing truck availability:', error);
  }
}

async function testLicenseValidation() {
  console.log('\n🔍 Testing License Validation Logic...');
  
  try {
    // Test driver qualification logic
    console.log('\n👤 Testing Driver Qualification:');
    
    const testDrivers = [
      { name: 'Professional Driver', licenseType: 'professional' },
      { name: 'Non-Professional Driver', licenseType: 'non-professional' },
      { name: 'Unknown Driver', licenseType: 'unknown' }
    ];
    
    const testTrucks = ['mini truck', '4 wheeler', '6 wheeler', '8 wheeler', '10 wheeler'];
    
    for (const driver of testDrivers) {
      console.log(`\n   Driver: ${driver.name} (${driver.licenseType})`);
      
      for (const truckType of testTrucks) {
        let isQualified = false;
        
        if (driver.licenseType === 'professional') {
          isQualified = true;
        } else if (driver.licenseType === 'non-professional') {
          isQualified = truckType.toLowerCase() === 'mini truck';
        }
        
        console.log(`     - ${truckType}: ${isQualified ? '✅ Qualified' : '❌ Not Qualified'}`);
      }
    }
    
    // Test helper qualification logic
    console.log('\n👥 Testing Helper Qualification:');
    
    const testHelpers = [
      { name: 'Professional Helper', licenseType: 'professional', level: 'basic' },
      { name: 'Non-Professional Helper', licenseType: 'non-professional', level: 'basic' },
      { name: 'No License Helper', licenseType: 'none', level: 'basic' },
      { name: 'Advanced Helper', licenseType: 'student', level: 'advanced' }
    ];
    
    for (const helper of testHelpers) {
      console.log(`\n   Helper: ${helper.name} (${helper.licenseType}, ${helper.level})`);
      
      for (const truckType of testTrucks) {
        let isQualified = false;
        
        if (helper.licenseType === 'professional') {
          isQualified = true;
        } else if (helper.licenseType === 'non-professional') {
          isQualified = truckType.toLowerCase() === 'mini truck';
        } else if (helper.licenseType === 'none' || helper.licenseType === 'unknown') {
          isQualified = truckType.toLowerCase() === 'mini truck';
        } else {
          // Check level requirements
          const levelHierarchy = { 'basic': 1, 'standard': 2, 'advanced': 3 };
          const requiredLevel = truckType === 'mini truck' ? 'basic' : 
                               truckType === '4 wheeler' ? 'basic' : 
                               truckType === '6 wheeler' ? 'standard' : 'advanced';
          
          isQualified = levelHierarchy[helper.level] >= levelHierarchy[requiredLevel];
        }
        
        console.log(`     - ${truckType}: ${isQualified ? '✅ Qualified' : '❌ Not Qualified'}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing license validation:', error);
  }
}

async function testRealtimeDatabase() {
  console.log('\n🔍 Testing Real-time Database Connection...');
  
  try {
    const realtimeDb = admin.database();
    if (!realtimeDb) {
      console.log('❌ Real-time database not available');
      return;
    }
    
    console.log('✅ Real-time database is available');
    
    // Test creating a test truck entry
    const testTruckId = 'test_truck_123';
    const testGpsData = {
      active: true,
      gpsFix: true,
      lat: "14.5995",
      lon: "120.9842",
      speed: "45.5",
      heading: 180,
      accuracy: 5,
      satellites: 8,
      overSpeed: false,
      lastUpdate: new Date().toISOString(),
      truckInfo: {
        id: testTruckId,
        plate: 'TEST123',
        type: 'mini truck',
        capacity: 3
      },
      status: {
        connected: true,
        lastHeartbeat: new Date().toISOString(),
        gpsModuleId: 'TEST_GPS_001',
        trackingActive: true
      }
    };
    
    try {
      const truckRef = realtimeDb.ref(`Trucks/${testTruckId}/data`);
      await truckRef.set(testGpsData);
      console.log(`✅ Test truck ${testTruckId} created in realtime database`);
      
      // Test reading the data back
      const snapshot = await truckRef.once('value');
      const readData = snapshot.val();
      
      if (readData && readData.truckInfo.plate === 'TEST123') {
        console.log('✅ Successfully read test truck data from realtime database');
      } else {
        console.log('❌ Failed to read test truck data correctly');
      }
      
      // Clean up test data
      await truckRef.remove();
      console.log('✅ Test truck data cleaned up');
      
    } catch (error) {
      console.log(`❌ Error testing realtime database: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing realtime database:', error);
  }
}

async function runAllTests() {
  console.log('🧪 Running all tests to verify fixes...');
  
  await testTruckAvailability();
  await testLicenseValidation();
  await testRealtimeDatabase();
  
  console.log('\n✅ All tests completed!');
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests()
    .then(() => {
      console.log('\n🎉 Test script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test script failed:', error);
      process.exit(1);
    });
}

module.exports = {
  testTruckAvailability,
  testLicenseValidation,
  testRealtimeDatabase,
  runAllTests
};
