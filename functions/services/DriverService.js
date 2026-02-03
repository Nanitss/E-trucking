// Firebase Driver Service
const FirebaseService = require('./FirebaseService');
const { admin } = require('../config/firebase');
const bcrypt = require('bcryptjs');
const AuditService = require('./AuditService');
const fs = require('fs');
const path = require('path');

// Base path to project uploads folder
const DOCUMENTS_BASE_PATH = path.join(__dirname, '..', '..', '..', 'uploads');

class DriverService extends FirebaseService {
  constructor() {
    super('drivers');
    this.usersCollection = admin.firestore().collection('users');
  }

  // Scan file folders to get actual documents for a driver
  async scanDriverDocuments(driverId, driverUsername = null) {
    try {
      console.log(' Scanning documents for driver ID:', driverId, 'Username:', driverUsername);

      if (!driverId) {
        console.log(' No driver ID provided for document scanning');
        return {};
      }

      const documents = {};

      // Define document types and their folders
      const documentTypes = {
        licenseDocument: { folder: 'Licenses', prefix: 'LICENSE' },
        medicalCertificate: { folder: 'Medical-Certificates', prefix: 'MEDICAL' },
        idPhoto: { folder: 'ID-Photos', prefix: 'ID' },
        nbiClearance: { folder: 'NBI-Clearances', prefix: 'NBI' }
      };

      for (const [docType, config] of Object.entries(documentTypes)) {
        const folderPath = path.join(DOCUMENTS_BASE_PATH, 'Driver-Documents', config.folder);

        if (fs.existsSync(folderPath)) {
          try {
            const files = fs.readdirSync(folderPath);

            console.log(`📂 Scanning folder: ${config.folder}`);
            console.log(`📂 Total files in folder: ${files.length}`);
            console.log(`📂 Files:`, files);
            
            // Find files that contain this driver's ID OR username
            const matchingFiles = files.filter(file => {
              const hasCorrectType = file.includes(config.prefix);
              const matchesId = file.includes(`Driver${driverId}`);
              const matchesUsername = driverUsername && file.includes(`Driver${driverUsername}`);
              
              console.log(`  Checking: ${file}`);
              console.log(`    Has type (${config.prefix}): ${hasCorrectType}`);
              console.log(`    Matches ID (Driver${driverId}): ${matchesId}`);
              console.log(`    Matches Username (Driver${driverUsername}): ${matchesUsername}`);
              console.log(`    Final match: ${hasCorrectType && (matchesId || matchesUsername)}`);
              
              return hasCorrectType && (matchesId || matchesUsername);
            });
            
            console.log(`🔍 Found ${matchingFiles.length} matching files for ${docType}`);

            if (matchingFiles.length > 0) {
              // Get the most recent file if multiple exist
              const latestFile = matchingFiles.sort((a, b) => {
                const statsA = fs.statSync(path.join(folderPath, a));
                const statsB = fs.statSync(path.join(folderPath, b));
                return statsB.mtime.getTime() - statsA.mtime.getTime();
              })[0];

              const filePath = path.join(folderPath, latestFile);
              const stats = fs.statSync(filePath);

              documents[docType] = {
                filename: latestFile,
                originalName: latestFile,
                fullPath: filePath,
                relativePath: path.join('Driver-Documents', config.folder, latestFile),
                uploadDate: stats.birthtime.toISOString(),
                fileSize: stats.size,
                mimeType: this._getMimeType(latestFile),
                documentType: config.prefix,
                lastModified: stats.mtime.toISOString()
              };

              console.log(` Found ${docType}:`, latestFile);
            } else {
              console.log(` No ${docType} found for driver ${driverId} in ${config.folder}`);
            }
          } catch (error) {
            console.error(` Error reading folder ${config.folder}:`, error);
          }
        } else {
          console.log(` Folder doesn't exist: ${config.folder}`);
        }
      }

      console.log(` Document scan complete for driver ${driverId}:`, Object.keys(documents));
      return documents;
    } catch (error) {
      console.error(' Error scanning driver documents:', error);
      return {};
    }
  }

  // Helper method to determine MIME type from file extension
  _getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  // Create a new driver
  async createDriver(driverData) {
    try {
      // 1. Check if username already exists
      const snapshot = await this.usersCollection
        .where('username', '==', driverData.DriverUserName)
        .get();
      
      if (!snapshot.empty) {
        throw new Error('Username already exists');
      }

      // 2. Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(driverData.DriverPassword, salt);

      // 3. Create user in the users collection
      const userDoc = {
        username: driverData.DriverUserName,
        password: hashedPassword,
        role: 'driver',
        status: driverData.DriverStatus || 'active',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };

      const userRef = await this.usersCollection.add(userDoc);
      
      // 4. Process the employment date to ensure it's a valid timestamp or date string
      let employmentDate = driverData.DriverEmploymentDate;
      if (employmentDate && typeof employmentDate === 'string') {
        // If it's a date string, convert to Firestore timestamp
        const dateObj = new Date(employmentDate);
        if (!isNaN(dateObj.getTime())) {
          employmentDate = dateObj;
        } else {
          // If invalid date, set to null
          employmentDate = null;
        }
      }
      
      // 5. Create driver in drivers collection
      const driverDoc = {
        userId: userRef.id,
        DriverName: driverData.DriverName,
        DriverAddress: driverData.DriverAddress,
        DriverNumber: driverData.DriverNumber,
        DriverEmploymentDate: employmentDate,
        DriverDocuments: driverData.DriverDocuments || null,
        DriverUserName: driverData.DriverUserName,
        DriverStatus: driverData.DriverStatus || 'active',
        // License information
        licenseType: driverData.licenseType || 'non-professional', // 'professional' | 'non-professional'
        licenseNumber: driverData.licenseNumber || null,
        licenseExpiryDate: driverData.licenseExpiryDate ? new Date(driverData.licenseExpiryDate) : null,
        licenseRegistrationDate: driverData.licenseRegistrationDate ? new Date(driverData.licenseRegistrationDate) : null,
        // Emergency contact information
        emergencyContactName: driverData.emergencyContactName || null,
        emergencyContactPhone: driverData.emergencyContactPhone || null,
        emergencyContactRelationship: driverData.emergencyContactRelationship || null,
        // Qualification tracking
        qualifiedTruckTypes: this._calculateQualifiedTruckTypes(driverData.licenseType || 'non-professional'),
        totalDeliveries: 0, // Track experience
        totalKilometers: 0, // Track driving distance
        rating: 5.0, // Driver rating
        lastAssignment: null, // Last delivery assignment
        // Document storage
        documents: driverData.documents || {},
        // Document compliance tracking
        documentCompliance: {
          licenseDocument: driverData.documents?.licenseDocument ? 'complete' : 'missing',
          medicalCertificate: driverData.documents?.medicalCertificate ? 'complete' : 'missing',
          idPhoto: driverData.documents?.idPhoto ? 'complete' : 'missing',
          nbiClearance: driverData.documents?.nbiClearance ? 'complete' : 'optional',
          overallStatus: this._calculateDocumentCompliance(driverData.documents)
        },
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };

      const driverRef = await this.collection.add(driverDoc);
      const driverSnapshot = await driverRef.get();
      
      const createdDriver = { 
        id: driverSnapshot.id, 
        ...driverSnapshot.data() 
      };
      
      // Check and update license expiry status
      await this.checkAndUpdateLicenseExpiry(driverSnapshot.id);
      
      return createdDriver;
    } catch (error) {
      console.error('Error creating driver:', error);
      throw error;
    }
  }

  // Check and update license expiry status for a driver
  async checkAndUpdateLicenseExpiry(driverId) {
    try {
      const driverDoc = await this.collection.doc(driverId).get();
      if (!driverDoc.exists) return;
      
      const driver = driverDoc.data();
      const licenseExpiryDate = driver.licenseExpiryDate;
      
      if (!licenseExpiryDate) return; // No expiry date set
      
      // Convert to Date object if it's a Firestore Timestamp
      let expiryDate = licenseExpiryDate;
      if (typeof licenseExpiryDate.toDate === 'function') {
        expiryDate = licenseExpiryDate.toDate();
      } else if (!(expiryDate instanceof Date)) {
        expiryDate = new Date(licenseExpiryDate);
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to midnight for accurate date comparison
      
      const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
      
      console.log(`🔍 License expiry check for driver ${driverId}:`, {
        expiryDate: expiryDate.toISOString(),
        daysUntilExpiry,
        currentStatus: driver.DriverStatus
      });
      
      // If license expires within 30 days (1 month), update status to 'license-expiring'
      if (daysUntilExpiry <= 30 && daysUntilExpiry >= 0) {
        // Only update if status is not already 'license-expiring'
        if (driver.DriverStatus !== 'license-expiring') {
          console.log(`⚠️ License expiring soon for driver ${driverId}! Updating status to 'license-expiring'`);
          await this.collection.doc(driverId).update({
            DriverStatus: 'license-expiring',
            licenseExpiryWarning: true,
            licenseExpiryDaysRemaining: daysUntilExpiry,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      } else if (daysUntilExpiry < 0) {
        // License has already expired
        if (driver.DriverStatus !== 'license-expired') {
          console.log(`❌ License expired for driver ${driverId}! Updating status to 'license-expired'`);
          await this.collection.doc(driverId).update({
            DriverStatus: 'license-expired',
            licenseExpiryWarning: true,
            licenseExpiryDaysRemaining: daysUntilExpiry,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      } else {
        // License is valid (more than 30 days), clear warning if it was set
        if (driver.DriverStatus === 'license-expiring' || driver.DriverStatus === 'license-expired') {
          console.log(`✅ License valid for driver ${driverId}. Clearing expiry warning and restoring active status.`);
          await this.collection.doc(driverId).update({
            DriverStatus: 'active',
            licenseExpiryWarning: false,
            licenseExpiryDaysRemaining: daysUntilExpiry,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }
    } catch (error) {
      console.error('Error checking license expiry:', error);
      // Don't throw - this is a background check
    }
  }

  // Get all drivers
  async getAllDrivers() {
    try {
      const snapshot = await this.collection.orderBy('created_at', 'desc').get();
      const drivers = await Promise.all(snapshot.docs.map(async doc => {
        const data = doc.data();
        const driverId = doc.id;
        
        // Check and update license expiry status
        await this.checkAndUpdateLicenseExpiry(driverId);
        
        // Re-fetch to get updated status
        const updatedDoc = await this.collection.doc(driverId).get();
        const updatedData = updatedDoc.data();
        
        // Format the employment date for display
        if (updatedData.DriverEmploymentDate) {
          updatedData.DriverEmploymentDate = this.formatDate(updatedData.DriverEmploymentDate);
        }
        
        // Format license dates for display
        if (updatedData.licenseExpiryDate) {
          updatedData.licenseExpiryDate = this.formatDate(updatedData.licenseExpiryDate);
        }
        if (updatedData.licenseRegistrationDate) {
          updatedData.licenseRegistrationDate = this.formatDate(updatedData.licenseRegistrationDate);
        }
        
        return {
          DriverID: driverId,
          ...updatedData
        };
      }));
      
      return drivers;
    } catch (error) {
      console.error('Error getting all drivers:', error);
      throw error;
    }
  }

  // Override getById to add document scanning (called by admin controller)
  async getById(id) {
    try {
      console.log('🔍 ===== DRIVER DOCUMENT SCAN START (getById) =====');
      const doc = await this.collection.doc(id).get();
      
      if (!doc.exists) {
        throw new Error('Driver not found');
      }
      
      const driverData = doc.data();
      
      // Check and update license expiry status
      await this.checkAndUpdateLicenseExpiry(id);
      
      // Re-fetch to get updated status
      const updatedDoc = await this.collection.doc(id).get();
      const updatedData = updatedDoc.data();
      
      console.log('Driver ID:', id);
      console.log('Driver Name:', updatedData.DriverName);
      console.log('Driver Username:', updatedData.DriverUserName);
      console.log('Database documents:', JSON.stringify(updatedData.documents, null, 2));
      
      // Scan file system for actual documents (overrides database paths)
      // Pass both ID and username to find files
      const driverUsername = updatedData.DriverUserName || updatedData.DriverName;
      console.log('🔍 Calling scanDriverDocuments with ID:', id, 'Username:', driverUsername);
      
      const actualDocuments = await this.scanDriverDocuments(id, driverUsername);
      
      console.log('📦 Scan result - found', Object.keys(actualDocuments).length, 'documents');
      console.log('📦 Actual documents:', JSON.stringify(actualDocuments, null, 2));
      
      if (Object.keys(actualDocuments).length > 0) {
        console.log('✅ Overriding database documents with actual files from disk');
        updatedData.documents = actualDocuments;
        console.log('✅ New documents set:', JSON.stringify(updatedData.documents, null, 2));
      } else {
        console.log('⚠️ No documents found on disk for driver:', id, 'Username:', driverUsername);
        console.log('⚠️ Will use database documents (may be wrong)');
      }
      
      console.log('🔍 ===== DRIVER DOCUMENT SCAN END =====');
      
      // Format employment date for the frontend
      try {
        if (updatedData.DriverEmploymentDate) {
          updatedData.DriverEmploymentDate = this.formatDate(updatedData.DriverEmploymentDate);
        }
      } catch (error) {
        console.warn('⚠️ Error formatting employment date:', error);
        updatedData.DriverEmploymentDate = null;
      }
      
      // Format license dates for the frontend
      try {
        if (updatedData.licenseExpiryDate) {
          updatedData.licenseExpiryDate = this.formatDate(updatedData.licenseExpiryDate);
        }
        if (updatedData.licenseRegistrationDate) {
          updatedData.licenseRegistrationDate = this.formatDate(updatedData.licenseRegistrationDate);
        }
      } catch (error) {
        console.warn('⚠️ Error formatting license dates:', error);
      }
      
      // Format created_at and updated_at timestamps if they exist
      try {
        if (updatedData.created_at && typeof updatedData.created_at.toDate === 'function') {
          updatedData.created_at = updatedData.created_at.toDate();
        }
        
        if (updatedData.updated_at && typeof updatedData.updated_at.toDate === 'function') {
          updatedData.updated_at = updatedData.updated_at.toDate();
        }
      } catch (error) {
        console.warn('⚠️ Error formatting timestamps:', error);
      }
      
      return {
        DriverID: doc.id,
        ...updatedData
      };
    } catch (error) {
      console.error('Error getting driver by ID:', error);
      throw error;
    }
  }
  
  // Alias for compatibility
  async getDriverById(id) {
    return this.getById(id);
  }

  // Update driver
  async updateDriver(id, driverData) {
    try {
      console.log('🔥🔥🔥 ===== DRIVER UPDATE VERSION 2.0 START ===== 🔥🔥🔥');
      console.log('Driver ID:', id);
      console.log('Input data keys:', Object.keys(driverData));
      console.log('🚨🚨🚨 EMERGENCY CONTACT RAW DATA:', {
        name: driverData.emergencyContactName,
        phone: driverData.emergencyContactPhone,
        relationship: driverData.emergencyContactRelationship
      });
      console.log('Received data:', JSON.stringify(driverData, null, 2));
      console.log('Status field:', driverData.DriverStatus);
      
      // 1. Get the driver to get the userId
      const driverDoc = await this.collection.doc(id).get();
      
      if (!driverDoc.exists) {
        throw new Error('Driver not found');
      }
      
      const existingDriver = driverDoc.data();
      console.log('Existing driver status:', existingDriver.DriverStatus);
      const userId = existingDriver.userId;
      
      // 2. Check if username is being changed and is unique
      if (driverData.DriverUserName !== existingDriver.DriverUserName) {
        const snapshot = await this.usersCollection
          .where('username', '==', driverData.DriverUserName)
          .get();
        
        if (!snapshot.empty) {
          throw new Error('Username already exists');
        }
      }
      
      // 3. Update user (username and status only - password cannot be updated by admin)
      const userUpdateData = {
        username: driverData.DriverUserName,
        status: driverData.DriverStatus,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // Password updates are not allowed through admin interface for security
      // Users must change their own passwords through their account settings
      
      await this.usersCollection.doc(userId).update(userUpdateData);
      
      // 4. Process the employment date
      let employmentDate = driverData.DriverEmploymentDate;
      console.log('Original employment date:', employmentDate, typeof employmentDate);
      
      if (employmentDate) {
        if (typeof employmentDate === 'string') {
          // If it's a date string, convert to Date object
          const dateObj = new Date(employmentDate);
          console.log('Parsed date:', dateObj, 'isValid:', !isNaN(dateObj));
          
          if (!isNaN(dateObj.getTime())) {
            employmentDate = dateObj;
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
      
      // 5. Update driver
      const driverUpdateData = {
        DriverName: driverData.DriverName,
        DriverAddress: driverData.DriverAddress,
        DriverNumber: driverData.DriverNumber,
        DriverEmploymentDate: employmentDate,
        DriverUserName: driverData.DriverUserName,
        DriverStatus: driverData.DriverStatus,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // If documents path is provided, update it
      if (driverData.DriverDocuments) {
        driverUpdateData.DriverDocuments = driverData.DriverDocuments;
      }
      
      // Update license information if provided
      if (driverData.licenseType !== undefined) {
        driverUpdateData.licenseType = driverData.licenseType;
      }
      if (driverData.licenseNumber !== undefined) {
        driverUpdateData.licenseNumber = driverData.licenseNumber;
      }
      if (driverData.licenseExpiryDate !== undefined) {
        driverUpdateData.licenseExpiryDate = driverData.licenseExpiryDate ? new Date(driverData.licenseExpiryDate) : null;
      }
      if (driverData.licenseRegistrationDate !== undefined) {
        driverUpdateData.licenseRegistrationDate = driverData.licenseRegistrationDate ? new Date(driverData.licenseRegistrationDate) : null;
      }
      
      // Update emergency contact information if provided
      console.log('🚨 EMERGENCY CONTACT CHECK:', {
        name: driverData.emergencyContactName,
        phone: driverData.emergencyContactPhone,
        relationship: driverData.emergencyContactRelationship
      });
      if (driverData.emergencyContactName !== undefined) {
        console.log('✅ Setting emergencyContactName:', driverData.emergencyContactName);
        driverUpdateData.emergencyContactName = driverData.emergencyContactName;
      }
      if (driverData.emergencyContactPhone !== undefined) {
        console.log('✅ Setting emergencyContactPhone:', driverData.emergencyContactPhone);
        driverUpdateData.emergencyContactPhone = driverData.emergencyContactPhone;
      }
      if (driverData.emergencyContactRelationship !== undefined) {
        console.log('✅ Setting emergencyContactRelationship:', driverData.emergencyContactRelationship);
        driverUpdateData.emergencyContactRelationship = driverData.emergencyContactRelationship;
      }
      
      console.log('Final update data for Firestore:', JSON.stringify(driverUpdateData, null, 2));
      console.log('Status in final update:', driverUpdateData.DriverStatus);
      await this.collection.doc(id).update(driverUpdateData);
      
      // Verify what was actually saved
      const verifyDoc = await this.collection.doc(id).get();
      const verifyData = verifyDoc.data();
      console.log('🔍 VERIFY: Data in database after update:', {
        emergencyContactName: verifyData.emergencyContactName,
        emergencyContactPhone: verifyData.emergencyContactPhone,
        emergencyContactRelationship: verifyData.emergencyContactRelationship
      });
      
      // Check and update license expiry status after update
      await this.checkAndUpdateLicenseExpiry(id);
      
      console.log('=== UPDATE COMPLETED ===');
      return await this.getDriverById(id);
    } catch (error) {
      console.error('Error updating driver:', error);
      throw error;
    }
  }

  // Format date for display and storage
  formatDate(date) {
    if (!date) return null;
    
    try {
      // Handle Firestore timestamp
      if (typeof date.toDate === 'function') {
        date = date.toDate();
      }
      
      // Handle JavaScript Date object
      if (date instanceof Date) {
        if (isNaN(date.getTime())) {
          return null;
        }
        
        // Format as YYYY-MM-DD for form inputs and display
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      
      // Handle ISO string or other date formats
      if (typeof date === 'string') {
        const parsedDate = new Date(date);
        if (!isNaN(parsedDate.getTime())) {
          const year = parsedDate.getFullYear();
          const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
          const day = String(parsedDate.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error formatting date:', error, 'Original date:', date);
      return null;
    }
  }

  // Delete driver
  async deleteDriver(id) {
    try {
      // 1. Get the driver to find the userId
      const driverDoc = await this.collection.doc(id).get();
      
      if (!driverDoc.exists) {
        throw new Error('Driver not found');
      }
      
      const driverData = driverDoc.data();
      const userId = driverData.userId;
      
      // 2. Delete the driver and user (use a batch for atomicity)
      const batch = admin.firestore().batch();
      
      // Delete driver document
      const driverRef = this.collection.doc(id);
      batch.delete(driverRef);
      
      // Delete user document if it exists
      if (userId) {
        const userRef = this.usersCollection.doc(userId);
        batch.delete(userRef);
      }
      
      await batch.commit();
      
      return { id, deleted: true };
    } catch (error) {
      console.error('Error deleting driver:', error);
      throw error;
    }
  }

  // Get all active drivers
  async getActiveDrivers() {
    try {
      const snapshot = await this.collection.where('DriverStatus', '==', 'active').get();
      return snapshot.docs.map(doc => ({
        DriverID: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting active drivers:', error);
      throw error;
    }
  }

  // Get driver by user ID
  async getDriverByUserId(userId) {
    try {
      const snapshot = await this.collection.where('userId', '==', userId).limit(1).get();
      
      if (snapshot.empty) return null;
      
      const doc = snapshot.docs[0];
      return {
        DriverID: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error('Error getting driver by user ID:', error);
      throw error;
    }
  }

  // Update driver location (GPS tracking)
  async updateDriverLocation(driverId, locationData) {
    try {
      console.log(`📍 Updating location for driver ${driverId}:`, {
        lat: locationData.lat.toFixed(6),
        lng: locationData.lng.toFixed(6),
        speed: Math.round((locationData.speed || 0) * 3.6),
        accuracy: Math.round(locationData.accuracy || 0)
      });

      const updateData = {
        currentLocation: {
          lat: locationData.lat,
          lng: locationData.lng,
          accuracy: locationData.accuracy || 10,
          speed: locationData.speed || 0,
          heading: locationData.heading || 0,
          altitude: locationData.altitude || null,
          timestamp: locationData.timestamp || new Date().toISOString()
        },
        lastLocationUpdate: admin.firestore.FieldValue.serverTimestamp(),
        locationHistory: admin.firestore.FieldValue.arrayUnion({
          ...locationData,
          timestamp: locationData.timestamp || new Date().toISOString()
        }),
        isLocationActive: !locationData.isFinal,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };

      // Limit location history to last 50 entries to prevent document size issues
      const driverDoc = await this.collection.doc(driverId).get();
      if (driverDoc.exists) {
        const driverData = driverDoc.data();
        if (driverData.locationHistory && driverData.locationHistory.length > 50) {
          // Remove old entries, keeping only the latest 49 + the new one
          const recentHistory = driverData.locationHistory.slice(-49);
          updateData.locationHistory = [...recentHistory, {
            ...locationData,
            timestamp: locationData.timestamp || new Date().toISOString()
          }];
        }
      }

      await this.collection.doc(driverId).update(updateData);

      console.log(`✅ Driver ${driverId} location updated successfully`);
      
      return {
        success: true,
        message: 'Driver location updated successfully',
        location: locationData
      };
    } catch (error) {
      console.error('❌ Error updating driver location:', error);
      throw error;
    }
  }

  // Get driver's current location
  async getDriverLocation(driverId) {
    try {
      const driver = await this.getDriverById(driverId);
      
      if (!driver || !driver.currentLocation) {
        return null;
      }

      return {
        driverId: driverId,
        location: driver.currentLocation,
        lastUpdate: driver.lastLocationUpdate,
        isActive: driver.isLocationActive || false
      };
    } catch (error) {
      console.error('❌ Error getting driver location:', error);
      throw error;
    }
  }

  // Get location history for a driver
  async getDriverLocationHistory(driverId, limit = 20) {
    try {
      const driver = await this.getDriverById(driverId);
      
      if (!driver || !driver.locationHistory) {
        return [];
      }

      // Return the most recent entries
      return driver.locationHistory
        .slice(-limit)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
      console.error('❌ Error getting driver location history:', error);
      throw error;
    }
  }

  // Calculate document compliance status
  _calculateDocumentCompliance(documents) {
    if (!documents) return 'incomplete';
    
    const requiredDocs = ['licenseDocument', 'medicalCertificate', 'idPhoto'];
    const hasAllRequired = requiredDocs.every(doc => documents[doc]);
    
    if (hasAllRequired) {
      // Check for expiry dates
      const hasExpiredDocs = requiredDocs.some(doc => {
        const docData = documents[doc];
        if (docData && docData.expiryDate) {
          return new Date(docData.expiryDate) < new Date();
        }
        return false;
      });
      
      return hasExpiredDocs ? 'expired' : 'complete';
    }
    
    return 'incomplete';
  }

  // Get drivers with expiring documents
  async getDriversWithExpiringDocuments(daysAhead = 30) {
    try {
      const drivers = await this.getAllDrivers();
      const expiringDate = new Date();
      expiringDate.setDate(expiringDate.getDate() + daysAhead);

      return drivers.filter(driver => {
        if (!driver.documents) return false;

        const docTypes = ['licenseDocument', 'medicalCertificate', 'nbiClearance'];
        return docTypes.some(docType => {
          const doc = driver.documents[docType];
          if (doc && doc.expiryDate) {
            const expiry = new Date(doc.expiryDate);
            return expiry <= expiringDate && expiry > new Date();
          }
          return false;
        });
      });
    } catch (error) {
      console.error('Error getting drivers with expiring documents:', error);
      throw error;
    }
  }

  // Update driver documents
  async updateDriverDocuments(driverId, documents) {
    try {
      const updateData = {
        documents: documents,
        documentCompliance: {
          licenseDocument: documents?.licenseDocument ? 'complete' : 'missing',
          medicalCertificate: documents?.medicalCertificate ? 'complete' : 'missing',
          idPhoto: documents?.idPhoto ? 'complete' : 'missing',
          nbiClearance: documents?.nbiClearance ? 'complete' : 'optional',
          overallStatus: this._calculateDocumentCompliance(documents)
        },
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };

      return await this.update(driverId, updateData);
    } catch (error) {
      console.error('Error updating driver documents:', error);
      throw error;
    }
  }

  // Calculate qualified truck types based on license type
  _calculateQualifiedTruckTypes(licenseType) {
    if (licenseType === 'professional') {
      return ['mini truck', '4 wheeler', '6 wheeler', '8 wheeler', '10 wheeler'];
    } else {
      return ['mini truck']; // Non-professional can only drive mini trucks
    }
  }

  // Update driver statistics after delivery completion
  async updateDriverStats(driverId, deliveryData) {
    try {
      const updateData = {
        totalDeliveries: admin.firestore.FieldValue.increment(1),
        totalKilometers: admin.firestore.FieldValue.increment(deliveryData.distance || 0),
        lastAssignment: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };

      return await this.update(driverId, updateData);
    } catch (error) {
      console.error('Error updating driver stats:', error);
      throw error;
    }
  }

  // Get qualified drivers for specific truck type
  async getQualifiedDrivers(truckType) {
    try {
      const snapshot = await this.collection
        .where('driverStatus', '==', 'active')
        .where('qualifiedTruckTypes', 'array-contains', truckType)
        .where('documentCompliance.overallStatus', '==', 'complete')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting qualified drivers:', error);
      throw error;
    }
  }
}

module.exports = new DriverService(); 