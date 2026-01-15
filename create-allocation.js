// Load environment variables
require('dotenv').config();

// Initialize Firebase
const admin = require('firebase-admin');

// Check if Firebase is already initialized
if (admin.apps.length === 0) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      })
    });
    console.log('✅ Firebase initialized');
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
    process.exit(1);
  }
}

const db = admin.firestore();

// IDs from our data check - UPDATED to use Nathaniel's client ID
const USER_ID = 'X79nouW4W1wfUnwCuusF'; // Nathaniel's user ID
const TRUCK_ID = 'C5Lpm9qP7oh27umSUJnb';   // Truck with plate BAC321

async function createAllocation() {
  try {
    console.log('Finding client ID for user:', USER_ID);
    
    // Find the client associated with the userID
    const clientsSnapshot = await db.collection('clients')
      .where('userId', '==', USER_ID)
      .limit(1)
      .get();
    
    if (clientsSnapshot.empty) {
      console.error('❌ No client found for user ID:', USER_ID);
      return null;
    }
    
    const clientDoc = clientsSnapshot.docs[0];
    const CLIENT_ID = clientDoc.id;
    
    console.log(`✅ Found client ID: ${CLIENT_ID} for user: ${clientDoc.data().clientName || 'Nathaniel'}`);
    
    // Verify the truck exists
    const truckDoc = await db.collection('trucks').doc(TRUCK_ID).get();
    if (!truckDoc.exists) {
      console.error(`❌ Truck with ID ${TRUCK_ID} does not exist`);
      return null;
    }
    console.log(`✅ Verified truck: ${truckDoc.data().truckPlate || 'BAC321'}`);
    
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
    return null;
  }
}

createAllocation()
  .then(id => {
    if (id) {
      console.log(`✅ Successfully created allocation with ID: ${id}`);
      process.exit(0);
    } else {
      console.error('❌ Failed to create allocation');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }); 