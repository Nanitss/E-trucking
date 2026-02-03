const admin = require('firebase-admin');
const db = admin.firestore();
const LicenseValidationService = require('./LicenseValidationService');

class SmartAllocationService {
  
  // Main allocation method - finds best driver and helpers for a truck type
  static async allocateDriverAndHelpers(truckType, deliveryLocation = null, preferredDriverId = null, preferredHelperIds = null) {
    try {
      console.log(`🚛 Starting smart allocation for truck type: ${truckType}`);
      console.log(`📍 Delivery location: ${deliveryLocation || 'Not specified'}`);
      console.log(`👤 Preferred driver: ${preferredDriverId || 'None'}`);
      console.log(`👥 Preferred helpers: ${preferredHelperIds?.join(', ') || 'None'}`);

      const requirements = LicenseValidationService.getTruckRequirements(truckType);
      console.log(`📋 Requirements: ${JSON.stringify(requirements)}`);

      // Step 1: Handle preferred selections first
      let selectedDriver = null;
      let selectedHelpers = [];

      // Check preferred driver if provided
      if (preferredDriverId) {
        const driverDoc = await db.collection('drivers').doc(preferredDriverId).get();
        if (driverDoc.exists) {
          const driverData = { id: driverDoc.id, ...driverDoc.data() };
          if (this._isDriverQualified(driverData, truckType)) {
            selectedDriver = driverData;
            console.log(`✅ Using preferred driver: ${driverData.DriverName}`);
          } else {
            console.log(`❌ Preferred driver ${driverData.DriverName} not qualified for ${truckType}`);
          }
        }
      }

      // Check preferred helpers if provided
      if (preferredHelperIds && preferredHelperIds.length > 0) {
        for (const helperId of preferredHelperIds) {
          const helperDoc = await db.collection('helpers').doc(helperId).get();
          if (helperDoc.exists) {
            const helperData = { id: helperDoc.id, ...helperDoc.data() };
            if (this._isHelperQualified(helperData, truckType)) {
              selectedHelpers.push(helperData);
              console.log(`✅ Using preferred helper: ${helperData.HelperName}`);
            } else {
              console.log(`❌ Preferred helper ${helperData.HelperName} not qualified for ${truckType}`);
            }
          }
        }
      }

      // Step 2: Get qualified drivers if no preferred driver selected
      if (!selectedDriver) {
        console.log(`🔍 Finding qualified drivers for ${truckType}`);
        const qualifiedDrivers = await LicenseValidationService.getQualifiedDrivers(truckType);
        
        if (qualifiedDrivers.length === 0) {
          return {
            success: false,
            error: `No qualified drivers available for ${truckType}`,
            requiredLicense: requirements.driverLicense,
            details: {
              availableDrivers: 0,
              requiredLicense: requirements.driverLicense
            }
          };
        }

        // Select best driver using smart algorithm
        selectedDriver = this._selectBestDriver(qualifiedDrivers, deliveryLocation);
        console.log(`✅ Selected driver: ${selectedDriver.DriverName} (Experience: ${selectedDriver.totalDeliveries || 0} deliveries)`);
      }

      // Step 3: Get additional qualified helpers if needed
      const helpersNeeded = requirements.helpers - selectedHelpers.length;
      if (helpersNeeded > 0) {
        console.log(`🔍 Finding ${helpersNeeded} additional qualified helpers for ${truckType}`);
        const qualifiedHelpers = await LicenseValidationService.getQualifiedHelpers(truckType, helpersNeeded * 2);
        
        // Filter out already selected helpers
        const availableHelpers = qualifiedHelpers.filter(helper => 
          !selectedHelpers.some(selected => selected.id === helper.id)
        );

        if (availableHelpers.length < helpersNeeded) {
          return {
            success: false,
            error: `Insufficient qualified helpers. Need ${helpersNeeded} more, found ${availableHelpers.length}`,
            details: {
              helpersNeeded,
              availableHelpers: availableHelpers.length,
              requiredLevel: requirements.helperLevel,
              alreadySelected: selectedHelpers.length
            }
          };
        }

        // Select best additional helpers
        const additionalHelpers = this._selectBestHelpers(availableHelpers, helpersNeeded, deliveryLocation);
        selectedHelpers = [...selectedHelpers, ...additionalHelpers];
        
        console.log(`✅ Selected helpers: ${selectedHelpers.map(h => h.HelperName).join(', ')}`);
      }

      // Step 4: Final validation
      const validation = await LicenseValidationService.validateAllocation(
        selectedDriver.id, 
        selectedHelpers.map(h => h.id), 
        truckType
      );

      if (!validation.isValid) {
        return {
          success: false,
          error: `Allocation validation failed: ${validation.errors.join(', ')}`,
          details: {
            validationErrors: validation.errors,
            requirements: validation.requirements
          }
        };
      }

      // Step 5: Return successful allocation
      const allocation = {
        truckType,
        driverLicenseValidated: true,
        helpersValidated: true,
        allocationTimestamp: new Date(),
        allocationScore: this._calculateAllocationScore(selectedDriver, selectedHelpers),
        requirements: validation.requirements
      };

      console.log(`🎉 Allocation successful! Score: ${allocation.allocationScore}`);

      return {
        success: true,
        driver: selectedDriver,
        helpers: selectedHelpers,
        allocation,
        summary: {
          driverName: selectedDriver.DriverName,
          driverLicense: selectedDriver.licenseType,
          helperNames: selectedHelpers.map(h => h.HelperName),
          helperLevels: selectedHelpers.map(h => h.helperLevel),
          totalExperience: (selectedDriver.totalDeliveries || 0) + selectedHelpers.reduce((sum, h) => sum + (h.totalAssignments || 0), 0)
        }
      };
      
    } catch (error) {
      console.error('❌ Error in smart allocation:', error);
      return { 
        success: false, 
        error: `Allocation failed: ${error.message}`,
        details: {
          errorType: error.constructor.name,
          errorMessage: error.message
        }
      };
    }
  }

  // Check if driver is qualified for truck type based on license
  static _isDriverQualified(driver, truckType) {
    try {
      console.log(`🔍 Checking driver qualification: ${driver.DriverName || driver.driverName} for ${truckType}`);
      
      const licenseType = (driver.licenseType?.toLowerCase() || driver.LicenseType?.toLowerCase() || 'unknown').trim();
      console.log(`   - Driver license type: ${licenseType}`);
      
      // Get truck requirements
      const requirements = LicenseValidationService.getTruckRequirements(truckType);
      const requiredLicense = requirements.driverLicense?.toLowerCase();
      console.log(`   - Required license for ${truckType}: ${requiredLicense}`);
      
      // Normalize truck type
      const normalizedTruckType = truckType.toLowerCase().trim();
      const isMiniTruck = normalizedTruckType === 'mini truck' || normalizedTruckType === 'mini' || normalizedTruckType === 'minitruck';
      
      // License validation logic - Support multiple naming conventions
      // Class CE / Professional = All trucks
      // Class C / Non-professional = Mini trucks only
      
      if (licenseType === 'professional' || licenseType === 'class ce' || licenseType === 'ce') {
        // Professional/Class CE license can drive ALL truck types
        console.log(`✅ ${licenseType.toUpperCase()} license - qualified for all truck types`);
        return true;
      } 
      else if (licenseType === 'non-professional' || licenseType === 'class c' || licenseType === 'c') {
        // Non-professional/Class C can ONLY drive mini trucks
        if (isMiniTruck) {
          console.log(`✅ ${licenseType.toUpperCase()} license - qualified for mini truck`);
          return true;
        } else {
          console.log(`❌ ${licenseType.toUpperCase()} license - NOT qualified for ${truckType} (can only drive mini trucks)`);
          return false;
        }
      } 
      else {
        // Unknown or invalid license type
        console.log(`❌ Unknown license type: ${licenseType}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error checking driver qualification:`, error);
      return false;
    }
  }

  // Check if helper is qualified for truck type based on license and level
  static _isHelperQualified(helper, truckType) {
    try {
      console.log(`🔍 Checking helper qualification: ${helper.HelperName || helper.helperName} for ${truckType}`);
      
      const licenseType = (helper.licenseType?.toLowerCase() || helper.LicenseType?.toLowerCase() || 'unknown').trim();
      const helperLevel = (helper.helperLevel?.toLowerCase() || helper.HelperLevel?.toLowerCase() || 'basic').trim();
      
      console.log(`   - Helper license type: ${licenseType}`);
      console.log(`   - Helper level: ${helperLevel}`);
      
      // Get truck requirements
      const requirements = LicenseValidationService.getTruckRequirements(truckType);
      const requiredHelperLevel = requirements.helperLevel?.toLowerCase();
      console.log(`   - Required helper level for ${truckType}: ${requiredHelperLevel}`);
      
      // Normalize truck type
      const normalizedTruckType = truckType.toLowerCase().trim();
      const isMiniTruck = normalizedTruckType === 'mini truck' || normalizedTruckType === 'mini' || normalizedTruckType === 'minitruck';
      
      // Helper qualification logic - Support multiple naming conventions
      // Class CE / Professional = All trucks
      // Class C / Non-professional = Mini trucks only
      
      if (licenseType === 'professional' || licenseType === 'class ce' || licenseType === 'ce') {
        // Professional/Class CE license helpers can work with ALL truck types
        console.log(`✅ ${licenseType.toUpperCase()} license helper - qualified for all truck types`);
        return true;
      } 
      else if (licenseType === 'non-professional' || licenseType === 'class c' || licenseType === 'c') {
        // Non-professional/Class C helpers can ONLY work with mini trucks
        if (isMiniTruck) {
          console.log(`✅ ${licenseType.toUpperCase()} license helper - qualified for mini truck`);
          return true;
        } else {
          console.log(`❌ ${licenseType.toUpperCase()} license helper - NOT qualified for ${truckType} (can only work with mini trucks)`);
          return false;
        }
      } 
      else if (licenseType === 'none' || licenseType === 'unknown' || licenseType === 'no license') {
        // No license helpers can only work with mini trucks
        if (isMiniTruck) {
          console.log(`✅ No license helper - qualified for mini truck only`);
          return true;
        } else {
          console.log(`❌ No license helper - NOT qualified for ${truckType}`);
          return false;
        }
      } 
      else {
        // Other license types (student, restricted) - check level requirements
        const levelQualified = this._isHelperLevelQualified(helperLevel, requiredHelperLevel);
        console.log(`   - Level qualification: ${levelQualified ? '✅ Qualified' : '❌ Not qualified'}`);
        return levelQualified;
      }
    } catch (error) {
      console.error(`❌ Error checking helper qualification:`, error);
      return false;
    }
  }

  // Check if helper level meets truck requirements
  static _isHelperLevelQualified(helperLevel, requiredLevel) {
    const levelHierarchy = {
      'basic': 1,
      'standard': 2,
      'advanced': 3
    };
    
    const helperLevelNum = levelHierarchy[helperLevel] || 0;
    const requiredLevelNum = levelHierarchy[requiredLevel] || 0;
    
    return helperLevelNum >= requiredLevelNum;
  }

  // Select best driver based on multiple criteria
  static _selectBestDriver(drivers, deliveryLocation) {
    console.log(`🎯 Selecting best driver from ${drivers.length} candidates`);
    
    return drivers.sort((a, b) => {
      // Priority scoring system
      let scoreA = 0;
      let scoreB = 0;

      // 1. Experience (40% weight) - Total deliveries
      const experienceA = a.totalDeliveries || 0;
      const experienceB = b.totalDeliveries || 0;
      scoreA += (experienceA / Math.max(experienceA + experienceB, 1)) * 40;
      scoreB += (experienceB / Math.max(experienceA + experienceB, 1)) * 40;

      // 2. Rating (30% weight)
      const ratingA = a.rating || 5.0;
      const ratingB = b.rating || 5.0;
      scoreA += (ratingA / 5.0) * 30;
      scoreB += (ratingB / 5.0) * 30;

      // 3. Recent activity (20% weight) - Prefer drivers who haven't been assigned recently
      const lastAssignmentA = a.lastAssignment ? new Date(a.lastAssignment.toDate ? a.lastAssignment.toDate() : a.lastAssignment) : new Date(0);
      const lastAssignmentB = b.lastAssignment ? new Date(b.lastAssignment.toDate ? b.lastAssignment.toDate() : b.lastAssignment) : new Date(0);
      const daysSinceA = (Date.now() - lastAssignmentA.getTime()) / (1000 * 60 * 60 * 24);
      const daysSinceB = (Date.now() - lastAssignmentB.getTime()) / (1000 * 60 * 60 * 24);
      scoreA += Math.min(daysSinceA / 7, 1) * 20; // Max score if more than 7 days
      scoreB += Math.min(daysSinceB / 7, 1) * 20;

      // 4. Document compliance bonus (10% weight)
      if (a.documentCompliance?.overallStatus === 'complete') scoreA += 10;
      if (b.documentCompliance?.overallStatus === 'complete') scoreB += 10;

      console.log(`👤 ${a.DriverName}: Score ${scoreA.toFixed(1)} (Experience: ${experienceA}, Rating: ${ratingA}, Days since: ${daysSinceA.toFixed(1)})`);
      console.log(`👤 ${b.DriverName}: Score ${scoreB.toFixed(1)} (Experience: ${experienceB}, Rating: ${ratingB}, Days since: ${daysSinceB.toFixed(1)})`);

      return scoreB - scoreA; // Higher score first
    })[0];
  }

  // Select best helpers based on multiple criteria
  static _selectBestHelpers(helpers, count, deliveryLocation) {
    console.log(`🎯 Selecting ${count} best helpers from ${helpers.length} candidates`);
    
    const sortedHelpers = helpers.sort((a, b) => {
      // Priority scoring system
      let scoreA = 0;
      let scoreB = 0;

      // 1. Experience (40% weight) - Total assignments
      const experienceA = a.totalAssignments || 0;
      const experienceB = b.totalAssignments || 0;
      scoreA += (experienceA / Math.max(experienceA + experienceB, 1)) * 40;
      scoreB += (experienceB / Math.max(experienceA + experienceB, 1)) * 40;

      // 2. Helper level (30% weight) - Higher level helpers get priority
      const levelScoreA = a.helperLevel === 'advanced' ? 30 : a.helperLevel === 'standard' ? 20 : 10;
      const levelScoreB = b.helperLevel === 'advanced' ? 30 : b.helperLevel === 'standard' ? 20 : 10;
      scoreA += levelScoreA;
      scoreB += levelScoreB;

      // 3. Rating (20% weight)
      const ratingA = a.rating || 5.0;
      const ratingB = b.rating || 5.0;
      scoreA += (ratingA / 5.0) * 20;
      scoreB += (ratingB / 5.0) * 20;

      // 4. Recent activity (10% weight)
      const lastAssignmentA = a.lastAssignment ? new Date(a.lastAssignment.toDate ? a.lastAssignment.toDate() : a.lastAssignment) : new Date(0);
      const lastAssignmentB = b.lastAssignment ? new Date(b.lastAssignment.toDate ? b.lastAssignment.toDate() : b.lastAssignment) : new Date(0);
      const daysSinceA = (Date.now() - lastAssignmentA.getTime()) / (1000 * 60 * 60 * 24);
      const daysSinceB = (Date.now() - lastAssignmentB.getTime()) / (1000 * 60 * 60 * 24);
      scoreA += Math.min(daysSinceA / 7, 1) * 10;
      scoreB += Math.min(daysSinceB / 7, 1) * 10;

      console.log(`👥 ${a.HelperName}: Score ${scoreA.toFixed(1)} (Experience: ${experienceA}, Level: ${a.helperLevel}, Rating: ${ratingA})`);
      console.log(`👥 ${b.HelperName}: Score ${scoreB.toFixed(1)} (Experience: ${experienceB}, Level: ${b.helperLevel}, Rating: ${ratingB})`);

      return scoreB - scoreA; // Higher score first
    });

    return sortedHelpers.slice(0, count);
  }

  // Calculate overall allocation score for reporting
  static _calculateAllocationScore(driver, helpers) {
    let score = 0;
    
    // Driver contribution (60% of total score)
    const driverExperience = driver.totalDeliveries || 0;
    const driverRating = driver.rating || 5.0;
    score += (driverExperience * 2 + driverRating * 10) * 0.6;
    
    // Helpers contribution (40% of total score)
    const helperScore = helpers.reduce((sum, helper) => {
      const helperExperience = helper.totalAssignments || 0;
      const helperRating = helper.rating || 5.0;
      const levelMultiplier = helper.helperLevel === 'advanced' ? 1.5 : helper.helperLevel === 'standard' ? 1.2 : 1.0;
      return sum + (helperExperience + helperRating * 5) * levelMultiplier;
    }, 0);
    
    score += helperScore * 0.4;
    
    return Math.round(score * 10) / 10; // Round to 1 decimal place
  }

  // Get allocation statistics for dashboard
  static async getAllocationStatistics(startDate = null, endDate = null) {
    try {
      let query = db.collection('deliveries');
      
      if (startDate) {
        query = query.where('created_at', '>=', new Date(startDate));
      }
      if (endDate) {
        query = query.where('created_at', '<=', new Date(endDate));
      }

      const deliveriesSnapshot = await query.get();
      
      const stats = {
        totalAllocations: deliveriesSnapshot.size,
        byTruckType: {},
        byDriverLicense: { professional: 0, nonProfessional: 0 },
        byHelperLevel: { basic: 0, standard: 0, advanced: 0 },
        averageAllocationTime: 0,
        successRate: 0
      };

      // Process each delivery for statistics
      for (const doc of deliveriesSnapshot.docs) {
        const data = doc.data();
        const truckType = data.truckType || 'unknown';
        
        // Count by truck type
        stats.byTruckType[truckType] = (stats.byTruckType[truckType] || 0) + 1;
        
        // Get driver and helper info if available
        if (data.driverId) {
          try {
            const driverDoc = await db.collection('drivers').doc(data.driverId).get();
            if (driverDoc.exists) {
              const driverData = driverDoc.data();
              if (driverData.licenseType === 'professional') {
                stats.byDriverLicense.professional++;
              } else {
                stats.byDriverLicense.nonProfessional++;
              }
            }
          } catch (error) {
            console.log(`Warning: Could not fetch driver ${data.driverId}`);
          }
        }
      }

      return stats;
    } catch (error) {
      console.error('❌ Error getting allocation statistics:', error);
      throw error;
    }
  }

  // Update allocation records after successful assignment
  static async recordAllocation(deliveryId, driverId, helperIds, allocationData) {
    try {
      const allocationRecord = {
        deliveryId,
        driverId,
        helperIds,
        truckType: allocationData.truckType,
        allocationScore: allocationData.allocationScore,
        allocationTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        requirements: allocationData.requirements,
        status: 'active'
      };

      await db.collection('allocations').add(allocationRecord);
      console.log(`📝 Recorded allocation for delivery ${deliveryId}`);
      
      return allocationRecord;
    } catch (error) {
      console.error('❌ Error recording allocation:', error);
      throw error;
    }
  }
}

module.exports = SmartAllocationService;
