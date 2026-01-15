// test-allocations.js
// Script to check and fix truck allocations

require('dotenv').config();
const { db } = require('./config/firebase');

async function main() {
  console.log('======= ALLOCATION CHECK TOOL =======');
  
  try {
    // Step 1: Get all trucks
    console.log('\n1. Getting all trucks...');
    const trucksSnapshot = await db.collection('trucks').get();
    console.log(`Found ${trucksSnapshot.size} trucks in database`);
    
    // Step 2: Get all allocations
    console.log('\n2. Getting all allocations...');
    const allocationsSnapshot = await db.collection('allocations').get();
    console.log(`Found ${allocationsSnapshot.size} allocation records in database`);
    
    // Step 3: Get all clients
    console.log('\n3. Getting all clients...');
    const clientsSnapshot = await db.collection('clients').get();
    console.log(`Found ${clientsSnapshot.size} clients in database`);
    
    if (clientsSnapshot.size === 0) {
      console.log('ERROR: No clients found. Please create a client first.');
      return;
    }
    
    // Create a map of truck ID to status
    const truckStatusMap = {};
    trucksSnapshot.forEach(doc => {
      truckStatusMap[doc.id] = doc.data().truckStatus;
    });
    
    // Create a map of truck ID to active allocation
    const truckAllocationMap = {};
    allocationsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.status === 'active') {
        truckAllocationMap[data.truckId] = {
          allocationId: doc.id,
          clientId: data.clientId,
          date: data.allocationDate
        };
      }
    });
    
    // List the allocation mismatches
    console.log('\n4. Checking for allocation mismatches...');
    
    const mismatches = [];
    
    // Check trucks with 'allocated' status but no allocation record
    const missingAllocationRecords = trucksSnapshot.docs
      .filter(doc => doc.data().truckStatus === 'allocated' && !truckAllocationMap[doc.id])
      .map(doc => ({ 
        truckId: doc.id, 
        truckPlate: doc.data().truckPlate,
        issue: 'Truck marked as allocated but has no allocation record'
      }));
    
    // Check trucks with allocation records but wrong status
    const wrongStatusTrucks = trucksSnapshot.docs
      .filter(doc => doc.data().truckStatus !== 'allocated' && truckAllocationMap[doc.id])
      .map(doc => ({ 
        truckId: doc.id, 
        truckPlate: doc.data().truckPlate,
        currentStatus: doc.data().truckStatus,
        issue: 'Truck has active allocation but status is not "allocated"'
      }));
    
    mismatches.push(...missingAllocationRecords, ...wrongStatusTrucks);
    
    if (mismatches.length === 0) {
      console.log('No allocation mismatches found! Everything looks good.');
    } else {
      console.log(`Found ${mismatches.length} allocation mismatches:`);
      mismatches.forEach((mismatch, index) => {
        console.log(`\n[${index + 1}] ${mismatch.issue}`);
        console.log(`    Truck ID: ${mismatch.truckId}`);
        console.log(`    Truck Plate: ${mismatch.truckPlate}`);
        if (mismatch.currentStatus) {
          console.log(`    Current Status: ${mismatch.currentStatus}`);
        }
      });
      
      // Step 5: Fix the issues
      console.log('\n5. Fixing allocation issues...');
      
      // Get the default client for allocation
      const defaultClient = clientsSnapshot.docs[0];
      const defaultClientId = defaultClient.id;
      const defaultClientName = defaultClient.data().clientName;
      
      console.log(`Using client ${defaultClientName} (${defaultClientId}) for fixing allocations`);
      
      // Batch for updates
      const batch = db.batch();
      let fixCount = 0;
      
      // Fix missing allocation records
      for (const mismatch of missingAllocationRecords) {
        console.log(`Creating allocation record for truck ${mismatch.truckId} (${mismatch.truckPlate})`);
        
        const newAllocationRef = db.collection('allocations').doc();
        batch.set(newAllocationRef, {
          clientId: defaultClientId,
          truckId: mismatch.truckId,
          allocationDate: new Date(),
          status: 'active',
          created_at: new Date(),
          updated_at: new Date()
        });
        
        fixCount++;
      }
      
      // Fix wrong status trucks
      for (const mismatch of wrongStatusTrucks) {
        console.log(`Updating status for truck ${mismatch.truckId} (${mismatch.truckPlate}) from "${mismatch.currentStatus}" to "allocated"`);
        
        const truckRef = db.collection('trucks').doc(mismatch.truckId);
        batch.update(truckRef, {
          truckStatus: 'allocated',
          updated_at: new Date()
        });
        
        fixCount++;
      }
      
      if (fixCount > 0) {
        await batch.commit();
        console.log(`\nSuccessfully fixed ${fixCount} allocation issues!`);
      } else {
        console.log('\nNo fixes needed to be applied.');
      }
    }
    
    console.log('\n======= ALLOCATION CHECK COMPLETE =======');
    
  } catch (error) {
    console.error('Error running allocation check:', error);
  }
}

main(); 