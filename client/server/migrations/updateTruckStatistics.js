// Migration script to calculate and update truck statistics (TotalDeliveries and TotalKilometers)
// based on historical delivered deliveries

const admin = require('firebase-admin');
require('dotenv').config(); // Load environment variables

// Initialize Firebase Admin if not already initialized
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
    console.log('✅ Firebase Admin SDK initialized successfully with credentials');
  } else {
    console.error('❌ Firebase credentials not found in environment variables');
    console.error('⚠️  Please ensure .env file exists with Firebase credentials');
    process.exit(1);
  }
}

const db = admin.firestore();

// Check if Firebase is properly initialized
if (!db || typeof db.collection !== 'function') {
  console.error('❌ Firebase Firestore is not properly initialized!');
  console.error('⚠️  This script requires valid Firebase credentials.');
  process.exit(1);
}

async function updateTruckStatistics() {
  console.log('🔧 Starting migration to calculate truck statistics from historical deliveries...\n');
  console.log('   This will calculate TotalDeliveries and TotalKilometers for each truck\n');
  console.log('   based on all deliveries with status = "delivered"\n');
  
  try {
    // Get all trucks
    const trucksSnapshot = await db.collection('trucks').get();
    console.log(`📊 Found ${trucksSnapshot.size} trucks to process\n`);
    
    let trucksUpdated = 0;
    let trucksSkipped = 0;
    let totalDeliveriesProcessed = 0;
    
    // Process each truck
    for (const truckDoc of trucksSnapshot.docs) {
      const truckId = truckDoc.id;
      const truckData = truckDoc.data();
      const truckPlate = truckData.TruckPlate || truckData.truckPlate || truckId;
      
      console.log(`\n🚛 Processing truck: ${truckPlate} (${truckId})`);
      
      // Get all delivered deliveries for this truck
      const deliveriesSnapshot = await db.collection('deliveries')
        .where('truckId', '==', truckId)
        .where('deliveryStatus', '==', 'delivered')
        .get();
      
      const deliveryCount = deliveriesSnapshot.size;
      console.log(`   Found ${deliveryCount} delivered deliveries`);
      
      if (deliveryCount === 0) {
        console.log(`   ⏭️  No delivered deliveries found - skipping`);
        trucksSkipped++;
        continue;
      }
      
      // Calculate total kilometers
      let totalKilometers = 0;
      let deliveriesWithDistance = 0;
      
      deliveriesSnapshot.forEach(deliveryDoc => {
        const delivery = deliveryDoc.data();
        const distance = delivery.estimatedDistance || 0;
        
        if (distance > 0) {
          totalKilometers += distance;
          deliveriesWithDistance++;
        }
      });
      
      console.log(`   📏 Total kilometers: ${totalKilometers.toFixed(2)}km from ${deliveriesWithDistance} deliveries`);
      
      // Update truck statistics
      await db.collection('trucks').doc(truckId).update({
        TotalDeliveries: deliveryCount,
        TotalKilometers: parseFloat(totalKilometers.toFixed(2)),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`   ✅ Updated truck statistics:`);
      console.log(`      - TotalDeliveries: ${deliveryCount}`);
      console.log(`      - TotalKilometers: ${totalKilometers.toFixed(2)}km`);
      
      trucksUpdated++;
      totalDeliveriesProcessed += deliveryCount;
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Migration completed successfully!');
    console.log('='.repeat(60));
    console.log(`📊 Summary:`);
    console.log(`   🚛 Total trucks: ${trucksSnapshot.size}`);
    console.log(`   ✅ Trucks updated: ${trucksUpdated}`);
    console.log(`   ⏭️  Trucks skipped (no deliveries): ${trucksSkipped}`);
    console.log(`   📦 Total deliveries processed: ${totalDeliveriesProcessed}`);
    console.log('='.repeat(60) + '\n');
    
    if (trucksUpdated > 0) {
      console.log('🎉 All truck statistics have been calculated and updated!');
      console.log('   You can now view these stats in the Trucks page.\n');
    } else {
      console.log('✅ No trucks needed updating!\n');
    }
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    console.log('👋 Migration script finished. Exiting...\n');
    process.exit(0);
  }
}

// Run the migration
updateTruckStatistics();
