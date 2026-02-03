const express = require('express');
const router = express.Router();
const AuditService = require('../services/AuditService');
const { authenticateJWT } = require('../middleware/auth');
const { admin } = require('../config/firebase');

// ─── GET /api/audit/recent ───────────────────────────────────────────────────────
// Get recent activity for dashboard (limited to 10 by default)
router.get('/recent', authenticateJWT, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;
    console.log(`GET /api/audit/recent - Fetching ${limit} recent activities`);
    
    const activities = await AuditService.getRecentActivity(limit);
    
    console.log(`Found ${activities.length} recent activities`);
    res.json(activities);
  } catch (err) {
    console.error('Error fetching recent activities:', err);
    res.status(500).json({
      message: 'Server error while fetching recent activities',
      error: err.message
    });
  }
});

// ─── GET /api/audit/all ───────────────────────────────────────────────────────
// Get all audit logs with pagination and filtering
router.get('/all', authenticateJWT, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Access denied: Admin privileges required'
      });
    }
    
    const page = req.query.page ? parseInt(req.query.page) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    
    // Get filter parameters
    const filters = {};
    if (req.query.action) filters.action = req.query.action;
    if (req.query.entityType) filters.entityType = req.query.entityType;
    if (req.query.userId) filters.userId = req.query.userId;
    if (req.query.username) filters.username = req.query.username;
    if (req.query.startDate) filters.startDate = new Date(req.query.startDate);
    if (req.query.endDate) filters.endDate = new Date(req.query.endDate);
    
    console.log(`GET /api/audit/all - Fetching audit logs with filters:`, filters);
    
    const result = await AuditService.getFilteredAuditEntries(page, limit, filters);
    
    console.log(`Found ${result.items.length} audit entries (page ${page} of ${result.pagination.totalPages})`);
    res.json(result);
  } catch (err) {
    console.error('Error fetching filtered audit logs:', err);
    res.status(500).json({
      message: 'Server error while fetching audit logs',
      error: err.message
    });
  }
});

// ─── GET /api/audit/entity/:type/:id ─────────────────────────────────────────────
// Get audit trail for a specific entity
router.get('/entity/:type/:id', authenticateJWT, async (req, res) => {
  try {
    const { type, id } = req.params;
    const { action } = req.query; // Get action from query parameter
    
    console.log(`GET /api/audit/entity/${type}/${id} - Fetching audit trail${action ? ` for action: ${action}` : ''}`);
    
    const auditTrail = await AuditService.getEntityAudit(type, id, action);
    
    console.log(`Found ${auditTrail.length} audit entries for ${type} ${id}${action ? ` with action: ${action}` : ''}`);
    res.json(auditTrail);
  } catch (err) {
    console.error('Error fetching entity audit trail:', err);
    res.status(500).json({
      message: 'Server error while fetching entity audit trail',
      error: err.message
    });
  }
});

// ─── GET /api/audit/user/:userId ─────────────────────────────────────────────────
// Get audit trail for a specific user
router.get('/user/:userId', authenticateJWT, async (req, res) => {
  try {
    // Check if user is admin or the user is requesting their own audit trail
    if (req.user.role !== 'admin' && req.user.id !== req.params.userId) {
      return res.status(403).json({
        message: 'Access denied: Admin privileges required to view other users\' audit trails'
      });
    }
    
    const { userId } = req.params;
    const { action } = req.query; // Get action from query parameter
    
    console.log(`GET /api/audit/user/${userId} - Fetching user audit trail${action ? ` for action: ${action}` : ''}`);
    
    const auditTrail = await AuditService.getUserAudit(userId, action);
    
    console.log(`Found ${auditTrail.length} audit entries for user ${userId}${action ? ` with action: ${action}` : ''}`);
    res.json(auditTrail);
  } catch (err) {
    console.error('Error fetching user audit trail:', err);
    res.status(500).json({
      message: 'Server error while fetching user audit trail',
      error: err.message
    });
  }
});

// ─── GET /api/audit/action/:action ─────────────────────────────────────────────────
// Get audit trail for a specific action type (e.g., login, create, update, delete)
router.get('/action/:action', authenticateJWT, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Access denied: Admin privileges required'
      });
    }
    
    const { action } = req.params;
    console.log(`GET /api/audit/action/${action} - Fetching action audit trail`);
    
    const snapshot = await AuditService.collection
      .where('action', '==', action)
      .orderBy('timestamp', 'desc')
      .get();
    
    const auditTrail = AuditService._formatDocs(snapshot);
    
    console.log(`Found ${auditTrail.length} audit entries for action ${action}`);
    res.json(auditTrail);
  } catch (err) {
    console.error('Error fetching action audit trail:', err);
    res.status(500).json({
      message: 'Server error while fetching action audit trail',
      error: err.message
    });
  }
});

// ─── GET /api/audit/entityType/:type ─────────────────────────────────────────────────
// Get audit trail for a specific entity type (e.g., truck, driver, delivery)
router.get('/entityType/:type', authenticateJWT, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Access denied: Admin privileges required'
      });
    }
    
    const { type } = req.params;
    console.log(`GET /api/audit/entityType/${type} - Fetching entity type audit trail`);
    
    const snapshot = await AuditService.collection
      .where('entityType', '==', type)
      .orderBy('timestamp', 'desc')
      .get();
    
    const auditTrail = AuditService._formatDocs(snapshot);
    
    console.log(`Found ${auditTrail.length} audit entries for entity type ${type}`);
    res.json(auditTrail);
  } catch (err) {
    console.error('Error fetching entity type audit trail:', err);
    res.status(500).json({
      message: 'Server error while fetching entity type audit trail',
      error: err.message
    });
  }
});

// ─── GET /api/audit/date-range ─────────────────────────────────────────────────
// Get audit trail for a specific date range
router.get('/date-range', authenticateJWT, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Access denied: Admin privileges required'
      });
    }
    
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        message: 'Both startDate and endDate query parameters are required'
      });
    }
    
    console.log(`GET /api/audit/date-range - Fetching audit trail between ${startDate} and ${endDate}`);
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        message: 'Invalid date format. Use ISO format (YYYY-MM-DD)'
      });
    }
    
    // Set end date to end of day
    end.setHours(23, 59, 59, 999);
    
    const startTimestamp = admin.firestore.Timestamp.fromDate(start);
    const endTimestamp = admin.firestore.Timestamp.fromDate(end);
    
    const snapshot = await AuditService.collection
      .where('timestamp', '>=', startTimestamp)
      .where('timestamp', '<=', endTimestamp)
      .orderBy('timestamp', 'desc')
      .get();
    
    const auditTrail = AuditService._formatDocs(snapshot);
    
    console.log(`Found ${auditTrail.length} audit entries between ${startDate} and ${endDate}`);
    res.json(auditTrail);
  } catch (err) {
    console.error('Error fetching date range audit trail:', err);
    res.status(500).json({
      message: 'Server error while fetching date range audit trail',
      error: err.message
    });
  }
});

// ─── GET /api/audit/debug ───────────────────────────────────────────────────────
// Debug route to view all audit logs without filtering
router.get('/debug', authenticateJWT, async (req, res) => {
  try {
    console.log('GET /api/audit/debug - Fetching all audit data for debugging');
    
    const snapshot = await AuditService.collection
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();
    
    // Get the raw data for inspection
    const rawData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Convert timestamps to ISO strings for easier reading
      timestamp: doc.data().timestamp ? doc.data().timestamp.toDate().toISOString() : null
    }));
    
    console.log(`Found ${rawData.length} audit entries for debugging`);
    console.log('Actions recorded:', [...new Set(rawData.map(item => item.action))]);
    console.log('Entity types:', [...new Set(rawData.map(item => item.entityType))]);
    
    res.json(rawData);
  } catch (err) {
    console.error('Error fetching debug audit data:', err);
    res.status(500).json({
      message: 'Server error while fetching debug audit data',
      error: err.message
    });
  }
});

// ─── GET /api/audit/filter ─────────────────────────────────────────────────
// Get audit trail with multiple filter options
router.get('/filter', authenticateJWT, async (req, res) => {
  try {
    // Check if user is admin or filtering their own actions
    const isAdmin = req.user.role === 'admin';
    const isFilteringOwnActions = req.query.userId === req.user.id;
    
    if (!isAdmin && !isFilteringOwnActions) {
      return res.status(403).json({
        message: 'Access denied: Admin privileges required to view other users\' audit trails'
      });
    }
    
    const page = req.query.page ? parseInt(req.query.page) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    
    // Get filter parameters
    const filters = {};
    if (req.query.action) filters.action = req.query.action;
    if (req.query.entityType) filters.entityType = req.query.entityType;
    if (req.query.userId) filters.userId = req.query.userId;
    if (req.query.username) filters.username = req.query.username;
    if (req.query.startDate) filters.startDate = new Date(req.query.startDate);
    if (req.query.endDate) {
      const endDate = new Date(req.query.endDate);
      // Set end date to end of day
      endDate.setHours(23, 59, 59, 999);
      filters.endDate = endDate;
    }
    
    console.log(`GET /api/audit/filter - Fetching audit logs with filters:`, filters);
    
    // Check specifically for logout events for debugging
    try {
      const logoutQuery = await AuditService.collection
        .where('action', '==', 'logout')
        .orderBy('timestamp', 'desc')
        .limit(5)
        .get();
      
      console.log(`DEBUG: Found ${logoutQuery.size} logout events in database.`);
      
      if (logoutQuery.size > 0) {
        const sampleLogout = logoutQuery.docs[0].data();
        console.log('Sample logout event:', {
          id: logoutQuery.docs[0].id,
          username: sampleLogout.username,
          timestamp: sampleLogout.timestamp ? sampleLogout.timestamp.toDate().toISOString() : 'unknown',
          action: sampleLogout.action
        });
      }
    } catch (debugErr) {
      console.log('Error in debug query:', debugErr.message);
    }
    
    const result = await AuditService.getFilteredAuditEntries(page, limit, filters);
    
    // Check if result contains any logout events
    const logoutEvents = result.items.filter(item => item.action === 'logout');
    console.log(`Found ${logoutEvents.length} logout events in result set out of ${result.items.length} total`);
    
    console.log(`Found ${result.items.length} audit entries (page ${page} of ${result.pagination.totalPages})`);
    res.json(result);
  } catch (err) {
    console.error('Error fetching filtered audit logs:', err);
    res.status(500).json({
      message: 'Server error while fetching audit logs',
      error: err.message
    });
  }
});

// ─── GET /api/audit/debug/logout ──────────────────────────────────────────────────
// Debug route to view all logout events without filtering
router.get('/debug/logout', authenticateJWT, async (req, res) => {
  try {
    console.log('GET /api/audit/debug/logout - Fetching all logout events for debugging');
    
    const snapshot = await AuditService.collection
      .where('action', '==', 'logout')
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();
    
    // Get the raw data for inspection
    const rawData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Convert timestamps to ISO strings for easier reading
      timestamp: doc.data().timestamp ? doc.data().timestamp.toDate().toISOString() : null
    }));
    
    console.log(`Found ${rawData.length} logout events for debugging`);
    
    res.json({
      count: rawData.length,
      events: rawData
    });
  } catch (err) {
    console.error('Error fetching logout audit data:', err);
    res.status(500).json({
      message: 'Server error while fetching logout audit data',
      error: err.message
    });
  }
});

module.exports = router; 