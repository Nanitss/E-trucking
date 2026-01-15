// Migration script to add brand and kilometer tracking to existing trucks
// Run this script once to update all existing trucks with the new fields

const { db } = require('./client/server/config/firebase');
const TruckService = require('./client/server/services/TruckService');

async function migrateTrucksBrandAndKm() {
  console.log('🚛 Starting truck migration: Adding brand and kilometer tracking fields...');
  console.log('='.repeat(70));
  
  try {
    // Get all existing trucks
    console.log('📋 Fetching all existing trucks...');
    const trucksSnapshot = await db.collection('trucks').get();
    const trucks = trucksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log(`Found ${trucks.length} trucks to migrate`);
    
    if (trucks.length === 0) {
      console.log('❌ No trucks found. Migration complete.');
      return;
    }

    const migrationResults = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each truck
    for (let i = 0; i < trucks.length; i++) {
      const truck = trucks[i];
      console.log(`\n[${i + 1}/${trucks.length}] Processing truck: ${truck.truckPlate || truck.id}`);
      
      try {
        // Prepare update data with new fields
        const updateData = {};
        let hasUpdates = false;

        // Add brand field if missing
        if (!truck.truckBrand) {
          updateData.truckBrand = 'Unknown'; // Default brand for existing trucks
          hasUpdates = true;
          console.log(`  ✓ Adding default brand: Unknown`);
        }

        // Add model year if missing (optional field)
        if (!truck.modelYear) {
          updateData.modelYear = null;
          hasUpdates = true;
          console.log(`  ✓ Adding model year field: null`);
        }

        // Add date added if missing
        if (!truck.dateAdded) {
          updateData.dateAdded = truck.created_at || new Date();
          hasUpdates = true;
          console.log(`  ✓ Adding date added field`);
        }

        // Add kilometer tracking fields if missing
        const kmFieldsToAdd = {
          totalKilometers: 0,
          totalCompletedDeliveries: 0,
          averageKmPerDelivery: 0,
          lastOdometerUpdate: new Date()
        };

        for (const [field, defaultValue] of Object.entries(kmFieldsToAdd)) {
          if (truck[field] === undefined || truck[field] === null) {
            updateData[field] = defaultValue;
            hasUpdates = true;
            console.log(`  ✓ Adding ${field}: ${defaultValue}`);
          }
        }

        // Calculate kilometers from completed deliveries
        console.log(`  🔍 Calculating kilometers from completed deliveries...`);
        
        try {
          const kmData = await TruckService.calculateTruckKilometers(truck.id);
          
          updateData.totalKilometers = kmData.totalKilometers;
          updateData.totalCompletedDeliveries = kmData.totalCompletedDeliveries;
          updateData.averageKmPerDelivery = kmData.averageKmPerDelivery;
          updateData.lastOdometerUpdate = new Date();
          hasUpdates = true;
          
          console.log(`  ✅ Calculated: ${kmData.totalKilometers}km from ${kmData.totalCompletedDeliveries} deliveries`);
        } catch (kmError) {
          console.warn(`  ⚠️ Could not calculate kilometers: ${kmError.message}`);
          // Use default values already set above
        }

        // Update truck if there are changes
        if (hasUpdates) {
          updateData.updated_at = new Date();
          
          await db.collection('trucks').doc(truck.id).update(updateData);
          console.log(`  ✅ Updated truck ${truck.truckPlate || truck.id}`);
          
          migrationResults.push({
            truckId: truck.id,
            truckPlate: truck.truckPlate || 'Unknown',
            status: 'updated',
            fieldsAdded: Object.keys(updateData).length,
            totalKm: updateData.totalKilometers || 0,
            totalDeliveries: updateData.totalCompletedDeliveries || 0
          });
          
          successCount++;
        } else {
          console.log(`  ℹ️ Truck ${truck.truckPlate || truck.id} already has all required fields`);
          
          migrationResults.push({
            truckId: truck.id,
            truckPlate: truck.truckPlate || 'Unknown',
            status: 'skipped',
            reason: 'Already has all fields'
          });
        }

      } catch (error) {
        console.error(`  ❌ Error processing truck ${truck.truckPlate || truck.id}:`, error.message);
        
        migrationResults.push({
          truckId: truck.id,
          truckPlate: truck.truckPlate || 'Unknown',
          status: 'error',
          error: error.message
        });
        
        errorCount++;
      }
    }

    // Print migration summary
    console.log('\n' + '='.repeat(70));
    console.log('🎉 MIGRATION COMPLETE!');
    console.log('='.repeat(70));
    console.log(`📊 Summary:`);
    console.log(`   Total trucks processed: ${trucks.length}`);
    console.log(`   Successfully updated: ${successCount}`);
    console.log(`   Skipped (no changes): ${trucks.length - successCount - errorCount}`);
    console.log(`   Errors: ${errorCount}`);

    // Show detailed results
    if (migrationResults.length > 0) {
      console.log('\n📋 Detailed Results:');
      console.log('-'.repeat(50));
      
      migrationResults.forEach((result, index) => {
        console.log(`${index + 1}. ${result.truckPlate} (${result.truckId})`);
        console.log(`   Status: ${result.status}`);
        
        if (result.status === 'updated') {
          console.log(`   Fields added: ${result.fieldsAdded}`);
          console.log(`   Total KM: ${result.totalKm}`);
          console.log(`   Deliveries: ${result.totalDeliveries}`);
        } else if (result.status === 'error') {
          console.log(`   Error: ${result.error}`);
        } else if (result.status === 'skipped') {
          console.log(`   Reason: ${result.reason}`);
        }
        
        console.log('');
      });
    }

    console.log('\n✅ Migration script completed successfully!');
    console.log('💡 All trucks now have brand and kilometer tracking fields.');
    console.log('🔄 You can now use the recalculate endpoints to update kilometers if needed.');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  console.log('🚀 Running Truck Migration Script...');
  console.log('📅 Started at:', new Date().toISOString());
  
  migrateTrucksBrandAndKm()
    .then(() => {
      console.log('✅ Migration script finished successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateTrucksBrandAndKm };

