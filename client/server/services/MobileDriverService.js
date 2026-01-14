const admin = require('firebase-admin');
const db = admin.firestore();

class MobileDriverService {
  
  // Assign a random driver to a delivery
  static async assignRandomDriver(deliveryId, deliveryData) {
    try {
      console.log(`🚛 Attempting to assign driver to delivery ${deliveryId}`);
      
      // Get all active drivers
      const driversSnapshot = await db.collection('drivers')
        .where('driverStatus', '==', 'active')
        .get();
      
      if (driversSnapshot.empty) {
        console.log('⚠️ No active drivers found for assignment');
        return {
          success: false,
          message: 'No active drivers available for assignment'
        };
      }
      
      // Get a random driver from active drivers
      const randomIndex = Math.floor(Math.random() * driversSnapshot.size);
      const randomDriverDoc = driversSnapshot.docs[randomIndex];
      const driverData = randomDriverDoc.data();
      const driverId = randomDriverDoc.id;
      
      console.log(`✅ Selected driver: ${driverData.driverName} (${driverId})`);
      
      // Update the delivery with the assigned driver
      await db.collection('deliveries').doc(deliveryId).update({
        driverId: driverId,
        driverName: driverData.driverName,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`✅ Driver ${driverData.driverName} assigned to delivery ${deliveryId}`);
      
      return {
        success: true,
        driverId: driverId,
        driverName: driverData.driverName,
        message: `Driver ${driverData.driverName} assigned successfully`
      };
      
    } catch (error) {
      console.error('❌ Error in assignRandomDriver:', error);
      throw error;
    }
  }
  
  // Get available drivers
  static async getAvailableDrivers() {
    try {
      const driversSnapshot = await db.collection('drivers')
        .where('driverStatus', '==', 'active')
        .get();
      
      const drivers = [];
      driversSnapshot.forEach(doc => {
        drivers.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log(`📋 Found ${drivers.length} available drivers`);
      return drivers;
    } catch (error) {
      console.error('❌ Error getting available drivers:', error);
      throw error;
    }
  }
  
  // Update driver location
  static async updateDriverLocation(driverId, location) {
    try {
      await db.collection('drivers').doc(driverId).update({
        currentLocation: location,
        lastLocationUpdate: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`📍 Updated location for driver ${driverId}`);
      
      return {
        success: true,
        message: 'Driver location updated successfully'
      };
    } catch (error) {
      console.error('❌ Error updating driver location:', error);
      throw error;
    }
  }
  
  // Get driver deliveries
  static async getDriverDeliveries(driverId) {
    try {
      const deliveriesSnapshot = await db.collection('deliveries')
        .where('driverId', '==', driverId)
        .orderBy('created_at', 'desc')
        .get();
      
      const deliveries = [];
      deliveriesSnapshot.forEach(doc => {
        deliveries.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log(`📦 Found ${deliveries.length} deliveries for driver ${driverId}`);
      return deliveries;
    } catch (error) {
      console.error('❌ Error getting driver deliveries:', error);
      throw error;
    }
  }
  
  // Update delivery status by driver with enhanced progression
  static async updateDeliveryStatus(deliveryId, driverId, status, location = null) {
    try {
      const updateData = {
        deliveryStatus: status,
        DeliveryStatus: status, // TitleCase for compatibility
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // Add location if provided
      if (location) {
        updateData.currentLocation = location;
      }
      
      // Map delivery status to driver/helper status
      let driverStatus = 'unknown';
      let helperStatus = 'unknown';
      
      // Enhanced status progression with timestamps and client notifications
      switch (status) {
        case 'accepted':
          updateData.acceptedAt = admin.firestore.FieldValue.serverTimestamp();
          updateData.acceptedBy = driverId;
          driverStatus = 'accepted';
          helperStatus = 'accepted';
          console.log(`✅ Driver ${driverId} accepted delivery ${deliveryId}`);
          
          // Send notification to client about acceptance
          await this.sendClientNotification(deliveryId, {
            type: 'delivery_accepted',
            title: '✅ Delivery Accepted',
            message: 'Your delivery has been accepted by a driver and will begin soon.',
            status: 'accepted'
          });
          break;
          
        case 'started':
        case 'in-progress':
          updateData.startedAt = admin.firestore.FieldValue.serverTimestamp();
          updateData.startedBy = driverId;
          driverStatus = 'in_progress';
          helperStatus = 'in_progress';
          console.log(`🚛 Driver ${driverId} started delivery ${deliveryId}`);
          
          // Send notification to client about start
          await this.sendClientNotification(deliveryId, {
            type: 'delivery_started',
            title: '🚛 Delivery Started',
            message: 'Your delivery is now in progress. The driver is on the way to pick up your cargo.',
            status: 'started'
          });
          break;
          
        case 'picked-up':
        case 'picked_up':
          updateData.pickedUpAt = admin.firestore.FieldValue.serverTimestamp();
          updateData.pickedUpBy = driverId;
          driverStatus = 'in_progress';
          helperStatus = 'in_progress';
          console.log(`📦 Driver ${driverId} picked up cargo for delivery ${deliveryId}`);
          
          // Send notification to client about pickup
          await this.sendClientNotification(deliveryId, {
            type: 'delivery_picked_up',
            title: '📦 Cargo Picked Up',
            message: 'Your cargo has been picked up and is now in transit to the destination.',
            status: 'picked-up'
          });
          break;
          
        case 'delivered':
        case 'awaiting-confirmation':
          updateData.deliveredAt = admin.firestore.FieldValue.serverTimestamp();
          updateData.deliveredBy = driverId;
          updateData.driverCompletedAt = admin.firestore.FieldValue.serverTimestamp();
          updateData.awaitingClientConfirmation = true;
          driverStatus = 'delivered';
          helperStatus = 'delivered';
          console.log(`🎯 Driver ${driverId} delivered cargo for delivery ${deliveryId} - awaiting client confirmation`);
          
          // Send notification to client about delivery completion
          await this.sendClientNotification(deliveryId, {
            type: 'delivery_delivered',
            title: '🎯 Delivery Completed',
            message: 'Your delivery has been completed! Please confirm receipt when convenient.',
            status: 'delivered',
            actionRequired: true
          });
          break;
          
        case 'completed':
          updateData.completedAt = admin.firestore.FieldValue.serverTimestamp();
          updateData.completedBy = driverId;
          updateData.finalCompletedAt = admin.firestore.FieldValue.serverTimestamp();
          updateData.awaitingClientConfirmation = false;
          driverStatus = 'completed';
          helperStatus = 'completed';
          console.log(`✅ Delivery ${deliveryId} fully completed and confirmed`);
          break;
          
        case 'cancelled':
          updateData.cancelledAt = admin.firestore.FieldValue.serverTimestamp();
          updateData.cancelledBy = driverId;
          driverStatus = 'cancelled';
          helperStatus = 'cancelled';
          console.log(`❌ Driver ${driverId} cancelled delivery ${deliveryId}`);
          break;
          
        default:
          // For unknown statuses, keep current status
          driverStatus = 'unknown';
          helperStatus = 'unknown';
          console.log(`📝 Driver ${driverId} updated delivery ${deliveryId} status to ${status}`);
      }
      
      // Add driver and helper status to update
      updateData.driverStatus = driverStatus;
      updateData.helperStatus = helperStatus;
      
      console.log(`📋 Updating delivery ${deliveryId}: status=${status}, driverStatus=${driverStatus}, helperStatus=${helperStatus}`);
      
      // Get delivery data for resource restoration
      const deliveryDoc = await db.collection('deliveries').doc(deliveryId).get();
      if (!deliveryDoc.exists) {
        throw new Error(`Delivery ${deliveryId} not found`);
      }
      const delivery = deliveryDoc.data();
      
      // Update delivery status in database
      await db.collection('deliveries').doc(deliveryId).update(updateData);
      
      const finalStatus = updateData.deliveryStatus;
      console.log(`✅ Delivery ${deliveryId} status updated to ${finalStatus} by driver ${driverId}`);
      
      // Update truck statistics when delivery is delivered
      if (finalStatus === 'delivered' && delivery.truckId) {
        console.log(`📊 Delivery ${deliveryId} marked as 'delivered' - updating truck statistics...`);
        
        const truckRef = db.collection('trucks').doc(delivery.truckId);
        const truckDoc = await truckRef.get();
        
        if (truckDoc.exists) {
          const truckData = truckDoc.data();
          const currentTotalDeliveries = truckData.TotalDeliveries || 0;
          const currentTotalKilometers = truckData.TotalKilometers || 0;
          const deliveryDistance = delivery.estimatedDistance || 0;
          
          const newTotalDeliveries = currentTotalDeliveries + 1;
          const newTotalKilometers = currentTotalKilometers + deliveryDistance;
          
          await truckRef.update({
            TotalDeliveries: newTotalDeliveries,
            TotalKilometers: parseFloat(newTotalKilometers.toFixed(2)),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          });
          
          console.log(`✅ Truck ${delivery.truckPlate || delivery.truckId} stats updated:`);
          console.log(`   Deliveries: ${currentTotalDeliveries} → ${newTotalDeliveries}`);
          console.log(`   Kilometers: ${currentTotalKilometers}km → ${newTotalKilometers.toFixed(2)}km (+${deliveryDistance}km)`);
        }
      }
      
      // Restore truck, driver, and helper statuses when delivery is finished
      if (finalStatus === 'delivered' || finalStatus === 'completed' || finalStatus === 'cancelled') {
        console.log(`🔄 Restoring resource statuses for delivery ${deliveryId}...`);
        
        // Restore truck status
        if (delivery.truckId) {
          // Check if truck is allocated to determine correct status
          const allocationsSnapshot = await db.collection('allocations')
            .where('truckId', '==', delivery.truckId)
            .where('status', '==', 'active')
            .limit(1)
            .get();
          
          const truckStatus = allocationsSnapshot.empty ? 'available' : 'free';
          await db.collection('trucks').doc(delivery.truckId).update({
            truckStatus: truckStatus,
            TruckStatus: truckStatus,
            availabilityStatus: truckStatus,
            AvailabilityStatus: truckStatus,
            activeDelivery: false,
            currentDeliveryId: null,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`✅ Truck ${delivery.truckPlate || delivery.truckId} status restored to '${truckStatus}'`);
        }
        
        // Restore driver status to 'active'
        if (delivery.driverId) {
          await db.collection('drivers').doc(delivery.driverId).update({
            DriverStatus: 'active',
            driverStatus: 'active',
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`✅ Driver ${delivery.driverName || delivery.driverId} status restored to 'active'`);
        }
        
        // Restore helper status to 'active'
        if (delivery.helperId) {
          await db.collection('helpers').doc(delivery.helperId).update({
            HelperStatus: 'active',
            helperStatus: 'active',
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`✅ Helper ${delivery.helperName || delivery.helperId} status restored to 'active'`);
        }
      }
      
      // Return appropriate message based on status
      let message = `Delivery status updated to ${finalStatus}`;
      if (finalStatus === 'awaiting-confirmation') {
        message = 'Delivery marked as delivered. Awaiting client confirmation.';
      } else if (status === 'accepted') {
        message = 'Delivery accepted successfully.';
      } else if (status === 'started' || status === 'in-progress') {
        message = 'Delivery started successfully.';
      } else if (status === 'picked-up' || status === 'picked_up') {
        message = 'Cargo picked up successfully.';
      }
      
      return {
        success: true,
        message: message,
        status: finalStatus
      };
    } catch (error) {
      console.error('❌ Error updating delivery status:', error);
      throw error;
    }
  }
  
  // Send notification to client about delivery status changes
  static async sendClientNotification(deliveryId, notificationData) {
    try {
      // Get delivery details to find the client
      const deliveryDoc = await db.collection('deliveries').doc(deliveryId).get();
      if (!deliveryDoc.exists) {
        console.log('⚠️ Delivery not found for notification:', deliveryId);
        return;
      }
      
      const delivery = deliveryDoc.data();
      const clientId = delivery.clientId;
      
      if (!clientId) {
        console.log('⚠️ No client ID found for delivery:', deliveryId);
        return;
      }
      
      // Create modern notification
      const notification = {
        recipientId: clientId,
        recipientType: 'client',
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        data: {
          deliveryId: deliveryId,
          status: notificationData.status,
          actionRequired: notificationData.actionRequired || false,
          timestamp: new Date().toISOString(),
          truckPlate: delivery.TruckPlate || 'N/A',
          driverName: delivery.DriverName || 'Driver'
        },
        isRead: false,
        priority: notificationData.actionRequired ? 'high' : 'normal',
        category: 'delivery_update',
        created_at: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // Save to notifications collection
      await db.collection('notifications').add(notification);
      
      console.log(`📱 Modern notification sent to client ${clientId}: ${notificationData.title}`);
      
    } catch (error) {
      console.error('⚠️ Error sending client notification:', error);
      // Don't throw error to prevent disrupting main operation
    }
  }
}

module.exports = MobileDriverService; 