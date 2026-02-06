const { db, admin } = require('../config/firebase');

class PaymentService {
  constructor() {
    this.db = db;
    this.admin = admin;
    this.isTestMode = true; // ALWAYS USE TEST MODE - NO REAL PAYMENTS
    console.log('⚠️  PaymentService initialized in TEST MODE - No real payments will be processed');
  }

  // Get client payment summary
  async getClientPaymentSummary(userId) {
    try {
      console.log(`Getting payment summary for user: ${userId}`);

      // Get deliveries for this user
      const deliveriesSnapshot = await this.db.collection('deliveries')
        .where('clientId', '==', userId)
        .get();

      if (deliveriesSnapshot.empty) {
        console.log('No deliveries found for user:', userId);
        return {
          totalDeliveries: 0,
          totalAmountDue: 0,
          totalAmountPaid: 0,
          pendingPayments: 0,
          overduePayments: 0,
          paidPayments: 0,
          canBookTrucks: true, // If no deliveries, user can book trucks
          payments: [], // Frontend expects "payments" not "deliveries"
          hasDeliveriesWithoutPayments: false,
          deliveriesFound: 0,
          testMode: this.isTestMode
        };
      }

      console.log(`Found ${deliveriesSnapshot.size} deliveries for user ${userId}`);

      const payments = []; // Changed from "deliveries" to "payments"
      let totalAmountDue = 0;
      let totalAmountPaid = 0;
      let overdueAmount = 0;
      let pendingPayments = 0;
      let overduePayments = 0;
      let paidPayments = 0;

      deliveriesSnapshot.forEach(doc => {
        const delivery = doc.data();
        const deliveryId = doc.id;

        // Skip cancelled deliveries - they should not be billed
        if (delivery.deliveryStatus === 'cancelled' || delivery.paymentStatus === 'cancelled') {
          console.log('ℹ️ TEST MODE: Skipping cancelled delivery from payment summary:', deliveryId);
          return;
        }

        // Get delivery rate (amount)
        const amount = parseFloat(delivery.deliveryRate || delivery.DeliveryRate || 98);

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
          // Fallback to creation date if delivery date not set
          if (delivery.created_at.seconds) {
            deliveryDate = new Date(delivery.created_at.seconds * 1000);
          } else if (delivery.created_at.toDate) {
            deliveryDate = delivery.created_at.toDate();
          } else {
            deliveryDate = new Date(delivery.created_at);
          }
        }

        // Calculate due date (30 days after delivery date or immediately for pending deliveries)
        let dueDate;
        if (delivery.deliveryStatus === 'completed') {
          dueDate = new Date(deliveryDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        } else {
          // For pending deliveries, make them payable immediately but due in 30 days
          dueDate = new Date(deliveryDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        }

        // Determine payment status - Allow payment for all deliveries regardless of completion status
        let paymentStatus = 'pending';
        const now = new Date();

        // Check if payment has been made or is pending verification
        if (delivery.paymentStatus === 'paid') {
          paymentStatus = 'paid';
        } else if (delivery.paymentStatus === 'pending_verification') {
          // Preserve pending_verification status - has uploaded proof awaiting admin approval
          paymentStatus = 'pending_verification';
        } else if (dueDate < now) {
          // Any unpaid delivery past due date is overdue
          paymentStatus = 'overdue';
        } else {
          paymentStatus = 'pending'; // All non-overdue deliveries are pending payment
        }

        const paymentInfo = {
          id: deliveryId, // Use delivery ID as payment ID for now
          deliveryId,
          amount,
          currency: 'PHP',
          status: paymentStatus,
          dueDate: dueDate.toISOString(),
          deliveryDate: deliveryDate.toISOString(),
          createdAt: delivery.created_at ? (delivery.created_at.seconds ? new Date(delivery.created_at.seconds * 1000).toISOString() : new Date(delivery.created_at).toISOString()) : deliveryDate.toISOString(),
          transactionFee: 0, // No transaction fee for now
          testMode: this.isTestMode, // Mark as test payment
          proofId: delivery.proofId || null,
          proofStatus: delivery.proofStatus || null,
          metadata: {
            clientName: delivery.clientName || 'Client',
            truckPlate: delivery.truckPlate || 'Unknown',
            pickupLocation: delivery.pickupLocation || 'Unknown',
            deliveryAddress: delivery.deliveryAddress || delivery.dropoffLocation || 'Unknown',
            deliveryStatus: delivery.deliveryStatus || 'pending'
          }
        };

        payments.push(paymentInfo);

        if (paymentStatus === 'pending') {
          pendingPayments++;
          totalAmountDue += amount;
        } else if (paymentStatus === 'pending_verification') {
          // Count as pending since it's awaiting approval (not yet paid)
          pendingPayments++;
          totalAmountDue += amount;
        } else if (paymentStatus === 'overdue') {
          overduePayments++;
          totalAmountDue += amount;
          overdueAmount += amount; // Add to overdue amount
        } else if (paymentStatus === 'paid') {
          paidPayments++;
          totalAmountPaid += amount;
        }
      });

      const summary = {
        totalDeliveries: payments.length,
        totalAmountDue,
        totalAmountPaid,
        overdueAmount,
        pendingPayments,
        overduePayments,
        paidPayments,
        canBookTrucks: overduePayments === 0, // Can book trucks if no overdue payments
        payments: payments.sort((a, b) => new Date(b.deliveryDate) - new Date(a.deliveryDate)), // Frontend expects "payments"
        hasDeliveriesWithoutPayments: payments.length > 0, // Show generate button if we have deliveries
        deliveriesFound: payments.length,
        testMode: this.isTestMode // Indicate this is test mode
      };

      console.log('Payment summary generated:', summary);
      return summary;

    } catch (error) {
      console.error('Error getting client payment summary:', error);
      throw error;
    }
  }

  // Get a payment record from database
  async getPayment(paymentId) {
    try {
      // Since we're treating delivery IDs as payment IDs, get the delivery record
      const deliveryRef = this.db.collection('deliveries').doc(paymentId);
      const deliveryDoc = await deliveryRef.get();

      if (!deliveryDoc.exists) {
        return null;
      }

      const delivery = deliveryDoc.data();

      // Convert delivery to payment format
      return {
        id: paymentId,
        deliveryId: paymentId,
        amount: parseFloat(delivery.deliveryRate || delivery.DeliveryRate || 98),
        currency: 'PHP',
        status: delivery.paymentStatus || 'pending',
        clientId: delivery.clientId,
        testMode: this.isTestMode, // Mark as test payment
        metadata: {
          clientName: delivery.clientName,
          truckPlate: delivery.truckPlate,
          pickupLocation: delivery.pickupLocation,
          deliveryAddress: delivery.deliveryAddress || delivery.dropoffLocation
        }
      };
    } catch (error) {
      console.error('Error getting payment:', error);
      throw new Error('Failed to retrieve payment record');
    }
  }

  // Mark a payment as paid in the database (TEST MODE)
  async markPaymentAsPaid(paymentId, paymentDetails) {
    try {
      console.log('🧪 TEST MODE: Simulating payment completion for payment:', paymentId);

      // Update the delivery record with payment information
      const deliveryRef = this.db.collection('deliveries').doc(paymentId);

      await deliveryRef.update({
        paymentStatus: 'paid',
        paidAt: this.admin.firestore.Timestamp.fromDate(new Date(paymentDetails.paidAt)),
        paymentIntentId: paymentDetails.paymentIntentId,
        paymentMethodId: paymentDetails.paymentMethodId,
        paymentDetails: {
          ...paymentDetails.paymentDetails,
          testMode: true,
          simulatedPayment: true
        },
        updated_at: this.admin.firestore.FieldValue.serverTimestamp()
      });

      console.log('✅ TEST MODE: Payment marked as paid successfully');
      return true;
    } catch (error) {
      console.error('Error marking payment as paid:', error);
      throw new Error('Failed to update payment status');
    }
  }

  // Cancel a payment when delivery is cancelled (TEST MODE)
  async cancelPayment(deliveryId) {
    try {
      console.log('🧪 TEST MODE: Cancelling payment for delivery:', deliveryId);

      // In test mode, we just update the delivery record
      const deliveryRef = this.db.collection('deliveries').doc(deliveryId);
      const deliveryDoc = await deliveryRef.get();

      if (!deliveryDoc.exists) {
        throw new Error('Delivery not found');
      }

      const delivery = deliveryDoc.data();

      // Check if payment was already paid
      if (delivery.paymentStatus === 'paid') {
        console.log('⚠️ TEST MODE: Cannot cancel already paid payment for delivery:', deliveryId);
        return {
          success: false,
          message: 'Cannot cancel payment that has already been paid',
          paymentStatus: 'paid'
        };
      }

      // Update delivery payment status to cancelled
      await deliveryRef.update({
        paymentStatus: 'cancelled',
        paymentCancelledAt: this.admin.firestore.FieldValue.serverTimestamp(),
        cancellationReason: 'Delivery cancelled',
        testMode: true,
        updated_at: this.admin.firestore.FieldValue.serverTimestamp()
      });

      console.log('✅ TEST MODE: Payment cancelled successfully for delivery:', deliveryId);
      return {
        success: true,
        message: 'Payment cancelled successfully',
        testMode: true,
        cancelledPayments: [{
          paymentId: deliveryId,
          amount: parseFloat(delivery.deliveryRate || delivery.DeliveryRate || 98),
          currency: 'PHP'
        }]
      };

    } catch (error) {
      console.error('❌ TEST MODE: Error cancelling payment:', error);
      throw new Error(`Failed to cancel payment: ${error.message}`);
    }
  }

  // Update payment with source information for e-wallet payments (TEST MODE)
  async updatePaymentSource(paymentId, sourceData) {
    try {
      console.log('🧪 TEST MODE: Updating payment source for payment:', paymentId);

      // Update the delivery record with source information
      const deliveryRef = this.db.collection('deliveries').doc(paymentId);

      await deliveryRef.update({
        sourceId: sourceData.sourceId,
        sourceType: sourceData.sourceType,
        paymentStatus: sourceData.status,
        testPaymentSource: true, // Mark as test
        updated_at: this.admin.firestore.FieldValue.serverTimestamp()
      });

      console.log('✅ TEST MODE: Payment source updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating payment source:', error);
      throw new Error('Failed to update payment source');
    }
  }

  // Create a source for e-wallet payments (TEST MODE ONLY)
  async createSource(sourceData) {
    try {
      console.log('🧪 TEST MODE: Creating mock e-wallet source for:', sourceData.type);

      // Return a simulated source since we're in test mode
      const mockSource = {
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

      console.log('✅ TEST MODE: Mock e-wallet source created:', mockSource);
      return mockSource;
    } catch (error) {
      console.error('Error creating test source:', error);
      throw new Error('Failed to create test payment source');
    }
  }

  // Create payment intent (TEST MODE)
  async createPaymentIntent(deliveryId, amount) {
    try {
      console.log('🧪 TEST MODE: Creating payment intent for delivery:', deliveryId);
      return {
        paymentId: 'pi_test_' + Date.now(),
        deliveryId,
        amount,
        currency: 'PHP',
        status: 'requires_payment_method',
        testMode: true
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw new Error('Failed to create payment intent');
    }
  }

  // Process payment completion (TEST MODE)
  async processPaymentCompletion(paymentIntentId) {
    try {
      console.log('🧪 TEST MODE: Processing payment completion for:', paymentIntentId);
      return {
        status: 'succeeded',
        paymentIntentId,
        testMode: true,
        message: 'Test payment completed successfully'
      };
    } catch (error) {
      console.error('Error processing payment completion:', error);
      throw new Error('Failed to process payment completion');
    }
  }

  // Check if client can book trucks (TEST MODE)
  async canClientBookTrucks(clientId) {
    try {
      console.log('🧪 TEST MODE: Checking booking eligibility for:', clientId);
      const summary = await this.getClientPaymentSummary(clientId);
      // Can book if no overdue payments
      return summary.overduePayments === 0;
    } catch (error) {
      console.error('Error checking booking eligibility:', error);
      return false; // Default to not allowing booking if there's an error
    }
  }

  // Create payment link (TEST MODE)
  async createPaymentLink(paymentId) {
    try {
      console.log('🧪 TEST MODE: Creating payment link for:', paymentId);
      return {
        paymentLinkId: 'pl_test_' + Date.now(),
        checkoutUrl: `https://demo.paymongo.com/test-checkout?payment_id=${paymentId}`,
        testMode: true
      };
    } catch (error) {
      console.error('Error creating payment link:', error);
      throw new Error('Failed to create payment link');
    }
  }

  // Process webhook (TEST MODE)
  async processWebhook(webhookData) {
    try {
      console.log('🧪 TEST MODE: Processing webhook:', webhookData);
      return {
        processed: true,
        testMode: true,
        message: 'Webhook processed in test mode'
      };
    } catch (error) {
      console.error('Error processing webhook:', error);
      throw new Error('Failed to process webhook');
    }
  }

  // Get overdue payments (TEST MODE)
  async getOverduePayments() {
    try {
      console.log('🧪 TEST MODE: Getting overdue payments');
      return []; // Return empty array for test mode
    } catch (error) {
      console.error('Error getting overdue payments:', error);
      throw new Error('Failed to get overdue payments');
    }
  }

  // Update client payment status (TEST MODE)
  async updateClientPaymentStatus(clientId) {
    try {
      console.log('🧪 TEST MODE: Updating client payment status for:', clientId);
      return {
        clientId,
        hasOverduePayments: false,
        overdueCount: 0,
        testMode: true
      };
    } catch (error) {
      console.error('Error updating client payment status:', error);
      throw new Error('Failed to update client payment status');
    }
  }

  // Get payment intent (TEST MODE)
  async getPaymentIntent(paymentIntentId) {
    try {
      console.log('🧪 TEST MODE: Getting payment intent:', paymentIntentId);
      return {
        id: paymentIntentId,
        status: 'succeeded',
        testMode: true
      };
    } catch (error) {
      console.error('Error getting payment intent:', error);
      throw new Error('Failed to get payment intent');
    }
  }

  // Get source (TEST MODE)
  async getSource(sourceId) {
    try {
      console.log('🧪 TEST MODE: Getting source:', sourceId);
      return {
        id: sourceId,
        status: 'chargeable',
        testMode: true
      };
    } catch (error) {
      console.error('Error getting source:', error);
      throw new Error('Failed to get source');
    }
  }
}

module.exports = new PaymentService(); 