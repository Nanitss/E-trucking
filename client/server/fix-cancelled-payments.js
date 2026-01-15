/**
 * Fix script to update payment status for existing cancelled deliveries
 */

const { admin, db } = require('./config/firebase');

async function fixCancelledDeliveryPayments() {
  try {
    console.log('🔧 Starting fix for cancelled delivery payments...');
    
    // Get all deliveries with status 'cancelled'
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
      
      console.log(`🔍 Checking delivery ${deliveryId}: status=${delivery.deliveryStatus}, paymentStatus=${delivery.paymentStatus}`);
      
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
    
    console.log('🎉 Fix completed! Cancelled deliveries should now be excluded from billing.');
    
  } catch (error) {
    console.error('❌ Error fixing cancelled delivery payments:', error);
    throw error;
  }
}

// Run the fix
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