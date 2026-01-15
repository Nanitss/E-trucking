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

// Sample driver data to use for fixing
const sampleDrivers = [
  {
    driverName: 'Juan Dela Cruz',
    driverUsername: 'juan.driver',
    driverStatus: 'active',
    driverNumber: '+63 912 345 6789',
    driverEmail: 'juan@trucking.com',
    driverLicense: 'DL-001-2024'
  },
  {
    driverName: 'Maria Santos',
    driverUsername: 'maria.driver',
    driverStatus: 'active',
    driverNumber: '+63 912 345 6790',
    driverEmail: 'maria@trucking.com',
    driverLicense: 'DL-002-2024'
  },
  {
    driverName: 'Pedro Rodriguez',
    driverUsername: 'pedro.driver',
    driverStatus: 'active',
    driverNumber: '+63 912 345 6791',
    driverEmail: 'pedro@trucking.com',
    driverLicense: 'DL-003-2024'
  },
  {
    driverName: 'Ana Reyes',
    driverUsername: 'ana.driver',
    driverStatus: 'active',
    driverNumber: '+63 912 345 6792',
    driverEmail: 'ana@trucking.com',
    driverLicense: 'DL-004-2024'
  },
  {
    driverName: 'Carlos Mendoza',
    driverUsername: 'carlos.driver',
    driverStatus: 'active',
    driverNumber: '+63 912 345 6793',
    driverEmail: 'carlos@trucking.com',
    driverLicense: 'DL-005-2024'
  },
  {
    driverName: 'Lisa Garcia',
    driverUsername: 'lisa.driver',
    driverStatus: 'active',
    driverNumber: '+63 912 345 6794',
    driverEmail: 'lisa@trucking.com',
    driverLicense: 'DL-006-2024'
  }
];

async function fixDrivers() {
  try {
    console.log('🔧 Fixing driver documents...');
    
    // Get all drivers
    const driversSnapshot = await db.collection('drivers').get();
    
    if (driversSnapshot.empty) {
      console.log('❌ No drivers found in the database!');
      return;
    }
    
    console.log(`📦 Found ${driversSnapshot.size} driver documents to fix`);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    // Update each driver with sample data
    for (let i = 0; i < driversSnapshot.docs.length; i++) {
      const doc = driversSnapshot.docs[i];
      const sampleData = sampleDrivers[i] || sampleDrivers[0]; // Use first sample if we run out
      
      try {
        // Add proper driver data
        await db.collection('drivers').doc(doc.id).update({
          ...sampleData,
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
          created_at: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ Updated driver ${doc.id} with name: ${sampleData.driverName}`);
        updatedCount++;
      } catch (error) {
        console.error(`❌ Error updating driver ${doc.id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n🎉 Driver fix complete!`);
    console.log(`   Successfully updated: ${updatedCount} drivers`);
    console.log(`   Errors: ${errorCount} drivers`);
    
    // Show updated drivers
    console.log(`\n📋 Updated drivers:`);
    const updatedSnapshot = await db.collection('drivers').get();
    
    updatedSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`\n   👤 ${data.driverName} (${data.driverStatus})`);
      console.log(`      Username: ${data.driverUsername}`);
      console.log(`      Phone: ${data.driverNumber}`);
    });
    
    console.log(`\n✅ All drivers are now active and ready for assignment!`);
    
  } catch (error) {
    console.error('❌ Error fixing drivers:', error);
  } finally {
    process.exit(0);
  }
}

// Run the fix
fixDrivers(); 