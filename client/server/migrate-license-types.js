/**
 * Database Migration Script: Update License Types
 * Changes: professional -> Class CE, non-professional -> Class C
 * Removes: student, restricted, none license types
 */

const admin = require('firebase-admin');
const path = require('path');

// Load environment variables from .env file
require('dotenv').config();

console.log('🔧 Initializing Firebase Admin SDK...');

// Initialize Firebase Admin SDK using environment variables
if (!admin.apps.length) {
  const hasFirebaseCredentials = process.env.FIREBASE_PROJECT_ID && 
                                 process.env.FIREBASE_CLIENT_EMAIL && 
                                 process.env.FIREBASE_PRIVATE_KEY;
  
  if (!hasFirebaseCredentials) {
    console.error('❌ ERROR: Firebase credentials not found in .env file!');
    console.error('   Required environment variables:');
    console.error('   - FIREBASE_PROJECT_ID');
    console.error('   - FIREBASE_CLIENT_EMAIL');
    console.error('   - FIREBASE_PRIVATE_KEY');
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, '')
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
  
  console.log('✅ Firebase Admin SDK initialized successfully');
}

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
