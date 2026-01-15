/**
 * Fix script to update payment status for existing cancelled deliveries
 * This script will find all deliveries with status 'cancelled' but without paymentStatus 'cancelled'
 * and update them to prevent billing for cancelled services.
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const serviceAccount = require('./client/server/config/serviceAccount.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://trucking-web-app-c717b-default-rtdb.firebaseio.com/"
  });
}

const db = admin.firestore();

async function fixCancelledDeliveryPayments() {
  try {
    console.log('🔧 Starting fix for cancelled delivery payments...');
    
    // Get all deliveries with status 'cancelled' but payment status not 'cancelled'
    const cancelledDeliveriesSnapshot = await db.collection('deliveries')
      .where('deliveryStatus', '==', 'cancelled')
      .get();
    
    if (cancelledDeliveriesSnapshot.empty) {
      console.log('ℹ️ No cancelled deliveries found.');
      return;
    }
    
    console.log(`📋 Found ${cancelledDeliveriesSnapshot.size} cancelled deliveries to check...`);
    
    const batch = db.batch();
    let updatedCount = 0;
    
    cancelledDeliveriesSnapshot.forEach(doc => {
      const delivery = doc.data();
      const deliveryId = doc.id;
      
      // Check if payment status is already cancelled
      if (delivery.paymentStatus === 'cancelled') {
        console.log(`✅ Delivery ${deliveryId} already has correct payment status`);
        return;
      }
      
      console.log(`🔄 Updating payment status for delivery ${deliveryId}`);
      
      // Update payment status to cancelled
      batch.update(db.collection('deliveries').doc(deliveryId), {
        paymentStatus: 'cancelled',
        paymentCancelledAt: admin.firestore.FieldValue.serverTimestamp(),
        cancellationReason: 'Delivery cancelled - Payment status updated by fix script',
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      
      updatedCount++;
    });
    
    if (updatedCount > 0) {
      await batch.commit();
      console.log(`✅ Successfully updated payment status for ${updatedCount} cancelled deliveries`);
    } else {
      console.log('ℹ️ All cancelled deliveries already have correct payment status');
    }
    
    // Verify the fix by checking payment summaries
    console.log('\n🔍 Verifying fix...');
    await verifyFix();
    
  } catch (error) {
    console.error('❌ Error fixing cancelled delivery payments:', error);
    throw error;
  }
}

async function verifyFix() {
  try {
    // Get all cancelled deliveries
    const cancelledDeliveriesSnapshot = await db.collection('deliveries')
      .where('deliveryStatus', '==', 'cancelled')
      .get();
    
    let correctlyUpdated = 0;
    let stillIncorrect = 0;
    
    cancelledDeliveriesSnapshot.forEach(doc => {
      const delivery = doc.data();
      if (delivery.paymentStatus === 'cancelled') {
        correctlyUpdated++;
      } else {
        stillIncorrect++;
        console.log(`⚠️ Delivery ${doc.id} still has incorrect payment status:`, delivery.paymentStatus);
      }
    });
    
    console.log(`✅ Verification complete:`);
    console.log(`   - ${correctlyUpdated} deliveries have correct payment status`);
    console.log(`   - ${stillIncorrect} deliveries still need fixing`);
    
    if (stillIncorrect === 0) {
      console.log('🎉 All cancelled deliveries now have correct payment status!');
      console.log('💡 Users should no longer see billing records for cancelled deliveries.');
    }
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
  }
}

// Run the fix
if (require.main === module) {
  fixCancelledDeliveryPayments()
    .then(() => {
      console.log('\n🏁 Fix script completed successfully!');
      console.log('💰 Cancelled deliveries should now be excluded from billing.');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Fix script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixCancelledDeliveryPayments, verifyFix }; 