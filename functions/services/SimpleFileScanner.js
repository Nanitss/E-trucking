const fs = require('fs');
const path = require('path');
const os = require('os');
const { db } = require('../config/firebase'); // Added for Firebase access

// Detect Cloud Functions environment
const isCloudFunctions = process.env.FUNCTION_TARGET || process.env.K_SERVICE;

class SimpleFileScanner {
  constructor() {
    // In Cloud Functions, /tmp is the only writable directory
    this.basePath = isCloudFunctions
      ? path.join(os.tmpdir(), 'uploads')
      : path.join(__dirname, '..', '..', '..', 'uploads');
    console.log('📁 SimpleFileScanner using path:', this.basePath);
    this.ensureBaseFolderExists();
  }

  ensureBaseFolderExists() {
    try {
      if (!fs.existsSync(this.basePath)) {
        fs.mkdirSync(this.basePath, { recursive: true });
        console.log('✅ Created base documents folder:', this.basePath);
      }
    } catch (error) {
      console.error('❌ Error creating base folder:', error);
    }
  }

  // Get all trucks with documents from file system
  async getTrucksWithDocuments() {
    try {
      const truckDocumentsPath = path.join(this.basePath, 'Truck-Documents');
      if (!fs.existsSync(truckDocumentsPath)) {
        console.log('📁 Truck documents folder not found, creating...');
        fs.mkdirSync(truckDocumentsPath, { recursive: true });
        return [];
      }

      const files = await this.getAllFiles(truckDocumentsPath);
      const trucksByPlate = this.groupFilesByTruck(files, 'truck');
      return this.createTruckObjects(trucksByPlate);
    } catch (error) {
      console.error('❌ Error scanning truck documents:', error);
      return [];
    }
  }

  // Get all drivers with documents from file system
  async getDriversWithDocuments() {
    try {
      const driverDocumentsPath = path.join(this.basePath, 'Driver-Documents');
      if (!fs.existsSync(driverDocumentsPath)) {
        console.log('📁 Driver documents folder not found, creating...');
        fs.mkdirSync(driverDocumentsPath, { recursive: true });
      }

      // First, get all drivers from Firebase
      const driversSnapshot = await db.collection('drivers').get();
      const drivers = [];
      
      for (const doc of driversSnapshot.docs) {
        const driverData = doc.data();
        const driver = {
          id: doc.id,
          name: driverData.DriverName || driverData.name || '',
          contactNumber: driverData.DriverNumber || driverData.contactNumber || '',
          address: driverData.DriverAddress || driverData.address || '',
          status: driverData.DriverStatus || driverData.status || 'Active',
          employmentDate: driverData.DriverEmploymentDate || driverData.employmentDate || '',
          licenseType: driverData.licenseType || '',
          licenseNumber: driverData.licenseNumber || '',
          licenseExpiryDate: driverData.licenseExpiryDate || '',
          documents: {},
          documentCompliance: null
        };

                  // Check if driver has documents in the file system
          if (fs.existsSync(driverDocumentsPath)) {
            const files = await this.getAllFiles(driverDocumentsPath);
            
            // Use a more specific pattern to match files for this specific driver
            // Look for files that contain the driver's ID or a unique identifier
            const driverFiles = files.filter(file => {
              const filename = file.filename.toLowerCase();
              const driverName = driverData.name?.toLowerCase().replace(/[^a-zA-Z0-9]/g, '') || '';
              const driverId = doc.id.toLowerCase();
              
              // Check if filename contains driver ID (most specific)
              if (filename.includes(driverId)) return true;
              
              // Check if filename contains driver name with date pattern (e.g., "2025-01-01_DRIVERNAME_")
              if (filename.includes(driverName) && /\d{4}-\d{2}-\d{2}/.test(filename)) return true;
              
              // Check if filename contains driver name with underscore pattern
              if (filename.includes(driverName) && filename.includes('_')) return true;
              
              return false;
            });

          // Add document information
          driverFiles.forEach(file => {
            const docType = this.getDriverDocumentType(file.filename, file.folder);
            if (docType) {
              driver.documents[docType] = {
                filename: file.filename,
                originalName: file.filename,
                fullPath: file.fullPath,
                relativePath: file.relativePath,
                uploadDate: file.uploadDate,
                fileSize: file.size,
                mimeType: this.getMimeType(file.filename),
                documentType: docType
              };
            }
          });

          // Calculate document compliance
          driver.documentCompliance = this.calculateDriverCompliance(driver.documents);
        }

        drivers.push(driver);
      }

      return drivers;
    } catch (error) {
      console.error('❌ Error scanning driver documents:', error);
      return [];
    }
  }

  // Get all helpers with documents from file system
  async getHelpersWithDocuments() {
    try {
      const helperDocumentsPath = path.join(this.basePath, 'Helper-Documents');
      if (!fs.existsSync(helperDocumentsPath)) {
        console.log('📁 Helper documents folder not found, creating...');
        fs.mkdirSync(helperDocumentsPath, { recursive: true });
      }

      // First, get all helpers from Firebase
      const helpersSnapshot = await db.collection('helpers').get();
      const helpers = [];
      
      for (const doc of helpersSnapshot.docs) {
        const helperData = doc.data();
        const helper = {
          id: doc.id,
          name: helperData.HelperName || helperData.name || '',
          contactNumber: helperData.HelperNumber || helperData.contactNumber || '',
          address: helperData.HelperAddress || helperData.address || '',
          status: helperData.HelperStatus || helperData.status || 'Active',
          employmentDate: helperData.HelperEmploymentDate || helperData.employmentDate || '',
          licenseType: helperData.licenseType || '',
          licenseNumber: helperData.licenseNumber || '',
          licenseExpiryDate: helperData.licenseExpiryDate || '',
          documents: {},
          documentCompliance: null
        };

        // Check if helper has documents in the file system
        if (fs.existsSync(helperDocumentsPath)) {
          const files = await this.getAllFiles(helperDocumentsPath);
          
          if (doc.id === helpersSnapshot.docs[0].id) {
            // Log all files once for first helper
            console.log(`\n📁 Total files in Helper-Documents: ${files.length}`);
            files.slice(0, 5).forEach(f => console.log(`   - ${f.filename}`));
            if (files.length > 5) console.log(`   ... and ${files.length - 5} more files`);
          }
          
          // Use a more specific pattern to match files for this specific helper
          console.log(`\n🔍 Matching files for helper: ${helperData.HelperName || helperData.name} (ID: ${doc.id})`);
          const helperFiles = files.filter(file => {
            const filename = file.filename.toLowerCase();
            const helperName = (helperData.HelperName || helperData.name || '').toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
            const helperId = doc.id.toLowerCase();
            
            console.log(`  📄 Checking file: ${file.filename}`);
            console.log(`     Helper name (cleaned): "${helperName}"`);
            console.log(`     Helper ID: "${helperId}"`);
            
            // Check if filename contains helper ID (most specific)
            if (filename.includes(helperId)) {
              console.log(`     ✅ MATCH: Contains helper ID`);
              return true;
            }
            
            // Check if filename contains helper name with date pattern
            if (helperName && filename.includes(helperName) && /\d{4}-\d{2}-\d{2}/.test(filename)) {
              console.log(`     ✅ MATCH: Contains helper name + date pattern`);
              return true;
            }
            
            // Check if filename contains helper name with underscore pattern
            if (helperName && filename.includes(helperName) && filename.includes('_')) {
              console.log(`     ✅ MATCH: Contains helper name + underscore`);
              return true;
            }
            
            console.log(`     ❌ NO MATCH`);
            return false;
          });
          console.log(`  📊 Found ${helperFiles.length} files for this helper\n`);

          // Add document information
          helperFiles.forEach(file => {
            const docType = this.getHelperDocumentType(file.filename, file.folder);
            if (docType) {
              helper.documents[docType] = {
                filename: file.filename,
                originalName: file.filename,
                fullPath: file.fullPath,
                relativePath: file.relativePath,
                uploadDate: file.uploadDate,
                fileSize: file.size,
                mimeType: this.getMimeType(file.filename),
                documentType: docType
              };
            }
          });

          // Calculate document compliance
          helper.documentCompliance = this.calculateHelperCompliance(helper.documents);
          console.log(`  📊 Document Compliance calculated:`, helper.documentCompliance);
        }

        helpers.push(helper);
      }

      return helpers;
    } catch (error) {
      console.error('❌ Error scanning helper documents:', error);
      return [];
    }
  }

  // Get all staff with documents from file system
  async getStaffWithDocuments() {
    try {
      const staffDocumentsPath = path.join(this.basePath, 'Staff-Documents');
      if (!fs.existsSync(staffDocumentsPath)) {
        console.log('📁 Staff documents folder not found, creating...');
        fs.mkdirSync(staffDocumentsPath, { recursive: true });
      }

      // First, get all staff from Firebase
      const staffSnapshot = await db.collection('staff').get();
      const staff = [];
      
      for (const doc of staffSnapshot.docs) {
        const staffData = doc.data();
        const staffMember = {
          id: doc.id,
          ...staffData,
          documents: {},
          documentCompliance: null
        };

                  // Check if staff has documents in the file system
          if (fs.existsSync(staffDocumentsPath)) {
            const files = await this.getAllFiles(staffDocumentsPath);
            
            // Use a more specific pattern to match files for this specific staff
            const staffFiles = files.filter(file => {
              const filename = file.filename.toLowerCase();
              const staffName = staffData.name?.toLowerCase().replace(/[^a-zA-Z0-9]/g, '') || '';
              const staffId = doc.id.toLowerCase();
              
              // Check if filename contains staff ID (most specific)
              if (filename.includes(staffId)) return true;
              
              // Check if filename contains staff name with date pattern
              if (filename.includes(staffName) && /\d{4}-\d{2}-\d{2}/.test(filename)) return true;
              
              // Check if filename contains staff name with underscore pattern
              if (filename.includes(staffName) && filename.includes('_')) return true;
              
              return false;
            });

          // Add document information
          staffFiles.forEach(file => {
            const docType = this.getStaffDocumentType(file.filename, file.folder);
            if (docType) {
              staffMember.documents[docType] = {
                filename: file.filename,
                originalName: file.filename,
                fullPath: file.fullPath,
                relativePath: file.relativePath,
                uploadDate: file.uploadDate,
                fileSize: file.size,
                mimeType: this.getMimeType(file.filename),
                documentType: docType
              };
            }
          });

          // Calculate document compliance
          staffMember.documentCompliance = this.calculateStaffCompliance(staffMember.documents);
        }

        staff.push(staffMember);
      }

      return staff;
    } catch (error) {
      console.error('❌ Error scanning staff documents:', error);
      return [];
    }
  }

  // Get all clients with documents from file system
  async getClientsWithDocuments() {
    try {
      const clientDocumentsPath = path.join(this.basePath, 'Client-Documents');
      if (!fs.existsSync(clientDocumentsPath)) {
        console.log('📁 Client documents folder not found, creating...');
        fs.mkdirSync(clientDocumentsPath, { recursive: true });
      }

      // First, get all clients from Firebase
      const clientsSnapshot = await db.collection('clients').get();
      const clients = [];
      
      for (const doc of clientsSnapshot.docs) {
        const clientData = doc.data();
        const client = {
          id: doc.id,
          ...clientData,
          documents: {},
          documentCompliance: null
        };

                  // Check if client has documents in the file system
          if (fs.existsSync(clientDocumentsPath)) {
            const files = await this.getAllFiles(clientDocumentsPath);
            
            // Use a more specific pattern to match files for this specific client
            const clientFiles = files.filter(file => {
              const filename = file.filename.toLowerCase();
              const clientName = clientData.name?.toLowerCase().replace(/[^a-zA-Z0-9]/g, '') || '';
              const clientId = doc.id.toLowerCase();
              
              // Check if filename contains client ID (most specific)
              if (filename.includes(clientId)) return true;
              
              // Check if filename contains client name with date pattern
              if (filename.includes(clientName) && /\d{4}-\d{2}-\d{2}/.test(filename)) return true;
              
              // Check if filename contains client name with underscore pattern
              if (filename.includes(clientName) && filename.includes('_')) return true;
              
              return false;
            });

          // Add document information
          clientFiles.forEach(file => {
            const docType = this.getClientDocumentType(file.filename, file.folder);
            if (docType) {
              client.documents[docType] = {
                filename: file.filename,
                originalName: file.filename,
                fullPath: file.fullPath,
                relativePath: file.relativePath,
                uploadDate: file.uploadDate,
                fileSize: file.size,
                mimeType: this.getMimeType(file.filename),
                documentType: docType
              };
            }
          });

          // Calculate document compliance
          client.documentCompliance = this.calculateClientCompliance(client.documents);
        }

        clients.push(client);
      }

      return clients;
    } catch (error) {
      console.error('❌ Error scanning client documents:', error);
      return [];
    }
  }

  // Get documents for a specific truck by plate number
  async getTruckDocuments(plateNumber) {
    try {
      const truckDocumentsPath = path.join(this.basePath, 'Truck-Documents');
      if (!fs.existsSync(truckDocumentsPath)) {
        return { documents: {}, documentCompliance: null };
      }

      const files = await this.getAllFiles(truckDocumentsPath);
      const truckFiles = files.filter(file => 
        file.filename.includes(plateNumber.replace(/[^a-zA-Z0-9]/g, ''))
      );

      const documents = {};
      truckFiles.forEach(file => {
        const docType = this.getDocumentType(file.filename, file.folder);
        if (docType) {
          documents[docType] = {
            filename: file.filename,
            originalName: file.originalName || file.filename,
            fullPath: file.fullPath,
            relativePath: file.relativePath,
            uploadDate: file.uploadDate || new Date().toISOString(),
            fileSize: file.size || 0,
            mimeType: this.getMimeType(file.filename),
            documentType: docType
          };
        }
      });

      const documentCompliance = this.calculateTruckCompliance(documents);
      return { documents, documentCompliance };
    } catch (error) {
      console.error('❌ Error getting truck documents:', error);
      return { documents: {}, documentCompliance: null };
    }
  }

  // Get documents for a specific driver by name
  async getDriverDocuments(driverName) {
    try {
      const driverDocumentsPath = path.join(this.basePath, 'Driver-Documents');
      if (!fs.existsSync(driverDocumentsPath)) {
        return { documents: {}, documentCompliance: null };
      }

      const files = await this.getAllFiles(driverDocumentsPath);
      const driverFiles = files.filter(file => 
        file.filename.includes(driverName.replace(/[^a-zA-Z0-9]/g, ''))
      );

      const documents = {};
      driverFiles.forEach(file => {
        const docType = this.getDriverDocumentType(file.filename, file.folder);
        if (docType) {
          documents[docType] = {
            filename: file.filename,
            originalName: file.originalName || file.filename,
            fullPath: file.fullPath,
            relativePath: file.relativePath,
            uploadDate: file.uploadDate || new Date().toISOString(),
            fileSize: file.size || 0,
            mimeType: this.getMimeType(file.filename),
            documentType: docType
          };
        }
      });

      const documentCompliance = this.calculateDriverCompliance(documents);
      return { documents, documentCompliance };
    } catch (error) {
      console.error('❌ Error getting driver documents:', error);
      return { documents: {}, documentCompliance: null };
    }
  }

  // Get documents for a specific helper by name
  async getHelperDocuments(helperName) {
    try {
      const helperDocumentsPath = path.join(this.basePath, 'Helper-Documents');
      if (!fs.existsSync(helperDocumentsPath)) {
        return { documents: {}, documentCompliance: null };
      }

      const files = await this.getAllFiles(helperDocumentsPath);
      const helperFiles = files.filter(file => 
        file.filename.includes(helperName.replace(/[^a-zA-Z0-9]/g, ''))
      );

      const documents = {};
      helperFiles.forEach(file => {
        const docType = this.getHelperDocumentType(file.filename, file.folder);
        if (docType) {
          documents[docType] = {
            filename: file.filename,
            originalName: file.originalName || file.filename,
            fullPath: file.fullPath,
            relativePath: file.relativePath,
            uploadDate: file.uploadDate || new Date().toISOString(),
            fileSize: file.size || 0,
            mimeType: this.getMimeType(file.filename),
            documentType: docType
          };
        }
      });

      const documentCompliance = this.calculateHelperCompliance(documents);
      return { documents, documentCompliance };
    } catch (error) {
      console.error('❌ Error getting helper documents:', error);
      return { documents: {}, documentCompliance: null };
    }
  }

  // Get documents for a specific staff by name
  async getStaffDocuments(staffName) {
    try {
      const staffDocumentsPath = path.join(this.basePath, 'Staff-Documents');
      if (!fs.existsSync(staffDocumentsPath)) {
        return { documents: {}, documentCompliance: null };
      }

      const files = await this.getAllFiles(staffDocumentsPath);
      const staffFiles = files.filter(file => 
        file.filename.includes(staffName.replace(/[^a-zA-Z0-9]/g, ''))
      );

      const documents = {};
      staffFiles.forEach(file => {
        const docType = this.getStaffDocumentType(file.filename, file.folder);
        if (docType) {
          documents[docType] = {
            filename: file.filename,
            originalName: file.originalName || file.filename,
            fullPath: file.fullPath,
            relativePath: file.relativePath,
            uploadDate: file.uploadDate || new Date().toISOString(),
            fileSize: file.size || 0,
            mimeType: this.getMimeType(file.filename),
            documentType: docType
          };
        }
      });

      const documentCompliance = this.calculateStaffCompliance(documents);
      return { documents, documentCompliance };
    } catch (error) {
      console.error('❌ Error getting staff documents:', error);
      return { documents: {}, documentCompliance: null };
    }
  }

  // Get documents for a specific client by name
  async getClientDocuments(clientName) {
    try {
      const clientDocumentsPath = path.join(this.basePath, 'Client-Documents');
      if (!fs.existsSync(clientDocumentsPath)) {
        return { documents: {}, documentCompliance: null };
      }

      const files = await this.getAllFiles(clientDocumentsPath);
      const clientFiles = files.filter(file => 
        file.filename.includes(clientName.replace(/[^a-zA-Z0-9]/g, ''))
      );

      const documents = {};
      clientFiles.forEach(file => {
        const docType = this.getClientDocumentType(file.filename, file.folder);
        if (docType) {
          documents[docType] = {
            filename: file.filename,
            originalName: file.originalName || file.filename,
            fullPath: file.fullPath,
            relativePath: file.relativePath,
            uploadDate: file.uploadDate || new Date().toISOString(),
            fileSize: file.size || 0,
            mimeType: this.getMimeType(file.filename),
            documentType: docType
          };
        }
      });

      const documentCompliance = this.calculateClientCompliance(documents);
      return { documents, documentCompliance };
    } catch (error) {
      console.error('❌ Error getting client documents:', error);
      return { documents: {}, documentCompliance: null };
    }
  }

  // Get all files from a directory recursively
  async getAllFiles(dirPath) {
    const files = [];
    
    try {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          const subFiles = await this.getAllFiles(fullPath);
          files.push(...subFiles);
        } else if (stat.isFile()) {
          const relativePath = path.relative(this.basePath, fullPath);
          const folder = path.dirname(relativePath);
          
          files.push({
            filename: item,
            fullPath: fullPath,
            relativePath: relativePath,
            folder: folder,
            size: stat.size,
            uploadDate: stat.birthtime.toISOString()
          });
        }
      }
    } catch (error) {
      console.error('❌ Error reading directory:', dirPath, error);
    }
    
    return files;
  }

  // Group files by truck plate number
  groupFilesByTruck(files) {
    const trucksByPlate = {};
    
    files.forEach(file => {
      const plateMatch = file.filename.match(/\d{4}-\d{2}-\d{2}_(.+?)_(OR|CR|INSURANCE|LICENSE-REQ)/);
      if (plateMatch) {
        const plate = plateMatch[1];
        if (!trucksByPlate[plate]) {
          trucksByPlate[plate] = [];
        }
        trucksByPlate[plate].push(file);
      }
    });
    
    return trucksByPlate;
  }

  // Group files by entity name
  groupFilesByEntity(files, entityType) {
    const entitiesByName = {};
    
    files.forEach(file => {
      let nameMatch;
      let prefix;
      
      switch (entityType) {
        case 'driver':
          prefix = '(LICENSE|MEDICAL|ID|NBI)';
          break;
        case 'helper':
          prefix = '(VALID-ID|BARANGAY|MEDICAL|HELPER-LICENSE)';
          break;
        case 'staff':
          prefix = '(VALID-ID|CONTRACT|MEDICAL|CERT)';
          break;
        case 'client':
          prefix = '(PERMIT|CONTRACT|ID|TAX)';
          break;
        default:
          return;
      }
      
      nameMatch = file.filename.match(new RegExp(`\\d{4}-\\d{2}-\\d{2}_(.+?)_${prefix}`));
      if (nameMatch) {
        const name = nameMatch[1];
        if (!entitiesByName[name]) {
          entitiesByName[name] = [];
        }
        entitiesByName[name].push(file);
      }
    });
    
    return entitiesByName;
  }

  // Create truck objects with document information
  createTruckObjects(trucksByPlate) {
    return Object.entries(trucksByPlate).map(([plate, files]) => {
      const documents = {};
      files.forEach(file => {
        const docType = this.getDocumentType(file.filename, file.folder);
        if (docType) {
          documents[docType] = {
            filename: file.filename,
            originalName: file.filename,
            fullPath: file.fullPath,
            relativePath: file.relativePath,
            uploadDate: file.uploadDate,
            fileSize: file.size,
            mimeType: this.getMimeType(file.filename),
            documentType: docType
          };
        }
      });

      const documentCompliance = this.calculateTruckCompliance(documents);
      
      return {
        truckPlate: plate,
        documents: documents,
        documentCompliance: documentCompliance
      };
    });
  }

  // Create driver objects with document information
  createDriverObjects(driversByName) {
    return Object.entries(driversByName).map(([name, files]) => {
      const documents = {};
      files.forEach(file => {
        const docType = this.getDriverDocumentType(file.filename, file.folder);
        if (docType) {
          documents[docType] = {
            filename: file.filename,
            originalName: file.filename,
            fullPath: file.fullPath,
            relativePath: file.relativePath,
            uploadDate: file.uploadDate,
            fileSize: file.size,
            mimeType: this.getMimeType(file.filename),
            documentType: docType
          };
        }
      });

      const documentCompliance = this.calculateDriverCompliance(documents);
      
      return {
        driverName: name,
        documents: documents,
        documentCompliance: documentCompliance
      };
    });
  }

  // Create helper objects with document information
  createHelperObjects(helpersByName) {
    return Object.entries(helpersByName).map(([name, files]) => {
      const documents = {};
      files.forEach(file => {
        const docType = this.getHelperDocumentType(file.filename, file.folder);
        if (docType) {
          documents[docType] = {
            filename: file.filename,
            originalName: file.filename,
            fullPath: file.fullPath,
            relativePath: file.relativePath,
            uploadDate: file.uploadDate,
            fileSize: file.size,
            mimeType: this.getMimeType(file.filename),
            documentType: docType
          };
        }
      });

      const documentCompliance = this.calculateHelperCompliance(documents);
      
      return {
        helperName: name,
        documents: documents,
        documentCompliance: documentCompliance
      };
    });
  }

  // Create staff objects with document information
  createStaffObjects(staffByName) {
    return Object.entries(staffByName).map(([name, files]) => {
      const documents = {};
      files.forEach(file => {
        const docType = this.getStaffDocumentType(file.filename, file.folder);
        if (docType) {
          documents[docType] = {
            filename: file.filename,
            originalName: file.filename,
            fullPath: file.fullPath,
            relativePath: file.relativePath,
            uploadDate: file.uploadDate,
            fileSize: file.size,
            mimeType: this.getMimeType(file.filename),
            documentType: docType
          };
        }
      });

      const documentCompliance = this.calculateStaffCompliance(documents);
      
      return {
        staffName: name,
        documents: documents,
        documentCompliance: documentCompliance
      };
    });
  }

  // Create client objects with document information
  createClientObjects(clientsByName) {
    return Object.entries(clientsByName).map(([name, files]) => {
      const documents = {};
      files.forEach(file => {
        const docType = this.getClientDocumentType(file.filename, file.folder);
        if (docType) {
          documents[docType] = {
            filename: file.filename,
            originalName: file.filename,
            fullPath: file.fullPath,
            relativePath: file.relativePath,
            uploadDate: file.uploadDate,
            fileSize: file.size,
            mimeType: this.getMimeType(file.filename),
            documentType: docType
          };
        }
      });

      const documentCompliance = this.calculateClientCompliance(documents);
      
      return {
        clientName: name,
        documents: documents,
        documentCompliance: documentCompliance
      };
    });
  }

  // Get document type for trucks
  getDocumentType(filename, folder) {
    if (filename.includes('_OR')) return 'orDocument';
    if (filename.includes('_CR')) return 'crDocument';
    if (filename.includes('_INSURANCE')) return 'insuranceDocument';
    if (filename.includes('_LICENSE-REQ')) return 'licenseRequirement';
    return null;
  }

  // Get document type for drivers
  getDriverDocumentType(filename, folder) {
    if (filename.includes('_LICENSE')) return 'licenseDocument';
    if (filename.includes('_MEDICAL')) return 'medicalCertificate';
    if (filename.includes('_ID')) return 'idPhoto';
    if (filename.includes('_NBI')) return 'nbiClearance';
    return null;
  }

  // Get document type for helpers
  getHelperDocumentType(filename, folder) {
    if (filename.includes('_VALID-ID')) return 'validId';
    if (filename.includes('_BARANGAY')) return 'barangayClearance';
    if (filename.includes('_MEDICAL')) return 'medicalCertificate';
    if (filename.includes('_HELPER-LICENSE')) return 'helperLicense';
    return null;
  }

  // Get document type for staff
  getStaffDocumentType(filename, folder) {
    if (filename.includes('_VALID-ID')) return 'validId';
    if (filename.includes('_CONTRACT')) return 'employmentContract';
    if (filename.includes('_MEDICAL')) return 'medicalCertificate';
    if (filename.includes('_CERT')) return 'certifications';
    return null;
  }

  // Get document type for clients
  getClientDocumentType(filename, folder) {
    if (filename.includes('_PERMIT')) return 'businessPermit';
    if (filename.includes('_CONTRACT')) return 'serviceContract';
    if (filename.includes('_ID')) return 'validId';
    if (filename.includes('_TAX')) return 'taxCertificate';
    return null;
  }

  // Calculate truck document compliance
  calculateTruckCompliance(documents) {
    const requiredDocs = ['orDocument', 'crDocument', 'insuranceDocument'];
    const optionalDocs = ['licenseRequirement'];
    
    const requiredCount = requiredDocs.filter(doc => documents[doc]).length;
    const optionalCount = optionalDocs.filter(doc => documents[doc]).length;
    const totalCount = Object.keys(documents).length;
    
    let overallStatus = 'incomplete';
    if (requiredCount === requiredDocs.length) {
      overallStatus = 'complete';
    } else if (requiredCount > 0) {
      overallStatus = 'partial';
    }
    
    return {
      overallStatus,
      requiredDocumentCount: requiredCount,
      totalDocumentCount: totalCount,
      optionalDocumentCount: optionalCount,
      documentCount: totalCount,
      missingDocuments: requiredDocs.filter(doc => !documents[doc])
    };
  }

  // Calculate driver document compliance
  calculateDriverCompliance(documents) {
    const requiredDocs = ['licenseDocument', 'medicalCertificate', 'idPhoto'];
    const optionalDocs = ['nbiClearance'];
    
    const requiredCount = requiredDocs.filter(doc => documents[doc]).length;
    const optionalCount = optionalDocs.filter(doc => documents[doc]).length;
    const totalCount = Object.keys(documents).length;
    
    let overallStatus = 'incomplete';
    if (requiredCount === requiredDocs.length) {
      overallStatus = 'complete';
    } else if (requiredCount > 0) {
      overallStatus = 'partial';
    }
    
    return {
      overallStatus,
      requiredDocumentCount: requiredCount,
      totalDocumentCount: totalCount,
      optionalDocumentCount: optionalCount,
      documentCount: totalCount,
      missingDocuments: requiredDocs.filter(doc => !documents[doc])
    };
  }

  // Calculate helper document compliance
  calculateHelperCompliance(documents) {
    const requiredDocs = ['validId', 'barangayClearance'];
    const optionalDocs = ['medicalCertificate', 'helperLicense'];
    
    const requiredCount = requiredDocs.filter(doc => documents[doc]).length;
    const optionalCount = optionalDocs.filter(doc => documents[doc]).length;
    const totalCount = Object.keys(documents).length;
    
    let overallStatus = 'incomplete';
    if (requiredCount === requiredDocs.length) {
      overallStatus = 'complete';
    } else if (requiredCount > 0) {
      overallStatus = 'partial';
    }
    
    return {
      overallStatus,
      requiredDocumentCount: requiredCount,
      totalDocumentCount: totalCount,
      optionalDocumentCount: optionalCount,
      documentCount: totalCount,
      missingDocuments: requiredDocs.filter(doc => !documents[doc])
    };
  }

  // Calculate staff document compliance
  calculateStaffCompliance(documents) {
    const requiredDocs = ['validId', 'employmentContract'];
    const optionalDocs = ['medicalCertificate', 'certifications'];
    
    const requiredCount = requiredDocs.filter(doc => documents[doc]).length;
    const optionalCount = optionalDocs.filter(doc => documents[doc]).length;
    const totalCount = Object.keys(documents).length;
    
    let overallStatus = 'incomplete';
    if (requiredCount === requiredDocs.length) {
      overallStatus = 'complete';
    } else if (requiredCount > 0) {
      overallStatus = 'partial';
    }
    
    return {
      overallStatus,
      requiredDocumentCount: requiredCount,
      totalDocumentCount: totalCount,
      optionalDocumentCount: optionalCount,
      documentCount: totalCount,
      missingDocuments: requiredDocs.filter(doc => !documents[doc])
    };
  }

  // Calculate client document compliance
  calculateClientCompliance(documents) {
    const requiredDocs = ['businessPermit', 'validId'];
    const optionalDocs = ['serviceContract', 'taxCertificate'];
    
    const requiredCount = requiredDocs.filter(doc => documents[doc]).length;
    const optionalCount = optionalDocs.filter(doc => documents[doc]).length;
    const totalCount = Object.keys(documents).length;
    
    let overallStatus = 'incomplete';
    if (requiredCount === requiredDocs.length) {
      overallStatus = 'complete';
    } else if (requiredCount > 0) {
      overallStatus = 'partial';
    }
    
    return {
      overallStatus,
      requiredDocumentCount: requiredCount,
      totalDocumentCount: totalCount,
      optionalDocumentCount: optionalCount,
      documentCount: totalCount,
      missingDocuments: requiredDocs.filter(doc => !documents[doc])
    };
  }

  // Get MIME type based on file extension
  getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
}

module.exports = SimpleFileScanner;
