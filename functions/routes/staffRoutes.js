// server/routes/staffRoutes.js - Updated for Firebase

const express = require('express');
const router = express.Router();
const StaffService = require('../services/StaffService');
const { authenticateJWT } = require('../middleware/auth');
const AuditService = require('../services/AuditService');

// ─── GET /api/staffs ─────────────────────────────────────────────────────────────
router.get('/', authenticateJWT, async (req, res) => {
  try {
    console.log('GET /api/staffs - Fetching all staff members');
    const staff = await StaffService.getAllStaff();
    console.log(`Found ${staff.length} staff members`);
    res.json(staff);
  } catch (err) {
    console.error('Error fetching staff members:', err);
    res.status(500).json({
      message: 'Server error while fetching staff members',
      error: err.message
    });
  }
});

// ─── VEHICLE RATE MANAGEMENT ROUTES ──────────────────────────────────────────────

// ─── GET /api/staffs/vehicle-rates ─────────────────────────────────────────────
router.get('/vehicle-rates', authenticateJWT, async (req, res) => {
  try {
    console.log('GET /api/staffs/vehicle-rates - Fetching vehicle rates');
    
    // Check if user is staff
    if (req.user.role !== 'staff' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Staff or admin role required.'
      });
    }

    const rates = await StaffService.getVehicleRates();
    console.log(`Found ${rates.length} vehicle rates`);
    
    res.json({
      success: true,
      data: rates
    });
  } catch (err) {
    console.error('Error fetching vehicle rates:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching vehicle rates',
      error: err.message
    });
  }
});

// ─── POST /api/staffs/vehicle-rates ────────────────────────────────────────────
router.post('/vehicle-rates', authenticateJWT, async (req, res) => {
  try {
    console.log('POST /api/staffs/vehicle-rates - Creating vehicle rate', req.body);
    
    // Check if user is staff
    if (req.user.role !== 'staff' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Staff or admin role required.'
      });
    }

    const { vehicleType, ratePerKm, baseRate, description } = req.body;

    // Validate required fields
    if (!vehicleType || !ratePerKm || !baseRate) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle type, rate per km, and base rate are required'
      });
    }

    // Validate rate values
    if (parseFloat(ratePerKm) < 0 || parseFloat(baseRate) < 0) {
      return res.status(400).json({
        success: false,
        message: 'Rates must be non-negative values'
      });
    }

    const rateData = {
      vehicleType,
      ratePerKm: parseFloat(ratePerKm),
      baseRate: parseFloat(baseRate),
      description: description || `Rate for ${vehicleType}`,
      createdBy: req.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const rate = await StaffService.createVehicleRate(rateData);
    
    // Log the creation action to audit trail
    await AuditService.logCreate(
      req.user.id,
      req.user.username,
      'vehicle_rate',
      rate.id,
      {
        vehicleType: rate.vehicleType,
        ratePerKm: rate.ratePerKm,
        baseRate: rate.baseRate
      }
    );
    
    console.log(`✅ Vehicle rate creation logged to audit trail for rate ${rate.id}`);
    
    res.status(201).json({
      success: true,
      message: 'Vehicle rate created successfully',
      data: rate
    });
  } catch (err) {
    console.error('Error creating vehicle rate:', err);
    if (err.message === 'Vehicle type already has a rate configured') {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while creating vehicle rate',
      error: err.message
    });
  }
});

// ─── PUT /api/staffs/vehicle-rates/:id ─────────────────────────────────────────
router.put('/vehicle-rates/:id', authenticateJWT, async (req, res) => {
  try {
    console.log(`PUT /api/staffs/vehicle-rates/${req.params.id} - Updating vehicle rate`, req.body);
    
    // Check if user is staff
    if (req.user.role !== 'staff' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Staff or admin role required.'
      });
    }

    const { vehicleType, ratePerKm, baseRate, description } = req.body;

    // Validate required fields
    if (!vehicleType || !ratePerKm || !baseRate) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle type, rate per km, and base rate are required'
      });
    }

    // Validate rate values
    if (parseFloat(ratePerKm) < 0 || parseFloat(baseRate) < 0) {
      return res.status(400).json({
        success: false,
        message: 'Rates must be non-negative values'
      });
    }

    const updateData = {
      vehicleType,
      ratePerKm: parseFloat(ratePerKm),
      baseRate: parseFloat(baseRate),
      description: description || `Rate for ${vehicleType}`,
      updatedBy: req.user.id,
      updatedAt: new Date().toISOString()
    };

    const rate = await StaffService.updateVehicleRate(req.params.id, updateData);
    
    // Log the update action to audit trail
    await AuditService.logUpdate(
      req.user.id,
      req.user.username,
      'vehicle_rate',
      req.params.id,
      {
        vehicleType: rate.vehicleType,
        ratePerKm: rate.ratePerKm,
        baseRate: rate.baseRate
      }
    );
    
    console.log(`✅ Vehicle rate update logged to audit trail for rate ${req.params.id}`);
    
    res.json({
      success: true,
      message: 'Vehicle rate updated successfully',
      data: rate
    });
  } catch (err) {
    console.error('Error updating vehicle rate:', err);
    if (err.message === 'Vehicle rate not found') {
      return res.status(404).json({
        success: false,
        message: err.message
      });
    }
    if (err.message === 'Vehicle type already has a rate configured') {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while updating vehicle rate',
      error: err.message
    });
  }
});

// ─── DELETE /api/staffs/vehicle-rates/:id ──────────────────────────────────────
router.delete('/vehicle-rates/:id', authenticateJWT, async (req, res) => {
  try {
    console.log(`DELETE /api/staffs/vehicle-rates/${req.params.id}`);
    
    // Check if user is staff
    if (req.user.role !== 'staff' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Staff or admin role required.'
      });
    }
    
    // Get rate details before deletion for audit log
    const rate = await StaffService.getVehicleRateById(req.params.id);
    
    await StaffService.deleteVehicleRate(req.params.id);
    
    // Log the delete action to audit trail
    await AuditService.logDelete(
      req.user.id,
      req.user.username,
      'vehicle_rate',
      req.params.id,
      {
        vehicleType: rate.vehicleType,
        ratePerKm: rate.ratePerKm,
        baseRate: rate.baseRate
      }
    );
    
    console.log(`✅ Vehicle rate deletion logged to audit trail for rate ${req.params.id}`);
    
    res.json({
      success: true,
      message: 'Vehicle rate deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting vehicle rate:', err);
    if (err.message === 'Vehicle rate not found') {
      return res.status(404).json({
        success: false,
        message: err.message
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while deleting vehicle rate',
      error: err.message
    });
  }
});

// ─── GET /api/staffs/vehicle-rates/calculate ───────────────────────────────────
router.post('/vehicle-rates/calculate', authenticateJWT, async (req, res) => {
  try {
    console.log('POST /api/staffs/vehicle-rates/calculate - Calculating cost', req.body);
    
    const { vehicleType, distance, cargoWeight } = req.body;

    if (!vehicleType || !distance) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle type and distance are required'
      });
    }

    const cost = await StaffService.calculateDeliveryCost(vehicleType, parseFloat(distance), parseFloat(cargoWeight) || 0);
    
    res.json({
      success: true,
      data: {
        vehicleType,
        distance: parseFloat(distance),
        cargoWeight: parseFloat(cargoWeight) || 0,
        baseRate: cost.baseRate,
        ratePerKm: cost.ratePerKm,
        kmCost: cost.kmCost,
        totalCost: cost.totalCost
      }
    });
  } catch (err) {
    console.error('Error calculating delivery cost:', err);
    if (err.message === 'Vehicle rate not found') {
      return res.status(404).json({
        success: false,
        message: `No rate configured for vehicle type: ${req.body.vehicleType}`
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while calculating cost',
      error: err.message
    });
  }
});

// ─── EXISTING ROUTES ─────────────────────────────────────────────────────────────

// ─── DASHBOARD ROUTES ────────────────────────────────────────────────────────────

// ─── GET /api/staffs/profile ─────────────────────────────────────────────────────
router.get('/profile', authenticateJWT, async (req, res) => {
  try {
    console.log('GET /api/staffs/profile - Fetching staff profile');
    
    // Check if user is staff
    if (req.user.role !== 'staff' && req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Access denied. Staff or admin role required.'
      });
    }

    const profile = await StaffService.getStaffProfile(req.user.id);
    res.json(profile);
  } catch (err) {
    console.error('Error fetching staff profile:', err);
    res.status(500).json({
      message: 'Server error while fetching staff profile',
      error: err.message
    });
  }
});

// ─── GET /api/staffs/stats ───────────────────────────────────────────────────────
router.get('/stats', authenticateJWT, async (req, res) => {
  try {
    console.log('GET /api/staffs/stats - Fetching dashboard statistics');
    
    // Check if user is staff
    if (req.user.role !== 'staff' && req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Access denied. Staff or admin role required.'
      });
    }

    const stats = await StaffService.getDashboardStats();
    res.json(stats);
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({
      message: 'Server error while fetching dashboard statistics',
      error: err.message
    });
  }
});

// ─── GET /api/staffs/recent-clients ─────────────────────────────────────────────
router.get('/recent-clients', authenticateJWT, async (req, res) => {
  try {
    console.log('GET /api/staffs/recent-clients - Fetching recent clients');
    
    // Check if user is staff
    if (req.user.role !== 'staff' && req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Access denied. Staff or admin role required.'
      });
    }

    const clients = await StaffService.getRecentClients();
    res.json(clients);
  } catch (err) {
    console.error('Error fetching recent clients:', err);
    res.status(500).json({
      message: 'Server error while fetching recent clients',
      error: err.message
    });
  }
});

// ─── EXISTING ROUTES ─────────────────────────────────────────────────────────────

// ─── GET /api/staffs/:id ──────────────────────────────────────────────────────────
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    console.log(`GET /api/staffs/${req.params.id}`);
    const staff = await StaffService.getStaffById(req.params.id);
    res.json(staff);
  } catch (err) {
    console.error('Error fetching staff member:', err);
    if (err.message === 'Staff not found') {
      return res.status(404).json({ message: 'Staff member not found' });
    }
    res.status(500).json({
      message: 'Server error while fetching staff member',
      error: err.message
    });
  }
});

// ─── POST /api/staffs ─────────────────────────────────────────────────────────────
router.post('/', authenticateJWT, async (req, res) => {
  try {
    console.log('POST /api/staffs - Creating new staff member', req.body);
    
    const staff = await StaffService.createStaff(req.body);
    
    // Log the creation action to audit trail
    await AuditService.logCreate(
      req.user.id,
      req.user.username,
      'staff',
      staff.id,
      {
        name: staff.StaffName,
        requestBody: req.body
      }
    );
    
    console.log(`✅ Staff creation logged to audit trail for staff ${staff.id}`);
    
    res.status(201).json({
      id: staff.id,
      message: 'Staff member created successfully'
    });
  } catch (err) {
    console.error('Error creating staff member:', err);
    if (err.message === 'Username already exists') {
      return res.status(400).json({ message: 'Username already exists' });
    }
    res.status(500).json({
      message: 'Server error while creating staff member',
      error: err.message
    });
  }
});

// ─── PUT /api/staffs/:id ──────────────────────────────────────────────────────────
router.put('/:id', authenticateJWT, async (req, res) => {
  try {
    console.log(`PUT /api/staffs/${req.params.id} - Updating staff member`, req.body);
    
    const staff = await StaffService.updateStaff(req.params.id, req.body);
    
    // Log the update action to audit trail
    await AuditService.logUpdate(
      req.user.id,
      req.user.username,
      'staff',
      req.params.id,
      {
        name: staff.StaffName,
        requestBody: req.body
      }
    );
    
    console.log(`✅ Staff update logged to audit trail for staff ${req.params.id}`);
    
    console.log(`Staff ${req.params.id} updated successfully`);
    res.json({ 
      message: 'Staff member updated successfully',
      staff
    });
  } catch (err) {
    console.error('Error updating staff member:', err);
    if (err.message === 'Staff not found') {
      return res.status(404).json({ message: 'Staff member not found' });
    }
    if (err.message === 'Username already exists') {
      return res.status(400).json({ message: 'Username already exists' });
    }
    res.status(500).json({
      message: 'Server error while updating staff member',
      error: err.message
    });
  }
});

// ─── DELETE /api/staffs/:id ────────────────────────────────────────────────────────
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    console.log(`DELETE /api/staffs/${req.params.id}`);
    
    // Get staff details before deletion for audit log
    const staff = await StaffService.getStaffById(req.params.id);
    
    await StaffService.deleteStaff(req.params.id);
    
    // Log the delete action to audit trail
    await AuditService.logDelete(
      req.user.id,
      req.user.username,
      'staff',
      req.params.id,
      {
        name: staff.StaffName
      }
    );
    
    console.log(`✅ Staff deletion logged to audit trail for staff ${req.params.id}`);
    
    res.json({ message: 'Staff member deleted successfully' });
  } catch (err) {
    console.error('Error deleting staff member:', err);
    if (err.message === 'Staff not found') {
      return res.status(404).json({ message: 'Staff member not found' });
    }
    res.status(500).json({
      message: 'Server error while deleting staff member',
      error: err.message
    });
  }
});

module.exports = router;