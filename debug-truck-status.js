const admin = require('firebase-admin');
const serviceAccount = require('./server/config/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function debugTruckStatus() {
  console.log('🚛 Checking truck status vs delivery status mismatch...');
  
  // Get all trucks
  const trucksSnapshot = await db.collection('trucks').get();
  const trucks = trucksSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  // Get all active deliveries
  const activeDeliveriesSnapshot = await db.collection('deliveries')
    .where('deliveryStatus', 'in', ['pending', 'in-progress', 'started', 'picked-up'])
    .get();
  
  const activeDeliveries = activeDeliveriesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  console.log('\n--- TRUCK STATUS vs DELIVERY STATUS ANALYSIS ---');
  
  for (const truck of trucks) {
    const deliveriesForTruck = activeDeliveries.filter(d => d.truckId === truck.id || d.TruckID === truck.id);
    
    if (deliveriesForTruck.length > 0) {
      console.log(`\n🚛 Truck ${truck.truckPlate || truck.TruckPlate} (${truck.id}):`);
      console.log(`   - Truck Status: ${truck.truckStatus}`);
      console.log(`   - Allocation Status: ${truck.allocationStatus}`);
      console.log(`   - Operational Status: ${truck.operationalStatus}`);
      console.log(`   - Availability Status: ${truck.availabilityStatus}`);
      console.log(`   - Active Delivery Flag: ${truck.activeDelivery}`);
      console.log(`   - Current Delivery ID: ${truck.currentDeliveryId}`);
      
      console.log('   📦 Active Deliveries:');
      deliveriesForTruck.forEach((delivery, index) => {
        console.log(`     ${index + 1}. ${delivery.id} - Status: ${delivery.deliveryStatus}`);
      });
      
      // Check for status mismatch
      const shouldBeInUse = deliveriesForTruck.length > 0;
      const isMarkedAvailable = (truck.availabilityStatus === 'free' && truck.operationalStatus === 'active');
      
      if (shouldBeInUse && isMarkedAvailable) {
        console.log('   ❌ STATUS MISMATCH: Truck has active deliveries but is marked as available!');
      } else if (!shouldBeInUse && !isMarkedAvailable) {
        console.log('   ✅ Status OK: No active deliveries and truck is not available');
      } else {
        console.log('   ✅ Status OK: Truck status matches delivery status');
      }
    } else if (truck.availabilityStatus === 'free' && truck.operationalStatus === 'active') {
      console.log(`\n🟢 Available: ${truck.truckPlate || truck.TruckPlate} (${truck.id}) - No active deliveries`);
    }
  }
  
  console.log('\n--- SUMMARY ---');
  console.log(`Total trucks: ${trucks.length}`);
  console.log(`Active deliveries: ${activeDeliveries.length}`);
  console.log(`Trucks with active deliveries: ${trucks.filter(t => activeDeliveries.some(d => d.truckId === t.id || d.TruckID === t.id)).length}`);
}

debugTruckStatus().catch(console.error).finally(() => process.exit()); 