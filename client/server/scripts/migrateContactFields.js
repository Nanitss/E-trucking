// Migration script to update all existing deliveries with pickup and dropoff contact information
const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
}

const db = admin.firestore();

async function migrateContactFields() {
  console.log('🚀 Starting contact fields migration...\n');
  
  try {
    // Get all deliveries
    const deliveriesSnapshot = await db.collection('deliveries').get();
    
    console.log(`📦 Found ${deliveriesSnapshot.size} deliveries to update\n`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Process each delivery
    for (const doc of deliveriesSnapshot.docs) {
      const deliveryId = doc.id;
      const data = doc.data();
      
      try {
        // Check if already has new contact fields
        if (data.pickupContactNumber && data.dropoffContactNumber) {
          console.log(`⏭️  Skipping ${deliveryId} - already has new contact fields`);
          skippedCount++;
          continue;
        }
        
        // Update with new contact fields
        const updateData = {
          pickupContactPerson: 'Nathaniel Garcia',
          pickupContactNumber: '09605877964',
          dropoffContactPerson: 'Nathaniel Garcia',
          dropoffContactNumber: '09605877964',
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
          migrated: true // Flag to indicate this was migrated
        };
        
        await db.collection('deliveries').doc(deliveryId).update(updateData);
        
        console.log(`✅ Updated ${deliveryId}`);
        updatedCount++;
        
      } catch (error) {
        console.error(`❌ Error updating ${deliveryId}:`, error.message);
        errorCount++;
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Successfully updated: ${updatedCount}`);
    console.log(`⏭️  Skipped (already migrated): ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📦 Total processed: ${deliveriesSnapshot.size}`);
    console.log('='.repeat(50) + '\n');
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('💥 Fatal error during migration:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the migration
migrateContactFields();
