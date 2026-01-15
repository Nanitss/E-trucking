#!/usr/bin/env node

/**
 * Script to allocate truck ABC123 to client Nathaniel
 * This will allow the client to book the truck
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
try {
  if (!admin.apps.length) {
    const hasFirebaseCredentials = process.env.FIREBASE_PROJECT_ID && 
                                   process.env.FIREBASE_CLIENT_EMAIL && 
                                   process.env.FIREBASE_PRIVATE_KEY;
    
    if (hasFirebaseCredentials) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, '')
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL
      });
      console.log('✅ Firebase Admin SDK initialized successfully');
    } else {
      console.log('⚠️ Firebase credentials not found - running in test mode');
      admin.initializeApp({
        projectId: 'test-mode'
      });
    }
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
}

const db = admin.firestore();

async function allocateTruckToClient() {
  console.log('🚛 Allocating Truck ABC123 to Client Nathaniel...');
  
  try {
    // Client details (from the logs)
    const clientId = 'j412kdTjjvNNXWdLTHAc';
    const clientName = 'Nathaniel';
    
    // Truck details (from the logs)
    const truckId = 'bZ6WDxV1Yeud2ejuc7Lx';
    const truckPlate = 'ABC123';
    
    console.log(`🔍 Client: ${clientName} (ID: ${clientId})`);
    console.log(`🚛 Truck: ${truckPlate} (ID: ${truckId})`);
    
    // Step 1: Verify client exists
    console.log('\n🔍 Step 1: Verifying client exists...');
    const clientDoc = await db.collection('clients').doc(clientId).get();
    
    if (!clientDoc.exists) {
      console.log('❌ Client not found!');
      return;
    }
    
    const clientData = clientDoc.data();
    console.log(`✅ Client found: ${clientData.clientName || clientData.name || 'Unknown'}`);
    
    // Step 2: Verify truck exists
    console.log('\n🔍 Step 2: Verifying truck exists...');
    const truckDoc = await db.collection('trucks').doc(truckId).get();
    
    if (!truckDoc.exists) {
      console.log('❌ Truck not found!');
      return;
    }
    
    const truckData = truckDoc.data();
    console.log(`✅ Truck found: ${truckData.truckPlate || truckData.plate || 'Unknown'}`);
    console.log(`   Status: ${truckData.truckStatus || truckData.status || 'Unknown'}`);
    
    // Step 3: Check if truck is already allocated
    console.log('\n🔍 Step 3: Checking current allocation status...');
    const existingAllocations = await db.collection('allocations')
      .where('truckId', '==', truckId)
      .where('status', '==', 'active')
      .get();
    
    if (!existingAllocations.empty) {
      console.log('⚠️ Truck is currently allocated to another client:');
      existingAllocations.docs.forEach(doc => {
        const allocation = doc.data();
        console.log(`   - Client ID: ${allocation.clientId}`);
        console.log(`   - Allocation ID: ${doc.id}`);
      });
      
      // Deactivate existing allocations
      console.log('\n🔄 Deactivating existing allocations...');
      const batch = db.batch();
      existingAllocations.docs.forEach(doc => {
        batch.update(doc.ref, {
          status: 'returned',
          updated_at: new Date()
        });
      });
      await batch.commit();
      console.log('✅ Existing allocations deactivated');
    } else {
      console.log('✅ No existing active allocations found');
    }
    
    // Step 4: Create new allocation
    console.log('\n🔍 Step 4: Creating new allocation...');
    const allocationRef = db.collection('allocations').doc();
    
    await allocationRef.set({
      clientId,
      truckId,
      allocationDate: new Date(),
      status: 'active',
      created_at: new Date(),
      updated_at: new Date()
    });
    
    console.log(`✅ Allocation created successfully!`);
    console.log(`   Allocation ID: ${allocationRef.id}`);
    console.log(`   Client ID: ${clientId}`);
    console.log(`   Truck ID: ${truckId}`);
    console.log(`   Status: active`);
    
    // Step 5: Verify allocation
    console.log('\n🔍 Step 5: Verifying allocation...');
    const verificationDoc = await db.collection('allocations').doc(allocationRef.id).get();
    
    if (verificationDoc.exists) {
      console.log('✅ Allocation verification successful!');
      console.log('🚀 Client can now book this truck!');
    } else {
      console.log('❌ Allocation verification failed!');
    }
    
  } catch (error) {
    console.error('❌ Error allocating truck:', error);
  }
}

// Run the allocation
if (require.main === module) {
  allocateTruckToClient()
    .then(() => {
      console.log('\n✅ Truck allocation completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Truck allocation failed:', error);
      process.exit(1);
    });
}

module.exports = { allocateTruckToClient };
