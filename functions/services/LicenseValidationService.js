const admin = require('firebase-admin');
const db = admin.firestore();
const DriverService = require('./DriverService');
const HelperService = require('./HelperService');

class LicenseValidationService {
  
  // Get truck requirements based on truck type
  static getTruckRequirements(truckType) {
    const requirements = {
      'mini truck': {
        driverLicense: 'non-professional',
        helpers: 1,
        helperLevel: 'basic',
        helperRequirements: ['Valid ID', 'Barangay Clearance']
      },
      '4 wheeler': {
        driverLicense: 'professional',
        helpers: 1,
        helperLevel: 'basic',
        helperRequirements: ['Valid ID', 'Barangay Clearance', 'Medical Certificate']
      },
      '6 wheeler': {
        driverLicense: 'professional',
        helpers: 2,
        helperLevel: 'standard',
        helperRequirements: ['Valid ID', 'Barangay Clearance', 'Medical Certificate']
      },
      '8 wheeler': {
        driverLicense: 'professional',
        helpers: 2,
        helperLevel: 'standard',
        helperRequirements: ['Valid ID', 'Barangay Clearance', 'Medical Certificate']
      },
      '10 wheeler': {
        driverLicense: 'professional',
        helpers: 3,
        helperLevel: 'advanced',
        helperRequirements: ['Valid ID', 'Barangay Clearance', 'Medical Certificate']
      }
    };

    return requirements[truckType] || requirements['mini truck'];
  }

  // Get qualified drivers for truck type
  static async getQualifiedDrivers(truckType) {
    try {
      console.log(`🔍 Getting qualified drivers for truck type: ${truckType}`);
      
      const requirements = this.getTruckRequirements(truckType);
      console.log(`📋 Requirements: ${JSON.stringify(requirements)}`);

      // Get drivers with the correct license type
      const driversSnapshot = await db.collection('drivers')
        .where('driverStatus', '==', 'active')
        .where('licenseType', '==', requirements.driverLicense)
        .where('qualifiedTruckTypes', 'array-contains', truckType)
        .where('documentCompliance.overallStatus', '==', 'complete')
        .get();

      const qualifiedDrivers = driversSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`✅ Found ${qualifiedDrivers.length} qualified drivers`);
      return qualifiedDrivers;
    } catch (error) {
      console.error('❌ Error getting qualified drivers:', error);
      throw error;
    }
  }

  // Get qualified helpers for truck type
  static async getQualifiedHelpers(truckType, requiredCount = null) {
    try {
      console.log(`🔍 Getting qualified helpers for truck type: ${truckType}`);
      
      const requirements = this.getTruckRequirements(truckType);
      const helperCount = requiredCount || requirements.helpers;
      console.log(`📋 Need ${helperCount} helpers with level: ${requirements.helperLevel}`);

      // Get helpers with appropriate level for the truck type
      const helpersSnapshot = await db.collection('helpers')
        .where('helperStatus', '==', 'active')
        .where('qualifiedTruckTypes', 'array-contains', truckType)
        .where('documentCompliance.overallStatus', '==', 'complete')
        .limit(helperCount * 2) // Get extra for selection
        .get();

      const qualifiedHelpers = helpersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`✅ Found ${qualifiedHelpers.length} qualified helpers`);
      return qualifiedHelpers;
    } catch (error) {
      console.error('❌ Error getting qualified helpers:', error);
      throw error;
    }
  }

  // Validate driver license for truck
  static validateDriverLicense(driverLicenseType, truckType) {
    const requirements = this.getTruckRequirements(truckType);
    const isValid = driverLicenseType.toLowerCase() === requirements.driverLicense.toLowerCase();
    
    console.log(`🔍 Validating driver license: ${driverLicenseType} for ${truckType}`);
    console.log(`📋 Required: ${requirements.driverLicense}, Valid: ${isValid}`);
    
    return isValid;
  }

  // Validate helper level for truck
  static validateHelperLevel(helperLevel, truckType) {
    const requirements = this.getTruckRequirements(truckType);
    const helperLevels = ['basic', 'standard', 'advanced'];
    
    const requiredLevelIndex = helperLevels.indexOf(requirements.helperLevel);
    const helperLevelIndex = helperLevels.indexOf(helperLevel);
    
    const isValid = helperLevelIndex >= requiredLevelIndex;
    
    console.log(`🔍 Validating helper level: ${helperLevel} for ${truckType}`);
    console.log(`📋 Required: ${requirements.helperLevel}, Valid: ${isValid}`);
    
    return isValid;
  }

  // Check if driver/helper combination is valid for truck type
  static async validateAllocation(driverId, helperIds, truckType) {
    try {
      console.log(`🔍 Validating allocation for truck type: ${truckType}`);
      console.log(`👤 Driver ID: ${driverId}`);
      console.log(`👥 Helper IDs: ${helperIds}`);

      const requirements = this.getTruckRequirements(truckType);
      const errors = [];

      // Validate driver
      if (driverId) {
        const driverDoc = await db.collection('drivers').doc(driverId).get();
        if (!driverDoc.exists) {
          errors.push('Driver not found');
        } else {
          const driverData = driverDoc.data();
          if (!this.validateDriverLicense(driverData.licenseType, truckType)) {
            errors.push(`Driver license type (${driverData.licenseType}) not valid for ${truckType}`);
          }
          if (driverData.driverStatus !== 'active') {
            errors.push('Driver is not active');
          }
          if (driverData.documentCompliance?.overallStatus !== 'complete') {
            errors.push('Driver documents are incomplete');
          }
        }
      } else {
        errors.push('No driver assigned');
      }

      // Validate helpers
      if (helperIds && helperIds.length > 0) {
        if (helperIds.length < requirements.helpers) {
          errors.push(`Insufficient helpers. Required: ${requirements.helpers}, Provided: ${helperIds.length}`);
        }

        for (const helperId of helperIds) {
          const helperDoc = await db.collection('helpers').doc(helperId).get();
          if (!helperDoc.exists) {
            errors.push(`Helper ${helperId} not found`);
          } else {
            const helperData = helperDoc.data();
            if (!this.validateHelperLevel(helperData.helperLevel, truckType)) {
              errors.push(`Helper ${helperData.HelperName} level (${helperData.helperLevel}) not sufficient for ${truckType}`);
            }
            if (helperData.helperStatus !== 'active') {
              errors.push(`Helper ${helperData.HelperName} is not active`);
            }
            if (helperData.documentCompliance?.overallStatus !== 'complete') {
              errors.push(`Helper ${helperData.HelperName} documents are incomplete`);
            }
          }
        }
      } else {
        errors.push(`No helpers assigned. Required: ${requirements.helpers}`);
      }

      const isValid = errors.length === 0;
      
      console.log(`📋 Validation result: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
      if (!isValid) {
        console.log(`❌ Errors: ${errors.join(', ')}`);
      }

      return {
        isValid,
        errors,
        requirements
      };
    } catch (error) {
      console.error('❌ Error validating allocation:', error);
      throw error;
    }
  }

  // Get license statistics for dashboard
  static async getLicenseStatistics() {
    try {
      const stats = {
        drivers: {
          professional: 0,
          nonProfessional: 0,
          total: 0
        },
        helpers: {
          basic: 0,
          standard: 0,
          advanced: 0,
          total: 0
        },
        compliance: {
          driversCompliant: 0,
          helpersCompliant: 0
        }
      };

      // Get driver statistics
      const driversSnapshot = await db.collection('drivers')
        .where('driverStatus', '==', 'active')
        .get();

      driversSnapshot.docs.forEach(doc => {
        const data = doc.data();
        stats.drivers.total++;
        
        if (data.licenseType === 'professional') {
          stats.drivers.professional++;
        } else {
          stats.drivers.nonProfessional++;
        }

        if (data.documentCompliance?.overallStatus === 'complete') {
          stats.compliance.driversCompliant++;
        }
      });

      // Get helper statistics
      const helpersSnapshot = await db.collection('helpers')
        .where('helperStatus', '==', 'active')
        .get();

      helpersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        stats.helpers.total++;
        
        switch (data.helperLevel) {
          case 'advanced':
            stats.helpers.advanced++;
            break;
          case 'standard':
            stats.helpers.standard++;
            break;
          case 'basic':
          default:
            stats.helpers.basic++;
            break;
        }

        if (data.documentCompliance?.overallStatus === 'complete') {
          stats.compliance.helpersCompliant++;
        }
      });

      return stats;
    } catch (error) {
      console.error('❌ Error getting license statistics:', error);
      throw error;
    }
  }
}

module.exports = LicenseValidationService;
