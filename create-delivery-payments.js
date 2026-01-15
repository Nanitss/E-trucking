const admin = require('firebase-admin');
const PaymentService = require('./server/services/PaymentService');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    // Add your Firebase project configuration here
  });
}

const db = admin.firestore();

async function createPaymentsForExistingDeliveries() {
  try {
    console.log('🔍 Scanning for deliveries without payments...');
    
    const paymentService = new PaymentService();
    
    // Get all deliveries that don't have a paymentId field
    const deliveriesSnapshot = await db.collection('deliveries')
      .where('deliveryStatus', 'in', ['completed', 'in-progress'])
      .get();
    
    if (deliveriesSnapshot.empty) {
      console.log('📭 No deliveries found that need payments.');
      return;
    }
    
    console.log(`📋 Found ${deliveriesSnapshot.size} deliveries to process`);
    
    let created = 0;
    let skipped = 0;
    let failed = 0;
    
    for (const doc of deliveriesSnapshot.docs) {
      const delivery = doc.data();
      const deliveryId = doc.id;
      
      try {
        // Check if payment already exists
        const existingPayment = await db.collection('payments')
          .where('deliveryId', '==', deliveryId)
          .get();
        
        if (!existingPayment.empty) {
          console.log(`⏭️  Skipping delivery ${deliveryId} - payment already exists`);
          skipped++;
          continue;
        }
        
        // Use delivery rate or calculate a default rate
        const amount = delivery.deliveryRate || (delivery.deliveryDistance * 2 + (delivery.cargoWeight || 1) * 10);
        
        console.log(`💰 Creating payment for delivery ${deliveryId} - Amount: ₱${amount}`);
        
        // Calculate due date (30 days from delivery date)
        const deliveryDate = delivery.deliveryDate.toDate();
        const dueDate = new Date(deliveryDate);
        dueDate.setDate(dueDate.getDate() + 30);
        
        // Create payment record directly in database (without PayMongo integration for existing deliveries)
        const paymentData = {
          deliveryId: deliveryId,
          clientId: delivery.clientId,
          amount: amount,
          currency: 'PHP',
          status: 'pending',
          dueDate: admin.firestore.Timestamp.fromDate(dueDate),
          deliveryDate: delivery.deliveryDate,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          paymentMethod: null,
          transactionFee: 0,
          netAmount: amount,
          metadata: {
            clientName: delivery.clientName,
            truckPlate: delivery.truckPlate,
            pickupLocation: delivery.pickupLocation,
            deliveryAddress: delivery.deliveryAddress || delivery.dropoffLocation
          },
          isLegacyPayment: true // Mark as legacy payment
        };
        
        const paymentRef = await db.collection('payments').add(paymentData);
        
        // Update delivery with payment reference
        await db.collection('deliveries').doc(deliveryId).update({
          paymentId: paymentRef.id,
          paymentStatus: 'pending',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ Created payment ${paymentRef.id} for delivery ${deliveryId}`);
        created++;
        
      } catch (error) {
        console.error(`❌ Failed to create payment for delivery ${deliveryId}:`, error.message);
        failed++;
      }
    }
    
    console.log('\n📊 Payment creation summary:');
    console.log(`✅ Created: ${created} payments`);
    console.log(`⏭️  Skipped: ${skipped} deliveries (already had payments)`);
    console.log(`❌ Failed: ${failed} payments`);
    
    console.log('\n🔄 Updating client payment statuses...');
    
    // Update all client payment statuses
    const clientsSnapshot = await db.collection('clients').get();
    let clientsUpdated = 0;
    
    for (const clientDoc of clientsSnapshot.docs) {
      try {
        await paymentService.updateClientPaymentStatus(clientDoc.id);
        clientsUpdated++;
      } catch (error) {
        console.error(`❌ Failed to update client ${clientDoc.id} status:`, error.message);
      }
    }
    
    console.log(`✅ Updated ${clientsUpdated} client payment statuses`);
    console.log('\n🎉 Payment setup complete!');
    
  } catch (error) {
    console.error('❌ Error setting up payments:', error);
  } finally {
    process.exit(0);
  }
}

// Check if required environment variables are set
const requiredEnvVars = ['PAYMONGO_SECRET_KEY', 'PAYMONGO_PUBLIC_KEY'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.log('⚠️  Warning: Missing PayMongo environment variables:', missingEnvVars.join(', '));
  console.log('📝 Please add these to your .env file:');
  console.log('PAYMONGO_SECRET_KEY=sk_test_your_secret_key_here');
  console.log('PAYMONGO_PUBLIC_KEY=pk_test_your_public_key_here');
  console.log('\n🔄 Proceeding with legacy payments setup...\n');
}

// Run the script
console.log('🚀 Starting payment setup for existing deliveries...\n');
createPaymentsForExistingDeliveries(); 