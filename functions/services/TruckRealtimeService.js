const admin = require('firebase-admin');
const db = admin.firestore();

class TruckRealtimeService {
  
  // Initialize truck in realtime database for GPS tracking
  static async initializeTruckTracking(truckId, truckData) {
    try {
      console.log(`🚛 Initializing realtime tracking for truck: ${truckId}`);
      
      // Get realtime database reference
      const realtimeDb = admin.database();
      if (!realtimeDb) {
        throw new Error('Firebase Realtime Database not available');
      }
      
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
      
      console.log(`✅ Truck ${truckId} initialized in realtime database`);
      
      // Update truck document in Firestore to mark as connected
      await db.collection('trucks').doc(truckId).update({
        realtimeConnected: true,
        lastRealtimeUpdate: admin.firestore.FieldValue.serverTimestamp(),
        gpsEnabled: true,
        trackingActive: false
      });
      
      return {
        success: true,
        message: `Truck ${truckId} connected to realtime database`,
        gpsData: initialGpsData
      };
      
    } catch (error) {
      console.error(`❌ Error initializing truck tracking for ${truckId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Update truck GPS data in realtime database
  static async updateTruckGPS(truckId, gpsData) {
    try {
      console.log(`📍 Updating GPS data for truck: ${truckId}`);
      
      const realtimeDb = admin.database();
      if (!realtimeDb) {
        throw new Error('Firebase Realtime Database not available');
      }
      
      // Prepare GPS data with timestamp
      const updatedGpsData = {
        ...gpsData,
        lastUpdate: new Date().toISOString(),
        active: true,
        gpsFix: gpsData.gpsFix || false,
        overSpeed: parseFloat(gpsData.speed || 0) > 80 // 80 km/h speed limit
      };
      
      // Update in realtime database
      const truckRef = realtimeDb.ref(`Trucks/${truckId}/data`);
      await truckRef.update(updatedGpsData);
      
      // Update truck document in Firestore
      await db.collection('trucks').doc(truckId).update({
        lastGpsUpdate: admin.firestore.FieldValue.serverTimestamp(),
        currentLocation: {
          lat: parseFloat(gpsData.lat),
          lng: parseFloat(gpsData.lon),
          accuracy: gpsData.accuracy || 10,
          speed: parseFloat(gpsData.speed || 0),
          heading: gpsData.heading || 0,
          timestamp: new Date().toISOString()
        },
        gpsStatus: {
          active: true,
          hasFix: gpsData.gpsFix || false,
          satellites: gpsData.satellites || 0,
          lastUpdate: new Date().toISOString()
        }
      });
      
      console.log(`✅ GPS data updated for truck ${truckId}`);
      return { success: true };
      
    } catch (error) {
      console.error(`❌ Error updating GPS data for truck ${truckId}:`, error);
      return { success: false, error: error.message };
    }
  }
  
  // Get real-time GPS data for a truck
  static async getTruckGPS(truckId) {
    try {
      const realtimeDb = admin.database();
      if (!realtimeDb) {
        throw new Error('Firebase Realtime Database not available');
      }
      
      const truckRef = realtimeDb.ref(`Trucks/${truckId}/data`);
      const snapshot = await truckRef.once('value');
      const gpsData = snapshot.val();
      
      if (!gpsData) {
        return {
          success: false,
          error: 'No GPS data found for truck'
        };
      }
      
      return {
        success: true,
        data: gpsData
      };
      
    } catch (error) {
      console.error(`❌ Error getting GPS data for truck ${truckId}:`, error);
      return { success: false, error: error.message };
    }
  }
  
  // Connect all existing trucks to realtime database
  static async connectAllTrucks() {
    try {
      console.log('🚛 Connecting all trucks to realtime database...');
      
      const trucksSnapshot = await db.collection('trucks').get();
      console.log(`📋 Found ${trucksSnapshot.size} trucks to connect`);
      
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
          const result = await this.initializeTruckTracking(truckId, truckData);
          if (result.success) {
            results.connected++;
            console.log(`✅ Truck ${truckId} connected successfully`);
          } else {
            results.failed++;
            results.errors.push({ truckId, error: result.error });
            console.log(`❌ Failed to connect truck ${truckId}: ${result.error}`);
          }
        } catch (error) {
          results.failed++;
          results.errors.push({ truckId, error: error.message });
          console.log(`❌ Error connecting truck ${truckId}: ${error.message}`);
        }
      }
      
      console.log(`📊 Truck connection summary: ${results.connected} connected, ${results.failed} failed`);
      return results;
      
    } catch (error) {
      console.error('❌ Error connecting all trucks:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Disconnect truck from realtime database
  static async disconnectTruck(truckId) {
    try {
      const realtimeDb = admin.database();
      if (!realtimeDb) {
        throw new Error('Firebase Realtime Database not available');
      }
      
      // Set truck as inactive in realtime database
      const truckRef = realtimeDb.ref(`Trucks/${truckId}/data`);
      await truckRef.update({
        active: false,
        lastUpdate: new Date().toISOString(),
        status: {
          connected: false,
          lastHeartbeat: null,
          trackingActive: false
        }
      });
      
      // Update Firestore document
      await db.collection('trucks').doc(truckId).update({
        realtimeConnected: false,
        lastRealtimeUpdate: admin.firestore.FieldValue.serverTimestamp(),
        gpsEnabled: false,
        trackingActive: false
      });
      
      console.log(`✅ Truck ${truckId} disconnected from realtime database`);
      return { success: true };
      
    } catch (error) {
      console.error(`❌ Error disconnecting truck ${truckId}:`, error);
      return { success: false, error: error.message };
    }
  }
  
  // Get all active trucks with GPS data
  static async getActiveTrucks() {
    try {
      const realtimeDb = admin.database();
      if (!realtimeDb) {
        throw new Error('Firebase Realtime Database not available');
      }
      
      const trucksRef = realtimeDb.ref('Trucks');
      const snapshot = await trucksRef.once('value');
      const trucksData = snapshot.val();
      
      if (!trucksData) {
        return { success: true, data: [] };
      }
      
      const activeTrucks = [];
      for (const [truckId, truckInfo] of Object.entries(trucksData)) {
        if (truckInfo.data && truckInfo.data.active) {
          activeTrucks.push({
            truckId,
            ...truckInfo.data
          });
        }
      }
      
      return {
        success: true,
        data: activeTrucks
      };
      
    } catch (error) {
      console.error('❌ Error getting active trucks:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = TruckRealtimeService;
