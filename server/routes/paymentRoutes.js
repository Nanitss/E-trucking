const express = require('express');
const router = express.Router();
const PaymentService = require('../services/PaymentService');
const { authenticateJWT } = require('../middleware/auth');
const AuditService = require('../services/AuditService');

const paymentService = new PaymentService();
const auditService = new AuditService();

// ─── POST /api/payments/create ──────────────────────────────────────────────
// Create payment for a delivery
router.post('/create', authenticateJWT, async (req, res) => {
  try {
    const { deliveryId, amount } = req.body;

    if (!deliveryId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Delivery ID and amount are required'
      });
    }

    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount'
      });
    }

    const payment = await paymentService.createPaymentIntent(deliveryId, parseFloat(amount));

    // Log the payment creation
    await auditService.logCreate(
      req.user.id,
      req.user.username,
      'payment',
      payment.paymentId,
      {
        deliveryId: deliveryId,
        amount: amount,
        description: 'Payment created for delivery'
      }
    );

    res.status(201).json({
      success: true,
      message: 'Payment created successfully',
      data: payment
    });

  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create payment'
    });
  }
});

// ─── POST /api/payments/process ──────────────────────────────────────────────
// Process payment completion (called by webhook or frontend)
router.post('/process', async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment intent ID is required'
      });
    }

    const result = await paymentService.processPaymentCompletion(paymentIntentId);

    res.json({
      success: true,
      message: 'Payment processed successfully',
      data: result
    });

  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process payment'
    });
  }
});

// ─── GET /api/payments/client/:clientId ──────────────────────────────────────
// Get client payment summary
router.get('/client/:clientId', authenticateJWT, async (req, res) => {
  try {
    const { clientId } = req.params;
    
    // Check if user is authorized to view this client's payments
    if (req.user.role !== 'admin' && req.user.id !== clientId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const summary = await paymentService.getClientPaymentSummary(clientId);

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('Error getting client payment summary:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get payment summary'
    });
  }
});

// ─── GET /api/payments/client/:clientId/can-book ─────────────────────────────
// Check if client can book trucks (no overdue payments)
router.get('/client/:clientId/can-book', authenticateJWT, async (req, res) => {
  try {
    const { clientId } = req.params;
    
    // Check if user is authorized
    if (req.user.role !== 'admin' && req.user.id !== clientId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const canBook = await paymentService.canClientBookTrucks(clientId);

    res.json({
      success: true,
      data: {
        clientId: clientId,
        canBookTrucks: canBook
      }
    });

  } catch (error) {
    console.error('Error checking booking eligibility:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to check booking eligibility'
    });
  }
});

// ─── POST /api/payments/:paymentId/create-link ───────────────────────────────
// Create payment link for a payment
router.post('/:paymentId/create-link', authenticateJWT, async (req, res) => {
  try {
    const { paymentId } = req.params;

    const paymentLink = await paymentService.createPaymentLink(paymentId);

    // Log the payment link creation
    await auditService.logUpdate(
      req.user.id,
      req.user.username,
      'payment',
      paymentId,
      {
        action: 'payment_link_created',
        paymentLinkId: paymentLink.paymentLinkId
      }
    );

    res.json({
      success: true,
      message: 'Payment link created successfully',
      data: paymentLink
    });

  } catch (error) {
    console.error('Error creating payment link:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create payment link'
    });
  }
});

// ─── POST /api/payments/webhook ──────────────────────────────────────────────
// PayMongo webhook endpoint
router.post('/webhook', async (req, res) => {
  try {
    const webhookData = req.body;
    
    console.log('Received webhook:', JSON.stringify(webhookData, null, 2));

    const result = await paymentService.processWebhook(webhookData);

    res.json({
      success: true,
      message: 'Webhook processed successfully',
      data: result
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process webhook'
    });
  }
});

// ─── GET /api/payments/overdue ───────────────────────────────────────────────
// Get all overdue payments (Admin only)
router.get('/overdue', authenticateJWT, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const overduePayments = await paymentService.getOverduePayments();

    res.json({
      success: true,
      data: overduePayments
    });

  } catch (error) {
    console.error('Error getting overdue payments:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get overdue payments'
    });
  }
});

// ─── POST /api/payments/update-client-status/:clientId ───────────────────────
// Manually update client payment status (Admin only)
router.post('/update-client-status/:clientId', authenticateJWT, async (req, res) => {
  try {
    const { clientId } = req.params;

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const result = await paymentService.updateClientPaymentStatus(clientId);

    // Log the status update
    await auditService.logUpdate(
      req.user.id,
      req.user.username,
      'client',
      clientId,
      {
        action: 'payment_status_updated',
        hasOverduePayments: result.hasOverduePayments,
        overdueCount: result.overdueCount
      }
    );

    res.json({
      success: true,
      message: 'Client payment status updated successfully',
      data: result
    });

  } catch (error) {
    console.error('Error updating client payment status:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update client payment status'
    });
  }
});

// ─── GET /api/payments/:paymentId ────────────────────────────────────────────
// Get specific payment details
router.get('/:paymentId', authenticateJWT, async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const db = require('firebase-admin').firestore();
    const paymentDoc = await db.collection('payments').doc(paymentId).get();
    
    if (!paymentDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    const payment = paymentDoc.data();
    
    // Check if user is authorized to view this payment
    if (req.user.role !== 'admin' && req.user.id !== payment.clientId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Convert timestamps to dates
    const paymentData = {
      id: paymentDoc.id,
      ...payment,
      dueDate: payment.dueDate?.toDate(),
      deliveryDate: payment.deliveryDate?.toDate(),
      createdAt: payment.createdAt?.toDate(),
      paidAt: payment.paidAt?.toDate(),
      updatedAt: payment.updatedAt?.toDate()
    };

    res.json({
      success: true,
      data: paymentData
    });

  } catch (error) {
    console.error('Error getting payment details:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get payment details'
    });
  }
});

// ─── GET /api/payments ───────────────────────────────────────────────────────
// Get all payments with filtering (Admin only)
router.get('/', authenticateJWT, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { status, clientId, limit = 50, offset = 0 } = req.query;
    
    const db = require('firebase-admin').firestore();
    let query = db.collection('payments').orderBy('createdAt', 'desc');

    // Apply filters
    if (status) {
      query = query.where('status', '==', status);
    }
    if (clientId) {
      query = query.where('clientId', '==', clientId);
    }

    // Apply pagination
    query = query.limit(parseInt(limit)).offset(parseInt(offset));

    const snapshot = await query.get();
    const payments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      dueDate: doc.data().dueDate?.toDate(),
      deliveryDate: doc.data().deliveryDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      paidAt: doc.data().paidAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));

    res.json({
      success: true,
      data: payments,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: payments.length
      }
    });

  } catch (error) {
    console.error('Error getting payments:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get payments'
    });
  }
});

module.exports = router; 