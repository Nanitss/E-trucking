// fix-allocations.js - Script to forcibly create truck allocations
// Run this from the server directory: node fix-allocations.js

require('dotenv').config();
const { db } = require('./config/firebase');

async function fixAllocations() {
  try {
    console.log('======== FIXING TRUCK ALLOCATIONS ========');
    
    // Step 1: Get all clients
    console.log('\n1. Getting all clients...');
    const clientsSnapshot = await db.collection('clients').get();
    
    if (clientsSnapshot.empty) {
      console.error('No clients found! Please create a client first.');
      return;
    }
    
    console.log(`Found ${clientsSnapshot.size} clients.`);
    const clients = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    clients.forEach((client, index) => {
      console.log(`${index + 1}. ${client.clientName || client.ClientName || 'Unknown'} (${client.id})`);
    });
    
    // For simplicity, use the first client as our target
    const targetClient = clients[0];
    console.log(`\nUsing client: ${targetClient.clientName || targetClient.ClientName} (${targetClient.id})`);
    
    // Step 2: Get all trucks
    console.log('\n2. Getting all trucks...');
    const trucksSnapshot = await db.collection('trucks').get();
    
    if (trucksSnapshot.empty) {
      console.error('No trucks found! Please create trucks first.');
      return;
    }
    
    console.log(`Found ${trucksSnapshot.size} trucks in total.`);
    
    // Step 3: Find available trucks (status = 'available')
    const availableTrucks = trucksSnapshot.docs
      .filter(doc => doc.data().truckStatus === 'available')
      .map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log(`Found ${availableTrucks.length} available trucks.`);
    
    // Step 4: Find allocated trucks (status = 'allocated')
    const allocatedTrucks = trucksSnapshot.docs
      .filter(doc => doc.data().truckStatus === 'allocated')
      .map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log(`Found ${allocatedTrucks.length} already allocated trucks.`);
    
    // Step 5: Get current allocations
    console.log('\n3. Getting current allocations...');
    const allocationsSnapshot = await db.collection('allocations').get();
    console.log(`Found ${allocationsSnapshot.size} allocation records.`);
    
    // Create a map of truck IDs to their allocation
    const truckAllocationMap = {};
    allocationsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.status === 'active') {
        truckAllocationMap[data.truckId] = {
          id: doc.id,
          clientId: data.clientId,
          status: data.status
        };
      }
    });
    
    // Step 6: Fix issues with allocated trucks
    console.log('\n4. Creating missing allocation records...');
    
    const batch = db.batch();
    let fixCount = 0;
    
    for (const truck of allocatedTrucks) {
      const allocation = truckAllocationMap[truck.id];
      
      if (!allocation) {
        console.log(`Creating allocation for truck ${truck.id} (${truck.truckPlate})`);
        
        const newAllocationRef = db.collection('allocations').doc();
        batch.set(newAllocationRef, {
          truckId: truck.id,
          clientId: targetClient.id,
          status: 'active',
          allocationDate: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        });
        
        fixCount++;
      } else if (allocation.clientId !== targetClient.id) {
        console.log(`Updating allocation for truck ${truck.id} (${truck.truckPlate}) from client ${allocation.clientId} to ${targetClient.id}`);
        
        const allocationRef = db.collection('allocations').doc(allocation.id);
        batch.update(allocationRef, {
          clientId: targetClient.id,
          updated_at: new Date()
        });
        
        fixCount++;
      }
    }
    
    // Step 7: Force allocate 3 available trucks (if available)
    console.log('\n5. Forcibly allocating some available trucks...');
    
    const trucksToAllocate = Math.min(3, availableTrucks.length);
    console.log(`Will allocate ${trucksToAllocate} trucks...`);
    
    for (let i = 0; i < trucksToAllocate; i++) {
      const truck = availableTrucks[i];
      console.log(`Allocating truck ${truck.id} (${truck.truckPlate}) to client ${targetClient.id}`);
      
      // Create allocation record
      const newAllocationRef = db.collection('allocations').doc();
      batch.set(newAllocationRef, {
        truckId: truck.id,
        clientId: targetClient.id,
        status: 'active',
        allocationDate: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      });
      
      // Update truck status to allocated
      const truckRef = db.collection('trucks').doc(truck.id);
      batch.update(truckRef, {
        truckStatus: 'allocated',
        updated_at: new Date()
      });
      
      fixCount++;
    }
    
    // Commit all changes
    if (fixCount > 0) {
      console.log(`\nCommitting ${fixCount} changes to the database...`);
      await batch.commit();
      console.log('Changes committed successfully!');
    } else {
      console.log('\nNo changes needed. Everything seems to be in order.');
    }
    
    console.log('\n======== ALLOCATION FIXES COMPLETE ========');
    
  } catch (error) {
    console.error('Error fixing allocations:', error);
  }
}

// Run the fix function
fixAllocations(); 