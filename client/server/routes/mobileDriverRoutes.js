const express = require('express');
const router = express.Router();
const MobileDriverService = require('../services/MobileDriverService');
const { authenticateJWT } = require('../middleware/auth');
const { db, admin } = require('../config/firebase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Test route to verify the module loads
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Mobile driver routes are working',
    timestamp: new Date().toISOString()
  });
});

// Driver login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }
    
    // Find driver by username
    const driversSnapshot = await db.collection('drivers')
      .where('driverUsername', '==', username)
      .limit(1)
      .get();
    
    if (driversSnapshot.empty) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }
    
    const driverDoc = driversSnapshot.docs[0];
    const driverData = driverDoc.data();
    
    // Check password
    const isValidPassword = await bcrypt.compare(password, driverData.driverPassword);
    
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }
    
    // Check if driver is active
    if (driverData.driverStatus !== 'active') {
      return res.status(403).json({ 
        success: false, 
        message: 'Driver account is not active' 
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: driverDoc.id, 
        username: driverData.driverUsername,
        role: 'driver',
        type: 'mobile_driver'
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      message: 'Login successful',
      token,
      driver: {
        id: driverDoc.id,
        name: driverData.driverName,
        username: driverData.driverUsername,
        phone: driverData.driverNumber,
        status: driverData.driverStatus
      }
    });
    
  } catch (error) {
    console.error('Mobile driver login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login' 
    });
  }
});

// Get driver's assigned deliveries
router.get('/deliveries', authenticateJWT, async (req, res) => {
  try {
    const driverId = req.user.id;
    const deliveries = await MobileDriverService.getDriverDeliveries(driverId);
    
    res.json({
      success: true,
      deliveries: deliveries
    });
    
  } catch (error) {
    console.error('Error getting driver deliveries:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching deliveries' 
    });
  }
});

// Update delivery status
router.put('/deliveries/:deliveryId/status', authenticateJWT, async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { status, location } = req.body;
    const driverId = req.user.id;
    
    if (!status) {
      return res.status(400).json({ 
        success: false, 
        message: 'Status is required' 
      });
    }
    
    const validStatuses = ['pending', 'in-progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status' 
      });
    }
    
    const result = await MobileDriverService.updateDeliveryStatus(
      deliveryId, 
      driverId, 
      status, 
      location
    );
    
    res.json(result);
    
  } catch (error) {
    console.error('Error updating delivery status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating delivery status' 
    });
  }
});

// Update driver location
router.put('/location', authenticateJWT, async (req, res) => {
  try {
    const { location } = req.body;
    const driverId = req.user.id;
    
    if (!location || !location.lat || !location.lng) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid location coordinates are required' 
      });
    }
    
    const result = await MobileDriverService.updateDriverLocation(driverId, location);
    
    res.json(result);
    
  } catch (error) {
    console.error('Error updating driver location:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating location' 
    });
  }
});

// Get driver profile
router.get('/profile', authenticateJWT, async (req, res) => {
  try {
    const driverId = req.user.id;
    
    const driverDoc = await db.collection('drivers').doc(driverId).get();
    
    if (!driverDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        message: 'Driver not found' 
      });
    }
    
    const driverData = driverDoc.data();
    
    // Remove sensitive data
    delete driverData.driverPassword;
    
    res.json({
      success: true,
      driver: {
        id: driverDoc.id,
        ...driverData
      }
    });
    
  } catch (error) {
    console.error('Error getting driver profile:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching profile' 
    });
  }
});

// Accept delivery
router.put('/deliveries/:deliveryId/accept', authenticateJWT, async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { location } = req.body;
    const driverId = req.user.id;
    
    const result = await MobileDriverService.updateDeliveryStatus(
      deliveryId, 
      driverId, 
      'accepted', 
      location
    );
    
    res.json(result);
    
  } catch (error) {
    console.error('Error accepting delivery:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error accepting delivery' 
    });
  }
});

// Start delivery (enhanced)
router.put('/deliveries/:deliveryId/start', authenticateJWT, async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { location } = req.body;
    const driverId = req.user.id;
    
    const result = await MobileDriverService.updateDeliveryStatus(
      deliveryId, 
      driverId, 
      'started', 
      location
    );
    
    res.json(result);
    
  } catch (error) {
    console.error('Error starting delivery:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error starting delivery' 
    });
  }
});

// Pick up cargo
router.put('/deliveries/:deliveryId/pickup', authenticateJWT, async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { location, notes } = req.body;
    const driverId = req.user.id;
    
    const result = await MobileDriverService.updateDeliveryStatus(
      deliveryId, 
      driverId, 
      'picked-up', 
      location
    );
    
    // Add pickup notes if provided
    if (notes) {
      await db.collection('deliveries').doc(deliveryId).update({
        pickupNotes: notes,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    res.json(result);
    
  } catch (error) {
    console.error('Error marking pickup:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error marking cargo as picked up' 
    });
  }
});

// Deliver cargo (mark as delivered, awaiting client confirmation)
router.put('/deliveries/:deliveryId/deliver', authenticateJWT, async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { location, notes } = req.body;
    const driverId = req.user.id;
    
    const result = await MobileDriverService.updateDeliveryStatus(
      deliveryId, 
      driverId, 
      'delivered', 
      location
    );
    
    // Add delivery notes if provided
    if (notes) {
      await db.collection('deliveries').doc(deliveryId).update({
        deliveryNotes: notes,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    res.json(result);
    
  } catch (error) {
    console.error('Error marking delivery:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error marking delivery as completed' 
    });
  }
});

module.exports = router; 