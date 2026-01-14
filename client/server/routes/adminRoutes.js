// Admin routes
const express = require('express');
const router = express.Router();
const { authenticateJWT, isAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');
const { db, admin } = require('../config/firebase');
const AuditService = require('../services/AuditService');

// Protect all admin routes with authentication and admin role check
router.use(authenticateJWT);
router.use(isAdmin);

// Dashboard overview data
router.get('/dashboard', adminController.getDashboardData);

// User management
router.get('/users', adminController.getAllUsers);
router.post('/users', adminController.createUser);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Truck management
const { 
  uploadTruckDocuments, 
  uploadDriverDocuments, 
  uploadHelperDocuments, 
  uploadStaffDocuments, 
  uploadClientDocuments, 
  serveDocument 
} = require('../middleware/documentUpload');

router.get('/trucks', adminController.getAllTrucks);
router.post('/trucks', (req, res, next) => {
  console.log('🚛 POST /trucks route hit');
  console.log('📄 Files:', req.files);
  console.log('📄 Body:', req.body);
  next();
}, uploadTruckDocuments, adminController.createTruck);
router.get('/trucks/:id/documents/:docType', (req, res) => serveDocument(req, res));
router.get('/trucks/expiring-documents/:days?', adminController.getTrucksWithExpiringDocuments);
router.get('/trucks/:id', adminController.getTruckById);
router.put('/trucks/:id', (req, res, next) => {
  console.log('🚛 PUT /trucks/:id route hit');
  console.log('📄 Files:', req.files);
  console.log('📄 Body:', req.body);
  next();
}, uploadTruckDocuments, adminController.updateTruck);
router.delete('/trucks/:id', adminController.deleteTruck);

// Driver management
router.get('/drivers', adminController.getAllDrivers);
router.post('/drivers', uploadDriverDocuments, adminController.createDriver);
router.get('/drivers/:id/documents/:docType', (req, res) => serveDocument(req, res));
router.get('/drivers/:id', adminController.getDriverById);
router.put('/drivers/:id', uploadDriverDocuments, adminController.updateDriver);
router.delete('/drivers/:id', adminController.deleteDriver);

// Helper management
router.get('/helpers', adminController.getAllHelpers);
router.post('/helpers', uploadHelperDocuments, adminController.createHelper);
router.get('/helpers/:id/documents/:docType', (req, res) => serveDocument(req, res));
router.get('/helpers/:id', adminController.getHelperById);
router.put('/helpers/:id', uploadHelperDocuments, adminController.updateHelper);
router.delete('/helpers/:id', adminController.deleteHelper);

// Staff management
router.get('/staff', adminController.getAllStaff);
router.post('/staff', uploadStaffDocuments, adminController.createStaff);
router.get('/staff/:id/documents/:docType', (req, res) => serveDocument(req, res));
router.get('/staff/:id', adminController.getStaffById);
router.put('/staff/:id', uploadStaffDocuments, adminController.updateStaff);
router.delete('/staff/:id', adminController.deleteStaff);

// Client management
router.get('/clients', adminController.getAllClients);
router.post('/clients', uploadClientDocuments, adminController.createClient);
router.get('/clients/:id/documents/:docType', (req, res) => serveDocument(req, res));
router.get('/clients/:id', adminController.getClientById);
router.put('/clients/:id', uploadClientDocuments, adminController.updateClient);
router.delete('/clients/:id', adminController.deleteClient);

// Allocation management
router.get('/allocations', adminController.getAllAllocations);
router.post('/allocations', adminController.createAllocation);
router.get('/allocations/:id', adminController.getAllocationById);
router.put('/allocations/:id', adminController.updateAllocation);
router.delete('/allocations/:id', adminController.deleteAllocation);

// Delivery management
router.get('/deliveries', adminController.getAllDeliveries);
router.post('/deliveries', adminController.createDelivery);

// Add a route to clear all deliveries BEFORE the :id routes to prevent conflicts
router.delete('/deliveries/clear-all', async (req, res) => {
  try {
    // Only allow admin users to perform this operation
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can perform this operation' });
    }

    console.log('Starting deletion of all deliveries...');
    
    // Get all deliveries
    const deliveriesSnapshot = await db.collection('deliveries').get();
    
    if (deliveriesSnapshot.empty) {
      console.log('No deliveries found to delete.');
      return res.json({ message: 'No deliveries found to delete' });
    }
    
    console.log(`Found ${deliveriesSnapshot.size} deliveries to delete.`);
    
    // Use a batched write for efficiency
    const batchSize = 500; // Firestore allows up to 500 operations in a batch
    let batch = db.batch();
    let count = 0;
    let totalDeleted = 0;
    
    for (const doc of deliveriesSnapshot.docs) {
      batch.delete(doc.ref);
      count++;
      
      // Commit when we reach batch size limit
      if (count >= batchSize) {
        console.log(`Committing batch of ${count} deletions...`);
        await batch.commit();
        totalDeleted += count;
        console.log(`Deleted ${totalDeleted} deliveries so far...`);
        
        // Start a new batch
        batch = db.batch();
        count = 0;
      }
    }
    
    // Commit any remaining deletes
    if (count > 0) {
      console.log(`Committing final batch of ${count} deletions...`);
      await batch.commit();
      totalDeleted += count;
    }
    
    console.log(`Successfully deleted all ${totalDeleted} deliveries!`);
    
    try {
      // Add audit log if the service is available
      if (AuditService && typeof AuditService.logAction === 'function') {
        await AuditService.logAction(
          req.user.id,
          req.user.username,
          'deliveries',
          'bulk-delete',
          { count: totalDeleted }
        );
      }
    } catch (auditError) {
      console.error('Error logging audit:', auditError);
      // Continue - don't fail if audit logging fails
    }
    
    return res.json({ 
      message: `Successfully deleted all ${totalDeleted} deliveries`,
      deletedCount: totalDeleted
    });
  } catch (error) {
    console.error('Error deleting all deliveries:', error);
    res.status(500).json({ 
      message: 'Server error while deleting all deliveries',
      error: error.message
    });
  }
});

router.get('/deliveries/:id', adminController.getDeliveryById);
router.put('/deliveries/:id', adminController.updateDelivery);
router.delete('/deliveries/:id', adminController.deleteDelivery);
router.get('/deliveries/status/:status', adminController.getDeliveriesByStatus);
router.put('/deliveries/:id/status', adminController.updateDeliveryStatus);
router.get('/deliveries/nearby', adminController.getDeliveriesNearLocation);

// Audit trail
router.get('/audit', adminController.getAuditTrail);

// Utility endpoints
router.post('/utility/fix-stuck-statuses', adminController.fixStuckDriverHelperStatuses);

module.exports = router;