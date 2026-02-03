const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// Get all staffs
exports.getAllStaffs = async (req, res) => {
  try {
    const [staffs] = await pool.query(`
      SELECT s.*, u.username 
      FROM staffs s
      JOIN users u ON s.UserId = u.id
      ORDER BY s.StaffID DESC
    `);
    
    res.json(staffs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get staff by ID
exports.getStaffById = async (req, res) => {
  try {
    const [staffs] = await pool.query(`
      SELECT s.*, u.username 
      FROM staffs s
      JOIN users u ON s.UserId = u.id
      WHERE s.StaffID = ?
    `, [req.params.id]);
    
    if (staffs.length === 0) {
      return res.status(404).json({ message: 'Staff not found' });
    }
    
    res.json(staffs[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create staff
exports.createStaff = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const {
      StaffName,
      StaffAddress,
      StaffNumber,
      StaffDepartment,
      StaffEmploymentDate,
      StaffUserName,
      StaffPassword,
      StaffStatus
    } = req.body;
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(StaffPassword, salt);
    
    // Create user entry
    const [userResult] = await connection.query(`
      INSERT INTO users (username, password, role, status)
      VALUES (?, ?, 'staff', ?)
    `, [StaffUserName, hashedPassword, StaffStatus || 'active']);
    
    const userId = userResult.insertId;
    
    // Create staff entry
    const [staffResult] = await connection.query(`
      INSERT INTO staffs (
        UserId, 
        StaffName, 
        StaffAddress, 
        StaffNumber, 
        StaffDepartment, 
        StaffEmploymentDate, 
        StaffDocuments, 
        StaffUserName, 
        StaffPassword, 
        StaffStatus
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId,
      StaffName,
      StaffAddress,
      StaffNumber,
      StaffDepartment,
      StaffEmploymentDate,
      req.documentPath || null,
      StaffUserName,
      hashedPassword,
      StaffStatus || 'active'
    ]);
    
    await connection.commit();
    
    res.status(201).json({
      message: 'Staff created successfully',
      staffId: staffResult.insertId
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};

// Update staff
exports.updateStaff = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const {
      StaffName,
      StaffAddress,
      StaffNumber,
      StaffDepartment,
      StaffEmploymentDate,
      StaffStatus
    } = req.body;
    
    // Get staff record to find user ID
    const [staffs] = await connection.query('SELECT UserId FROM staffs WHERE StaffID = ?', [req.params.id]);
    
    if (staffs.length === 0) {
      return res.status(404).json({ message: 'Staff not found' });
    }
    
    const userId = staffs[0].UserId;
    
    // Update user status
    await connection.query('UPDATE users SET status = ? WHERE id = ?', [StaffStatus, userId]);
    
    // Update staff record
    await connection.query(`
      UPDATE staffs
      SET 
        StaffName = ?,
        StaffAddress = ?,
        StaffNumber = ?,
        StaffDepartment = ?,
        StaffEmploymentDate = ?,
        StaffDocuments = COALESCE(?, StaffDocuments),
        StaffStatus = ?
      WHERE StaffID = ?
    `, [
      StaffName,
      StaffAddress,
      StaffNumber,
      StaffDepartment,
      StaffEmploymentDate,
      req.documentPath || null,
      StaffStatus,
      req.params.id
    ]);
    
    await connection.commit();
    
    res.json({ message: 'Staff updated successfully' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};

// Delete staff
exports.deleteStaff = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Get staff record to find user ID
    const [staffs] = await connection.query('SELECT UserId FROM staffs WHERE StaffID = ?', [req.params.id]);
    
    if (staffs.length === 0) {
      return res.status(404).json({ message: 'Staff not found' });
    }
    
    const userId = staffs[0].UserId;
    
    // Delete staff record
    await connection.query('DELETE FROM staffs WHERE StaffID = ?', [req.params.id]);
    
    // Delete user record
    await connection.query('DELETE FROM users WHERE id = ?', [userId]);
    
    await connection.commit();
    
    res.json({ message: 'Staff deleted successfully' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};
// Get staff profile
exports.getStaffProfile = async (req, res) => {
  try {
    const [staffs] = await pool.query(`
      SELECT * FROM staffs WHERE UserId = ?
    `, [req.user.id]);
    
    if (staffs.length === 0) {
      return res.status(404).json({ message: 'Staff profile not found' });
    }
    
    // Remove sensitive information
    const staff = staffs[0];
    delete staff.StaffPassword;
    
    res.json(staff);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get dashboard statistics for staff
exports.getStaffStats = async (req, res) => {
  try {
    // Get count of clients
    const [clientsResult] = await pool.query('SELECT COUNT(*) as count FROM clients');
    
    // Get count of trucks
    const [trucksResult] = await pool.query('SELECT COUNT(*) as count FROM trucks');
    
    // Get count of deliveries
    const [deliveriesResult] = await pool.query('SELECT COUNT(*) as count FROM deliveries');
    
    // Get count of pending deliveries
    const [pendingDeliveriesResult] = await pool.query(
      "SELECT COUNT(*) as count FROM deliveries WHERE DeliveryStatus IN ('pending', 'in-progress')"
    );
    
    res.json({
      clients: clientsResult[0].count,
      trucks: trucksResult[0].count,
      deliveries: deliveriesResult[0].count,
      pendingDeliveries: pendingDeliveriesResult[0].count
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get recent clients
exports.getRecentClients = async (req, res) => {
  try {
    const [clients] = await pool.query(`
      SELECT * FROM clients
      ORDER BY ClientCreationDate DESC
      LIMIT 5
    `);
    
    res.json(clients);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Generate reports
exports.generateReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const reportType = req.params.type;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }
    
    let data = [];
    let summary = {};
    
    if (reportType === 'client') {
      // Client report
      const [clientsData] = await pool.query(`
        SELECT 
          c.ClientID,
          c.ClientName,
          COUNT(d.DeliveryID) as DeliveryCount,
          SUM(d.DeliveryDistance) as TotalDistance,
          SUM(d.DeliveryRate) as TotalRevenue
        FROM clients c
        LEFT JOIN deliveries d ON c.ClientID = d.ClientID AND d.DeliveryDate BETWEEN ? AND ?
        GROUP BY c.ClientID
        ORDER BY TotalRevenue DESC
      `, [startDate, endDate]);
      
      data = clientsData;
      
      // Calculate summary
      const [summaryData] = await pool.query(`
        SELECT 
          COUNT(DISTINCT d.ClientID) as activeClients,
          COUNT(d.DeliveryID) as totalDeliveries,
          SUM(d.DeliveryDistance) as totalDistance,
          SUM(d.DeliveryRate) as totalRevenue
        FROM deliveries d
        WHERE d.DeliveryDate BETWEEN ? AND ?
      `, [startDate, endDate]);
      
      summary = {
        activeClients: summaryData[0].activeClients || 0,
        totalDeliveries: summaryData[0].totalDeliveries || 0,
        totalDistance: summaryData[0].totalDistance || 0,
        totalRevenue: summaryData[0].totalRevenue || 0
      };
    } else if (reportType === 'delivery') {
      // Delivery report
      const [deliveriesData] = await pool.query(`
        SELECT 
          d.*,
          c.ClientName
        FROM deliveries d
        JOIN clients c ON d.ClientID = c.ClientID
        WHERE d.DeliveryDate BETWEEN ? AND ?
        ORDER BY d.DeliveryDate DESC
      `, [startDate, endDate]);
      
      data = deliveriesData;
      
      // Calculate summary
      const [summaryData] = await pool.query(`
        SELECT 
          COUNT(DeliveryID) as totalDeliveries,
          SUM(DeliveryDistance) as totalDistance,
          SUM(DeliveryRate) as totalRevenue
        FROM deliveries
        WHERE DeliveryDate BETWEEN ? AND ?
      `, [startDate, endDate]);
      
      summary = {
        totalDeliveries: summaryData[0].totalDeliveries || 0,
        totalDistance: summaryData[0].totalDistance || 0,
        totalRevenue: summaryData[0].totalRevenue || 0
      };
    } else if (reportType === 'truck') {
      // Truck utilization report
      const [trucksData] = await pool.query(`
        SELECT 
          t.TruckID,
          t.TruckPlate,
          t.TruckType,
          COUNT(d.DeliveryID) as DeliveryCount,
          SUM(d.DeliveryDistance) as TotalDistance,
          CASE 
            WHEN COUNT(d.DeliveryID) = 0 THEN 0
            ELSE ROUND((COUNT(d.DeliveryID) / (SELECT COUNT(*) FROM deliveries WHERE DeliveryDate BETWEEN ? AND ?)) * 100, 2)
          END as Utilization
        FROM trucks t
        LEFT JOIN deliveries d ON t.TruckID = d.TruckID AND d.DeliveryDate BETWEEN ? AND ?
        GROUP BY t.TruckID
        ORDER BY DeliveryCount DESC
      `, [startDate, endDate, startDate, endDate]);
      
      data = trucksData;
      
      // Calculate summary
      const [summaryData] = await pool.query(`
        SELECT 
          COUNT(DISTINCT TruckID) as totalTrucks,
          COUNT(DeliveryID) as totalDeliveries,
          SUM(DeliveryDistance) as totalDistance
        FROM deliveries
        WHERE DeliveryDate BETWEEN ? AND ?
      `, [startDate, endDate]);
      
      summary = {
        totalTrucks: summaryData[0].totalTrucks || 0,
        totalDeliveries: summaryData[0].totalDeliveries || 0,
        totalDistance: summaryData[0].totalDistance || 0
      };
    } else {
      return res.status(400).json({ message: 'Invalid report type' });
    }
    
    res.json({
      data,
      summary
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};