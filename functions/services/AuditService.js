// Firebase Audit Service
const FirebaseService = require('./FirebaseService');
const { admin } = require('../config/firebase');
const NotificationService = require('./NotificationService');

class AuditService extends FirebaseService {
  constructor() {
    super('audit_trail');
  }

  // Log an action performed by a user
  async logAction(userId, username, action, entityType, entityId, details = {}) {
    try {
      console.log(`[AuditService] Logging action: ${action} by ${username} on ${entityType} ${entityId}`);
      
      if (!userId) {
        console.error('[AuditService] Error: Missing userId for audit log');
        console.log('[AuditService] Debug info:', { username, action, entityType, entityId });
        return null;
      }
      
      if (!username) {
        console.error('[AuditService] Error: Missing username for audit log');
        console.log('[AuditService] Debug info:', { userId, action, entityType, entityId });
        return null;
      }
      
      const auditEntry = {
        userId,
        username,
        action, // e.g., 'create', 'update', 'delete', 'login', 'logout', etc.
        entityType, // e.g., 'delivery', 'driver', 'truck', etc.
        entityId,
        details,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      };
      
      console.log('[AuditService] Audit entry data:', JSON.stringify(auditEntry, null, 2));
      
      const result = await this.create(auditEntry);
      console.log(`[AuditService] Successfully logged ${action} action with ID: ${result.id}`);
      
      // Create a notification for this audit entry
      try {
        await NotificationService.createFromAudit({
          ...result,
          id: result.id
        });
        console.log(`[AuditService] Created notification for ${action} action`);
      } catch (notificationError) {
        console.error('[AuditService] Error creating notification:', notificationError);
        // Don't throw error, continue with operation
      }
      
      return result;
    } catch (error) {
      console.error('[AuditService] Error logging audit action:', error);
      console.error('[AuditService] Error details:', error.message);
      console.error('[AuditService] Stack trace:', error.stack);
      console.error('[AuditService] Attempted params:', { userId, username, action, entityType, entityId });
      // Don't throw the error to prevent disrupting the main operation
      // Just log it and continue
      return null;
    }
  }

  // Log a creation action
  async logCreate(userId, username, entityType, entityId, details = {}) {
    return this.logAction(
      userId,
      username,
      'create',
      entityType,
      entityId,
      details
    );
  }

  // Log an update action
  async logUpdate(userId, username, entityType, entityId, details = {}) {
    return this.logAction(
      userId,
      username,
      'update',
      entityType,
      entityId,
      details
    );
  }

  // Log a delete action
  async logDelete(userId, username, entityType, entityId, details = {}) {
    return this.logAction(
      userId,
      username,
      'delete',
      entityType,
      entityId,
      details
    );
  }

  // Log a login action
  async logLogin(userId, username, ipAddress) {
    try {
      return await this.create({
        userId: userId,
        username: username,
        action: 'login',
        entityType: 'authentication',
        details: {
          ipAddress: ipAddress,
          loginTime: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error logging login audit:', error);
      
      // Handle quota exceeded - don't fail the login process
      if (error.code === 8 || error.message?.includes('RESOURCE_EXHAUSTED') || error.message?.includes('Quota exceeded')) {
        console.warn('⚠️ Firestore quota exceeded - skipping audit log for login');
        return null; // Return null instead of throwing
      }
      
      throw error;
    }
  }

  // Log a logout action
  async logLogout(userId, username) {
    try {
      return await this.create({
        userId: userId,
        username: username,
        action: 'logout',
        entityType: 'authentication',
        details: {
          logoutTime: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error logging logout audit:', error);
      
      // Handle quota exceeded - don't fail the logout process
      if (error.code === 8 || error.message?.includes('RESOURCE_EXHAUSTED') || error.message?.includes('Quota exceeded')) {
        console.warn('⚠️ Firestore quota exceeded - skipping audit log for logout');
        return null; // Return null instead of throwing
      }
      
      throw error;
    }
  }

  // Log a delivery booking
  async logDeliveryBooking(userId, username, deliveryId, deliveryDetails) {
    return this.logAction(
      userId,
      username,
      'delivery_booked',
      'delivery',
      deliveryId,
      deliveryDetails
    );
  }

  // Log a delivery cancellation
  async logDeliveryCancellation(userId, username, deliveryId, reason) {
    return this.logAction(
      userId,
      username,
      'delivery_cancelled',
      'delivery',
      deliveryId,
      { reason }
    );
  }

  // Log a view action
  async logView(userId, username, entityType, entityId, details = {}) {
    return this.logAction(
      userId,
      username,
      'view',
      entityType,
      entityId,
      details
    );
  }

  // Log a search action
  async logSearch(userId, username, searchQuery, results = {}) {
    return this.logAction(
      userId,
      username,
      'search',
      'system',
      '',
      { 
        searchQuery,
        resultsCount: results.length || 0,
        results
      }
    );
  }

  // Log an export action
  async logExport(userId, username, entityType, format, filters = {}) {
    return this.logAction(
      userId,
      username,
      'export',
      entityType,
      '',
      { 
        format,
        filters
      }
    );
  }

  // Log a user profile update
  async logProfileUpdate(userId, username, changes = {}) {
    return this.logAction(
      userId,
      username,
      'profile_updated',
      'user',
      userId,
      { changes }
    );
  }

  // Log a permission change
  async logPermissionChange(userId, username, targetUserId, targetUsername, oldPermissions, newPermissions) {
    return this.logAction(
      userId,
      username,
      'permission_change',
      'user',
      targetUserId,
      { 
        targetUsername,
        oldPermissions,
        newPermissions
      }
    );
  }

  // Log a system configuration change
  async logConfigChange(userId, username, configType, changes = {}) {
    return this.logAction(
      userId,
      username,
      'config_change',
      'system',
      configType,
      { changes }
    );
  }

  // Log a payment action
  async logPayment(userId, action, details = {}) {
    return this.logAction(
      userId,
      'client', // Default username for payment actions
      action,
      'payment',
      details.paymentId || '',
      details
    );
  }

  // Get recent activity for display on dashboard
  async getRecentActivity(limit = 20) {
    try {
      const snapshot = await this.collection
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      const activities = snapshot.docs.map(doc => {
        const data = doc.data();
        
        // Format the timestamp for display
        let formattedTime = 'Just now';
        if (data.timestamp) {
          const timestamp = data.timestamp.toDate();
          const now = new Date();
          const diffMs = now - timestamp;
          const diffMins = Math.floor(diffMs / (1000 * 60));
          
          if (diffMins < 1) {
            formattedTime = 'Just now';
          } else if (diffMins < 60) {
            formattedTime = `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
          } else if (diffMins < 24 * 60) {
            const hours = Math.floor(diffMins / 60);
            formattedTime = `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
          } else {
            const days = Math.floor(diffMins / (24 * 60));
            formattedTime = `${days} ${days === 1 ? 'day' : 'days'} ago`;
          }
        }

        // Generate a user-friendly description based on the action and entity type
        let title = '';
        let details = '';
        let type = '';
        
        switch (data.action) {
          case 'create':
            title = `New ${data.entityType} created`;
            details = data.details.name || `${data.entityType} #${data.entityId}`;
            type = data.entityType;
            break;
          case 'update':
            title = `${data.entityType} updated`;
            details = data.details.name || `${data.entityType} #${data.entityId}`;
            type = data.entityType;
            break;
          case 'delete':
            title = `${data.entityType} deleted`;
            details = data.details.name || `${data.entityType} #${data.entityId}`;
            type = data.entityType;
            break;
          case 'login':
            title = 'User logged in';
            details = `${data.username} signed in`;
            type = 'login';
            break;
          case 'logout':
            title = 'User logged out';
            details = `${data.username} signed out`;
            type = 'logout';
            break;
          case 'status_change':
            title = `${data.entityType} status changed`;
            details = `Status changed to: ${data.details.status || data.details.requestBody?.status || 'updated'}`;
            type = data.entityType;
            break;
          case 'delivery_completed':
            title = 'Delivery completed';
            details = data.details.description || `Order #${data.entityId}`;
            type = 'delivery';
            break;
          case 'delivery_booked':
            title = 'Delivery booked';
            details = data.details.description || `Order #${data.entityId}`;
            type = 'delivery';
            break;
          case 'delivery_cancelled':
            title = 'Delivery cancelled';
            details = data.details.reason || `Order #${data.entityId}`;
            type = 'delivery';
            break;
          case 'password_reset':
            title = 'Password reset';
            details = `Password was reset`;
            type = 'user';
            break;
          case 'user_profile_updated':
            title = 'Profile updated';
            details = `User profile was updated`;
            type = 'user';
            break;
          default:
            title = data.action.replace(/_/g, ' ');
            title = title.charAt(0).toUpperCase() + title.slice(1);
            details = JSON.stringify(data.details);
            type = data.entityType;
        }

        return {
          id: doc.id,
          type,
          title,
          details,
          user: data.username,
          time: formattedTime,
          entityId: data.entityId,
          entityType: data.entityType,
          action: data.action,
          timestamp: data.timestamp ? data.timestamp.toDate() : new Date(),
          raw: data // Include raw data for debugging
        };
      });

      return activities;
    } catch (error) {
      console.error('Error getting recent activity:', error);
      
      // Return fallback demo data if Firebase query fails
      console.log('Returning fallback activity data due to Firebase error');
      return [
        {
          id: 'demo-1',
          type: 'delivery',
          title: 'New delivery created',
          details: 'Smart booking system used for 10 tons cargo',
          user: 'System',
          time: '5 minutes ago',
          entityId: 'demo-delivery-1',
          entityType: 'delivery',
          action: 'create',
          timestamp: new Date(Date.now() - 5 * 60 * 1000)
        },
        {
          id: 'demo-2',
          type: 'truck',
          title: 'Truck allocated',
          details: 'Truck ABC-123 allocated for delivery',
          user: 'System',
          time: '10 minutes ago',
          entityId: 'demo-truck-1',
          entityType: 'truck',
          action: 'update',
          timestamp: new Date(Date.now() - 10 * 60 * 1000)
        },
        {
          id: 'demo-3',
          type: 'user',
          title: 'User logged in',
          details: 'Client accessed dashboard',
          user: 'Client User',
          time: '15 minutes ago',
          entityId: 'demo-user-1',
          entityType: 'user',
          action: 'login',
          timestamp: new Date(Date.now() - 15 * 60 * 1000)
        },
        {
          id: 'demo-4',
          type: 'delivery',
          title: 'Delivery completed',
          details: 'Order #DEL-456 successfully delivered',
          user: 'Driver John',
          time: '1 hour ago',
          entityId: 'demo-delivery-2',
          entityType: 'delivery',
          action: 'delivery_completed',
          timestamp: new Date(Date.now() - 60 * 60 * 1000)
        },
        {
          id: 'demo-5',
          type: 'driver',
          title: 'Driver updated',
          details: 'Driver location updated',
          user: 'Driver Maria',
          time: '2 hours ago',
          entityId: 'demo-driver-1',
          entityType: 'driver',
          action: 'update',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
        }
      ];
    }
  }

  // Get audit entries for a specific entity
  async getEntityAudit(entityType, entityId, action = null) {
    try {
      let query = this.collection
        .where('entityType', '==', entityType)
        .where('entityId', '==', entityId);
      
      // Add action filter if provided
      if (action) {
        query = query.where('action', '==', action);
      }
      
      // Order by timestamp, most recent first
      query = query.orderBy('timestamp', 'desc');
      
      const snapshot = await query.get();
      return this._formatDocs(snapshot);
    } catch (error) {
      console.error('Error getting entity audit trail:', error);
      throw error;
    }
  }

  // Get audit trail for a specific user
  async getUserAudit(userId, action = null) {
    try {
      let query = this.collection.where('userId', '==', userId);
      
      // Add action filter if provided
      if (action) {
        query = query.where('action', '==', action);
      }
      
      // Order by timestamp, most recent first
      query = query.orderBy('timestamp', 'desc');
      
      const snapshot = await query.get();
      return this._formatDocs(snapshot);
    } catch (error) {
      console.error('Error getting user audit trail:', error);
      throw error;
    }
  }
  
  // Get all audit entries (with pagination)
  async getAllAuditEntries(page = 1, limit = 50) {
    try {
      const startAt = (page - 1) * limit;
      let query = this.collection.orderBy('timestamp', 'desc');
      
      // Get total count
      const countSnapshot = await query.get();
      const totalItems = countSnapshot.size;
      
      // Apply pagination
      query = query.limit(limit);
      
      // If not the first page, use startAfter with a document cursor
      if (page > 1) {
        // This is a simplistic approach - real pagination would use cursors
        const snapshot = await this.collection.orderBy('timestamp', 'desc').limit(startAt).get();
        if (snapshot.docs.length > 0) {
          const lastDoc = snapshot.docs[snapshot.docs.length - 1];
          query = query.startAfter(lastDoc);
        }
      }
      
      const snapshot = await query.get();
      const items = this._formatDocs(snapshot);
      
      return {
        items,
        pagination: {
          page,
          limit,
          totalItems,
          totalPages: Math.ceil(totalItems / limit)
        }
      };
    } catch (error) {
      console.error('Error getting all audit entries:', error);
      throw error;
    }
  }

  // Get filtered audit entries with pagination
  async getFilteredAuditEntries(page = 1, limit = 50, filters = {}) {
    try {
      console.log('[AuditService] Getting filtered audit entries with filters:', filters);
      
      // Check for any logout events first (for debugging)
      let debugQuery = this.collection.where('action', '==', 'logout');
      const debugSnapshot = await debugQuery.get();
      console.log(`[AuditService] DEBUG: Found ${debugSnapshot.size} total logout events in database`);
      
      // Start with base query
      let query = this.collection;
      
      // Apply filters
      if (filters.action) {
        console.log(`[AuditService] Filtering by action: ${filters.action}`);
        query = query.where('action', '==', filters.action);
      }
      
      if (filters.entityType) {
        console.log(`[AuditService] Filtering by entityType: ${filters.entityType}`);
        query = query.where('entityType', '==', filters.entityType);
      }
      
      if (filters.userId) {
        console.log(`[AuditService] Filtering by userId: ${filters.userId}`);
        query = query.where('userId', '==', filters.userId);
      }
      
      if (filters.username) {
        console.log(`[AuditService] Filtering by username: ${filters.username}`);
        query = query.where('username', '==', filters.username);
      }
      
      // Note: Firestore can only use one range operator in a compound query
      // so we need to handle date range filtering differently
      if (filters.startDate && filters.endDate) {
        const startTimestamp = admin.firestore.Timestamp.fromDate(filters.startDate);
        const endTimestamp = admin.firestore.Timestamp.fromDate(filters.endDate);
        query = query.where('timestamp', '>=', startTimestamp)
                     .where('timestamp', '<=', endTimestamp);
        console.log(`[AuditService] Filtering by date range: ${filters.startDate.toISOString()} to ${filters.endDate.toISOString()}`);
      } else if (filters.startDate) {
        const startTimestamp = admin.firestore.Timestamp.fromDate(filters.startDate);
        query = query.where('timestamp', '>=', startTimestamp);
        console.log(`[AuditService] Filtering by start date: ${filters.startDate.toISOString()}`);
      } else if (filters.endDate) {
        const endTimestamp = admin.firestore.Timestamp.fromDate(filters.endDate);
        query = query.where('timestamp', '<=', endTimestamp);
        console.log(`[AuditService] Filtering by end date: ${filters.endDate.toISOString()}`);
      }
      
      // Always sort by timestamp descending
      query = query.orderBy('timestamp', 'desc');
      
      // Get total count for pagination
      console.log('[AuditService] Executing count query...');
      const countSnapshot = await query.get();
      const totalItems = countSnapshot.size;
      console.log(`[AuditService] Total matching items: ${totalItems}`);
      
      // Apply pagination
      const startAt = (page - 1) * limit;
      query = query.limit(limit);
      
      // If not the first page, use startAfter with a document cursor
      if (page > 1) {
        const snapshot = await query.limit(startAt).get();
        if (snapshot.docs.length > 0) {
          const lastDoc = snapshot.docs[snapshot.docs.length - 1];
          query = query.startAfter(lastDoc);
        }
      }
      
      console.log(`[AuditService] Executing final query with pagination (page ${page}, limit ${limit})...`);
      const snapshot = await query.get();
      console.log(`[AuditService] Retrieved ${snapshot.docs.length} items`);
      
      const items = this._formatDocs(snapshot);
      
      // Count logout events in the result
      const logoutEvents = items.filter(item => item.action === 'logout');
      console.log(`[AuditService] Found ${logoutEvents.length} logout events in returned results`);
      
      return {
        items,
        pagination: {
          page,
          limit,
          totalItems,
          totalPages: Math.ceil(totalItems / limit)
        },
        filters // Include applied filters in the response
      };
    } catch (error) {
      console.error('[AuditService] Error getting filtered audit entries:', error);
      console.error('[AuditService] Error message:', error.message);
      console.error('[AuditService] Stack trace:', error.stack);
      throw error;
    }
  }

  // Format timestamp for display
  formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    
    try {
      // Handle Firestore timestamp
      if (typeof timestamp.toDate === 'function') {
        timestamp = timestamp.toDate();
      }
      
      // Handle JavaScript Date object
      if (timestamp instanceof Date) {
        return timestamp.toISOString().split('T')[0]; // YYYY-MM-DD format
      }
      
      // Handle ISO string
      if (typeof timestamp === 'string') {
        const date = new Date(timestamp);
        if (!isNaN(date)) {
          return date.toISOString().split('T')[0]; // YYYY-MM-DD format
        }
      }
      
      return 'Invalid date';
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  }

  // Format document snapshots into a standard format
  _formatDocs(snapshot) {
    try {
      return snapshot.docs.map(doc => {
        const data = doc.data();
        
        // Format timestamp for display
        let formattedTime = 'Unknown time';
        if (data.timestamp) {
          try {
            const timestamp = data.timestamp.toDate();
            formattedTime = timestamp.toISOString();
            
            // Calculate relative time
            const now = new Date();
            const diffMs = now - timestamp;
            const diffMins = Math.floor(diffMs / (1000 * 60));
            
            if (diffMins < 1) {
              formattedTime = 'Just now';
            } else if (diffMins < 60) {
              formattedTime = `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
            } else if (diffMins < 24 * 60) {
              const hours = Math.floor(diffMins / 60);
              formattedTime = `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
            } else {
              const days = Math.floor(diffMins / (24 * 60));
              formattedTime = `${days} ${days === 1 ? 'day' : 'days'} ago`;
            }
          } catch (err) {
            console.error('Error formatting timestamp:', err);
          }
        }
        
        // Generate a user-friendly description
        let title = '';
        let details = '';
        let type = data.entityType || 'unknown';
        
        switch (data.action) {
          case 'create':
            title = `New ${data.entityType} created`;
            details = data.details?.name || `${data.entityType} #${data.entityId}`;
            break;
          case 'update':
            title = `${data.entityType} updated`;
            details = data.details?.name || `${data.entityType} #${data.entityId}`;
            break;
          case 'delete':
            title = `${data.entityType} deleted`;
            details = data.details?.name || `${data.entityType} #${data.entityId}`;
            break;
          case 'view':
            title = `${data.entityType} viewed`;
            details = data.details?.name || `${data.entityType} #${data.entityId}`;
            type = 'view';
            break;
          case 'search':
            title = 'Search performed';
            details = `Query: "${data.details?.searchQuery || 'unknown'}" (${data.details?.resultsCount || 0} results)`;
            type = 'search';
            break;
          case 'export':
            title = `${data.entityType} data exported`;
            details = `Format: ${data.details?.format || 'unknown'}`;
            type = 'export';
            break;
          case 'login':
            title = 'User logged in';
            details = `${data.username} signed in`;
            type = 'login';
            break;
          case 'logout':
            title = 'User logged out';
            details = `${data.username} signed out`;
            type = 'logout';
            break;
          case 'profile_update':
            title = 'Profile updated';
            details = `${data.username} updated their profile`;
            type = 'user';
            break;
          case 'permission_change':
            title = 'Permissions changed';
            details = `Permissions updated for ${data.details?.targetUsername || 'a user'}`;
            type = 'user';
            break;
          case 'config_change':
            title = 'System configuration changed';
            details = `${data.entityId || 'System'} configuration updated`;
            type = 'system';
            break;
          case 'status_change':
            title = `${data.entityType} status changed`;
            details = `Status changed to: ${data.details?.status || data.details?.requestBody?.status || 'updated'}`;
            break;
          case 'delivery_completed':
            title = 'Delivery completed';
            details = data.details?.description || `Order #${data.entityId}`;
            type = 'delivery';
            break;
          case 'delivery_booked':
            title = 'Delivery booked';
            details = data.details?.description || `Order #${data.entityId}`;
            type = 'delivery';
            break;
          case 'delivery_cancelled':
            title = 'Delivery cancelled';
            details = data.details?.reason || `Order #${data.entityId}`;
            type = 'delivery';
            break;
          case 'assignment':
            title = `${data.entityType} assigned`;
            details = data.details?.description || `${data.entityType} #${data.entityId}`;
            type = data.entityType;
            break;
          case 'approval':
            title = `${data.entityType} approved`;
            details = data.details?.description || `${data.entityType} #${data.entityId}`;
            type = data.entityType;
            break;  
          case 'rejection':
            title = `${data.entityType} rejected`;
            details = data.details?.reason || `${data.entityType} #${data.entityId}`;
            type = data.entityType;
            break;
          default:
            title = data.action.replace(/_/g, ' ');
            title = title.charAt(0).toUpperCase() + title.slice(1);
            details = JSON.stringify(data.details);
            type = data.entityType;
        }
        
        return {
          id: doc.id,
          type,
          title,
          details,
          user: data.username || 'Unknown user',
          time: formattedTime,
          entityId: data.entityId,
          entityType: data.entityType,
          action: data.action,
          timestamp: data.timestamp ? data.timestamp.toDate() : new Date(),
          rawData: data // Include raw data for debugging
        };
      });
    } catch (error) {
      console.error('Error formatting documents:', error);
      return [];
    }
  }
}

module.exports = new AuditService(); 