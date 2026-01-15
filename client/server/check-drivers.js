require('dotenv').config();
const admin = require('firebase-admin');

// Initialize Firebase Admin using environment variables (same as server)
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
    console.log('✅ Firebase Admin SDK initialized successfully');
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  process.exit(1);
}

const db = admin.firestore();

async function checkDrivers() {
  try {
    console.log('🔍 Checking drivers in the database...');
    
    // Get all drivers
    const driversSnapshot = await db.collection('drivers').get();
    
    if (driversSnapshot.empty) {
      console.log('❌ No drivers found in the database!');
      console.log('💡 You need to add drivers to your database for automatic assignment to work.');
      return;
    }
    
    console.log(`📦 Found ${driversSnapshot.size} driver documents`);
    
    let activeDrivers = 0;
    let inactiveDrivers = 0;
    
    // Check each driver
    driversSnapshot.forEach(doc => {
      const data = doc.data();
      
      console.log(`\n👤 Driver ID: ${doc.id}`);
      console.log(`   Name: ${data.driverName || 'Unknown'}`);
      console.log(`   Username: ${data.driverUsername || 'Unknown'}`);
      console.log(`   Status: ${data.driverStatus || 'Unknown'}`);
      console.log(`   Phone: ${data.driverNumber || 'Unknown'}`);
      
      if (data.driverStatus === 'active') {
        activeDrivers++;
      } else {
        inactiveDrivers++;
      }
    });
    
    console.log(`\n📊 Driver Summary:`);
    console.log(`   Total drivers: ${driversSnapshot.size}`);
    console.log(`   Active drivers: ${activeDrivers}`);
    console.log(`   Inactive drivers: ${inactiveDrivers}`);
    
    if (activeDrivers === 0) {
      console.log(`\n⚠️  WARNING: No active drivers found!`);
      console.log(`   This is why driver assignment is showing "N/A"`);
      console.log(`   To fix this, you need to:`);
      console.log(`   1. Add drivers through the admin panel, OR`);
      console.log(`   2. Update existing drivers to have driverStatus: 'active'`);
    } else {
      console.log(`\n✅ Found ${activeDrivers} active drivers - assignment should work!`);
    }
    
  } catch (error) {
    console.error('❌ Error checking drivers:', error);
  } finally {
    process.exit(0);
  }
}

// Run the check
checkDrivers(); 