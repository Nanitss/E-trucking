// server/routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const NotificationService = require('../services/NotificationService');
const { authenticateJWT } = require('../middleware/auth');

// Get notifications for current user
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const clientId = req.user.clientId;
    
    console.log('🔔 GET /notifications - userId:', userId, 'clientId:', clientId);
    
    // For client users, notifications may be stored under clientId (Firestore doc ID)
    // rather than the auth user ID. Fetch from both sources and merge.
    let notifications = [];
    let unreadCount = 0;

    if (clientId && clientId !== userId) {
      // Fetch notifications for both auth ID and client doc ID, then merge
      const [authNotifs, clientNotifs] = await Promise.all([
        NotificationService.getUserNotifications(userId),
        NotificationService.getUserNotifications(clientId),
      ]);
      console.log('🔔 Auth notifs:', authNotifs.length, '| Client notifs:', clientNotifs.length);

      // Merge and deduplicate by ID
      const notifMap = new Map();
      [...authNotifs, ...clientNotifs].forEach(n => notifMap.set(n.id, n));
      notifications = Array.from(notifMap.values())
        .sort((a, b) => {
          const aTime = a.created_at?._seconds || 0;
          const bTime = b.created_at?._seconds || 0;
          return bTime - aTime;
        })
        .slice(0, 30);

      // Count unread across both
      const [authCount, clientCount] = await Promise.all([
        NotificationService.getUnreadCount(userId),
        NotificationService.getUnreadCount(clientId),
      ]);
      // Subtract any overlap (notifications counted in both)
      const unreadIds = new Set();
      notifications.forEach(n => { if (!n.read) unreadIds.add(n.id); });
      unreadCount = unreadIds.size;
    } else {
      notifications = await NotificationService.getUserNotifications(userId);
      unreadCount = await NotificationService.getUnreadCount(userId);
    }
    
    res.json({
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      message: 'Error fetching notifications'
    });
  }
});

// Mark notification as read
router.put('/:id/read', authenticateJWT, async (req, res) => {
  try {
    const notificationId = req.params.id;
    
    await NotificationService.markAsRead(notificationId);
    
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      message: 'Error marking notification as read'
    });
  }
});

// Mark all notifications as read
router.put('/read-all', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const clientId = req.user.clientId;
    
    // Mark all as read for auth user ID
    await NotificationService.markAllAsRead(userId);
    
    // Also mark for clientId if different (payment notifications use clientId)
    if (clientId && clientId !== userId) {
      await NotificationService.markAllAsRead(clientId);
    }
    
    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      message: 'Error marking all notifications as read'
    });
  }
});

// Create a delivery proximity notification (GPS-triggered)
router.post('/delivery-proximity', authenticateJWT, async (req, res) => {
  try {
    const { deliveryId, title, message, action } = req.body;
    const userId = req.user.id;
    const clientId = req.user.clientId;

    if (!deliveryId || !title || !message || !action) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Create notification for the authenticated user
    const notification = await NotificationService.createNotification({
      userId: clientId || userId,
      title,
      message,
      type: 'delivery',
      entityType: 'delivery',
      entityId: deliveryId,
      source: 'gps_proximity',
      metadata: { deliveryId, action }
    });

    console.log(`📍 Proximity notification created: ${action} for delivery ${deliveryId}`);

    res.json({
      success: true,
      notification
    });
  } catch (error) {
    console.error('Error creating proximity notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating proximity notification'
    });
  }
});

module.exports = router; 