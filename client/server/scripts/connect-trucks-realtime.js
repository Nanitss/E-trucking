#!/usr/bin/env node

/**
 * Script to connect all trucks to Firebase Realtime Database for GPS tracking
 * Run this script to initialize real-time tracking for all existing trucks
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
try {
  if (!admin.apps.length) {
    // Check if Firebase credentials are available
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
      console.log('⚠️ Firebase credentials not found in environment variables');
      console.log('🔧 Please set these environment variables:');
      console.log('   - FIREBASE_PROJECT_ID');
      console.log('   - FIREBASE_CLIENT_EMAIL');
      console.log('   - FIREBASE_PRIVATE_KEY');
      console.log('   - FIREBASE_DATABASE_URL');
      process.exit(1);
    }
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  process.exit(1);
}

// Initialize Firestore and Realtime Database
const db = admin.firestore();
const realtimeDb = admin.database();

async function connectAllTrucks() {
  try {
    console.log('🚛 Starting truck connection to realtime database...');
    console.log('📋 Fetching all trucks from Firestore...');
    
    const trucksSnapshot = await db.collection('trucks').get();
    console.log(`📋 Found ${trucksSnapshot.size} trucks to connect`);
    
    if (trucksSnapshot.empty) {
      console.log('⚠️ No trucks found in database');
      return;
    }
    
    const results = {
      total: trucksSnapshot.size,
      connected: 0,
      failed: 0,
      errors: []
    };
    
    for (const doc of trucksSnapshot.docs) {
      const truckId = doc.id;
      const truckData = doc.data();
      
      try {
        console.log(`\n🔗 Connecting truck: ${truckId} (${truckData.truckPlate || truckData.TruckPlate || 'Unknown Plate'})`);
        
        // Create initial GPS data structure
        const initialGpsData = {
          active: false,
          gpsFix: false,
          lat: "0.0",
          lon: "0.0",
          speed: "0.0",
          heading: 0,
          accuracy: 10,
          satellites: 0,
          overSpeed: false,
          lastUpdate: new Date().toISOString(),
          truckInfo: {
            id: truckId,
            plate: truckData.truckPlate || truckData.TruckPlate || 'Unknown',
            type: truckData.truckType || truckData.TruckType || 'Unknown',
            capacity: truckData.truckCapacity || truckData.TruckCapacity || 0
          },
          status: {
            connected: false,
            lastHeartbeat: null,
            gpsModuleId: null,
            trackingActive: false
          }
        };
        
        // Set initial data in realtime database
        const truckRef = realtimeDb.ref(`Trucks/${truckId}/data`);
        await truckRef.set(initialGpsData);
        
        // Update truck document in Firestore to mark as connected
        await db.collection('trucks').doc(truckId).update({
          realtimeConnected: true,
          lastRealtimeUpdate: admin.firestore.FieldValue.serverTimestamp(),
          gpsEnabled: true,
          trackingActive: false
        });
        
        results.connected++;
        console.log(`✅ Truck ${truckId} connected successfully`);
        
      } catch (error) {
        results.failed++;
        results.errors.push({ truckId, error: error.message });
        console.log(`❌ Failed to connect truck ${truckId}: ${error.message}`);
      }
    }
    
    console.log('\n📊 Connection Summary:');
    console.log(`   Total trucks: ${results.total}`);
    console.log(`   ✅ Connected: ${results.connected}`);
    console.log(`   ❌ Failed: ${results.failed}`);
    
    if (results.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      results.errors.forEach(({ truckId, error }) => {
        console.log(`   - Truck ${truckId}: ${error}`);
      });
    }
    
    if (results.connected > 0) {
      console.log('\n🎉 Successfully connected trucks to realtime database!');
      console.log('📍 GPS tracking is now available for these trucks');
      console.log('🔗 Real-time data structure: /Trucks/{truckId}/data');
    }
    
  } catch (error) {
    console.error('❌ Error connecting trucks:', error);
    process.exit(1);
  }
}

// Run the connection script
if (require.main === module) {
  connectAllTrucks()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { connectAllTrucks };
