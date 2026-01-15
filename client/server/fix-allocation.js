const { db } = require('./config/firebase');

// Update the allocation to use the correct client ID
async function fixAllocation() {
  try {
    // Get the client ID from Sheena's account
    const clientsSnapshot = await db.collection('clients')
      .where('clientName', '==', 'Sheena Batadlan')
      .limit(1)
      .get();
    
    if (clientsSnapshot.empty) {
      console.log('❌ Client not found');
      return;
    }
    
    const clientId = clientsSnapshot.docs[0].id;
    console.log('✅ Found client ID:', clientId);
    
    // Get the allocation document
    const allocationDoc = await db.collection('allocations').doc('GtDySjZloMUXO8dklARn').get();
    
    if (!allocationDoc.exists) {
      console.log('❌ Allocation document not found');
      return;
    }
    
    console.log('Current allocation data:', allocationDoc.data());
    
    // Update the allocation to use the correct client ID
    await db.collection('allocations').doc('GtDySjZloMUXO8dklARn').update({
      clientId: clientId
    });
    
    console.log('✅ Allocation updated successfully with client ID:', clientId);
  } catch (error) {
    console.error('❌ Error updating allocation:', error);
  }
}

fixAllocation(); 