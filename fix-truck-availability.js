image.pngconst admin; = require('firebase-admin');'';

// Load Firebase configuration
let serviceAccount;
try {
  serviceAccount = require('./client/server/serviceAccountKey.json');
} catch (error) {
  console.log('❌ Firebase service account key not found. Please ensure serviceAccountKey.json exists in client/server/');
  process.exit(1);
}

// Initialize Firebase Admin SDK
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization error:', error.message);
  process.exit(1);
}

const db = admin.firestore();

async function fixTruckAvailability() {
  try {
    console.log('🔧 FIXING TRUCK AVAILABILITY FOR BOOKING...\n');
    
    // Get all trucks
    const trucksSnapshot = await db.collection('trucks').get();
    console.log(`📋 Found ${trucksSnapshot.size} trucks to process`);
    
    const batch = db.batch();
    let processedCount = 0;
    
    trucksSnapshot.forEach(doc => {
      const truckData = doc.data();
      const truckRef = doc.ref;
      
      console.log(`🔧 Processing truck ${truckData.truckPlate} (${doc.id})`);
      console.log(`   Current status: ${truckData.truckStatus}`);
      
      // Update truck to be available for booking
      const updates = {
        truckStatus: 'available',
        allocationStatus: 'available',
        operationalStatus: 'active',
        availabilityStatus: 'free',
        activeDelivery: false,
        currentDeliveryId: null,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };
      
      batch.update(truckRef, updates);
      processedCount++;
      
      console.log(`   ✅ Will set to: available/active/free`);
    });
    
    // Commit the batch update
    await batch.commit();
    console.log(`\n✅ Successfully updated ${processedCount} trucks to be available for booking`);
    
    // Also clear any pending deliveries to avoid conflicts
    console.log('\n🔧 CLEARING PENDING DELIVERIES...');
    const pendingDeliveriesSnapshot = await db.collection('deliveries')
      .where('deliveryStatus', '==', 'pending')
      .get();
    
    if (!pendingDeliveriesSnapshot.empty) {
      const deliveryBatch = db.batch();
      pendingDeliveriesSnapshot.forEach(doc => {
        deliveryBatch.update(doc.ref, {
          deliveryStatus: 'cancelled',
          cancelReason: 'System cleanup for truck availability fix',
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
      });
      
      await deliveryBatch.commit();
      console.log(`✅ Cancelled ${pendingDeliveriesSnapshot.size} pending deliveries`);
    } else {
      console.log('✅ No pending deliveries to clear');
    }
    
    // Ensure drivers and helpers are available
    console.log('\n🔧 ENSURING DRIVERS AND HELPERS ARE AVAILABLE...');
    
    const driversSnapshot = await db.collection('drivers').get();
    const driversBatch = db.batch();
    
    driversSnapshot.forEach(doc => {
      driversBatch.update(doc.ref, {
        DriverStatus: 'available',
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    
    await driversBatch.commit();
    console.log(`✅ Set ${driversSnapshot.size} drivers to available`);
    
    const helpersSnapshot = await db.collection('helpers').get();
    const helpersBatch = db.batch();
    
    helpersSnapshot.forEach(doc => {
      helpersBatch.update(doc.ref, {
        HelperStatus: 'available',
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    
    await helpersBatch.commit();
    console.log(`✅ Set ${helpersSnapshot.size} helpers to available`);
    
    console.log('\n🎉 TRUCK AVAILABILITY FIX COMPLETE!');
    console.log('✅ All trucks are now available for booking');
    console.log('✅ All drivers and helpers are available');
    console.log('✅ No conflicting deliveries remain');
    console.log('\n💡 You can now try booking trucks again!');
    
  } catch (error) {
    console.error('❌ Error fixing truck availability:', error);
  } finally {
    process.exit(0);
  }
}

fixTruckAvailability(); 