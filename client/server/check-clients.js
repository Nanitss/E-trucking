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

async function listAllData() {
  try {
    console.log('\n========== CLIENTS ==========');
    // Get all clients
    const clientsSnapshot = await db.collection('clients').get();
    console.log(`Found ${clientsSnapshot.size} clients`);
    
    clientsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`- ID: ${doc.id}`);
      console.log(`  Name: ${data.clientName || 'Unknown'}`);
      console.log(`  Email: ${data.clientEmail || 'Unknown'}`);
      console.log(`  UserId: ${data.userId || 'Unknown'}`);
    });
    
    console.log('\n========== TRUCKS ==========');
    // Get all trucks
    const trucksSnapshot = await db.collection('trucks').get();
    console.log(`Found ${trucksSnapshot.size} trucks`);
    
    trucksSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`- ID: ${doc.id}`);
      console.log(`  Plate: ${data.truckPlate || 'Unknown'}`);
      console.log(`  Type: ${data.truckType || 'Unknown'}`);
      console.log(`  Status: ${data.truckStatus || 'Unknown'}`);
    });
    
    console.log('\n========== ALLOCATIONS ==========');
    // Get all allocations
    const allocationsSnapshot = await db.collection('allocations').get();
    console.log(`Found ${allocationsSnapshot.size} allocations`);
    
    allocationsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`- ID: ${doc.id}`);
      console.log(`  Client ID: ${data.clientId || 'Unknown'}`);
      console.log(`  Truck ID: ${data.truckId || 'Unknown'}`);
      console.log(`  Status: ${data.status || 'Unknown'}`);
    });
    
    console.log('\n========== USERS ==========');
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    console.log(`Found ${usersSnapshot.size} users`);
    
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`- ID: ${doc.id}`);
      console.log(`  Username: ${data.username || 'Unknown'}`);
      console.log(`  Role: ${data.role || 'Unknown'}`);
      console.log(`  Status: ${data.status || 'Unknown'}`);
    });
  } catch (error) {
    console.error('❌ Error listing data:', error);
  }
}

listAllData()
  .then(() => {
    console.log('✅ Data listing complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }); 