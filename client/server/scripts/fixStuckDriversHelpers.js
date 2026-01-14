/**
 * Utility script to fix drivers and helpers stuck in 'On-Delivery' status
 * from previously completed or cancelled deliveries
 * 
 * Run with: node client/server/scripts/fixStuckDriversHelpers.js
 */

const { db } = require('../config/firebase');

async function fixStuckDriversAndHelpers() {
  console.log('🔧 Starting to fix stuck drivers and helpers...\n');
  
  try {
    // Get all deliveries that are delivered, completed, or cancelled
    const finalStatuses = ['delivered', 'completed', 'cancelled'];
    const deliveriesSnapshot = await db.collection('deliveries').get();
    
    const finishedDeliveries = [];
    deliveriesSnapshot.forEach(doc => {
      const delivery = doc.data();
      if (delivery.deliveryStatus && finalStatuses.includes(delivery.deliveryStatus.toLowerCase())) {
        finishedDeliveries.push({
          id: doc.id,
          ...delivery
        });
      }
    });
    
    console.log(`Found ${finishedDeliveries.length} finished deliveries (delivered/completed/cancelled)\n`);
    
    // Track unique drivers and helpers to restore
    const driversToRestore = new Set();
    const helpersToRestore = new Set();
    
    finishedDeliveries.forEach(delivery => {
      if (delivery.driverId) {
        driversToRestore.add(delivery.driverId);
      }
      if (delivery.helperId) {
        helpersToRestore.add(delivery.helperId);
      }
    });
    
    console.log(`Drivers to check: ${driversToRestore.size}`);
    console.log(`Helpers to check: ${helpersToRestore.size}\n`);
    
    // Restore driver statuses
    let driversFixed = 0;
    for (const driverId of driversToRestore) {
      try {
        const driverRef = db.collection('drivers').doc(driverId);
        const driverDoc = await driverRef.get();
        
        if (driverDoc.exists) {
          const driver = driverDoc.data();
          const currentStatus = driver.DriverStatus || driver.driverStatus;
          
          // Only update if not already active
          if (currentStatus && currentStatus.toLowerCase() !== 'active') {
            await driverRef.update({
              DriverStatus: 'active',
              driverStatus: 'active',
              updated_at: new Date()
            });
            console.log(`✅ Restored driver: ${driver.DriverName || driver.driverName || driverId} (${currentStatus} → active)`);
            driversFixed++;
          } else {
            console.log(`ℹ️  Driver ${driver.DriverName || driver.driverName || driverId} already active`);
          }
        }
      } catch (error) {
        console.error(`❌ Error restoring driver ${driverId}:`, error.message);
      }
    }
    
    // Restore helper statuses
    let helpersFixed = 0;
    for (const helperId of helpersToRestore) {
      try {
        const helperRef = db.collection('helpers').doc(helperId);
        const helperDoc = await helperRef.get();
        
        if (helperDoc.exists) {
          const helper = helperDoc.data();
          const currentStatus = helper.HelperStatus || helper.helperStatus;
          
          // Only update if not already active
          if (currentStatus && currentStatus.toLowerCase() !== 'active') {
            await helperRef.update({
              HelperStatus: 'active',
              helperStatus: 'active',
              updated_at: new Date()
            });
            console.log(`✅ Restored helper: ${helper.HelperName || helper.helperName || helperId} (${currentStatus} → active)`);
            helpersFixed++;
          } else {
            console.log(`ℹ️  Helper ${helper.HelperName || helper.helperName || helperId} already active`);
          }
        }
      } catch (error) {
        console.error(`❌ Error restoring helper ${helperId}:`, error.message);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log(`   Drivers restored: ${driversFixed}/${driversToRestore.size}`);
    console.log(`   Helpers restored: ${helpersFixed}/${helpersToRestore.size}`);
    console.log('='.repeat(60));
    console.log('\n✅ Fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the fix
fixStuckDriversAndHelpers();
