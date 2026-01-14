const axios = require('axios');

// Import Firebase from the client/server config instead of initializing our own
let admin, db;
try {
  // Try to use the existing Firebase config from client/server
  const firebaseConfig = require('../../client/server/config/firebase');
  admin = firebaseConfig.admin;
  db = firebaseConfig.db;
} catch (error) {
  // Fallback: initialize our own Firebase if the config doesn't exist
  admin = require('firebase-admin');
  
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
  }
  
  db = admin.firestore();
}

class PaymentService {
  constructor() {
    this.paymongoSecretKey = process.env.PAYMONGO_SECRET_KEY;
    this.paymongoPublicKey = process.env.PAYMONGO_PUBLIC_KEY;
    this.baseURL = 'https://api.paymongo.com/v1';
    
    // Set the Firebase instances on the class
    this.admin = admin;
    this.db = db;
  }

  // Create payment intent for delivery
  async createPaymentIntent(deliveryId, amount, currency = 'PHP') {
    try {
      const deliveryDoc = await this.db.collection('deliveries').doc(deliveryId).get();
      if (!deliveryDoc.exists) {
        throw new Error('Delivery not found');
      }

      const delivery = deliveryDoc.data();
      
      // Check if payment already exists for this delivery
      const existingPayment = await this.db.collection('payments')
        .where('deliveryId', '==', deliveryId)
        .where('status', 'in', ['pending', 'paid'])
        .get();

      if (!existingPayment.empty) {
        throw new Error('Payment already exists for this delivery');
      }

      // Create PayMongo payment intent
      const paymentIntentData = {
        data: {
          attributes: {
            amount: Math.round(amount * 100), // PayMongo expects amount in cents
            payment_method_allowed: [
              'card',
              'gcash',
              'grab_pay',
              'paymaya'
            ],
            payment_method_options: {
              card: {
                request_three_d_secure: 'automatic'
              }
            },
            currency: currency,
            description: `Payment for Delivery ${deliveryId}`,
            statement_descriptor: 'TRUCKING_SERVICE',
            metadata: {
              delivery_id: deliveryId,
              client_id: delivery.clientId,
              truck_id: delivery.truckId
            }
          }
        }
      };

      const response = await axios.post(
        `${this.baseURL}/payment_intents`,
        paymentIntentData,
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(this.paymongoSecretKey + ':').toString('base64')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const paymentIntent = response.data.data;

      // Calculate due date (30 days from delivery date)
      const deliveryDate = delivery.deliveryDate.toDate();
      const dueDate = new Date(deliveryDate);
      dueDate.setDate(dueDate.getDate() + 30);

      // Create payment record in database
      const paymentData = {
        deliveryId: deliveryId,
        clientId: delivery.clientId,
        paymentIntentId: paymentIntent.id,
        amount: amount,
        currency: currency,
        status: 'pending',
        dueDate: this.admin.firestore.Timestamp.fromDate(dueDate),
        deliveryDate: delivery.deliveryDate,
        createdAt: this.admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: this.admin.firestore.FieldValue.serverTimestamp(),
        paymentMethod: null,
        transactionFee: 0,
        netAmount: amount,
        metadata: {
          clientName: delivery.clientName,
          truckPlate: delivery.truckPlate,
          pickupLocation: delivery.pickupLocation,
          deliveryAddress: delivery.deliveryAddress
        }
      };

      const paymentRef = await this.db.collection('payments').add(paymentData);

      // Update delivery with payment reference
      await this.db.collection('deliveries').doc(deliveryId).update({
        paymentId: paymentRef.id,
        paymentStatus: 'pending',
        updatedAt: this.admin.firestore.FieldValue.serverTimestamp()
      });

      return {
        paymentId: paymentRef.id,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.attributes.client_key,
        amount: amount,
        dueDate: dueDate,
        status: 'pending'
      };

    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw new Error(error.response?.data?.errors?.[0]?.detail || error.message);
    }
  }

  // Process payment completion
  async processPaymentCompletion(paymentIntentId) {
    try {
      // Get payment intent from PayMongo
      const response = await axios.get(
        `${this.baseURL}/payment_intents/${paymentIntentId}`,
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(this.paymongoSecretKey + ':').toString('base64')}`
          }
        }
      );

      const paymentIntent = response.data.data;
      
      // Find payment record in database
      const paymentSnapshot = await this.db.collection('payments')
        .where('paymentIntentId', '==', paymentIntentId)
        .get();

      if (paymentSnapshot.empty) {
        throw new Error('Payment record not found');
      }

      const paymentDoc = paymentSnapshot.docs[0];
      const paymentData = paymentDoc.data();

      if (paymentIntent.attributes.status === 'succeeded') {
        // Calculate transaction fee (PayMongo fees)
        const transactionFee = this.calculateTransactionFee(
          paymentData.amount,
          paymentIntent.attributes.last_payment_error?.payment_method?.type || 'card'
        );

        // Update payment record
        await paymentDoc.ref.update({
          status: 'paid',
          paidAt: this.admin.firestore.FieldValue.serverTimestamp(),
          paymentMethod: paymentIntent.attributes.last_payment_error?.payment_method?.type || 'unknown',
          transactionFee: transactionFee,
          netAmount: paymentData.amount - transactionFee,
          paymongoPaymentId: paymentIntent.attributes.payments?.[0]?.id,
          updatedAt: this.admin.firestore.FieldValue.serverTimestamp()
        });

        // Update delivery payment status
        await this.db.collection('deliveries').doc(paymentData.deliveryId).update({
          paymentStatus: 'paid',
          updatedAt: this.admin.firestore.FieldValue.serverTimestamp()
        });

        // Check if client has any overdue payments and update client status
        await this.updateClientPaymentStatus(paymentData.clientId);

        return {
          success: true,
          paymentId: paymentDoc.id,
          status: 'paid',
          amount: paymentData.amount,
          transactionFee: transactionFee,
          netAmount: paymentData.amount - transactionFee
        };
      } else {
        // Payment failed
        await paymentDoc.ref.update({
          status: 'failed',
          failureReason: paymentIntent.attributes.last_payment_error?.message || 'Payment failed',
          updatedAt: this.admin.firestore.FieldValue.serverTimestamp()
        });

        return {
          success: false,
          status: 'failed',
          reason: paymentIntent.attributes.last_payment_error?.message || 'Payment failed'
        };
      }

    } catch (error) {
      console.error('Error processing payment completion:', error);
      throw new Error(error.response?.data?.errors?.[0]?.detail || error.message);
    }
  }

  // Calculate transaction fees based on payment method
  calculateTransactionFee(amount, paymentMethod) {
    const fees = {
      'card': 0.035, // 3.5%
      'gcash': 0.025, // 2.5%
      'grab_pay': 0.025, // 2.5%
      'paymaya': 0.025, // 2.5%
      'default': 0.035
    };

    const feeRate = fees[paymentMethod] || fees.default;
    return Math.round(amount * feeRate * 100) / 100; // Round to 2 decimal places
  }

  // Check and update client payment status
  async updateClientPaymentStatus(clientId) {
    try {
      const now = new Date();
      
      // Get all overdue payments for this client
      const overduePayments = await this.db.collection('payments')
        .where('clientId', '==', clientId)
        .where('status', '==', 'pending')
        .where('dueDate', '<', this.admin.firestore.Timestamp.fromDate(now))
        .get();

      const hasOverduePayments = !overduePayments.empty;

      // Update client payment status
      await this.db.collection('clients').doc(clientId).update({
        paymentStatus: hasOverduePayments ? 'overdue' : 'current',
        canBookTrucks: !hasOverduePayments,
        lastPaymentStatusCheck: this.admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: this.admin.firestore.FieldValue.serverTimestamp()
      });

      // Mark overdue payments
      const batch = this.db.batch();
      overduePayments.docs.forEach(doc => {
        batch.update(doc.ref, {
          status: 'overdue',
          overdueAt: this.admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: this.admin.firestore.FieldValue.serverTimestamp()
        });
      });
      await batch.commit();

      return {
        clientId: clientId,
        hasOverduePayments: hasOverduePayments,
        overdueCount: overduePayments.size
      };

    } catch (error) {
      console.error('Error updating client payment status:', error);
      throw error;
    }
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
          deliveriesFound: 0
        };
      }

      console.log(`Found ${deliveriesSnapshot.size} deliveries for user ${userId}`);

      const payments = []; // Changed from "deliveries" to "payments"
      let totalAmountDue = 0;
      let totalAmountPaid = 0;
      let pendingPayments = 0;
      let overduePayments = 0;
      let paidPayments = 0;

      deliveriesSnapshot.forEach(doc => {
        const delivery = doc.data();
        const deliveryId = doc.id;
        
        // Skip cancelled deliveries - they should not be billed
        if (delivery.deliveryStatus === 'cancelled' || delivery.paymentStatus === 'cancelled') {
          console.log('ℹ️ Skipping cancelled delivery from payment summary:', deliveryId);
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
        
        // Check if payment has been made
        if (delivery.paymentStatus === 'paid') {
          paymentStatus = 'paid';
        } else if (delivery.deliveryStatus === 'completed' && dueDate < now) {
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
        } else if (paymentStatus === 'overdue') {
          overduePayments++;
          totalAmountDue += amount;
        } else if (paymentStatus === 'paid') {
          paidPayments++;
          totalAmountPaid += amount;
        }
      });

      const summary = {
        totalDeliveries: payments.length,
        totalAmountDue,
        totalAmountPaid,
        pendingPayments,
        overduePayments,
        paidPayments,
        canBookTrucks: overduePayments === 0, // Can book trucks if no overdue payments
        payments: payments.sort((a, b) => new Date(b.deliveryDate) - new Date(a.deliveryDate)), // Frontend expects "payments"
        hasDeliveriesWithoutPayments: payments.length > 0, // Show generate button if we have deliveries
        deliveriesFound: payments.length
      };

      console.log('Payment summary generated:', summary);
      return summary;

    } catch (error) {
      console.error('Error getting client payment summary:', error);
      throw error;
    }
  }

  // Check if client can book trucks (no overdue payments)
  async canClientBookTrucks(clientId) {
    try {
      const clientDoc = await this.db.collection('clients').doc(clientId).get();
      if (!clientDoc.exists) {
        throw new Error('Client not found');
      }

      const client = clientDoc.data();
      
      // If paymentStatus is not set, check manually
      if (!client.paymentStatus) {
        await this.updateClientPaymentStatus(clientId);
        const updatedClient = await this.db.collection('clients').doc(clientId).get();
        return updatedClient.data().canBookTrucks !== false;
      }

      return client.canBookTrucks !== false;

    } catch (error) {
      console.error('Error checking client booking eligibility:', error);
      throw error;
    }
  }

  // Get overdue payments for admin
  async getOverduePayments() {
    try {
      const now = new Date();
      const overdueSnapshot = await this.db.collection('payments')
        .where('status', 'in', ['pending', 'overdue'])
        .where('dueDate', '<', this.admin.firestore.Timestamp.fromDate(now))
        .get();

      const overduePayments = await Promise.all(
        overdueSnapshot.docs.map(async (doc) => {
          const payment = doc.data();
          const clientDoc = await this.db.collection('clients').doc(payment.clientId).get();
          const deliveryDoc = await this.db.collection('deliveries').doc(payment.deliveryId).get();
          
          return {
            id: doc.id,
            ...payment,
            dueDate: payment.dueDate?.toDate(),
            deliveryDate: payment.deliveryDate?.toDate(),
            createdAt: payment.createdAt?.toDate(),
            daysPastDue: Math.floor((now - payment.dueDate.toDate()) / (1000 * 60 * 60 * 24)),
            client: clientDoc.exists ? clientDoc.data() : null,
            delivery: deliveryDoc.exists ? deliveryDoc.data() : null
          };
        })
      );

      return overduePayments.sort((a, b) => b.daysPastDue - a.daysPastDue);

    } catch (error) {
      console.error('Error getting overdue payments:', error);
      throw error;
    }
  }

  // Create payment link for clients
  async createPaymentLink(paymentId) {
    try {
      const paymentDoc = await this.db.collection('payments').doc(paymentId).get();
      if (!paymentDoc.exists) {
        throw new Error('Payment not found');
      }

      const payment = paymentDoc.data();

      const linkData = {
        data: {
          attributes: {
            amount: Math.round(payment.amount * 100),
            description: `Payment for Delivery ${payment.deliveryId}`,
            remarks: `Trucking service payment - Due: ${payment.dueDate.toDate().toLocaleDateString()}`
          }
        }
      };

      const response = await axios.post(
        `${this.baseURL}/links`,
        linkData,
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(this.paymongoSecretKey + ':').toString('base64')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const paymentLink = response.data.data;

      // Store payment link in payment record
      await paymentDoc.ref.update({
        paymentLinkId: paymentLink.id,
        paymentLinkUrl: paymentLink.attributes.checkout_url,
        updatedAt: this.admin.firestore.FieldValue.serverTimestamp()
      });

      return {
        paymentLinkId: paymentLink.id,
        paymentLinkUrl: paymentLink.attributes.checkout_url,
        amount: payment.amount,
        dueDate: payment.dueDate.toDate()
      };

    } catch (error) {
      console.error('Error creating payment link:', error);
      throw new Error(error.response?.data?.errors?.[0]?.detail || error.message);
    }
  }

  // Process webhook from PayMongo
  async processWebhook(webhookData) {
    try {
      const event = webhookData.data;
      
      if (event.attributes.type === 'payment.paid') {
        const paymentIntentId = event.attributes.data.attributes.payment_intent_id;
        return await this.processPaymentCompletion(paymentIntentId);
      }

      return { success: true, message: 'Webhook processed' };

    } catch (error) {
      console.error('Error processing webhook:', error);
      throw error;
    }
  }

  /**
   * Create a payment method for card payments
   */
  async createPaymentMethod(paymentMethodData) {
    try {
      const response = await axios.post('https://api.paymongo.com/v1/payment_methods', {
        data: {
          attributes: paymentMethodData
        }
      }, {
        headers: this.getAuthHeaders()
      });

      return response.data.data;
    } catch (error) {
      console.error('Error creating payment method:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errors?.[0]?.detail || 'Failed to create payment method');
    }
  }

  /**
   * Create a source for e-wallet payments
   */
  async createSource(sourceData) {
    try {
      const response = await axios.post('https://api.paymongo.com/v1/sources', {
        data: {
          attributes: sourceData
        }
      }, {
        headers: this.getAuthHeaders()
      });

      return response.data.data;
    } catch (error) {
      console.error('Error creating source:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errors?.[0]?.detail || 'Failed to create payment source');
    }
  }

  /**
   * Get a payment intent by ID
   */
  async getPaymentIntent(paymentIntentId) {
    try {
      const response = await axios.get(`https://api.paymongo.com/v1/payment_intents/${paymentIntentId}`, {
        headers: this.getAuthHeaders()
      });

      return response.data.data;
    } catch (error) {
      console.error('Error retrieving payment intent:', error.response?.data || error.message);
      throw new Error('Failed to retrieve payment intent');
    }
  }

  /**
   * Get a source by ID
   */
  async getSource(sourceId) {
    try {
      const response = await axios.get(`https://api.paymongo.com/v1/sources/${sourceId}`, {
        headers: this.getAuthHeaders()
      });

      return response.data.data;
    } catch (error) {
      console.error('Error retrieving source:', error.response?.data || error.message);
      throw new Error('Failed to retrieve payment source');
    }
  }

  /**
   * Get a payment record from database
   */
  async getPayment(paymentId) {
    try {
      const paymentRef = this.db.collection('payments').doc(paymentId);
      const paymentDoc = await paymentRef.get();
      
      if (!paymentDoc.exists) {
        return null;
      }

      return {
        id: paymentDoc.id,
        ...paymentDoc.data()
      };
    } catch (error) {
      console.error('Error getting payment:', error);
      throw new Error('Failed to retrieve payment record');
    }
  }

  /**
   * Mark a payment as paid in the database
   */
  async markPaymentAsPaid(paymentId, paymentDetails) {
    try {
      const paymentRef = this.db.collection('payments').doc(paymentId);
      
      await paymentRef.update({
        status: 'paid',
        paidAt: paymentDetails.paidAt,
        paymentIntentId: paymentDetails.paymentIntentId,
        paymentMethodId: paymentDetails.paymentMethodId,
        paymentDetails: paymentDetails.paymentDetails,
        updatedAt: this.admin.firestore.FieldValue.serverTimestamp()
      });

      // Update the associated delivery status if needed
      const payment = await this.getPayment(paymentId);
      if (payment && payment.deliveryId) {
        const deliveryRef = this.db.collection('deliveries').doc(payment.deliveryId);
        await deliveryRef.update({
          paymentStatus: 'paid',
          paidAt: paymentDetails.paidAt,
          updatedAt: this.admin.firestore.FieldValue.serverTimestamp()
        });
      }

      return true;
    } catch (error) {
      console.error('Error marking payment as paid:', error);
      throw new Error('Failed to update payment status');
    }
  }

  /**
   * Cancel a payment when delivery is cancelled
   */
  async cancelPayment(deliveryId) {
    try {
      console.log('🚫 Cancelling payment for delivery:', deliveryId);
      
      // Check if payment exists for this delivery
      const paymentsSnapshot = await this.db.collection('payments')
        .where('deliveryId', '==', deliveryId)
        .get();

      if (paymentsSnapshot.empty) {
        console.log('ℹ️ No payment found for delivery:', deliveryId);
        
        // Still update delivery payment status to cancelled
        await this.db.collection('deliveries').doc(deliveryId).update({
          paymentStatus: 'cancelled',
          paymentCancelledAt: this.admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: this.admin.firestore.FieldValue.serverTimestamp()
        });
        
        return { success: true, message: 'No payment to cancel for this delivery' };
      }

      // Cancel all payments for this delivery
      const batch = this.db.batch();
      const cancelledPayments = [];

      for (const paymentDoc of paymentsSnapshot.docs) {
        const payment = paymentDoc.data();
        const paymentId = paymentDoc.id;
        
        // Only cancel if payment is not already paid
        if (payment.status !== 'paid') {
          // Cancel PayMongo payment intent if exists
          if (payment.paymentIntentId) {
            try {
              await this.cancelPayMongoPaymentIntent(payment.paymentIntentId);
            } catch (paymongoError) {
              console.warn('⚠️ PayMongo cancellation failed but continuing:', paymongoError.message);
            }
          }

          // Update payment status to cancelled
          batch.update(this.db.collection('payments').doc(paymentId), {
            status: 'cancelled',
            cancelledAt: this.admin.firestore.FieldValue.serverTimestamp(),
            cancellationReason: 'Delivery cancelled',
            updatedAt: this.admin.firestore.FieldValue.serverTimestamp()
          });

          cancelledPayments.push({
            paymentId,
            amount: payment.amount,
            currency: payment.currency || 'PHP'
          });
        } else {
          console.log('⚠️ Cannot cancel already paid payment:', paymentId);
        }
      }

      // Update delivery payment status
      batch.update(this.db.collection('deliveries').doc(deliveryId), {
        paymentStatus: 'cancelled',
        paymentCancelledAt: this.admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: this.admin.firestore.FieldValue.serverTimestamp()
      });

      // Commit all changes
      await batch.commit();

      console.log('✅ Payment cancellation completed for delivery:', deliveryId);
      return {
        success: true,
        message: 'Payment cancelled successfully',
        cancelledPayments
      };

    } catch (error) {
      console.error('❌ Error cancelling payment:', error);
      throw new Error(`Failed to cancel payment: ${error.message}`);
    }
  }

  /**
   * Cancel PayMongo payment intent
   */
  async cancelPayMongoPaymentIntent(paymentIntentId) {
    try {
      // PayMongo doesn't have a direct cancel endpoint for payment intents
      // But we can check if it's already been used
      const paymentIntent = await this.getPaymentIntent(paymentIntentId);
      
      if (paymentIntent.attributes.status === 'awaiting_payment_method' || 
          paymentIntent.attributes.status === 'requires_payment_method') {
        console.log('ℹ️ PayMongo payment intent not yet used, marking as cancelled');
        return { success: true, message: 'Payment intent was not yet used' };
      } else if (paymentIntent.attributes.status === 'succeeded') {
        throw new Error('Cannot cancel a succeeded payment intent');
      }
      
      return { success: true, message: 'PayMongo payment intent handled' };
    } catch (error) {
      console.error('Error cancelling PayMongo payment intent:', error);
      throw error;
    }
  }

  /**
   * Update payment with source information
   */
  async updatePaymentSource(paymentId, sourceData) {
    try {
      const paymentRef = this.db.collection('payments').doc(paymentId);
      
      await paymentRef.update({
        sourceId: sourceData.sourceId,
        sourceType: sourceData.sourceType,
        status: sourceData.status,
        updatedAt: this.admin.firestore.FieldValue.serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Error updating payment source:', error);
      throw new Error('Failed to update payment source');
    }
  }

  /**
   * Create a payment from chargeable source (for webhook processing)
   */
  async createPaymentFromSource(sourceId, paymentId) {
    try {
      const response = await axios.post('https://api.paymongo.com/v1/payments', {
        data: {
          attributes: {
            amount: 10000, // This should come from the payment record (₱100.00)
            source: {
              id: sourceId,
              type: 'source'
            },
            currency: 'PHP',
            description: 'E-wallet payment'
          }
        }
      }, {
        headers: this.getAuthHeaders()
      });

      // Mark payment as paid
      await this.markPaymentAsPaid(paymentId, {
        paymentId: response.data.data.id,
        sourceId: sourceId,
        paidAt: new Date().toISOString(),
        paymentDetails: response.data.data
      });

      return response.data.data;
    } catch (error) {
      console.error('Error creating payment from source:', error.response?.data || error.message);
      throw new Error('Failed to create payment from source');
    }
  }

  /**
   * Get authentication headers for PayMongo API calls
   */
  getAuthHeaders() {
    return {
      'Authorization': `Basic ${Buffer.from(this.paymongoSecretKey + ':').toString('base64')}`,
      'Content-Type': 'application/json'
    };
  }
}

module.exports = PaymentService; 