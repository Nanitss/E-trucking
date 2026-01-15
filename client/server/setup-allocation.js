require('dotenv').config();
const { db } = require('./config/firebase');

// Known IDs from your Firebase setup
const CLIENT_ID = 'iiTk5EI7FNt6lPB3fAth';  // Sheena's client ID
const TRUCK_ID = 'C5Lpm9qP7oh27umSUJnb';   // The truck ID

async function createAllocation() {
  try {
    console.log('Starting allocation setup...');

    // First check if the client exists
    const clientDoc = await db.collection('clients').doc(CLIENT_ID).get();
    if (!clientDoc.exists) {
      console.error(`❌ Client with ID ${CLIENT_ID} does not exist!`);
      return;
    }
    console.log(`✅ Found client: ${clientDoc.data().clientName}`);

    // Check if the truck exists
    const truckDoc = await db.collection('trucks').doc(TRUCK_ID).get();
    if (!truckDoc.exists) {
      console.error(`❌ Truck with ID ${TRUCK_ID} does not exist!`);
      return;
    }
    console.log(`✅ Found truck: ${truckDoc.data().truckPlate}`);

    // Check if truck is already allocated
    if (truckDoc.data().truckStatus !== 'available' && truckDoc.data().truckStatus !== 'allocated') {
      console.error(`❌ Truck is not available for allocation (status: ${truckDoc.data().truckStatus})`);
      return;
    }

    // Create a new allocation document
    const allocationData = {
      clientId: CLIENT_ID,
      truckId: TRUCK_ID,
      status: 'active',
      allocationDate: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    };

    // Add to the allocations collection
    const allocationRef = await db.collection('allocations').add(allocationData);
    console.log(`✅ Created allocation with ID: ${allocationRef.id}`);

    // Update truck status to allocated
    await db.collection('trucks').doc(TRUCK_ID).update({
      truckStatus: 'allocated',
      updated_at: new Date()
    });
    console.log(`✅ Updated truck status to allocated`);

    console.log('✅ Allocation setup completed successfully!');
  } catch (error) {
    console.error('❌ Error setting up allocation:', error);
  }
}

// Run the setup
createAllocation()
  .then(() => console.log('✅ Script execution completed'))
  .catch(err => console.error('❌ Script error:', err)); 