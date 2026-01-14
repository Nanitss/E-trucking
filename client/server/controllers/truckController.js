const { db } = require('../config/firebase');
const TruckService = require('../services/TruckService');
const AuditService = require('../services/AuditService');

// Get all trucks
exports.getAllTrucks = async (req, res) => {
  try {
    const trucks = await TruckService.getAll();
    res.json(trucks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all trucks with detailed status
exports.getTrucksWithDetailedStatus = async (req, res) => {
  try {
    const trucks = await TruckService.getTrucksWithDetailedStatus();
    res.json(trucks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all trucks with actual documents from file system
exports.getTrucksWithActualDocuments = async (req, res) => {
  try {
    console.log('📋 Getting trucks with actual documents from file system...');
    const trucks = await TruckService.getTrucksWithActualDocuments();
    res.json(trucks);
  } catch (error) {
    console.error('❌ Error getting trucks with actual documents:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get truck by ID
exports.getTruckById = async (req, res) => {
  try {
    const truck = await TruckService.getById(req.params.id);
    
    if (!truck) {
      return res.status(404).json({ message: 'Truck not found' });
    }
    
    res.json(truck);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get available trucks
exports.getAvailableTrucks = async (req, res) => {
  try {
    const trucks = await TruckService.getAvailableTrucks();
    res.json(trucks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get allocated trucks
exports.getAllocatedTrucks = async (req, res) => {
  try {
    const trucks = await TruckService.getAllocatedTrucks();
    res.json(trucks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get active trucks (operational, not in maintenance)
exports.getActiveTrucks = async (req, res) => {
  try {
    const trucks = await TruckService.getActiveTrucks();
    res.json(trucks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get maintenance trucks
exports.getMaintenanceTrucks = async (req, res) => {
  try {
    const trucks = await TruckService.getMaintenanceTrucks();
    res.json(trucks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get trucks by status
exports.getTrucksByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const trucks = await TruckService.getTrucksByStatus(status);
    res.json(trucks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get trucks by allocation status
exports.getTrucksByAllocationStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const trucks = await TruckService.getTrucksByAllocationStatus(status);
    res.json(trucks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new truck with enhanced status tracking and document upload
exports.createTruck = async (req, res) => {
  try {
    const { truckPlate, truckType, truckCapacity, truckBrand, modelYear, ...additionalData } = req.body;
    
    // Validate input
    if (!truckPlate || !truckType || !truckCapacity) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }
    
    const truckData = {
      truckPlate,
      truckType,
      truckCapacity,
      truckBrand: truckBrand || 'Unknown',
      modelYear: modelYear || null,
      ...additionalData
    };
    
    // Create truck first
    const truck = await TruckService.createTruckWithStatus(truckData);
    
    // Then update documents if any were uploaded
    if (req.uploadedDocuments && Object.keys(req.uploadedDocuments).length > 0) {
      console.log(`📄 Documents to add for new truck ${truck.id}:`, Object.keys(req.uploadedDocuments));
      await TruckService.updateTruckDocuments(truck.id, req.uploadedDocuments);
      
      // Get the updated truck with documents
      const updatedTruck = await TruckService.getById(truck.id);
      Object.assign(truck, updatedTruck);
    }
    
    // Log the create action to audit trail
    if (req.user) {
      await AuditService.logCreate(
        req.user.id,
        req.user.username,
        'truck',
        truck.id,
        {
          plate: truck.truckPlate,
          type: truck.truckType,
          brand: truck.truckBrand,
          documentsUploaded: req.uploadedDocuments ? Object.keys(req.uploadedDocuments) : [],
          requestBody: req.body
        }
      );
      
      console.log(`✅ Truck creation logged to audit trail for truck ${truck.id}`);
    }
    
    res.status(201).json({
      ...truck,
      message: 'Truck created successfully',
      documentsUploaded: req.uploadedDocuments ? Object.keys(req.uploadedDocuments).length : 0
    });
  } catch (error) {
    console.error('Error creating truck:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update truck with enhanced status tracking and document handling
exports.updateTruck = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    let truck;
    
    // Handle documents separately if they exist
    if (req.uploadedDocuments && Object.keys(req.uploadedDocuments).length > 0) {
      console.log(`📄 Documents to update for truck ${id}:`, Object.keys(req.uploadedDocuments));
      
      // Update documents first
      await TruckService.updateTruckDocuments(id, req.uploadedDocuments);
      
      // Then update other fields
      if (Object.keys(updateData).length > 0) {
        truck = await TruckService.update(id, updateData);
      } else {
        // If only documents were updated, get the updated truck
        truck = await TruckService.getById(id);
      }
    } else {
      // No documents, just update other fields
      truck = await TruckService.update(id, updateData);
    }
    
    // Log the update action to audit trail
    if (req.user) {
      await AuditService.logUpdate(
        req.user.id,
        req.user.username,
        'truck',
        id,
        { 
          changes: updateData,
          documentsUpdated: req.uploadedDocuments ? Object.keys(req.uploadedDocuments) : []
        }
      );
    }
    
    res.json({
      ...truck,
      message: 'Truck updated successfully',
      documentsUpdated: req.uploadedDocuments ? Object.keys(req.uploadedDocuments).length : 0
    });
  } catch (error) {
    console.error('Error updating truck:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update truck status specifically
exports.updateTruckStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { truckStatus, allocationStatus, operationalStatus, availabilityStatus, reason } = req.body;
    
    const statusData = {};
    if (truckStatus) statusData.truckStatus = truckStatus;
    if (allocationStatus) statusData.allocationStatus = allocationStatus;
    if (operationalStatus) statusData.operationalStatus = operationalStatus;
    if (availabilityStatus) statusData.availabilityStatus = availabilityStatus;
    if (reason) statusData.lastStatusReason = reason;
    
    const truck = await TruckService.updateTruckStatus(id, statusData);
    
    // Log the status change
    if (req.user) {
      await AuditService.logUpdate(
        req.user.id,
        req.user.username,
        'truck_status',
        id,
        { statusChange: statusData, reason }
      );
    }
    
    res.json(truck);
  } catch (error) {
    console.error('Error updating truck status:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update truck allocation status specifically
exports.updateTruckAllocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { allocationStatus, clientId, allocationId, reason } = req.body;
    
    const additionalData = {};
    if (clientId) additionalData.currentClientId = clientId;
    if (allocationId) additionalData.currentAllocationId = allocationId;
    if (reason) additionalData.lastAllocationReason = reason;
    
    const truck = await TruckService.updateAllocationStatus(id, allocationStatus, additionalData);
    
    // Log the allocation change
    if (req.user) {
      await AuditService.logUpdate(
        req.user.id,
        req.user.username,
        'truck_allocation',
        id,
        { allocationChange: { allocationStatus, ...additionalData }, reason }
      );
    }
    
    res.json(truck);
  } catch (error) {
    console.error('Error updating truck allocation:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete truck
exports.deleteTruck = async (req, res) => {
  try {
    await TruckService.delete(req.params.id);
    
    // Log the delete action to audit trail
    if (req.user) {
      await AuditService.logDelete(
        req.user.id,
        req.user.username,
        'truck',
        req.params.id
      );
    }
    
    res.json({ message: 'Truck deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Recalculate kilometers for a specific truck
exports.recalculateTruckKilometers = async (req, res) => {
  try {
    const { id } = req.params;
    
    const kmData = await TruckService.calculateTruckKilometers(id);
    
    const updateData = {
      totalKilometers: kmData.totalKilometers,
      totalCompletedDeliveries: kmData.totalCompletedDeliveries,
      averageKmPerDelivery: kmData.averageKmPerDelivery
    };
    
    await TruckService.update(id, updateData);
    
    // Log the recalculation action
    if (req.user) {
      await AuditService.logUpdate(
        req.user.id,
        req.user.username,
        'truck_kilometers',
        id,
        { recalculatedData: kmData }
      );
    }
    
    res.json({
      message: 'Truck kilometers recalculated successfully',
      data: kmData
    });
  } catch (error) {
    console.error('Error recalculating truck kilometers:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Recalculate kilometers for all trucks
exports.recalculateAllTruckKilometers = async (req, res) => {
  try {
    const results = await TruckService.recalculateAllTruckKilometers();
    
    // Log the bulk recalculation action
    if (req.user) {
      await AuditService.logCreate(
        req.user.id,
        req.user.username,
        'bulk_recalculation',
        'all_trucks',
        { 
          trucksProcessed: results.length,
          successfulUpdates: results.filter(r => r.status === 'updated').length,
          errors: results.filter(r => r.status === 'error').length
        }
      );
    }
    
    res.json({
      message: 'All truck kilometers recalculated',
      results: results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.status === 'updated').length,
        failed: results.filter(r => r.status === 'error').length
      }
    });
  } catch (error) {
    console.error('Error recalculating all truck kilometers:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete specific truck document
exports.deleteTruckDocument = async (req, res) => {
  try {
    const { id, docType } = req.params;
    
    // Get truck to find document path
    const truck = await TruckService.getById(id);
    if (!truck) {
      return res.status(404).json({ message: 'Truck not found' });
    }

    // Check if document exists
    if (!truck.documents || !truck.documents[docType]) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const document = truck.documents[docType];
    const fs = require('fs');
    const path = require('path');

    // Delete file from file system if it exists
    if (document.fullPath && fs.existsSync(document.fullPath)) {
      try {
        fs.unlinkSync(document.fullPath);
        console.log(`🗑️ Deleted file: ${document.fullPath}`);
      } catch (fileError) {
        console.error('Error deleting file:', fileError);
        // Continue with database update even if file deletion fails
      }
    }

    // Remove document from database
    const updatedDocuments = { ...truck.documents };
    delete updatedDocuments[docType];

    // Update truck with removed document
    await TruckService.update(id, { documents: updatedDocuments });

    // Log the action
    if (req.user) {
      await AuditService.logUpdate(
        req.user.id,
        req.user.username,
        'truck',
        id,
        { 
          action: 'document_removed',
          documentType: docType,
          removedDocument: document.filename
        }
      );
    }

    res.json({ 
      message: 'Document removed successfully',
      documentType: docType
    });
  } catch (error) {
    console.error('Error deleting truck document:', error);
    res.status(500).json({ message: 'Server error' });
  }
};