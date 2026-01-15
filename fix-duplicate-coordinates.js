/**
 * Script to fix duplicate coordinate fields in deliveries collection
 * 
 * Problem: Deliveries have both lowercase and uppercase coordinate fields:
 * - pickupCoordinates (correct)
 * - PickupCoordinates (duplicate to remove)
 * - dropoffCoordinates (correct)
 * - DropoffCoordinates (duplicate to remove)
 * 
 * This script removes the uppercase duplicates and keeps only lowercase fields.
 */

const admin = require('firebase-admin');
const serviceAccount = require('./client/server/config/serviceAccountKey.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://trucking-web-app-default-rtdb.firebaseio.com"
  });
}

const db = admin.firestore();

async function fixDuplicateCoordinates() {
  console.log('🔄 Starting duplicate coordinate field cleanup...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Get all deliveries
    const deliveriesSnapshot = await db.collection('deliveries').get();
    console.log(`📦 Found ${deliveriesSnapshot.size} deliveries to check\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Process each delivery
    for (const doc of deliveriesSnapshot.docs) {
      const data = doc.data();
      const deliveryId = doc.id;

      console.log(`\n🔍 Checking delivery: ${deliveryId}`);
      console.log(`   Pickup Location: ${data.pickupLocation || 'N/A'}`);
      console.log(`   Dropoff Location: ${data.dropoffLocation || data.deliveryAddress || 'N/A'}`);

      // Check if uppercase fields exist
      const hasUppercasePickup = data.hasOwnProperty('PickupCoordinates');
      const hasUppercaseDropoff = data.hasOwnProperty('DropoffCoordinates');
      const hasLowercasePickup = data.hasOwnProperty('pickupCoordinates');
      const hasLowercaseDropoff = data.hasOwnProperty('dropoffCoordinates');

      console.log(`   Fields present:`);
      console.log(`   - pickupCoordinates (lowercase): ${hasLowercasePickup ? '✅' : '❌'}`);
      console.log(`   - PickupCoordinates (uppercase): ${hasUppercasePickup ? '🔴 DUPLICATE' : '✅'}`);
      console.log(`   - dropoffCoordinates (lowercase): ${hasLowercaseDropoff ? '✅' : '❌'}`);
      console.log(`   - DropoffCoordinates (uppercase): ${hasUppercaseDropoff ? '🔴 DUPLICATE' : '✅'}`);

      // Determine if we need to update
      const needsUpdate = hasUppercasePickup || hasUppercaseDropoff;

      if (!needsUpdate) {
        console.log(`   ✅ No duplicate fields found - skipping`);
        skippedCount++;
        continue;
      }

      try {
        // Prepare update data
        const updateData = {};

        // If uppercase exists, ensure lowercase exists (copy if needed), then mark uppercase for deletion
        if (hasUppercasePickup) {
          if (!hasLowercasePickup && data.PickupCoordinates) {
            // Copy uppercase to lowercase if lowercase doesn't exist
            updateData.pickupCoordinates = data.PickupCoordinates;
            console.log(`   📋 Copying PickupCoordinates to pickupCoordinates`);
          }
          // Mark uppercase field for deletion
          updateData.PickupCoordinates = admin.firestore.FieldValue.delete();
          console.log(`   🗑️ Removing duplicate PickupCoordinates field`);
        }

        if (hasUppercaseDropoff) {
          if (!hasLowercaseDropoff && data.DropoffCoordinates) {
            // Copy uppercase to lowercase if lowercase doesn't exist
            updateData.dropoffCoordinates = data.DropoffCoordinates;
            console.log(`   📋 Copying DropoffCoordinates to dropoffCoordinates`);
          }
          // Mark uppercase field for deletion
          updateData.DropoffCoordinates = admin.firestore.FieldValue.delete();
          console.log(`   🗑️ Removing duplicate DropoffCoordinates field`);
        }

        // Update the document
        await db.collection('deliveries').doc(deliveryId).update(updateData);
        console.log(`   ✅ Successfully updated delivery ${deliveryId}`);
        updatedCount++;

      } catch (error) {
        console.error(`   ❌ Error updating delivery ${deliveryId}:`, error.message);
        errorCount++;
      }
    }

    // Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📊 CLEANUP SUMMARY:');
    console.log(`   Total deliveries checked: ${deliveriesSnapshot.size}`);
    console.log(`   ✅ Successfully updated: ${updatedCount}`);
    console.log(`   ⏭️ Skipped (no duplicates): ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log('\n✨ Duplicate coordinate field cleanup complete!\n');

    if (updatedCount > 0) {
      console.log('🎉 All duplicate coordinate fields have been removed.');
      console.log('📝 All deliveries now use the correct lowercase field names:');
      console.log('   - pickupCoordinates');
      console.log('   - dropoffCoordinates\n');
    }

  } catch (error) {
    console.error('❌ Fatal error during cleanup:', error);
    throw error;
  }
}

// Run the script
fixDuplicateCoordinates()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
