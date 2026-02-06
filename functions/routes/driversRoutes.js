// server/routes/driversRoutes.js - Updated for Firebase

const express = require('express');
const router = express.Router();
const DriverService = require('../services/DriverService');
const AuditService = require('../services/AuditService');
const { authenticateJWT } = require('../middleware/auth');

// ─── GET /api/drivers ───────────────────────────────────────────────────────────
router.get('/', authenticateJWT, async (req, res) => {
  try {
    console.log('GET /api/drivers - Fetching all drivers');
    const drivers = await DriverService.getAllDrivers();
    console.log(`Found ${drivers.length} drivers`);
    res.json(drivers);
  } catch (err) {
    console.error('Error fetching drivers:', err);
    res.status(500).json({
      message: 'Server error while fetching drivers',
      error: err.message
    });
  }
});

// ─── GET /api/drivers/profile ──────────────────────────────────────────────
router.get('/profile', authenticateJWT, async (req, res) => {
  try {
    console.log(`GET /api/drivers/profile - Fetching profile for user ${req.user.id}`);
    const driver = await DriverService.getDriverByUserId(req.user.id);

    if (!driver) {
      return res.status(404).json({ message: 'Driver profile not found' });
    }

    res.json(driver);
  } catch (err) {
    console.error('Error fetching driver profile:', err);
    res.status(500).json({
      message: 'Server error while fetching driver profile',
      error: err.message
    });
  }
});

// ─── GET /api/drivers/:id ────────────────────────────────────────────────────────
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    console.log(`GET /api/drivers/${req.params.id}`);
    const driver = await DriverService.getDriverById(req.params.id);
    res.json(driver);
  } catch (err) {
    console.error('Error fetching driver:', err);
    if (err.message === 'Driver not found') {
      return res.status(404).json({ message: 'Driver not found' });
    }
    res.status(500).json({
      message: 'Server error while fetching driver',
      error: err.message
    });
  }
});

// ─── POST /api/drivers ───────────────────────────────────────────────────────────
router.post('/', authenticateJWT, async (req, res) => {
  try {
    console.log('POST /api/drivers - Creating new driver', req.body);
    const driver = await DriverService.createDriver(req.body);

    // Log the creation action to audit trail
    await AuditService.logCreate(
      req.user.id,
      req.user.username,
      'driver',
      driver.id,
      {
        name: driver.DriverName,
        requestBody: req.body
      }
    );

    console.log(`✅ Driver creation logged to audit trail for driver ${driver.id}`);

    res.status(201).json({
      id: driver.id,
      message: 'Driver created successfully'
    });
  } catch (err) {
    console.error('Error creating driver:', err);
    if (err.message === 'Username already exists') {
      return res.status(400).json({ message: 'Username already exists' });
    }
    res.status(500).json({
      message: 'Server error while creating driver',
      error: err.message
    });
  }
});

// ─── PUT /api/drivers/:id ────────────────────────────────────────────────────────
router.put('/:id', authenticateJWT, async (req, res) => {
  try {
    console.log(`PUT /api/drivers/${req.params.id} - Updating driver`, req.body);
    const driver = await DriverService.updateDriver(req.params.id, req.body);

    // Log the update action to audit trail
    await AuditService.logUpdate(
      req.user.id,
      req.user.username,
      'driver',
      req.params.id,
      {
        name: driver.DriverName,
        requestBody: req.body
      }
    );

    console.log(`✅ Driver update logged to audit trail for driver ${req.params.id}`);

    console.log(`Driver ${req.params.id} updated successfully`);
    res.json({
      message: 'Driver updated successfully',
      driver
    });
  } catch (err) {
    console.error('Error updating driver:', err);
    if (err.message === 'Driver not found') {
      return res.status(404).json({ message: 'Driver not found' });
    }
    if (err.message === 'Username already exists') {
      return res.status(400).json({ message: 'Username already exists' });
    }
    res.status(500).json({
      message: 'Server error while updating driver',
      error: err.message
    });
  }
});

// ─── POST /api/drivers/fix-stuck-statuses - Fix drivers stuck in On-Delivery ──────────
router.post('/fix-stuck-statuses', authenticateJWT, async (req, res) => {
  try {
    console.log('🔧 POST /api/drivers/fix-stuck-statuses - Fixing stuck driver statuses');

    const { db } = require('../config/firebase');

    // Get all deliveries that are delivered, completed, or cancelled
    const finalStatuses = ['delivered', 'completed', 'cancelled'];
    const deliveriesSnapshot = await db.collection('deliveries').get();

    const finishedDeliveries = [];
    deliveriesSnapshot.forEach(doc => {
      const delivery = doc.data();
      if (delivery.deliveryStatus && finalStatuses.includes(delivery.deliveryStatus.toLowerCase())) {
        finishedDeliveries.push({
          id: doc.id,
          ...delivery
        });
      }
    });

    console.log(`Found ${finishedDeliveries.length} finished deliveries`);

    // Track unique drivers to restore
    const driversToRestore = new Set();
    finishedDeliveries.forEach(delivery => {
      if (delivery.driverId) {
        driversToRestore.add(delivery.driverId);
      }
    });

    console.log(`Drivers to check: ${driversToRestore.size}`);

    // Restore driver statuses
    let driversFixed = 0;
    const fixedDrivers = [];

    for (const driverId of driversToRestore) {
      const driverRef = db.collection('drivers').doc(driverId);
      const driverDoc = await driverRef.get();

      if (driverDoc.exists) {
        const driver = driverDoc.data();
        const currentStatus = driver.DriverStatus || driver.driverStatus;

        // Only update if not already active
        if (currentStatus && currentStatus.toLowerCase() !== 'active') {
          await driverRef.update({
            DriverStatus: 'active',
            driverStatus: 'active',
            updated_at: new Date()
          });

          const driverName = driver.DriverName || driver.driverName || driverId;
          console.log(`✅ Restored driver: ${driverName} (${currentStatus} → active)`);
          fixedDrivers.push({ id: driverId, name: driverName, oldStatus: currentStatus });
          driversFixed++;
        }
      }
    }

    res.json({
      message: `Successfully restored ${driversFixed} driver(s) to active status`,
      totalChecked: driversToRestore.size,
      fixed: driversFixed,
      drivers: fixedDrivers
    });

  } catch (error) {
    console.error('Error fixing stuck driver statuses:', error);
    res.status(500).json({
      message: 'Error fixing stuck driver statuses',
      error: error.message
    });
  }
});

// ─── DELETE /api/drivers/:id ────────────────────────────────────────────────────────
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    console.log(`DELETE /api/drivers/${req.params.id}`);

    // Get driver details before deletion for audit log
    const driver = await DriverService.getDriverById(req.params.id);

    await DriverService.deleteDriver(req.params.id);

    // Log the delete action to audit trail
    await AuditService.logDelete(
      req.user.id,
      req.user.username,
      'driver',
      req.params.id,
      {
        name: driver.DriverName
      }
    );

    console.log(`✅ Driver deletion logged to audit trail for driver ${req.params.id}`);

    res.json({ message: 'Driver deleted successfully' });
  } catch (err) {
    console.error('Error deleting driver:', err);
    if (err.message === 'Driver not found') {
      return res.status(404).json({ message: 'Driver not found' });
    }
    res.status(500).json({
      message: 'Server error while deleting driver',
      error: err.message
    });
  }
});

// ─── GET /api/drivers/active ────────────────────────────────────────────────────
router.get('/active', authenticateJWT, async (req, res) => {
  try {
    console.log('GET /api/drivers/active - Fetching active drivers');
    const drivers = await DriverService.getActiveDrivers();
    console.log(`Found ${drivers.length} active drivers`);
    res.json(drivers);
  } catch (err) {
    console.error('Error fetching active drivers:', err);
    res.status(500).json({
      message: 'Server error while fetching active drivers',
      error: err.message
    });
  }
});

// ─── POST /api/drivers/location ────────────────────────────────────────────────────
router.post('/location', authenticateJWT, async (req, res) => {
  try {
    const { lat, lng, accuracy, speed, heading, altitude, timestamp, isFinal, deviceInfo } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    console.log(`📍 GPS update from driver ${req.user.id}:`, {
      lat: parseFloat(lat).toFixed(6),
      lng: parseFloat(lng).toFixed(6),
      speed: speed ? Math.round(speed * 3.6) : 0,
      accuracy: accuracy ? Math.round(accuracy) : 'N/A',
      isFinal: isFinal || false
    });

    const locationData = {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      accuracy: accuracy ? parseFloat(accuracy) : 10,
      speed: speed ? parseFloat(speed) : 0,
      heading: heading || 0,
      altitude: altitude || null,
      timestamp: timestamp || new Date().toISOString(),
      isFinal: isFinal || false,
      deviceInfo: deviceInfo || null
    };

    // Update driver location in Firestore
    await DriverService.updateDriverLocation(req.user.id, locationData);

    // Check if driver has an assigned truck and update truck GPS data
    const driver = await DriverService.getDriverById(req.user.id);

    if (driver && driver.assignedTruckId) {
      try {
        // Import Firebase admin if not already imported
        const admin = require('firebase-admin');

        // Update truck GPS data in Firebase Realtime Database
        const gpsRef = admin.database().ref(`Trucks/${driver.assignedTruckId}/data`);
        await gpsRef.update({
          active: !isFinal,
          lat: lat.toString(),
          lon: lng.toString(),
          speed: speed ? speed.toString() : "0",
          heading: heading || 0,
          accuracy: accuracy || 10,
          gpsFix: true,
          satellites: Math.floor(Math.random() * 5) + 8, // Simulate 8-12 satellites
          overSpeed: (speed * 3.6) > 80, // Convert m/s to km/h
          lastUpdate: locationData.timestamp,
          driverId: req.user.id
        });

        console.log(`🚛 Updated truck ${driver.assignedTruckId} GPS data`);
      } catch (truckError) {
        console.error('❌ Error updating truck GPS data:', truckError);
        // Don't fail the request if truck update fails
      }
    }

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: {
        lat: locationData.lat,
        lng: locationData.lng,
        timestamp: locationData.timestamp,
        truckUpdated: !!(driver && driver.assignedTruckId)
      }
    });
  } catch (error) {
    console.error('❌ Update location error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating location',
      error: error.message
    });
  }
});

module.exports = router;
