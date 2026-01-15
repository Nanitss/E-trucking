// Standalone e-wallet payment test server (no Firebase)
const express = require('express');
const app = express();

// Mock PaymentService for testing (no Firebase required)
class MockPaymentService {
  constructor() {
    this.isTestMode = true;
    console.log('🧪 Mock PaymentService initialized - TEST MODE ONLY');
  }

  async createSource(sourceData) {
    console.log('🧪 Creating mock e-wallet source for:', sourceData.type);
    return {
      id: 'src_test_' + Date.now(),
      attributes: {
        status: 'pending',
        redirect: {
          checkout_url: `https://demo.paymongo.com/test-checkout?amount=${sourceData.amount}&type=${sourceData.type}&test_mode=true`
        }
      },
      testMode: true,
      simulatedSource: true
    };
  }

  async getPayment(paymentId) {
    console.log('🧪 Getting mock payment for:', paymentId);
    return {
      id: paymentId,
      deliveryId: paymentId,
      amount: 98, // ₱98
      currency: 'PHP',
      status: 'pending',
      clientId: 'j412kdTjjvMNXWdLTHAc',
      testMode: true,
      metadata: {
        clientName: 'Test Client',
        truckPlate: 'TEST-123',
        pickupLocation: 'Test Pickup',
        deliveryAddress: 'Test Delivery'
      }
    };
  }

  async updatePaymentSource(paymentId, sourceData) {
    console.log('🧪 Updating mock payment source for:', paymentId);
    return true;
  }

  async markPaymentAsPaid(paymentId, paymentDetails) {
    console.log('🧪 Marking mock payment as paid:', paymentId);
    return true;
  }

  async getClientPaymentSummary(userId) {
    console.log('🧪 Getting mock payment summary for:', userId);
    return {
      totalDeliveries: 2,
      totalAmountDue: 196,
      totalAmountPaid: 0,
      pendingPayments: 2,
      overduePayments: 0,
      paidPayments: 0,
      canBookTrucks: true,
      testMode: true,
      payments: [
        {
          id: 'T7jIsLWeXa2YujzVyBNM',
          deliveryId: 'T7jIsLWeXa2YujzVyBNM',
          amount: 98,
          currency: 'PHP',
          status: 'pending',
          testMode: true,
          metadata: {
            clientName: 'Test Client',
            truckPlate: 'BAC321',
            pickupLocation: 'San Ildefonso, Bulacan',
            deliveryAddress: 'SM Baliwag'
          }
        },
        {
          id: 'ABC123DEF456',
          deliveryId: 'ABC123DEF456', 
          amount: 98,
          currency: 'PHP',
          status: 'pending',
          testMode: true,
          metadata: {
            clientName: 'Test Client',
            truckPlate: 'ACDC321',
            pickupLocation: 'San Ildefonso, Bulacan',
            deliveryAddress: 'SM Baliwag'
          }
        }
      ]
    };
  }
}

// Mock audit service
const mockAuditService = {
  logPayment: async (userId, action, details) => {
    console.log('🧪 Mock audit log:', action, details);
    return { id: 'audit_' + Date.now() };
  }
};

// Setup Express app
app.use(express.json());

// Mock authentication middleware
app.use((req, res, next) => {
  req.user = { 
    id: 'j412kdTjjvMNXWdLTHAc', 
    username: 'test-user',
    clientName: 'Test Client',
    email: 'test@example.com',
    role: 'client' 
  };
  next();
});

// Initialize mock services
const mockPaymentService = new MockPaymentService();

// Payment Routes (TEST MODE)
// Get payment summary
app.get('/api/payments/client/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    console.log('📋 Getting payment summary for:', clientId);
    
    const summary = await mockPaymentService.getClientPaymentSummary(clientId);
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error getting payment summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment summary'
    });
  }
});

// Process e-wallet payment
app.post('/api/payments/process-ewallet', async (req, res) => {
  try {
    const { paymentId, paymentMethod, redirectUrls } = req.body;
    console.log('📱 Processing e-wallet payment:', { paymentId, paymentMethod });

    if (!paymentId || !paymentMethod || !redirectUrls) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID, payment method, and redirect URLs are required'
      });
    }

    // Get payment
    const payment = await mockPaymentService.getPayment(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Create source
    const source = await mockPaymentService.createSource({
      type: paymentMethod,
      amount: Math.round(payment.amount * 100),
      currency: 'PHP',
      redirect: redirectUrls,
      description: `TEST PAYMENT - Delivery ${payment.deliveryId}`,
      testMode: true
    });

    // Update payment source
    await mockPaymentService.updatePaymentSource(paymentId, {
      sourceId: source.id,
      sourceType: paymentMethod,
      status: 'pending'
    });

    // Log payment attempt
    await mockAuditService.logPayment(req.user.id, 'test_ewallet_payment_initiated', {
      deliveryId: payment.deliveryId,
      amount: payment.amount,
      paymentMethod: paymentMethod,
      sourceId: source.id,
      testMode: true
    });

    console.log('✅ E-wallet payment initiated successfully');

    res.json({
      success: true,
      data: {
        sourceId: source.id,
        redirectUrl: source.attributes.redirect.checkout_url,
        status: source.attributes.status,
        testMode: true,
        message: `🧪 TEST ${paymentMethod.toUpperCase()} PAYMENT - No real money will be charged`,
        amount: payment.amount,
        currency: 'PHP'
      }
    });

  } catch (error) {
    console.error('Error processing e-wallet payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process e-wallet payment'
    });
  }
});

// Process card payment
app.post('/api/payments/process-card', async (req, res) => {
  try {
    const { paymentId, paymentMethod } = req.body;
    console.log('💳 Processing card payment:', { paymentId, paymentMethod });

    if (!paymentId || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID and payment method are required'
      });
    }

    // Get payment
    const payment = await mockPaymentService.getPayment(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Simulate payment completion
    const paymentIntentId = 'pi_test_' + Date.now();
    
    await mockPaymentService.markPaymentAsPaid(paymentId, {
      paymentIntentId: paymentIntentId,
      paymentMethodId: 'pm_test_' + Date.now(),
      paidAt: new Date().toISOString(),
      paymentDetails: { 
        method: 'card', 
        testMode: true,
        note: 'This is a test payment - no real money was charged'
      }
    });

    await mockAuditService.logPayment(req.user.id, 'test_payment_completed', {
      deliveryId: payment.deliveryId,
      amount: payment.amount,
      paymentMethod: 'card',
      paymentIntentId: paymentIntentId,
      testMode: true
    });

    console.log('✅ Card payment completed successfully');

    res.json({
      success: true,
      data: {
        status: 'succeeded',
        paymentIntentId: paymentIntentId,
        message: '🧪 TEST PAYMENT COMPLETED - No real money was charged',
        testMode: true,
        amount: payment.amount,
        currency: 'PHP'
      }
    });

  } catch (error) {
    console.error('Error processing card payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process card payment'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', testMode: true, message: 'Payment test server running' });
});

// Start server
const PORT = 5009;
const server = app.listen(PORT, () => {
  console.log('\n🚀 E-Wallet Payment Test Server Started!');
  console.log('=====================================');
  console.log(`✅ Server running on: http://localhost:${PORT}`);
  console.log('✅ No Firebase dependencies');
  console.log('✅ All payments are TEST MODE only');
  console.log('\n📱 Test E-Wallet Payment:');
  console.log(`POST http://localhost:${PORT}/api/payments/process-ewallet`);
  console.log('Body: {');
  console.log('  "paymentId": "T7jIsLWeXa2YujzVyBNM",');
  console.log('  "paymentMethod": "gcash",');
  console.log('  "redirectUrls": {');
  console.log('    "success": "http://localhost:3000/success",');
  console.log('    "failed": "http://localhost:3000/failed",');
  console.log('    "cancel": "http://localhost:3000/cancel"');
  console.log('  }');
  console.log('}');
  console.log('\n💳 Test Card Payment:');
  console.log(`POST http://localhost:${PORT}/api/payments/process-card`);
  console.log('Body: {');
  console.log('  "paymentId": "T7jIsLWeXa2YujzVyBNM",');
  console.log('  "paymentMethod": "card"');
  console.log('}');
  console.log('\n📋 Test Payment Summary:');
  console.log(`GET http://localhost:${PORT}/api/payments/client/j412kdTjjvMNXWdLTHAc`);
  console.log('\n🏥 Health Check:');
  console.log(`GET http://localhost:${PORT}/health`);
  console.log('\n⚠️  Remember: This is TEST MODE - No real money will be charged!');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down test server...');
  server.close(() => {
    console.log('✅ Test server stopped');
    process.exit(0);
  });
}); 