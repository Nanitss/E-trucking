const { admin, db } = require('./client/server/config/firebase');

async function debugTrucks() {
  try {
    console.log('🔍 DEBUGGING TRUCK ALLOCATION ISSUE');
    console.log('=====================================\n');
    
    // 1. Check all trucks in the database
    console.log('1. ALL TRUCKS IN DATABASE:');
    const allTrucksSnapshot = await db.collection('trucks').get();
    console.log(`Total trucks: ${allTrucksSnapshot.size}\n`);
    
    allTrucksSnapshot.docs.forEach((doc, index) => {
      const truck = doc.data();
      console.log(`${index + 1}. ID: ${doc.id}`);
      console.log(`   Plate: ${truck.truckPlate}`);
      console.log(`   Type: ${truck.truckType}`);
      console.log(`   Capacity: ${truck.truckCapacity}`);
      console.log(`   Status: ${truck.truckStatus}`);
      console.log('');
    });
    
    // 2. Check all allocations
    console.log('2. ALL ALLOCATIONS:');
    const allAllocationsSnapshot = await db.collection('allocations').get();
    console.log(`Total allocations: ${allAllocationsSnapshot.size}\n`);
    
    allAllocationsSnapshot.docs.forEach((doc, index) => {
      const allocation = doc.data();
      console.log(`${index + 1}. Allocation ID: ${doc.id}`);
      console.log(`   Client ID: ${allocation.clientId}`);
      console.log(`   Truck ID: ${allocation.truckId}`);
      console.log(`   Status: ${allocation.status}`);
      console.log(`   Date: ${allocation.allocationDate ? new Date(allocation.allocationDate.seconds * 1000).toLocaleDateString() : 'N/A'}`);
      console.log('');
    });
    
    // 3. Check all clients
    console.log('3. ALL CLIENTS:');
    const allClientsSnapshot = await db.collection('clients').get();
    console.log(`Total clients: ${allClientsSnapshot.size}\n`);
    
    allClientsSnapshot.docs.forEach((doc, index) => {
      const client = doc.data();
      console.log(`${index + 1}. Client ID: ${doc.id}`);
      console.log(`   Name: ${client.clientName}`);
      console.log(`   Email: ${client.clientEmail}`);
      console.log(`   User ID: ${client.userId}`);
      console.log('');
    });
    
    // 4. Check recent deliveries
    console.log('4. RECENT DELIVERIES:');
    const deliveriesSnapshot = await db.collection('deliveries')
      .orderBy('created_at', 'desc')
      .limit(10)
      .get();
    console.log(`Recent deliveries: ${deliveriesSnapshot.size}\n`);
    
    deliveriesSnapshot.docs.forEach((doc, index) => {
      const delivery = doc.data();
      console.log(`${index + 1}. Delivery ID: ${doc.id}`);
      console.log(`   Client ID: ${delivery.clientId}`);
      console.log(`   Truck ID: ${delivery.truckId}`);
      console.log(`   Truck Plate: ${delivery.truckPlate}`);
      console.log(`   Status: ${delivery.deliveryStatus}`);
      console.log(`   Date: ${delivery.created_at ? new Date(delivery.created_at.seconds * 1000).toLocaleDateString() : 'N/A'}`);
      console.log('');
    });
    
    console.log('=====================================');
    console.log('🔍 DEBUG COMPLETE');
    
  } catch (error) {
    console.error('❌ Error during debugging:', error);
  } finally {
    process.exit(0);
  }
}

debugTrucks(); 