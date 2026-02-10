/**
 * Targeted Truncation Script
 * 
 * Clears: drivers, helpers, deliveries, paymentProofs, paymentReceipts, client_pinned_locations
 * Resets: all trucks to default active status
 * 
 * Usage: node functions/scripts/truncateSelected.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { db, admin } = require('../config/firebase');

const COLLECTIONS_TO_EMPTY = [
  'drivers',
  'helpers',
  'deliveries',
  'paymentProofs',
  'paymentReceipts',
  'client_pinned_locations',
];

async function deleteCollection(collectionName) {
  const collectionRef = db.collection(collectionName);
  const snapshot = await collectionRef.get();

  if (snapshot.empty) {
    console.log(`  ⏭️  ${collectionName}: already empty`);
    return 0;
  }

  const batchSize = 500;
  let deleted = 0;
  const docs = snapshot.docs;

  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = db.batch();
    const chunk = docs.slice(i, i + batchSize);
    chunk.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    deleted += chunk.length;
  }

  console.log(`  🗑️  ${collectionName}: deleted ${deleted} documents`);
  return deleted;
}

async function resetTrucks() {
  console.log('\n🚛 Resetting all trucks to default active state...');
  const trucksRef = db.collection('trucks');
  const snapshot = await trucksRef.get();

  if (snapshot.empty) {
    console.log('  ⏭️  trucks: no trucks found');
    return 0;
  }

  const batchSize = 500;
  let reset = 0;
  const docs = snapshot.docs;

  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = db.batch();
    const chunk = docs.slice(i, i + batchSize);

    chunk.forEach((doc) => {
      batch.update(doc.ref, {
        truckStatus: 'active',
        TruckStatus: 'active',
        allocationStatus: 'available',
        availabilityStatus: 'free',
        operationalStatus: 'active',
        OperationalStatus: 'active',
        deliveryStatus: 'none',

        currentClientId: null,
        currentAllocationId: null,
        currentDeliveryId: null,
        currentDriverId: null,
        currentHelperId: null,

        activeDeliveryCount: 0,

        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        lastAllocationChange: admin.firestore.FieldValue.serverTimestamp(),
      });
      reset++;
    });

    await batch.commit();
  }

  console.log(`  🔄 trucks: reset ${reset} trucks to default active state`);

  const updatedSnapshot = await trucksRef.get();
  for (const doc of updatedSnapshot.docs) {
    const data = doc.data();
    console.log(`     - ${data.truckPlate || data.TruckPlate || doc.id}: truckStatus=${data.truckStatus}, operationalStatus=${data.operationalStatus}, allocation=${data.allocationStatus}`);
  }

  return reset;
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  🔥 TARGETED TRUNCATION SCRIPT');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Timestamp: ${new Date().toISOString()}`);
  console.log(`  Collections to empty: ${COLLECTIONS_TO_EMPTY.join(', ')}`);
  console.log(`  Trucks: reset to active/available`);
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // Step 1: Empty specified collections
    console.log('📋 Step 1: Emptying collections...');
    let totalDeleted = 0;
    for (const collection of COLLECTIONS_TO_EMPTY) {
      totalDeleted += await deleteCollection(collection);
    }
    console.log(`\n  Total documents deleted: ${totalDeleted}`);

    // Step 2: Reset trucks
    console.log('\n📋 Step 2: Resetting trucks...');
    const trucksReset = await resetTrucks();

    // Summary
    console.log('\n═══════════════════════════════════════════════════');
    console.log('  ✅ TRUNCATION COMPLETE');
    console.log('═══════════════════════════════════════════════════');
    console.log(`  Collections emptied: ${COLLECTIONS_TO_EMPTY.length}`);
    console.log(`  Documents deleted: ${totalDeleted}`);
    console.log(`  Trucks reset: ${trucksReset}`);
    console.log('═══════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ TRUNCATION FAILED:', error);
    process.exit(1);
  }
}

main();
