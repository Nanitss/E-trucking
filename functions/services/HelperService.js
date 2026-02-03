const FirebaseService = require('./FirebaseService');
const bcrypt = require('bcryptjs');
const { admin } = require('../config/firebase');

class HelperService extends FirebaseService {
  constructor() {
    super('helpers');
    this.usersCollection = admin.firestore().collection('users');
  }

  // Create a new helper
  async createHelper(helperData) {
    try {
      console.log('📝 Creating helper with data:', helperData);
      
      // Map frontend field names to backend format
      const mappedData = {
        HelperName: helperData.name || helperData.HelperName,
        HelperAddress: helperData.address || helperData.HelperAddress,
        HelperNumber: helperData.contactNumber || helperData.HelperNumber,
        HelperEmploymentDate: helperData.dateHired || helperData.HelperEmploymentDate,
        HelperStatus: helperData.status || helperData.HelperStatus || 'active',
        HelperUserName: helperData.HelperUserName || `helper_${Date.now()}`,
        HelperPassword: helperData.HelperPassword || 'defaultPassword123',
        documents: helperData.documents || {},
        emergencyContact: helperData.emergencyContact,
        emergencyContactNumber: helperData.emergencyContactNumber,
        licenseType: helperData.licenseType || 'non-professional',
        licenseNumber: helperData.licenseNumber,
        licenseExpiryDate: helperData.licenseExpiryDate
      };
      
      // 1. Check if username already exists
      const snapshot = await this.usersCollection
        .where('username', '==', mappedData.HelperUserName)
        .get();
      
      if (!snapshot.empty) {
        throw new Error('Username already exists');
      }

      // 2. Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(mappedData.HelperPassword, salt);

      // 3. Create user in the users collection
      const userDoc = {
        username: mappedData.HelperUserName,
        password: hashedPassword,
        role: 'helper',
        status: mappedData.HelperStatus,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };

      const userRef = await this.usersCollection.add(userDoc);
      
      // 4. Create helper in helpers collection
      // Process the employment date to ensure it's a valid timestamp or date string
      let employmentDate = mappedData.HelperEmploymentDate;
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
      
      const helperDoc = {
        userId: userRef.id,
        HelperName: mappedData.HelperName,
        HelperAddress: mappedData.HelperAddress,
        HelperNumber: mappedData.HelperNumber,
        HelperEmploymentDate: employmentDate,
        HelperUserName: mappedData.HelperUserName,
        HelperStatus: mappedData.HelperStatus,
        // Additional helper information
        emergencyContact: mappedData.emergencyContact,
        emergencyContactNumber: mappedData.emergencyContactNumber,
        licenseType: mappedData.licenseType,
        licenseNumber: mappedData.licenseNumber,
        licenseExpiryDate: mappedData.licenseExpiryDate,
        // Helper qualification information
        helperLevel: mappedData.licenseType === 'professional' ? 'standard' : 'basic',
        certifications: ['valid-id'],
        // Qualification tracking
        qualifiedTruckTypes: this._calculateQualifiedTruckTypes(mappedData.licenseType === 'professional' ? 'standard' : 'basic'),
        totalAssignments: 0,
        rating: 5.0,
        lastAssignment: null,
        // Document storage
        documents: mappedData.documents || {},
        // Document compliance tracking
        documentCompliance: {
          validId: mappedData.documents?.validId ? 'complete' : 'missing',
          barangayClearance: mappedData.documents?.barangayClearance ? 'complete' : 'missing',
          medicalCertificate: mappedData.documents?.medicalCertificate ? 'complete' : 'optional',
          overallStatus: this._calculateDocumentCompliance(mappedData.documents, mappedData.licenseType === 'professional' ? 'standard' : 'basic'),
          // Document counts for UI display
          documentCount: Object.keys(mappedData.documents || {}).length,
          requiredDocumentCount: [
            mappedData.documents?.validId,
            mappedData.documents?.barangayClearance
          ].filter(Boolean).length,
          optionalDocumentCount: [
            mappedData.documents?.medicalCertificate,
            mappedData.documents?.helperLicense
          ].filter(Boolean).length
        },
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };
      
      console.log('✅ Helper document prepared with documents:', Object.keys(mappedData.documents || {}));

      const helperRef = await this.collection.add(helperDoc);
      const helperSnapshot = await helperRef.get();
      
      return { 
        id: helperSnapshot.id, 
        ...helperSnapshot.data() 
      };
    } catch (error) {
      console.error('Error creating helper:', error);
      throw error;
    }
  }

  // Helper method to calculate document counts for a helper
  _calculateDocumentCounts(helper) {
    const documents = helper.documents || {};
    const documentCount = Object.keys(documents).length;
    const requiredDocumentCount = [
      documents.validId,
      documents.barangayClearance
    ].filter(Boolean).length;
    const optionalDocumentCount = [
      documents.medicalCertificate,
      documents.helperLicense
    ].filter(Boolean).length;

    return {
      ...helper.documentCompliance,
      documentCount,
      requiredDocumentCount,
      optionalDocumentCount
    };
  }

  // Get all helpers
  async getAllHelpers() {
    try {
      const snapshot = await this.collection.orderBy('created_at', 'desc').get();
      return snapshot.docs.map(doc => {
        const helperData = doc.data();
        return {
          HelperID: doc.id,
          ...helperData,
          // Recalculate document counts on the fly for existing helpers
          documentCompliance: this._calculateDocumentCounts(helperData)
        };
      });
    } catch (error) {
      console.error('Error getting all helpers:', error);
      throw error;
    }
  }

  // Get helper by ID
  async getHelperById(id) {
    try {
      const doc = await this.collection.doc(id).get();
      
      if (!doc.exists) {
        throw new Error('Helper not found');
      }
      
      const helperData = doc.data();
      
      // Convert any Firestore timestamps to JavaScript Dates for serialization
      // and format employment date for the frontend
      let formattedData = { ...helperData };
      
      if (helperData.HelperEmploymentDate && 
          typeof helperData.HelperEmploymentDate.toDate === 'function') {
        // Convert Firestore timestamp to Date
        const date = helperData.HelperEmploymentDate.toDate();
        
        // Format date as YYYY-MM-DD for form inputs
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        formattedData.HelperEmploymentDate = `${year}-${month}-${day}`;
      } else if (helperData.HelperEmploymentDate instanceof Date) {
        // Already a Date object
        const date = helperData.HelperEmploymentDate;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        formattedData.HelperEmploymentDate = `${year}-${month}-${day}`;
      }
      
      // Format created_at and updated_at timestamps if they exist
      if (formattedData.created_at && typeof formattedData.created_at.toDate === 'function') {
        formattedData.created_at = formattedData.created_at.toDate();
      }
      
      if (formattedData.updated_at && typeof formattedData.updated_at.toDate === 'function') {
        formattedData.updated_at = formattedData.updated_at.toDate();
      }
      
      return {
        HelperID: doc.id,
        ...formattedData,
        // Recalculate document counts on the fly for existing helpers
        documentCompliance: this._calculateDocumentCounts(formattedData)
      };
    } catch (error) {
      console.error('Error getting helper by ID:', error);
      throw error;
    }
  }

  // Update helper
  async updateHelper(id, helperData) {
    try {
      console.log('=== HELPER UPDATE DEBUG ===');
      console.log('Helper ID:', id);
      console.log('Received data:', helperData);
      
      // 1. Get the helper to get the userId
      const helperDoc = await this.collection.doc(id).get();
      
      if (!helperDoc.exists) {
        throw new Error('Helper not found');
      }
      
      const existingHelper = helperDoc.data();
      const userId = existingHelper.userId;
      
      // Map frontend field names to backend format
      const mappedData = {
        HelperName: helperData.name || helperData.HelperName,
        HelperAddress: helperData.address || helperData.HelperAddress,
        HelperNumber: helperData.contactNumber || helperData.HelperNumber,
        HelperEmploymentDate: helperData.dateHired || helperData.HelperEmploymentDate,
        HelperStatus: helperData.status || helperData.HelperStatus,
        HelperUserName: helperData.HelperUserName || existingHelper.HelperUserName,
        HelperPassword: helperData.HelperPassword,
        emergencyContact: helperData.emergencyContact,
        emergencyContactNumber: helperData.emergencyContactNumber,
        licenseType: helperData.licenseType,
        licenseNumber: helperData.licenseNumber,
        licenseExpiryDate: helperData.licenseExpiryDate
      };
      
      console.log('Mapped data:', mappedData);
      console.log('New documents:', helperData.newDocuments);
      
      // Merge new documents with existing documents
      const updatedDocuments = {
        ...(existingHelper.documents || {}),
        ...(helperData.newDocuments || {})
      };
      
      console.log('Updated documents:', Object.keys(updatedDocuments));
      
      // 2. Check if username changed and ensure it's unique
      if (mappedData.HelperUserName !== existingHelper.HelperUserName) {
        const snapshot = await this.usersCollection
          .where('username', '==', mappedData.HelperUserName)
          .get();
        
        if (!snapshot.empty) {
          throw new Error('Username already exists');
        }
      }
      
      // 3. Update user (username and status only - password cannot be updated by admin)
      const userUpdateData = {
        username: mappedData.HelperUserName,
        status: mappedData.HelperStatus,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // Password updates are not allowed through admin interface for security
      // Users must change their own passwords through their account settings
      
      await this.usersCollection.doc(userId).update(userUpdateData);
      
      // 4. Process the employment date
      let employmentDate = mappedData.HelperEmploymentDate;
      if (employmentDate && typeof employmentDate === 'string') {
        const dateObj = new Date(employmentDate);
        if (!isNaN(dateObj.getTime())) {
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getDate()).padStart(2, '0');
          employmentDate = `${year}-${month}-${day}`;
        }
      }
      
      // 5. Update helper
      const helperUpdateData = {
        HelperName: mappedData.HelperName,
        HelperAddress: mappedData.HelperAddress,
        HelperNumber: mappedData.HelperNumber,
        HelperEmploymentDate: employmentDate,
        HelperUserName: mappedData.HelperUserName,
        HelperStatus: mappedData.HelperStatus,
        emergencyContact: mappedData.emergencyContact,
        emergencyContactNumber: mappedData.emergencyContactNumber,
        licenseType: mappedData.licenseType,
        licenseNumber: mappedData.licenseNumber,
        licenseExpiryDate: mappedData.licenseExpiryDate,
        documents: updatedDocuments,
        documentCompliance: {
          validId: updatedDocuments.validId ? 'complete' : 'missing',
          barangayClearance: updatedDocuments.barangayClearance ? 'complete' : 'missing',
          medicalCertificate: updatedDocuments.medicalCertificate ? 'complete' : 'optional',
          overallStatus: this._calculateDocumentCompliance(updatedDocuments, mappedData.licenseType === 'professional' ? 'standard' : 'basic'),
          // Document counts for UI display
          documentCount: Object.keys(updatedDocuments || {}).length,
          requiredDocumentCount: [
            updatedDocuments.validId,
            updatedDocuments.barangayClearance
          ].filter(Boolean).length,
          optionalDocumentCount: [
            updatedDocuments.medicalCertificate,
            updatedDocuments.helperLicense
          ].filter(Boolean).length
        },
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };
      
      console.log('Final update data for Firestore:', JSON.stringify(helperUpdateData, null, 2));
      console.log('Status in final update:', helperUpdateData.HelperStatus);
      await this.collection.doc(id).update(helperUpdateData);
      
      console.log('=== UPDATE COMPLETED ===');
      return await this.getHelperById(id);
    } catch (error) {
      console.error('Error updating helper:', error);
      throw error;
    }
  }

  // Delete helper
  async deleteHelper(id) {
    try {
      // 1. Get the helper to find the userId
      const helperDoc = await this.collection.doc(id).get();
      
      if (!helperDoc.exists) {
        throw new Error('Helper not found');
      }
      
      const helperData = helperDoc.data();
      const userId = helperData.userId;
      
      // 2. Delete the helper and user (use a batch for atomicity)
      const batch = admin.firestore().batch();
      
      // Delete helper document
      const helperRef = this.collection.doc(id);
      batch.delete(helperRef);
      
      // Delete user document if it exists
      if (userId) {
        const userRef = this.usersCollection.doc(userId);
        batch.delete(userRef);
      }
      
      await batch.commit();
      
      return { id, deleted: true };
    } catch (error) {
      console.error('Error deleting helper:', error);
      throw error;
    }
  }

  // Calculate qualified truck types based on helper level
  _calculateQualifiedTruckTypes(helperLevel) {
    switch (helperLevel) {
      case 'advanced':
        return ['mini truck', '4 wheeler', '6 wheeler', '8 wheeler', '10 wheeler'];
      case 'standard':
        return ['mini truck', '4 wheeler', '6 wheeler'];
      case 'basic':
      default:
        return ['mini truck', '4 wheeler'];
    }
  }

  // Calculate document compliance based on helper level
  _calculateDocumentCompliance(documents, helperLevel) {
    if (!documents) return 'incomplete';

    const hasValidId = documents.validId;
    const hasBarangayClearance = documents.barangayClearance;
    const hasMedicalCertificate = documents.medicalCertificate;

    // Basic requirements for all helpers
    if (!hasValidId || !hasBarangayClearance) {
      return 'incomplete';
    }

    // Advanced helpers need medical certificate for higher truck types
    if (helperLevel === 'advanced' && !hasMedicalCertificate) {
      return 'incomplete';
    }

    return 'complete';
  }

  // Update helper statistics after delivery completion
  async updateHelperStats(helperId, deliveryData) {
    try {
      const updateData = {
        totalAssignments: admin.firestore.FieldValue.increment(1),
        lastAssignment: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };

      return await this.update(helperId, updateData);
    } catch (error) {
      console.error('Error updating helper stats:', error);
      throw error;
    }
  }

  // Get qualified helpers for specific truck type
  async getQualifiedHelpers(truckType, limit = 10) {
    try {
      const snapshot = await this.collection
        .where('helperStatus', '==', 'active')
        .where('qualifiedTruckTypes', 'array-contains', truckType)
        .where('documentCompliance.overallStatus', '==', 'complete')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting qualified helpers:', error);
      throw error;
    }
  }
  
  // Alias method for compatibility with serveDocument function
  async getById(id) {
    return await this.getHelperById(id);
  }
}

module.exports = new HelperService(); 