// Firebase Truck Service
const FirebaseService = require('./FirebaseService');
const { admin } = require('../config/firebase');
const { db } = require('../config/firebase');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Base path to project uploads folder - go up from services to server, then to client, then to project root
// Current file: trucking-web-app/client/server/services/TruckService.js
// Target: trucking-web-app/uploads/
const DOCUMENTS_BASE_PATH = path.join(__dirname, '..', '..', '..', 'uploads');

class TruckService extends FirebaseService {
  constructor() {
    super('trucks');
  }

  // Scan file folders to get actual documents for a truck
  async scanTruckDocuments(truckPlate) {
    try {
      console.log('🔍 Scanning documents for truck:', truckPlate);
      
      if (!truckPlate) {
        console.log('❌ No truck plate provided for document scanning');
        return {};
      }

      const cleanPlate = truckPlate.replace(/[^a-zA-Z0-9]/g, '');
      const documents = {};
      
      // Define document types and their folders
      const documentTypes = {
        orDocument: { folder: 'OR-CR-Files', prefix: 'OR' },
        crDocument: { folder: 'OR-CR-Files', prefix: 'CR' },
        insuranceDocument: { folder: 'Insurance-Papers', prefix: 'INSURANCE' },
        licenseRequirement: { folder: 'License-Documents', prefix: 'LICENSE-REQ' }
      };

      for (const [docType, config] of Object.entries(documentTypes)) {
        const folderPath = path.join(DOCUMENTS_BASE_PATH, 'Truck-Documents', config.folder);
        
        if (fs.existsSync(folderPath)) {
          try {
            const files = fs.readdirSync(folderPath);
            
            // Find files that start with this truck's plate number
            const matchingFiles = files.filter(file => {
              // Check if filename starts with the clean plate number and contains the prefix
              return file.startsWith(cleanPlate + '_') && file.includes(config.prefix);
            });

            if (matchingFiles.length > 0) {
              // Get the most recent file if multiple exist
              const latestFile = matchingFiles.sort((a, b) => {
                const statsA = fs.statSync(path.join(folderPath, a));
                const statsB = fs.statSync(path.join(folderPath, b));
                return statsB.mtime.getTime() - statsA.mtime.getTime();
              })[0];

              const filePath = path.join(folderPath, latestFile);
              const stats = fs.statSync(filePath);
              
              // Extract original filename and upload date from filename if timestamped
              const originalName = this._extractOriginalFilename(latestFile);
              const uploadDate = this._extractUploadDate(latestFile, stats.mtime);
              
              documents[docType] = {
                filename: latestFile,
                originalName: originalName,
                fullPath: filePath,
                relativePath: path.join(config.folder, latestFile),
                uploadDate: uploadDate,
                fileSize: stats.size,
                mimeType: this._getMimeType(latestFile),
                documentType: config.prefix,
                lastModified: stats.mtime.toISOString()
              };
              
              console.log(`✅ Found ${docType}:`, latestFile);
            } else {
              console.log(`📁 No ${docType} found for truck ${cleanPlate} in ${config.folder}`);
            }
          } catch (error) {
            console.error(`❌ Error reading folder ${config.folder}:`, error);
          }
        } else {
          console.log(`📁 Folder doesn't exist: ${config.folder}`);
        }
      }

      console.log(`🔍 Document scan complete for ${truckPlate}:`, Object.keys(documents));
      return documents;
    } catch (error) {
      console.error('❌ Error scanning truck documents:', error);
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
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  // Extract original filename from timestamped filename
  _extractOriginalFilename(filename) {
    // If filename has timestamp pattern like "OR_ABC123_20241201_123456.pdf"
    // Extract the original name part
    const timestampPattern = /^[A-Z]+_[A-Z0-9]+_(\d{8})_(\d{6})\./;
    const match = filename.match(timestampPattern);
    
    if (match) {
      // Remove timestamp and prefix, keep original name
      const withoutTimestamp = filename.replace(timestampPattern, '');
      return withoutTimestamp || filename;
    }
    
    return filename;
  }

  // Extract upload date from filename or use file stats
  _extractUploadDate(filename, fileStats) {
    // Try to extract date from timestamped filename
    const timestampPattern = /^[A-Z]+_[A-Z0-9]+_(\d{8})_(\d{6})\./;
    const match = filename.match(timestampPattern);
    
    if (match) {
      const dateStr = match[1]; // YYYYMMDD
      const timeStr = match[2]; // HHMMSS
      
      try {
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        const hour = timeStr.substring(0, 2);
        const minute = timeStr.substring(2, 4);
        const second = timeStr.substring(4, 6);
        
        const uploadDate = new Date(year, month - 1, day, hour, minute, second);
        return uploadDate.toISOString();
      } catch (error) {
        console.log('Could not parse date from filename, using file stats');
      }
    }
    
    // Fallback to file modification time
    return fileStats.mtime.toISOString();
  }

  // Verify that database documents actually exist in file system
  async verifyTruckDocuments(databaseDocuments) {
    try {
      console.log('🔍 Verifying database documents against file system...');
      const verifiedDocuments = {};
      
      for (const [docType, document] of Object.entries(databaseDocuments)) {
        if (!document || !document.fullPath) {
          console.log(`📁 No document data for ${docType}`);
          continue;
        }
        
        // Check if file actually exists
        if (fs.existsSync(document.fullPath)) {
          const stats = fs.statSync(document.fullPath);
          
          // Update file stats if they've changed
          verifiedDocuments[docType] = {
            ...document,
            fileSize: stats.size,
            lastModified: stats.mtime.toISOString(),
            // Keep original metadata from database
            originalName: document.originalName || document.filename,
            uploadDate: document.uploadDate || stats.mtime.toISOString()
          };
          
          console.log(`✅ Verified ${docType}:`, document.filename);
        } else {
          console.log(`❌ File not found for ${docType}:`, document.fullPath);
          // Don't include missing files in verified documents
        }
      }
      
      console.log(`🔍 Document verification complete:`, Object.keys(verifiedDocuments));
      return verifiedDocuments;
    } catch (error) {
      console.error('❌ Error verifying truck documents:', error);
      return {};
    }
  }

  // Check and update registration expiry status for a truck
  async checkAndUpdateRegistrationExpiry(truckId) {
    try {
      const truckDoc = await this.collection.doc(truckId).get();
      if (!truckDoc.exists) return;
      
      const truck = truckDoc.data();
      const registrationExpiryDate = truck.registrationExpiryDate;
      
      if (!registrationExpiryDate) return; // No expiry date set
      
      // Convert to Date object if it's a Firestore Timestamp
      let expiryDate = registrationExpiryDate;
      if (typeof registrationExpiryDate.toDate === 'function') {
        expiryDate = registrationExpiryDate.toDate();
      } else if (!(expiryDate instanceof Date)) {
        expiryDate = new Date(registrationExpiryDate);
      }
      
      // Validate the date
      if (isNaN(expiryDate.getTime())) {
        console.error(`❌ Invalid registration expiry date for truck ${truckId}:`, registrationExpiryDate);
        return; // Skip if date is invalid
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to midnight for accurate date comparison
      expiryDate.setHours(0, 0, 0, 0); // Also normalize expiry date time
      
      const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
      
      console.log(`🔍 Registration expiry check for truck ${truckId}:`, {
        expiryDate: expiryDate.toISOString(),
        daysUntilExpiry,
        currentStatus: truck.operationalStatus
      });
      
      // If registration expires within 30 days or has expired, block from operations
      if (daysUntilExpiry <= 30 && daysUntilExpiry >= 0) {
        // Registration expiring soon - block allocation/booking
        console.log(`⚠️ Registration expiring soon for truck ${truckId}! Days remaining: ${daysUntilExpiry}`);
        
        const updateData = {
          operationalStatus: 'registration-expiring',
          registrationExpiryWarning: true,
          registrationExpiryDaysRemaining: daysUntilExpiry,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        };
        
        // Always update days remaining, even if status hasn't changed
        await this.collection.doc(truckId).update(updateData);
        
      } else if (daysUntilExpiry < 0) {
        // Registration has expired - block all operations
        console.log(`❌ Registration expired for truck ${truckId}! Days past expiry: ${Math.abs(daysUntilExpiry)}`);
        
        const updateData = {
          operationalStatus: 'registration-expired',
          registrationExpiryWarning: true,
          registrationExpiryDaysRemaining: daysUntilExpiry,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        };
        
        // Always update days remaining, even if status hasn't changed
        await this.collection.doc(truckId).update(updateData);
        
      } else {
        // Registration is valid (more than 30 days), clear warning if needed
        console.log(`✅ Registration valid for truck ${truckId}. Days remaining: ${daysUntilExpiry}`);
        
        const updateData = {
          registrationExpiryWarning: false,
          registrationExpiryDaysRemaining: daysUntilExpiry,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        };
        
        // Only change status to active if it was previously expiring/expired
        if (truck.operationalStatus === 'registration-expiring' || 
            truck.operationalStatus === 'registration-expired') {
          updateData.operationalStatus = 'active';
        }
        
        // Always update days remaining
        await this.collection.doc(truckId).update(updateData);
      }
    } catch (error) {
      console.error('Error checking registration expiry:', error);
      // Don't throw - this is a background check
    }
  }

  // Helper method to format Firestore Timestamp to ISO string
  _formatFirestoreDate(firestoreDate) {
    if (!firestoreDate) return null;
    try {
      if (typeof firestoreDate.toDate === 'function') {
        return firestoreDate.toDate().toISOString();
      }
      if (firestoreDate instanceof Date) {
        return firestoreDate.toISOString();
      }
      return firestoreDate;
    } catch (error) {
      console.error('Error formatting date:', error);
      return null;
    }
  }

  // Get trucks with actual documents from file system
  async getTrucksWithActualDocuments() {
    try {
      console.log('🔍 Getting trucks with actual documents from file system...');
      
      const snapshot = await this.collection.get();
      const trucks = this._formatDocs(snapshot);
      
      // Enhance each truck with actual documents from file system
      const enhancedTrucks = [];
      
      for (const truck of trucks) {
        try {
          // Check and update registration expiry status
          await this.checkAndUpdateRegistrationExpiry(truck.id);
          
          // Scan for actual documents
          const actualDocuments = await this.scanTruckDocuments(truck.truckPlate);
          
          // Calculate document compliance based on actual files
          const documentCount = this._getDocumentCount(actualDocuments);
          const requiredDocumentCount = this._getRequiredDocumentCount(actualDocuments);
          const optionalDocumentCount = this._getOptionalDocumentCount(actualDocuments);
          
          // Re-fetch truck to get updated registration status
          const updatedTruckDoc = await this.collection.doc(truck.id).get();
          const updatedTruck = updatedTruckDoc.exists ? { id: truck.id, ...updatedTruckDoc.data() } : truck;
          
          // Format registration dates for frontend
          const registrationDate = this._formatFirestoreDate(updatedTruck.registrationDate);
          const registrationExpiryDate = this._formatFirestoreDate(updatedTruck.registrationExpiryDate);
          
          console.log(`📊 Truck ${updatedTruck.truckPlate}: Status=${updatedTruck.operationalStatus}, Warning=${updatedTruck.registrationExpiryWarning}, Days=${updatedTruck.registrationExpiryDaysRemaining}`);
          
          const enhancedTruck = {
            ...updatedTruck,
            // Format registration dates properly
            registrationDate,
            registrationExpiryDate,
            documents: actualDocuments, // Use actual documents from file system
            isAvailable: updatedTruck.allocationStatus === 'available' && updatedTruck.operationalStatus === 'active',
            isAllocated: updatedTruck.allocationStatus === 'allocated' || updatedTruck.truckStatus === 'allocated' || updatedTruck.truckStatus === 'active',
            isReadyForDelivery: updatedTruck.truckStatus === 'active',
            isInUse: updatedTruck.truckStatus === 'on-delivery' || updatedTruck.truckStatus === 'in-transit',
            needsMaintenance: updatedTruck.operationalStatus === 'maintenance',
            statusSummary: this._getStatusSummary(updatedTruck),
            documentCompliance: {
              orDocument: actualDocuments.orDocument ? 'complete' : 'missing',
              crDocument: actualDocuments.crDocument ? 'complete' : 'missing',
              insuranceDocument: actualDocuments.insuranceDocument ? 'complete' : 'missing',
              licenseRequirement: actualDocuments.licenseRequirement ? 'complete' : 'optional',
              overallStatus: this._calculateDocumentCompliance(actualDocuments),
              documentCount: documentCount,
              requiredDocumentCount: requiredDocumentCount,
              optionalDocumentCount: optionalDocumentCount
            }
          };
          
          enhancedTrucks.push(enhancedTruck);
          
        } catch (error) {
          console.error(`❌ Error enhancing truck ${truck.truckPlate}:`, error);
          // Add truck with basic info if enhancement fails
          enhancedTrucks.push({
            ...truck,
            documents: {},
            documentCompliance: {
              orDocument: 'missing',
              crDocument: 'missing',
              insuranceDocument: 'missing',
              licenseRequirement: 'optional',
              overallStatus: 'incomplete',
              documentCount: 0,
              requiredDocumentCount: 0,
              optionalDocumentCount: 0
            }
          });
        }
      }
      
      console.log(`✅ Enhanced ${enhancedTrucks.length} trucks with actual documents`);
      return enhancedTrucks;
      
    } catch (error) {
      console.error('❌ Error getting trucks with actual documents:', error);
      throw error;
    }
  }

  // Get available trucks (only truly available, not allocated to clients)
  async getAvailableTrucks() {
    try {
      const snapshot = await this.collection.where('truckStatus', '==', 'available').get();
      return this._formatDocs(snapshot);
    } catch (error) {
      console.error('Error getting available trucks:', error);
      throw error;
    }
  }

  // Get allocated trucks (including active status for client trucks)
  async getAllocatedTrucks() {
    try {
      const snapshot = await this.collection.where('truckStatus', 'in', ['allocated', 'active']).get();
      return this._formatDocs(snapshot);
    } catch (error) {
      console.error('Error getting allocated trucks:', error);
      throw error;
    }
  }

  // Get client trucks that are ready for booking (active status)
  async getClientReadyTrucks() {
    try {
      const snapshot = await this.collection.where('truckStatus', '==', 'active').get();
      return this._formatDocs(snapshot);
    } catch (error) {
      console.error('Error getting client ready trucks:', error);
      throw error;
    }
  }

  // Get trucks by status
  async getTrucksByStatus(status) {
    try {
      const snapshot = await this.collection.where('truckStatus', '==', status).get();
      return this._formatDocs(snapshot);
    } catch (error) {
      console.error('Error getting trucks by status:', error);
      throw error;
    }
  }

  // Get trucks by allocation status
  async getTrucksByAllocationStatus(allocationStatus) {
    try {
      const snapshot = await this.collection.where('allocationStatus', '==', allocationStatus).get();
      return this._formatDocs(snapshot);
    } catch (error) {
      console.error('Error getting trucks by allocation status:', error);
      throw error;
    }
  }

  // Get active trucks (available or allocated but not in maintenance)
  async getActiveTrucks() {
    try {
      const snapshot = await this.collection
        .where('operationalStatus', 'in', ['active', 'standby'])
        .get();
      return this._formatDocs(snapshot);
    } catch (error) {
      console.error('Error getting active trucks:', error);
      throw error;
    }
  }

  // Get trucks in maintenance
  async getMaintenanceTrucks() {
    try {
      const snapshot = await this.collection.where('operationalStatus', '==', 'maintenance').get();
      return this._formatDocs(snapshot);
    } catch (error) {
      console.error('Error getting maintenance trucks:', error);
      throw error;
    }
  }

  // Update truck status with enhanced tracking
  async updateTruckStatus(id, statusData) {
    try {
      const updateData = {
        ...statusData,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        lastStatusChange: admin.firestore.FieldValue.serverTimestamp()
      };

      return await this.update(id, updateData);
    } catch (error) {
      console.error('Error updating truck status:', error);
      throw error;
    }
  }

  // Update truck allocation status
  async updateAllocationStatus(id, allocationStatus, additionalData = {}) {
    try {
      const updateData = {
        allocationStatus,
        ...additionalData,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        lastAllocationChange: admin.firestore.FieldValue.serverTimestamp()
      };

      return await this.update(id, updateData);
    } catch (error) {
      console.error('Error updating truck allocation status:', error);
      throw error;
    }
  }

  // Get trucks by type
  async getTrucksByType(type) {
    try {
      const snapshot = await this.collection.where('truckType', '==', type).get();
      return this._formatDocs(snapshot);
    } catch (error) {
      console.error('Error getting trucks by type:', error);
      throw error;
    }
  }

  // Get trucks with detailed status information
  async getTrucksWithDetailedStatus() {
    try {
      const snapshot = await this.collection.get();
      const trucks = this._formatDocs(snapshot);
      
      // Enhance each truck with computed status information
      return trucks.map(truck => {
        // Ensure documents field is present
        const documents = truck.documents || {};
        
        // Ensure documentCompliance is properly initialized with actual data
        const documentCompliance = truck.documentCompliance || {
          orDocument: documents.orDocument ? 'complete' : 'optional',
          crDocument: documents.crDocument ? 'complete' : 'optional',
          insuranceDocument: documents.insuranceDocument ? 'complete' : 'optional',
          licenseRequirement: documents.licenseRequirement ? 'complete' : 'optional',
          overallStatus: 'optional',
          documentCount: this._getDocumentCount(documents),
          requiredDocumentCount: this._getRequiredDocumentCount(documents),
          optionalDocumentCount: this._getOptionalDocumentCount(documents)
        };
        
        return {
          ...truck,
          documents: documents, // Ensure documents are included
          isAvailable: truck.allocationStatus === 'available' && truck.operationalStatus === 'active',
          isAllocated: truck.allocationStatus === 'allocated' || truck.truckStatus === 'allocated' || truck.truckStatus === 'active',
          isReadyForDelivery: truck.truckStatus === 'active',
          isInUse: truck.truckStatus === 'on-delivery' || truck.truckStatus === 'in-transit',
          needsMaintenance: truck.operationalStatus === 'maintenance',
          statusSummary: this._getStatusSummary(truck),
          documentCompliance: documentCompliance
        };
      });
    } catch (error) {
      console.error('Error getting trucks with detailed status:', error);
      throw error;
    }
  }

  // Helper method to get status summary
  _getStatusSummary(truck) {
    if (truck.operationalStatus === 'maintenance') {
      return 'Under Maintenance';
    }
    if (truck.operationalStatus === 'out-of-service') {
      return 'Out of Service';
    }
    if (truck.truckStatus === 'on-delivery') {
      return 'On Delivery';
    }
    if (truck.truckStatus === 'active') {
      return 'Ready for Delivery'; // Active status means allocated to client and ready
    }
    if (truck.allocationStatus === 'allocated' || truck.truckStatus === 'allocated') {
      return 'Allocated to Client';
    }
    if (truck.allocationStatus === 'available' || truck.truckStatus === 'available') {
      return 'Available for Allocation';
    }
    return 'Status Unknown';
  }

  // Override update method to handle registration dates and check expiry
  async update(id, truckData) {
    try {
      console.log('🚛 TruckService.update called for truck:', id);
      console.log('📅 Registration data:', {
        registrationDate: truckData.registrationDate,
        registrationExpiryDate: truckData.registrationExpiryDate
      });
      
      // Prepare update data with registration dates
      const updateData = {
        ...truckData,
        // Handle registration dates
        registrationDate: truckData.registrationDate ? new Date(truckData.registrationDate) : null,
        registrationExpiryDate: truckData.registrationExpiryDate ? new Date(truckData.registrationExpiryDate) : null,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // Call parent update method
      await this.collection.doc(id).update(updateData);
      
      console.log('✅ Truck data updated, now checking registration expiry...');
      
      // Check registration expiry after update
      await this.checkAndUpdateRegistrationExpiry(id);
      
      // Get and return the updated truck
      const updatedTruck = await this.getById(id);
      console.log('📊 Updated truck status:', updatedTruck.operationalStatus);
      
      return updatedTruck;
    } catch (error) {
      console.error('Error updating truck:', error);
      throw error;
    }
  }

  // Create truck with enhanced status tracking
  async createTruckWithStatus(truckData) {
    try {
      console.log('🚛 TruckService.createTruckWithStatus called with:', truckData);
      
      const enhancedData = {
        ...truckData,
        // Registration tracking (Annual renewal in Philippines)
        registrationDate: truckData.registrationDate ? new Date(truckData.registrationDate) : null,
        registrationExpiryDate: truckData.registrationExpiryDate ? new Date(truckData.registrationExpiryDate) : null,
        registrationExpiryWarning: false,
        registrationExpiryDaysRemaining: null,
        // Basic status (legacy compatibility)
        truckStatus: 'available',
        // Enhanced status tracking
        allocationStatus: 'available', // available, allocated, reserved
        operationalStatus: 'active', // active, maintenance, out-of-service, standby, registration-expiring, registration-expired
        availabilityStatus: 'free', // free, busy, scheduled
        // Tracking fields
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        lastStatusChange: admin.firestore.FieldValue.serverTimestamp(),
        lastAllocationChange: admin.firestore.FieldValue.serverTimestamp(),
        // Allocation tracking
        currentClientId: null,
        currentAllocationId: null,
        currentDeliveryId: null,
        // Additional metadata
        totalAllocations: 0,
        totalDeliveries: 0,
        maintenanceScheduled: false,
        lastMaintenanceDate: null,
        // Truck brand and kilometer tracking
        truckBrand: truckData.truckBrand || 'Unknown',
        modelYear: truckData.modelYear || null,
        dateAdded: admin.firestore.FieldValue.serverTimestamp(),
        totalKilometers: 0,
        totalCompletedDeliveries: 0,
        lastOdometerUpdate: admin.firestore.FieldValue.serverTimestamp(),
        averageKmPerDelivery: 0,
        // Document storage
        documents: truckData.documents || {},
        // Document compliance tracking (optional for now)
        documentCompliance: {
          orDocument: truckData.documents?.orDocument ? 'complete' : 'optional',
          crDocument: truckData.documents?.crDocument ? 'complete' : 'optional',
          insuranceDocument: truckData.documents?.insuranceDocument ? 'complete' : 'optional',
          licenseRequirement: truckData.documents?.licenseRequirement ? 'complete' : 'optional',
          overallStatus: 'optional', // Skip validation for now
          documentCount: this._getDocumentCount(truckData.documents),
          requiredDocumentCount: this._getRequiredDocumentCount(truckData.documents),
          optionalDocumentCount: this._getOptionalDocumentCount(truckData.documents)
        },
        // License requirements based on truck type
        licenseRequirements: this._getLicenseRequirements(truckData.truckType)
      };

      console.log('🚛 Enhanced data prepared:', enhancedData);
      const createdTruck = await this.create(enhancedData);
      
      // Check registration expiry after creation
      if (createdTruck && createdTruck.id) {
        await this.checkAndUpdateRegistrationExpiry(createdTruck.id);
      }
      
      return createdTruck;
    } catch (error) {
      console.error('Error creating truck with enhanced status:', error);
      throw error;
    }
  }

  // Calculate document compliance status
  _calculateDocumentCompliance(documents) {
    if (!documents) return 'incomplete';
    
    const requiredDocs = ['orDocument', 'crDocument', 'insuranceDocument'];
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

  // Get document count for a truck
  _getDocumentCount(documents) {
    if (!documents) return 0;
    
    const documentTypes = ['orDocument', 'crDocument', 'insuranceDocument', 'licenseRequirement'];
    return documentTypes.filter(docType => documents[docType]).length;
  }

  // Get required document count for a truck
  _getRequiredDocumentCount(documents) {
    if (!documents) return 0;
    
    const requiredDocs = ['orDocument', 'crDocument', 'insuranceDocument'];
    return requiredDocs.filter(docType => documents[docType]).length;
  }

  // Get optional document count for a truck
  _getOptionalDocumentCount(documents) {
    if (!documents) return 0;
    
    const optionalDocs = ['licenseRequirement'];
    return optionalDocs.filter(docType => documents[docType]).length;
  }

  // Get license requirements based on truck type
  _getLicenseRequirements(truckType) {
    const requirements = {
      'mini truck': {
        driverLicense: 'Non-professional',
        helpers: 1,
        helperLevel: 'basic',
        helperRequirements: ['Valid ID', 'Barangay Clearance']
      },
      '4 wheeler': {
        driverLicense: 'Professional',
        helpers: 1,
        helperLevel: 'basic',
        helperRequirements: ['Valid ID', 'Barangay Clearance', 'Medical Certificate']
      },
      '6 wheeler': {
        driverLicense: 'Professional',
        helpers: 2,
        helperLevel: 'standard',
        helperRequirements: ['Valid ID', 'Barangay Clearance', 'Medical Certificate']
      },
      '8 wheeler': {
        driverLicense: 'Professional',
        helpers: 2,
        helperLevel: 'standard',
        helperRequirements: ['Valid ID', 'Barangay Clearance', 'Medical Certificate']
      },
      '10 wheeler': {
        driverLicense: 'Professional',
        helpers: 3,
        helperLevel: 'advanced',
        helperRequirements: ['Valid ID', 'Barangay Clearance', 'Medical Certificate']
      }
    };

    return requirements[truckType] || requirements['mini truck'];
  }

  // Get trucks with expiring documents
  async getTrucksWithExpiringDocuments(daysAhead = 30) {
    try {
      const trucks = await this.getAll();
      const expiringDate = new Date();
      expiringDate.setDate(expiringDate.getDate() + daysAhead);

      return trucks.filter(truck => {
        if (!truck.documents) return false;

        const docTypes = ['orDocument', 'crDocument', 'insuranceDocument'];
        return docTypes.some(docType => {
          const doc = truck.documents[docType];
          if (doc && doc.expiryDate) {
            const expiry = new Date(doc.expiryDate);
            return expiry <= expiringDate && expiry > new Date();
          }
          return false;
        });
      });
    } catch (error) {
      console.error('Error getting trucks with expiring documents:', error);
      throw error;
    }
  }

  // Update truck documents
  async updateTruckDocuments(truckId, documents) {
    try {
      console.log('📄 updateTruckDocuments called for truck:', truckId);
      console.log('📄 New documents to add:', documents);
      
      // Get the current truck to merge with existing documents
      const currentTruck = await this.getById(truckId);
      if (!currentTruck) {
        throw new Error('Truck not found');
      }
      
      console.log('📄 Current truck documents:', currentTruck.documents);
      
      // Merge new documents with existing ones
      const mergedDocuments = {
        ...(currentTruck.documents || {}),
        ...documents
      };
      
      console.log('📄 Merged documents:', mergedDocuments);
      
      const documentCount = this._getDocumentCount(mergedDocuments);
      const requiredDocumentCount = this._getRequiredDocumentCount(mergedDocuments);
      const optionalDocumentCount = this._getOptionalDocumentCount(mergedDocuments);
      
      const updateData = {
        documents: mergedDocuments,
        documentCompliance: {
          orDocument: mergedDocuments?.orDocument ? 'complete' : 'missing',
          crDocument: mergedDocuments?.crDocument ? 'complete' : 'missing',
          insuranceDocument: mergedDocuments?.insuranceDocument ? 'complete' : 'missing',
          licenseRequirement: mergedDocuments?.licenseRequirement ? 'complete' : 'optional',
          overallStatus: this._calculateDocumentCompliance(mergedDocuments),
          documentCount: documentCount,
          requiredDocumentCount: requiredDocumentCount,
          optionalDocumentCount: optionalDocumentCount
        },
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };

      console.log('📄 Final update data:', updateData);
      
      return await this.update(truckId, updateData);
    } catch (error) {
      console.error('Error updating truck documents:', error);
      throw error;
    }
  }

  // Calculate total kilometers from completed deliveries
  async calculateTruckKilometers(truckId) {
    try {
      const { db } = require('../config/firebase');
      
      // Get all completed deliveries for this truck
      const deliveriesSnapshot = await db.collection('deliveries')
        .where('truckId', '==', truckId)
        .where('deliveryStatus', '==', 'completed')
        .get();

      let totalKm = 0;
      let completedDeliveries = 0;

      deliveriesSnapshot.forEach(doc => {
        const delivery = doc.data();
        if (delivery.deliveryDistance && delivery.deliveryDistance > 0) {
          totalKm += delivery.deliveryDistance;
          completedDeliveries++;
        }
      });

      const averageKmPerDelivery = completedDeliveries > 0 ? Math.round((totalKm / completedDeliveries) * 100) / 100 : 0;

      return {
        totalKilometers: Math.round(totalKm * 100) / 100,
        totalCompletedDeliveries: completedDeliveries,
        averageKmPerDelivery: averageKmPerDelivery
      };
    } catch (error) {
      console.error('Error calculating truck kilometers:', error);
      throw error;
    }
  }

  // Update truck kilometers after delivery completion
  async updateTruckKilometers(truckId, deliveryDistance) {
    try {
      const truck = await this.getById(truckId);
      if (!truck) {
        throw new Error('Truck not found');
      }

      const currentKm = truck.totalKilometers || 0;
      const currentDeliveries = truck.totalCompletedDeliveries || 0;
      const newTotalKm = currentKm + (deliveryDistance || 0);
      const newTotalDeliveries = currentDeliveries + 1;
      const newAverageKm = newTotalDeliveries > 0 ? Math.round((newTotalKm / newTotalDeliveries) * 100) / 100 : 0;

      const updateData = {
        totalKilometers: Math.round(newTotalKm * 100) / 100,
        totalCompletedDeliveries: newTotalDeliveries,
        averageKmPerDelivery: newAverageKm,
        lastOdometerUpdate: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };

      return await this.update(truckId, updateData);
    } catch (error) {
      console.error('Error updating truck kilometers:', error);
      throw error;
    }
  }

  // Get a single truck with actual documents from file system
  async getTruckByIdWithDocuments(truckId) {
    try {
      console.log(`🔍 Getting truck ${truckId} with documents...`);
      
      const truck = await this.getById(truckId);
      if (!truck) {
        return null;
      }

      // Use database documents as source of truth, verify files exist
      const actualDocuments = await this.verifyTruckDocuments(truck.documents || {});
      
      // Update database if some files are missing (clean up orphaned references)
      const currentDocuments = truck.documents || {};
      const documentsChanged = JSON.stringify(currentDocuments) !== JSON.stringify(actualDocuments);
      
      if (documentsChanged) {
        console.log(`🔄 Cleaning up missing documents for truck ${truck.truckPlate}`);
        try {
          await this.update(truckId, { documents: actualDocuments });
          console.log(`✅ Database updated for truck ${truck.truckPlate}`);
        } catch (syncError) {
          console.error('❌ Error updating database:', syncError);
          // Continue with verified documents even if update fails
        }
      }
      
      // Calculate document compliance based on actual files
      const documentCount = this._getDocumentCount(actualDocuments);
      const requiredDocumentCount = this._getRequiredDocumentCount(actualDocuments);
      const optionalDocumentCount = this._getOptionalDocumentCount(actualDocuments);
      
      const enhancedTruck = {
        ...truck,
        documents: actualDocuments, // Use actual documents from file system
        isAvailable: truck.allocationStatus === 'available' && truck.operationalStatus === 'active',
        isAllocated: truck.allocationStatus === 'allocated' || truck.truckStatus === 'allocated' || truck.truckStatus === 'active',
        isReadyForDelivery: truck.truckStatus === 'active',
        isInUse: truck.truckStatus === 'on-delivery' || truck.truckStatus === 'in-transit',
        needsMaintenance: truck.operationalStatus === 'maintenance',
        statusSummary: this._getStatusSummary(truck),
        documentCompliance: {
          orDocument: actualDocuments.orDocument ? 'complete' : 'missing',
          crDocument: actualDocuments.crDocument ? 'complete' : 'missing',
          insuranceDocument: actualDocuments.insuranceDocument ? 'complete' : 'missing',
          licenseRequirement: actualDocuments.licenseRequirement ? 'complete' : 'optional',
          overallStatus: this._calculateDocumentCompliance(actualDocuments),
          documentCount: documentCount,
          requiredDocumentCount: requiredDocumentCount,
          optionalDocumentCount: optionalDocumentCount
        }
      };
      
      console.log(`✅ Enhanced truck ${truck.truckPlate} with documents`);
      return enhancedTruck;
      
    } catch (error) {
      console.error(`❌ Error getting truck ${truckId} with documents:`, error);
      throw error;
    }
  }

  // Recalculate kilometers for all trucks (for migration/maintenance)
  async recalculateAllTruckKilometers() {
    try {
      const trucks = await this.getAll();
      const results = [];

      for (const truck of trucks) {
        try {
          const kmData = await this.calculateTruckKilometers(truck.id);
          
          const updateData = {
            totalKilometers: kmData.totalKilometers,
            totalCompletedDeliveries: kmData.totalCompletedDeliveries,
            averageKmPerDelivery: kmData.averageKmPerDelivery,
            lastOdometerUpdate: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          };

          await this.update(truck.id, updateData);
          
          results.push({
            truckId: truck.id,
            truckPlate: truck.truckPlate,
            ...kmData,
            status: 'updated'
          });
        } catch (error) {
          console.error(`Error recalculating for truck ${truck.id}:`, error);
          results.push({
            truckId: truck.id,
            truckPlate: truck.truckPlate || 'Unknown',
            status: 'error',
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error recalculating all truck kilometers:', error);
      throw error;
    }
  }
}

module.exports = new TruckService(); 