// Admin controllers for trucking web app
const { db, admin } = require('../config/firebase');
const UserService = require('../services/UserService');
const ClientService = require('../services/ClientService');
const TruckService = require('../services/TruckService');
const DriverService = require('../services/DriverService');
const AllocationService = require('../services/AllocationService');
const DeliveryService = require('../services/DeliveryService');
const AuditService = require('../services/AuditService');

// Dashboard data
exports.getDashboardData = async (req, res) => {
  try {
    // Get counts of various entities
    const [users, clients, trucks, drivers, deliveries] = await Promise.all([
      db.collection('users').get(),
      db.collection('clients').get(),
      db.collection('trucks').get(),
      db.collection('drivers').get(),
      db.collection('deliveries').get()
    ]);
    
    // Get pending and in-progress deliveries
    const activeDeliveries = await db.collection('deliveries')
      .where('deliveryStatus', 'in', ['pending', 'in-progress'])
      .get();
    
    // Get available trucks
    const availableTrucks = await db.collection('trucks')
      .where('truckStatus', '==', 'available')
      .get();
    
    // Return dashboard data
    res.json({
      counts: {
        users: users.size,
        clients: clients.size,
        trucks: trucks.size,
        drivers: drivers.size,
        deliveries: deliveries.size,
        activeDeliveries: activeDeliveries.size,
        availableTrucks: availableTrucks.size
      }
    });
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// User Management
exports.getAllUsers = async (req, res) => {
  try {
    const users = await UserService.getAll();
    res.json(users);
  } catch (error) {
    console.error('Error getting all users:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createUser = async (req, res) => {
  try {
    const user = await UserService.create(req.body);
    
    // Add audit logging
    await AuditService.logCreate(
      req.user.id,
      req.user.username,
      'user',
      user.id,
      { username: user.username, role: user.role }
    );
    
    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await UserService.getById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const user = await UserService.update(req.params.id, req.body);
    
    // Add audit logging
    await AuditService.logUpdate(
      req.user.id,
      req.user.username,
      'user',
      req.params.id,
      { changes: req.body }
    );
    
    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    await UserService.delete(req.params.id);
    
    // Add audit logging
    await AuditService.logDelete(
      req.user.id,
      req.user.username,
      'user',
      req.params.id
    );
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Client Management
exports.getAllClients = async (req, res) => {
  try {
    const clients = await ClientService.getAll();
    res.json(clients);
  } catch (error) {
    console.error('Error getting all clients:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createClient = async (req, res) => {
  try {
    const clientData = {
      ...req.body,
      documents: req.uploadedDocuments || {}
    };
    
    const client = await ClientService.create(clientData);
    
    // Add audit logging
    await AuditService.logCreate(
      req.user.id,
      req.user.username,
      'client',
      client.id,
      { 
        name: client.clientName,
        documentsUploaded: req.uploadedDocuments ? Object.keys(req.uploadedDocuments) : []
      }
    );
    
    res.status(201).json(client);
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getClientById = async (req, res) => {
  try {
    const client = await ClientService.getById(req.params.id);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }
    res.json(client);
  } catch (error) {
    console.error('Error getting client:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateClient = async (req, res) => {
  try {
    // Handle document updates
    const existingClient = await ClientService.getById(req.params.id);
    let updatedDocuments = { ...(existingClient.documents || {}) };

    // Add new uploaded documents
    if (req.uploadedDocuments) {
      updatedDocuments = {
        ...updatedDocuments,
        ...req.uploadedDocuments
      };
    }

    req.body.documents = updatedDocuments;

    const client = await ClientService.update(req.params.id, req.body);
    
    // Add audit logging
    await AuditService.logUpdate(
      req.user.id,
      req.user.username,
      'client',
      req.params.id,
      { 
        changes: req.body,
        documentsUploaded: req.uploadedDocuments ? Object.keys(req.uploadedDocuments) : []
      }
    );
    
    res.json(client);
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteClient = async (req, res) => {
  try {
    await ClientService.delete(req.params.id);
    
    // Add audit logging
    await AuditService.logDelete(
      req.user.id,
      req.user.username,
      'client',
      req.params.id
    );
    
    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper Management
exports.getAllHelpers = async (req, res) => {
  try {
    const HelperService = require('../services/HelperService');
    const helpers = await HelperService.getAllHelpers();
    res.json(helpers);
  } catch (error) {
    console.error('Error getting all helpers:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getHelperById = async (req, res) => {
  try {
    const HelperService = require('../services/HelperService');
    const helper = await HelperService.getHelperById(req.params.id);
    res.json(helper);
  } catch (error) {
    console.error('Error getting helper by ID:', error);
    if (error.message === 'Helper not found') {
      return res.status(404).json({ message: 'Helper not found' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createHelper = async (req, res) => {
  try {
    // Use HelperService to properly create helper with user account
    const HelperService = require('../services/HelperService');
    
    const helperData = {
      ...req.body,
      documents: req.uploadedDocuments || {}
    };
    
    const helper = await HelperService.createHelper(helperData);
    
    // Add audit logging
    await AuditService.logCreate(
      req.user.id,
      req.user.username,
      'helper',
      helper.id,
      { 
        name: req.body.helperName || req.body.HelperName,
        username: req.body.HelperUserName,
        documentsUploaded: req.uploadedDocuments ? Object.keys(req.uploadedDocuments) : []
      }
    );
    
    res.status(201).json(helper);
  } catch (error) {
    console.error('Error creating helper:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateHelper = async (req, res) => {
  try {
    // Use HelperService to properly update helper and user account
    const HelperService = require('../services/HelperService');
    
    const helperData = {
      ...req.body,
      newDocuments: req.uploadedDocuments || {}
    };
    
    const helper = await HelperService.updateHelper(req.params.id, helperData);
    
    // Add audit logging
    await AuditService.logUpdate(
      req.user.id,
      req.user.username,
      'helper',
      req.params.id,
      { 
        name: req.body.helperName || req.body.HelperName,
        username: req.body.HelperUserName,
        documentsUploaded: req.uploadedDocuments ? Object.keys(req.uploadedDocuments) : []
      }
    );
    
    res.json(helper);
  } catch (error) {
    console.error('Error updating helper:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteHelper = async (req, res) => {
  try {
    const helperRef = db.collection('helpers').doc(req.params.id);
    const helper = await helperRef.get();
    
    if (!helper.exists) {
      return res.status(404).json({ message: 'Helper not found' });
    }
    
    await helperRef.delete();
    
    // Add audit logging
    await AuditService.logDelete(
      req.user.id,
      req.user.username,
      'helper',
      req.params.id,
      { name: helper.data().name }
    );
    
    res.json({ message: 'Helper deleted successfully' });
  } catch (error) {
    console.error('Error deleting helper:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Truck Management
exports.getAllTrucks = async (req, res) => {
  try {
    // Use the enhanced method that includes document scanning and compliance
    const trucks = await TruckService.getTrucksWithActualDocuments();
    res.json(trucks);
  } catch (error) {
    console.error('Error getting all trucks:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createTruck = async (req, res) => {
  try {
    console.log('📝 Creating truck with data:', req.body);
    console.log('📝 Files:', req.files);
    console.log('📝 Uploaded documents:', req.uploadedDocuments);
    
    // Merge uploaded documents with truck data
    const truckData = {
      ...req.body,
      documents: req.uploadedDocuments || {}
    };
    
    // Use the enhanced truck creation method
    const truck = await TruckService.createTruckWithStatus(truckData);
    
    // Add audit logging
    await AuditService.logCreate(
      req.user.id,
      req.user.username,
      'truck',
      truck.id,
      { plate: truck.truckPlate, type: truck.truckType }
    );
    
    res.status(201).json(truck);
  } catch (error) {
    console.error('Error creating truck:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getTruckById = async (req, res) => {
  try {
    // Use the enhanced method that includes document scanning and compliance
    const truck = await TruckService.getTruckByIdWithDocuments(req.params.id);
    if (!truck) {
      return res.status(404).json({ message: 'Truck not found' });
    }
    res.json(truck);
  } catch (error) {
    console.error('Error getting truck:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateTruck = async (req, res) => {
  try {
    // Handle document updates
    const existingTruck = await TruckService.getById(req.params.id);
    let updatedDocuments = { ...existingTruck.documents };

    // Add new uploaded documents
    if (req.uploadedDocuments) {
      updatedDocuments = {
        ...updatedDocuments,
        ...req.uploadedDocuments
      };
    }

    // Handle existing documents that should be preserved
    Object.keys(req.body).forEach(key => {
      if (key.startsWith('existing_')) {
        const docType = key.replace('existing_', '');
        try {
          const existingDoc = JSON.parse(req.body[key]);
          updatedDocuments[docType] = existingDoc;
          console.log(`📄 Preserving existing document ${docType}:`, existingDoc.filename);
        } catch (error) {
          console.error(`❌ Error parsing existing document ${docType}:`, error);
        }
      }
    });

    req.body.documents = updatedDocuments;

    const truck = await TruckService.update(req.params.id, req.body);
    
    // Add audit logging
    await AuditService.logUpdate(
      req.user.id,
      req.user.username,
      'truck',
      req.params.id,
      { 
        changes: req.body,
        documentsUploaded: req.uploadedDocuments ? Object.keys(req.uploadedDocuments) : []
      }
    );
    
    res.json(truck);
  } catch (error) {
    console.error('Error updating truck:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getTrucksWithExpiringDocuments = async (req, res) => {
  try {
    const days = parseInt(req.params.days) || 30;
    const trucks = await TruckService.getTrucksWithExpiringDocuments(days);
    res.json({
      trucks,
      daysAhead: days,
      count: trucks.length
    });
  } catch (error) {
    console.error('Error getting trucks with expiring documents:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Enhanced truck management functions
exports.getTrucksWithDetailedStatus = async (req, res) => {
  try {
    const trucks = await TruckService.getTrucksWithDetailedStatus();
    res.json(trucks);
  } catch (error) {
    console.error('Error getting trucks with detailed status:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAvailableTrucks = async (req, res) => {
  try {
    const trucks = await TruckService.getAvailableTrucks();
    res.json(trucks);
  } catch (error) {
    console.error('Error getting available trucks:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllocatedTrucks = async (req, res) => {
  try {
    const trucks = await TruckService.getAllocatedTrucks();
    res.json(trucks);
  } catch (error) {
    console.error('Error getting allocated trucks:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getActiveTrucks = async (req, res) => {
  try {
    const trucks = await TruckService.getActiveTrucks();
    res.json(trucks);
  } catch (error) {
    console.error('Error getting active trucks:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getMaintenanceTrucks = async (req, res) => {
  try {
    const trucks = await TruckService.getMaintenanceTrucks();
    res.json(trucks);
  } catch (error) {
    console.error('Error getting maintenance trucks:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getTrucksByAllocationStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const trucks = await TruckService.getTrucksByAllocationStatus(status);
    res.json(trucks);
  } catch (error) {
    console.error('Error getting trucks by allocation status:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

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
    await AuditService.logUpdate(
      req.user.id,
      req.user.username,
      'truck_status',
      id,
      { statusChange: statusData, reason }
    );
    
    res.json(truck);
  } catch (error) {
    console.error('Error updating truck status:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

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
    await AuditService.logUpdate(
      req.user.id,
      req.user.username,
      'truck_allocation',
      id,
      { allocationChange: { allocationStatus, ...additionalData }, reason }
    );
    
    res.json(truck);
  } catch (error) {
    console.error('Error updating truck allocation:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteTruck = async (req, res) => {
  try {
    await TruckService.delete(req.params.id);
    
    // Add audit logging
    await AuditService.logDelete(
      req.user.id,
      req.user.username,
      'truck',
      req.params.id
    );
    
    res.json({ message: 'Truck deleted successfully' });
  } catch (error) {
    console.error('Error deleting truck:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Driver Management
exports.getAllDrivers = async (req, res) => {
  try {
    const drivers = await DriverService.getAllDrivers();
    res.json(drivers);
  } catch (error) {
    console.error('Error getting all drivers:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createDriver = async (req, res) => {
  try {
    console.log('🚗 ===== CREATE DRIVER DEBUG =====');
    console.log('📤 req.uploadedDocuments:', JSON.stringify(req.uploadedDocuments, null, 2));
    console.log('📤 req.body.documents:', JSON.stringify(req.body.documents, null, 2));
    
    // Include uploaded documents if available
    const driverData = {
      ...req.body,
      documents: req.uploadedDocuments || {}
    };
    
    console.log('📦 Final driverData.documents:', JSON.stringify(driverData.documents, null, 2));
    
    const driver = await DriverService.createDriver(driverData);
    
    console.log('✅ Driver created with documents:', JSON.stringify(driver.documents, null, 2));
    
    // Add audit logging
    await AuditService.logCreate(
      req.user.id,
      req.user.username,
      'driver',
      driver.id,
      { 
        name: driver.DriverName, 
        username: driver.DriverUserName,
        documentsUploaded: req.uploadedDocuments ? Object.keys(req.uploadedDocuments) : []
      }
    );
    
    res.status(201).json({
      ...driver,
      message: 'Driver created successfully',
      documentsUploaded: req.uploadedDocuments ? Object.keys(req.uploadedDocuments).length : 0
    });
  } catch (error) {
    console.error('Error creating driver:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getDriverById = async (req, res) => {
  try {
    const driver = await DriverService.getById(req.params.id);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }
    res.json(driver);
  } catch (error) {
    console.error('Error getting driver:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateDriver = async (req, res) => {
  try {
    console.log('🔧 Update driver request body:', req.body);
    console.log('📋 Emergency contact fields:', {
      name: req.body.emergencyContactName,
      phone: req.body.emergencyContactPhone,
      relationship: req.body.emergencyContactRelationship
    });
    
    // Handle document updates
    const existingDriver = await DriverService.getById(req.params.id);
    let updatedDocuments = { ...existingDriver.documents };

    // Add new uploaded documents
    if (req.uploadedDocuments) {
      updatedDocuments = {
        ...updatedDocuments,
        ...req.uploadedDocuments
      };
    }

    // Handle existing documents that should be preserved
    Object.keys(req.body).forEach(key => {
      if (key.startsWith('existing_')) {
        const docType = key.replace('existing_', '');
        try {
          const existingDoc = JSON.parse(req.body[key]);
          updatedDocuments[docType] = existingDoc;
          console.log(`📄 Preserving existing document ${docType}:`, existingDoc.filename);
        } catch (error) {
          console.error(`❌ Error parsing existing document ${docType}:`, error);
        }
      }
    });

    req.body.documents = updatedDocuments;

    const driver = await DriverService.updateDriver(req.params.id, req.body);
    
    // Add audit logging
    await AuditService.logUpdate(
      req.user.id,
      req.user.username,
      'driver',
      req.params.id,
      { 
        changes: req.body,
        documentsUploaded: req.uploadedDocuments ? Object.keys(req.uploadedDocuments) : []
      }
    );
    
    res.json(driver);
  } catch (error) {
    console.error('Error updating driver:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteDriver = async (req, res) => {
  try {
    await DriverService.deleteDriver(req.params.id);
    
    // Add audit logging
    await AuditService.logDelete(
      req.user.id,
      req.user.username,
      'driver',
      req.params.id
    );
    
    res.json({ message: 'Driver deleted successfully' });
  } catch (error) {
    console.error('Error deleting driver:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Allocation Management
exports.getAllAllocations = async (req, res) => {
  try {
    const allocations = await AllocationService.getAll();
    res.json(allocations);
  } catch (error) {
    console.error('Error getting all allocations:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createAllocation = async (req, res) => {
  try {
    const allocation = await AllocationService.createAllocation(req.body);
    
    // Add audit logging
    await AuditService.logCreate(
      req.user.id,
      req.user.username,
      'allocation',
      allocation.id,
      { clientId: allocation.clientId, truckId: allocation.truckId }
    );
    
    res.status(201).json(allocation);
  } catch (error) {
    console.error('Error creating allocation:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

exports.getAllocationById = async (req, res) => {
  try {
    const allocation = await AllocationService.getById(req.params.id);
    if (!allocation) {
      return res.status(404).json({ message: 'Allocation not found' });
    }
    res.json(allocation);
  } catch (error) {
    console.error('Error getting allocation:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateAllocation = async (req, res) => {
  try {
    const allocation = await AllocationService.update(req.params.id, req.body);
    
    // Add audit logging
    await AuditService.logUpdate(
      req.user.id,
      req.user.username,
      'allocation',
      req.params.id,
      { changes: req.body }
    );
    
    res.json(allocation);
  } catch (error) {
    console.error('Error updating allocation:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteAllocation = async (req, res) => {
  try {
    await AllocationService.delete(req.params.id);
    
    // Add audit logging
    await AuditService.logDelete(
      req.user.id,
      req.user.username,
      'allocation',
      req.params.id
    );
    
    res.json({ message: 'Allocation deleted successfully' });
  } catch (error) {
    console.error('Error deleting allocation:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delivery Management - The core part we're implementing
exports.getAllDeliveries = async (req, res) => {
  try {
    // Get all deliveries with pagination if required
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    const result = await DeliveryService.getPaginated(page, limit);
    res.json(result);
  } catch (error) {
    console.error('Error getting all deliveries:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createDelivery = async (req, res) => {
  try {
    // Validate the delivery data
    const { clientId, truckId, pickupLocation, pickupCoordinates,
           deliveryAddress, dropoffCoordinates, cargoWeight, deliveryDate } = req.body;
    
    if (!clientId || !truckId || !pickupLocation || !deliveryAddress || 
        !pickupCoordinates || !dropoffCoordinates || !cargoWeight || !deliveryDate) {
      return res.status(400).json({ 
        message: 'Missing required fields for delivery creation' 
      });
    }
    
    // Get truck details to include in delivery data
    const truckDoc = await db.collection('trucks').doc(truckId).get();
    if (!truckDoc.exists) {
      return res.status(404).json({ message: 'Truck not found' });
    }
    const truckData = truckDoc.data();
    
    // Enhance delivery data with truck information
    const enhancedDeliveryData = {
      ...req.body,
      truckPlate: truckData.truckPlate,
      truckType: truckData.truckType,
      truckBrand: truckData.truckBrand || 'Unknown',
      modelYear: truckData.modelYear || null,
      truckCapacity: truckData.truckCapacity || 0,
      totalKilometers: truckData.totalKilometers || 0,
      totalCompletedDeliveries: truckData.totalCompletedDeliveries || 0,
      averageKmPerDelivery: truckData.averageKmPerDelivery || 0
    };
    
    // Create the delivery using the service
    const delivery = await DeliveryService.createDelivery(enhancedDeliveryData);
    
    // Add audit logging
    await AuditService.logCreate(
      req.user.id,
      req.user.username,
      'delivery',
      delivery.id,
      { 
        clientId: delivery.clientId, 
        truckId: delivery.truckId,
        pickupLocation: delivery.pickupLocation,
        deliveryAddress: delivery.deliveryAddress,
        status: delivery.deliveryStatus
      }
    );
    
    res.status(201).json(delivery);
  } catch (error) {
    console.error('Error creating delivery:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

exports.getDeliveryById = async (req, res) => {
  try {
    const delivery = await DeliveryService.getById(req.params.id);
    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }
    res.json(delivery);
  } catch (error) {
    console.error('Error getting delivery:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateDelivery = async (req, res) => {
  try {
    const delivery = await DeliveryService.update(req.params.id, req.body);
    
    // Add audit logging
    await AuditService.logUpdate(
      req.user.id,
      req.user.username,
      'delivery',
      req.params.id,
      { 
        changes: req.body,
        newStatus: req.body.deliveryStatus
      }
    );
    
    res.json(delivery);
  } catch (error) {
    console.error('Error updating delivery:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate that we have a non-empty ID
    if (!id || id === 'undefined') {
      console.error('Invalid delivery ID provided:', id);
      return res.status(400).json({ message: 'Valid delivery ID is required' });
    }

    console.log(`Attempting to delete delivery with ID: ${id}`);
    
    // Check if the delivery exists first
    const delivery = await DeliveryService.getById(id);
    if (!delivery) {
      console.log(`Delivery with ID ${id} not found`);
      return res.status(404).json({ message: 'Delivery not found' });
    }
    
    // If the delivery is in progress, don't allow deletion
    if (delivery.deliveryStatus === 'in-progress') {
      return res.status(400).json({ 
        message: 'Cannot delete a delivery that is in progress. Update status first.' 
      });
    }
    
    console.log(`Deleting delivery: ${id}, status: ${delivery.deliveryStatus}`);
    
    // Delete the delivery
    await DeliveryService.delete(id);
    
    // Update the truck status when delivery is deleted
    if (delivery.truckId) {
      console.log(`Updating truck ${delivery.truckId} status after delivery deletion`);
      try {
        // Check if there's an active allocation for this truck
        const allocationsSnapshot = await db.collection('allocations')
          .where('truckId', '==', delivery.truckId)
          .where('status', '==', 'active')
          .limit(1)
          .get();
        
        if (!allocationsSnapshot.empty) {
          // Truck should remain allocated but no longer actively in delivery
          await db.collection('trucks').doc(delivery.truckId).update({
            truckStatus: 'allocated',
            activeDelivery: false,
            currentDeliveryId: null,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          });
        } else {
          // No allocation exists, truck becomes available
          await db.collection('trucks').doc(delivery.truckId).update({
            truckStatus: 'available',
            activeDelivery: false,
            currentDeliveryId: null,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      } catch (truckError) {
        console.error(`Error updating truck status: ${truckError.message}`);
        // Continue execution - don't fail the whole request just because truck update failed
      }
    }
    
    // Add audit logging
    try {
      await AuditService.logDelete(
        req.user.id,
        req.user.username,
        'delivery',
        id,
        {
          clientId: delivery.clientId,
          truckId: delivery.truckId,
          status: delivery.deliveryStatus
        }
      );
      console.log(`Successfully logged deletion to audit trail for delivery ${id}`);
    } catch (auditError) {
      console.error(`Error logging to audit trail: ${auditError.message}`);
      // Continue execution - don't fail the whole request just because audit logging failed
    }
    
    console.log(`Successfully deleted delivery ${id}`);
    res.json({ message: 'Delivery deleted successfully' });
  } catch (error) {
    console.error('Error deleting delivery:', error);
    res.status(500).json({ 
      message: 'Server error while deleting delivery',
      error: error.message
    });
  }
};

exports.getDeliveriesByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    
    // Validate the status
    const validStatuses = ['pending', 'in-progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: 'Invalid status. Must be one of: pending, in-progress, completed, cancelled' 
      });
    }
    
    const deliveries = await DeliveryService.getDeliveriesByStatus(status);
    res.json(deliveries);
  } catch (error) {
    console.error('Error getting deliveries by status:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateDeliveryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate the status
    const validStatuses = ['pending', 'in-progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: 'Invalid status. Must be one of: pending, in-progress, completed, cancelled' 
      });
    }
    
    // Get the current delivery to check status transition
    const delivery = await DeliveryService.getById(id);
    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }
    
    // Special handling for completion
    if (status === 'completed' && delivery.deliveryStatus === 'in-progress') {
      const updatedDelivery = await DeliveryService.completeDelivery(id);
      
      // Add audit logging
      await AuditService.logUpdate(
        req.user.id,
        req.user.username,
        'delivery',
        id,
        { 
          oldStatus: delivery.deliveryStatus,
          newStatus: status
        }
      );
      
      return res.json(updatedDelivery);
    }
    
    // Special handling for cancelled deliveries - cancel payment first
    let paymentCancellationResult = null;
    if (status === 'cancelled') {
      try {
        const paymentService = require('../services/PaymentService');
        paymentCancellationResult = await paymentService.cancelPayment(id);
        console.log('✅ Admin payment cancellation result:', paymentCancellationResult);
      } catch (paymentError) {
        console.error('⚠️ Admin payment cancellation failed but continuing:', paymentError.message);
      }
    }

    // For other status changes
    const updatedDelivery = await DeliveryService.updateDeliveryStatus(id, status);
    
    // Special handling for cancelled deliveries - update truck appropriately
    if (status === 'cancelled' && delivery.truckId) {
      // Check if there's an active allocation for this truck
      const allocationsSnapshot = await db.collection('allocations')
        .where('truckId', '==', delivery.truckId)
        .where('status', '==', 'active')
        .limit(1)
        .get();
      
      if (!allocationsSnapshot.empty) {
        // Truck should remain allocated but no longer actively in delivery
        await db.collection('trucks').doc(delivery.truckId).update({
          truckStatus: 'allocated',
          activeDelivery: false,
          currentDeliveryId: null,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        // No allocation exists, truck becomes available
        await db.collection('trucks').doc(delivery.truckId).update({
          truckStatus: 'available',
          activeDelivery: false,
          currentDeliveryId: null,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      
      // Update driver and helper status back to active
      if (delivery.driverId) {
        await db.collection('drivers').doc(delivery.driverId).update({
          driverStatus: 'active',
          currentDeliveryId: null,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`✅ Driver ${delivery.driverId} status updated to active (delivery cancelled)`);
      }
      
      if (delivery.helperId) {
        await db.collection('helpers').doc(delivery.helperId).update({
          helperStatus: 'active',
          currentDeliveryId: null,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`✅ Helper ${delivery.helperId} status updated to active (delivery cancelled)`);
      }
    }
    
    // Special handling for delivered deliveries - update truck, driver, and helper
    if (status === 'delivered' && delivery.truckId) {
      console.log(`📦 Delivery marked as delivered - updating truck, driver, and helper status...`);
      
      // Check if there's an active allocation for this truck
      const allocationsSnapshot = await db.collection('allocations')
        .where('truckId', '==', delivery.truckId)
        .where('status', '==', 'active')
        .limit(1)
        .get();
      
      if (!allocationsSnapshot.empty) {
        // Truck should remain allocated but no longer actively in delivery
        await db.collection('trucks').doc(delivery.truckId).update({
          truckStatus: 'allocated',
          activeDelivery: false,
          currentDeliveryId: null,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`✅ Truck ${delivery.truckId} status updated to allocated (delivery completed)`);
      } else {
        // No allocation exists, truck becomes available
        await db.collection('trucks').doc(delivery.truckId).update({
          truckStatus: 'available',
          activeDelivery: false,
          currentDeliveryId: null,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`✅ Truck ${delivery.truckId} status updated to available (delivery completed)`);
      }
      
      // Update driver status back to active
      if (delivery.driverId) {
        await db.collection('drivers').doc(delivery.driverId).update({
          driverStatus: 'active',
          currentDeliveryId: null,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`✅ Driver ${delivery.driverId} status updated to active (delivery completed)`);
      }
      
      // Update helper status back to active
      if (delivery.helperId) {
        await db.collection('helpers').doc(delivery.helperId).update({
          helperStatus: 'active',
          currentDeliveryId: null,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`✅ Helper ${delivery.helperId} status updated to active (delivery completed)`);
      }
    }
    
    // Add audit logging
    await AuditService.logUpdate(
      req.user.id,
      req.user.username,
      'delivery',
      id,
      { 
        oldStatus: delivery.deliveryStatus,
        newStatus: status
      }
    );
    
    res.json(updatedDelivery);
  } catch (error) {
    console.error('Error updating delivery status:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

exports.getDeliveriesNearLocation = async (req, res) => {
  try {
    const { latitude, longitude, radius, type } = req.query;
    
    // Validate coordinates and radius
    if (!latitude || !longitude || !radius) {
      return res.status(400).json({ 
        message: 'Missing required parameters: latitude, longitude, and radius' 
      });
    }
    
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const radiusInKm = parseFloat(radius);
    
    if (isNaN(lat) || isNaN(lng) || isNaN(radiusInKm)) {
      return res.status(400).json({ 
        message: 'Invalid coordinates or radius. Must be valid numbers.' 
      });
    }
    
    // Validate type (pickup or dropoff)
    const locationType = type || 'pickup';
    if (locationType !== 'pickup' && locationType !== 'dropoff') {
      return res.status(400).json({ 
        message: 'Invalid type. Must be either "pickup" or "dropoff"' 
      });
    }
    
    const deliveries = await DeliveryService.getDeliveriesNearLocation(
      { lat, lng }, 
      radiusInKm, 
      locationType
    );
    
    res.json(deliveries);
  } catch (error) {
    console.error('Error getting deliveries near location:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Audit Trail
exports.getAuditTrail = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    
    const auditTrail = await AuditService.getAuditTrail(page, limit);
    res.json(auditTrail);
  } catch (error) {
    console.error('Error getting audit trail:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 

exports.deleteHelper = async (req, res) => {
  try {
    const helperRef = db.collection('helpers').doc(req.params.id);
    const helper = await helperRef.get();
    
    if (!helper.exists) {
      return res.status(404).json({ message: 'Helper not found' });
    }
    
    await helperRef.delete();
    
    // Add audit logging
    await AuditService.logDelete(
      req.user.id,
      req.user.username,
      'helper',
      req.params.id,
      { name: helper.data().name }
    );
    
    res.json({ message: 'Helper deleted successfully' });
  } catch (error) {
    console.error('Error deleting helper:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Staff Management
exports.getAllStaff = async (req, res) => {
  try {
    const staff = await db.collection('staff').get();
    const staffData = staff.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.json(staffData);
  } catch (error) {
    console.error('Error getting all staff:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getStaffById = async (req, res) => {
  try {
    const staff = await db.collection('staff').doc(req.params.id).get();
    if (!staff.exists) {
      return res.status(404).json({ message: 'Staff member not found' });
    }
    res.json({ id: staff.id, ...staff.data() });
  } catch (error) {
    console.error('Error getting staff by ID:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createStaff = async (req, res) => {
  try {
    const staffData = {
      ...req.body,
      documents: req.uploadedDocuments || {},
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const staffRef = await db.collection('staff').add(staffData);
    const staff = await staffRef.get();
    
    // Add audit logging
    await AuditService.logCreate(
      req.user.id,
      req.user.username,
      'staff',
      staffRef.id,
      { 
        name: req.body.staffName || req.body.StaffName,
        documentsUploaded: req.uploadedDocuments ? Object.keys(req.uploadedDocuments) : []
      }
    );
    
    res.status(201).json({ id: staffRef.id, ...staff.data() });
  } catch (error) {
    console.error('Error creating staff member:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateStaff = async (req, res) => {
  try {
    const staffRef = db.collection('staff').doc(req.params.id);
    const staff = await staffRef.get();
    
    if (!staff.exists) {
      return res.status(404).json({ message: 'Staff member not found' });
    }
    
    // Handle document updates
    let updatedDocuments = { ...(staff.data().documents || {}) };

    // Add new uploaded documents
    if (req.uploadedDocuments) {
      updatedDocuments = {
        ...updatedDocuments,
        ...req.uploadedDocuments
      };
    }
    
    const updateData = {
      ...req.body,
      documents: updatedDocuments,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await staffRef.update(updateData);
    
    // Add audit logging
    await AuditService.logUpdate(
      req.user.id,
      req.user.username,
      'staff',
      req.params.id,
      { 
        name: req.body.staffName || req.body.StaffName,
        documentsUploaded: req.uploadedDocuments ? Object.keys(req.uploadedDocuments) : []
      }
    );
    
    res.json({ id: req.params.id, ...updateData });
  } catch (error) {
    console.error('Error updating staff member:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteStaff = async (req, res) => {
  try {
    const staffRef = db.collection('staff').doc(req.params.id);
    const staff = await staffRef.get();
    
    if (!staff.exists) {
      return res.status(404).json({ message: 'Staff member not found' });
    }
    
    await staffRef.delete();
    
    // Add audit logging
    await AuditService.logDelete(
      req.user.id,
      req.user.username,
      'staff',
      req.params.id,
      { name: staff.data().name }
    );
    
    res.json({ message: 'Staff member deleted successfully' });
  } catch (error) {
    console.error('Error deleting staff member:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY: FIX STUCK DRIVER/HELPER STATUSES
// ═══════════════════════════════════════════════════════════════════════════════

exports.fixStuckDriverHelperStatuses = async (req, res) => {
  try {
    console.log('🔧 Starting to fix stuck driver/helper statuses...');
    
    const results = {
      driversChecked: 0,
      driversFixed: 0,
      helpersChecked: 0,
      helpersFixed: 0,
      errors: []
    };
    
    // Get all drivers with "on-delivery" status
    const onDeliveryDriversSnapshot = await db.collection('drivers')
      .where('driverStatus', '==', 'on-delivery')
      .get();
    
    console.log(`📋 Found ${onDeliveryDriversSnapshot.size} drivers with "on-delivery" status`);
    results.driversChecked = onDeliveryDriversSnapshot.size;
    
    // Check each driver
    for (const driverDoc of onDeliveryDriversSnapshot.docs) {
      const driverId = driverDoc.id;
      const driverData = driverDoc.data();
      
      try {
        // Check if driver has any active deliveries
        const activeDeliveriesSnapshot = await db.collection('deliveries')
          .where('driverId', '==', driverId)
          .where('deliveryStatus', 'in', ['pending', 'in-progress', 'started', 'picked-up'])
          .get();
        
        if (activeDeliveriesSnapshot.empty) {
          // No active deliveries - update status to active
          await db.collection('drivers').doc(driverId).update({
            driverStatus: 'active',
            currentDeliveryId: null,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          });
          
          console.log(`✅ Fixed driver ${driverId} (${driverData.driverName}) - no active deliveries`);
          results.driversFixed++;
        } else {
          console.log(`⏭️ Skipped driver ${driverId} - has ${activeDeliveriesSnapshot.size} active deliveries`);
        }
      } catch (error) {
        console.error(`❌ Error fixing driver ${driverId}:`, error.message);
        results.errors.push(`Driver ${driverId}: ${error.message}`);
      }
    }
    
    // Get all helpers with "on-delivery" status
    const onDeliveryHelpersSnapshot = await db.collection('helpers')
      .where('helperStatus', '==', 'on-delivery')
      .get();
    
    console.log(`📋 Found ${onDeliveryHelpersSnapshot.size} helpers with "on-delivery" status`);
    results.helpersChecked = onDeliveryHelpersSnapshot.size;
    
    // Check each helper
    for (const helperDoc of onDeliveryHelpersSnapshot.docs) {
      const helperId = helperDoc.id;
      const helperData = helperDoc.data();
      
      try {
        // Check if helper has any active deliveries
        const activeDeliveriesSnapshot = await db.collection('deliveries')
          .where('helperId', '==', helperId)
          .where('deliveryStatus', 'in', ['pending', 'in-progress', 'started', 'picked-up'])
          .get();
        
        if (activeDeliveriesSnapshot.empty) {
          // No active deliveries - update status to active
          await db.collection('helpers').doc(helperId).update({
            helperStatus: 'active',
            currentDeliveryId: null,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          });
          
          console.log(`✅ Fixed helper ${helperId} (${helperData.helperName}) - no active deliveries`);
          results.helpersFixed++;
        } else {
          console.log(`⏭️ Skipped helper ${helperId} - has ${activeDeliveriesSnapshot.size} active deliveries`);
        }
      } catch (error) {
        console.error(`❌ Error fixing helper ${helperId}:`, error.message);
        results.errors.push(`Helper ${helperId}: ${error.message}`);
      }
    }
    
    console.log('✅ Finished fixing stuck statuses');
    console.log(`📊 Results: ${results.driversFixed}/${results.driversChecked} drivers fixed, ${results.helpersFixed}/${results.helpersChecked} helpers fixed`);
    
    res.json({
      success: true,
      message: 'Successfully fixed stuck driver/helper statuses',
      results: results
    });
    
  } catch (error) {
    console.error('❌ Error fixing stuck statuses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fix stuck statuses',
      error: error.message
    });
  }
}; 