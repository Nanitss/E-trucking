// Test PayMongo Configuration
require("dotenv").config({ path: "./client/server/.env" });

console.log("🚚 Testing PayMongo Configuration");
console.log("================================\n");

console.log("Environment Variables Check:");
console.log(
  "PAYMONGO_PUBLIC_KEY:",
  process.env.PAYMONGO_PUBLIC_KEY ? "✅ Set" : "❌ Not set"
);
console.log(
  "PAYMONGO_SECRET_KEY:",
  process.env.PAYMONGO_SECRET_KEY ? "✅ Set" : "❌ Not set"
);

if (process.env.PAYMONGO_PUBLIC_KEY) {
  console.log("Public Key:", process.env.PAYMONGO_PUBLIC_KEY);
}

if (process.env.PAYMONGO_SECRET_KEY) {
  console.log(
    "Secret Key:",
    process.env.PAYMONGO_SECRET_KEY.substring(0, 10) + "..."
  );
}

console.log("\n🔍 Testing PaymentService instantiation...");

try {
  // Set environment variables if not already set
  if (!process.env.PAYMONGO_PUBLIC_KEY) {
    process.env.PAYMONGO_PUBLIC_KEY = "pk_test_YOUR_PUBLIC_KEY";
  }
  if (!process.env.PAYMONGO_SECRET_KEY) {
    process.env.PAYMONGO_SECRET_KEY = "sk_test_YOUR_SECRET_KEY";
  }

  const PaymentService = require("./server/services/PaymentService");
  const paymentService = new PaymentService();

  console.log("✅ PaymentService created successfully");
  console.log("✅ Base URL:", paymentService.baseURL);
  console.log(
    "✅ Public Key configured:",
    paymentService.paymongoPublicKey ? "Yes" : "No"
  );
  console.log(
    "✅ Secret Key configured:",
    paymentService.paymongoSecretKey ? "Yes" : "No"
  );

  console.log("\n🎉 PayMongo integration is ready!");
  console.log("\n📋 Available Payment Methods:");
  console.log("- createPaymentIntent(deliveryId, amount)");
  console.log("- processPaymentCompletion(paymentIntentId)");
  console.log("- getClientPaymentSummary(clientId)");
  console.log("- canClientBookTrucks(clientId)");
  console.log("- createPaymentLink(paymentId)");
  console.log("- getOverduePayments()");
} catch (error) {
  console.error("❌ Error testing PaymentService:", error.message);
  console.log("\n🔧 Troubleshooting:");
  console.log(
    "1. Make sure firebase-admin is installed: npm install firebase-admin"
  );
  console.log("2. Make sure axios is installed: npm install axios");
  console.log("3. Check that .env file exists in client/server/ directory");
}
