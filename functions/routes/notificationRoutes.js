// server/routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const NotificationService = require('../services/NotificationService');
const { authenticateJWT } = require('../middleware/auth');

// Get notifications for current user
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user notifications
    const notifications = await NotificationService.getUserNotifications(userId);
    
    // Get unread count
    const unreadCount = await NotificationService.getUnreadCount(userId);
    
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
    
    await NotificationService.markAllAsRead(userId);
    
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

module.exports = router; 