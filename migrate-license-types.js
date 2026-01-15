/**
 * Database Migration Script: Update License Types
 * Changes: professional -> Class CE, non-professional -> Class C
 * Removes: student, restricted, none license types
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
// Try to find serviceAccountKey.json in multiple locations
let serviceAccountPath;
let serviceAccount;

// Check if running from root
const rootPath = path.join(__dirname, 'client', 'server', 'serviceAccountKey.json');
// Check if running from client/server
const localPath = path.join(__dirname, 'serviceAccountKey.json');

const fs = require('fs');
if (fs.existsSync(rootPath)) {
  serviceAccountPath = rootPath;
  console.log('✅ Found credentials at root level');
} else if (fs.existsSync(localPath)) {
  serviceAccountPath = localPath;
  console.log('✅ Found credentials in current directory');
} else {
  console.error('❌ ERROR: serviceAccountKey.json not found!');
  console.error('   Searched:');
  console.error('   - ' + rootPath);
  console.error('   - ' + localPath);
  process.exit(1);
}

serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const db = admin.firestore();

// License type mapping
const LICENSE_TYPE_MAPPING = {
  'professional': 'Class CE',
  'non-professional': 'Class C',
  'non professional': 'Class C',
  'nonprofessional': 'Class C',
  'pro': 'Class CE',
  'non-pro': 'Class C',
  'student': 'Class C',        // Convert student to Class C (default)
  'restricted': 'Class C',     // Convert restricted to Class C (default)
  'none': 'Class C',           // Convert none to Class C (default)
  'no license': 'Class C',     // Convert to default
  '': 'Class C'                // Empty string to default
};

async function migrateLicenseTypes() {
  console.log('🚀 Starting License Type Migration...\n');
  
  let driversUpdated = 0;
  let driversSkipped = 0;
  let helpersUpdated = 0;
  let helpersSkipped = 0;

  try {
    // ========== MIGRATE DRIVERS ==========
    console.log('📋 Migrating Drivers...');
    const driversSnapshot = await db.collection('drivers').get();
    
    console.log(`Found ${driversSnapshot.size} drivers to process\n`);
    
    for (const doc of driversSnapshot.docs) {
      const driverData = doc.data();
      const currentLicenseType = driverData.licenseType;
      
      if (!currentLicenseType) {
        // Set default if missing
        await doc.ref.update({
          licenseType: 'Class C',
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`✅ Driver ${doc.id} (${driverData.DriverName}): Set default license type -> Class C`);
        driversUpdated++;
        continue;
      }
      
      const normalizedType = currentLicenseType.toLowerCase().trim();
      const newLicenseType = LICENSE_TYPE_MAPPING[normalizedType];
      
      if (newLicenseType && newLicenseType !== currentLicenseType) {
        await doc.ref.update({
          licenseType: newLicenseType,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`✅ Driver ${doc.id} (${driverData.DriverName}): ${currentLicenseType} -> ${newLicenseType}`);
        driversUpdated++;
      } else if (!newLicenseType) {
        console.log(`⚠️  Driver ${doc.id} (${driverData.DriverName}): Unknown type "${currentLicenseType}" - setting to Class C`);
        await doc.ref.update({
          licenseType: 'Class C',
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        driversUpdated++;
      } else {
        console.log(`⏭️  Driver ${doc.id} (${driverData.DriverName}): Already correct (${currentLicenseType})`);
        driversSkipped++;
      }
    }
    
    console.log(`\n✅ Drivers Migration Complete: ${driversUpdated} updated, ${driversSkipped} skipped\n`);
    
    // ========== MIGRATE HELPERS ==========
    console.log('📋 Migrating Helpers...');
    const helpersSnapshot = await db.collection('helpers').get();
    
    console.log(`Found ${helpersSnapshot.size} helpers to process\n`);
    
    for (const doc of helpersSnapshot.docs) {
      const helperData = doc.data();
      const currentLicenseType = helperData.licenseType;
      
      if (!currentLicenseType) {
        // Set default if missing
        await doc.ref.update({
          licenseType: 'Class C',
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`✅ Helper ${doc.id} (${helperData.HelperName}): Set default license type -> Class C`);
        helpersUpdated++;
        continue;
      }
      
      const normalizedType = currentLicenseType.toLowerCase().trim();
      const newLicenseType = LICENSE_TYPE_MAPPING[normalizedType];
      
      if (newLicenseType && newLicenseType !== currentLicenseType) {
        await doc.ref.update({
          licenseType: newLicenseType,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`✅ Helper ${doc.id} (${helperData.HelperName}): ${currentLicenseType} -> ${newLicenseType}`);
        helpersUpdated++;
      } else if (!newLicenseType) {
        console.log(`⚠️  Helper ${doc.id} (${helperData.HelperName}): Unknown type "${currentLicenseType}" - setting to Class C`);
        await doc.ref.update({
          licenseType: 'Class C',
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        helpersUpdated++;
      } else {
        console.log(`⏭️  Helper ${doc.id} (${helperData.HelperName}): Already correct (${currentLicenseType})`);
        helpersSkipped++;
      }
    }
    
    console.log(`\n✅ Helpers Migration Complete: ${helpersUpdated} updated, ${helpersSkipped} skipped\n`);
    
    // ========== SUMMARY ==========
    console.log('=' .repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('=' .repeat(60));
    console.log(`Drivers: ${driversUpdated} updated, ${driversSkipped} already correct`);
    console.log(`Helpers: ${helpersUpdated} updated, ${helpersSkipped} already correct`);
    console.log(`Total Records Updated: ${driversUpdated + helpersUpdated}`);
    console.log('=' .repeat(60));
    console.log('\n✅ License Type Migration Completed Successfully!\n');
    
  } catch (error) {
    console.error('❌ Migration Error:', error);
    throw error;
  } finally {
    // Close Firebase connection
    await admin.app().delete();
  }
}

// Run migration
migrateLicenseTypes()
  .then(() => {
    console.log('🎉 Script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
