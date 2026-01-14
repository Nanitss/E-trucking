// server/routes/helpersRoutes.js - Updated for Firebase

const express = require('express');
const router = express.Router();
const HelperService = require('../services/HelperService');
const { authenticateJWT } = require('../middleware/auth');
const AuditService = require('../services/AuditService');
const { uploadHelperDocuments } = require('../middleware/documentUpload'); // Changed to documentUpload.js to match truck/driver pattern

// ─── GET /api/helpers ───────────────────────────────────────────────────────────
router.get('/', authenticateJWT, async (req, res) => {
  try {
    console.log('GET /api/helpers - Fetching all helpers');
    const helpers = await HelperService.getAllHelpers();
    console.log(`Found ${helpers.length} helpers`);
    res.json(helpers);
  } catch (err) {
    console.error('Error fetching helpers:', err);
    res.status(500).json({
      message: 'Server error while fetching helpers',
      error: err.message
    });
  }
});

// ─── GET /api/helpers/:id ────────────────────────────────────────────────────────
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    console.log(`GET /api/helpers/${req.params.id} - Fetching helper by ID`);
    const helper = await HelperService.getHelperById(req.params.id);
    res.json(helper);
  } catch (err) {
    console.error('Error fetching helper:', err);
    if (err.message === 'Helper not found') {
      return res.status(404).json({ message: 'Helper not found' });
    }
    res.status(500).json({
      message: 'Server error while fetching helper',
      error: err.message
    });
  }
});

// ─── POST /api/helpers ───────────────────────────────────────────────────────────
router.post('/', authenticateJWT, uploadHelperDocuments, async (req, res) => {
  try {
    console.log('\n=== HELPER CREATE REQUEST ===');
    console.log('POST /api/helpers - Creating new helper');
    console.log('Body:', req.body);
    console.log('Uploaded documents from middleware:', req.uploadedDocuments);
    console.log('Document keys:', Object.keys(req.uploadedDocuments || {}));
    
    // Merge uploaded documents with request body
    const helperData = {
      ...req.body,
      documents: req.uploadedDocuments || {} // Documents from documentUpload.js middleware
    };
    
    console.log('Helper data prepared with documents:', Object.keys(helperData.documents));
    const helper = await HelperService.createHelper(helperData);
    
    // Log the creation action to audit trail
    await AuditService.logCreate(
      req.user.id,
      req.user.username,
      'helper',
      helper.id,
      {
        name: helper.HelperName,
        requestBody: req.body
      }
    );
    
    console.log(`✅ Helper creation logged to audit trail for helper ${helper.id}`);
    
    res.status(201).json({
      id: helper.id,
      message: 'Helper created successfully'
    });
  } catch (err) {
    console.error('Error creating helper:', err);
    if (err.message === 'Username already exists') {
      return res.status(400).json({ message: 'Username already exists' });
    }
    res.status(500).json({
      message: 'Server error while creating helper',
      error: err.message
    });
  }
});

// ─── PUT /api/helpers/:id ────────────────────────────────────────────────────────
router.put('/:id', authenticateJWT, uploadHelperDocuments, async (req, res) => {
  try {
    console.log('\n=== HELPER UPDATE REQUEST ===');
    console.log(`PUT /api/helpers/${req.params.id}`);
    console.log('Body keys:', Object.keys(req.body));
    console.log('Body data:', req.body);
    console.log('Files:', req.files ? Object.keys(req.files) : 'none');
    console.log('Uploaded documents from middleware:', req.uploadedDocuments);
    console.log('Document keys:', Object.keys(req.uploadedDocuments || {}));
    console.log('User:', req.user);
    
    // Validate required fields
    if (!req.body.name || !req.body.contactNumber || !req.body.address || !req.body.dateHired) {
      console.error('❌ Missing required fields');
      return res.status(400).json({ 
        message: 'Missing required fields: name, contactNumber, address, dateHired' 
      });
    }
    
    // Merge uploaded documents with request body
    // documentUpload.js middleware provides documents with: filename, originalName, fullPath, relativePath, etc.
    const helperData = {
      ...req.body,
      newDocuments: req.uploadedDocuments || {} // Use newDocuments to merge with existing in service
    };
    
    console.log('Helper data prepared, new documents:', Object.keys(helperData.newDocuments));
    
    console.log('Helper data prepared for update:', Object.keys(helperData));
    
    const helper = await HelperService.updateHelper(req.params.id, helperData);
    
    // Log the update action to audit trail
    await AuditService.logUpdate(
      req.user.id,
      req.user.username,
      'helper',
      req.params.id,
      {
        name: helper.HelperName,
        requestBody: req.body
      }
    );
    
    console.log(`✅ Helper update logged to audit trail for helper ${req.params.id}`);
    
    console.log(`Helper ${req.params.id} updated successfully`);
    res.json({
      message: 'Helper updated successfully',
      helper
    });
  } catch (err) {
    console.error('❌ Error updating helper:', err);
    console.error('Error stack:', err.stack);
    if (err.message === 'Helper not found') {
      return res.status(404).json({ message: 'Helper not found' });
    }
    if (err.message === 'Username already exists') {
      return res.status(400).json({ message: 'Username already exists' });
    }
    if (err.message && err.message.includes('too large')) {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({
      message: 'Server error while updating helper',
      error: err.message,
      details: err.stack
    });
  }
});

// ─── GET /api/helpers/:id/documents/:docType ────────────────────────────────────────
// Route to serve helper documents - MUST come before GET /:id
router.get('/:id/documents/:docType', async (req, res) => {
  try {
    const { id, docType } = req.params;
    console.log(`👷 Serving document ${docType} for helper ${id}`);
    
    const { serveDocument } = require('../middleware/documentUpload');
    // This will look for the document in the helper's documents field
    req.params.type = 'helper';
    await serveDocument(req, res);
  } catch (error) {
    console.error('❌ Error serving helper document:', error);
    res.status(500).json({
      error: 'Failed to serve document',
      details: error.message
    });
  }
});

// ─── POST /api/helpers/fix-stuck-statuses - Fix helpers stuck in On-Delivery ──────────
router.post('/fix-stuck-statuses', authenticateJWT, async (req, res) => {
  try {
    console.log('🔧 POST /api/helpers/fix-stuck-statuses - Fixing stuck helper statuses');
    
    const { db } = require('../config/firebase');
    
    // Get all deliveries that are delivered, completed, or cancelled
    const finalStatuses = ['delivered', 'completed', 'cancelled'];
    const deliveriesSnapshot = await db.collection('deliveries').get();
    
    const finishedDeliveries = [];
    deliveriesSnapshot.forEach(doc => {
      const delivery = doc.data();
      if (delivery.deliveryStatus && finalStatuses.includes(delivery.deliveryStatus.toLowerCase())) {
        finishedDeliveries.push({
          id: doc.id,
          ...delivery
        });
      }
    });
    
    console.log(`Found ${finishedDeliveries.length} finished deliveries`);
    
    // Track unique helpers to restore
    const helpersToRestore = new Set();
    finishedDeliveries.forEach(delivery => {
      if (delivery.helperId) {
        helpersToRestore.add(delivery.helperId);
      }
    });
    
    console.log(`Helpers to check: ${helpersToRestore.size}`);
    
    // Restore helper statuses
    let helpersFixed = 0;
    const fixedHelpers = [];
    
    for (const helperId of helpersToRestore) {
      const helperRef = db.collection('helpers').doc(helperId);
      const helperDoc = await helperRef.get();
      
      if (helperDoc.exists) {
        const helper = helperDoc.data();
        const currentStatus = helper.HelperStatus || helper.helperStatus;
        
        // Only update if not already active
        if (currentStatus && currentStatus.toLowerCase() !== 'active') {
          await helperRef.update({
            HelperStatus: 'active',
            helperStatus: 'active',
            updated_at: new Date()
          });
          
          const helperName = helper.HelperName || helper.helperName || helperId;
          console.log(`✅ Restored helper: ${helperName} (${currentStatus} → active)`);
          fixedHelpers.push({ id: helperId, name: helperName, oldStatus: currentStatus });
          helpersFixed++;
        }
      }
    }
    
    res.json({
      message: `Successfully restored ${helpersFixed} helper(s) to active status`,
      totalChecked: helpersToRestore.size,
      fixed: helpersFixed,
      helpers: fixedHelpers
    });
    
  } catch (error) {
    console.error('Error fixing stuck helper statuses:', error);
    res.status(500).json({
      message: 'Error fixing stuck helper statuses',
      error: error.message
    });
  }
});

// ─── DELETE /api/helpers/:id ────────────────────────────────────────────────────────
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    console.log(`DELETE /api/helpers/${req.params.id}`);
    
    // Get helper details before deletion for audit log
    const helper = await HelperService.getHelperById(req.params.id);
    
    await HelperService.deleteHelper(req.params.id);
    
    // Log the delete action to audit trail
    await AuditService.logDelete(
      req.user.id,
      req.user.username,
      'helper',
      req.params.id,
      {
        name: helper.HelperName
      }
    );
    
    console.log(`✅ Helper deletion logged to audit trail for helper ${req.params.id}`);
    
    res.json({ message: 'Helper deleted successfully' });
  } catch (err) {
    console.error('Error deleting helper:', err);
    if (err.message === 'Helper not found') {
      return res.status(404).json({ message: 'Helper not found' });
    }
    res.status(500).json({
      message: 'Server error while deleting helper',
      error: err.message
    });
  }
});

module.exports = router;
