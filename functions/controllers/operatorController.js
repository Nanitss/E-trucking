const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// Get all operators
exports.getAllOperators = async (req, res) => {
  try {
    const [operators] = await pool.query(`
      SELECT o.*, u.username 
      FROM operators o
      JOIN users u ON o.UserId = u.id
      ORDER BY o.OperatorID DESC
    `);
    
    res.json(operators);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get operator by ID
exports.getOperatorById = async (req, res) => {
  try {
    const [operators] = await pool.query(`
      SELECT o.*, u.username 
      FROM operators o
      JOIN users u ON o.UserId = u.id
      WHERE o.OperatorID = ?
    `, [req.params.id]);
    
    if (operators.length === 0) {
      return res.status(404).json({ message: 'Operator not found' });
    }
    
    res.json(operators[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create operator
exports.createOperator = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const {
      OperatorName,
      OperatorAddress,
      OperatorNumber,
      OperatorEmploymentDate,
      OperatorUserName,
      OperatorPassword,
      OperatorStatus
    } = req.body;
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(OperatorPassword, salt);
    
    // Create user entry
    const [userResult] = await connection.query(`
      INSERT INTO users (username, password, role, status)
      VALUES (?, ?, 'operator', ?)
    `, [OperatorUserName, hashedPassword, OperatorStatus || 'active']);
    
    const userId = userResult.insertId;
    
    // Create operator entry
    const [operatorResult] = await connection.query(`
      INSERT INTO operators (
        UserId, 
        OperatorName, 
        OperatorAddress, 
        OperatorNumber, 
        OperatorEmploymentDate, 
        OperatorDocuments, 
        OperatorUserName, 
        OperatorPassword, 
        OperatorStatus
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId,
      OperatorName,
      OperatorAddress,
      OperatorNumber,
      OperatorEmploymentDate,
      req.documentPath || null,
      OperatorUserName,
      hashedPassword,
      OperatorStatus || 'active'
    ]);
    
    await connection.commit();
    
    res.status(201).json({
      message: 'Operator created successfully',
      operatorId: operatorResult.insertId
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};

// Update operator
exports.updateOperator = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const {
      OperatorName,
      OperatorAddress,
      OperatorNumber,
      OperatorEmploymentDate,
      OperatorStatus
    } = req.body;
    
    // Get operator record to find user ID
    const [operators] = await connection.query('SELECT UserId FROM operators WHERE OperatorID = ?', [req.params.id]);
    
    if (operators.length === 0) {
      return res.status(404).json({ message: 'Operator not found' });
    }
    
    const userId = operators[0].UserId;
    
    // Update user status
    await connection.query('UPDATE users SET status = ? WHERE id = ?', [OperatorStatus, userId]);
    
    // Update operator record
    await connection.query(`
      UPDATE operators
      SET 
        OperatorName = ?,
        OperatorAddress = ?,
        OperatorNumber = ?,
        OperatorEmploymentDate = ?,
        OperatorDocuments = COALESCE(?, OperatorDocuments),
        OperatorStatus = ?
      WHERE OperatorID = ?
    `, [
      OperatorName,
      OperatorAddress,
      OperatorNumber,
      OperatorEmploymentDate,
      req.documentPath || null,
      OperatorStatus,
      req.params.id
    ]);
    
    await connection.commit();
    
    res.json({ message: 'Operator updated successfully' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};

// Delete operator
exports.deleteOperator = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Get operator record to find user ID
    const [operators] = await connection.query('SELECT UserId FROM operators WHERE OperatorID = ?', [req.params.id]);
    
    if (operators.length === 0) {
      return res.status(404).json({ message: 'Operator not found' });
    }
    
    const userId = operators[0].UserId;
    
    // Delete operator record
    await connection.query('DELETE FROM operators WHERE OperatorID = ?', [req.params.id]);
    
    // Delete user record
    await connection.query('DELETE FROM users WHERE id = ?', [userId]);
    
    await connection.commit();
    
    res.json({ message: 'Operator deleted successfully' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};
// Get operator profile
exports.getOperatorProfile = async (req, res) => {
  try {
    const [operators] = await pool.query(`
      SELECT * FROM operators WHERE UserId = ?
    `, [req.user.id]);
    
    if (operators.length === 0) {
      return res.status(404).json({ message: 'Operator profile not found' });
    }
    
    // Remove sensitive information
    const operator = operators[0];
    delete operator.OperatorPassword;
    
    res.json(operator);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get active deliveries for operator
exports.getOperatorDeliveries = async (req, res) => {
  try {
    const [deliveries] = await pool.query(`
      SELECT d.*, c.ClientName, t.TruckPlate, t.TruckType
      FROM deliveries d
      JOIN clients c ON d.ClientID = c.ClientID
      JOIN trucks t ON d.TruckID = t.TruckID
      WHERE d.DeliveryStatus IN ('pending', 'in-progress')
      ORDER BY d.DeliveryDate ASC
    `);
    
    res.json(deliveries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get pending deliveries
exports.getPendingDeliveries = async (req, res) => {
  try {
    const [deliveries] = await pool.query(`
      SELECT d.*, c.ClientName, t.TruckPlate, t.TruckType
      FROM deliveries d
      JOIN clients c ON d.ClientID = c.ClientID
      JOIN trucks t ON d.TruckID = t.TruckID
      WHERE d.DeliveryStatus = 'pending'
      ORDER BY d.DeliveryDate ASC
    `);
    
    res.json(deliveries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get available drivers for assignment
exports.getAvailableDrivers = async (req, res) => {
  try {
    const [drivers] = await pool.query(`
      SELECT * FROM drivers 
      WHERE DriverStatus = 'active'
      ORDER BY DriverName ASC
    `);
    
    res.json(drivers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get available helpers for assignment
exports.getAvailableHelpers = async (req, res) => {
  try {
    const [helpers] = await pool.query(`
      SELECT * FROM helpers 
      WHERE HelperStatus = 'active'
      ORDER BY HelperName ASC
    `);
    
    res.json(helpers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get statistics for operator dashboard
exports.getOperatorStats = async (req, res) => {
  try {
    // Get count of active deliveries
    const [activeDeliveriesResult] = await pool.query(`
      SELECT COUNT(*) as count FROM deliveries 
      WHERE DeliveryStatus IN ('pending', 'in-progress')
    `);
    
    // Get count of available trucks
    const [trucksResult] = await pool.query(`
      SELECT COUNT(*) as count FROM trucks 
      WHERE TruckStatus = 'available'
    `);
    
    // Get count of active clients
    const [clientsResult] = await pool.query(`
      SELECT COUNT(*) as count FROM clients 
      WHERE ClientStatus = 'active'
    `);
    
    // Get count of available drivers
    const [driversResult] = await pool.query(`
      SELECT COUNT(*) as count FROM drivers 
      WHERE DriverStatus = 'active'
    `);
    
    res.json({
      activeDeliveries: activeDeliveriesResult[0].count,
      trucks: trucksResult[0].count,
      clients: clientsResult[0].count,
      drivers: driversResult[0].count
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};