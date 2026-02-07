/**
 * Database Reset Script
 * 
 * This script:
 * 1. Empties all collections EXCEPT trucks and vehicle_rates
 * 2. Keeps only "Nathaniel" (admin) and "Driver5" (client) user accounts
 * 3. Resets all trucks to default state (active, available, no allocation)
 * 
 * Usage: node functions/scripts/resetDatabase.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { db, admin } = require('../config/firebase');

// Collections to completely empty (delete ALL documents)
const COLLECTIONS_TO_EMPTY = [
  'drivers',
  'helpers',
  'staffs',
  'clients',
  'deliveries',
  'allocations',
  'notifications',
  'audit_trail',
  'paymentProofs',
  'operators',
  '_test_connection',
];

// Usernames to keep in the 'users' collection
const USERS_TO_KEEP = ['Nathaniel', 'Driver5'];

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

async function cleanUsersCollection() {
  console.log('\n📋 Cleaning users collection (keeping Nathaniel & Driver5)...');
  const usersRef = db.collection('users');
  const snapshot = await usersRef.get();

  if (snapshot.empty) {
    console.log('  ⏭️  users: already empty');
    return { kept: 0, deleted: 0 };
  }

  let kept = 0;
  let deleted = 0;
  const batchSize = 500;
  const docsToDelete = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const username = data.username || data.UserName || data.name || '';

    // Check if this user should be kept (case-insensitive match)
    const shouldKeep = USERS_TO_KEEP.some(
      (keepName) => username.toLowerCase() === keepName.toLowerCase()
    );

    if (shouldKeep) {
      console.log(`  ✅ Keeping user: "${username}" (role: ${data.role || 'unknown'}, id: ${doc.id})`);
      kept++;
    } else {
      docsToDelete.push(doc.ref);
      deleted++;
    }
  }

  // Delete in batches
  for (let i = 0; i < docsToDelete.length; i += batchSize) {
    const batch = db.batch();
    const chunk = docsToDelete.slice(i, i + batchSize);
    chunk.forEach((ref) => batch.delete(ref));
    await batch.commit();
  }

  console.log(`  🗑️  users: deleted ${deleted}, kept ${kept}`);
  return { kept, deleted };
}

async function resetTrucks() {
  console.log('\n🚛 Resetting all trucks to default state...');
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
      const data = doc.data();
      batch.update(doc.ref, {
        // Status fields - reset to available/active
        truckStatus: 'available',
        allocationStatus: 'available',
        availabilityStatus: 'free',
        deliveryStatus: 'none',

        // Clear allocation tracking
        currentClientId: null,
        currentAllocationId: null,
        currentDeliveryId: null,
        currentDriverId: null,
        currentHelperId: null,

        // Reset delivery counters (keep total history but clear active)
        activeDeliveryCount: 0,

        // Timestamp
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        lastAllocationChange: admin.firestore.FieldValue.serverTimestamp(),
      });
      reset++;
    });

    await batch.commit();
  }

  console.log(`  🔄 trucks: reset ${reset} trucks to default state`);

  // Print summary of reset trucks
  const updatedSnapshot = await trucksRef.get();
  for (const doc of updatedSnapshot.docs) {
    const data = doc.data();
    console.log(`     - ${data.truckPlate || data.TruckPlate || doc.id}: status=${data.truckStatus}, allocation=${data.allocationStatus}`);
  }

  return reset;
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  🔥 DATABASE RESET SCRIPT');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Timestamp: ${new Date().toISOString()}`);
  console.log(`  Collections to empty: ${COLLECTIONS_TO_EMPTY.join(', ')}`);
  console.log(`  Users to keep: ${USERS_TO_KEEP.join(', ')}`);
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // Step 1: Empty all specified collections
    console.log('📋 Step 1: Emptying collections...');
    let totalDeleted = 0;
    for (const collection of COLLECTIONS_TO_EMPTY) {
      totalDeleted += await deleteCollection(collection);
    }
    console.log(`\n  Total documents deleted from collections: ${totalDeleted}`);

    // Step 2: Clean users collection (selective)
    console.log('\n📋 Step 2: Cleaning users collection...');
    const userResult = await cleanUsersCollection();

    // Step 3: Reset trucks
    console.log('\n📋 Step 3: Resetting trucks...');
    const trucksReset = await resetTrucks();

    // Summary
    console.log('\n═══════════════════════════════════════════════════');
    console.log('  ✅ DATABASE RESET COMPLETE');
    console.log('═══════════════════════════════════════════════════');
    console.log(`  Collections emptied: ${COLLECTIONS_TO_EMPTY.length}`);
    console.log(`  Documents deleted: ${totalDeleted}`);
    console.log(`  Users deleted: ${userResult.deleted}`);
    console.log(`  Users kept: ${userResult.kept}`);
    console.log(`  Trucks reset: ${trucksReset}`);
    console.log('═══════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ RESET FAILED:', error);
    process.exit(1);
  }
}

main();
