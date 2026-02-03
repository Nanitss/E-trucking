// server/routes/clients.js - Updated for Firebase
const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const authenticate = require('../middleware/authenticate');
const clientController = require('../controllers/clientControllers');

// Add debug logging to verify file is being loaded
console.log('🔍 clients.js routes file is being loaded!');

// Add request logging for all client routes
router.use((req, res, next) => {
  console.log(`\n[Client Route] ${req.method} ${req.path}`);
  next();
});

// Test route to verify routing works
router.get('/test', (req, res) => {
  console.log('Test route hit');
  res.json({ message: 'Client routes are working!' });
});

// ========== Client User Routes (must come before :id routes) ==========
// Get client profile (for logged in client)
router.get('/profile/me', authenticate, clientController.getClientProfile);

// Get client's trucks (for logged in client)
router.get('/profile/trucks', authenticate, clientController.getClientTrucksForProfile);

// Get client's deliveries (for logged in client)
router.get('/profile/deliveries', authenticate, clientController.getClientDeliveries);

// Check which trucks are available on a specific date (checks ALL deliveries system-wide)
router.get('/availability/trucks-for-date/:date', authenticate, clientController.getAvailableTrucksForDate);

// Check booked dates for a specific truck
router.get('/availability/dates-for-truck/:truckId', authenticate, clientController.getBookedDatesForTruck);

// Book a truck for delivery (for logged in client)
router.post('/truck-rental', authenticate, clientController.createTruckRental);

// ========== Admin Routes for Client Management ==========
// Get all clients
router.get('/', clientController.getAllClients);

// Get client by ID
router.get('/:id', clientController.getClientById);

// Create a new client
router.post('/', clientController.createClient);

// Update client
router.put('/:id', clientController.updateClient);

// Delete client
router.delete('/:id', clientController.deleteClient);

// Get clients by status
router.get('/status/:status', clientController.getClientsByStatus);

// Get client by user ID
router.get('/user/:userId', clientController.getClientByUserId);

// Allocate trucks to client
router.post('/:id/allocate-trucks', clientController.allocateTrucks);

// Deallocate truck from client
router.delete('/:id/trucks/:truckId', clientController.deallocateTruck);

// Get client's allocated trucks (admin view)
router.get('/:id/trucks', clientController.getClientTrucks);

module.exports = router;