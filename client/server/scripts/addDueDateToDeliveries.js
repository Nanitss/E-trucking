// One-time migration script to add dueDate field to all deliveries
// Run this once: node scripts/addDueDateToDeliveries.js

// Use the existing Firebase configuration
const { admin, db } = require('../config/firebase');

console.log('✅ Using existing Firebase configuration');

async function addDueDateToAllDeliveries() {
  try {
    console.log('\n🚀 Starting migration: Adding dueDate to all deliveries...\n');
    
    // Get all deliveries
    const deliveriesSnapshot = await db.collection('deliveries').get();
    console.log(`📦 Found ${deliveriesSnapshot.size} deliveries to process`);
    
    if (deliveriesSnapshot.empty) {
      console.log('❌ No deliveries found!');
      return;
    }
    
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    // Process each delivery
    for (const doc of deliveriesSnapshot.docs) {
      const delivery = doc.data();
      const deliveryId = doc.id;
      
      try {
        // Skip if dueDate already exists
        if (delivery.dueDate) {
          console.log(`⏭️  Skipped ${deliveryId} - dueDate already exists`);
          skipped++;
          continue;
        }
        
        // Get delivery date (try multiple field names)
        let deliveryDate = delivery.deliveryDate || 
                          delivery.scheduledDate || 
                          delivery.created_at || 
                          delivery.createdAt;
        
        if (!deliveryDate) {
          console.log(`⚠️  Skipped ${deliveryId} - No delivery date found`);
          skipped++;
          continue;
        }
        
        // Convert to Date object if it's a Firestore Timestamp
        if (deliveryDate.toDate && typeof deliveryDate.toDate === 'function') {
          deliveryDate = deliveryDate.toDate();
        } else if (!(deliveryDate instanceof Date)) {
          deliveryDate = new Date(deliveryDate);
        }
        
        // Calculate due date (30 days after delivery date)
        const dueDate = new Date(deliveryDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        // Update the delivery with dueDate
        await db.collection('deliveries').doc(deliveryId).update({
          dueDate: admin.firestore.Timestamp.fromDate(dueDate),
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ Updated ${deliveryId} - Due Date: ${dueDate.toISOString().split('T')[0]}`);
        updated++;
        
      } catch (error) {
        console.error(`❌ Error processing ${deliveryId}:`, error.message);
        errors++;
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Updated:  ${updated} deliveries`);
    console.log(`⏭️  Skipped:  ${skipped} deliveries`);
    console.log(`❌ Errors:   ${errors} deliveries`);
    console.log(`📦 Total:    ${deliveriesSnapshot.size} deliveries`);
    console.log('='.repeat(60));
    console.log('\n✨ Migration complete!\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
addDueDateToAllDeliveries();
