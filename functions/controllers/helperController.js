const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// Get all helpers
exports.getAllHelpers = async (req, res) => {
  try {
    const [helpers] = await pool.query(`
      SELECT h.*, u.username 
      FROM helpers h
      JOIN users u ON h.UserId = u.id
      ORDER BY h.HelperID DESC
    `);
    
    res.json(helpers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get helper by ID
exports.getHelperById = async (req, res) => {
  try {
    const [helpers] = await pool.query(`
      SELECT h.*, u.username 
      FROM helpers h
      JOIN users u ON h.UserId = u.id
      WHERE h.HelperID = ?
    `, [req.params.id]);
    
    if (helpers.length === 0) {
      return res.status(404).json({ message: 'Helper not found' });
    }
    
    res.json(helpers[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create helper
exports.createHelper = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const {
      HelperName,
      HelperAddress,
      HelperNumber,
      HelperEmploymentDate,
      HelperUserName,
      HelperPassword,
      HelperStatus
    } = req.body;
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(HelperPassword, salt);
    
    // Create user entry
    const [userResult] = await connection.query(`
      INSERT INTO users (username, password, role, status)
      VALUES (?, ?, 'helper', ?)
    `, [HelperUserName, hashedPassword, HelperStatus || 'active']);
    
    const userId = userResult.insertId;
    
    // Create helper entry
    const [helperResult] = await connection.query(`
      INSERT INTO helpers (
        UserId, 
        HelperName, 
        HelperAddress, 
        HelperNumber, 
        HelperEmploymentDate, 
        HelperDocuments, 
        HelperUserName, 
        HelperPassword, 
        HelperStatus
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId,
      HelperName,
      HelperAddress,
      HelperNumber,
      HelperEmploymentDate,
      req.documentPath || null,
      HelperUserName,
      hashedPassword,
      HelperStatus || 'active'
    ]);
    
    await connection.commit();
    
    res.status(201).json({
      message: 'Helper created successfully',
      helperId: helperResult.insertId
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};

// Update helper
exports.updateHelper = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const {
      HelperName,
      HelperAddress,
      HelperNumber,
      HelperEmploymentDate,
      HelperStatus
    } = req.body;
    
    // Get helper record to find user ID
    const [helpers] = await connection.query('SELECT UserId FROM helpers WHERE HelperID = ?', [req.params.id]);
    
    if (helpers.length === 0) {
      return res.status(404).json({ message: 'Helper not found' });
    }
    
    const userId = helpers[0].UserId;
    
    // Update user status
    await connection.query('UPDATE users SET status = ? WHERE id = ?', [HelperStatus, userId]);
    
    // Update helper record
    await connection.query(`
      UPDATE helpers
      SET 
        HelperName = ?,
        HelperAddress = ?,
        HelperNumber = ?,
        HelperEmploymentDate = ?,
        HelperDocuments = COALESCE(?, HelperDocuments),
        HelperStatus = ?
      WHERE HelperID = ?
    `, [
      HelperName,
      HelperAddress,
      HelperNumber,
      HelperEmploymentDate,
      req.documentPath || null,
      HelperStatus,
      req.params.id
    ]);
    
    await connection.commit();
    
    res.json({ message: 'Helper updated successfully' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};

// Delete helper
exports.deleteHelper = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Get helper record to find user ID
    const [helpers] = await connection.query('SELECT UserId, HelperName FROM helpers WHERE HelperID = ?', [req.params.id]);
    
    if (helpers.length === 0) {
      return res.status(404).json({ message: 'Helper not found' });
    }
    
    const userId = helpers[0].UserId;
    const helperName = helpers[0].HelperName;
    
    // Check if helper is assigned to any active delivery
    const [deliveries] = await connection.query(
      'SELECT * FROM deliveries WHERE HelperName = ? AND DeliveryStatus IN ("pending", "in-progress")',
      [helperName]
    );
    
    if (deliveries.length > 0) {
      return res.status(400).json({ message: 'Cannot delete helper that is currently assigned to an active delivery' });
    }
    
    // Delete helper record
    await connection.query('DELETE FROM helpers WHERE HelperID = ?', [req.params.id]);
    
    // Delete user record
    await connection.query('DELETE FROM users WHERE id = ?', [userId]);
    
    await connection.commit();
    
    res.json({ message: 'Helper deleted successfully' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};
// Get helper profile
exports.getHelperProfile = async (req, res) => {
  try {
    const [helpers] = await pool.query(`
      SELECT * FROM helpers WHERE UserId = ?
    `, [req.user.id]);
    
    if (helpers.length === 0) {
      return res.status(404).json({ message: 'Helper profile not found' });
    }
    
    // Remove sensitive information
    const helper = helpers[0];
    delete helper.HelperPassword;
    
    res.json(helper);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get helper's deliveries
exports.getHelperDeliveries = async (req, res) => {
  try {
    const [helpers] = await pool.query('SELECT HelperName FROM helpers WHERE UserId = ?', [req.user.id]);
    
    if (helpers.length === 0) {
      return res.status(404).json({ message: 'Helper not found' });
    }
    
    const helperName = helpers[0].HelperName;
    
    const [deliveries] = await pool.query(`
      SELECT d.*, c.ClientName, t.TruckPlate, t.TruckType
      FROM deliveries d
      JOIN clients c ON d.ClientID = c.ClientID
      JOIN trucks t ON d.TruckID = t.TruckID
      WHERE d.HelperName = ?
      ORDER BY d.DeliveryDate DESC
    `, [helperName]);
    
    res.json(deliveries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};