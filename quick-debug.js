const { admin, db } = require('./client/server/config/firebase');

async function quickDebug() {
  try {
    console.log('🔍 QUICK DEBUG - Checking why only 1 truck is returned');
    console.log('=====================================================\n');
    
    // 1. Check all allocations
    console.log('1. ALL ACTIVE ALLOCATIONS:');
    const allocationsSnapshot = await db.collection('allocations')
      .where('status', '==', 'active')
      .get();
    
    console.log(`Total active allocations: ${allocationsSnapshot.size}\n`);
    allocationsSnapshot.docs.forEach((doc, index) => {
      const allocation = doc.data();
      console.log(`${index + 1}. Client: ${allocation.clientId}, Truck: ${allocation.truckId}`);
    });
    console.log('');
    
    // 2. Check all trucks with their statuses
    console.log('2. ALL TRUCKS:');
    const trucksSnapshot = await db.collection('trucks').get();
    console.log(`Total trucks: ${trucksSnapshot.size}\n`);
    
    trucksSnapshot.docs.forEach((doc, index) => {
      const truck = doc.data();
      console.log(`${index + 1}. ${truck.truckPlate} (${doc.id}) - Status: ${truck.truckStatus}`);
    });
    console.log('');
    
    // 3. Check recent deliveries to see what trucks were booked
    console.log('3. RECENT DELIVERIES (last 5):');
    const deliveriesSnapshot = await db.collection('deliveries')
      .orderBy('created_at', 'desc')
      .limit(5)
      .get();
    
    console.log(`Recent deliveries: ${deliveriesSnapshot.size}\n`);
    deliveriesSnapshot.docs.forEach((doc, index) => {
      const delivery = doc.data();
      console.log(`${index + 1}. Client: ${delivery.clientId}, Truck: ${delivery.truckId} (${delivery.truckPlate}), Status: ${delivery.deliveryStatus}`);
    });
    console.log('');
    
    // 4. Check what specific client ID is being used in recent bookings
    console.log('4. CLIENT IDs IN RECENT DELIVERIES:');
    const uniqueClientIds = [...new Set(deliveriesSnapshot.docs.map(doc => doc.data().clientId))];
    console.log('Unique client IDs:', uniqueClientIds);
    console.log('');
    
    console.log('=====================================================');
    
  } catch (error) {
    console.error('❌ Error during debugging:', error);
  } finally {
    process.exit(0);
  }
}

quickDebug(); 