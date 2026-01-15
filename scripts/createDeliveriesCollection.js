// Script to create a deliveries collection with proper structure
const { db } = require('../config/firebase');

/**
 * Creates the deliveries collection with a sample document
 * This demonstrates how to reference clients and trucks correctly
 */
async function setupDeliveriesCollection() {
  try {
    console.log('🔄 Setting up deliveries collection...');
    console.log('Checking for clients and trucks...');
    
    // First, check if we have any clients and trucks to reference
    const clientsSnapshot = await db.collection('clients').limit(1).get();
    console.log(`Found ${clientsSnapshot.size} clients`);
    
    const trucksSnapshot = await db.collection('trucks').limit(1).get();
    console.log(`Found ${trucksSnapshot.size} trucks`);
    
    if (clientsSnapshot.empty) {
      console.error('❌ No clients found in the database. Please create a client first.');
      return;
    }
    
    if (trucksSnapshot.empty) {
      console.error('❌ No trucks found in the database. Please create a truck first.');
      return;
    }
    
    // Get the first client and truck as example references
    const clientDoc = clientsSnapshot.docs[0];
    const truckDoc = trucksSnapshot.docs[0];
    
    const clientId = clientDoc.id;
    const truckId = truckDoc.id;
    
    console.log(`✅ Using client: ${clientId} and truck: ${truckId} for reference`);
    console.log(`Client name: ${clientDoc.data().clientName}`);
    console.log(`Truck plate: ${truckDoc.data().truckPlate}`);
    
    // Create a sample delivery document
    const deliveryData = {
      // Core Fields
      clientId: clientId, // Reference to client by ID
      truckId: truckId,   // Reference to truck by ID
      
      // Display information (denormalized for quick access)
      clientName: clientDoc.data().clientName || 'Unknown Client',
      truckPlate: truckDoc.data().truckPlate || 'Unknown Plate',
      truckType: truckDoc.data().truckType || 'Unknown Type',
      
      // Staff assignment (optional)
      driverName: 'John Doe', // Example
      helperName: 'Jane Smith', // Example
      
      // Delivery details
      cargoWeight: 5.0, // in tons
      deliveryDate: new Date('2023-07-25T14:00:00'),
      deliveryStatus: 'pending', // pending, in-progress, completed, cancelled
      
      // Location data (essential for maps)
      pickupLocation: '123 Main St, New York, NY',
      deliveryAddress: '456 Elm St, Boston, MA',
      pickupCoordinates: {
        lat: 40.7128,
        lng: -74.0060
      },
      dropoffCoordinates: {
        lat: 42.3601,
        lng: -71.0589
      },
      
      // Route information
      deliveryDistance: 346.2, // in kilometers
      estimatedDuration: 240, // in minutes
      deliveryRate: 750, // delivery price in PHP pesos (₱750)
      
      // Metadata
      created_at: new Date(),
      updated_at: new Date()
    };
    
    console.log('Creating delivery document with data:', JSON.stringify(deliveryData, null, 2));
    
    // Add the document to Firestore
    console.log('Adding to Firestore...');
    const deliveryRef = await db.collection('deliveries').add(deliveryData);
    
    console.log(`✅ Created deliveries collection with sample document: ${deliveryRef.id}`);
    console.log('✅ The collection is now ready to use in your application!');
    
    // Display how to query this in code
    console.log('\n📝 Example code to query deliveries:');
    console.log(`
    // Get all deliveries for a specific client
    const clientDeliveries = await db.collection('deliveries')
      .where('clientId', '==', '${clientId}')
      .get();
      
    // Get all deliveries for a specific truck
    const truckDeliveries = await db.collection('deliveries')
      .where('truckId', '==', '${truckId}')
      .get();
      
    // Get all pending deliveries
    const pendingDeliveries = await db.collection('deliveries')
      .where('deliveryStatus', '==', 'pending')
      .get();
    `);
    
  } catch (error) {
    console.error('❌ Error setting up deliveries collection:', error);
    console.error(error.stack);
  }
}

// Run the setup function
console.log('Starting script...');
setupDeliveriesCollection()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    console.error(error.stack);
    process.exit(1);
  }); 