const FirebaseService = require('./FirebaseService');
const bcrypt = require('bcryptjs');
const { admin } = require('../config/firebase');

class OperatorService extends FirebaseService {
  constructor() {
    super('operators');
    this.usersCollection = admin.firestore().collection('users');
  }

  // Create a new operator
  async createOperator(operatorData) {
    try {
      // 1. Check if username already exists
      const snapshot = await this.usersCollection
        .where('username', '==', operatorData.OperatorUserName)
        .get();
      
      if (!snapshot.empty) {
        throw new Error('Username already exists');
      }

      // 2. Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(operatorData.OperatorPassword, salt);

      // 3. Create user in the users collection
      const userDoc = {
        username: operatorData.OperatorUserName,
        password: hashedPassword,
        role: 'operator',
        status: operatorData.OperatorStatus || 'active',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };

      const userRef = await this.usersCollection.add(userDoc);
      
      // 4. Create operator in operators collection
      // Process the employment date to ensure it's a valid timestamp or date string
      let employmentDate = operatorData.OperatorEmploymentDate;
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
      
      const operatorDoc = {
        userId: userRef.id,
        OperatorName: operatorData.OperatorName,
        OperatorAddress: operatorData.OperatorAddress,
        OperatorNumber: operatorData.OperatorNumber,
        OperatorEmploymentDate: employmentDate,
        OperatorDocuments: operatorData.OperatorDocuments || null,
        OperatorUserName: operatorData.OperatorUserName,
        OperatorStatus: operatorData.OperatorStatus || 'active',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };

      const operatorRef = await this.collection.add(operatorDoc);
      const operatorSnapshot = await operatorRef.get();
      
      return { 
        id: operatorSnapshot.id, 
        ...operatorSnapshot.data() 
      };
    } catch (error) {
      console.error('Error creating operator:', error);
      throw error;
    }
  }

  // Get all operators
  async getAllOperators() {
    try {
      const snapshot = await this.collection.orderBy('created_at', 'desc').get();
      return snapshot.docs.map(doc => ({
        OperatorID: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting all operators:', error);
      throw error;
    }
  }

  // Get operator by ID
  async getOperatorById(id) {
    try {
      const doc = await this.collection.doc(id).get();
      
      if (!doc.exists) {
        throw new Error('Operator not found');
      }
      
      const operatorData = doc.data();
      
      // Convert any Firestore timestamps to JavaScript Dates for serialization
      // and format employment date for the frontend
      let formattedData = { ...operatorData };
      
      if (operatorData.OperatorEmploymentDate && 
          typeof operatorData.OperatorEmploymentDate.toDate === 'function') {
        // Convert Firestore timestamp to Date
        const date = operatorData.OperatorEmploymentDate.toDate();
        
        // Format date as YYYY-MM-DD for form inputs
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        formattedData.OperatorEmploymentDate = `${year}-${month}-${day}`;
      } else if (operatorData.OperatorEmploymentDate instanceof Date) {
        // Already a Date object
        const date = operatorData.OperatorEmploymentDate;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        formattedData.OperatorEmploymentDate = `${year}-${month}-${day}`;
      }
      
      // Format created_at and updated_at timestamps if they exist
      if (formattedData.created_at && typeof formattedData.created_at.toDate === 'function') {
        formattedData.created_at = formattedData.created_at.toDate();
      }
      
      if (formattedData.updated_at && typeof formattedData.updated_at.toDate === 'function') {
        formattedData.updated_at = formattedData.updated_at.toDate();
      }
      
      return {
        OperatorID: doc.id,
        ...formattedData
      };
    } catch (error) {
      console.error('Error getting operator by ID:', error);
      throw error;
    }
  }

  // Update operator
  async updateOperator(id, operatorData) {
    try {
      console.log('Updating operator with data:', operatorData);
      
      // 1. Get the operator to get the userId
      const operatorDoc = await this.collection.doc(id).get();
      
      if (!operatorDoc.exists) {
        throw new Error('Operator not found');
      }
      
      const existingOperator = operatorDoc.data();
      const userId = existingOperator.userId;
      
      // 2. Check if username is being changed and is unique
      if (operatorData.OperatorUserName !== existingOperator.OperatorUserName) {
        const snapshot = await this.usersCollection
          .where('username', '==', operatorData.OperatorUserName)
          .get();
        
        if (!snapshot.empty) {
          throw new Error('Username already exists');
        }
      }
      
      // 3. Update user
      const userUpdateData = {
        username: operatorData.OperatorUserName,
        status: operatorData.OperatorStatus,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // If password is provided, hash and update it
      if (operatorData.OperatorPassword && operatorData.OperatorPassword.trim()) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(operatorData.OperatorPassword, salt);
        userUpdateData.password = hashedPassword;
      }
      
      await this.usersCollection.doc(userId).update(userUpdateData);
      
      // 4. Process the employment date
      let employmentDate = operatorData.OperatorEmploymentDate;
      console.log('Original employment date:', employmentDate, typeof employmentDate);
      
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
        } else if (employmentDate._seconds && employmentDate._nanoseconds) {
          // Handle Firestore timestamp format
          employmentDate = new admin.firestore.Timestamp(
            employmentDate._seconds,
            employmentDate._nanoseconds
          ).toDate();
          console.log('Converted from Firestore timestamp format');
        } else {
          console.warn('Unrecognized date format:', employmentDate);
          employmentDate = null;
        }
      } else {
        console.log('No employment date provided');
        employmentDate = null;
      }
      
      console.log('Final employment date value:', employmentDate);
      
      // 5. Update operator
      const operatorUpdateData = {
        OperatorName: operatorData.OperatorName,
        OperatorAddress: operatorData.OperatorAddress,
        OperatorNumber: operatorData.OperatorNumber,
        OperatorEmploymentDate: employmentDate,
        OperatorUserName: operatorData.OperatorUserName,
        OperatorStatus: operatorData.OperatorStatus,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // If documents path is provided, update it
      if (operatorData.OperatorDocuments) {
        operatorUpdateData.OperatorDocuments = operatorData.OperatorDocuments;
      }
      
      console.log('Updating operator doc with data:', operatorUpdateData);
      await this.collection.doc(id).update(operatorUpdateData);
      
      return await this.getOperatorById(id);
    } catch (error) {
      console.error('Error updating operator:', error);
      throw error;
    }
  }

  // Delete operator
  async deleteOperator(id) {
    try {
      // 1. Get the operator to find the userId
      const operatorDoc = await this.collection.doc(id).get();
      
      if (!operatorDoc.exists) {
        throw new Error('Operator not found');
      }
      
      const operatorData = operatorDoc.data();
      const userId = operatorData.userId;
      
      // 2. Delete the operator and user (use a batch for atomicity)
      const batch = admin.firestore().batch();
      
      // Delete operator document
      const operatorRef = this.collection.doc(id);
      batch.delete(operatorRef);
      
      // Delete user document if it exists
      if (userId) {
        const userRef = this.usersCollection.doc(userId);
        batch.delete(userRef);
      }
      
      await batch.commit();
      
      return { id, deleted: true };
    } catch (error) {
      console.error('Error deleting operator:', error);
      throw error;
    }
  }
}

module.exports = new OperatorService(); 