// Direct Firebase update using admin SDK
// Run this script with the server already running so Firebase is already initialized

// Get the db reference that should be initialized by the running server
try {
  // Get the Firebase db instance directly
  const { db } = require('./config/firebase');
  
  async function fixAllocation() {
    try {
      console.log('Starting allocation fix...');
      
      // Known IDs from the screenshots
      const clientId = 'iiTk5EI7FNt6lPB3fAth'; // Sheena's client ID
      const truckId = 'C5Lpm9qP7oh27umSUJnb'; // The allocated truck ID
      const allocationId = 'GtDySjZloMUXO8dklARn'; // The allocation document ID
      
      // Direct update of the allocation document
      await db.collection('allocations').doc(allocationId).update({
        clientId: clientId
      });
      
      console.log('✅ Allocation updated successfully!');
      console.log(`✅ Connected truck ${truckId} to client ${clientId}`);
    } catch (error) {
      console.error('❌ Error updating allocation:', error);
    }
  }
  
  // Run the function
  fixAllocation();
} catch (error) {
  console.error('Error importing Firebase:', error);
} 