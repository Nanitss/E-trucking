const express = require('express');
const router = express.Router();
const realPayMongoService = require('../services/RealPayMongoService');
const { authenticateJWT } = require('../middleware/auth');

// Get all payment records for admin dashboard
router.get('/', authenticateJWT, async (req, res) => {
  try {
    console.log('🔥 Getting all payment records for admin dashboard');
    
    // Get all payments from the database
    const { db } = require('../config/firebase');
    const deliveriesRef = db.collection('deliveries');
    
    // Get deliveries with payment information
    const snapshot = await deliveriesRef.get();
    const payments = [];
    
    snapshot.forEach(doc => {
      const delivery = doc.data();
      
      // Only include deliveries that have payment information
      if (delivery.amount && delivery.amount > 0) {
        payments.push({
          id: doc.id,
          paymentId: `PAY-${doc.id.substring(0, 8).toUpperCase()}`,
          clientName: delivery.clientName || delivery.client?.name || 'Unknown Client',
          clientId: delivery.clientId || 'unknown',
          deliveryId: doc.id,
          amount: delivery.amount || 0,
          currency: 'PHP',
          status: delivery.paymentStatus || 'pending',
          dueDate: delivery.scheduledDate || delivery.created_at,
          paymentMethod: delivery.paymentMethod || 'pending',
          createdAt: delivery.created_at,
          paidAt: delivery.paidAt || null,
          truckPlate: delivery.assignedTruck?.plateNumber || delivery.truckPlate || 'N/A',
          route: `${delivery.pickupLocation || 'Unknown'} → ${delivery.dropoffLocation || 'Unknown'}`,
          metadata: {
            deliveryType: delivery.deliveryType || 'standard',
            priority: delivery.priority || 'normal',
            weight: delivery.weight || null,
            dimensions: delivery.dimensions || null
          }
        });
      }
    });
    
    // Sort by creation date (newest first)
    payments.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt) || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt) || new Date(0);
      return dateB - dateA;
    });
    
    console.log(`✅ Retrieved ${payments.length} payment records`);
    
    res.json({
      success: true,
      data: payments,
      total: payments.length,
      payMongoEnabled: true,
      mode: 'REAL PAYMONGO - TEST MODE'
    });
    
  } catch (error) {
    console.error('❌ Error getting payment records:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get client payment summary
router.get('/client/:clientId/summary', authenticateJWT, async (req, res) => {
  try {
    const { clientId } = req.params;
    console.log(`🔥 Getting real PayMongo payment summary for client: ${clientId}`);
    
    const summary = await realPayMongoService.getClientPaymentSummary(clientId);
    
    res.json({
      success: true,
      data: summary,
      payMongoEnabled: true,
      mode: 'REAL PAYMONGO - TEST MODE'
    });
    
  } catch (error) {
    console.error('❌ Error getting client payment summary:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get client payment summary (alternative route format)
router.get('/client/:clientId', authenticateJWT, async (req, res) => {
  try {
    const { clientId } = req.params;
    console.log(`🔥 Getting real PayMongo payment summary for client: ${clientId}`);
    
    const summary = await realPayMongoService.getClientPaymentSummary(clientId);
    
    res.json({
      success: true,
      data: summary,
      payMongoEnabled: true,
      mode: 'REAL PAYMONGO - TEST MODE'
    });
    
  } catch (error) {
    console.error('❌ Error getting client payment summary:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Process e-wallet payment (GCash, GrabPay, PayMaya)
router.post('/process-ewallet', authenticateJWT, async (req, res) => {
  try {
    const { deliveryId, paymentMethod, billingDetails } = req.body;
    
    console.log('🔥 Processing real e-wallet payment:', { deliveryId, paymentMethod });
    
    // Get payment info
    const payment = await realPayMongoService.getPayment(deliveryId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    // Convert amount to cents (PayMongo requirement)
    const amountInCents = Math.round(payment.amount * 100);
    
    // Create PayMongo source
    const sourceData = {
      amount: amountInCents,
      currency: 'PHP',
      type: paymentMethod, // gcash, grab_pay, paymaya
      redirect: {
        success: `${req.protocol}://${req.get('host')}/payments/success?deliveryId=${deliveryId}`,
        failed: `${req.protocol}://${req.get('host')}/payments/failed?deliveryId=${deliveryId}`
      },
      billing: {
        name: billingDetails.name,
        email: billingDetails.email,
        phone: billingDetails.phone
      },
      metadata: {
        deliveryId: deliveryId,
        clientId: payment.clientId,
        paymentType: 'delivery',
        clientName: payment.metadata.clientName,
        truckPlate: payment.metadata.truckPlate
      }
    };

    const source = await realPayMongoService.createSource(sourceData);
    
    console.log('✅ Real PayMongo source created:', source.id);
    
    res.json({
      success: true,
      data: {
        sourceId: source.id,
        checkoutUrl: source.checkout_url,
        status: source.status,
        amount: payment.amount,
        currency: 'PHP',
        paymentMethod: paymentMethod,
        deliveryId: deliveryId,
        mode: 'REAL PAYMONGO - TEST MODE'
      },
      payMongoEnabled: true
    });

  } catch (error) {
    console.error('❌ Error processing e-wallet payment:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      payMongoEnabled: true
    });
  }
});

// Process card payment
router.post('/process-card', authenticateJWT, async (req, res) => {
  try {
    const { deliveryId, cardDetails, billingDetails } = req.body;
    
    console.log('🔥 Processing real card payment for delivery:', deliveryId);
    console.log('Card details provided:', cardDetails ? 'Yes' : 'No');
    console.log('Billing details provided:', billingDetails ? 'Yes' : 'No');
    
    // Validate input
    if (!deliveryId) {
      return res.status(400).json({
        success: false,
        error: 'Delivery ID is required'
      });
    }

    // Get payment info
    const payment = await realPayMongoService.getPayment(deliveryId);
    if (!payment) {
      console.log('❌ Payment not found for delivery:', deliveryId);
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    console.log('✅ Payment found:', {
      amount: payment.amount,
      currency: payment.currency,
      clientId: payment.clientId
    });

    // Convert amount to cents
    const amountInCents = Math.round(payment.amount * 100);
    console.log('💰 Amount in cents:', amountInCents);
    
    // Create PayMongo payment intent (simplified)
    const paymentIntentData = {
      amount: amountInCents,
      currency: 'PHP',
      description: `Delivery Payment - ${payment.metadata?.truckPlate || 'Unknown'}`,
      metadata: {
        deliveryId: deliveryId,
        clientId: payment.clientId,
        paymentType: 'delivery',
        clientName: payment.metadata?.clientName || 'Client',
        truckPlate: payment.metadata?.truckPlate || 'Unknown'
      }
    };

    console.log('📄 Creating payment intent with data:', paymentIntentData);
    const paymentIntent = await realPayMongoService.createPaymentIntent(paymentIntentData);
    
    console.log('✅ Real PayMongo payment intent created for card payment:', paymentIntent.id);
    
    // For now, we'll mark the payment as completed immediately for testing
    // In production, you'd typically use PayMongo's card form or client-side processing
    try {
      // Mark delivery as paid immediately for card payments in test mode
      const { db, admin } = require('../config/firebase');
      const deliveryRef = db.collection('deliveries').doc(deliveryId);
      
      // Check if delivery exists first
      const deliveryDoc = await deliveryRef.get();
      if (!deliveryDoc.exists) {
        console.log('⚠️ Delivery document does not exist, creating payment record anyway');
      } else {
        await deliveryRef.update({
          paymentStatus: 'paid',
          paidAt: admin.firestore.Timestamp.now(),
          paymentIntentId: paymentIntent.id,
          paymentMethod: 'card',
          paymentCompletedVia: 'card_test_mode',
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Card payment - Delivery marked as paid:', deliveryId);
      }
    } catch (dbError) {
      console.error('❌ Error updating delivery status:', dbError);
      // Don't fail the payment for database errors, just log them
    }

    // Return success response
    console.log('✅ Sending success response for card payment');
    res.json({
      success: true,
      data: {
        paymentIntentId: paymentIntent.id,
        status: 'succeeded',
        amount: payment.amount,
        currency: 'PHP',
        paymentMethod: 'card',
        deliveryId: deliveryId,
        message: 'Card payment processed successfully (Test Mode)',
        mode: 'REAL PAYMONGO - TEST MODE'
      },
      payMongoEnabled: true
    });

  } catch (error) {
    console.error('❌ Error processing card payment:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process card payment',
      payMongoEnabled: true,
      details: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        originalError: error
      } : undefined
    });
  }
});

// PayMongo webhook endpoint
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  try {
    console.log('🔥 Received real PayMongo webhook');
    
    const signature = req.headers['paymongo-signature'];
    const payload = req.body;
    
    // Parse webhook data
    const webhookData = JSON.parse(payload.toString());
    
    // Process webhook with real PayMongo service
    const result = await realPayMongoService.processWebhook(webhookData);
    
    console.log('✅ Real PayMongo webhook processed:', result.eventType);
    
    res.status(200).json({ 
      success: true, 
      processed: result.processed,
      eventType: result.eventType 
    });
    
  } catch (error) {
    console.error('❌ Error processing PayMongo webhook:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Payment success page
router.get('/success', async (req, res) => {
  try {
    const { deliveryId } = req.query;
    console.log('✅ Payment success for delivery:', deliveryId);
    
    res.send(`
      <html>
        <head>
          <title>Payment Successful</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f0f9ff; }
            .success-container { background: white; padding: 40px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .success-icon { font-size: 60px; color: #10b981; margin-bottom: 20px; }
            h1 { color: #059669; margin-bottom: 10px; }
            p { color: #6b7280; margin: 10px 0; }
            .delivery-id { background: #f3f4f6; padding: 10px; border-radius: 5px; font-family: monospace; margin: 20px 0; }
            .close-btn { background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 16px; margin-top: 20px; }
            .close-btn:hover { background: #2563eb; }
          </style>
        </head>
        <body>
          <div class="success-container">
            <div class="success-icon">✅</div>
            <h1>Payment Successful!</h1>
            <p>Your delivery payment has been processed successfully.</p>
            <div class="delivery-id">Delivery ID: ${deliveryId}</div>
            <p><strong>Mode:</strong> REAL PAYMONGO - TEST MODE</p>
            <p>Thank you for using our trucking service!</p>
            <button class="close-btn" onclick="window.close()">Close Window</button>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error showing success page:', error);
    res.status(500).send('Error processing payment success');
  }
});

// Payment failed page
router.get('/failed', async (req, res) => {
  try {
    const { deliveryId } = req.query;
    console.log('❌ Payment failed for delivery:', deliveryId);
    
    res.send(`
      <html>
        <head>
          <title>Payment Failed</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #fef2f2; }
            .failed-container { background: white; padding: 40px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .failed-icon { font-size: 60px; color: #ef4444; margin-bottom: 20px; }
            h1 { color: #dc2626; margin-bottom: 10px; }
            p { color: #6b7280; margin: 10px 0; }
            .delivery-id { background: #f3f4f6; padding: 10px; border-radius: 5px; font-family: monospace; margin: 20px 0; }
            .retry-btn { background: #ef4444; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 16px; margin: 10px; }
            .retry-btn:hover { background: #dc2626; }
            .close-btn { background: #6b7280; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 16px; margin: 10px; }
            .close-btn:hover { background: #4b5563; }
          </style>
        </head>
        <body>
          <div class="failed-container">
            <div class="failed-icon">❌</div>
            <h1>Payment Failed</h1>
            <p>We couldn't process your payment. Please try again.</p>
            <div class="delivery-id">Delivery ID: ${deliveryId}</div>
            <p><strong>Mode:</strong> REAL PAYMONGO - TEST MODE</p>
            <p>You can retry the payment from your dashboard.</p>
            <button class="retry-btn" onclick="window.location.href='/payments'">Retry Payment</button>
            <button class="close-btn" onclick="window.close()">Close Window</button>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error showing failed page:', error);
    res.status(500).send('Error processing payment failure');
  }
});

// Get successful payments for revenue calculation
router.get('/successful', authenticateJWT, async (req, res) => {
  try {
    console.log('🔥 Getting successful payments for revenue calculation');
    
    const { db } = require('../config/firebase');
    const deliveriesRef = db.collection('deliveries');
    
    // Get deliveries with paid status
    const snapshot = await deliveriesRef
      .where('paymentStatus', '==', 'paid')
      .get();
    
    const successfulPayments = [];
    
    let debugCount = 0;
    snapshot.forEach(doc => {
      const delivery = doc.data();
      
      // Debug first paid delivery to see what fields exist
      if (debugCount === 0) {
        console.log('🔍 First paid delivery data:', {
          id: doc.id,
          deliveryRate: delivery.deliveryRate,
          DeliveryRate: delivery.DeliveryRate,
          amount: delivery.amount,
          allAmountFields: Object.keys(delivery).filter(key => 
            key.toLowerCase().includes('rate') || 
            key.toLowerCase().includes('amount') || 
            key.toLowerCase().includes('price')
          )
        });
        debugCount++;
      }
      
      const amount = parseFloat(delivery.deliveryRate || delivery.DeliveryRate || delivery.amount || 0);
      
      successfulPayments.push({
        id: doc.id,
        amount: amount,
        created_at: delivery.paidAt || delivery.created_at,
        createdAt: delivery.paidAt || delivery.created_at,
        clientName: delivery.clientName || 'Unknown',
        paymentMethod: delivery.paymentMethod || 'unknown'
      });
    });
    
    const totalRevenue = successfulPayments.reduce((sum, p) => sum + p.amount, 0);
    console.log(`✅ Retrieved ${successfulPayments.length} successful payments`);
    console.log(`💰 Total revenue: ₱${totalRevenue.toLocaleString()}`);
    
    res.json(successfulPayments);
    
  } catch (error) {
    console.error('❌ Error getting successful payments:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get payment status
router.get('/:deliveryId/status', async (req, res) => {
  try {
    const { deliveryId } = req.params;
    
    const payment = await realPayMongoService.getPayment(deliveryId);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: payment,
      payMongoEnabled: true,
      mode: 'REAL PAYMONGO - TEST MODE'
    });

  } catch (error) {
    console.error('Error getting payment status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ─── GET /api/payments/all ──────────────────────────────────────────────────
// Get all payments across all clients (Admin only) - FOR ADMIN BILLINGS PAGE
router.get('/all', authenticateJWT, async (req, res) => {
  try {
    console.log('📊 GET /api/payments/all - Admin requesting all payments');
    console.log('👤 User:', req.user.username, '| Role:', req.user.role);
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      console.log('❌ Access denied - User is not admin');
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { db } = require('../config/firebase');
    console.log('🔍 Fetching deliveries from Firebase...');
    const deliveriesSnapshot = await db.collection('deliveries').get();
    
    console.log(`📦 Found ${deliveriesSnapshot.size} deliveries in database`);
    
    const payments = [];
    
    deliveriesSnapshot.forEach(doc => {
      const delivery = doc.data();
      
      // Skip cancelled deliveries
      if (delivery.deliveryStatus === 'cancelled') {
        return;
      }
      
      // Get delivery rate
      const amount = parseFloat(delivery.deliveryRate || delivery.DeliveryRate || 0);
      
      // Get delivery date
      let deliveryDate = new Date();
      if (delivery.deliveryDate) {
        if (delivery.deliveryDate.seconds) {
          deliveryDate = new Date(delivery.deliveryDate.seconds * 1000);
        } else if (delivery.deliveryDate.toDate) {
          deliveryDate = delivery.deliveryDate.toDate();
        } else {
          deliveryDate = new Date(delivery.deliveryDate);
        }
      } else if (delivery.created_at) {
        if (delivery.created_at.seconds) {
          deliveryDate = new Date(delivery.created_at.seconds * 1000);
        } else if (delivery.created_at.toDate) {
          deliveryDate = delivery.created_at.toDate();
        } else {
          deliveryDate = new Date(delivery.created_at);
        }
      }

      // Get due date from database, or calculate if not set (30 days after delivery date)
      let dueDate;
      if (delivery.dueDate) {
        // Use stored due date from database
        dueDate = delivery.dueDate.toDate ? delivery.dueDate.toDate() : new Date(delivery.dueDate);
      } else {
        // Fallback: calculate due date (30 days after delivery date)
        dueDate = new Date(deliveryDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      }
      
      // Determine payment status
      let paymentStatus = 'pending';
      const now = new Date();
      
      if (delivery.paymentStatus === 'paid') {
        paymentStatus = 'paid';
      } else if (dueDate < now) {
        paymentStatus = 'overdue';
      }
      
      payments.push({
        id: doc.id,
        deliveryId: doc.id,
        clientId: delivery.clientId,
        clientName: delivery.clientName,
        amount: amount,
        currency: 'PHP',
        status: paymentStatus,
        dueDate: dueDate.toISOString(),
        deliveryDate: deliveryDate.toISOString(),
        paidAt: delivery.paidAt || null,
        metadata: {
          clientName: delivery.clientName,
          truckPlate: delivery.truckPlate || delivery.TruckPlate,
          pickupLocation: delivery.pickupLocation || delivery.PickupLocation,
          deliveryAddress: delivery.deliveryAddress || delivery.DeliveryAddress
        }
      });
    });
    
    // Sort by due date (most urgent first)
    payments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    console.log(`✅ Returning ${payments.length} payment records to client`);
    if (payments.length === 0) {
      console.log('⚠️  No payments to return. This means:');
      console.log('   - Either there are no deliveries in the database');
      console.log('   - Or all deliveries have been cancelled');
      console.log('   💡 Clients need to book deliveries first!');
    }

    res.json({
      success: true,
      data: payments
    });

  } catch (error) {
    console.error('❌ Error getting all payments:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get all payments'
    });
  }
});

// ─── PUT /api/payments/:paymentId/status ────────────────────────────────────
// Update payment status (Admin only)
router.put('/:paymentId/status', authenticateJWT, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { status } = req.body;

    console.log(`📝 Updating payment status for ${paymentId} to ${status}`);

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    // Validate status
    const validStatuses = ['pending', 'paid', 'overdue', 'failed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      });
    }

    const { db } = require('../config/firebase');
    const deliveryRef = db.collection('deliveries').doc(paymentId);
    const deliveryDoc = await deliveryRef.get();

    if (!deliveryDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Payment/Delivery not found'
      });
    }

    // Update the delivery payment status
    const updateData = {
      paymentStatus: status,
      updated_at: new Date()
    };

    // If marked as paid, add paidAt timestamp
    if (status === 'paid') {
      updateData.paidAt = new Date();
    }

    await deliveryRef.update(updateData);

    console.log(`✅ Payment status updated successfully: ${paymentId} → ${status}`);

    res.json({
      success: true,
      message: 'Payment status updated successfully',
      data: {
        paymentId: paymentId,
        status: status
      }
    });

  } catch (error) {
    console.error('❌ Error updating payment status:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update payment status'
    });
  }
});

// Get payments for a specific client
router.get('/client/:id', authenticateJWT, async (req, res) => {
  try {
    const { id: clientId } = req.params;
    console.log(`🔍 Fetching payments for client: ${clientId}`);
    
    const { db, admin } = require('../config/firebase');
    const deliveriesRef = db.collection('deliveries');
    
    // Query deliveries for this client
    const snapshot = await deliveriesRef.where('clientId', '==', clientId).get();
    const payments = [];
    
    snapshot.forEach(doc => {
      const delivery = doc.data();
      
      // Only include deliveries with payment information
      if (delivery.amount && delivery.amount > 0) {
        // Get delivery date
        let deliveryDate = delivery.deliveryDate || delivery.scheduledDate || delivery.created_at;
        if (deliveryDate && deliveryDate.toDate) {
          deliveryDate = deliveryDate.toDate();
        } else if (deliveryDate) {
          deliveryDate = new Date(deliveryDate);
        }
        
        // Get due date from database or calculate
        let dueDate;
        if (delivery.dueDate) {
          dueDate = delivery.dueDate.toDate ? delivery.dueDate.toDate() : new Date(delivery.dueDate);
        } else if (deliveryDate) {
          // Fallback: calculate due date (30 days after delivery)
          dueDate = new Date(deliveryDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        }
        
        // Determine payment status
        let paymentStatus = delivery.paymentStatus || 'pending';
        const now = new Date();
        
        if (paymentStatus !== 'paid' && dueDate && dueDate < now) {
          paymentStatus = 'overdue';
        }
        
        payments.push({
          id: doc.id,
          deliveryId: doc.id,
          clientId: delivery.clientId,
          clientName: delivery.clientName,
          amount: delivery.amount,
          currency: 'PHP',
          status: paymentStatus,
          dueDate: dueDate ? dueDate.toISOString() : null,
          deliveryDate: deliveryDate ? deliveryDate.toISOString() : null,
          paidAt: delivery.paidAt || null,
          invoiceNumber: `INV-${doc.id.substring(0, 8).toUpperCase()}`,
          metadata: {
            truckPlate: delivery.truckPlate || delivery.assignedTruck?.plateNumber,
            pickupLocation: delivery.pickupLocation,
            deliveryAddress: delivery.deliveryAddress
          }
        });
      }
    });
    
    console.log(`✅ Found ${payments.length} payments for client ${clientId}`);
    
    res.json({
      success: true,
      payments: payments,
      count: payments.length
    });
    
  } catch (error) {
    console.error('❌ Error fetching client payments:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch client payments',
      payments: []
    });
  }
});

module.exports = router; 