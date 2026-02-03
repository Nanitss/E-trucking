// server/routes/operatorsRoutes.js - Updated for Firebase
const express = require('express');
const router = express.Router();
const OperatorService = require('../services/OperatorService');
const { authenticateJWT } = require('../middleware/auth');
const AuditService = require('../services/AuditService');

// ─── GET /api/operators ───────────────────────────────────────────────────────────
router.get('/', authenticateJWT, async (req, res) => {
  try {
    console.log('GET /api/operators - Fetching all operators');
    const operators = await OperatorService.getAllOperators();
    console.log(`Found ${operators.length} operators`);
    res.json(operators);
  } catch (err) {
    console.error('Error fetching operators:', err);
    res.status(500).json({
      message: 'Server error while fetching operators',
      error: err.message
    });
  }
});

// ─── GET /api/operators/:id ────────────────────────────────────────────────────────
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    console.log(`GET /api/operators/${req.params.id}`);
    const operator = await OperatorService.getOperatorById(req.params.id);
    res.json(operator);
  } catch (err) {
    console.error('Error fetching operator:', err);
    if (err.message === 'Operator not found') {
      return res.status(404).json({ message: 'Operator not found' });
    }
    res.status(500).json({
      message: 'Server error while fetching operator',
      error: err.message
    });
  }
});

// ─── POST /api/operators ───────────────────────────────────────────────────────────
router.post('/', authenticateJWT, async (req, res) => {
  try {
    console.log('POST /api/operators - Creating new operator', req.body);
    const operator = await OperatorService.createOperator(req.body);
    
    // Log the creation action to audit trail
    await AuditService.logCreate(
      req.user.id,
      req.user.username,
      'operator',
      operator.id,
      {
        name: operator.OperatorName,
        requestBody: req.body
      }
    );
    
    console.log(`✅ Operator creation logged to audit trail for operator ${operator.id}`);
    
    res.status(201).json({
      id: operator.id,
      message: 'Operator created successfully'
    });
  } catch (err) {
    console.error('Error creating operator:', err);
    if (err.message === 'Username already exists') {
      return res.status(400).json({ message: 'Username already exists' });
    }
    res.status(500).json({
      message: 'Server error while creating operator',
      error: err.message
    });
  }
});

// ─── PUT /api/operators/:id ────────────────────────────────────────────────────────
router.put('/:id', authenticateJWT, async (req, res) => {
  try {
    console.log(`PUT /api/operators/${req.params.id} - Updating operator`, req.body);
    const operator = await OperatorService.updateOperator(req.params.id, req.body);
    
    // Log the update action to audit trail
    await AuditService.logUpdate(
      req.user.id,
      req.user.username,
      'operator',
      req.params.id,
      {
        name: operator.OperatorName,
        requestBody: req.body
      }
    );
    
    console.log(`✅ Operator update logged to audit trail for operator ${req.params.id}`);
    
    console.log(`Operator ${req.params.id} updated successfully`);
    res.json({
      message: 'Operator updated successfully',
      operator
    });
  } catch (err) {
    console.error('Error updating operator:', err);
    if (err.message === 'Operator not found') {
      return res.status(404).json({ message: 'Operator not found' });
    }
    if (err.message === 'Username already exists') {
      return res.status(400).json({ message: 'Username already exists' });
    }
    res.status(500).json({
      message: 'Server error while updating operator',
      error: err.message
    });
  }
});

// ─── DELETE /api/operators/:id ────────────────────────────────────────────────────────
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    console.log(`DELETE /api/operators/${req.params.id}`);
    
    // Get operator details before deletion for audit log
    const operator = await OperatorService.getOperatorById(req.params.id);
    
    await OperatorService.deleteOperator(req.params.id);
    
    // Log the delete action to audit trail
    await AuditService.logDelete(
      req.user.id,
      req.user.username,
      'operator',
      req.params.id,
      {
        name: operator.OperatorName
      }
    );
    
    console.log(`✅ Operator deletion logged to audit trail for operator ${req.params.id}`);
    
    res.json({ message: 'Operator deleted successfully' });
  } catch (err) {
    console.error('Error deleting operator:', err);
    if (err.message === 'Operator not found') {
      return res.status(404).json({ message: 'Operator not found' });
    }
    res.status(500).json({
      message: 'Server error while deleting operator',
      error: err.message
    });
  }
});

module.exports = router;
