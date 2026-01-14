const fs = require("fs");
const path = require("path");

/**
 * PayMongo Setup Script
 * This script helps you set up PayMongo keys for your trucking app
 */

const PAYMONGO_PUBLIC_KEY = "pk_test_YOUR_PUBLIC_KEY";
const PAYMONGO_SECRET_KEY = "sk_test_YOUR_SECRET_KEY";

console.log("🚚 PayMongo Setup for Trucking App");
console.log("==================================\n");

// Environment configuration template
const envConfig = `# PayMongo Configuration
PAYMONGO_PUBLIC_KEY=${PAYMONGO_PUBLIC_KEY}
PAYMONGO_SECRET_KEY=${PAYMONGO_SECRET_KEY}

# JWT Configuration
JWT_SECRET=your-trucking-app-jwt-secret-key-change-this-in-production

# Server Configuration
NODE_ENV=development
PORT=5007

# Firebase Configuration (Add your actual Firebase credentials)
# FIREBASE_PROJECT_ID=your-project-id
# FIREBASE_CLIENT_EMAIL=your-client-email
# FIREBASE_PRIVATE_KEY=your-private-key
# FIREBASE_DATABASE_URL=your-database-url

# React App Configuration
REACT_APP_API_URL=http://localhost:5007
`;

// Locations where .env files should be created
const envLocations = ["./client/server/.env", "./.env"];

function createEnvFile(location) {
  try {
    const fullPath = path.resolve(location);
    const dir = path.dirname(fullPath);

    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Check if file already exists
    if (fs.existsSync(fullPath)) {
      console.log(`⚠️  Environment file already exists: ${location}`);

      // Read existing file and check if PayMongo keys are already set
      const existingContent = fs.readFileSync(fullPath, "utf8");

      if (
        existingContent.includes("PAYMONGO_PUBLIC_KEY") &&
        existingContent.includes("PAYMONGO_SECRET_KEY")
      ) {
        console.log(`✅ PayMongo keys already configured in: ${location}`);
        return true;
      } else {
        console.log(`📝 Adding PayMongo keys to existing file: ${location}`);
        // Append PayMongo keys to existing file
        const paymongoConfig = `\n# PayMongo Configuration (Added by setup script)\nPAYMONGO_PUBLIC_KEY=${PAYMONGO_PUBLIC_KEY}\nPAYMONGO_SECRET_KEY=${PAYMONGO_SECRET_KEY}\n`;
        fs.appendFileSync(fullPath, paymongoConfig);
        console.log(`✅ PayMongo keys added to: ${location}`);
        return true;
      }
    } else {
      // Create new file
      fs.writeFileSync(fullPath, envConfig);
      console.log(`✅ Created environment file: ${location}`);
      return true;
    }
  } catch (error) {
    console.error(`❌ Failed to create ${location}:`, error.message);
    return false;
  }
}

function verifyPaymentService() {
  try {
    // Try to require and test PaymentService
    const PaymentService = require("./server/services/PaymentService");
    const paymentService = new PaymentService();

    console.log("\n🔍 PaymentService Verification:");
    console.log(`✅ PaymentService loaded successfully`);
    console.log(
      `✅ Public Key configured: ${
        paymentService.paymongoPublicKey ? "Yes" : "No"
      }`
    );
    console.log(
      `✅ Secret Key configured: ${
        paymentService.paymongoSecretKey ? "Yes" : "No"
      }`
    );
    console.log(`✅ Base URL: ${paymentService.baseURL}`);

    return true;
  } catch (error) {
    console.error("❌ PaymentService verification failed:", error.message);
    return false;
  }
}

function main() {
  console.log("📋 Setting up PayMongo environment variables...\n");

  let success = true;

  // Create environment files
  for (const location of envLocations) {
    if (!createEnvFile(location)) {
      success = false;
    }
  }

  if (success) {
    console.log("\n✅ Environment setup completed successfully!");

    // Verify PaymentService
    console.log("\n🔍 Verifying PaymentService...");

    // Set environment variables for verification
    process.env.PAYMONGO_PUBLIC_KEY = PAYMONGO_PUBLIC_KEY;
    process.env.PAYMONGO_SECRET_KEY = PAYMONGO_SECRET_KEY;

    if (verifyPaymentService()) {
      console.log("\n🎉 PayMongo integration is ready!");
      console.log("\n📋 Next Steps:");
      console.log("1. Add your Firebase configuration to the .env files");
      console.log("2. Start your server: npm start");
      console.log(
        "3. Test payment endpoints at http://localhost:5007/api/payments"
      );
      console.log("\n🔗 Available Payment Endpoints:");
      console.log("- POST /api/payments/create - Create payment for delivery");
      console.log("- GET /api/payments/client/:clientId - Get client payments");
      console.log("- POST /api/payments/webhook - PayMongo webhook");
      console.log("- GET /api/payments/overdue - Get overdue payments (admin)");
    }
  } else {
    console.log("\n❌ Some environment files could not be created.");
    console.log("Please manually create .env files with the PayMongo keys.");
  }
}

// Run the setup
main();
