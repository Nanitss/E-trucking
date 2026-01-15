// test-pinned-locations.js
// Script to test and initialize pinned locations functionality

require('dotenv').config();
const { db, admin } = require('./client/server/config/firebase');

async function testPinnedLocations() {
  console.log('🔥 Testing Pinned Locations Database Setup...');
  
  try {
    // Test 1: Check if we can connect to Firestore
    console.log('\n1. Testing Firestore connection...');
    const testDoc = await db.collection('test').doc('connection').set({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      message: 'Connection test successful'
    });
    console.log('✅ Firestore connection working');
    
    // Clean up test document
    await db.collection('test').doc('connection').delete();
    
    // Test 2: Check if clients collection exists
    console.log('\n2. Checking clients collection...');
    const clientsSnapshot = await db.collection('clients').limit(1).get();
    console.log(`✅ Found ${clientsSnapshot.size} clients in database`);
    
    if (clientsSnapshot.empty) {
      console.log('❌ No clients found! You need to create a client first.');
      return;
    }
    
    // Test 3: Try to create a pinned locations document
    console.log('\n3. Testing pinned locations collection...');
    const testClientId = clientsSnapshot.docs[0].id;
    console.log(`Using test client ID: ${testClientId}`);
    
    const testLocation = {
      id: 'test_location_123',
      name: 'Test Office',
      address: 'Test Address, Manila, Philippines',
      coordinates: { lat: 14.5995, lng: 120.9842 },
      category: 'business',
      notes: 'This is a test location',
      contactPerson: '',
      contactNumber: '',
      operatingHours: '',
      accessInstructions: '',
      isDefault: false,
      usageCount: 0,
      lastUsed: null,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Create/update pinned locations document
    const locationsDocRef = db.collection('client_pinned_locations').doc(testClientId);
    await locationsDocRef.set({
      clientId: testClientId,
      locations: [testLocation],
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    console.log('✅ Successfully created pinned locations document');
    
    // Test 4: Try to read back the data
    console.log('\n4. Testing data retrieval...');
    const savedDoc = await locationsDocRef.get();
    
    if (savedDoc.exists) {
      const data = savedDoc.data();
      console.log(`✅ Retrieved ${data.locations.length} locations`);
      console.log('Sample location:', data.locations[0].name);
    } else {
      console.log('❌ Failed to retrieve saved data');
      return;
    }
    
    // Test 5: Clean up test data
    console.log('\n5. Cleaning up test data...');
    await locationsDocRef.delete();
    console.log('✅ Test data cleaned up');
    
    console.log('\n🎉 All tests passed! Pinned locations should work now.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', error.message);
    
    // Check if it's a permission error
    if (error.code === 'permission-denied') {
      console.log('\n🚨 PERMISSION DENIED ERROR:');
      console.log('This means your Firebase security rules are blocking the operation.');
      console.log('You may need to update your Firestore security rules.');
    }
    
    // Check if it's a network error
    if (error.code === 'unavailable') {
      console.log('\n🚨 NETWORK ERROR:');
      console.log('Cannot connect to Firestore. Check your internet connection.');
    }
  }
}

// Run the test
testPinnedLocations();
