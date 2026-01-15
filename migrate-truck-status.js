// Migration script to add enhanced status tracking to existing trucks
const { admin, db } = require('./client/server/config/firebase');

async function migrateTruckStatus() {
  try {
    console.log('🚚 Starting truck status migration...');
    console.log('=====================================\n');

    // Get all existing trucks
    const trucksSnapshot = await db.collection('trucks').get();
    console.log(`Found ${trucksSnapshot.size} trucks to migrate\n`);

    if (trucksSnapshot.empty) {
      console.log('No trucks found in database. Migration complete.');
      return;
    }

    const batch = db.batch();
    let updateCount = 0;

    for (const doc of trucksSnapshot.docs) {
      const truck = doc.data();
      const truckRef = db.collection('trucks').doc(doc.id);

      console.log(`Processing truck: ${truck.truckPlate || 'Unknown'} (${doc.id})`);

      // Determine enhanced status based on existing status
      let allocationStatus = 'available';
      let operationalStatus = 'active';
      let availabilityStatus = 'free';

      // Map existing truckStatus to new enhanced statuses
      switch (truck.truckStatus?.toLowerCase()) {
        case 'allocated':
          allocationStatus = 'allocated';
          availabilityStatus = 'busy';
          break;
        case 'on-delivery':
          allocationStatus = 'allocated';
          availabilityStatus = 'busy';
          break;
        case 'maintenance':
          operationalStatus = 'maintenance';
          availabilityStatus = 'busy';
          break;
        case 'scheduled':
          allocationStatus = 'reserved';
          availabilityStatus = 'scheduled';
          break;
        case 'available':
        default:
          allocationStatus = 'available';
          operationalStatus = 'active';
          availabilityStatus = 'free';
          break;
      }

      // Prepare update data with enhanced status fields
      const updateData = {
        // Enhanced status tracking (new fields)
        allocationStatus: truck.allocationStatus || allocationStatus,
        operationalStatus: truck.operationalStatus || operationalStatus,
        availabilityStatus: truck.availabilityStatus || availabilityStatus,
        
        // Tracking fields
        lastStatusChange: truck.lastStatusChange || admin.firestore.FieldValue.serverTimestamp(),
        lastAllocationChange: truck.lastAllocationChange || admin.firestore.FieldValue.serverTimestamp(),
        
        // Allocation tracking
        currentClientId: truck.currentClientId || null,
        currentAllocationId: truck.currentAllocationId || null,
        currentDeliveryId: truck.currentDeliveryId || null,
        
        // Additional metadata
        totalAllocations: truck.totalAllocations || 0,
        totalDeliveries: truck.totalDeliveries || 0,
        maintenanceScheduled: truck.maintenanceScheduled || false,
        lastMaintenanceDate: truck.lastMaintenanceDate || null,
        lastStatusReason: truck.lastStatusReason || null,
        
        // Update timestamp
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        
        // Ensure created_at exists
        created_at: truck.created_at || admin.firestore.FieldValue.serverTimestamp()
      };

      // Only add fields that don't already exist
      const fieldsToAdd = {};
      Object.keys(updateData).forEach(key => {
        if (truck[key] === undefined) {
          fieldsToAdd[key] = updateData[key];
        }
      });

      if (Object.keys(fieldsToAdd).length > 0) {
        batch.update(truckRef, fieldsToAdd);
        updateCount++;
        console.log(`  ✅ Added ${Object.keys(fieldsToAdd).length} new fields`);
      } else {
        console.log(`  ℹ️ Already has enhanced status fields`);
      }
    }

    if (updateCount > 0) {
      console.log(`\n🔄 Committing ${updateCount} truck updates...`);
      await batch.commit();
      console.log('✅ Migration completed successfully!');
    } else {
      console.log('\n✅ All trucks already have enhanced status fields. No migration needed.');
    }

    // Display summary
    console.log('\n📊 MIGRATION SUMMARY:');
    console.log('====================');
    console.log(`Total trucks processed: ${trucksSnapshot.size}`);
    console.log(`Trucks updated: ${updateCount}`);
    console.log(`Trucks already migrated: ${trucksSnapshot.size - updateCount}`);

    // Show current status distribution
    console.log('\n📈 CURRENT STATUS DISTRIBUTION:');
    console.log('===============================');
    
    const updatedSnapshot = await db.collection('trucks').get();
    const statusCounts = {
      allocation: {},
      operational: {},
      availability: {}
    };

    updatedSnapshot.docs.forEach(doc => {
      const truck = doc.data();
      
      // Count allocation statuses
      const allocStatus = truck.allocationStatus || 'unknown';
      statusCounts.allocation[allocStatus] = (statusCounts.allocation[allocStatus] || 0) + 1;
      
      // Count operational statuses
      const operStatus = truck.operationalStatus || 'unknown';
      statusCounts.operational[operStatus] = (statusCounts.operational[operStatus] || 0) + 1;
      
      // Count availability statuses
      const availStatus = truck.availabilityStatus || 'unknown';
      statusCounts.availability[availStatus] = (statusCounts.availability[availStatus] || 0) + 1;
    });

    console.log('\nAllocation Status:');
    Object.entries(statusCounts.allocation).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    console.log('\nOperational Status:');
    Object.entries(statusCounts.operational).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    console.log('\nAvailability Status:');
    Object.entries(statusCounts.availability).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    console.log('\n🎉 Truck status migration completed successfully!');

  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  }
}

// Run the migration
migrateTruckStatus()
  .then(() => {
    console.log('\n✅ Migration script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  }); 