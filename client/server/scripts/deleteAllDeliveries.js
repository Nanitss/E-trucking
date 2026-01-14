// Very simple script to delete all deliveries
const { db } = require('../config/firebase');

async function deleteAllDeliveries() {
  try {
    console.log('Getting all deliveries...');
    const snapshot = await db.collection('deliveries').get();
    
    if (snapshot.empty) {
      console.log('No deliveries found.');
      return;
    }
    
    console.log(`Found ${snapshot.size} deliveries. Deleting...`);
    
    for (const doc of snapshot.docs) {
      console.log(`Deleting delivery ${doc.id}...`);
      await doc.ref.delete();
    }
    
    console.log('All deliveries deleted successfully!');
  } catch (error) {
    console.error('Error:', error);
  }
}

deleteAllDeliveries(); 