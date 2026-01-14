const SimpleFileScanner = require('../services/SimpleFileScanner');

// Initialize the file scanner
const fileScanner = new SimpleFileScanner();

// Get all trucks with documents from file system
exports.getTrucksWithDocuments = async (req, res) => {
  try {
    console.log('🔍 Scanning for trucks with documents...');
    const trucks = await fileScanner.getTrucksWithDocuments();
    console.log(`✅ Found ${trucks.length} trucks with documents`);
    
    res.json({
      success: true,
      count: trucks.length,
      trucks: trucks
    });
  } catch (error) {
    console.error('❌ Error getting trucks with documents:', error);
    res.status(500).json({
      success: false,
      message: 'Error scanning truck documents',
      error: error.message
    });
  }
};

// Get all drivers with documents from file system
exports.getDriversWithDocuments = async (req, res) => {
  try {
    console.log('🔍 Scanning for drivers with documents...');
    const drivers = await fileScanner.getDriversWithDocuments();
    console.log(`✅ Found ${drivers.length} drivers with documents`);
    
    res.json({
      success: true,
      count: drivers.length,
      drivers: drivers
    });
  } catch (error) {
    console.error('❌ Error getting drivers with documents:', error);
    res.status(500).json({
      success: false,
      message: 'Error scanning driver documents',
      error: error.message
    });
  }
};

// Get all helpers with documents from file system
exports.getHelpersWithDocuments = async (req, res) => {
  try {
    console.log('🔍 Scanning for helpers with documents...');
    const helpers = await fileScanner.getHelpersWithDocuments();
    console.log(`✅ Found ${helpers.length} helpers with documents`);
    
    res.json({
      success: true,
      count: helpers.length,
      helpers: helpers
    });
  } catch (error) {
    console.error('❌ Error getting helpers with documents:', error);
    res.status(500).json({
      success: false,
      message: 'Error scanning helper documents',
      error: error.message
    });
  }
};

// Get all staff with documents from file system
exports.getStaffWithDocuments = async (req, res) => {
  try {
    console.log('🔍 Scanning for staff with documents...');
    const staff = await fileScanner.getStaffWithDocuments();
    console.log(`✅ Found ${staff.length} staff with documents`);
    
    res.json({
      success: true,
      count: staff.length,
      staff: staff
    });
  } catch (error) {
    console.error('❌ Error getting staff with documents:', error);
    res.status(500).json({
      success: false,
      message: 'Error scanning staff documents',
      error: error.message
    });
  }
};

// Get all clients with documents from file system
exports.getClientsWithDocuments = async (req, res) => {
  try {
    console.log('🔍 Scanning for clients with documents...');
    const clients = await fileScanner.getClientsWithDocuments();
    console.log(`✅ Found ${clients.length} clients with documents`);
    
    res.json({
      success: true,
      count: clients.length,
      clients: clients
    });
  } catch (error) {
    console.error('❌ Error getting clients with documents:', error);
    res.status(500).json({
      success: false,
      message: 'Error scanning client documents',
      error: error.message
    });
  }
};

// Get documents for a specific truck by plate number
exports.getTruckDocuments = async (req, res) => {
  try {
    const { plate } = req.params;
    if (!plate) {
      return res.status(400).json({
        success: false,
        message: 'Truck plate number is required'
      });
    }

    console.log(`🔍 Getting documents for truck: ${plate}`);
    const result = await fileScanner.getTruckDocuments(plate);
    
    res.json({
      success: true,
      truckPlate: plate,
      ...result
    });
  } catch (error) {
    console.error('❌ Error getting truck documents:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting truck documents',
      error: error.message
    });
  }
};

// Get documents for a specific driver by name
exports.getDriverDocuments = async (req, res) => {
  try {
    const { name } = req.params;
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Driver name is required'
      });
    }

    console.log(`🔍 Getting documents for driver: ${name}`);
    const result = await fileScanner.getDriverDocuments(name);
    
    res.json({
      success: true,
      driverName: name,
      ...result
    });
  } catch (error) {
    console.error('❌ Error getting driver documents:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting driver documents',
      error: error.message
    });
  }
};

// Get documents for a specific helper by name
exports.getHelperDocuments = async (req, res) => {
  try {
    const { name } = req.params;
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Helper name is required'
      });
    }

    console.log(`🔍 Getting documents for helper: ${name}`);
    const result = await fileScanner.getHelperDocuments(name);
    
    res.json({
      success: true,
      helperName: name,
      ...result
    });
  } catch (error) {
    console.error('❌ Error getting helper documents:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting helper documents',
      error: error.message
    });
  }
};

// Get documents for a specific staff by name
exports.getStaffDocuments = async (req, res) => {
  try {
    const { name } = req.params;
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Staff name is required'
      });
    }

    console.log(`🔍 Getting documents for staff: ${name}`);
    const result = await fileScanner.getStaffDocuments(name);
    
    res.json({
      success: true,
      staffName: name,
      ...result
    });
  } catch (error) {
    console.error('❌ Error getting staff documents:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting staff documents',
      error: error.message
    });
  }
};

// Get documents for a specific client by name
exports.getClientDocuments = async (req, res) => {
  try {
    const { name } = req.params;
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Client name is required'
      });
    }

    console.log(`🔍 Getting documents for client: ${name}`);
    const result = await fileScanner.getClientDocuments(name);
    
    res.json({
      success: true,
      clientName: name,
      ...result
    });
  } catch (error) {
    console.error('❌ Error getting client documents:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting client documents',
      error: error.message
    });
  }
};

// Get all entities with documents (comprehensive scan)
exports.getAllEntitiesWithDocuments = async (req, res) => {
  try {
    console.log('🔍 Performing comprehensive scan of all entities...');
    
    const [trucks, drivers, helpers, staff, clients] = await Promise.all([
      fileScanner.getTrucksWithDocuments(),
      fileScanner.getDriversWithDocuments(),
      fileScanner.getHelpersWithDocuments(),
      fileScanner.getStaffWithDocuments(),
      fileScanner.getClientsWithDocuments()
    ]);
    
    const summary = {
      trucks: { count: trucks.length, data: trucks },
      drivers: { count: drivers.length, data: drivers },
      helpers: { count: helpers.length, data: helpers },
      staff: { count: staff.length, data: staff },
      clients: { count: clients.length, data: clients }
    };
    
    const totalEntities = Object.values(summary).reduce((sum, entity) => sum + entity.count, 0);
    
    console.log(`✅ Comprehensive scan complete. Found ${totalEntities} total entities with documents`);
    
    res.json({
      success: true,
      summary: summary,
      totalEntities: totalEntities,
      scanTimestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error performing comprehensive scan:', error);
    res.status(500).json({
      success: false,
      message: 'Error performing comprehensive scan',
      error: error.message
    });
  }
};

// Health check endpoint
exports.health = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Simple File Scanner is healthy',
      timestamp: new Date().toISOString(),
      basePath: fileScanner.basePath,
      basePathExists: require('fs').existsSync(fileScanner.basePath)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
};
