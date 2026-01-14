// Force delete all deliveries script - handles null IDs and invalid data
const { db, admin } = require('../config/firebase');

async function forceDeleteAllDeliveries() {
  try {
    console.log('FORCE DELETE: Starting deletion of all deliveries...');
    
    // Get all deliveries collection documents
    const deliveriesSnapshot = await db.collection('deliveries').get();
    
    if (deliveriesSnapshot.empty) {
      console.log('No deliveries found to delete.');
      return;
    }
    
    console.log(`Found ${deliveriesSnapshot.size} delivery documents to delete.`);
    
    // Delete all documents directly, regardless of their content
    let deletedCount = 0;
    
    for (const doc of deliveriesSnapshot.docs) {
      try {
        console.log(`Deleting delivery document with ID: ${doc.id}`);
        await doc.ref.delete();
        deletedCount++;
      } catch (deleteError) {
        console.error(`Error deleting document ${doc.id}:`, deleteError);
        // Continue with next document even if this one fails
      }
    }
    
    console.log(`Successfully deleted ${deletedCount} out of ${deliveriesSnapshot.size} delivery documents!`);
  } catch (error) {
    console.error('Fatal error during deletion:', error);
  }
}

// Run the function
forceDeleteAllDeliveries()
  .then(() => {
    console.log('Force deletion process completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  }); 