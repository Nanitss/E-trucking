// Notification Service for handling real-time notifications
const FirebaseService = require('./FirebaseService');
const { admin } = require('../config/firebase');

console.log('NotificationService loaded');

class NotificationService extends FirebaseService {
  constructor() {
    super('notifications');
  }

  // Create a new notification
  async createNotification(notification) {
    try {
      const notificationData = {
        ...notification,
        read: false,
        created_at: admin.firestore.FieldValue.serverTimestamp()
      };

      const docRef = await this.collection.add(notificationData);
      const snapshot = await docRef.get();
      
      return {
        id: snapshot.id,
        ...snapshot.data()
      };
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Get notifications for a specific user
  async getUserNotifications(userId, limit = 30) {
    try {
      const query = this.collection
        .where('userId', '==', userId)
        .orderBy('created_at', 'desc')
        .limit(limit);
      
      const snapshot = await query.get();
      return this._formatDocs(snapshot);
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      
      // Handle quota exceeded errors gracefully
      if (error.code === 8 || error.message.includes('RESOURCE_EXHAUSTED') || error.message.includes('Quota exceeded')) {
        console.warn('⚠️ Firestore quota exceeded - returning empty notifications array');
        return [];
      }
      
      // Handle missing composite index - fall back to simple query and sort in memory
      if (error.code === 9 || error.message.includes('FAILED_PRECONDITION') || error.message.includes('requires an index')) {
        console.warn('⚠️ Firestore index missing for notifications - falling back to simple query');
        try {
          const fallbackQuery = this.collection
            .where('userId', '==', userId)
            .limit(limit);
          const fallbackSnapshot = await fallbackQuery.get();
          const docs = this._formatDocs(fallbackSnapshot);
          // Sort in memory by created_at descending
          return docs.sort((a, b) => {
            const aTime = a.created_at?._seconds || a.created_at?.seconds || 0;
            const bTime = b.created_at?._seconds || b.created_at?.seconds || 0;
            return bTime - aTime;
          });
        } catch (fallbackError) {
          console.error('Error in fallback notification query:', fallbackError);
          return [];
        }
      }
      
      throw error;
    }
  }

  // Get unread notifications count for a user
  async getUnreadCount(userId) {
    try {
      const query = this.collection
        .where('userId', '==', userId)
        .where('read', '==', false);
      
      const snapshot = await query.get();
      return snapshot.size;
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      
      // Handle quota exceeded errors gracefully
      if (error.code === 8 || error.message.includes('RESOURCE_EXHAUSTED') || error.message.includes('Quota exceeded')) {
        console.warn('⚠️ Firestore quota exceeded - returning 0 for unread count');
        return 0;
      }
      
      // Handle missing composite index - fall back to simple query and filter in memory
      if (error.code === 9 || error.message.includes('FAILED_PRECONDITION') || error.message.includes('requires an index')) {
        console.warn('⚠️ Firestore index missing for unread count - falling back to simple query');
        try {
          const fallbackQuery = this.collection
            .where('userId', '==', userId);
          const fallbackSnapshot = await fallbackQuery.get();
          let count = 0;
          fallbackSnapshot.forEach(doc => {
            if (doc.data().read === false) count++;
          });
          return count;
        } catch (fallbackError) {
          console.error('Error in fallback unread count query:', fallbackError);
          return 0;
        }
      }
      
      throw error;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId) {
    try {
      await this.collection.doc(notificationId).update({
        read: true,
        read_at: admin.firestore.FieldValue.serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId) {
    try {
      const batch = admin.firestore().batch();
      let query;
      let snapshot;

      try {
        query = this.collection
          .where('userId', '==', userId)
          .where('read', '==', false);
        snapshot = await query.get();
      } catch (indexError) {
        // Fallback if composite index is missing
        if (indexError.code === 9 || indexError.message.includes('FAILED_PRECONDITION') || indexError.message.includes('requires an index')) {
          console.warn('⚠️ Firestore index missing for markAllAsRead - falling back to simple query');
          query = this.collection.where('userId', '==', userId);
          snapshot = await query.get();
        } else {
          throw indexError;
        }
      }
      
      if (snapshot.empty) {
        return true;
      }
      
      snapshot.forEach(doc => {
        if (doc.data().read === false) {
          batch.update(doc.ref, { 
            read: true,
            read_at: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      });
      
      await batch.commit();
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Create a notification from an audit entry
  async createFromAudit(auditEntry) {
    try {
      const { userId, username, action, entityType, entityId, details, timestamp } = auditEntry;
      
      let title = '';
      let message = '';
      let type = entityType;
      
      // Format the notification message based on the action
      switch (action) {
        case 'create':
          title = `New ${entityType} created`;
          message = details?.name 
            ? `${username} created a new ${entityType}: ${details.name}`
            : `${username} created a new ${entityType}`;
          break;
        case 'update':
          title = `${entityType} updated`;
          message = details?.name 
            ? `${username} updated ${entityType}: ${details.name}`
            : `${username} updated a ${entityType}`;
          break;
        case 'delete':
          title = `${entityType} deleted`;
          message = `${username} deleted a ${entityType}`;
          break;
        case 'login':
          title = 'User logged in';
          message = `${username} logged in to the system`;
          type = 'security';
          break;
        case 'logout':
          title = 'User logged out';
          message = `${username} logged out of the system`;
          type = 'security';
          break;
        case 'permission_change':
          title = 'Permissions changed';
          message = `${username} changed permissions for ${details?.targetUsername || 'a user'}`;
          type = 'security';
          break;
        case 'status_change':
          title = `${entityType} status changed`;
          message = `${username} changed ${entityType} status to ${details?.status || 'updated'}`;
          break;
        case 'delivery_booked':
          title = 'New delivery booked';
          message = `${username} booked a new delivery`;
          type = 'delivery';
          break;
        case 'delivery_cancelled':
          title = 'Delivery cancelled';
          message = `${username} cancelled a delivery`;
          type = 'delivery';
          break;
        case 'delivery_completed':
          title = 'Delivery completed';
          message = `${username} marked a delivery as completed`;
          type = 'delivery';
          break;
        default:
          title = action.replace(/_/g, ' ');
          title = title.charAt(0).toUpperCase() + title.slice(1);
          message = `${username} performed action on ${entityType}`;
      }
      
      // Create notification object
      const notification = {
        userId,
        title,
        message,
        type,
        entityType,
        entityId,
        auditId: auditEntry.id,
        source: 'audit',
        read: false,
        created_at: timestamp // Use the same timestamp as the audit entry
      };
      
      return await this.createNotification(notification);
    } catch (error) {
      console.error('Error creating notification from audit:', error);
      // Don't throw the error to prevent disrupting the main operation
      return null;
    }
  }
}

module.exports = new NotificationService(); 