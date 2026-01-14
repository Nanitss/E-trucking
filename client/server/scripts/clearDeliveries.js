// Script to clear all deliveries from the database
const { db } = require('../config/firebase');

async function clearAllDeliveries() {
  try {
    console.log('Starting deletion of all deliveries...');
    
    // Get all deliveries
    const deliveriesSnapshot = await db.collection('deliveries').get();
    
    if (deliveriesSnapshot.empty) {
      console.log('No deliveries found to delete.');
      return;
    }
    
    console.log(`Found ${deliveriesSnapshot.size} deliveries to delete.`);
    
    // Use a batched write for efficiency
    const batchSize = 500; // Firestore allows up to 500 operations in a batch
    let batch = db.batch();
    let count = 0;
    let totalDeleted = 0;
    
    for (const doc of deliveriesSnapshot.docs) {
      batch.delete(doc.ref);
      count++;
      
      // Commit when we reach batch size limit
      if (count >= batchSize) {
        console.log(`Committing batch of ${count} deletions...`);
        await batch.commit();
        totalDeleted += count;
        console.log(`Deleted ${totalDeleted} deliveries so far...`);
        
        // Start a new batch
        batch = db.batch();
        count = 0;
      }
    }
    
    // Commit any remaining deletes
    if (count > 0) {
      console.log(`Committing final batch of ${count} deletions...`);
      await batch.commit();
      totalDeleted += count;
    }
    
    console.log(`Successfully deleted all ${totalDeleted} deliveries!`);
  } catch (error) {
    console.error('Error deleting deliveries:', error);
  }
}

// Run the function
clearAllDeliveries()
  .then(() => {
    console.log('Deletion process completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  }); 