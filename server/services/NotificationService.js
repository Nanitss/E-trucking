// Notification Service - Handles Firebase Cloud Messaging (FCM) for driver notifications
const { admin } = require('../config/firebase');

class NotificationService {
  constructor() {
    this.messaging = admin.messaging();
    this.sessionsCollection = admin.firestore().collection('driver_sessions');
  }

  /**
   * Send notification to a specific driver
   */
  async sendToDriver(driverId, notificationData) {
    try {
      // Get driver's device token from active session
      const sessionQuery = await this.sessionsCollection
        .where('driverId', '==', driverId)
        .where('isActive', '==', true)
        .get();

      if (sessionQuery.empty) {
        console.warn(`No active session found for driver: ${driverId}`);
        return { success: false, message: 'Driver not online' };
      }

      const session = sessionQuery.docs[0].data();
      const deviceToken = session.deviceToken;

      if (!deviceToken) {
        console.warn(`No device token found for driver: ${driverId}`);
        return { success: false, message: 'No device token' };
      }

      // Prepare FCM message
      const message = {
        token: deviceToken,
        notification: {
          title: notificationData.title,
          body: notificationData.body,
          imageUrl: notificationData.imageUrl || null
        },
        data: {
          type: notificationData.type || 'general',
          ...this.convertDataToStrings(notificationData.data || {})
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'delivery_notifications',
            priority: 'high',
            defaultSound: true,
            defaultVibrateTimings: true,
            icon: 'ic_notification',
            color: '#0056b3' // Blue theme color
          }
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: notificationData.title,
                body: notificationData.body
              },
              badge: 1,
              sound: 'default',
              'mutable-content': 1
            }
          }
        }
      };

      // Send the notification
      const response = await this.messaging.send(message);
      console.log(`✅ Notification sent to driver ${driverId}:`, response);

      return { 
        success: true, 
        messageId: response,
        message: 'Notification sent successfully' 
      };
    } catch (error) {
      console.error(`❌ Error sending notification to driver ${driverId}:`, error);
      
      // Handle invalid registration token
      if (error.code === 'messaging/registration-token-not-registered' || 
          error.code === 'messaging/invalid-registration-token') {
        await this.handleInvalidToken(driverId);
      }
      
      throw error;
    }
  }

  /**
   * Send notifications to multiple drivers
   */
  async sendToMultipleDrivers(driverIds, notificationData) {
    try {
      const results = [];
      
      for (const driverId of driverIds) {
        try {
          const result = await this.sendToDriver(driverId, notificationData);
          results.push({ driverId, ...result });
        } catch (error) {
          results.push({ 
            driverId, 
            success: false, 
            error: error.message 
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error sending notifications to multiple drivers:', error);
      throw error;
    }
  }

  /**
   * Send broadcast notification to all available drivers
   */
  async broadcastToAvailableDrivers(notificationData) {
    try {
      const sessionsQuery = await this.sessionsCollection
        .where('isActive', '==', true)
        .where('status', '==', 'available')
        .get();

      const driverIds = [];
      sessionsQuery.forEach(doc => {
        const session = doc.data();
        driverIds.push(session.driverId);
      });

      if (driverIds.length === 0) {
        return { success: true, message: 'No available drivers to notify' };
      }

      const results = await this.sendToMultipleDrivers(driverIds, notificationData);
      
      const successCount = results.filter(r => r.success).length;
      console.log(`📢 Broadcast sent to ${successCount}/${driverIds.length} available drivers`);

      return {
        success: true,
        totalDrivers: driverIds.length,
        successCount: successCount,
        results: results
      };
    } catch (error) {
      console.error('Error broadcasting to available drivers:', error);
      throw error;
    }
  }

  /**
   * Handle invalid or expired device tokens
   */
  async handleInvalidToken(driverId) {
    try {
      console.warn(`🔄 Handling invalid token for driver: ${driverId}`);
      
      const sessionQuery = await this.sessionsCollection
        .where('driverId', '==', driverId)
        .where('isActive', '==', true)
        .get();

      if (!sessionQuery.empty) {
        const sessionDoc = sessionQuery.docs[0];
        await sessionDoc.ref.update({
          deviceToken: null,
          isActive: false,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`♻️ Cleared invalid token for driver: ${driverId}`);
      }
    } catch (error) {
      console.error('Error handling invalid token:', error);
    }
  }

  /**
   * Update driver's device token
   */
  async updateDeviceToken(driverId, newToken) {
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
        deviceToken: newToken,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`🔄 Updated device token for driver: ${driverId}`);
      return { success: true, message: 'Device token updated successfully' };
    } catch (error) {
      console.error('Error updating device token:', error);
      throw error;
    }
  }

  /**
   * Send delivery assignment notification with specific formatting
   */
  async sendDeliveryAssignment(driverId, deliveryData) {
    const notificationData = {
      title: '🚛 New Delivery Assignment',
      body: `Pickup: ${deliveryData.pickupLocation}\nDropoff: ${deliveryData.dropoffLocation}`,
      type: 'new_delivery',
      data: {
        deliveryId: deliveryData.id,
        assignmentId: deliveryData.assignmentId,
        clientName: deliveryData.clientName,
        pickupLocation: deliveryData.pickupLocation,
        dropoffLocation: deliveryData.dropoffLocation,
        weight: deliveryData.weight || '0',
        estimatedDuration: deliveryData.estimatedDuration || '0',
        priority: 'high'
      }
    };

    return await this.sendToDriver(driverId, notificationData);
  }

  /**
   * Send delivery update notification
   */
  async sendDeliveryUpdate(driverId, updateData) {
    const notificationData = {
      title: '📋 Delivery Update',
      body: updateData.message,
      type: 'delivery_update',
      data: {
        deliveryId: updateData.deliveryId,
        updateType: updateData.type,
        message: updateData.message
      }
    };

    return await this.sendToDriver(driverId, notificationData);
  }

  /**
   * Send system message notification
   */
  async sendSystemMessage(driverId, message) {
    const notificationData = {
      title: '📢 System Message',
      body: message,
      type: 'system_message',
      data: {
        message: message,
        timestamp: Date.now().toString()
      }
    };

    return await this.sendToDriver(driverId, notificationData);
  }

  /**
   * Schedule delayed notification (for timeouts, reminders, etc.)
   */
  async scheduleNotification(driverId, notificationData, delayMinutes) {
    try {
      // In a production environment, you'd use a job queue like Bull or Agenda
      // For now, we'll use setTimeout for simple scheduling
      setTimeout(async () => {
        try {
          await this.sendToDriver(driverId, notificationData);
          console.log(`⏰ Scheduled notification sent to driver: ${driverId}`);
        } catch (error) {
          console.error('Error sending scheduled notification:', error);
        }
      }, delayMinutes * 60 * 1000);

      return { 
        success: true, 
        message: `Notification scheduled for ${delayMinutes} minutes` 
      };
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  }

  /**
   * Convert data object to strings (FCM requirement)
   */
  convertDataToStrings(data) {
    const stringData = {};
    for (const [key, value] of Object.entries(data)) {
      stringData[key] = value ? value.toString() : '';
    }
    return stringData;
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(driverId = null) {
    try {
      const notificationsCollection = admin.firestore().collection('driver_notifications');
      
      let query = notificationsCollection;
      if (driverId) {
        query = query.where('driverId', '==', driverId);
      }

      const snapshot = await query.get();
      
      const stats = {
        total: 0,
        sent: 0,
        read: 0,
        unread: 0,
        byType: {}
      };

      snapshot.forEach(doc => {
        const notification = doc.data();
        stats.total++;
        
        if (notification.sentAt) stats.sent++;
        if (notification.isRead) stats.read++;
        else stats.unread++;
        
        const type = notification.type || 'unknown';
        stats.byType[type] = (stats.byType[type] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error getting notification stats:', error);
      throw error;
    }
  }

  /**
   * Cleanup old notifications (run periodically)
   */
  async cleanupOldNotifications(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const notificationsCollection = admin.firestore().collection('driver_notifications');
      const oldNotificationsQuery = await notificationsCollection
        .where('sentAt', '<', cutoffDate)
        .get();

      const batch = admin.firestore().batch();
      let deleteCount = 0;

      oldNotificationsQuery.forEach(doc => {
        batch.delete(doc.ref);
        deleteCount++;
      });

      if (deleteCount > 0) {
        await batch.commit();
        console.log(`🧹 Cleaned up ${deleteCount} old notifications`);
      }

      return { success: true, deletedCount: deleteCount };
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService(); 