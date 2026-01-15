// Script to add an allocation directly to Firebase
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase directly - this is separate from the server initialization
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Known IDs from your Firebase setup
const CLIENT_ID = 'iiTk5EI7FNt6lPB3fAth';  // Sheena's client ID 
const TRUCK_ID = 'C5Lpm9qP7oh27umSUJnb';   // The truck ID

async function createAllocation() {
  try {
    console.log('Creating allocation...');
    
    // Create allocation data
    const allocationData = {
      clientId: CLIENT_ID,
      truckId: TRUCK_ID,
      status: 'active',
      allocationDate: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    };
    
    // Add to Firestore
    const result = await db.collection('allocations').add(allocationData);
    
    console.log(`✅ Allocation created with ID: ${result.id}`);
    
    // Update truck status
    await db.collection('trucks').doc(TRUCK_ID).update({
      truckStatus: 'allocated',
      updated_at: new Date()
    });
    
    console.log('✅ Truck status updated to allocated');
    
    return result.id;
  } catch (error) {
    console.error('❌ Error creating allocation:', error);
    throw error;
  }
}

createAllocation()
  .then(id => {
    console.log(`✅ Successfully created allocation with ID: ${id}`);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Failed to create allocation:', error);
    process.exit(1);
  }); 