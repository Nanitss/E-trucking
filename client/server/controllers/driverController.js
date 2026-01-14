const bcrypt = require('bcryptjs');
const { db } = require('../config/firebase');
const DriverService = require('../services/DriverService');

// Get all drivers
exports.getAllDrivers = async (req, res) => {
  try {
    const drivers = await DriverService.getAll();
    
    // Enrich drivers with user info
    const enrichedDrivers = await Promise.all(drivers.map(async (driver) => {
      if (driver.userId) {
        return await DriverService.getDriverWithUser(driver.id);
      }
      return driver;
    }));
    
    res.json(enrichedDrivers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get driver by ID
exports.getDriverById = async (req, res) => {
  try {
    const driver = await DriverService.getDriverWithUser(req.params.id);
    
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }
    
    res.json(driver);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create driver
exports.createDriver = async (req, res) => {
  try {
    const {
      driverName,
      driverAddress,
      driverNumber,
      driverEmploymentDate,
      username,
      password,
      driverStatus
    } = req.body;
    
    // Driver data
    const driverData = {
      driverName,
      driverAddress,
      driverNumber,
      driverEmploymentDate: new Date(driverEmploymentDate),
      driverDocuments: req.documentPath || null,
      driverStatus: driverStatus || 'active'
    };
    
    // User data
    const userData = {
      username,
      password,
      role: 'driver',
      status: driverStatus || 'active'
    };
    
    const driver = await DriverService.createDriverWithUser(driverData, userData);
    
    res.status(201).json({
      message: 'Driver created successfully',
      driverId: driver.id
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update driver
exports.updateDriver = async (req, res) => {
  try {
    const {
      driverName,
      driverAddress,
      driverNumber,
      driverEmploymentDate,
      driverStatus,
      username
    } = req.body;
    
    // Driver data
    const driverData = {};
    if (driverName) driverData.driverName = driverName;
    if (driverAddress) driverData.driverAddress = driverAddress;
    if (driverNumber) driverData.driverNumber = driverNumber;
    if (driverEmploymentDate) driverData.driverEmploymentDate = new Date(driverEmploymentDate);
    if (driverStatus) driverData.driverStatus = driverStatus;
    if (req.documentPath) driverData.driverDocuments = req.documentPath;
    
    // User data
    const userData = {};
    if (username) userData.username = username;
    if (driverStatus) userData.status = driverStatus;
    if (req.body.password) userData.password = req.body.password;
    
    const driver = await DriverService.updateDriverWithUser(req.params.id, driverData, userData);
    
    res.json({ message: 'Driver updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete driver
exports.deleteDriver = async (req, res) => {
  try {
    // Check if driver exists
    const driver = await DriverService.getById(req.params.id);
    
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }
    
    // Check if driver is assigned to any active delivery
    const deliveriesSnapshot = await db.collection('deliveries')
      .where('driverName', '==', driver.driverName)
      .where('deliveryStatus', 'in', ['pending', 'in-progress'])
      .get();
    
    if (!deliveriesSnapshot.empty) {
      return res.status(400).json({ message: 'Cannot delete driver that is currently assigned to an active delivery' });
    }
    
    // Delete driver and handle user account
    await DriverService.deleteDriverWithUser(req.params.id);
    
    res.json({ message: 'Driver deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get active drivers
exports.getActiveDrivers = async (req, res) => {
  try {
    const drivers = await DriverService.getActiveDrivers();
    res.json(drivers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get driver by user ID
exports.getDriverByUserId = async (req, res) => {
  try {
    const driver = await DriverService.getDriverByUserId(req.params.userId);
    
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }
    
    res.json(driver);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get driver profile
exports.getDriverProfile = async (req, res) => {
  try {
    const driver = await DriverService.getDriverByUserId(req.user.id);
    
    if (!driver) {
      return res.status(404).json({ message: 'Driver profile not found' });
    }
    
    res.json(driver);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get driver's assigned deliveries
exports.getDriverDeliveries = async (req, res) => {
  try {
    const driver = await DriverService.getDriverByUserId(req.user.id);
    
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }
    
    // Get deliveries where driver name matches
    const deliveriesSnapshot = await db.collection('deliveries')
      .where('driverName', '==', driver.driverName)
      .orderBy('deliveryDate', 'desc')
      .get();
    
    const deliveries = [];
    
    // For each delivery, get the associated client and truck
    for (const doc of deliveriesSnapshot.docs) {
      const delivery = { id: doc.id, ...doc.data() };
      
      // Get client details
      if (delivery.clientId) {
        const clientDoc = await db.collection('clients').doc(delivery.clientId).get();
        if (clientDoc.exists) {
          delivery.clientName = clientDoc.data().clientName;
        }
      }
      
      // Get truck details
      if (delivery.truckId) {
        const truckDoc = await db.collection('trucks').doc(delivery.truckId).get();
        if (truckDoc.exists) {
          delivery.truckPlate = truckDoc.data().truckPlate;
          delivery.truckType = truckDoc.data().truckType;
        }
      }
      
      deliveries.push(delivery);
    }
    
    res.json(deliveries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};