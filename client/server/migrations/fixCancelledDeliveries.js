// Migration script to fix existing cancelled deliveries
// This adds deliveryStatus and DeliveryStatus fields to deliveries that only have status: 'cancelled'

// Load environment variables
require('dotenv').config();

const { admin, db } = require('../config/firebase');

console.log('📦 Using existing Firebase configuration from config/firebase.js\n');

// Check if Firebase is properly initialized
if (!db || typeof db.collection !== 'function') {
  console.error('❌ Firebase Firestore is not properly initialized!');
  console.error('⚠️  This script requires valid Firebase credentials.');
  console.error('📝 Please create a .env file with your Firebase credentials:');
  console.error('   FIREBASE_PROJECT_ID=your-project-id');
  console.error('   FIREBASE_CLIENT_EMAIL=your-client-email');
  console.error('   FIREBASE_PRIVATE_KEY="your-private-key"');
  console.error('   FIREBASE_DATABASE_URL=your-database-url\n');
  process.exit(1);
}

async function fixCancelledDeliveries() {
  console.log('🔧 Starting migration to fix cancelled deliveries...\n');
  
  try {
    // Get all deliveries
    const deliveriesSnapshot = await db.collection('deliveries').get();
    
    let fixedCount = 0;
    let alreadyCorrectCount = 0;
    let totalCancelled = 0;
    
    console.log(`📊 Found ${deliveriesSnapshot.size} total deliveries\n`);
    
    // Batch updates for efficiency
    const batch = db.batch();
    let batchCount = 0;
    const MAX_BATCH_SIZE = 500; // Firestore limit
    
    for (const doc of deliveriesSnapshot.docs) {
      const delivery = doc.data();
      const deliveryId = doc.id;
      
      // Check if delivery is cancelled but missing the proper status fields
      const status = delivery.status || '';
      const deliveryStatus = delivery.deliveryStatus || '';
      const DeliveryStatus = delivery.DeliveryStatus || '';
      
      if (status.toLowerCase() === 'cancelled' || 
          deliveryStatus.toLowerCase() === 'cancelled' || 
          DeliveryStatus.toLowerCase() === 'cancelled') {
        
        totalCancelled++;
        
        // Check if it needs fixing (missing deliveryStatus or DeliveryStatus)
        if (!deliveryStatus || !DeliveryStatus || 
            deliveryStatus.toLowerCase() !== 'cancelled' || 
            DeliveryStatus.toLowerCase() !== 'cancelled') {
          
          console.log(`🔄 Fixing delivery: ${deliveryId}`);
          console.log(`   Current: status='${status}', deliveryStatus='${deliveryStatus}', DeliveryStatus='${DeliveryStatus}'`);
          
          // Add to batch update
          batch.update(doc.ref, {
            deliveryStatus: 'cancelled',
            DeliveryStatus: 'cancelled',
            status: 'cancelled'
          });
          
          fixedCount++;
          batchCount++;
          
          // Commit batch if it reaches the limit
          if (batchCount >= MAX_BATCH_SIZE) {
            console.log(`\n💾 Committing batch of ${batchCount} updates...`);
            await batch.commit();
            batchCount = 0;
          }
        } else {
          alreadyCorrectCount++;
        }
      }
    }
    
    // Commit any remaining updates
    if (batchCount > 0) {
      console.log(`\n💾 Committing final batch of ${batchCount} updates...`);
      await batch.commit();
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Migration completed successfully!');
    console.log('='.repeat(60));
    console.log(`📊 Statistics:`);
    console.log(`   Total cancelled deliveries found: ${totalCancelled}`);
    console.log(`   Deliveries fixed: ${fixedCount}`);
    console.log(`   Already correct: ${alreadyCorrectCount}`);
    console.log('='.repeat(60) + '\n');
    
    if (fixedCount > 0) {
      console.log('🎉 All cancelled deliveries now have correct status fields!');
      console.log('   They will now appear correctly on the admin page.\n');
    } else if (totalCancelled > 0) {
      console.log('✅ All cancelled deliveries already had correct status fields!\n');
    } else {
      console.log('ℹ️  No cancelled deliveries found in the database.\n');
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
fixCancelledDeliveries().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
