const admin = require('firebase-admin');

// Initialize Firebase Admin (you may need to adjust the path to your service account key)
const serviceAccount = require('./client/server/config/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://e-trucking-8d905-default-rtdb.asia-southeast1.firebasedatabase.app"
});

const db = admin.firestore();

async function renameTruckToGPS() {
  try {
    console.log('🔍 Searching for existing trucks...');
    
    // Get all trucks
    const trucksSnapshot = await db.collection('trucks').get();
    
    if (trucksSnapshot.empty) {
      console.log('❌ No trucks found in the database');
      return;
    }
    
    console.log(`📋 Found ${trucksSnapshot.size} trucks:`);
    
    // List all trucks
    const trucks = [];
    trucksSnapshot.forEach(doc => {
      const data = doc.data();
      trucks.push({
        id: doc.id,
        plate: data.truckPlate || data.TruckPlate || 'Unknown',
        type: data.truckType || data.TruckType || 'Unknown',
        status: data.truckStatus || data.TruckStatus || 'Unknown'
      });
      console.log(`   ${doc.id}: ${data.truckPlate || data.TruckPlate} (${data.truckType || data.TruckType})`);
    });
    
    // Check if truck_12345 already exists
    const existingGPSTruck = await db.collection('trucks').doc('truck_12345').get();
    if (existingGPSTruck.exists) {
      console.log('✅ truck_12345 already exists in the database!');
      console.log('📍 Current GPS data:', existingGPSTruck.data());
      return;
    }
    
    if (trucks.length === 0) {
      console.log('❌ No trucks available to rename');
      return;
    }
    
    // Select the first truck to rename (you can modify this logic)
    const truckToRename = trucks[0];
    console.log(`\n🎯 Selected truck to rename: ${truckToRename.id} (${truckToRename.plate})`);
    
    // Get the truck data
    const oldTruckDoc = await db.collection('trucks').doc(truckToRename.id).get();
    const truckData = oldTruckDoc.data();
    
    // Add GPS fields to the truck data
    const enhancedTruckData = {
      ...truckData,
      // Add GPS tracking fields to match your Firebase Realtime Database structure
      active: true,
      gpsFix: false,
      lat: "14.903787",
      lon: "120.788956", 
      overSpeed: false,
      speed: "0.30",
      // Add GPS module info
      gpsModuleId: 'GPS_MODULE_001',
      gpsEnabled: true,
      trackingActive: true,
      lastGpsUpdate: admin.firestore.FieldValue.serverTimestamp(),
      // Keep existing truck data
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };
    
    console.log('🔄 Starting truck rename process...');
    
    // Use a transaction to ensure data consistency
    await db.runTransaction(async (transaction) => {
      // 1. Create new truck with ID truck_12345
      const newTruckRef = db.collection('trucks').doc('truck_12345');
      transaction.set(newTruckRef, enhancedTruckData);
      console.log('✅ Created new truck with ID: truck_12345');
      
      // 2. Update all allocations that reference the old truck ID
      const allocationsSnapshot = await db.collection('allocations')
        .where('truckId', '==', truckToRename.id)
        .get();
      
      allocationsSnapshot.forEach(doc => {
        transaction.update(doc.ref, { truckId: 'truck_12345' });
      });
      console.log(`✅ Updated ${allocationsSnapshot.size} allocation records`);
      
      // 3. Update all deliveries that reference the old truck ID
      const deliveriesSnapshot = await db.collection('deliveries')
        .where('truckId', '==', truckToRename.id)
        .get();
      
      deliveriesSnapshot.forEach(doc => {
        transaction.update(doc.ref, { truckId: 'truck_12345' });
      });
      console.log(`✅ Updated ${deliveriesSnapshot.size} delivery records`);
      
      // 4. Delete the old truck document
      const oldTruckRef = db.collection('trucks').doc(truckToRename.id);
      transaction.delete(oldTruckRef);
      console.log(`✅ Deleted old truck: ${truckToRename.id}`);
    });
    
    console.log('\n🎉 Successfully renamed truck to truck_12345!');
    console.log('📍 GPS tracking fields added:');
    console.log('   - active: true');
    console.log('   - gpsFix: false');
    console.log('   - lat: "14.903787"');
    console.log('   - lon: "120.788956"');
    console.log('   - overSpeed: false');
    console.log('   - speed: "0.30"');
    console.log('   - gpsEnabled: true');
    console.log('   - trackingActive: true');
    
    console.log('\n🔧 Next steps:');
    console.log('1. Configure your GPS module to send data to truck_12345');
    console.log('2. Set up the GPS API endpoint in your server');
    console.log('3. Test GPS data transmission');
    console.log('4. Monitor real-time tracking in your web app');
    
  } catch (error) {
    console.error('❌ Error renaming truck:', error);
  }
}

// Run the script
renameTruckToGPS().then(() => {
  console.log('\n✅ Script completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
}); 