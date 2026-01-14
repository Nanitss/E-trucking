// Script to fix truck allocations in Firebase
const { db } = require('../config/firebase');
const admin = require('firebase-admin');

async function fixTruckAllocations() {
  console.log('🔄 Starting to fix truck allocations...');
  
  try {
    // Get all trucks
    const trucksSnapshot = await db.collection('trucks').get();
    const trucks = trucksSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`🔍 Found ${trucks.length} total trucks`);
    
    // Get all allocations
    const allocationsSnapshot = await db.collection('allocations')
      .where('status', '==', 'active')
      .get();
    
    const allocations = allocationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`🔍 Found ${allocations.length} active allocations`);
    
    // Get all clients
    const clientsSnapshot = await db.collection('clients').get();
    const clients = clientsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`🔍 Found ${clients.length} clients`);
    
    // Find trucks marked as allocated but without allocation records
    const allocatedTrucks = trucks.filter(truck => truck.truckStatus === 'allocated');
    console.log(`🔍 Found ${allocatedTrucks.length} trucks with 'allocated' status`);
    
    const trucksWithoutAllocations = allocatedTrucks.filter(truck => 
      !allocations.some(allocation => allocation.truckId === truck.id && allocation.status === 'active')
    );
    
    console.log(`⚠️ Found ${trucksWithoutAllocations.length} allocated trucks without allocation records`);
    
    // Find trucks with allocation records but wrong status
    const trucksWithWrongStatus = trucks.filter(truck => 
      truck.truckStatus !== 'allocated' && 
      allocations.some(allocation => allocation.truckId === truck.id && allocation.status === 'active')
    );
    
    console.log(`⚠️ Found ${trucksWithWrongStatus.length} trucks with active allocations but wrong status`);
    
    // Fix issues
    const batch = db.batch();
    let fixCount = 0;
    
    // 1. Fix trucks that are allocated but missing allocation records
    if (trucksWithoutAllocations.length > 0 && clients.length > 0) {
      // Use the first client as default if needed
      const defaultClient = clients[0];
      console.log(`ℹ️ Using client ${defaultClient.id} (${defaultClient.clientName || 'unnamed'}) as default for allocations`);
      
      for (const truck of trucksWithoutAllocations) {
        console.log(`🔧 Creating missing allocation record for truck ${truck.id} (${truck.truckPlate || 'unknown'})`);
        
        // Create new allocation record
        const newAllocationRef = db.collection('allocations').doc();
        batch.set(newAllocationRef, {
          clientId: defaultClient.id,
          truckId: truck.id,
          allocationDate: admin.firestore.FieldValue.serverTimestamp(),
          status: 'active',
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        
        fixCount++;
      }
    }
    
    // 2. Fix trucks with wrong status
    for (const truck of trucksWithWrongStatus) {
      console.log(`🔧 Fixing status for truck ${truck.id} (${truck.truckPlate || 'unknown'})`);
      
      const truckRef = db.collection('trucks').doc(truck.id);
      batch.update(truckRef, {
        truckStatus: 'allocated',
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      
      fixCount++;
    }
    
    // 3. Find duplicate allocations for the same truck and clean them up
    const truckToAllocationsMap = {};
    
    for (const allocation of allocations) {
      if (!truckToAllocationsMap[allocation.truckId]) {
        truckToAllocationsMap[allocation.truckId] = [];
      }
      truckToAllocationsMap[allocation.truckId].push(allocation);
    }
    
    for (const [truckId, truckAllocations] of Object.entries(truckToAllocationsMap)) {
      if (truckAllocations.length > 1) {
        console.log(`⚠️ Truck ${truckId} has ${truckAllocations.length} active allocations`);
        
        // Keep the most recent allocation, mark others as returned
        truckAllocations.sort((a, b) => {
          const dateA = a.allocationDate instanceof Date ? a.allocationDate : new Date(a.allocationDate);
          const dateB = b.allocationDate instanceof Date ? b.allocationDate : new Date(b.allocationDate);
          return dateB - dateA; // Sort in descending order (most recent first)
        });
        
        // Keep the first one (most recent), mark others as returned
        for (let i = 1; i < truckAllocations.length; i++) {
          console.log(`🔧 Marking duplicate allocation ${truckAllocations[i].id} as returned`);
          
          const allocationRef = db.collection('allocations').doc(truckAllocations[i].id);
          batch.update(allocationRef, {
            status: 'returned',
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          });
          
          fixCount++;
        }
      }
    }
    
    // Commit the batch
    if (fixCount > 0) {
      await batch.commit();
      console.log(`✅ Fixed ${fixCount} allocation issues`);
    } else {
      console.log('ℹ️ No allocation issues needed fixing');
    }
    
    console.log('✅ Truck allocation fix complete!');
  } catch (error) {
    console.error('❌ Error fixing truck allocations:', error);
  }
}

// Run the function if this file is executed directly
if (require.main === module) {
  fixTruckAllocations()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
} else {
  // Export for use in other modules
  module.exports = { fixTruckAllocations };
} 