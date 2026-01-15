const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./client/server/config/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://e-trucking-8d905-default-rtdb.asia-southeast1.firebasedatabase.app"
});

const db = admin.firestore();

async function createTestDelivery() {
  try {
    console.log('🚛 Creating test delivery for tracking demonstration...');
    
    // Test delivery data
    const testDelivery = {
      // Basic delivery info
      deliveryStatus: 'in-progress',
      clientId: 'test-client-id',
      clientName: 'Test Client Company',
      
      // Truck and driver assignment
      truckId: 'truck_12345',
      truckPlate: 'ABC-1234',
      driverId: 'test-driver-id',
      driverName: 'Juan Dela Cruz',
      
      // Route information
      pickupLocation: 'Makati City, Metro Manila',
      deliveryAddress: 'Quezon City, Metro Manila',
      pickupCoordinates: {
        lat: 14.5547,
        lng: 121.0244
      },
      dropoffCoordinates: {
        lat: 14.6760,
        lng: 121.0437
      },
      
      // Delivery details
      deliveryDate: new Date().toISOString().split('T')[0], // Today's date
      deliveryTime: '14:00',
      deliveryDistance: 15.5,
      deliveryRate: 1500,
      estimatedDuration: 45,
      
      // Payment info
      paymentStatus: 'pending',
      totalAmount: 1500,
      
      // Timestamps
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Add the delivery to Firestore
    const deliveryRef = await db.collection('deliveries').add(testDelivery);
    console.log(`✅ Test delivery created with ID: ${deliveryRef.id}`);
    
    // Update truck status to show it's in active delivery
    await db.collection('trucks').doc('truck_12345').update({
      truckStatus: 'in-use',
      activeDelivery: true,
      currentDeliveryId: deliveryRef.id,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ Updated truck_12345 status to in-use');
    
    console.log('\n🎯 Test delivery created successfully!');
    console.log('📋 Delivery Details:');
    console.log(`   ID: ${deliveryRef.id}`);
    console.log(`   Status: ${testDelivery.deliveryStatus}`);
    console.log(`   Truck: ${testDelivery.truckPlate} (${testDelivery.truckId})`);
    console.log(`   Driver: ${testDelivery.driverName}`);
    console.log(`   Route: ${testDelivery.pickupLocation} → ${testDelivery.deliveryAddress}`);
    console.log(`   Distance: ${testDelivery.deliveryDistance} km`);
    
    console.log('\n📱 Now you can:');
    console.log('1. Visit the Delivery Tracker page to see this active delivery');
    console.log('2. Power on your GPS module and configure it to send data for truck_12345');
    console.log('3. Watch real-time tracking updates on the delivery tracker');
    
    return deliveryRef.id;
    
  } catch (error) {
    console.error('❌ Error creating test delivery:', error);
    throw error;
  }
}

// Run the script
createTestDelivery()
  .then((deliveryId) => {
    console.log(`\n🚀 Test delivery ${deliveryId} is ready for tracking!`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to create test delivery:', error);
    process.exit(1);
  }); 