const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const axios = require("axios");

const app = express();
const PORT = 5010;

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:5007",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "x-client-id",
    ],
  })
);
app.use(express.json());

// PayMongo configuration with REAL credentials
const PAYMONGO_CONFIG = {
  publicKey: process.env.PAYMONGO_PUBLIC_KEY || "pk_test_YOUR_PUBLIC_KEY",
  secretKey: process.env.PAYMONGO_SECRET_KEY || "sk_test_YOUR_SECRET_KEY",
  baseURL: "https://api.paymongo.com/v1",
};

// Create PayMongo API client
const paymongoAPI = axios.create({
  baseURL: PAYMONGO_CONFIG.baseURL,
  auth: {
    username: PAYMONGO_CONFIG.secretKey,
    password: "", // PayMongo uses secret key as username
  },
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// JWT Middleware (simplified for testing)
const authenticateToken = (req, res, next) => {
  console.log("🔐 Authenticating request...");
  // For testing, we'll accept the clientId from headers
  req.user = { userId: req.headers["x-client-id"] || "j412kdTjjvNNXWdLTHAc" };
  next();
};

// Sample delivery data (matching your actual deliveries)
const SAMPLE_DELIVERIES = [
  {
    deliveryId: "T7jIsLWeXa2YujzVyBNM",
    clientId: "j412kdTjjvNNXWdLTHAc", // Fixed client ID to match the actual user
    amount: 98,
    pickupLocation: "San Ildefonso, Bulacan",
    deliveryAddress: "SM Baliwag",
    truckPlate: "ABC-123",
    clientName: "Test Client",
    deliveryStatus: "completed",
    paymentStatus: "pending",
    deliveryDate: new Date("2024-01-15"),
    created_at: new Date("2024-01-15"),
  },
  {
    deliveryId: "ABC123DEF456",
    clientId: "j412kdTjjvNNXWdLTHAc", // Fixed client ID to match the actual user
    amount: 98,
    pickupLocation: "San Ildefonso, Bulacan",
    deliveryAddress: "SM Baliwag",
    truckPlate: "XYZ-789",
    clientName: "Test Client",
    deliveryStatus: "completed",
    paymentStatus: "pending",
    deliveryDate: new Date("2024-01-15"),
    created_at: new Date("2024-01-15"),
  },
  // Adding deliveries for both possible IDs to ensure compatibility
  {
    deliveryId: "DEF789GHI012",
    clientId: "j412kdTjjvMNXWdLTHAc", // Original ID just in case
    amount: 150,
    pickupLocation: "Manila",
    deliveryAddress: "Quezon City",
    truckPlate: "MNO-456",
    clientName: "Test Client",
    deliveryStatus: "pending",
    paymentStatus: "pending",
    deliveryDate: new Date("2024-12-01"),
    created_at: new Date("2024-11-20"),
  },
];

// Get client payment summary
app.get(
  "/api/payments/client/:clientId/summary",
  authenticateToken,
  async (req, res) => {
    try {
      const { clientId } = req.params;
      console.log(
        `🔥 [REAL PAYMONGO] Getting payment summary for client: ${clientId}`
      );
      console.log(
        `📊 Available deliveries:`,
        SAMPLE_DELIVERIES.map((d) => ({
          deliveryId: d.deliveryId,
          clientId: d.clientId,
        }))
      );

      // Filter deliveries for this client
      const clientDeliveries = SAMPLE_DELIVERIES.filter(
        (d) => d.clientId === clientId
      );
      console.log(
        `🔍 Found ${clientDeliveries.length} deliveries for client ${clientId}`
      );

      const payments = clientDeliveries.map((delivery) => {
        const dueDate = new Date(
          delivery.deliveryDate.getTime() + 30 * 24 * 60 * 60 * 1000
        );
        const now = new Date();

        let paymentStatus = "pending";
        if (delivery.paymentStatus === "paid") {
          paymentStatus = "paid";
        } else if (delivery.deliveryStatus === "completed" && dueDate < now) {
          paymentStatus = "overdue";
        }

        return {
          id: delivery.deliveryId,
          deliveryId: delivery.deliveryId,
          amount: delivery.amount,
          currency: "PHP",
          status: paymentStatus,
          dueDate: dueDate.toISOString(),
          deliveryDate: delivery.deliveryDate.toISOString(),
          createdAt: delivery.created_at.toISOString(),
          payMongoEnabled: true,
          metadata: {
            clientName: delivery.clientName,
            truckPlate: delivery.truckPlate,
            pickupLocation: delivery.pickupLocation,
            deliveryAddress: delivery.deliveryAddress,
            deliveryStatus: delivery.deliveryStatus,
          },
        };
      });

      const summary = {
        totalDeliveries: payments.length,
        totalAmountDue: payments
          .filter((p) => p.status !== "paid")
          .reduce((sum, p) => sum + p.amount, 0),
        totalAmountPaid: payments
          .filter((p) => p.status === "paid")
          .reduce((sum, p) => sum + p.amount, 0),
        pendingPayments: payments.filter((p) => p.status === "pending").length,
        overduePayments: payments.filter((p) => p.status === "overdue").length,
        paidPayments: payments.filter((p) => p.status === "paid").length,
        canBookTrucks:
          payments.filter((p) => p.status === "overdue").length === 0,
        payments: payments.sort(
          (a, b) => new Date(b.deliveryDate) - new Date(a.deliveryDate)
        ),
        payMongoEnabled: true,
      };

      res.json({
        success: true,
        data: summary,
        payMongoEnabled: true,
        mode: "REAL PAYMONGO API - TEST CREDENTIALS",
      });
    } catch (error) {
      console.error("❌ Error getting payment summary:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// Process e-wallet payment with REAL PayMongo API
app.post(
  "/api/payments/process-ewallet",
  authenticateToken,
  async (req, res) => {
    try {
      const { deliveryId, paymentMethod, billingDetails } = req.body;

      console.log("🔥 [REAL PAYMONGO] Processing e-wallet payment:", {
        deliveryId,
        paymentMethod,
      });

      // Find delivery
      const delivery = SAMPLE_DELIVERIES.find(
        (d) => d.deliveryId === deliveryId
      );
      if (!delivery) {
        return res.status(404).json({
          success: false,
          error: "Delivery not found",
        });
      }

      // Convert amount to cents (PayMongo requirement)
      const amountInCents = Math.round(delivery.amount * 100);

      // Create REAL PayMongo source
      const sourcePayload = {
        data: {
          attributes: {
            amount: amountInCents,
            currency: "PHP",
            type: paymentMethod, // gcash, grab_pay, paymaya
            redirect: {
              success: `http://localhost:${PORT}/api/payments/success?deliveryId=${deliveryId}`,
              failed: `http://localhost:${PORT}/api/payments/failed?deliveryId=${deliveryId}`,
            },
            billing: {
              name: billingDetails.name,
              email: billingDetails.email,
              phone: billingDetails.phone,
            },
            metadata: {
              deliveryId: deliveryId,
              clientId: delivery.clientId,
              paymentType: "delivery",
              clientName: delivery.clientName,
              truckPlate: delivery.truckPlate,
            },
          },
        },
      };

      console.log("📡 Making REAL PayMongo API call to create source...");
      const response = await paymongoAPI.post("/sources", sourcePayload);
      const source = response.data.data;

      console.log("✅ REAL PayMongo source created successfully:", source.id);
      console.log("🌐 Checkout URL:", source.attributes.redirect.checkout_url);

      res.json({
        success: true,
        data: {
          sourceId: source.id,
          checkoutUrl: source.attributes.redirect.checkout_url,
          status: source.attributes.status,
          amount: delivery.amount,
          currency: "PHP",
          paymentMethod: paymentMethod,
          deliveryId: deliveryId,
          mode: "REAL PAYMONGO API - TEST CREDENTIALS",
        },
        payMongoEnabled: true,
        realPayMongo: true,
      });
    } catch (error) {
      console.error(
        "❌ REAL PayMongo API Error:",
        error.response?.data || error.message
      );

      // Log detailed error for debugging
      if (error.response?.data?.errors) {
        console.error(
          "📝 PayMongo Error Details:",
          JSON.stringify(error.response.data.errors, null, 2)
        );
      }

      res.status(500).json({
        success: false,
        error: error.response?.data?.errors?.[0]?.detail || error.message,
        payMongoEnabled: true,
        payMongoError: error.response?.data || null,
      });
    }
  }
);

// Process card payment with REAL PayMongo API
app.post("/api/payments/process-card", authenticateToken, async (req, res) => {
  try {
    const { deliveryId, cardDetails, billingDetails } = req.body;

    console.log("🔥 [REAL PAYMONGO] Processing card payment:", { deliveryId });

    // Find delivery
    const delivery = SAMPLE_DELIVERIES.find((d) => d.deliveryId === deliveryId);
    if (!delivery) {
      return res.status(404).json({
        success: false,
        error: "Delivery not found",
      });
    }

    // Convert amount to cents
    const amountInCents = Math.round(delivery.amount * 100);

    // Create REAL PayMongo payment intent
    const paymentIntentPayload = {
      data: {
        attributes: {
          amount: amountInCents,
          currency: "PHP",
          payment_method_allowed: ["card"],
          description: `Delivery Payment - ${delivery.truckPlate}`,
          statement_descriptor: "Trucking Delivery",
          metadata: {
            deliveryId: deliveryId,
            clientId: delivery.clientId,
            paymentType: "delivery",
            clientName: delivery.clientName,
            truckPlate: delivery.truckPlate,
          },
        },
      },
    };

    console.log("📡 Making REAL PayMongo API call to create payment intent...");
    const response = await paymongoAPI.post(
      "/payment_intents",
      paymentIntentPayload
    );
    const paymentIntent = response.data.data;

    console.log("✅ REAL PayMongo payment intent created:", paymentIntent.id);

    res.json({
      success: true,
      data: {
        paymentIntentId: paymentIntent.id,
        clientKey: paymentIntent.attributes.client_key,
        status: paymentIntent.attributes.status,
        amount: delivery.amount,
        currency: "PHP",
        paymentMethod: "card",
        deliveryId: deliveryId,
        mode: "REAL PAYMONGO API - TEST CREDENTIALS",
      },
      payMongoEnabled: true,
      realPayMongo: true,
    });
  } catch (error) {
    console.error(
      "❌ REAL PayMongo Payment Intent Error:",
      error.response?.data || error.message
    );

    if (error.response?.data?.errors) {
      console.error(
        "📝 PayMongo Error Details:",
        JSON.stringify(error.response.data.errors, null, 2)
      );
    }

    res.status(500).json({
      success: false,
      error: error.response?.data?.errors?.[0]?.detail || error.message,
      payMongoEnabled: true,
      payMongoError: error.response?.data || null,
    });
  }
});

// Get source status from REAL PayMongo API
app.get("/api/payments/source/:sourceId/status", async (req, res) => {
  try {
    const { sourceId } = req.params;

    console.log("🔥 [REAL PAYMONGO] Getting source status:", sourceId);

    const response = await paymongoAPI.get(`/sources/${sourceId}`);
    const source = response.data.data;

    res.json({
      success: true,
      data: {
        id: source.id,
        status: source.attributes.status,
        amount: source.attributes.amount / 100, // Convert from cents
        currency: source.attributes.currency,
        type: source.attributes.type,
      },
      mode: "REAL PAYMONGO API - TEST CREDENTIALS",
    });
  } catch (error) {
    console.error(
      "❌ Error getting source status:",
      error.response?.data || error.message
    );
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// PayMongo webhook endpoint
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      console.log("🔥 [REAL PAYMONGO] Received webhook");

      const payload = req.body;
      const webhookData = JSON.parse(payload.toString());

      console.log("📨 Webhook event type:", webhookData.data?.type);
      console.log("📄 Webhook data:", JSON.stringify(webhookData, null, 2));

      const event = webhookData.data;
      const eventType = event.type;
      const resource = event.attributes.data;

      switch (eventType) {
        case "source.chargeable":
          console.log("💰 Source is now chargeable:", resource.id);
          // Here you would create a payment from the source
          break;

        case "payment.paid":
          console.log("✅ Payment completed:", resource.id);
          // Update delivery payment status in your database
          break;

        case "payment.failed":
          console.log("❌ Payment failed:", resource.id);
          break;

        default:
          console.log("ℹ️ Unhandled webhook event:", eventType);
      }

      res.status(200).json({
        success: true,
        processed: true,
        eventType: eventType,
      });
    } catch (error) {
      console.error("❌ Error processing webhook:", error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// Payment success page
app.get("/api/payments/success", (req, res) => {
  const { deliveryId } = req.query;
  console.log("✅ [REAL PAYMONGO] Payment success for delivery:", deliveryId);

  res.send(`
    <html>
      <head>
        <title>Payment Successful - Real PayMongo</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f0f9ff; }
          .success-container { background: white; padding: 40px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .success-icon { font-size: 60px; color: #10b981; margin-bottom: 20px; }
          h1 { color: #059669; margin-bottom: 10px; }
          p { color: #6b7280; margin: 10px 0; }
          .delivery-id { background: #f3f4f6; padding: 10px; border-radius: 5px; font-family: monospace; margin: 20px 0; }
          .mode-badge { background: #3b82f6; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold; margin: 10px 0; display: inline-block; }
          .close-btn { background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 16px; margin-top: 20px; }
          .close-btn:hover { background: #2563eb; }
        </style>
      </head>
      <body>
        <div class="success-container">
          <div class="success-icon">✅</div>
          <h1>Payment Successful!</h1>
          <p>Your delivery payment has been processed with <strong>REAL PayMongo API</strong></p>
          <div class="delivery-id">Delivery ID: ${deliveryId}</div>
          <div class="mode-badge">REAL PAYMONGO - TEST CREDENTIALS</div>
          <p>Thank you for using our trucking service!</p>
          <button class="close-btn" onclick="window.close()">Close Window</button>
        </div>
      </body>
    </html>
  `);
});

// Payment failed page
app.get("/api/payments/failed", (req, res) => {
  const { deliveryId } = req.query;
  console.log("❌ [REAL PAYMONGO] Payment failed for delivery:", deliveryId);

  res.send(`
    <html>
      <head>
        <title>Payment Failed - Real PayMongo</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #fef2f2; }
          .failed-container { background: white; padding: 40px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .failed-icon { font-size: 60px; color: #ef4444; margin-bottom: 20px; }
          h1 { color: #dc2626; margin-bottom: 10px; }
          p { color: #6b7280; margin: 10px 0; }
          .delivery-id { background: #f3f4f6; padding: 10px; border-radius: 5px; font-family: monospace; margin: 20px 0; }
          .mode-badge { background: #ef4444; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold; margin: 10px 0; display: inline-block; }
          .retry-btn { background: #ef4444; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 16px; margin: 10px; }
          .close-btn { background: #6b7280; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 16px; margin: 10px; }
        </style>
      </head>
      <body>
        <div class="failed-container">
          <div class="failed-icon">❌</div>
          <h1>Payment Failed</h1>
          <p>Payment could not be processed with <strong>REAL PayMongo API</strong></p>
          <div class="delivery-id">Delivery ID: ${deliveryId}</div>
          <div class="mode-badge">REAL PAYMONGO - TEST CREDENTIALS</div>
          <p>You can retry the payment from your dashboard.</p>
          <button class="retry-btn" onclick="window.location.href='http://localhost:3000/payments'">Retry Payment</button>
          <button class="close-btn" onclick="window.close()">Close Window</button>
        </div>
      </body>
    </html>
  `);
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "Real PayMongo Payment Server",
    port: PORT,
    payMongoEnabled: true,
    mode: "REAL PAYMONGO API - TEST CREDENTIALS",
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(PORT, () => {
  console.log("🚀 ===================================");
  console.log("🔥 REAL PayMongo Payment Server Started");
  console.log("🌐 Server running on port:", PORT);
  console.log("💳 PayMongo Integration: REAL API");
  console.log("🔑 Using TEST credentials");
  console.log("📡 PayMongo Base URL:", PAYMONGO_CONFIG.baseURL);
  console.log("🔐 Public Key:", PAYMONGO_CONFIG.publicKey);
  console.log("🎯 Health Check: http://localhost:" + PORT + "/health");
  console.log(
    "📄 Payment Summary: http://localhost:" +
      PORT +
      "/api/payments/client/j412kdTjjvMNXWdLTHAc/summary"
  );
  console.log("🚀 ===================================");
});
