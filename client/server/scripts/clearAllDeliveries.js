// Script to clear all deliveries from Firestore
const { db, admin } = require('../config/firebase');

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
    
    // Delete each document
    let deleted = 0;
    for (const doc of deliveriesSnapshot.docs) {
      await doc.ref.delete();
      deleted++;
      if (deleted % 10 === 0) {
        console.log(`Deleted ${deleted} deliveries so far...`);
      }
    }
    
    console.log(`Successfully deleted all ${deleted} deliveries!`);
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