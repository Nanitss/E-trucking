const admin = require('firebase-admin');
const path = require('path');

// Load Firebase configuration
let serviceAccount;
try {
  serviceAccount = require('./client/server/serviceAccountKey.json');
} catch (error) {
  console.log('❌ Firebase service account key not found. Please ensure serviceAccountKey.json exists in client/server/');
  process.exit(1);
}

// Initialize Firebase Admin SDK
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization error:', error.message);
  process.exit(1);
}

const db = admin.firestore();

async function debugBookingIssue() {
  try {
    console.log('🔍 DEBUGGING TRUCK BOOKING ISSUE...\n');
    
    // Check trucks
    console.log('📋 CHECKING TRUCKS:');
    const trucksSnapshot = await db.collection('trucks').get();
    const trucks = [];
    trucksSnapshot.forEach(doc => {
      const data = doc.data();
      trucks.push({
        id: doc.id,
        plate: data.truckPlate,
        status: data.truckStatus,
        allocationStatus: data.allocationStatus,
        operationalStatus: data.operationalStatus,
        availabilityStatus: data.availabilityStatus,
        activeDelivery: data.activeDelivery,
        capacity: data.truckCapacity
      });
    });
    
    console.log(`Total trucks: ${trucks.length}`);
    
    // Analyze truck availability
    const availableTrucks = trucks.filter(truck => {
      const isAvailable = (
        truck.status !== 'maintenance' && 
        truck.status !== 'out-of-service' &&
        truck.status !== 'under-maintenance' &&
        truck.allocationStatus !== 'maintenance' &&
        truck.allocationStatus !== 'out-of-service' &&
        truck.operationalStatus !== 'maintenance' && 
        truck.operationalStatus !== 'out-of-service' &&
        truck.operationalStatus !== 'under-maintenance'
      );
      return isAvailable;
    });
    
    console.log(`Available trucks: ${availableTrucks.length}`);
    console.log('Available trucks details:');
    availableTrucks.forEach(truck => {
      console.log(`  - ${truck.plate} (${truck.id}): Status=${truck.status}, Allocation=${truck.allocationStatus}, Operational=${truck.operationalStatus}`);
    });
    
    // Check unavailable trucks
    const unavailableTrucks = trucks.filter(truck => !availableTrucks.includes(truck));
    console.log(`\nUnavailable trucks: ${unavailableTrucks.length}`);
    unavailableTrucks.forEach(truck => {
      console.log(`  - ${truck.plate} (${truck.id}): Status=${truck.status}, Allocation=${truck.allocationStatus}, Operational=${truck.operationalStatus}`);
    });
    
    // Check drivers
    console.log('\n👤 CHECKING DRIVERS:');
    const driversSnapshot = await db.collection('drivers').get();
    const drivers = [];
    driversSnapshot.forEach(doc => {
      const data = doc.data();
      drivers.push({
        id: doc.id,
        name: data.DriverName,
        status: data.DriverStatus
      });
    });
    
    console.log(`Total drivers: ${drivers.length}`);
    
    const availableDrivers = drivers.filter(driver => 
      !driver.status || 
      driver.status === 'available' || 
      driver.status === 'active'
    );
    
    console.log(`Available drivers: ${availableDrivers.length}`);
    availableDrivers.forEach(driver => {
      console.log(`  - ${driver.name} (${driver.id}): Status=${driver.status}`);
    });
    
    // Check helpers
    console.log('\n🤝 CHECKING HELPERS:');
    const helpersSnapshot = await db.collection('helpers').get();
    const helpers = [];
    helpersSnapshot.forEach(doc => {
      const data = doc.data();
      helpers.push({
        id: doc.id,
        name: data.HelperName,
        status: data.HelperStatus
      });
    });
    
    console.log(`Total helpers: ${helpers.length}`);
    
    const availableHelpers = helpers.filter(helper => 
      !helper.status || 
      helper.status === 'available' || 
      helper.status === 'active'
    );
    
    console.log(`Available helpers: ${availableHelpers.length}`);
    availableHelpers.forEach(helper => {
      console.log(`  - ${helper.name} (${helper.id}): Status=${helper.status}`);
    });
    
    // Check active deliveries
    console.log('\n📦 CHECKING ACTIVE DELIVERIES:');
    const activeDeliveriesSnapshot = await db.collection('deliveries')
      .where('deliveryStatus', 'in', ['pending', 'in-progress'])
      .get();
    
    console.log(`Active deliveries: ${activeDeliveriesSnapshot.size}`);
    
    const occupiedTrucks = new Set();
    activeDeliveriesSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.truckId) {
        occupiedTrucks.add(data.truckId);
      }
    });
    
    console.log(`Trucks occupied by active deliveries: ${occupiedTrucks.size}`);
    
    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`✅ Available trucks: ${availableTrucks.length}`);
    console.log(`✅ Available drivers: ${availableDrivers.length}`);
    console.log(`✅ Available helpers: ${availableHelpers.length}`);
    console.log(`⚠️ Trucks in active deliveries: ${occupiedTrucks.size}`);
    
    if (availableTrucks.length === 0) {
      console.log('\n❌ ISSUE: No trucks are available for booking!');
      console.log('💡 SOLUTION: Check truck statuses and make sure at least some trucks are not in maintenance.');
    } else if (availableDrivers.length === 0) {
      console.log('\n❌ ISSUE: No drivers are available!');
      console.log('💡 SOLUTION: Check driver statuses or modify booking logic to allow booking without drivers.');
    } else if (availableHelpers.length === 0) {
      console.log('\n❌ ISSUE: No helpers are available!');
      console.log('💡 SOLUTION: Check helper statuses or modify booking logic to allow booking without helpers.');
    } else {
      console.log('\n✅ RESOURCES APPEAR SUFFICIENT FOR BOOKING');
      console.log('💡 The issue might be in the booking logic itself or request validation.');
    }
    
  } catch (error) {
    console.error('❌ Error during debugging:', error);
  } finally {
    process.exit(0);
  }
}

debugBookingIssue(); 