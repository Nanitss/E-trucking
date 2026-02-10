/**
 * E-Trucking API Cloud Functions Entry Point
 * 
 * This file exports the Express app as a Firebase Cloud Function (1st Gen).
 * Using v1 functions to maintain compatibility with existing deployed function.
 * 
 * NOTE: The function is named 'server' (not 'api') to avoid URL path doubling.
 * Firebase Hosting rewrites /api/** to this function.
 */

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

// Import the Express app from the local server.js
const app = require('./server');

// Export the Express app as a Cloud Function (1st Gen)
// Named 'server' to avoid path conflicts with /api/** rewrite
exports.server = functions.https.onRequest(app);

/**
 * Firestore Trigger: onDeliveryStatusChange
 * 
 * Watches for delivery status changes in Firestore and automatically restores
 * driver, helper, and truck statuses when a delivery is delivered/completed/cancelled.
 * 
 * This is critical because the mobile app updates delivery statuses directly in
 * Firebase, bypassing server-side API hooks that would normally handle restoration.
 */
exports.onDeliveryStatusChange = functions.firestore
  .document('deliveries/{deliveryId}')
  .onUpdate(async (change, context) => {
    const deliveryId = context.params.deliveryId;
    const before = change.before.data();
    const after = change.after.data();

    // Get the delivery status (check both naming conventions)
    const oldStatus = (before.deliveryStatus || before.DeliveryStatus || '').toLowerCase();
    const newStatus = (after.deliveryStatus || after.DeliveryStatus || '').toLowerCase();

    // Only proceed if status actually changed
    if (oldStatus === newStatus) {
      return null;
    }

    console.log(`🔄 [Trigger] Delivery ${deliveryId} status changed: '${oldStatus}' → '${newStatus}'`);

    // Final statuses that should trigger resource restoration
    const finalStatuses = ['delivered', 'completed', 'cancelled'];

    if (!finalStatuses.includes(newStatus)) {
      return null;
    }

    // Check if resources were already restored (prevent double-processing)
    // If driver/helper statuses in the delivery doc are already 'delivered'/'completed'/'cancelled',
    // AND the driver/helper docs are already 'active', skip
    const db = admin.firestore();

    try {
      const driverId = after.driverId;
      const helperId = after.helperId;
      const truckId = after.truckId;

      console.log(`🔄 [Trigger] Restoring resources for delivery ${deliveryId}:`);
      console.log(`   - Driver: ${driverId || 'none'}`);
      console.log(`   - Helper: ${helperId || 'none'}`);
      console.log(`   - Truck: ${truckId || 'none'}`);

      const batch = db.batch();
      let batchHasUpdates = false;

      // Restore driver status to 'active'
      if (driverId) {
        const driverRef = db.collection('drivers').doc(driverId);
        const driverDoc = await driverRef.get();
        if (driverDoc.exists) {
          const driverData = driverDoc.data();
          const currentDriverStatus = (driverData.DriverStatus || driverData.driverStatus || '').toLowerCase();
          // Only restore if not already active
          if (currentDriverStatus !== 'active') {
            batch.update(driverRef, {
              DriverStatus: 'active',
              driverStatus: 'active',
              currentDeliveryId: null,
              updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
            batchHasUpdates = true;
            console.log(`   ✅ Driver ${driverData.DriverName || driverId} will be restored to 'active' (was '${currentDriverStatus}')`);
          } else {
            console.log(`   ℹ️ Driver ${driverData.DriverName || driverId} already 'active' - skipping`);
          }
        }
      }

      // Restore helper status to 'active'
      if (helperId) {
        const helperRef = db.collection('helpers').doc(helperId);
        const helperDoc = await helperRef.get();
        if (helperDoc.exists) {
          const helperData = helperDoc.data();
          const currentHelperStatus = (helperData.HelperStatus || helperData.helperStatus || '').toLowerCase();
          if (currentHelperStatus !== 'active') {
            batch.update(helperRef, {
              HelperStatus: 'active',
              helperStatus: 'active',
              currentDeliveryId: null,
              updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
            batchHasUpdates = true;
            console.log(`   ✅ Helper ${helperData.HelperName || helperId} will be restored to 'active' (was '${currentHelperStatus}')`);
          } else {
            console.log(`   ℹ️ Helper ${helperData.HelperName || helperId} already 'active' - skipping`);
          }
        }
      }

      // Sync delivery status fields (mobile app may only update one field name)
      const deliveryRef = db.collection('deliveries').doc(deliveryId);
      const statusSyncUpdate = {};
      if (after.deliveryStatus !== newStatus) statusSyncUpdate.deliveryStatus = newStatus;
      if (after.DeliveryStatus !== newStatus) statusSyncUpdate.DeliveryStatus = newStatus;
      if (after.status !== newStatus) statusSyncUpdate.status = newStatus;
      if (Object.keys(statusSyncUpdate).length > 0) {
        statusSyncUpdate.updated_at = admin.firestore.FieldValue.serverTimestamp();
        batch.update(deliveryRef, statusSyncUpdate);
        batchHasUpdates = true;
        console.log(`   ✅ Syncing delivery status fields to '${newStatus}':`, Object.keys(statusSyncUpdate));
      }

      // Restore truck status + add kilometers on completion
      if (truckId) {
        const truckRef = db.collection('trucks').doc(truckId);
        const truckDoc = await truckRef.get();
        if (truckDoc.exists) {
          const truckData = truckDoc.data();
          const currentTruckStatus = (truckData.truckStatus || truckData.TruckStatus || '').toLowerCase();

          // Add delivery distance to truck totalKilometers on completion/delivery
          const truckUpdateData = {};
          if (newStatus === 'delivered' || newStatus === 'completed') {
            const deliveryDistance = parseFloat(after.deliveryDistance || after.DeliveryDistance || 0);
            const currentKm = parseFloat(truckData.totalKilometers || 0);
            const completedDeliveries = parseInt(truckData.totalCompletedDeliveries || 0);
            const newTotalKm = currentKm + deliveryDistance;
            const newCompletedDeliveries = completedDeliveries + 1;
            const newAvgKm = newCompletedDeliveries > 0 ? Math.round(newTotalKm / newCompletedDeliveries) : 0;

            truckUpdateData.totalKilometers = newTotalKm;
            truckUpdateData.totalCompletedDeliveries = newCompletedDeliveries;
            truckUpdateData.averageKmPerDelivery = newAvgKm;
            console.log(`   📏 Adding ${deliveryDistance}km to truck. New total: ${newTotalKm}km (${newCompletedDeliveries} deliveries)`);

            // Auto-maintenance check: every 10,000km
            if (newTotalKm > 0 && Math.floor(newTotalKm / 10000) > Math.floor(currentKm / 10000)) {
              truckUpdateData.truckStatus = 'maintenance';
              truckUpdateData.TruckStatus = 'maintenance';
              truckUpdateData.operationalStatus = 'maintenance';
              truckUpdateData.OperationalStatus = 'maintenance';
              truckUpdateData.maintenanceReason = `Automatic oil change at ${Math.floor(newTotalKm / 10000) * 10000}km`;
              truckUpdateData.maintenanceScheduled = true;
              console.log(`   🔧 AUTO-MAINTENANCE: Truck crossed ${Math.floor(newTotalKm / 10000) * 10000}km threshold - setting to maintenance for oil change`);
              batchHasUpdates = true;
              batch.update(truckRef, { ...truckUpdateData, updated_at: admin.firestore.FieldValue.serverTimestamp() });
            } else if (currentTruckStatus === 'on-delivery' || currentTruckStatus === 'on_delivery') {
              // Restore truck to available/free status
              const allocationsSnapshot = await db.collection('allocations')
                .where('truckId', '==', truckId)
                .where('status', '==', 'active')
                .limit(1)
                .get();
              const restoredStatus = allocationsSnapshot.empty ? 'available' : 'free';
              truckUpdateData.truckStatus = restoredStatus;
              truckUpdateData.TruckStatus = restoredStatus;
              truckUpdateData.availabilityStatus = restoredStatus;
              truckUpdateData.AvailabilityStatus = restoredStatus;
              truckUpdateData.activeDelivery = false;
              truckUpdateData.currentDeliveryId = null;
              console.log(`   ✅ Truck ${truckData.truckPlate || truckId} will be restored to '${restoredStatus}' + km updated`);
              batchHasUpdates = true;
              batch.update(truckRef, { ...truckUpdateData, updated_at: admin.firestore.FieldValue.serverTimestamp() });
            } else {
              // Just update km stats even if truck status doesn't need restoration
              batchHasUpdates = true;
              batch.update(truckRef, { ...truckUpdateData, updated_at: admin.firestore.FieldValue.serverTimestamp() });
              console.log(`   ✅ Truck ${truckData.truckPlate || truckId} km updated (status '${currentTruckStatus}' unchanged)`);
            }
          } else {
            // Cancelled - just restore status if needed
            if (currentTruckStatus === 'on-delivery' || currentTruckStatus === 'on_delivery') {
              const allocationsSnapshot = await db.collection('allocations')
                .where('truckId', '==', truckId)
                .where('status', '==', 'active')
                .limit(1)
                .get();
              const restoredStatus = allocationsSnapshot.empty ? 'available' : 'free';
              batch.update(truckRef, {
                truckStatus: restoredStatus,
                TruckStatus: restoredStatus,
                availabilityStatus: restoredStatus,
                AvailabilityStatus: restoredStatus,
                activeDelivery: false,
                currentDeliveryId: null,
                updated_at: admin.firestore.FieldValue.serverTimestamp()
              });
              batchHasUpdates = true;
              console.log(`   ✅ Truck ${truckData.truckPlate || truckId} will be restored to '${restoredStatus}' (cancelled)`);
            } else {
              console.log(`   ℹ️ Truck ${truckData.truckPlate || truckId} status is '${currentTruckStatus}' - skipping`);
            }
          }
        }
      }

      if (batchHasUpdates) {
        await batch.commit();
        console.log(`✅ [Trigger] Resources restored for delivery ${deliveryId}`);
      } else {
        console.log(`ℹ️ [Trigger] No resource updates needed for delivery ${deliveryId}`);
      }

      return null;
    } catch (error) {
      console.error(`❌ [Trigger] Error restoring resources for delivery ${deliveryId}:`, error);
      return null;
    }
  });

