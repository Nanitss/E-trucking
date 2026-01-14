// Mobile Driver API Routes - Handles all mobile app endpoints
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const MobileDriverService = require('../services/MobileDriverService');
const NotificationService = require('../services/NotificationService');
const DriverService = require('../services/DriverService');
const { admin } = require('../config/firebase');

// Configure multer for file uploads (delivery proof photos)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/delivery-proof/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'proof-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// JWT Authentication middleware for mobile
const authenticateMobileJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, driver) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.driver = driver;
    next();
  });
};

/**
 * AUTHENTICATION ENDPOINTS
 */

// POST /api/mobile/auth/login - Driver login
router.post('/auth/login', async (req, res) => {
  try {
    const { username, password, deviceToken, deviceInfo } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }

    // Find driver by username
    const driver = await DriverService.getByUsername(username);
    if (!driver) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, driver.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if driver is active
    if (driver.DriverStatus !== 'active') {
      return res.status(403).json({ message: 'Driver account is not active' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: driver.DriverID,
        username: driver.DriverUserName,
        role: 'driver'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Create driver session
    if (deviceToken) {
      await MobileDriverService.createDriverSession(
        driver.DriverID,
        deviceToken,
        deviceInfo || {}
      );
    }

    res.json({
      success: true,
      token: token,
      driver: {
        id: driver.DriverID,
        name: driver.DriverName,
        username: driver.DriverUserName,
        phone: driver.DriverNumber,
        status: driver.DriverStatus
      },
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Mobile login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// POST /api/mobile/auth/logout - Driver logout
router.post('/auth/logout', authenticateMobileJWT, async (req, res) => {
  try {
    // Update driver status to offline
    await MobileDriverService.updateDriverStatus(req.driver.id, 'offline');
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Mobile logout error:', error);
    res.status(500).json({ message: 'Server error during logout' });
  }
});

// POST /api/mobile/auth/refresh - Refresh JWT token
router.post('/auth/refresh', authenticateMobileJWT, async (req, res) => {
  try {
    // Generate new token
    const newToken = jwt.sign(
      { 
        id: req.driver.id,
        username: req.driver.username,
        role: 'driver'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token: newToken,
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ message: 'Server error during token refresh' });
  }
});

// POST /api/mobile/auth/register-device - Register/update FCM device token
router.post('/auth/register-device', authenticateMobileJWT, async (req, res) => {
  try {
    const { deviceToken, deviceInfo } = req.body;

    if (!deviceToken) {
      return res.status(400).json({ message: 'Device token required' });
    }

    await NotificationService.updateDeviceToken(req.driver.id, deviceToken);

    res.json({
      success: true,
      message: 'Device registered successfully'
    });
  } catch (error) {
    console.error('Device registration error:', error);
    res.status(500).json({ message: 'Server error during device registration' });
  }
});

/**
 * DRIVER PROFILE & STATUS ENDPOINTS
 */

// GET /api/mobile/driver/profile - Get driver profile
router.get('/driver/profile', authenticateMobileJWT, async (req, res) => {
  try {
    const driver = await DriverService.getById(req.driver.id);
    
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    res.json({
      success: true,
      driver: {
        id: driver.DriverID,
        name: driver.DriverName,
        username: driver.DriverUserName,
        phone: driver.DriverNumber,
        address: driver.DriverAddress,
        employmentDate: driver.DriverEmploymentDate,
        status: driver.DriverStatus
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error getting profile' });
  }
});

// PUT /api/mobile/driver/profile - Update driver profile
router.put('/driver/profile', authenticateMobileJWT, async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    
    const updateData = {};
    if (name) updateData.DriverName = name;
    if (phone) updateData.DriverNumber = phone;
    if (address) updateData.DriverAddress = address;

    await DriverService.update(req.driver.id, updateData);

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

// POST /api/mobile/driver/location - Update current location
router.post('/driver/location', authenticateMobileJWT, async (req, res) => {
  try {
    const { lat, lng, accuracy, speed } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude and longitude required' });
    }

    await MobileDriverService.updateDriverLocation(req.driver.id, {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      accuracy: accuracy ? parseFloat(accuracy) : 10,
      speed: speed ? parseFloat(speed) : 0
    });

    res.json({
      success: true,
      message: 'Location updated successfully'
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ message: 'Server error updating location' });
  }
});

// PUT /api/mobile/driver/status - Update driver status
router.put('/driver/status', authenticateMobileJWT, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['available', 'busy', 'offline'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    await MobileDriverService.updateDriverStatus(req.driver.id, status);

    res.json({
      success: true,
      message: 'Status updated successfully'
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Server error updating status' });
  }
});

/**
 * DELIVERY MANAGEMENT ENDPOINTS
 */

// GET /api/mobile/deliveries/assigned - Get assigned deliveries
router.get('/deliveries/assigned', authenticateMobileJWT, async (req, res) => {
  try {
    const deliveries = await MobileDriverService.getAssignedDeliveries(req.driver.id);

    res.json({
      success: true,
      deliveries: deliveries,
      count: deliveries.length
    });
  } catch (error) {
    console.error('Get assigned deliveries error:', error);
    res.status(500).json({ message: 'Server error getting assigned deliveries' });
  }
});

// POST /api/mobile/deliveries/:id/accept - Accept delivery assignment
router.post('/deliveries/:id/accept', authenticateMobileJWT, async (req, res) => {
  try {
    const assignmentId = req.params.id;
    
    await MobileDriverService.acceptDelivery(assignmentId, req.driver.id);

    res.json({
      success: true,
      message: 'Delivery accepted successfully'
    });
  } catch (error) {
    console.error('Accept delivery error:', error);
    res.status(500).json({ message: error.message || 'Server error accepting delivery' });
  }
});

// POST /api/mobile/deliveries/:id/reject - Reject delivery assignment
router.post('/deliveries/:id/reject', authenticateMobileJWT, async (req, res) => {
  try {
    const assignmentId = req.params.id;
    const { reason } = req.body;
    
    // For now, we'll just log the rejection and reassign
    console.log(`Driver ${req.driver.id} rejected assignment ${assignmentId}: ${reason}`);
    
    // TODO: Implement rejection logic and reassignment
    
    res.json({
      success: true,
      message: 'Delivery rejected - will be reassigned'
    });
  } catch (error) {
    console.error('Reject delivery error:', error);
    res.status(500).json({ message: 'Server error rejecting delivery' });
  }
});

// POST /api/mobile/deliveries/:id/start - Start delivery
router.post('/deliveries/:id/start', authenticateMobileJWT, async (req, res) => {
  try {
    const assignmentId = req.params.id;
    
    await MobileDriverService.startDelivery(assignmentId, req.driver.id);

    res.json({
      success: true,
      message: 'Delivery started successfully'
    });
  } catch (error) {
    console.error('Start delivery error:', error);
    res.status(500).json({ message: error.message || 'Server error starting delivery' });
  }
});

// POST /api/mobile/deliveries/:id/complete - Complete delivery
router.post('/deliveries/:id/complete', 
  authenticateMobileJWT, 
  upload.single('photo'), 
  async (req, res) => {
  try {
    const assignmentId = req.params.id;
    const { signature, notes } = req.body;
    
    const deliveryProof = {
      photoUrl: req.file ? `/uploads/delivery-proof/${req.file.filename}` : null,
      signature: signature || null,
      notes: notes || ''
    };

    await MobileDriverService.completeDelivery(assignmentId, req.driver.id, deliveryProof);

    res.json({
      success: true,
      message: 'Delivery completed successfully'
    });
  } catch (error) {
    console.error('Complete delivery error:', error);
    res.status(500).json({ message: error.message || 'Server error completing delivery' });
  }
});

// POST /api/mobile/deliveries/:id/location - Update delivery progress location
router.post('/deliveries/:id/location', authenticateMobileJWT, async (req, res) => {
  try {
    const deliveryId = req.params.id;
    const { lat, lng, speed } = req.body;

    // Update driver location
    await MobileDriverService.updateDriverLocation(req.driver.id, {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      speed: speed ? parseFloat(speed) : 0
    });

    // TODO: Track delivery route and update ETA

    res.json({
      success: true,
      message: 'Delivery location updated successfully'
    });
  } catch (error) {
    console.error('Update delivery location error:', error);
    res.status(500).json({ message: 'Server error updating delivery location' });
  }
});

/**
 * NOTIFICATION ENDPOINTS
 */

// GET /api/mobile/notifications - Get driver notifications
router.get('/notifications', authenticateMobileJWT, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const notifications = await MobileDriverService.getDriverNotifications(req.driver.id, limit);

    res.json({
      success: true,
      notifications: notifications,
      count: notifications.length
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error getting notifications' });
  }
});

// PUT /api/mobile/notifications/:id/read - Mark notification as read
router.put('/notifications/:id/read', authenticateMobileJWT, async (req, res) => {
  try {
    const notificationId = req.params.id;
    
    await MobileDriverService.markNotificationAsRead(notificationId, req.driver.id);

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ message: error.message || 'Server error marking notification as read' });
  }
});

// DELETE /api/mobile/notifications/:id - Delete notification
router.delete('/notifications/:id', authenticateMobileJWT, async (req, res) => {
  try {
    const notificationId = req.params.id;
    
    // TODO: Implement notification deletion
    console.log(`Delete notification ${notificationId} for driver ${req.driver.id}`);

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'Server error deleting notification' });
  }
});

/**
 * UTILITY ENDPOINTS
 */

// GET /api/mobile/stats - Get driver statistics
router.get('/stats', authenticateMobileJWT, async (req, res) => {
  try {
    // TODO: Implement driver statistics
    const stats = {
      totalDeliveries: 0,
      completedDeliveries: 0,
      pendingDeliveries: 0,
      averageRating: 0,
      totalDistance: 0
    };

    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error getting statistics' });
  }
});

// POST /api/mobile/test-notification - Test notification (development only)
router.post('/test-notification', authenticateMobileJWT, async (req, res) => {
  try {
    const { title, body, type } = req.body;
    
    await NotificationService.sendToDriver(req.driver.id, {
      title: title || 'Test Notification',
      body: body || 'This is a test notification',
      type: type || 'test',
      data: { test: 'true' }
    });

    res.json({
      success: true,
      message: 'Test notification sent successfully'
    });
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({ message: 'Server error sending test notification' });
  }
});

/**
 * ENHANCED MOBILE ENDPOINTS FOR ROUTE & DELIVERY DATA
 */

// GET /api/mobile/deliveries/:id/route - Get detailed route information
router.get('/deliveries/:id/route', authenticateMobileJWT, async (req, res) => {
  try {
    const deliveryId = req.params.id;
    
    // Get delivery with route details
    const deliveryDoc = await admin.firestore()
      .collection('deliveries')
      .doc(deliveryId)
      .get();
    
    if (!deliveryDoc.exists) {
      return res.status(404).json({ message: 'Delivery not found' });
    }
    
    const delivery = deliveryDoc.data();
    
    // Verify driver assignment
    if (delivery.assignedDriverId !== req.driver.id) {
      return res.status(403).json({ message: 'Access denied: Delivery not assigned to you' });
    }
    
    res.json({
      success: true,
      deliveryId: deliveryId,
      routeInfo: {
        pickupLocation: delivery.PickupLocation,
        dropoffLocation: delivery.DropoffLocation,
        pickupCoordinates: delivery.PickupCoordinates,
        dropoffCoordinates: delivery.DropoffCoordinates,
        distance: delivery.DeliveryDistance,
        estimatedDuration: delivery.EstimatedDuration,
        routePolyline: delivery.RouteInfo?.routePolyline || null,
        waypoints: delivery.RouteInfo?.waypoints || [],
        trafficInfo: delivery.RouteInfo?.trafficInfo || null
      },
      clientInfo: {
        name: delivery.clientName || 'Client',
        phone: delivery.clientPhone || null,
        notes: delivery.deliveryNotes || null
      },
      cargoInfo: {
        weight: delivery.CargoWeight,
        type: delivery.cargoType || 'General Cargo',
        specialInstructions: delivery.specialInstructions || null
      }
    });
  } catch (error) {
    console.error('Get route error:', error);
    res.status(500).json({ message: 'Server error getting route information' });
  }
});

// GET /api/mobile/driver/delivery-history - Get driver's delivery history
router.get('/driver/delivery-history', authenticateMobileJWT, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const status = req.query.status; // completed, cancelled, etc.
    
    let query = admin.firestore()
      .collection('deliveries')
      .where('assignedDriverId', '==', req.driver.id)
      .orderBy('DeliveryDate', 'desc')
      .limit(limit);
    
    if (status) {
      query = query.where('DeliveryStatus', '==', status);
    }
    
    const snapshot = await query.get();
    const deliveries = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      deliveries.push({
        id: doc.id,
        deliveryId: data.DeliveryID,
        date: data.DeliveryDate,
        status: data.DeliveryStatus,
        pickupLocation: data.PickupLocation,
        dropoffLocation: data.DropoffLocation,
        distance: data.DeliveryDistance,
        rate: data.DeliveryRate,
        clientName: data.clientName || 'Client',
        completedAt: data.completedAt || null,
        duration: data.actualDuration || data.EstimatedDuration
      });
    });
    
    res.json({
      success: true,
      deliveries: deliveries,
      count: deliveries.length,
      hasMore: deliveries.length === limit
    });
  } catch (error) {
    console.error('Get delivery history error:', error);
    res.status(500).json({ message: 'Server error getting delivery history' });
  }
});

// GET /api/mobile/driver/earnings - Get driver earnings summary
router.get('/driver/earnings', authenticateMobileJWT, async (req, res) => {
  try {
    const period = req.query.period || 'month'; // day, week, month, year
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    
    let dateFilter = admin.firestore.FieldValue.serverTimestamp();
    
    // Calculate date range based on period
    const now = new Date();
    let queryStartDate;
    
    switch (period) {
      case 'day':
        queryStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        queryStartDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        queryStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        queryStartDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        queryStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
    if (startDate) queryStartDate = new Date(startDate);
    const queryEndDate = endDate ? new Date(endDate) : now;
    
    const deliveriesSnapshot = await admin.firestore()
      .collection('deliveries')
      .where('assignedDriverId', '==', req.driver.id)
      .where('DeliveryStatus', '==', 'completed')
      .where('DeliveryDate', '>=', admin.firestore.Timestamp.fromDate(queryStartDate))
      .where('DeliveryDate', '<=', admin.firestore.Timestamp.fromDate(queryEndDate))
      .get();
    
    let totalEarnings = 0;
    let totalDeliveries = 0;
    let totalDistance = 0;
    
    deliveriesSnapshot.forEach(doc => {
      const data = doc.data();
      totalEarnings += data.DeliveryRate || 0;
      totalDeliveries += 1;
      totalDistance += data.DeliveryDistance || 0;
    });
    
    res.json({
      success: true,
      period: period,
      dateRange: {
        start: queryStartDate.toISOString(),
        end: queryEndDate.toISOString()
      },
      earnings: {
        total: totalEarnings,
        deliveries: totalDeliveries,
        distance: totalDistance,
        averagePerDelivery: totalDeliveries > 0 ? totalEarnings / totalDeliveries : 0,
        averagePerKm: totalDistance > 0 ? totalEarnings / totalDistance : 0
      }
    });
  } catch (error) {
    console.error('Get earnings error:', error);
    res.status(500).json({ message: 'Server error getting earnings data' });
  }
});

// POST /api/mobile/deliveries/:id/photos - Upload delivery photos
router.post('/deliveries/:id/photos', authenticateMobileJWT, upload.array('photos', 5), async (req, res) => {
  try {
    const deliveryId = req.params.id;
    const { photoType } = req.body; // 'pickup', 'delivery', 'proof', 'damage'
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No photos uploaded' });
    }
    
    // Process uploaded files
    const uploadedPhotos = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      type: photoType || 'general'
    }));
    
    // Update delivery with photo information
    await admin.firestore()
      .collection('deliveries')
      .doc(deliveryId)
      .update({
        [`photos_${photoType || 'general'}`]: admin.firestore.FieldValue.arrayUnion(...uploadedPhotos),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
    
    res.json({
      success: true,
      message: 'Photos uploaded successfully',
      photos: uploadedPhotos,
      count: uploadedPhotos.length
    });
  } catch (error) {
    console.error('Photo upload error:', error);
    res.status(500).json({ message: 'Server error uploading photos' });
  }
});

// PUT /api/mobile/deliveries/:id/signature - Add delivery signature
router.put('/deliveries/:id/signature', authenticateMobileJWT, async (req, res) => {
  try {
    const deliveryId = req.params.id;
    const { signature, recipientName, recipientId } = req.body;
    
    if (!signature) {
      return res.status(400).json({ message: 'Signature data required' });
    }
    
    const signatureData = {
      signature: signature, // Base64 encoded signature image
      recipientName: recipientName || 'Unknown',
      recipientId: recipientId || null,
      signedAt: admin.firestore.FieldValue.serverTimestamp(),
      driverId: req.driver.id
    };
    
    await admin.firestore()
      .collection('deliveries')
      .doc(deliveryId)
      .update({
        deliverySignature: signatureData,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
    
    res.json({
      success: true,
      message: 'Signature saved successfully'
    });
  } catch (error) {
    console.error('Signature save error:', error);
    res.status(500).json({ message: 'Server error saving signature' });
  }
});

module.exports = router; 