const express = require('express');
const router = express.Router();
const { db, admin, realtimeDb } = require('../config/firebase');
const { authenticateJWT } = require('../middleware/auth');

// ═══════════════════════════════════════════════════════════════════════════════
// REAL-TIME DELIVERY TRACKING ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// Get real-time tracking data for a specific delivery
router.get('/delivery/:deliveryId', async (req, res) => {
  try {
    const { deliveryId } = req.params;
    
    // Get delivery details from Firestore
    const deliveryDoc = await db.collection('deliveries').doc(deliveryId).get();
    
    if (!deliveryDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }
    
    const delivery = deliveryDoc.data();
    const truckId = delivery.truckId;
    
    if (!truckId) {
      return res.status(400).json({
        success: false,
        message: 'No truck assigned to this delivery'
      });
    }
    
    // Get real-time GPS data from Firebase Realtime Database
    const gpsRef = realtimeDb.ref(`Trucks/${truckId}/data`);
    const gpsSnapshot = await gpsRef.once('value');
    const gpsData = gpsSnapshot.val();
    
    // Combine all tracking information
    const trackingData = {
      deliveryId: deliveryId,
      deliveryStatus: delivery.deliveryStatus,
      truckId: truckId,
      truckPlate: delivery.truckPlate,
      driverName: delivery.driverName,
      
      // Route information
      pickupLocation: delivery.pickupLocation,
      deliveryAddress: delivery.deliveryAddress,
      pickupCoordinates: delivery.pickupCoordinates,
      dropoffCoordinates: delivery.dropoffCoordinates,
      
      // Real-time GPS data
      currentLocation: gpsData ? {
        lat: parseFloat(gpsData.lat),
        lng: parseFloat(gpsData.lon),
        accuracy: gpsData.accuracy || 10,
        timestamp: gpsData.timestamp || new Date().toISOString()
      } : null,
      
      // Vehicle status
      isActive: gpsData?.active || false,
      hasGpsFix: gpsData?.gpsFix || false,
      currentSpeed: gpsData ? parseFloat(gpsData.speed) : 0,
      isOverSpeed: gpsData?.overSpeed || false,
      
      // Delivery progress
      estimatedDuration: delivery.estimatedDuration,
      deliveryDistance: delivery.deliveryDistance,
      
      // Timestamps
      deliveryDate: delivery.deliveryDate,
      createdAt: delivery.created_at,
      lastGpsUpdate: gpsData?.lastUpdate || null
    };
    
    res.json({
      success: true,
      data: trackingData
    });
    
  } catch (error) {
    console.error('Error getting delivery tracking data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tracking data'
    });
  }
});

// Get tracking data for all active deliveries
router.get('/active-deliveries', authenticateJWT, async (req, res) => {
  try {
    console.log('🔍 Getting active deliveries for tracking...');
    console.log('🔍 User from JWT:', req.user);
    
    // SECURITY: Only get deliveries for the authenticated client
    if (!req.user || !req.user.id) {
      console.log('❌ No authenticated user found');
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    const clientId = req.user.id;
    console.log('🔒 Filtering deliveries for client ID:', clientId);
    
    // Get ALL deliveries for this client (we'll filter active ones below)
    const deliveriesSnapshot = await db.collection('deliveries')
      .where('clientId', '==', clientId)
      .get();
    
    console.log(`📋 Found ${deliveriesSnapshot.size} total deliveries for client ${clientId}`);
    
    const activeDeliveries = [];
    
    for (const doc of deliveriesSnapshot.docs) {
      const delivery = doc.data();
      const deliveryId = doc.id;
      const truckId = delivery.truckId;
      
      // Filter for active deliveries only (case-insensitive)
      // Only show deliveries that are IN PROGRESS (not pending)
      const status = (delivery.deliveryStatus || delivery.DeliveryStatus || '').toLowerCase().trim();
      const activeStatuses = [
        'in-progress', 
        'in progress', 
        'in_progress',
        'inprogress',
        'started', 
        'picked-up', 
        'picked up',
        'picked_up',
        'pickedup',
        'ongoing',
        'active'
      ];
      const completedStatuses = ['completed', 'delivered'];
      const isActive = activeStatuses.includes(status);
      const isCompleted = completedStatuses.includes(status);
      
      if (!isActive && !isCompleted) {
        console.log(`⏭️ Skipping delivery ${deliveryId} - status: "${status}" (not trackable)`);
        continue;
      }
      
      console.log(`🚛 Processing active delivery ${deliveryId} with truck ${truckId}, status: "${status}"`);
      
      let gpsData = null;
      
      // Only fetch live GPS data for active deliveries (not completed)
      if (isActive && truckId && realtimeDb) {
        try {
          const gpsRef = realtimeDb.ref(`Trucks/${truckId}/data`);
          const gpsSnapshot = await gpsRef.once('value');
          gpsData = gpsSnapshot.val();
          console.log(`📡 GPS data for ${truckId}:`, gpsData ? 'Found' : 'Not found');
        } catch (gpsError) {
          console.log(`⚠️ Could not get GPS data for truck ${truckId}:`, gpsError.message);
        }
      }
      
      activeDeliveries.push({
        deliveryId: deliveryId,
        deliveryStatus: delivery.deliveryStatus,
        truckId: truckId,
        truckPlate: delivery.truckPlate,
        driverName: delivery.driverName,
        clientName: delivery.clientName,
        
        // Route info
        pickupLocation: delivery.pickupLocation,
        deliveryAddress: delivery.deliveryAddress,
        deliveryDate: delivery.deliveryDate,
        pickupCoordinates: delivery.pickupCoordinates || null,
        dropoffCoordinates: delivery.dropoffCoordinates || null,
        
        // Current location (null for completed deliveries)
        currentLocation: gpsData ? {
          lat: parseFloat(gpsData.lat),
          lng: parseFloat(gpsData.lon)
        } : null,
        
        // Status
        isActive: gpsData?.active || false,
        currentSpeed: gpsData ? parseFloat(gpsData.speed) : 0,
        
        // GPS status
        hasGpsFix: gpsData?.gpsFix || false,
        lastGpsUpdate: gpsData?.lastUpdate || null
      });
    }
    
    console.log(`✅ Returning ${activeDeliveries.length} active deliveries`);
    
    res.json({
      success: true,
      data: activeDeliveries,
      count: activeDeliveries.length
    });
    
  } catch (error) {
    console.error('❌ Error getting active deliveries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get active deliveries',
      error: error.message
    });
  }
});

// Get tracking data for a specific truck
router.get('/truck/:truckId', authenticateJWT, async (req, res) => {
  try {
    const { truckId } = req.params;
    
    // Get truck details from Firestore
    const truckDoc = await db.collection('trucks').doc(truckId).get();
    
    if (!truckDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Truck not found'
      });
    }
    
    const truckData = truckDoc.data();
    
    // Get real-time GPS data
    const gpsRef = realtimeDb.ref(`Trucks/${truckId}/data`);
    const gpsSnapshot = await gpsRef.once('value');
    const gpsData = gpsSnapshot.val();
    
    // Get current delivery if any
    let currentDelivery = null;
    if (truckData.currentDeliveryId) {
      const deliveryDoc = await db.collection('deliveries').doc(truckData.currentDeliveryId).get();
      if (deliveryDoc.exists) {
        currentDelivery = {
          id: deliveryDoc.id,
          ...deliveryDoc.data()
        };
      }
    }
    
    const trackingData = {
      truckId: truckId,
      truckPlate: truckData.truckPlate,
      truckType: truckData.truckType,
      truckStatus: truckData.truckStatus,
      
      // Real-time GPS data
      currentLocation: gpsData ? {
        lat: parseFloat(gpsData.lat),
        lng: parseFloat(gpsData.lon),
        accuracy: gpsData.accuracy || 10,
        heading: gpsData.heading || 0,
        timestamp: gpsData.timestamp || new Date().toISOString()
      } : null,
      
      // Vehicle status
      isActive: gpsData?.active || false,
      hasGpsFix: gpsData?.gpsFix || false,
      currentSpeed: gpsData ? parseFloat(gpsData.speed) : 0,
      isOverSpeed: gpsData?.overSpeed || false,
      satellites: gpsData?.satellites || 0,
      
      // Current delivery
      currentDelivery: currentDelivery,
      
      // Status
      allocationStatus: truckData.allocationStatus,
      operationalStatus: truckData.operationalStatus,
      availabilityStatus: truckData.availabilityStatus,
      
      lastGpsUpdate: gpsData?.lastUpdate || null
    };
    
    res.json({
      success: true,
      data: trackingData
    });
    
  } catch (error) {
    console.error('Error getting truck tracking data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get truck tracking data'
    });
  }
});

// Update GPS data for a truck (for GPS module to call)
router.post('/gps/update', async (req, res) => {
  try {
    const { truckId, lat, lon, speed, heading, accuracy, gpsFix, satellites } = req.body;
    
    if (!truckId || !lat || !lon) {
      return res.status(400).json({
        success: false,
        message: 'truckId, lat, and lon are required'
      });
    }
    
    // Update GPS data in Firebase Realtime Database
    const gpsRef = realtimeDb.ref(`Trucks/${truckId}/data`);
    const gpsData = {
      active: true,
      lat: lat.toString(),
      lon: lon.toString(),
      speed: speed ? speed.toString() : "0",
      heading: heading || 0,
      accuracy: accuracy || 10,
      gpsFix: gpsFix || false,
      satellites: satellites || 0,
      overSpeed: speed > 80,
      lastUpdate: new Date().toISOString()
    };
    
    await gpsRef.update(gpsData);
    
    res.json({
      success: true,
      message: 'GPS data updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating GPS data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update GPS data'
    });
  }
});

// Get delivery route with real-time truck position
router.get('/delivery/:deliveryId/route', authenticateJWT, async (req, res) => {
  try {
    const { deliveryId } = req.params;
    
    // Get delivery details
    const deliveryDoc = await db.collection('deliveries').doc(deliveryId).get();
    
    if (!deliveryDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }
    
    const delivery = deliveryDoc.data();
    const truckId = delivery.truckId;
    
    // Get real-time truck position
    let currentPosition = null;
    if (truckId) {
      const gpsRef = realtimeDb.ref(`Trucks/${truckId}/data`);
      const gpsSnapshot = await gpsRef.once('value');
      const gpsData = gpsSnapshot.val();
      
      if (gpsData) {
        currentPosition = {
          lat: parseFloat(gpsData.lat),
          lng: parseFloat(gpsData.lon),
          speed: parseFloat(gpsData.speed),
          heading: gpsData.heading || 0,
          timestamp: gpsData.lastUpdate
        };
      }
    }
    
    // Calculate progress if we have current position
    let progress = null;
    if (currentPosition && delivery.pickupCoordinates && delivery.dropoffCoordinates) {
      // Simple progress calculation based on distance
      const totalDistance = calculateDistance(
        delivery.pickupCoordinates.lat,
        delivery.pickupCoordinates.lng,
        delivery.dropoffCoordinates.lat,
        delivery.dropoffCoordinates.lng
      );
      
      const remainingDistance = calculateDistance(
        currentPosition.lat,
        currentPosition.lng,
        delivery.dropoffCoordinates.lat,
        delivery.dropoffCoordinates.lng
      );
      
      const progressPercentage = Math.max(0, Math.min(100, 
        ((totalDistance - remainingDistance) / totalDistance) * 100
      ));
      
      progress = {
        percentage: Math.round(progressPercentage),
        remainingDistance: Math.round(remainingDistance),
        totalDistance: Math.round(totalDistance)
      };
    }
    
    const routeData = {
      deliveryId: deliveryId,
      deliveryStatus: delivery.deliveryStatus,
      
      // Route points
      pickup: {
        location: delivery.pickupLocation,
        coordinates: delivery.pickupCoordinates
      },
      dropoff: {
        location: delivery.deliveryAddress,
        coordinates: delivery.dropoffCoordinates
      },
      
      // Current truck position
      currentPosition: currentPosition,
      
      // Progress calculation
      progress: progress,
      
      // Truck info
      truckId: truckId,
      truckPlate: delivery.truckPlate,
      driverName: delivery.driverName,
      
      // Timing
      estimatedDuration: delivery.estimatedDuration,
      deliveryDate: delivery.deliveryDate
    };
    
    res.json({
      success: true,
      data: routeData
    });
    
  } catch (error) {
    console.error('Error getting delivery route:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get delivery route'
    });
  }
});

// Helper function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

module.exports = router; 