const { db } = require('./server/config/firebase');

async function fixDeliveryClientIds() {
  try {
    console.log('🔄 Starting delivery client ID fix...');
    
    // Get all deliveries with the incorrect client ID
    const deliveriesSnapshot = await db.collection('deliveries')
      .where('clientId', '==', 'p4hj4KW644Ih52aCQ40')
      .get();
    
    if (deliveriesSnapshot.empty) {
      console.log('No deliveries found with incorrect client ID');
      return;
    }
    
    console.log(`Found ${deliveriesSnapshot.size} deliveries to fix`);
    
    // Update each delivery to use the user's login ID
    const batch = db.batch();
    let updateCount = 0;
    
    deliveriesSnapshot.forEach(doc => {
      const deliveryRef = db.collection('deliveries').doc(doc.id);
      batch.update(deliveryRef, {
        clientId: 'j412kdTjjvMNXWdLTHAc', // Use the user's login ID
        updated_at: new Date()
      });
      updateCount++;
      console.log(`- Updating delivery ${doc.id}`);
    });
    
    // Commit the batch update
    await batch.commit();
    
    console.log(`✅ Successfully updated ${updateCount} delivery records`);
    console.log('All deliveries now use clientId: j412kdTjjvMNXWdLTHAc');
    
  } catch (error) {
    console.error('❌ Error fixing delivery client IDs:', error);
  }
}

// Run the fix
fixDeliveryClientIds().then(() => {
  console.log('Fix complete!');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
}); 