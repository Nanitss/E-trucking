// Mobile Driver Service - Handles all mobile app backend functionality
const FirebaseService = require('./FirebaseService');
const { admin } = require('../config/firebase');
const NotificationService = require('./NotificationService');

class MobileDriverService extends FirebaseService {
  constructor() {
    super('drivers');
    this.sessionsCollection = admin.firestore().collection('driver_sessions');
    this.notificationsCollection = admin.firestore().collection('driver_notifications');
    this.assignmentsCollection = admin.firestore().collection('driver_assignments');
    this.deliveriesCollection = admin.firestore().collection('deliveries');
  }

  /**
   * Driver Authentication & Session Management
   */
  
  async createDriverSession(driverId, deviceToken, deviceInfo) {
    try {
      const sessionData = {
        driverId: driverId,
        deviceToken: deviceToken,
        isActive: true,
        status: 'available', // available, busy, offline
        lastActivity: admin.firestore.FieldValue.serverTimestamp(),
        deviceInfo: {
          platform: deviceInfo.platform || 'unknown',
          version: deviceInfo.version || '1.0.0',
          deviceId: deviceInfo.deviceId || 'unknown'
        },
        location: null,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };

      const sessionRef = await this.sessionsCollection.add(sessionData);
      return { id: sessionRef.id, ...sessionData };
    } catch (error) {
      console.error('Error creating driver session:', error);
      throw error;
    }
  }

  async updateDriverLocation(driverId, location) {
    try {
      const sessionQuery = await this.sessionsCollection
        .where('driverId', '==', driverId)
        .where('isActive', '==', true)
        .get();

      if (sessionQuery.empty) {
        throw new Error('No active session found for driver');
      }

      const sessionDoc = sessionQuery.docs[0];
      await sessionDoc.ref.update({
        location: {
          lat: location.lat,
          lng: location.lng,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          accuracy: location.accuracy || 10,
          speed: location.speed || 0
        },
        lastActivity: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      return { success: true, message: 'Location updated successfully' };
    } catch (error) {
      console.error('Error updating driver location:', error);
      throw error;
    }
  }

  async updateDriverStatus(driverId, status) {
    try {
      const sessionQuery = await this.sessionsCollection
        .where('driverId', '==', driverId)
        .where('isActive', '==', true)
        .get();

      if (sessionQuery.empty) {
        throw new Error('No active session found for driver');
      }

      const sessionDoc = sessionQuery.docs[0];
      await sessionDoc.ref.update({
        status: status, // available, busy, offline
        lastActivity: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      return { success: true, message: 'Status updated successfully' };
    } catch (error) {
      console.error('Error updating driver status:', error);
      throw error;
    }
  }

  /**
   * Driver Assignment Algorithm
   */
  
  async getAvailableDrivers(pickupCoordinates, maxDistance = 50) {
    try {
      const sessionsSnapshot = await this.sessionsCollection
        .where('isActive', '==', true)
        .where('status', '==', 'available')
        .get();

      const availableDrivers = [];
      
      for (const doc of sessionsSnapshot.docs) {
        const session = doc.data();
        
        if (session.location) {
          // Calculate distance using Haversine formula
          const distance = this.calculateDistance(
            pickupCoordinates.lat,
            pickupCoordinates.lng,
            session.location.lat,
            session.location.lng
          );
          
          if (distance <= maxDistance) {
            availableDrivers.push({
              driverId: session.driverId,
              distance: distance,
              location: session.location,
              sessionId: doc.id
            });
          }
        }
      }

      // Sort by distance (closest first)
      availableDrivers.sort((a, b) => a.distance - b.distance);
      return availableDrivers;
    } catch (error) {
      console.error('Error getting available drivers:', error);
      throw error;
    }
  }

  async assignRandomDriver(deliveryId, deliveryData) {
    try {
      console.log(`🚛 Starting driver assignment for delivery: ${deliveryId}`);
      
      const availableDrivers = await this.getAvailableDrivers(
        deliveryData.pickupCoordinates,
        50 // 50km radius
      );

      if (availableDrivers.length === 0) {
        throw new Error('No available drivers found within 50km radius');
      }

      // Random selection from available drivers
      const randomIndex = Math.floor(Math.random() * availableDrivers.length);
      const selectedDriver = availableDrivers[randomIndex];

      // Get driver details
      const driverDoc = await this.collection.doc(selectedDriver.driverId).get();
      const driverData = driverDoc.data();

      // Create assignment record
      const assignmentData = {
        assignmentId: `assign_${Date.now()}`,
        driverId: selectedDriver.driverId,
        deliveryId: deliveryId,
        status: 'assigned',
        assignedAt: admin.firestore.FieldValue.serverTimestamp(),
        acceptedAt: null,
        startedAt: null,
        completedAt: null,
        estimatedDuration: deliveryData.estimatedDuration || 120,
        actualDuration: null,
        notes: ''
      };

      const assignmentRef = await this.assignmentsCollection.add(assignmentData);

      // Update delivery with driver assignment
      await this.deliveriesCollection.doc(deliveryId).update({
        assignedDriverId: selectedDriver.driverId,
        assignedDriverName: driverData.DriverName,
        driverAssignedAt: admin.firestore.FieldValue.serverTimestamp(),
        DeliveryStatus: 'assigned'
      });

      // Update driver status to busy
      await this.updateDriverStatus(selectedDriver.driverId, 'busy');

      // Send notification to driver
      await this.sendDeliveryNotification(selectedDriver.driverId, deliveryData, assignmentRef.id);

      console.log(`✅ Driver ${driverData.DriverName} assigned to delivery ${deliveryId}`);
      
      return {
        assignmentId: assignmentRef.id,
        driverId: selectedDriver.driverId,
        driverName: driverData.DriverName,
        distance: selectedDriver.distance
      };
    } catch (error) {
      console.error('Error assigning driver:', error);
      throw error;
    }
  }

  /**
   * Notification Management
   */
  
  async sendDeliveryNotification(driverId, deliveryData, assignmentId) {
    try {
      // Create notification record
      const notificationData = {
        driverId: driverId,
        type: 'new_delivery',
        title: 'New Delivery Assignment',
        body: `New delivery from ${deliveryData.pickupLocation} to ${deliveryData.dropoffLocation}`,
        data: {
          deliveryId: deliveryData.id || deliveryData.DeliveryID,
          assignmentId: assignmentId,
          clientName: deliveryData.clientName || 'Client',
          pickupLocation: deliveryData.pickupLocation,
          dropoffLocation: deliveryData.dropoffLocation,
          weight: deliveryData.weight || deliveryData.cargoWeight,
          deliveryDate: deliveryData.deliveryDate,
          estimatedDuration: deliveryData.estimatedDuration
        },
        isRead: false,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        readAt: null
      };

      await this.notificationsCollection.add(notificationData);

      // Send FCM notification
      await NotificationService.sendToDriver(driverId, {
        title: notificationData.title,
        body: notificationData.body,
        data: notificationData.data
      });

      return { success: true, message: 'Notification sent successfully' };
    } catch (error) {
      console.error('Error sending delivery notification:', error);
      throw error;
    }
  }

  /**
   * Delivery Management for Mobile
   */
  
  async getAssignedDeliveries(driverId) {
    try {
      const assignmentsQuery = await this.assignmentsCollection
        .where('driverId', '==', driverId)
        .where('status', 'in', ['assigned', 'accepted', 'in_progress'])
        .orderBy('assignedAt', 'desc')
        .get();

      const deliveries = [];
      
      for (const doc of assignmentsQuery.docs) {
        const assignment = doc.data();
        
        // Get delivery details
        const deliveryDoc = await this.deliveriesCollection.doc(assignment.deliveryId).get();
        const deliveryData = deliveryDoc.data();
        
        deliveries.push({
          assignmentId: doc.id,
          assignment: assignment,
          delivery: {
            id: deliveryDoc.id,
            ...deliveryData
          }
        });
      }

      return deliveries;
    } catch (error) {
      console.error('Error getting assigned deliveries:', error);
      throw error;
    }
  }

  async acceptDelivery(assignmentId, driverId) {
    try {
      const assignmentDoc = await this.assignmentsCollection.doc(assignmentId).get();
      
      if (!assignmentDoc.exists) {
        throw new Error('Assignment not found');
      }

      const assignment = assignmentDoc.data();
      
      if (assignment.driverId !== driverId) {
        throw new Error('Unauthorized: Assignment belongs to different driver');
      }

      // Update assignment status
      await assignmentDoc.ref.update({
        status: 'accepted',
        acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      // Update delivery status
      await this.deliveriesCollection.doc(assignment.deliveryId).update({
        DeliveryStatus: 'in-progress',
        driverAcceptedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return { success: true, message: 'Delivery accepted successfully' };
    } catch (error) {
      console.error('Error accepting delivery:', error);
      throw error;
    }
  }

  async startDelivery(assignmentId, driverId) {
    try {
      const assignmentDoc = await this.assignmentsCollection.doc(assignmentId).get();
      
      if (!assignmentDoc.exists) {
        throw new Error('Assignment not found');
      }

      const assignment = assignmentDoc.data();
      
      if (assignment.driverId !== driverId) {
        throw new Error('Unauthorized: Assignment belongs to different driver');
      }

      // Update assignment
      await assignmentDoc.ref.update({
        status: 'in_progress',
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      // Update delivery
      await this.deliveriesCollection.doc(assignment.deliveryId).update({
        DeliveryStatus: 'in-progress',
        deliveryStartedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return { success: true, message: 'Delivery started successfully' };
    } catch (error) {
      console.error('Error starting delivery:', error);
      throw error;
    }
  }

  async completeDelivery(assignmentId, driverId, deliveryProof) {
    try {
      const assignmentDoc = await this.assignmentsCollection.doc(assignmentId).get();
      
      if (!assignmentDoc.exists) {
        throw new Error('Assignment not found');
      }

      const assignment = assignmentDoc.data();
      
      if (assignment.driverId !== driverId) {
        throw new Error('Unauthorized: Assignment belongs to different driver');
      }

      const completedAt = admin.firestore.FieldValue.serverTimestamp();
      const actualDuration = assignment.startedAt ? 
        Math.round((Date.now() - assignment.startedAt.toMillis()) / 60000) : // minutes
        null;

      // Update assignment
      await assignmentDoc.ref.update({
        status: 'completed',
        completedAt: completedAt,
        actualDuration: actualDuration,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      // Update delivery with proof
      await this.deliveriesCollection.doc(assignment.deliveryId).update({
        DeliveryStatus: 'completed',
        deliveryProof: {
          photoUrl: deliveryProof.photoUrl || null,
          signature: deliveryProof.signature || null,
          timestamp: completedAt,
          notes: deliveryProof.notes || ''
        },
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      // Set driver back to available
      await this.updateDriverStatus(driverId, 'available');

      return { success: true, message: 'Delivery completed successfully' };
    } catch (error) {
      console.error('Error completing delivery:', error);
      throw error;
    }
  }

  /**
   * Utility Functions
   */
  
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
  }

  deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  async getDriverNotifications(driverId, limit = 20) {
    try {
      const notificationsQuery = await this.notificationsCollection
        .where('driverId', '==', driverId)
        .orderBy('sentAt', 'desc')
        .limit(limit)
        .get();

      const notifications = [];
      notificationsQuery.forEach(doc => {
        notifications.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return notifications;
    } catch (error) {
      console.error('Error getting driver notifications:', error);
      throw error;
    }
  }

  async markNotificationAsRead(notificationId, driverId) {
    try {
      const notificationDoc = await this.notificationsCollection.doc(notificationId).get();
      
      if (!notificationDoc.exists) {
        throw new Error('Notification not found');
      }

      const notification = notificationDoc.data();
      
      if (notification.driverId !== driverId) {
        throw new Error('Unauthorized: Notification belongs to different driver');
      }

      await notificationDoc.ref.update({
        isRead: true,
        readAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return { success: true, message: 'Notification marked as read' };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }
}

module.exports = new MobileDriverService(); 