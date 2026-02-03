const FirebaseService = require('./FirebaseService');
const bcrypt = require('bcryptjs');
const { admin } = require('../config/firebase');

class StaffService extends FirebaseService {
  constructor() {
    super('staffs');
    this.usersCollection = admin.firestore().collection('users');
    this.vehicleRatesCollection = admin.firestore().collection('vehicle_rates');
  }

  // ─── VEHICLE RATE MANAGEMENT METHODS ──────────────────────────────────────────

  // Get all vehicle rates
  async getVehicleRates() {
    try {
      const snapshot = await this.vehicleRatesCollection
        .orderBy('vehicleType', 'asc')
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting vehicle rates:', error);
      throw error;
    }
  }

  // Get vehicle rate by ID
  async getVehicleRateById(id) {
    try {
      const doc = await this.vehicleRatesCollection.doc(id).get();
      
      if (!doc.exists) {
        throw new Error('Vehicle rate not found');
      }
      
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error('Error getting vehicle rate by ID:', error);
      throw error;
    }
  }

  // Get vehicle rate by vehicle type
  async getVehicleRateByType(vehicleType) {
    try {
      const snapshot = await this.vehicleRatesCollection
        .where('vehicleType', '==', vehicleType)
        .limit(1)
        .get();
      
      if (snapshot.empty) {
        throw new Error('Vehicle rate not found');
      }
      
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error('Error getting vehicle rate by type:', error);
      throw error;
    }
  }

  // Create a new vehicle rate
  async createVehicleRate(rateData) {
    try {
      // Check if vehicle type already has a rate
      const existingSnapshot = await this.vehicleRatesCollection
        .where('vehicleType', '==', rateData.vehicleType)
        .get();
      
      if (!existingSnapshot.empty) {
        throw new Error('Vehicle type already has a rate configured');
      }

      // Create the rate document
      const rateDoc = {
        ...rateData,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };

      const rateRef = await this.vehicleRatesCollection.add(rateDoc);
      const rateSnapshot = await rateRef.get();
      
      return {
        id: rateSnapshot.id,
        ...rateSnapshot.data()
      };
    } catch (error) {
      console.error('Error creating vehicle rate:', error);
      throw error;
    }
  }

  // Update vehicle rate
  async updateVehicleRate(id, updateData) {
    try {
      // Get the current rate
      const currentDoc = await this.vehicleRatesCollection.doc(id).get();
      
      if (!currentDoc.exists) {
        throw new Error('Vehicle rate not found');
      }

      const currentData = currentDoc.data();

      // If vehicle type is changing, check if new type already exists
      if (updateData.vehicleType !== currentData.vehicleType) {
        const existingSnapshot = await this.vehicleRatesCollection
          .where('vehicleType', '==', updateData.vehicleType)
          .get();
        
        if (!existingSnapshot.empty) {
          throw new Error('Vehicle type already has a rate configured');
        }
      }

      // Update the document
      const updateDoc = {
        ...updateData,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };

      await this.vehicleRatesCollection.doc(id).update(updateDoc);
      
      // Return updated document
      const updatedDoc = await this.vehicleRatesCollection.doc(id).get();
      return {
        id: updatedDoc.id,
        ...updatedDoc.data()
      };
    } catch (error) {
      console.error('Error updating vehicle rate:', error);
      throw error;
    }
  }

  // Delete vehicle rate
  async deleteVehicleRate(id) {
    try {
      const doc = await this.vehicleRatesCollection.doc(id).get();
      
      if (!doc.exists) {
        throw new Error('Vehicle rate not found');
      }

      await this.vehicleRatesCollection.doc(id).delete();
      
      return true;
    } catch (error) {
      console.error('Error deleting vehicle rate:', error);
      throw error;
    }
  }

  // Calculate delivery cost based on vehicle type and distance
  async calculateDeliveryCost(vehicleType, distance, cargoWeight = 0) {
    try {
      const rate = await this.getVehicleRateByType(vehicleType);
      
      const baseRate = parseFloat(rate.baseRate) || 0;
      const ratePerKm = parseFloat(rate.ratePerKm) || 0;
      const kmCost = ratePerKm * distance;
      const totalCost = baseRate + kmCost;

      return {
        vehicleType,
        distance,
        cargoWeight,
        baseRate,
        ratePerKm,
        kmCost,
        totalCost
      };
    } catch (error) {
      console.error('Error calculating delivery cost:', error);
      throw error;
    }
  }

  // ─── DASHBOARD STATISTICS METHODS ─────────────────────────────────────────────

  // Get dashboard statistics
  async getDashboardStats() {
    try {
      const db = admin.firestore();
      
      // Get counts from different collections
      const [clientsSnapshot, trucksSnapshot, deliveriesSnapshot, pendingDeliveriesSnapshot] = await Promise.all([
        db.collection('clients').get(),
        db.collection('trucks').get(),
        db.collection('deliveries').get(),
        db.collection('deliveries').where('deliveryStatus', '==', 'pending').get()
      ]);

      return {
        clients: clientsSnapshot.size,
        trucks: trucksSnapshot.size,
        deliveries: deliveriesSnapshot.size,
        pendingDeliveries: pendingDeliveriesSnapshot.size
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      
      // Return sample data when Firebase is not configured
      return {
        clients: 15,
        trucks: 8,
        deliveries: 45,
        pendingDeliveries: 3
      };
    }
  }

  // Get recent clients (last 10)
  async getRecentClients() {
    try {
      const db = admin.firestore();
      
      const snapshot = await db.collection('clients')
        .orderBy('created_at', 'desc')
        .limit(10)
        .get();

      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ClientID: doc.id,
          ClientName: data.ClientName || data.clientName || 'N/A',
          ClientNumber: data.ClientNumber || data.clientNumber || data.phoneNumber || 'N/A',
          ClientEmail: data.ClientEmail || data.clientEmail || data.email || 'N/A',
          ClientCreationDate: data.created_at ? data.created_at.toDate().toISOString() : new Date().toISOString()
        };
      });
    } catch (error) {
      console.error('Error getting recent clients:', error);
      
      // Return sample data when Firebase is not configured
      return [
        {
          ClientID: '1',
          ClientName: 'ABC Logistics Corp',
          ClientNumber: '09123456789',
          ClientEmail: 'contact@abclogistics.com',
          ClientCreationDate: new Date(Date.now() - 86400000 * 2).toISOString() // 2 days ago
        },
        {
          ClientID: '2',
          ClientName: 'Metro Shipping Inc',
          ClientNumber: '09234567890',
          ClientEmail: 'info@metroshipping.com',
          ClientCreationDate: new Date(Date.now() - 86400000 * 5).toISOString() // 5 days ago
        },
        {
          ClientID: '3',
          ClientName: 'Global Transport Solutions',
          ClientNumber: '09345678901',
          ClientEmail: 'admin@globaltransport.com',
          ClientCreationDate: new Date(Date.now() - 86400000 * 7).toISOString() // 1 week ago
        }
      ];
    }
  }

  // Get staff profile by user ID
  async getStaffProfile(userId) {
    try {
      const db = admin.firestore();
      
      // First get user info
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        throw new Error('User not found');
      }
      
      const userData = userDoc.data();
      
      // Then get staff info
      const staffSnapshot = await db.collection('staffs')
        .where('StaffUserName', '==', userData.username)
        .limit(1)
        .get();
      
      if (staffSnapshot.empty) {
        // Return basic user info if no staff record found
        return {
          StaffName: userData.username,
          StaffDepartment: 'Customer Service',
          StaffStatus: userData.status || 'Active',
          StaffEmploymentDate: userData.created_at ? userData.created_at.toDate().toISOString() : new Date().toISOString()
        };
      }
      
      const staffData = staffSnapshot.docs[0].data();
      return {
        StaffName: staffData.StaffName || userData.username,
        StaffDepartment: staffData.StaffDepartment || 'Customer Service',
        StaffStatus: staffData.StaffStatus || userData.status || 'Active',
        StaffEmploymentDate: staffData.StaffEmploymentDate || (userData.created_at ? userData.created_at.toDate().toISOString() : new Date().toISOString())
      };
    } catch (error) {
      console.error('Error getting staff profile:', error);
      
      // Return sample profile when Firebase is not configured
      return {
        StaffName: 'Staff Member',
        StaffDepartment: 'Customer Service',
        StaffStatus: 'Active',
        StaffEmploymentDate: new Date().toISOString()
      };
    }
  }

  // ─── EXISTING STAFF MANAGEMENT METHODS ─────────────────────────────────────────

  // Create a new staff member
  async createStaff(staffData) {
    try {
      // 1. Check if username already exists
      const snapshot = await this.usersCollection
        .where('username', '==', staffData.StaffUserName)
        .get();
      
      if (!snapshot.empty) {
        throw new Error('Username already exists');
      }

      // 2. Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(staffData.StaffPassword, salt);

      // 3. Create user in the users collection
      const userDoc = {
        username: staffData.StaffUserName,
        password: hashedPassword,
        role: 'staff',
        status: staffData.StaffStatus || 'active',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };

      const userRef = await this.usersCollection.add(userDoc);
      
      // 4. Process the employment date to ensure it's a valid timestamp or date string
      let employmentDate = staffData.StaffEmploymentDate;
      if (employmentDate) {
        if (typeof employmentDate === 'string') {
          // If it's a date string, convert to Date object
          const dateObj = new Date(employmentDate);
          console.log('Parsed date:', dateObj, 'isValid:', !isNaN(dateObj.getTime()));
          
          if (!isNaN(dateObj.getTime())) {
            // Store as YYYY-MM-DD string with NO time component
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            employmentDate = `${year}-${month}-${day}`;
          } else {
            console.warn('Invalid date string format:', employmentDate);
            employmentDate = null;
          }
        } else if (employmentDate instanceof Date) {
          // Keep it as is
          console.log('Date is already a Date object');
        } else {
          console.warn('Unrecognized date format:', employmentDate);
          employmentDate = null;
        }
      } else {
        console.log('No employment date provided');
        employmentDate = null;
      }
      
      // 5. Create staff member in staffs collection
      const staffDoc = {
        userId: userRef.id,
        StaffName: staffData.StaffName,
        StaffAddress: staffData.StaffAddress,
        StaffNumber: staffData.StaffNumber,
        StaffDepartment: staffData.StaffDepartment, 
        StaffEmploymentDate: employmentDate,
        StaffDocuments: staffData.StaffDocuments || null,
        StaffUserName: staffData.StaffUserName,
        StaffStatus: staffData.StaffStatus || 'active',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };

      const staffRef = await this.collection.add(staffDoc);
      const staffSnapshot = await staffRef.get();
      
      return { 
        id: staffSnapshot.id, 
        ...staffSnapshot.data() 
      };
    } catch (error) {
      console.error('Error creating staff:', error);
      throw error;
    }
  }

  // Get all staff members
  async getAllStaff() {
    try {
      const snapshot = await this.collection.orderBy('created_at', 'desc').get();
      return snapshot.docs.map(doc => ({
        StaffID: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting all staff:', error);
      throw error;
    }
  }

  // Get staff by ID
  async getStaffById(id) {
    try {
      const doc = await this.collection.doc(id).get();
      
      if (!doc.exists) {
        throw new Error('Staff not found');
      }
      
      const staffData = doc.data();
      
      // Convert any Firestore timestamps to JavaScript Dates for serialization
      // and format employment date for the frontend
      let formattedData = { ...staffData };
      
      if (staffData.StaffEmploymentDate && 
          typeof staffData.StaffEmploymentDate.toDate === 'function') {
        // Convert Firestore timestamp to Date
        const date = staffData.StaffEmploymentDate.toDate();
        
        // Format date as YYYY-MM-DD for form inputs
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        formattedData.StaffEmploymentDate = `${year}-${month}-${day}`;
      } else if (staffData.StaffEmploymentDate instanceof Date) {
        // Already a Date object
        const date = staffData.StaffEmploymentDate;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        formattedData.StaffEmploymentDate = `${year}-${month}-${day}`;
      }
      
      // Format created_at and updated_at timestamps if they exist
      if (formattedData.created_at && typeof formattedData.created_at.toDate === 'function') {
        formattedData.created_at = formattedData.created_at.toDate();
      }
      
      if (formattedData.updated_at && typeof formattedData.updated_at.toDate === 'function') {
        formattedData.updated_at = formattedData.updated_at.toDate();
      }
      
      return {
        StaffID: doc.id,
        ...formattedData
      };
    } catch (error) {
      console.error('Error getting staff by ID:', error);
      throw error;
    }
  }

  // Update staff
  async updateStaff(id, staffData) {
    try {
      console.log('Updating staff with data:', staffData);
      
      // 1. Get the staff member to get the userId
      const staffDoc = await this.collection.doc(id).get();
      
      if (!staffDoc.exists) {
        throw new Error('Staff not found');
      }
      
      const existingStaff = staffDoc.data();
      const userId = existingStaff.userId;
      
      // 2. Check if username is being changed and is unique
      if (staffData.StaffUserName !== existingStaff.StaffUserName) {
        const snapshot = await this.usersCollection
          .where('username', '==', staffData.StaffUserName)
          .get();
        
        if (!snapshot.empty) {
          throw new Error('Username already exists');
        }
      }
      
      // 3. Update user
      const userUpdateData = {
        username: staffData.StaffUserName,
        status: staffData.StaffStatus,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // If password is provided, hash and update it
      if (staffData.StaffPassword && staffData.StaffPassword.trim()) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(staffData.StaffPassword, salt);
        userUpdateData.password = hashedPassword;
      }
      
      await this.usersCollection.doc(userId).update(userUpdateData);
      
      // 4. Process employment date
      let employmentDate = staffData.StaffEmploymentDate;
      if (employmentDate && typeof employmentDate === 'string') {
        const dateObj = new Date(employmentDate);
        if (!isNaN(dateObj.getTime())) {
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getDate()).padStart(2, '0');
          employmentDate = `${year}-${month}-${day}`;
        } else {
          employmentDate = null;
        }
      }
      
      // 5. Update staff member
      const staffUpdateData = {
        StaffName: staffData.StaffName,
        StaffAddress: staffData.StaffAddress,
        StaffNumber: staffData.StaffNumber,
        StaffDepartment: staffData.StaffDepartment,
        StaffEmploymentDate: employmentDate,
        StaffDocuments: staffData.StaffDocuments,
        StaffUserName: staffData.StaffUserName,
        StaffStatus: staffData.StaffStatus,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };
      
      await this.collection.doc(id).update(staffUpdateData);
      
      // Return updated staff
      return await this.getStaffById(id);
    } catch (error) {
      console.error('Error updating staff:', error);
      throw error;
    }
  }

  // Delete staff
  async deleteStaff(id) {
    try {
      // 1. Get the staff member to get the userId
      const staffDoc = await this.collection.doc(id).get();
      
      if (!staffDoc.exists) {
        throw new Error('Staff not found');
      }
      
      const staffData = staffDoc.data();
      const userId = staffData.userId;
      
      // 2. Delete from users collection
      if (userId) {
        await this.usersCollection.doc(userId).delete();
      }
      
      // 3. Delete from staffs collection
      await this.collection.doc(id).delete();
      
      return true;
    } catch (error) {
      console.error('Error deleting staff:', error);
      throw error;
    }
  }
}

module.exports = new StaffService(); 