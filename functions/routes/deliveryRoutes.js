const express = require('express');
const router = express.Router();
const DeliveryService = require('../services/DeliveryService');
const AuditService = require('../services/AuditService');
const { authenticateJWT } = require('../middleware/auth');
const { db, admin } = require('../config/firebase');

// ─── GET /api/deliveries ───────────────────────────────────────────────────────
router.get('/', authenticateJWT, async (req, res) => {
  try {
    console.log('GET /api/deliveries - Fetching all deliveries');
    const deliveries = await DeliveryService.getAll();
    
    console.log(`Found ${deliveries.length} deliveries`);
    res.json(deliveries);
  } catch (err) {
    console.error('Error fetching deliveries:', err);
    res.status(500).json({
      message: 'Server error while fetching deliveries',
      error: err.message
    });
  }
});

// ─── GET /api/deliveries/status/:status ─────────────────────────────────────────
router.get('/status/:status', authenticateJWT, async (req, res) => {
  try {
    const { status } = req.params;
    console.log(`GET /api/deliveries/status/${status} - Fetching deliveries by status`);
    
    // Validate status parameter
    const validStatuses = ['pending', 'in-progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status parameter. Valid values are: ${validStatuses.join(', ')}`
      });
    }
    
    const deliveries = await DeliveryService.getDeliveriesByStatus(status);
    
    console.log(`Found ${deliveries.length} deliveries with status '${status}'`);
    res.json(deliveries);
  } catch (err) {
    console.error(`Error fetching deliveries with status '${req.params.status}':`, err);
    res.status(500).json({
      message: 'Server error while fetching deliveries by status',
      error: err.message
    });
  }
});

// ─── DELETE /api/deliveries/clear - MUST BE BEFORE /:id ROUTES ─────────────────────────
router.delete('/clear', authenticateJWT, async (req, res) => {
  try {
    console.log('Starting deletion of all deliveries (direct route)...');
    
    // Get all deliveries
    const deliveriesSnapshot = await db.collection('deliveries').get();
    
    if (deliveriesSnapshot.empty) {
      console.log('No deliveries found to delete.');
      return res.json({ message: 'No deliveries found to delete' });
    }
    
    console.log(`Found ${deliveriesSnapshot.size} deliveries to delete.`);
    
    // Delete all documents directly
    let deletedCount = 0;
    const deletePromises = [];
    
    for (const doc of deliveriesSnapshot.docs) {
      deletePromises.push(doc.ref.delete());
      deletedCount++;
    }
    
    // Wait for all deletions to complete
    await Promise.all(deletePromises);
    
    console.log(`Successfully deleted all ${deletedCount} deliveries!`);
    
    return res.json({ 
      message: `Successfully deleted all ${deletedCount} deliveries`,
      deletedCount: deletedCount
    });
  } catch (error) {
    console.error('Error deleting all deliveries:', error);
    res.status(500).json({ 
      message: 'Server error while deleting all deliveries',
      error: error.message
    });
  }
});

// ─── GET /api/deliveries/client/:clientId ────────────────────────────────────────
router.get('/client/:clientId', authenticateJWT, async (req, res) => {
  try {
    const { clientId } = req.params;
    console.log(`GET /api/deliveries/client/${clientId} - Fetching client deliveries`);
    
    const deliveries = await DeliveryService.getClientDeliveries(clientId);
    
    console.log(`Found ${deliveries.length} deliveries for client ${clientId}`);
    res.json(deliveries);
  } catch (err) {
    console.error('Error fetching client deliveries:', err);
    res.status(500).json({
      message: 'Server error while fetching client deliveries',
      error: err.message
    });
  }
});

// ─── GET /api/deliveries/driver/:driverId ────────────────────────────────────────
router.get('/driver/:driverId', authenticateJWT, async (req, res) => {
  try {
    const { driverId } = req.params;
    console.log(`GET /api/deliveries/driver/${driverId} - Fetching driver deliveries`);
    
    const deliveries = await DeliveryService.getDriverDeliveries(driverId);
    
    console.log(`Found ${deliveries.length} deliveries for driver ${driverId}`);
    res.json(deliveries);
  } catch (err) {
    console.error('Error fetching driver deliveries:', err);
    res.status(500).json({
      message: 'Server error while fetching driver deliveries',
      error: err.message
    });
  }
});

// ─── GET /api/deliveries/:id ─────────────────────────────────────────────────────
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    console.log(`GET /api/deliveries/${req.params.id} - Fetching delivery`);
    const delivery = await DeliveryService.getById(req.params.id);
    
    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }
    
    res.json(delivery);
  } catch (err) {
    console.error('Error fetching delivery:', err);
    res.status(500).json({
      message: 'Server error while fetching delivery',
      error: err.message
    });
  }
});

// ─── POST /api/deliveries ───────────────────────────────────────────────────────
router.post('/', authenticateJWT, async (req, res) => {
  try {
    console.log('POST /api/deliveries - Creating new delivery', req.body);
    const delivery = await DeliveryService.createDelivery(req.body);
    
    // Log the delivery booking to audit trail
    await AuditService.logCreate(
      req.user.id,
      req.user.username,
      'delivery',
      delivery.id,
      {
        clientId: delivery.clientId,
        truckId: delivery.truckId,
        description: `Delivery from ${delivery.pickupLocation || 'origin'} to ${delivery.deliveryLocation || 'destination'}`
      }
    );
    
    console.log(`✅ Delivery creation logged to audit trail for delivery ${delivery.id}`);
    
    res.status(201).json({
      message: 'Delivery created successfully',
      delivery
    });
  } catch (err) {
    console.error('Error creating delivery:', err);
    
    // Provide specific error messages for common errors
    if (err.message.includes('not found')) {
      return res.status(404).json({ message: err.message });
    }
    if (err.message.includes('not available')) {
      return res.status(400).json({ message: err.message });
    }
    
    res.status(500).json({
      message: 'Server error while creating delivery',
      error: err.message
    });
  }
});

// ─── PUT /api/deliveries/:id/status ─────────────────────────────────────────────
router.put('/:id/status', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }
    
    console.log(`PUT /api/deliveries/${id}/status - Updating delivery status to ${status}`);
    
    // Handle special status transitions
    if (status === 'completed') {
      const delivery = await DeliveryService.completeDelivery(id);
      
      // Log delivery completion
      await AuditService.logAction(
        req.user.id,
        req.user.username,
        'delivery_completed',
        'delivery',
        id,
        { 
          status: 'completed',
          description: `Delivery #${id} marked as completed`
        }
      );
      
      return res.json({
        message: 'Delivery marked as completed successfully',
        delivery
      });
    }
    
    // Handle cancellation
    if (status === 'cancelled') {
      // Cancel payment first (if exists)
      let paymentCancellationResult = null;
      try {
        const paymentService = require('../services/PaymentService');
        paymentCancellationResult = await paymentService.cancelPayment(id);
        console.log('✅ Route payment cancellation result:', paymentCancellationResult);
      } catch (paymentError) {
        console.error('⚠️ Route payment cancellation failed but continuing:', paymentError.message);
      }

      const delivery = await DeliveryService.updateDeliveryStatus(id, status);
      
      // Log delivery cancellation
      await AuditService.logDeliveryCancellation(
        req.user.id,
        req.user.username,
        id,
        req.body.reason || 'No reason provided'
      );
      
      return res.json({
        message: 'Delivery cancelled successfully',
        delivery,
        paymentCancellation: paymentCancellationResult
      });
    }
    
    // For other status updates
    const delivery = await DeliveryService.updateDeliveryStatus(id, status);
    
    // Log status change
    await AuditService.logAction(
      req.user.id,
      req.user.username,
      'status_change',
      'delivery',
      id,
      { 
        oldStatus: delivery.previousStatus || 'unknown',
        status: status,
        description: `Delivery status changed to ${status}`
      }
    );
    
    res.json({
      message: `Delivery status updated to ${status}`,
      delivery
    });
  } catch (err) {
    console.error('Error updating delivery status:', err);
    
    if (err.message.includes('not found')) {
      return res.status(404).json({ message: err.message });
    }
    
    res.status(500).json({
      message: 'Server error while updating delivery status',
      error: err.message
    });
  }
});

// ─── PUT /api/deliveries/:id ─────────────────────────────────────────────────────
router.put('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`PUT /api/deliveries/${id} - Updating delivery`, req.body);
    
    const delivery = await DeliveryService.update(id, req.body);
    
    // Log the update action to audit trail
    await AuditService.logUpdate(
      req.user.id,
      req.user.username,
      'delivery',
      id,
      { 
        requestBody: req.body,
        description: `Delivery #${id} updated`
      }
    );
    
    console.log(`✅ Delivery update logged to audit trail for delivery ${id}`);
    
    res.json({
      message: 'Delivery updated successfully',
      delivery
    });
  } catch (err) {
    console.error('Error updating delivery:', err);
    
    if (err.message.includes('not found')) {
      return res.status(404).json({ message: err.message });
    }
    
    res.status(500).json({
      message: 'Server error while updating delivery',
      error: err.message
    });
  }
});

// ─── DELETE /api/deliveries/:id ─────────────────────────────────────────────────
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`DELETE /api/deliveries/${id} - Deleting delivery`);
    
    // Get delivery details before deletion for audit log
    const delivery = await DeliveryService.getById(id);
    
    await DeliveryService.delete(id);
    
    // Log the delete action to audit trail
    await AuditService.logDelete(
      req.user.id,
      req.user.username,
      'delivery',
      id,
      {
        description: `Delivery #${id} deleted`,
        pickupLocation: delivery.pickupLocation || 'unknown',
        deliveryLocation: delivery.deliveryLocation || 'unknown'
      }
    );
    
    console.log(`✅ Delivery deletion logged to audit trail for delivery ${id}`);
    
    res.json({ message: 'Delivery deleted successfully' });
  } catch (err) {
    console.error('Error deleting delivery:', err);
    
    if (err.message.includes('not found')) {
      return res.status(404).json({ message: err.message });
    }
    
    res.status(500).json({
      message: 'Server error while deleting delivery',
      error: err.message
    });
  }
});

// ─── DELETE /api/deliveries/force-clear - DANGEROUS - CLEARS ALL DELIVERY DATA ─────────
router.delete('/force-clear', authenticateJWT, async (req, res) => {
  try {
    console.log('FORCE CLEAR: Starting deletion of all deliveries...');
    
    // Get all deliveries directly from Firestore
    const deliveriesSnapshot = await db.collection('deliveries').get();
    
    if (deliveriesSnapshot.empty) {
      console.log('No deliveries found to delete.');
      return res.json({ message: 'No deliveries found to delete', deletedCount: 0 });
    }
    
    console.log(`Found ${deliveriesSnapshot.size} delivery documents to delete.`);
    
    // Delete all documents directly, regardless of their content
    let deletedCount = 0;
    let errorCount = 0;
    
    for (const doc of deliveriesSnapshot.docs) {
      try {
        console.log(`Deleting delivery document with ID: ${doc.id}`);
        await db.collection('deliveries').doc(doc.id).delete();
        deletedCount++;
      } catch (deleteError) {
        console.error(`Error deleting document ${doc.id}:`, deleteError);
        errorCount++;
        // Continue with next document even if this one fails
      }
    }
    
    const message = `Successfully deleted ${deletedCount} out of ${deliveriesSnapshot.size} delivery documents!`;
    console.log(message);
    
    if (errorCount > 0) {
      console.log(`Failed to delete ${errorCount} documents.`);
    }
    
    return res.json({ 
      message: message,
      deletedCount: deletedCount,
      errorCount: errorCount,
      totalFound: deliveriesSnapshot.size
    });
  } catch (error) {
    console.error('Fatal error during force deletion:', error);
    res.status(500).json({ 
      message: 'Server error while force-deleting all deliveries',
      error: error.message
    });
  }
});

// ─── GET /api/deliveries/debug/drivers ─────────────────────────────────────────
router.get('/debug/drivers', authenticateJWT, async (req, res) => {
  try {
    console.log('DEBUG: Checking active drivers...');
    
    // Get all drivers
    const allDriversSnapshot = await db.collection('drivers').get();
    console.log(`Total drivers in database: ${allDriversSnapshot.size}`);
    
    // Get active drivers
    const activeDriversSnapshot = await db.collection('drivers')
      .where('driverStatus', '==', 'active')
      .get();
    
    console.log(`Active drivers found: ${activeDriversSnapshot.size}`);
    
    const activeDrivers = [];
    activeDriversSnapshot.forEach(doc => {
      const driverData = doc.data();
      activeDrivers.push({
        id: doc.id,
        name: driverData.driverName,
        status: driverData.driverStatus,
        username: driverData.driverUsername
      });
    });
    
    res.json({
      totalDrivers: allDriversSnapshot.size,
      activeDrivers: activeDrivers.length,
      drivers: activeDrivers
    });
    
  } catch (error) {
    console.error('Error checking drivers:', error);
    res.status(500).json({
      message: 'Error checking drivers',
      error: error.message
    });
  }
});

// ─── GET /api/deliveries/debug/recent ─────────────────────────────────────────
router.get('/debug/recent', authenticateJWT, async (req, res) => {
  try {
    console.log('DEBUG: Checking recent deliveries...');
    
    // Get recent deliveries
    const deliveriesSnapshot = await db.collection('deliveries')
      .orderBy('created_at', 'desc')
      .limit(5)
      .get();
    
    console.log(`Recent deliveries found: ${deliveriesSnapshot.size}`);
    
    const deliveries = [];
    deliveriesSnapshot.forEach(doc => {
      const deliveryData = doc.data();
      deliveries.push({
        id: doc.id,
        clientId: deliveryData.clientId,
        clientName: deliveryData.clientName,
        driverId: deliveryData.driverId,
        driverName: deliveryData.driverName,
        truckId: deliveryData.truckId,
        truckPlate: deliveryData.truckPlate,
        status: deliveryData.deliveryStatus,
        distance: deliveryData.deliveryDistance,
        rate: deliveryData.deliveryRate,
        created_at: deliveryData.created_at
      });
    });
    
    res.json({
      totalDeliveries: deliveriesSnapshot.size,
      deliveries: deliveries
    });
    
  } catch (error) {
    console.error('Error checking recent deliveries:', error);
    res.status(500).json({
      message: 'Error checking recent deliveries',
      error: error.message
    });
  }
});

module.exports = router;