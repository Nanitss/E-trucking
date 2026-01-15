// Migration script to free up trucks, drivers, and helpers from cancelled deliveries
// This restores their status to 'available' if they're stuck from old cancelled deliveries

// Load environment variables
require('dotenv').config();

const { admin, db } = require('../config/firebase');

console.log('📦 Using existing Firebase configuration from config/firebase.js\n');

// Check if Firebase is properly initialized
if (!db || typeof db.collection !== 'function') {
  console.error('❌ Firebase Firestore is not properly initialized!');
  console.error('⚠️  This script requires valid Firebase credentials.');
  process.exit(1);
}

async function freeUpCancelledResources() {
  console.log('🔧 Starting migration to free up resources from cancelled deliveries...\n');
  console.log('   Also fixing drivers/helpers with "available" status to "active"\n');
  
  try {
    // Get all cancelled deliveries
    const cancelledDeliveriesSnapshot = await db.collection('deliveries')
      .where('deliveryStatus', '==', 'cancelled')
      .get();
    
    console.log(`📊 Found ${cancelledDeliveriesSnapshot.size} cancelled deliveries\n`);
    
    let trucksFreed = 0;
    let driversFreed = 0;
    let helpersFreed = 0;
    let driversFixed = 0;
    let helpersFixed = 0;
    
    // Process each cancelled delivery
    for (const deliveryDoc of cancelledDeliveriesSnapshot.docs) {
      const delivery = deliveryDoc.data();
      const deliveryId = deliveryDoc.id;
      
      console.log(`🔍 Processing cancelled delivery: ${deliveryId}`);
      
      // Free up truck
      if (delivery.truckId) {
        try {
          const truckDoc = await db.collection('trucks').doc(delivery.truckId).get();
          if (truckDoc.exists) {
            const truck = truckDoc.data();
            const truckStatus = truck.TruckStatus || truck.truckStatus;
            
            if (truckStatus !== 'available' && truckStatus !== 'free') {
              await db.collection('trucks').doc(delivery.truckId).update({
                TruckStatus: 'available',
                truckStatus: 'available'
              });
              console.log(`   ✅ Freed truck ${delivery.truckPlate || delivery.truckId}`);
              trucksFreed++;
            }
          }
        } catch (err) {
          console.error(`   ⚠️  Error freeing truck: ${err.message}`);
        }
      }
      
      // Free up driver
      if (delivery.driverId) {
        try {
          const driverDoc = await db.collection('drivers').doc(delivery.driverId).get();
          if (driverDoc.exists) {
            const driver = driverDoc.data();
            const driverStatus = driver.DriverStatus || driver.driverStatus;
            
            if (driverStatus !== 'active') {
              await db.collection('drivers').doc(delivery.driverId).update({
                DriverStatus: 'active',
                driverStatus: 'active'
              });
              console.log(`   ✅ Freed driver ${delivery.driverName || delivery.driverId} to active`);
              driversFreed++;
            }
          }
        } catch (err) {
          console.error(`   ⚠️  Error freeing driver: ${err.message}`);
        }
      }
      
      // Free up helper
      if (delivery.helperId) {
        try {
          const helperDoc = await db.collection('helpers').doc(delivery.helperId).get();
          if (helperDoc.exists) {
            const helper = helperDoc.data();
            const helperStatus = helper.HelperStatus || helper.helperStatus;
            
            if (helperStatus !== 'active') {
              await db.collection('helpers').doc(delivery.helperId).update({
                HelperStatus: 'active',
                helperStatus: 'active'
              });
              console.log(`   ✅ Freed helper ${delivery.helperName || delivery.helperId} to active`);
              helpersFreed++;
            }
          }
        } catch (err) {
          console.error(`   ⚠️  Error freeing helper: ${err.message}`);
        }
      }
    }
    
    // Fix any drivers/helpers with "available" status (from old migration) to "active"
    console.log('\n🔄 Checking for drivers/helpers with "available" status...\n');
    
    // Fix drivers
    const availableDriversSnapshot = await db.collection('drivers')
      .where('DriverStatus', '==', 'available')
      .get();
    
    for (const driverDoc of availableDriversSnapshot.docs) {
      try {
        await db.collection('drivers').doc(driverDoc.id).update({
          DriverStatus: 'active',
          driverStatus: 'active'
        });
        console.log(`   ✅ Fixed driver ${driverDoc.data().DriverName || driverDoc.id} from available to active`);
        driversFixed++;
      } catch (err) {
        console.error(`   ⚠️  Error fixing driver: ${err.message}`);
      }
    }
    
    // Fix helpers
    const availableHelpersSnapshot = await db.collection('helpers')
      .where('HelperStatus', '==', 'available')
      .get();
    
    for (const helperDoc of availableHelpersSnapshot.docs) {
      try {
        await db.collection('helpers').doc(helperDoc.id).update({
          HelperStatus: 'active',
          helperStatus: 'active'
        });
        console.log(`   ✅ Fixed helper ${helperDoc.data().HelperName || helperDoc.id} from available to active`);
        helpersFixed++;
      } catch (err) {
        console.error(`   ⚠️  Error fixing helper: ${err.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Migration completed successfully!');
    console.log('='.repeat(60));
    console.log(`📊 Resources freed from ${cancelledDeliveriesSnapshot.size} cancelled deliveries:`);
    console.log(`   🚛 Trucks freed: ${trucksFreed}`);
    console.log(`   👤 Drivers freed: ${driversFreed}`);
    console.log(`   🤝 Helpers freed: ${helpersFreed}`);
    console.log(`\n📊 Status corrections (available → active):`);
    console.log(`   👤 Drivers fixed: ${driversFixed}`);
    console.log(`   🤝 Helpers fixed: ${helpersFixed}`);
    console.log('='.repeat(60) + '\n');
    
    if (trucksFreed > 0 || driversFreed > 0 || helpersFreed > 0 || driversFixed > 0 || helpersFixed > 0) {
      console.log('🎉 All resources are now properly set to active status!');
      console.log('   Check the Trucks/Drivers/Helpers pages to see updated statuses.\n');
    } else {
      console.log('✅ All resources were already correct!\n');
    }
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    console.log('👋 Migration script finished. Exiting...\n');
    process.exit(0);
  }
}

// Run the migration
freeUpCancelledResources().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
