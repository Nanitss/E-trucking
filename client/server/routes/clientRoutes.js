// server/routes/clientRoutes.js - Updated for Firebase
const express = require('express');
const router = express.Router();
const { authenticateJWT, requireRole, requireClientOrAdmin } = require('../middleware/auth');
const clientController = require('../controllers/clientControllers');
const { uploadClientDocuments } = require('../middleware/documentUpload');

// Add debug logging to verify file is being loaded
console.log('🔍 clientRoutes.js is being loaded!');

// Add request logging for all client routes
router.use((req, res, next) => {
  console.log(`🔍 [ClientRoutes] ${req.method} ${req.originalUrl}`);
  // Log auth headers if present
  if (req.headers.authorization) {
    console.log(`🔒 Auth header present: ${req.headers.authorization.substring(0, 20)}...`);
  }
  next();
});

// Test route to verify routing works
router.get('/test', (req, res) => {
  console.log('Test route hit');
  res.json({ message: 'Client routes are working!' });
});

// Test route for change-route debugging
router.post('/deliveries/test/change-route', (req, res) => {
  console.log('Change route test endpoint hit');
  res.json({ message: 'Change route endpoint is accessible!' });
});

// ========== Truck Availability Routes (MUST be before /:id routes) ==========
// Check which trucks are available for a specific date - matches frontend API call
router.get('/trucks/availability', authenticateJWT, requireClientOrAdmin, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ success: false, message: 'Date parameter is required' });
    }

    console.log(`🔍 Checking truck availability for date: ${date}`);

    const { db } = require('../config/firebase');

    // Get client ID from authenticated user
    const clientsSnapshot = await db.collection('clients')
      .where('userId', '==', req.user.id)
      .limit(1)
      .get();

    if (clientsSnapshot.empty) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    const clientId = clientsSnapshot.docs[0].id;
    console.log(`🔍 Client ID: ${clientId}`);

    // Get all active allocations for this client
    const activeAllocationsSnapshot = await db.collection('allocations')
      .where('clientId', '==', clientId)
      .where('status', '==', 'active')
      .get();

    const allocatedTruckIds = activeAllocationsSnapshot.docs.map(doc => doc.data().truckId);
    console.log(`🔍 Allocated truck IDs: ${allocatedTruckIds.length}`);

    // Get all deliveries for this client
    const deliveriesSnapshot = await db.collection('deliveries')
      .where('clientId', '==', req.user.id)
      .get();

    // Filter deliveries that are on the selected date and are active
    const selectedDateObj = new Date(date);
    const busyTruckIds = [];

    deliveriesSnapshot.docs.forEach(doc => {
      const delivery = doc.data();
      let deliveryDate;

      if (delivery.deliveryDate) {
        if (delivery.deliveryDate.seconds) {
          deliveryDate = new Date(delivery.deliveryDate.seconds * 1000);
        } else if (delivery.deliveryDate.toDate) {
          deliveryDate = delivery.deliveryDate.toDate();
        } else {
          deliveryDate = new Date(delivery.deliveryDate);
        }

        const isSameDay = deliveryDate.toDateString() === selectedDateObj.toDateString();
        const isActive = ['pending', 'in-progress', 'booked'].includes(delivery.deliveryStatus?.toLowerCase());

        if (isSameDay && isActive && delivery.truckId) {
          busyTruckIds.push(delivery.truckId);
        }
      }
    });

    console.log(`🔍 Busy truck IDs on ${date}: ${busyTruckIds.length}`);

    // Filter out trucks that are busy on this date
    const availableTruckIds = allocatedTruckIds.filter(truckId => !busyTruckIds.includes(truckId));

    res.json({
      success: true,
      availableTruckIds,
      date,
      totalAllocated: allocatedTruckIds.length,
      totalAvailable: availableTruckIds.length
    });
  } catch (error) {
    console.error('Error checking truck availability:', error);
    res.status(500).json({ success: false, message: 'Server error checking availability' });
  }
});

// ========== Client Profile Routes ==========
// IMPORTANT: These routes must be defined BEFORE the /:id routes to avoid conflicts

// Get vehicle rates for pricing estimation - Both client and admin can access
router.get('/vehicle-rates', authenticateJWT, requireClientOrAdmin, async (req, res) => {
  try {
    console.log('GET /api/clients/vehicle-rates - Fetching vehicle rates for client');

    const StaffService = require('../services/StaffService');
    const rates = await StaffService.getVehicleRates();

    // Return simplified rate information for clients
    const clientRates = rates.map(rate => ({
      vehicleType: rate.vehicleType,
      ratePerKm: rate.ratePerKm,
      baseRate: rate.baseRate,
      description: rate.description
    }));

    res.json({
      success: true,
      data: clientRates
    });
  } catch (err) {
    console.error('Error fetching vehicle rates for client:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching vehicle rates',
      error: err.message
    });
  }
});

// Get profile for the authenticated client - Both client and admin can access
router.get('/profile', authenticateJWT, requireClientOrAdmin, clientController.getClientProfile);

// Get trucks for the authenticated client
router.get('/profile/trucks', authenticateJWT, requireClientOrAdmin, clientController.getClientTrucksForProfile);

// Get deliveries for the authenticated client
router.get('/profile/deliveries', authenticateJWT, requireClientOrAdmin, clientController.getClientDeliveries);

// Get deliveries for the authenticated client (shorthand route)
router.get('/deliveries', authenticateJWT, requireClientOrAdmin, clientController.getClientDeliveries);

// Update client's own profile
router.put('/profile', authenticateJWT, requireClientOrAdmin, clientController.updateClientProfile);

// Change client's password
router.put('/profile/password', authenticateJWT, requireClientOrAdmin, clientController.changeClientPassword);

// Get delivery by ID for the authenticated client
router.get('/deliveries/:id', authenticateJWT, requireClientOrAdmin, clientController.getDeliveryById);

// Confirm delivery received by client
router.put('/deliveries/:id/confirm-received', authenticateJWT, requireClientOrAdmin, clientController.confirmDeliveryReceived);

// Cancel delivery - Client only (before driver starts)
router.post('/deliveries/:id/cancel', (req, res, next) => {
  console.log('🔍 Cancel delivery endpoint hit for delivery:', req.params.id);
  next();
}, authenticateJWT, requireClientOrAdmin, clientController.cancelDelivery);

// Change delivery route - Client only (before driver starts)
router.post('/deliveries/:id/change-route', (req, res, next) => {
  console.log('🔍 Change route endpoint hit for delivery:', req.params.id);
  console.log('🔍 Request body:', req.body);
  next();
}, authenticateJWT, requireClientOrAdmin, clientController.changeDeliveryRoute);

// Rebook delivery date - Client only (before driver starts)
router.post('/deliveries/:id/rebook', (req, res, next) => {
  console.log('🔍 Rebook delivery endpoint hit for delivery:', req.params.id);
  console.log('🔍 Request body:', req.body);
  next();
}, authenticateJWT, requireClientOrAdmin, clientController.rebookDelivery);

// Truck rental booking
router.post('/truck-rental', (req, res, next) => {
  console.log('ud83dudd0d [DEBUG] truck-rental route hit');
  console.log('ud83dudd0d [DEBUG] Request headers:', req.headers);
  console.log('ud83dudd0d [DEBUG] Request body:', req.body);
  next();
}, authenticateJWT, requireClientOrAdmin, clientController.createTruckRental);

// ========== Admin Routes for Client Management ==========
// Get all clients - Admin only
router.get('/', authenticateJWT, requireRole('admin'), clientController.getAllClients);

// Get client by user ID - Admin only
router.get('/user/:userId', authenticateJWT, requireRole('admin'), clientController.getClientByUserId);

// Get clients by status - Admin only
router.get('/status/:status', authenticateJWT, requireRole('admin'), clientController.getClientsByStatus);

// Get client by ID - Admin only
router.get('/:id', authenticateJWT, requireRole('admin'), clientController.getClientById);

// Create a new client - Admin only
router.post('/', authenticateJWT, requireRole('admin'), uploadClientDocuments, clientController.createClient);

// Update client - Admin only
router.put('/:id', authenticateJWT, requireRole('admin'), uploadClientDocuments, clientController.updateClient);

// Delete client - Admin only
router.delete('/:id', authenticateJWT, requireRole('admin'), clientController.deleteClient);

// Allocate trucks to client - Admin only
router.post('/:id/allocate-trucks', authenticateJWT, requireRole('admin'), clientController.allocateTrucks);

// Deallocate truck from client - Admin only
router.delete('/:id/trucks/:truckId', authenticateJWT, requireRole('admin'), clientController.deallocateTruck);

// Get client's allocated trucks (admin view) - Admin only
router.get('/:id/trucks', authenticateJWT, requireRole('admin'), clientController.getClientTrucks);

// AVAILABILITY CHECKING ROUTES
// Check which trucks are available for a specific date
router.get('/availability/trucks-for-date/:date', authenticateJWT, requireClientOrAdmin, clientController.getAvailableTrucksForDate);

// Check which dates are unavailable for a specific truck
router.get('/availability/dates-for-truck/:truckId', authenticateJWT, requireClientOrAdmin, clientController.getBookedDatesForTruck);

module.exports = router;