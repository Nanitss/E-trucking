const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const paymentService = require("../services/PaymentService");
const paymentProofService = require("../services/PaymentProofService");
const receiptService = require("../services/ReceiptService");
const { authenticateJWT } = require("../middleware/auth");
const auditService = require("../services/AuditService");

// Configure multer for payment proof uploads
// IMPORTANT: Firebase Cloud Functions only allow writes to /tmp directory
const proofStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Use /tmp which is the ONLY writable directory in Firebase Cloud Functions
    const uploadPath = "/tmp/payment-proofs";
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `proof-${uniqueSuffix}${ext}`);
  },
});

const proofUpload = multer({
  storage: proofStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = ["image/png", "application/pdf"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PNG and PDF files are allowed"), false);
    }
  },
});

// ─── GET /api/payments/all ──────────────────────────────────────────────────
// Get all payments across all clients (Admin only)
router.get("/all", authenticateJWT, async (req, res) => {
  try {
    console.log("📊 GET /api/payments/all - Admin requesting all payments");
    console.log("👤 User:", req.user.username, "| Role:", req.user.role);

    // Check if user is admin
    if (req.user.role !== "admin") {
      console.log("❌ Access denied - User is not admin");
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const { db } = require("../config/firebase");
    console.log("🔍 Fetching deliveries from Firebase...");
    const deliveriesSnapshot = await db.collection("deliveries").get();

    console.log(`📦 Found ${deliveriesSnapshot.size} deliveries in database`);

    const payments = [];

    deliveriesSnapshot.forEach((doc) => {
      const delivery = doc.data();

      // Skip cancelled deliveries
      if (delivery.deliveryStatus === "cancelled") {
        return;
      }

      // Get delivery rate
      const amount = parseFloat(
        delivery.deliveryRate || delivery.DeliveryRate || 0,
      );

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
        dueDate = delivery.dueDate.toDate
          ? delivery.dueDate.toDate()
          : new Date(delivery.dueDate);
      } else {
        // Fallback: calculate due date (30 days after delivery date)
        dueDate = new Date(deliveryDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      }

      // Determine payment status - preserve pending_verification from database
      let paymentStatus = "pending";
      const now = new Date();

      if (delivery.paymentStatus === "paid") {
        paymentStatus = "paid";
      } else if (delivery.paymentStatus === "pending_verification") {
        // Preserve pending_verification status - proof uploaded, awaiting admin review
        paymentStatus = "pending_verification";
      } else if (dueDate < now) {
        paymentStatus = "overdue";
      }

      payments.push({
        id: doc.id,
        deliveryId: doc.id,
        clientId: delivery.clientId,
        clientName: delivery.clientName,
        amount: amount,
        currency: "PHP",
        status: paymentStatus,
        dueDate: dueDate.toISOString(),
        deliveryDate: deliveryDate.toISOString(),
        paidAt: delivery.paidAt || null,
        // Include proof info for pending_verification payments
        proofId: delivery.proofId || null,
        proofUploadedAt: delivery.proofUploadedAt || null,
        proofRejectionReason: delivery.proofRejectionReason || null,
        metadata: {
          clientName: delivery.clientName,
          truckPlate: delivery.truckPlate || delivery.TruckPlate,
          pickupLocation: delivery.pickupLocation || delivery.PickupLocation,
          deliveryAddress: delivery.deliveryAddress || delivery.DeliveryAddress,
        },
      });
    });

    // Sort by due date (most urgent first)
    payments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    console.log(`✅ Returning ${payments.length} payment records to client`);
    if (payments.length === 0) {
      console.log("⚠️  No payments to return. This means:");
      console.log("   - Either there are no deliveries in the database");
      console.log("   - Or all deliveries have been cancelled");
      console.log("   💡 Clients need to book deliveries first!");
    }

    res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error("❌ Error getting all payments:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get all payments",
    });
  }
});

// ─── PUT /api/payments/:paymentId/status ────────────────────────────────────
// Update payment status (Admin only)
router.put("/:paymentId/status", authenticateJWT, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { status } = req.body;

    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    // Validate status
    const validStatuses = ["pending", "paid", "overdue", "failed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be one of: " + validStatuses.join(", "),
      });
    }

    const { db } = require("../config/firebase");
    const deliveryRef = db.collection("deliveries").doc(paymentId);
    const deliveryDoc = await deliveryRef.get();

    if (!deliveryDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Payment/Delivery not found",
      });
    }

    // Update the delivery payment status
    const updateData = {
      paymentStatus: status,
      updated_at: new Date(),
    };

    // If marked as paid, add paidAt timestamp
    if (status === "paid") {
      updateData.paidAt = new Date();
    }

    await deliveryRef.update(updateData);

    // Log the update
    await auditService.logUpdate(
      req.user.id,
      req.user.username,
      "payment",
      paymentId,
      {
        action: "payment_status_updated",
        oldStatus: deliveryDoc.data().paymentStatus,
        newStatus: status,
      },
    );

    res.json({
      success: true,
      message: "Payment status updated successfully",
      data: {
        paymentId: paymentId,
        status: status,
      },
    });
  } catch (error) {
    console.error("Error updating payment status:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update payment status",
    });
  }
});

// ─── POST /api/payments/create ──────────────────────────────────────────────
// Create payment for a delivery
router.post("/create", authenticateJWT, async (req, res) => {
  try {
    const { deliveryId, amount } = req.body;

    if (!deliveryId || !amount) {
      return res.status(400).json({
        success: false,
        message: "Delivery ID and amount are required",
      });
    }

    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount",
      });
    }

    const payment = await paymentService.createPaymentIntent(
      deliveryId,
      parseFloat(amount),
    );

    // Log the payment creation
    await auditService.logCreate(
      req.user.id,
      req.user.username,
      "payment",
      payment.paymentId,
      {
        deliveryId: deliveryId,
        amount: amount,
        description: "Payment created for delivery",
      },
    );

    res.status(201).json({
      success: true,
      message: "Payment created successfully",
      data: payment,
    });
  } catch (error) {
    console.error("Error creating payment:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create payment",
    });
  }
});

// ─── POST /api/payments/process ──────────────────────────────────────────────
// Process payment completion (called by webhook or frontend)
router.post("/process", async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: "Payment intent ID is required",
      });
    }

    const result =
      await paymentService.processPaymentCompletion(paymentIntentId);

    res.json({
      success: true,
      message: "Payment processed successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error processing payment:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to process payment",
    });
  }
});

// ─── GET /api/payments/client/:clientId ──────────────────────────────────────
// Get client payment summary
router.get("/client/:clientId", authenticateJWT, async (req, res) => {
  try {
    const { clientId } = req.params;

    // Check if user is authorized to view this client's payments
    if (req.user.role !== "admin" && req.user.id !== clientId) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Use the clientId directly since we've fixed the delivery records to use the correct ID
    const summary = await paymentService.getClientPaymentSummary(clientId);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("Error getting client payment summary:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get payment summary",
    });
  }
});

// ─── GET /api/payments/client/:clientId/can-book ─────────────────────────────
// Check if client can book trucks (no overdue payments)
router.get("/client/:clientId/can-book", authenticateJWT, async (req, res) => {
  try {
    const { clientId } = req.params;

    // Check if user is authorized
    if (req.user.role !== "admin" && req.user.id !== clientId) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const canBook = await paymentService.canClientBookTrucks(clientId);

    res.json({
      success: true,
      data: {
        clientId: clientId,
        canBookTrucks: canBook,
      },
    });
  } catch (error) {
    console.error("Error checking booking eligibility:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to check booking eligibility",
    });
  }
});

// ─── POST /api/payments/:paymentId/create-link ───────────────────────────────
// Create payment link for a payment
router.post("/:paymentId/create-link", authenticateJWT, async (req, res) => {
  try {
    const { paymentId } = req.params;

    const paymentLink = await paymentService.createPaymentLink(paymentId);

    // Log the payment link creation
    await auditService.logUpdate(
      req.user.id,
      req.user.username,
      "payment",
      paymentId,
      {
        action: "payment_link_created",
        paymentLinkId: paymentLink.paymentLinkId,
      },
    );

    res.json({
      success: true,
      message: "Payment link created successfully",
      data: paymentLink,
    });
  } catch (error) {
    console.error("Error creating payment link:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create payment link",
    });
  }
});

// ─── POST /api/payments/webhook ──────────────────────────────────────────────
// PayMongo webhook endpoint
router.post("/webhook", async (req, res) => {
  try {
    const webhookData = req.body;

    console.log("Received webhook:", JSON.stringify(webhookData, null, 2));

    const result = await paymentService.processWebhook(webhookData);

    res.json({
      success: true,
      message: "Webhook processed successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to process webhook",
    });
  }
});

// ─── GET /api/payments/overdue ───────────────────────────────────────────────
// Get all overdue payments (Admin only)
router.get("/overdue", authenticateJWT, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const overduePayments = await paymentService.getOverduePayments();

    res.json({
      success: true,
      data: overduePayments,
    });
  } catch (error) {
    console.error("Error getting overdue payments:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get overdue payments",
    });
  }
});

// ─── POST /api/payments/update-client-status/:clientId ───────────────────────
// Manually update client payment status (Admin only)
router.post(
  "/update-client-status/:clientId",
  authenticateJWT,
  async (req, res) => {
    try {
      const { clientId } = req.params;

      // Check if user is admin
      if (req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Admin access required",
        });
      }

      const result = await paymentService.updateClientPaymentStatus(clientId);

      // Log the status update
      await auditService.logUpdate(
        req.user.id,
        req.user.username,
        "client",
        clientId,
        {
          action: "payment_status_updated",
          hasOverduePayments: result.hasOverduePayments,
          overdueCount: result.overdueCount,
        },
      );

      res.json({
        success: true,
        message: "Client payment status updated successfully",
        data: result,
      });
    } catch (error) {
      console.error("Error updating client payment status:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to update client payment status",
      });
    }
  },
);

// ─── GET /api/payments/:paymentId ────────────────────────────────────────────
// Get specific payment details
router.get("/:paymentId", authenticateJWT, async (req, res) => {
  try {
    const { paymentId } = req.params;

    const db = require("firebase-admin").firestore();
    const paymentDoc = await db.collection("payments").doc(paymentId).get();

    if (!paymentDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    const payment = paymentDoc.data();

    // Check if user is authorized to view this payment
    if (req.user.role !== "admin" && req.user.id !== payment.clientId) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
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
      updatedAt: payment.updatedAt?.toDate(),
    };

    res.json({
      success: true,
      data: paymentData,
    });
  } catch (error) {
    console.error("Error getting payment details:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get payment details",
    });
  }
});

// ─── GET /api/payments/all ──────────────────────────────────────────────────
// Get all payments across all clients (Admin only)
router.get("/all", authenticateJWT, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const { status, clientId, limit = 50, offset = 0 } = req.query;

    const db = require("firebase-admin").firestore();
    let query = db.collection("payments").orderBy("createdAt", "desc");

    // Apply filters
    if (status) {
      query = query.where("status", "==", status);
    }
    if (clientId) {
      query = query.where("clientId", "==", clientId);
    }

    // Apply pagination
    query = query.limit(parseInt(limit)).offset(parseInt(offset));

    const snapshot = await query.get();
    const payments = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      dueDate: doc.data().dueDate?.toDate(),
      deliveryDate: doc.data().deliveryDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      paidAt: doc.data().paidAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    }));

    res.json({
      success: true,
      data: payments,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: payments.length,
      },
    });
  } catch (error) {
    console.error("Error getting payments:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get payments",
    });
  }
});

// ─── POST /api/payments/process-card ───────────────────────────────────────
// Process card payment directly (TEST MODE ONLY)
router.post("/process-card", authenticateJWT, async (req, res) => {
  try {
    const { paymentId, paymentMethod } = req.body;

    if (!paymentId || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Payment ID and payment method are required",
      });
    }

    console.log("🧪 TEST MODE: Processing card payment for:", paymentId);

    // Get the payment record (this would be the delivery info)
    const payment = await paymentService.getPayment(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Simulate successful card payment processing - NO REAL PAYMENT MADE
    const paymentIntentId = "pi_test_" + Date.now();

    // Update payment status in database
    await paymentService.markPaymentAsPaid(paymentId, {
      paymentIntentId: paymentIntentId,
      paymentMethodId: "pm_test_" + Date.now(),
      paidAt: new Date().toISOString(),
      paymentDetails: {
        method: "card",
        testMode: true,
        simulatedPayment: true,
        note: "This is a test payment - no real money was charged",
      },
    });

    // Log the payment
    await auditService.logPayment(req.user.id, "test_payment_completed", {
      deliveryId: payment.deliveryId,
      amount: payment.amount,
      paymentMethod: "card",
      paymentIntentId: paymentIntentId,
      testMode: true,
    });

    console.log("✅ TEST MODE: Card payment simulation completed");

    return res.json({
      success: true,
      data: {
        status: "succeeded",
        paymentIntentId: paymentIntentId,
        message: "🧪 TEST PAYMENT COMPLETED - No real money was charged",
        testMode: true,
        amount: payment.amount,
        currency: "PHP",
      },
    });
  } catch (error) {
    console.error("Error processing test card payment:", error);
    await auditService.logPayment(req.user.id, "test_payment_failed", {
      error: error.message,
      paymentId: req.body.paymentId,
      testMode: true,
    });

    res.status(500).json({
      success: false,
      message: error.message || "Failed to process test card payment",
    });
  }
});

// ─── POST /api/payments/process-ewallet ───────────────────────────────────
// Process e-wallet payment (TEST MODE ONLY - GCash, GrabPay, PayMaya)
router.post("/process-ewallet", authenticateJWT, async (req, res) => {
  try {
    const { paymentId, paymentMethod, redirectUrls } = req.body;

    if (!paymentId || !paymentMethod || !redirectUrls) {
      return res.status(400).json({
        success: false,
        message: "Payment ID, payment method, and redirect URLs are required",
      });
    }

    console.log(
      "🧪 TEST MODE: Processing e-wallet payment for:",
      paymentId,
      "Method:",
      paymentMethod,
    );

    // Get the payment record
    const payment = await paymentService.getPayment(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Create mock source for e-wallet payment - NO REAL PAYMENT INTEGRATION
    const source = await paymentService.createSource({
      type: paymentMethod,
      amount: Math.round(payment.amount * 100), // Convert to cents for display
      currency: "PHP",
      redirect: redirectUrls,
      billing: {
        name: req.user.clientName || req.user.username || "Test Client",
        email: req.user.email || "test@example.com",
        phone: req.user.phone || "+639000000000",
      },
      description: `TEST PAYMENT - Delivery ${payment.deliveryId}`,
      metadata: {
        deliveryId: payment.deliveryId,
        clientId: req.user.id,
        paymentId: paymentId,
        testMode: true,
      },
    });

    // Store the test source information for webhook processing
    await paymentService.updatePaymentSource(paymentId, {
      sourceId: source.id,
      sourceType: paymentMethod,
      status: "pending",
    });

    // Log the test payment attempt
    await auditService.logPayment(
      req.user.id,
      "test_ewallet_payment_initiated",
      {
        deliveryId: payment.deliveryId,
        amount: payment.amount,
        paymentMethod: paymentMethod,
        sourceId: source.id,
        testMode: true,
      },
    );

    console.log("✅ TEST MODE: E-wallet payment simulation created");

    return res.json({
      success: true,
      data: {
        sourceId: source.id,
        redirectUrl: source.attributes.redirect.checkout_url,
        status: source.attributes.status,
        testMode: true,
        message: `🧪 TEST ${paymentMethod.toUpperCase()} PAYMENT - No real money will be charged`,
        amount: payment.amount,
        currency: "PHP",
      },
    });
  } catch (error) {
    console.error("Error processing test e-wallet payment:", error);
    await auditService.logPayment(req.user.id, "test_ewallet_payment_failed", {
      error: error.message,
      paymentId: req.body.paymentId,
      paymentMethod: req.body.paymentMethod,
      testMode: true,
    });

    res.status(500).json({
      success: false,
      message: error.message || "Failed to process test e-wallet payment",
    });
  }
});

// ─── GET /api/payments/:paymentId/status ───────────────────────────────────
// Check payment status
router.get("/:paymentId/status", authenticateJWT, async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await paymentService.getPayment(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // If payment has a PayMongo payment intent, check its status
    if (payment.paymentIntentId) {
      const paymentIntent = await paymentService.getPaymentIntent(
        payment.paymentIntentId,
      );

      return res.json({
        success: true,
        data: {
          paymentId: paymentId,
          status: payment.status,
          paymentIntentStatus: paymentIntent.status,
          lastUpdated: payment.updatedAt,
        },
      });
    }

    // If payment has a source, check its status
    if (payment.sourceId) {
      const source = await paymentService.getSource(payment.sourceId);

      return res.json({
        success: true,
        data: {
          paymentId: paymentId,
          status: payment.status,
          sourceStatus: source.status,
          lastUpdated: payment.updatedAt,
        },
      });
    }

    // Return basic payment status
    return res.json({
      success: true,
      data: {
        paymentId: paymentId,
        status: payment.status,
        lastUpdated: payment.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error checking payment status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check payment status",
    });
  }
});

// ─── POST /api/payments/create-sample-data ─────────────────────────────────
// Create sample payment data for testing (development only)
router.post("/create-sample-data", authenticateJWT, async (req, res) => {
  try {
    // Only allow in development/test environment
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({
        success: false,
        message: "Sample data creation not allowed in production",
      });
    }

    const { clientId } = req.body;
    const userId = req.user.id;
    const userClientId = clientId || userId;

    console.log(`Creating sample payment data for client: ${userClientId}`);

    // Create sample payments
    const db = require("firebase-admin").firestore();
    const now = new Date();
    const samplePayments = [
      {
        deliveryId: "DEL-001-SAMPLE",
        clientId: userClientId,
        amount: 1500,
        currency: "PHP",
        status: "pending",
        dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        deliveryDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        createdAt: now,
        updatedAt: now,
        transactionFee: 52.5,
        netAmount: 1447.5,
        metadata: {
          clientName: "Test Client",
          truckPlate: "ABC-123",
          pickupLocation: "Manila, Philippines",
          deliveryAddress: "Quezon City, Philippines",
        },
      },
      {
        deliveryId: "DEL-002-SAMPLE",
        clientId: userClientId,
        amount: 2250,
        currency: "PHP",
        status: "paid",
        dueDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        deliveryDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        paidAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        createdAt: now,
        updatedAt: now,
        transactionFee: 78.75,
        netAmount: 2171.25,
        paymentMethod: "card",
        metadata: {
          clientName: "Test Client",
          truckPlate: "XYZ-789",
          pickupLocation: "Makati, Philippines",
          deliveryAddress: "Pasig, Philippines",
        },
      },
      {
        deliveryId: "DEL-003-SAMPLE",
        clientId: userClientId,
        amount: 1800,
        currency: "PHP",
        status: "overdue",
        dueDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago (overdue)
        deliveryDate: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
        createdAt: now,
        updatedAt: now,
        transactionFee: 63,
        netAmount: 1737,
        metadata: {
          clientName: "Test Client",
          truckPlate: "DEF-456",
          pickupLocation: "Taguig, Philippines",
          deliveryAddress: "Antipolo, Philippines",
        },
      },
    ];

    // Add sample payments to Firestore
    const promises = samplePayments.map((payment) => {
      return db.collection("payments").add(payment);
    });

    await Promise.all(promises);
    console.log(
      `Created ${samplePayments.length} sample payments for client ${userClientId}`,
    );

    res.json({
      success: true,
      message: `Created ${samplePayments.length} sample payments`,
      data: {
        clientId: userClientId,
        paymentsCreated: samplePayments.length,
        totalAmount: samplePayments.reduce((sum, p) => sum + p.amount, 0),
      },
    });
  } catch (error) {
    console.error("Error creating sample payment data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create sample payment data",
    });
  }
});

// ─── POST /api/payments/generate-from-deliveries ─────────────────────────────
// Generate payment records from existing deliveries
router.post("/generate-from-deliveries", authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("🔄 Generating payments from deliveries for user:", userId);

    // Get client payment summary using the user ID directly
    const paymentSummary = await paymentService.getClientPaymentSummary(userId);

    if (!paymentSummary || paymentSummary.totalDeliveries === 0) {
      return res.status(404).json({
        success: false,
        message: "No deliveries found for payment generation",
      });
    }

    console.log("✅ Payment summary generated:", paymentSummary);

    res.json({
      success: true,
      message: "Payment summary generated successfully",
      data: paymentSummary,
    });
  } catch (error) {
    console.error("❌ Error generating payments from deliveries:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate payment summary",
      error: error.message,
    });
  }
});

// ─── GET /api/payments/debug-user ────────────────────────────────────────────
// Debug route to check user profile and find associated client ID
router.get("/debug-user", authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const db = require("firebase-admin").firestore();

    console.log(`Debug user info for: ${userId}`);

    // Get user profile
    let userProfile = null;
    try {
      const userDoc = await db.collection("users").doc(userId).get();
      if (userDoc.exists) {
        userProfile = userDoc.data();
      }
    } catch (error) {
      console.log("Error fetching user profile:", error.message);
    }

    // Get client profile
    let clientProfile = null;
    try {
      const clientDoc = await db.collection("clients").doc(userId).get();
      if (clientDoc.exists) {
        clientProfile = clientDoc.data();
      }
    } catch (error) {
      console.log("Error fetching client profile:", error.message);
    }

    // Search for deliveries with the exact clientId from Firebase ("p4hj4KW644Ih52aCQ40")
    const knownClientId = "p4hj4KW644Ih52aCQ40"; // From Firebase screenshot
    let deliveriesWithKnownClientId = null;
    try {
      const deliveriesSnapshot = await db
        .collection("deliveries")
        .where("clientId", "==", knownClientId)
        .get();

      deliveriesWithKnownClientId = deliveriesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.log(
        "Error fetching deliveries with known client ID:",
        error.message,
      );
    }

    // Get sample deliveries to see structure
    const sampleDeliveries = await db.collection("deliveries").limit(3).get();
    const deliveryStructures = sampleDeliveries.docs.map((doc) => ({
      id: doc.id,
      data: doc.data(),
    }));

    res.json({
      success: true,
      data: {
        currentUserId: userId,
        userObject: req.user,
        userProfile: userProfile,
        clientProfile: clientProfile,
        knownClientId: knownClientId,
        deliveriesWithKnownClientId: deliveriesWithKnownClientId,
        sampleDeliveries: deliveryStructures,
      },
    });
  } catch (error) {
    console.error("Error in debug user:", error);
    res.status(500).json({
      success: false,
      message: "Debug failed",
      error: error.message,
    });
  }
});

// ─── POST /api/payments/:deliveryId/cancel ─────────────────────────────────────
// Cancel payment for a delivery
router.post("/:deliveryId/cancel", authenticateJWT, async (req, res) => {
  try {
    const { deliveryId } = req.params;

    if (!deliveryId) {
      return res.status(400).json({
        success: false,
        message: "Delivery ID is required",
      });
    }

    const result = await paymentService.cancelPayment(deliveryId);

    // Log the payment cancellation
    await auditService.logAction(
      req.user.id,
      req.user.username,
      "payment_cancelled",
      "payment",
      deliveryId,
      {
        deliveryId: deliveryId,
        reason: "Payment cancelled due to delivery cancellation",
        cancelledPayments: result.cancelledPayments,
      },
    );

    res.json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    console.error("Error cancelling payment:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to cancel payment",
    });
  }
});

// ─── POST /api/payments/fix-cancelled-deliveries ──────────────────────────────
// Fix existing cancelled deliveries that don't have proper payment status
router.post("/fix-cancelled-deliveries", authenticateJWT, async (req, res) => {
  try {
    console.log("🔧 Starting fix for cancelled deliveries...");

    const { admin, db } = require("../config/firebase");

    // Get all deliveries with status 'cancelled'
    const cancelledDeliveriesSnapshot = await db
      .collection("deliveries")
      .where("deliveryStatus", "==", "cancelled")
      .get();

    if (cancelledDeliveriesSnapshot.empty) {
      return res.json({
        success: true,
        message: "No cancelled deliveries found.",
        updated: 0,
      });
    }

    console.log(
      `📋 Found ${cancelledDeliveriesSnapshot.size} cancelled deliveries to check...`,
    );

    const batch = db.batch();
    let updatedCount = 0;
    const updatedDeliveries = [];

    cancelledDeliveriesSnapshot.forEach((doc) => {
      const delivery = doc.data();
      const deliveryId = doc.id;

      console.log(
        `🔍 Checking delivery ${deliveryId}: status=${delivery.deliveryStatus}, paymentStatus=${delivery.paymentStatus}`,
      );

      // Check if payment status is already cancelled
      if (delivery.paymentStatus === "cancelled") {
        console.log(
          `✅ Delivery ${deliveryId} already has correct payment status`,
        );
        return;
      }

      console.log(`🔄 Updating payment status for delivery ${deliveryId}`);

      // Update payment status to cancelled
      batch.update(db.collection("deliveries").doc(deliveryId), {
        paymentStatus: "cancelled",
        paymentCancelledAt: admin.firestore.FieldValue.serverTimestamp(),
        cancellationReason:
          "Delivery cancelled - Payment status updated by fix API",
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      updatedDeliveries.push({
        deliveryId,
        amount: parseFloat(
          delivery.deliveryRate || delivery.DeliveryRate || 98,
        ),
        previousPaymentStatus: delivery.paymentStatus || "undefined",
      });

      updatedCount++;
    });

    if (updatedCount > 0) {
      await batch.commit();
      console.log(
        `✅ Successfully updated payment status for ${updatedCount} cancelled deliveries`,
      );

      // Log the fix action
      await auditService.logAction(
        req.user.id,
        req.user.username,
        "payment_bulk_cancelled",
        "payment",
        "bulk-fix",
        {
          reason: "Fixed existing cancelled deliveries payment status",
          updatedCount,
          updatedDeliveries,
        },
      );
    }

    res.json({
      success: true,
      message: `Successfully updated payment status for ${updatedCount} cancelled deliveries`,
      updated: updatedCount,
      deliveries: updatedDeliveries,
    });
  } catch (error) {
    console.error("❌ Error fixing cancelled deliveries:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fix cancelled deliveries",
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENT PROOF UPLOAD & VERIFICATION ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── POST /api/payments/upload-proof ─────────────────────────────────────────
// Client uploads payment proof for one or multiple deliveries (using base64)
router.post("/upload-proof", authenticateJWT, async (req, res) => {
  try {
    console.log("📤 POST /api/payments/upload-proof");
    console.log("👤 User:", req.user.username, "| ID:", req.user.id);

    const { file, deliveryIds, referenceNumber, notes } = req.body;

    // Validate file exists
    if (!file || !file.data) {
      return res.status(400).json({
        success: false,
        message:
          "No file uploaded. Please upload a PNG or PDF file (max 5MB).",
      });
    }

    // Validate and decode base64 file
    const base64Match = file.data.match(/^data:(.+);base64,(.+)$/);
    if (!base64Match) {
      return res.status(400).json({
        success: false,
        message: "Invalid file format. Expected base64-encoded file.",
      });
    }

    const mimeType = base64Match[1];
    const base64Content = base64Match[2];
    const fileBuffer = Buffer.from(base64Content, "base64");

    // Validate file type
    const allowedTypes = ["image/png", "application/pdf"];
    if (!allowedTypes.includes(mimeType)) {
      return res.status(400).json({
        success: false,
        message: "Only PNG and PDF files are allowed",
      });
    }

    // Validate file size (5MB max)
    if (fileBuffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: "File size must be less than 5MB",
      });
    }

    // Create file object compatible with PaymentProofService
    const fileObj = {
      buffer: fileBuffer,
      originalname: file.name || "proof.png",
      mimetype: mimeType,
      size: fileBuffer.length,
    };

    // Parse delivery IDs
    let parsedDeliveryIds;
    if (Array.isArray(deliveryIds)) {
      parsedDeliveryIds = deliveryIds;
    } else {
      try {
        parsedDeliveryIds = JSON.parse(deliveryIds);
        if (!Array.isArray(parsedDeliveryIds) || parsedDeliveryIds.length === 0) {
          throw new Error("Invalid delivery IDs");
        }
      } catch (e) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid delivery IDs format. Expected array of delivery IDs.",
        });
      }
    }

    // Get client info - prefer clientId from request body if provided (frontend resolves this correctly)
    // Fall back to auth middleware values
    const clientId = req.body.clientId || req.user.clientId || req.user.id;
    const clientName = req.user.clientName || req.user.username || "Client";

    console.log("🔍 ClientID resolution:");
    console.log(`   - req.body.clientId (from frontend): ${req.body.clientId}`);
    console.log(`   - req.user.id: ${req.user.id}`);
    console.log(`   - req.user.clientId: ${req.user.clientId}`);
    console.log(`   - Using clientId: ${clientId}`);

    // Upload the proof
    const result = await paymentProofService.uploadProof(
      fileObj,
      parsedDeliveryIds,
      clientId,
      clientName,
      referenceNumber || "",
      notes || "",
    );

    // Log the upload
    await auditService.logCreate(
      req.user.id,
      req.user.username,
      "payment_proof",
      result.proofId,
      {
        deliveryCount: parsedDeliveryIds.length,
        totalAmount: result.totalAmount,
        referenceNumber: referenceNumber || "",
      },
    );

    console.log("✅ Payment proof uploaded successfully:", result.proofId);

    res.status(201).json({
      success: true,
      message: result.message,
      data: {
        proofId: result.proofId,
        deliveryCount: result.deliveryCount,
        totalAmount: result.totalAmount,
      },
    });
  } catch (error) {
    console.error("❌ Error uploading payment proof:", error);

    res.status(error.message.includes("already") ? 400 : 500).json({
      success: false,
      message: error.message || "Failed to upload payment proof",
    });
  }
});

// ─── GET /api/payments/:paymentId/proof ──────────────────────────────────────
// Get proof details for a specific payment/delivery (Admin or Owner)
router.get("/:paymentId/proof", authenticateJWT, async (req, res) => {
  try {
    const { paymentId } = req.params;
    console.log("📄 GET /api/payments/:paymentId/proof -", paymentId);

    const proof = await paymentProofService.getProofByDeliveryId(paymentId);

    // Check authorization - admin or the client who uploaded
    if (req.user.role !== "admin" && req.user.id !== proof.clientId) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Use proofUrl from Firestore if available (Firebase Storage), otherwise fallback to local file endpoint
    const proofUrl = proof.proofUrl || (proof.proofFilePath
      ? `/api/payments/proof-file/${proof.id}`
      : null);

    res.json({
      success: true,
      data: {
        ...proof,
        proofUrl: proofUrl,
      },
    });
  } catch (error) {
    console.error("❌ Error getting proof:", error);
    res.status(error.message.includes("not found") ? 404 : 500).json({
      success: false,
      message: error.message || "Failed to get payment proof",
    });
  }
});

// ─── GET /api/payments/pending-verification ──────────────────────────────────
// Get all pending verification proofs (Admin only)
router.get("/pending-verification", authenticateJWT, async (req, res) => {
  try {
    console.log("📋 GET /api/payments/pending-verification");

    // Check admin access
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const pendingProofs = await paymentProofService.getPendingProofs();

    res.json({
      success: true,
      data: pendingProofs,
      count: pendingProofs.length,
    });
  } catch (error) {
    console.error("❌ Error getting pending proofs:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get pending verifications",
    });
  }
});

// ─── POST /api/payments/approve-proof ────────────────────────────────────────
// Approve payment proof and mark all linked deliveries as paid (Admin only)
router.post("/approve-proof", authenticateJWT, async (req, res) => {
  try {
    const { proofId } = req.body;
    console.log("✅ POST /api/payments/approve-proof -", proofId);

    // Check admin access
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    if (!proofId) {
      return res.status(400).json({
        success: false,
        message: "Proof ID is required",
      });
    }

    const result = await paymentProofService.approveProof(
      proofId,
      req.user.id,
      req.user.username,
    );

    // Log the approval
    await auditService.logUpdate(
      req.user.id,
      req.user.username,
      "payment_proof",
      proofId,
      {
        action: "proof_approved",
        deliveriesUpdated: result.deliveriesUpdated,
        totalAmount: result.totalAmount,
      },
    );

    res.json({
      success: true,
      message: result.message,
      data: {
        proofId: result.proofId,
        deliveriesUpdated: result.deliveriesUpdated,
        totalAmount: result.totalAmount,
      },
    });
  } catch (error) {
    console.error("❌ Error approving proof:", error);
    res.status(error.message.includes("not found") ? 404 : 500).json({
      success: false,
      message: error.message || "Failed to approve payment proof",
    });
  }
});

// ─── POST /api/payments/reject-proof ─────────────────────────────────────────
// Reject payment proof (Admin only) - allows client to resubmit
router.post("/reject-proof", authenticateJWT, async (req, res) => {
  try {
    const { proofId, rejectionReason } = req.body;
    console.log("❌ POST /api/payments/reject-proof -", proofId);

    // Check admin access
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    if (!proofId) {
      return res.status(400).json({
        success: false,
        message: "Proof ID is required",
      });
    }

    if (!rejectionReason || rejectionReason.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    const result = await paymentProofService.rejectProof(
      proofId,
      req.user.id,
      req.user.username,
      rejectionReason,
    );

    // Log the rejection
    await auditService.logUpdate(
      req.user.id,
      req.user.username,
      "payment_proof",
      proofId,
      {
        action: "proof_rejected",
        rejectionReason: rejectionReason,
        deliveriesUpdated: result.deliveriesUpdated,
      },
    );

    res.json({
      success: true,
      message: result.message,
      data: {
        proofId: result.proofId,
        deliveriesUpdated: result.deliveriesUpdated,
      },
    });
  } catch (error) {
    console.error("❌ Error rejecting proof:", error);
    res.status(error.message.includes("not found") ? 404 : 500).json({
      success: false,
      message: error.message || "Failed to reject payment proof",
    });
  }
});

// ─── GET /api/payments/proof-file/:proofId ───────────────────────────────────
// Serve the actual proof file (PNG/PDF)
router.get("/proof-file/:proofId", authenticateJWT, async (req, res) => {
  try {
    const { proofId } = req.params;
    console.log("📂 GET /api/payments/proof-file/:proofId -", proofId);

    const { db } = require("../config/firebase");
    const proofDoc = await db.collection("paymentProofs").doc(proofId).get();

    if (!proofDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Proof not found",
      });
    }

    const proof = proofDoc.data();

    // Check authorization
    if (req.user.role !== "admin" && req.user.id !== proof.clientId) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // If proof has Firebase Storage URL, redirect to it
    if (proof.proofUrl && proof.storageType === "firebase") {
      return res.redirect(proof.proofUrl);
    }

    // Fallback: Serve from local file system
    const filePath = paymentProofService.getProofFilePath(proof.proofFilePath);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error("❌ Proof file not found:", filePath);
      return res.status(404).json({
        success: false,
        message: "Proof file not found. The file may have been deleted after a server restart. Please ask the client to re-upload the proof.",
      });
    }

    const contentType = paymentProofService.getContentType(proof.proofFilePath);

    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${proof.proofFileName}"`,
    );

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error("❌ Error serving proof file:", error);
    res.status(error.message.includes("not found") ? 404 : 500).json({
      success: false,
      message: error.message || "Failed to retrieve proof file",
    });
  }
});

// ─── GET /api/payments/receipt/:proofId ───────────────────────────────────────
// Get/download payment receipt for an approved proof
router.get("/receipt/:proofId", authenticateJWT, async (req, res) => {
  try {
    const { proofId } = req.params;

    console.log("🧾 GET /api/payments/receipt/:proofId - Fetching receipt");
    console.log("   ProofId:", proofId);

    // Get the receipt by proof ID
    const receipt = await receiptService.getReceiptByProofId(proofId);

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: "Receipt not found for this proof",
      });
    }

    // Check if user is authorized (admin or the client who owns the receipt)
    if (req.user.role !== "admin" && req.user.id !== receipt.clientId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this receipt",
      });
    }

    // Get the file path
    const filePath = receiptService.getReceiptFilePath(receipt.filePath);

    // Set headers for inline viewing
    res.setHeader("Content-Type", "text/html");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="receipt_${receipt.receiptNumber}.html"`,
    );

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error("❌ Error serving receipt:", error);
    res.status(error.message.includes("not found") ? 404 : 500).json({
      success: false,
      message: error.message || "Failed to retrieve receipt",
    });
  }
});

// ─── GET /api/payments/receipt/by-delivery/:deliveryId ────────────────────────
// Get receipt info by delivery ID (for client profile)
router.get("/receipt/by-delivery/:deliveryId", authenticateJWT, async (req, res) => {
  try {
    const { deliveryId } = req.params;

    console.log("🧾 GET /api/payments/receipt/by-delivery/:deliveryId");
    console.log("   DeliveryId:", deliveryId);

    // Get delivery to find the proof ID
    const { db } = require("../config/firebase");
    const deliveryDoc = await db.collection("deliveries").doc(deliveryId).get();

    if (!deliveryDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Delivery not found",
      });
    }

    const delivery = deliveryDoc.data();

    // Check authorization
    if (req.user.role !== "admin" && req.user.id !== delivery.clientId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    // Check if delivery has a proof
    if (!delivery.proofId) {
      return res.status(404).json({
        success: false,
        message: "No payment proof for this delivery",
      });
    }

    // Get receipt by proof ID
    const receipt = await receiptService.getReceiptByProofId(delivery.proofId);

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: "Receipt not found",
      });
    }

    res.json({
      success: true,
      data: {
        receiptId: receipt.id,
        receiptNumber: receipt.receiptNumber,
        proofId: receipt.proofId,
        totalAmount: receipt.totalAmount,
        generatedAt: receipt.generatedAt,
      },
    });
  } catch (error) {
    console.error("❌ Error getting receipt info:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get receipt info",
    });
  }
});

module.exports = router;

