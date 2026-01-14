const express = require('express');
const router = express.Router();
const LicenseValidationService = require('../services/LicenseValidationService');
const SmartAllocationService = require('../services/SmartAllocationService');
const { authenticateJWT } = require('../middleware/auth');

// Get qualified drivers for a specific truck type
router.get('/drivers/qualified/:truckType', authenticateJWT, async (req, res) => {
  try {
    const { truckType } = req.params;
    console.log(`🔍 API: Getting qualified drivers for truck type: ${truckType}`);
    
    const drivers = await LicenseValidationService.getQualifiedDrivers(truckType);
    
    res.json({
      success: true,
      truckType,
      drivers,
      count: drivers.length,
      requirements: LicenseValidationService.getTruckRequirements(truckType)
    });
  } catch (error) {
    console.error('❌ Error getting qualified drivers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get qualified helpers for a specific truck type
router.get('/helpers/qualified/:truckType', authenticateJWT, async (req, res) => {
  try {
    const { truckType } = req.params;
    const { limit } = req.query;
    console.log(`🔍 API: Getting qualified helpers for truck type: ${truckType}`);
    
    const helpers = await LicenseValidationService.getQualifiedHelpers(truckType, limit ? parseInt(limit) : null);
    
    res.json({
      success: true,
      truckType,
      helpers,
      count: helpers.length,
      requirements: LicenseValidationService.getTruckRequirements(truckType)
    });
  } catch (error) {
    console.error('❌ Error getting qualified helpers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get truck requirements for a specific truck type
router.get('/requirements/:truckType', authenticateJWT, async (req, res) => {
  try {
    const { truckType } = req.params;
    console.log(`🔍 API: Getting requirements for truck type: ${truckType}`);
    
    const requirements = LicenseValidationService.getTruckRequirements(truckType);
    
    res.json({
      success: true,
      truckType,
      requirements
    });
  } catch (error) {
    console.error('❌ Error getting truck requirements:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Validate a specific driver-helper-truck combination
router.post('/validate-allocation', authenticateJWT, async (req, res) => {
  try {
    const { driverId, helperIds, truckType } = req.body;
    console.log(`🔍 API: Validating allocation - Driver: ${driverId}, Helpers: ${helperIds}, Truck: ${truckType}`);
    
    if (!driverId || !helperIds || !truckType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: driverId, helperIds, truckType'
      });
    }
    
    const validation = await LicenseValidationService.validateAllocation(driverId, helperIds, truckType);
    
    res.json({
      success: true,
      validation,
      truckType,
      driverId,
      helperIds
    });
  } catch (error) {
    console.error('❌ Error validating allocation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get smart allocation recommendation
router.post('/smart-allocation', authenticateJWT, async (req, res) => {
  try {
    const { truckType, deliveryLocation, preferredDriverId, preferredHelperIds } = req.body;
    console.log(`🔍 API: Getting smart allocation for truck type: ${truckType}`);
    
    if (!truckType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: truckType'
      });
    }
    
    const allocation = await SmartAllocationService.allocateDriverAndHelpers(
      truckType,
      deliveryLocation,
      preferredDriverId,
      preferredHelperIds
    );
    
    res.json(allocation);
  } catch (error) {
    console.error('❌ Error getting smart allocation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get license statistics
router.get('/statistics', authenticateJWT, async (req, res) => {
  try {
    console.log('🔍 API: Getting license statistics');
    
    const stats = await LicenseValidationService.getLicenseStatistics();
    
    res.json({
      success: true,
      statistics: stats,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('❌ Error getting license statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get allocation statistics
router.get('/allocation-statistics', authenticateJWT, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    console.log('🔍 API: Getting allocation statistics');
    
    const stats = await SmartAllocationService.getAllocationStatistics(startDate, endDate);
    
    res.json({
      success: true,
      statistics: stats,
      period: {
        startDate: startDate || null,
        endDate: endDate || null
      },
      timestamp: new Date()
    });
  } catch (error) {
    console.error('❌ Error getting allocation statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Validate driver license for truck type
router.post('/validate-driver-license', authenticateJWT, async (req, res) => {
  try {
    const { driverLicenseType, truckType } = req.body;
    console.log(`🔍 API: Validating driver license: ${driverLicenseType} for ${truckType}`);
    
    if (!driverLicenseType || !truckType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: driverLicenseType, truckType'
      });
    }
    
    const isValid = LicenseValidationService.validateDriverLicense(driverLicenseType, truckType);
    const requirements = LicenseValidationService.getTruckRequirements(truckType);
    
    res.json({
      success: true,
      isValid,
      driverLicenseType,
      truckType,
      requiredLicense: requirements.driverLicense,
      requirements
    });
  } catch (error) {
    console.error('❌ Error validating driver license:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Validate helper level for truck type
router.post('/validate-helper-level', authenticateJWT, async (req, res) => {
  try {
    const { helperLevel, truckType } = req.body;
    console.log(`🔍 API: Validating helper level: ${helperLevel} for ${truckType}`);
    
    if (!helperLevel || !truckType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: helperLevel, truckType'
      });
    }
    
    const isValid = LicenseValidationService.validateHelperLevel(helperLevel, truckType);
    const requirements = LicenseValidationService.getTruckRequirements(truckType);
    
    res.json({
      success: true,
      isValid,
      helperLevel,
      truckType,
      requiredLevel: requirements.helperLevel,
      requirements
    });
  } catch (error) {
    console.error('❌ Error validating helper level:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all truck types and their requirements
router.get('/truck-types', authenticateJWT, async (req, res) => {
  try {
    console.log('🔍 API: Getting all truck types and requirements');
    
    const truckTypes = ['mini truck', '4 wheeler', '6 wheeler', '8 wheeler', '10 wheeler'];
    const allRequirements = {};
    
    truckTypes.forEach(truckType => {
      allRequirements[truckType] = LicenseValidationService.getTruckRequirements(truckType);
    });
    
    res.json({
      success: true,
      truckTypes,
      requirements: allRequirements
    });
  } catch (error) {
    console.error('❌ Error getting truck types:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
