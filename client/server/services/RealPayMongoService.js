const axios = require("axios");
const { db, admin } = require("../config/firebase");

class RealPayMongoService {
  constructor() {
    this.db = db;
    this.admin = admin;

    // PayMongo Test Credentials
    this.publicKey = process.env.PAYMONGO_PUBLIC_KEY || "pk_test_placeholder";
    this.secretKey = process.env.PAYMONGO_SECRET_KEY || "sk_test_placeholder";
    this.baseURL = "https://api.paymongo.com/v1";

    // Create axios instance with auth
    this.paymongoAPI = axios.create({
      baseURL: this.baseURL,
      auth: {
        username: this.secretKey,
        password: "", // PayMongo uses secret key as username, password is empty
      },
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    console.log("🔥 Real PayMongo Service initialized with test credentials");
  }

  // Create real PayMongo source for e-wallet payments
  async createSource(sourceData) {
    try {
      console.log("🔥 Creating real PayMongo source for:", sourceData.type);

      const payload = {
        data: {
          attributes: {
            amount: sourceData.amount, // Amount in cents
            currency: sourceData.currency,
            type: sourceData.type, // gcash, grab_pay, paymaya
            redirect: {
              success: sourceData.redirect.success,
              failed: sourceData.redirect.failed,
            },
            billing: sourceData.billing,
            metadata: sourceData.metadata,
          },
        },
      };

      const response = await this.paymongoAPI.post("/sources", payload);
      const source = response.data.data;

      console.log("✅ Real PayMongo source created:", source.id);

      return {
        id: source.id,
        attributes: source.attributes,
        checkout_url: source.attributes.redirect.checkout_url,
        status: source.attributes.status,
      };
    } catch (error) {
      console.error(
        "❌ Error creating PayMongo source:",
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to create PayMongo source: ${
          error.response?.data?.errors?.[0]?.detail || error.message
        }`
      );
    }
  }

  // Create real PayMongo payment intent for card payments
  async createPaymentIntent(paymentData) {
    try {
      console.log(
        "🔥 Creating real PayMongo payment intent for amount:",
        paymentData.amount
      );

      const payload = {
        data: {
          attributes: {
            amount: paymentData.amount, // Amount in cents
            currency: paymentData.currency,
            description: paymentData.description,
            statement_descriptor: "Trucking Delivery",
            metadata: paymentData.metadata,
          },
        },
      };

      const response = await this.paymongoAPI.post("/payment_intents", payload);
      const paymentIntent = response.data.data;

      console.log("✅ Real PayMongo payment intent created:", paymentIntent.id);

      return {
        id: paymentIntent.id,
        attributes: paymentIntent.attributes,
        client_key: paymentIntent.attributes.client_key,
        status: paymentIntent.attributes.status,
      };
    } catch (error) {
      console.error(
        "❌ Error creating PayMongo payment intent:",
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to create PayMongo payment intent: ${
          error.response?.data?.errors?.[0]?.detail || error.message
        }`
      );
    }
  }

  // Attach payment method to payment intent
  async attachPaymentMethod(paymentIntentId, paymentMethodData) {
    try {
      console.log("🔥 Attaching payment method to intent:", paymentIntentId);

      // First create payment method
      const paymentMethodPayload = {
        data: {
          attributes: {
            type: "card",
            details: paymentMethodData.card,
            billing: paymentMethodData.billing,
          },
        },
      };

      const pmResponse = await this.paymongoAPI.post(
        "/payment_methods",
        paymentMethodPayload
      );
      const paymentMethod = pmResponse.data.data;

      // Then attach to payment intent
      const attachPayload = {
        data: {
          attributes: {
            payment_method: paymentMethod.id,
            client_key: paymentMethodData.client_key,
          },
        },
      };

      const response = await this.paymongoAPI.post(
        `/payment_intents/${paymentIntentId}/attach`,
        attachPayload
      );
      const result = response.data.data;

      console.log("✅ Payment method attached successfully");

      return {
        id: result.id,
        attributes: result.attributes,
        status: result.attributes.status,
      };
    } catch (error) {
      console.error(
        "❌ Error attaching payment method:",
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to attach payment method: ${
          error.response?.data?.errors?.[0]?.detail || error.message
        }`
      );
    }
  }

  // Get source status
  async getSource(sourceId) {
    try {
      console.log("🔥 Getting source status for:", sourceId);

      const response = await this.paymongoAPI.get(`/sources/${sourceId}`);
      const source = response.data.data;

      return {
        id: source.id,
        attributes: source.attributes,
        status: source.attributes.status,
      };
    } catch (error) {
      console.error(
        "❌ Error getting source:",
        error.response?.data || error.message
      );
      throw new Error(`Failed to get source: ${error.message}`);
    }
  }

  // Get payment intent status
  async getPaymentIntent(paymentIntentId) {
    try {
      console.log("🔥 Getting payment intent status for:", paymentIntentId);

      const response = await this.paymongoAPI.get(
        `/payment_intents/${paymentIntentId}`
      );
      const paymentIntent = response.data.data;

      return {
        id: paymentIntent.id,
        attributes: paymentIntent.attributes,
        status: paymentIntent.attributes.status,
      };
    } catch (error) {
      console.error(
        "❌ Error getting payment intent:",
        error.response?.data || error.message
      );
      throw new Error(`Failed to get payment intent: ${error.message}`);
    }
  }

  // Process webhook events
  async processWebhook(webhookData) {
    try {
      console.log("🔥 Processing PayMongo webhook:", webhookData.data?.type);

      const event = webhookData.data;
      const eventType = event.type;
      const resource = event.attributes.data;

      switch (eventType) {
        case "source.chargeable":
          console.log("💰 Source is now chargeable:", resource.id);
          await this.handleChargeableSource(resource);
          break;

        case "payment.paid":
          console.log("✅ Payment completed:", resource.id);
          await this.handlePaidPayment(resource);
          break;

        case "payment.failed":
          console.log("❌ Payment failed:", resource.id);
          await this.handleFailedPayment(resource);
          break;

        default:
          console.log("ℹ️ Unhandled webhook event:", eventType);
      }

      return { processed: true, eventType };
    } catch (error) {
      console.error("❌ Error processing webhook:", error);
      throw new Error(`Failed to process webhook: ${error.message}`);
    }
  }

  // Handle chargeable source (e-wallet paid)
  async handleChargeableSource(source) {
    try {
      // Create payment from source
      const paymentPayload = {
        data: {
          attributes: {
            amount: source.attributes.amount,
            currency: source.attributes.currency,
            source: {
              id: source.id,
              type: "source",
            },
          },
        },
      };

      const response = await this.paymongoAPI.post("/payments", paymentPayload);
      const payment = response.data.data;

      console.log("✅ Payment created from source:", payment.id);

      // Update delivery payment status
      if (source.attributes.metadata?.deliveryId) {
        await this.markDeliveryAsPaid(
          source.attributes.metadata.deliveryId,
          payment
        );
      }

      return payment;
    } catch (error) {
      console.error("❌ Error handling chargeable source:", error);
      throw error;
    }
  }

  // Handle successful payment
  async handlePaidPayment(payment) {
    try {
      console.log("✅ Handling paid payment:", payment.id);

      // Update delivery payment status
      if (payment.attributes.metadata?.deliveryId) {
        await this.markDeliveryAsPaid(
          payment.attributes.metadata.deliveryId,
          payment
        );
      }

      return true;
    } catch (error) {
      console.error("❌ Error handling paid payment:", error);
      throw error;
    }
  }

  // Handle failed payment
  async handleFailedPayment(payment) {
    try {
      console.log("❌ Handling failed payment:", payment.id);

      // Update delivery payment status to failed
      if (payment.attributes.metadata?.deliveryId) {
        await this.markDeliveryAsPaymentFailed(
          payment.attributes.metadata.deliveryId,
          payment
        );
      }

      return true;
    } catch (error) {
      console.error("❌ Error handling failed payment:", error);
      throw error;
    }
  }

  // Mark delivery as paid in Firebase
  async markDeliveryAsPaid(deliveryId, payment) {
    try {
      console.log("🔥 Marking delivery as paid:", deliveryId);

      const deliveryRef = this.db.collection("deliveries").doc(deliveryId);

      await deliveryRef.update({
        paymentStatus: "paid",
        paidAt: this.admin.firestore.Timestamp.now(),
        paymentId: payment.id,
        paymentAmount: payment.attributes.amount / 100, // Convert from cents
        paymentCurrency: payment.attributes.currency,
        paymentMethod: payment.attributes.source?.type || "card",
        paymentDetails: {
          paymentId: payment.id,
          status: payment.attributes.status,
          paidAt: payment.attributes.paid_at,
          fee: payment.attributes.fee / 100, // Convert from cents
          netAmount: payment.attributes.net_amount / 100, // Convert from cents
        },
        updated_at: this.admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log("✅ Delivery payment status updated successfully");
      return true;
    } catch (error) {
      console.error("❌ Error marking delivery as paid:", error);
      throw error;
    }
  }

  // Mark delivery payment as failed
  async markDeliveryAsPaymentFailed(deliveryId, payment) {
    try {
      console.log("❌ Marking delivery payment as failed:", deliveryId);

      const deliveryRef = this.db.collection("deliveries").doc(deliveryId);

      await deliveryRef.update({
        paymentStatus: "failed",
        paymentFailedAt: this.admin.firestore.Timestamp.now(),
        paymentId: payment.id,
        paymentFailureReason:
          payment.attributes.failure_reason || "Payment failed",
        updated_at: this.admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log("✅ Delivery payment failure status updated");
      return true;
    } catch (error) {
      console.error("❌ Error marking delivery payment as failed:", error);
      throw error;
    }
  }

  // Get delivery payment info (for frontend)
  async getPayment(deliveryId) {
    try {
      const deliveryRef = this.db.collection("deliveries").doc(deliveryId);
      const deliveryDoc = await deliveryRef.get();

      if (!deliveryDoc.exists) {
        return null;
      }

      const delivery = deliveryDoc.data();

      return {
        id: deliveryId,
        deliveryId: deliveryId,
        amount: parseFloat(
          delivery.deliveryRate || delivery.DeliveryRate || 98
        ),
        currency: "PHP",
        status: delivery.paymentStatus || "pending",
        clientId: delivery.clientId,
        metadata: {
          clientName: delivery.clientName,
          truckPlate: delivery.truckPlate,
          pickupLocation: delivery.pickupLocation,
          deliveryAddress: delivery.deliveryAddress || delivery.dropoffLocation,
        },
      };
    } catch (error) {
      console.error("Error getting payment:", error);
      throw new Error("Failed to retrieve payment record");
    }
  }

  // Get client payment summary (same as mock for now)
  async getClientPaymentSummary(userId) {
    try {
      console.log(`Getting payment summary for user: ${userId}`);

      const deliveriesSnapshot = await this.db
        .collection("deliveries")
        .where("clientId", "==", userId)
        .get();

      if (deliveriesSnapshot.empty) {
        return {
          totalDeliveries: 0,
          totalAmountDue: 0,
          totalAmountPaid: 0,
          pendingPayments: 0,
          overduePayments: 0,
          paidPayments: 0,
          canBookTrucks: true,
          payments: [],
          payMongoEnabled: true,
        };
      }

      const payments = [];
      let totalAmountDue = 0;
      let totalAmountPaid = 0;
      let pendingPayments = 0;
      let overduePayments = 0;
      let paidPayments = 0;

      deliveriesSnapshot.forEach((doc) => {
        const delivery = doc.data();
        const deliveryId = doc.id;

        // Skip cancelled deliveries - they should not be billed
        if (
          delivery.deliveryStatus === "cancelled" ||
          delivery.paymentStatus === "cancelled"
        ) {
          console.log(
            "ℹ️ RealPayMongo: Skipping cancelled delivery from payment summary:",
            deliveryId
          );
          return;
        }

        const amount = parseFloat(
          delivery.deliveryRate || delivery.DeliveryRate || 98
        );

        let deliveryDate = new Date();
        if (delivery.deliveryDate) {
          if (delivery.deliveryDate.seconds) {
            deliveryDate = new Date(delivery.deliveryDate.seconds * 1000);
          } else if (delivery.deliveryDate.toDate) {
            deliveryDate = delivery.deliveryDate.toDate();
          } else {
            deliveryDate = new Date(delivery.deliveryDate);
          }
        }

        let dueDate = new Date(
          deliveryDate.getTime() + 30 * 24 * 60 * 60 * 1000
        );

        let paymentStatus = "pending";
        const now = new Date();

        if (delivery.paymentStatus === "paid") {
          paymentStatus = "paid";
        } else if (delivery.deliveryStatus === "completed" && dueDate < now) {
          paymentStatus = "overdue";
        } else {
          paymentStatus = "pending";
        }

        const paymentInfo = {
          id: deliveryId,
          deliveryId,
          amount,
          currency: "PHP",
          status: paymentStatus,
          dueDate: dueDate.toISOString(),
          deliveryDate: deliveryDate.toISOString(),
          createdAt: delivery.created_at
            ? delivery.created_at.seconds
              ? new Date(delivery.created_at.seconds * 1000).toISOString()
              : new Date(delivery.created_at).toISOString()
            : deliveryDate.toISOString(),
          payMongoEnabled: true,
          metadata: {
            clientName: delivery.clientName || "Client",
            truckPlate: delivery.truckPlate || "Unknown",
            pickupLocation: delivery.pickupLocation || "Unknown",
            deliveryAddress:
              delivery.deliveryAddress || delivery.dropoffLocation || "Unknown",
            deliveryStatus: delivery.deliveryStatus || "pending",
          },
        };

        payments.push(paymentInfo);

        if (paymentStatus === "pending") {
          pendingPayments++;
          totalAmountDue += amount;
        } else if (paymentStatus === "overdue") {
          overduePayments++;
          totalAmountDue += amount;
        } else if (paymentStatus === "paid") {
          paidPayments++;
          totalAmountPaid += amount;
        }
      });

      return {
        totalDeliveries: payments.length,
        totalAmountDue,
        totalAmountPaid,
        pendingPayments,
        overduePayments,
        paidPayments,
        canBookTrucks: overduePayments === 0,
        payments: payments.sort(
          (a, b) => new Date(b.deliveryDate) - new Date(a.deliveryDate)
        ),
        payMongoEnabled: true,
      };
    } catch (error) {
      console.error("Error getting client payment summary:", error);
      throw error;
    }
  }
}

module.exports = new RealPayMongoService();
