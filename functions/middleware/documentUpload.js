const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const FileUploadService = require('../services/FileUploadService');

// Detect Cloud Functions environment
const isCloudFunctions = process.env.FUNCTION_TARGET || process.env.K_SERVICE;

// Helper: upload a file buffer to Firebase Storage for cloud access
const uploadToFirebaseStorage = async (filePath, storagePath, mimeType) => {
  try {
    const { storageBucket } = require('../config/firebase');
    if (!storageBucket) {
      console.log('⚠️ Firebase Storage not available, skipping cloud upload');
      return null;
    }
    const file = storageBucket.file(storagePath);
    await file.save(fs.readFileSync(filePath), {
      metadata: { contentType: mimeType || 'application/octet-stream' },
      resumable: false,
    });
    console.log(`☁️ Uploaded to Firebase Storage: ${storagePath}`);
    return storagePath;
  } catch (error) {
    console.error(`⚠️ Firebase Storage upload failed for ${storagePath}:`, error.message);
    return null;
  }
};

// Base path to project uploads folder
// In Cloud Functions, /tmp is the only writable directory
const DOCUMENTS_BASE_PATH = isCloudFunctions
  ? path.join(os.tmpdir(), 'uploads')
  : path.join(__dirname, '..', '..', '..', 'uploads');

// Function to ensure base documents folder exists
const ensureBaseFolderExists = () => {
  try {
    console.log('📁 Checking base documents folder:', DOCUMENTS_BASE_PATH);
    if (!fs.existsSync(DOCUMENTS_BASE_PATH)) {
      console.log('📁 Base folder doesn\'t exist, creating...');
      fs.mkdirSync(DOCUMENTS_BASE_PATH, { recursive: true });
      console.log('✅ Base folder created successfully');
    } else {
      console.log('✅ Base folder already exists');
    }
    
    // Check if we can write to the folder
    const testFile = path.join(DOCUMENTS_BASE_PATH, 'test-write.txt');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log('✅ Base folder is writable');
    
  } catch (error) {
    console.error('❌ Error with base folder:', error);
    throw new Error(`Cannot access or create base documents folder: ${error.message}`);
  }
};

// Ensure base folder exists when module loads
try {
  ensureBaseFolderExists();
} catch (error) {
  console.error('❌ Failed to initialize base documents folder:', error);
}

// Document upload middleware for trucks
const uploadTruckDocuments = async (req, res, next) => {
  console.log('🚛 ===== uploadTruckDocuments middleware called =====');
  console.log('📄 Files received:', req.files ? Object.keys(req.files) : 'No files');
  console.log('📄 Full files object:', req.files);
  console.log('📄 Request body:', req.body);
  console.log('📄 Request headers:', req.headers);
  console.log('📄 Document root path:', DOCUMENTS_BASE_PATH);
  
  // Test directory permissions
  try {
    const testDir = path.join(DOCUMENTS_BASE_PATH, 'Truck-Documents', 'OR-CR-Files');
    fs.mkdirSync(testDir, { recursive: true });
    const testFile = path.join(testDir, 'test.txt');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log('✅ Directory permissions test passed:', testDir);
  } catch (error) {
    console.error('❌ Directory permissions test failed:', error);
  }
  
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      console.log('No documents uploaded, continuing without document processing');
      req.uploadedDocuments = {};
      return next();
    }

    const truckPlate = req.body.truckPlate || req.body.TruckPlate;
    if (!truckPlate) {
      console.error('❌ Truck plate number is missing from request body');
      return res.status(400).json({ message: 'Truck plate number is required for document upload' });
    }

    console.log('🚛 Processing documents for truck plate:', truckPlate);

    // Clean plate number for filename
    const cleanPlate = truckPlate.replace(/[^a-zA-Z0-9]/g, '');
    const timestamp = Date.now();
    const uploadDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    const uploadedDocuments = {};
    const errors = [];

    // Process each document type - use existing folder structure
    const documentTypes = {
      orDocument: { 
        folder: 'OR-CR-Files', 
        prefix: 'OR', 
        required: true 
      },
      crDocument: { 
        folder: 'OR-CR-Files', 
        prefix: 'CR', 
        required: true 
      },
      insuranceDocument: { 
        folder: 'Insurance-Papers', 
        prefix: 'INSURANCE', 
        required: true 
      },
      licenseRequirement: { 
        folder: 'License-Documents', 
        prefix: 'LICENSE-REQ', 
        required: false 
      }
    };

    // Check for required documents ONLY in create mode (not edit)
    const isEditMode = req.method === 'PUT' || req.params.id;
    if (!isEditMode) {
      const missingRequiredDocs = [];
      for (const [docType, config] of Object.entries(documentTypes)) {
        if (config.required && !req.files[docType]) {
          missingRequiredDocs.push(docType.replace('Document', '').toUpperCase());
        }
      }

      if (missingRequiredDocs.length > 0) {
        console.log('❌ Missing required documents:', missingRequiredDocs);
        return res.status(400).json({ 
          message: `Missing required documents: ${missingRequiredDocs.join(', ')}` 
        });
      }
    } else {
      console.log('✅ Edit mode detected - skipping required document validation');
    }

    // Process each document
    for (const [docType, config] of Object.entries(documentTypes)) {
      const file = req.files[docType];

      if (file) {
        const folderPath = path.join(DOCUMENTS_BASE_PATH, 'Truck-Documents', config.folder);
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true });
        }

        const fileExtension = path.extname(file.name);
        // Use truck plate + original filename + prefix to avoid conflicts
        const originalName = path.basename(file.name, fileExtension);
        const fileName = `${cleanPlate}_${originalName}_${config.prefix}${fileExtension}`;
        const filePath = path.join(folderPath, fileName);

        try {
          await file.mv(filePath);
          console.log(`✅ Saved ${config.prefix} document to:`, filePath);
          console.log(`📁 File should exist at:`, filePath);
          
          // Verify file was actually saved
          if (fs.existsSync(filePath)) {
            console.log(`✅ Verified: ${config.prefix} document exists on disk`);
          } else {
            console.error(`❌ ERROR: ${config.prefix} document NOT found on disk after save!`);
          }
          
          const relPath = `Truck-Documents/${config.folder}/${fileName}`;
          const cloudPath = await uploadToFirebaseStorage(filePath, relPath, file.mimetype);
          uploadedDocuments[docType] = {
            filename: fileName,
            originalName: file.name,
            fullPath: filePath,
            relativePath: path.join('Truck-Documents', config.folder, fileName),
            storagePath: cloudPath || relPath,
            uploadDate: new Date().toISOString(),
            fileSize: file.size,
            mimeType: file.mimetype,
            documentType: config.prefix
          };
        } catch (moveError) {
          console.error(`❌ Failed to save ${config.prefix} document:`, moveError);
          errors.push(`Failed to save ${config.prefix} document: ${moveError.message}`);
        }
      }
    }

    // Check for upload errors and return them if any required documents failed
    if (errors.length > 0) {
      console.error('❌ Document upload errors:', errors);
      return res.status(400).json({ 
        message: 'Document upload failed', 
        errors: errors 
      });
    }

    req.uploadedDocuments = uploadedDocuments;
    console.log(`✅ Middleware complete, uploaded documents:`, uploadedDocuments);
    next();

  } catch (error) {
    console.error('❌ Document upload error:', error);
    res.status(500).json({ 
      message: 'Error handling document upload', 
      error: error.message 
    });
  }
};

// Document upload middleware for drivers
const uploadDriverDocuments = async (req, res, next) => {
  console.log('🚗 ===== uploadDriverDocuments middleware called =====');
  console.log('📄 Files received:', req.files ? Object.keys(req.files) : 'No files');
  
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      console.log('No documents uploaded, continuing without document processing');
      req.uploadedDocuments = {};
      return next();
    }

    // Use driver ID from URL params for EDIT, or name + timestamp for CREATE
    const driverId = req.params.id;
    const driverName = req.body.driverName || req.body.DriverName || 'UnknownDriver';
    const driverUsername = req.body.driverUserName || req.body.DriverUserName || driverName;
    
    console.log('🚗 Processing documents for driver ID:', driverId, 'Name:', driverName);

    // Create unique filename base
    let cleanName;
    if (driverId) {
      // EDIT mode: Use driver ID (most reliable)
      cleanName = `Driver${driverId}`.replace(/[^a-zA-Z0-9]/g, '');
    } else {
      // CREATE mode: Use username + timestamp for uniqueness
      const timestamp = Date.now();
      const cleanUsername = driverUsername.replace(/[^a-zA-Z0-9]/g, '');
      cleanName = `${cleanUsername}_${timestamp}`;
    }
    
    const uploadDate = new Date().toISOString().split('T')[0];

    const uploadedDocuments = {};
    const errors = [];

    const documentTypes = {
      licenseDocument: { 
        folder: 'Licenses', 
        prefix: 'LICENSE', 
        required: true 
      },
      medicalCertificate: { 
        folder: 'Medical-Certificates', 
        prefix: 'MEDICAL', 
        required: true 
      },
      idPhoto: { 
        folder: 'ID-Photos', 
        prefix: 'ID', 
        required: true 
      },
      nbiClearance: { 
        folder: 'NBI-Clearances', 
        prefix: 'NBI', 
        required: false 
      }
    };

    // Check for required documents ONLY in create mode (not edit)
    const isEditMode = req.method === 'PUT' || req.params.id;
    if (!isEditMode) {
      const missingRequiredDocs = [];
      for (const [docType, config] of Object.entries(documentTypes)) {
        if (config.required && !req.files[docType]) {
          missingRequiredDocs.push(docType.replace('Document', '').toUpperCase());
        }
      }

      if (missingRequiredDocs.length > 0) {
        console.log('❌ Missing required documents:', missingRequiredDocs);
        return res.status(400).json({ 
          message: `Missing required documents: ${missingRequiredDocs.join(', ')}` 
        });
      }
    } else {
      console.log('✅ Edit mode detected - skipping required document validation');
    }

    for (const [docType, config] of Object.entries(documentTypes)) {
      const file = req.files[docType];

      if (file) {
        const folderPath = path.join(DOCUMENTS_BASE_PATH, 'Driver-Documents', config.folder);
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true });
        }

        const fileExtension = path.extname(file.name);
        const fileName = `${uploadDate}_${cleanName}_${config.prefix}${fileExtension}`;
        const filePath = path.join(folderPath, fileName);

        try {
          await file.mv(filePath);
          console.log(`✅ Saved ${config.prefix} document to:`, filePath);
          
          // Verify file was actually saved
          if (fs.existsSync(filePath)) {
            console.log(`✅ Verified: ${config.prefix} document exists on disk`);
          }
          
          const relPath = `Driver-Documents/${config.folder}/${fileName}`;
          const cloudPath = await uploadToFirebaseStorage(filePath, relPath, file.mimetype);
          uploadedDocuments[docType] = {
            filename: fileName,
            originalName: file.name,
            fullPath: filePath,
            relativePath: path.join('Driver-Documents', config.folder, fileName),
            storagePath: cloudPath || relPath,
            uploadDate: new Date().toISOString(),
            fileSize: file.size,
            mimeType: file.mimetype,
            documentType: config.prefix
          };
        } catch (moveError) {
          console.error(`❌ Failed to save ${config.prefix} document:`, moveError);
          errors.push(`Failed to save ${config.prefix} document: ${moveError.message}`);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ 
        message: 'Document upload failed', 
        errors: errors 
      });
    }

    req.uploadedDocuments = uploadedDocuments;
    console.log(`✅ Driver middleware complete, uploaded documents:`, uploadedDocuments);
    next();

  } catch (error) {
    console.error('Driver document upload error:', error);
    res.status(500).json({ 
      message: 'Error handling document upload', 
      error: error.message 
    });
  }
};

// Document upload middleware for helpers
const uploadHelperDocuments = async (req, res, next) => {
  console.log('👷 ===== uploadHelperDocuments middleware called =====');
  console.log('📄 Files received:', req.files ? Object.keys(req.files) : 'No files');
  
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      console.log('No documents uploaded, continuing without document processing');
      req.uploadedDocuments = {};
      return next();
    }

    // Use helper ID from URL params for EDIT, or name + timestamp for CREATE
    const helperId = req.params.id;
    const helperName = req.body.helperName || req.body.HelperName || 'UnknownHelper';
    
    console.log('👷 Processing documents for helper ID:', helperId, 'Name:', helperName);

    // Create unique filename base
    let cleanName;
    if (helperId) {
      // EDIT mode: Use helper ID
      cleanName = `Helper${helperId}`.replace(/[^a-zA-Z0-9]/g, '');
    } else {
      // CREATE mode: Use name + timestamp for uniqueness
      const timestamp = Date.now();
      const cleanHelperName = helperName.replace(/[^a-zA-Z0-9]/g, '');
      cleanName = `${cleanHelperName}_${timestamp}`;
    }
    
    const uploadDate = new Date().toISOString().split('T')[0];

    const uploadedDocuments = {};
    const errors = [];

    const documentTypes = {
      validId: { 
        folder: 'Valid-IDs', 
        prefix: 'VALID-ID', 
        required: true 
      },
      barangayClearance: { 
        folder: 'Barangay-Clearances', 
        prefix: 'BARANGAY', 
        required: true 
      },
      medicalCertificate: { 
        folder: 'Medical-Certificates', 
        prefix: 'MEDICAL', 
        required: false 
      },
      helperLicense: { 
        folder: 'Helper-Licenses', 
        prefix: 'HELPER-LICENSE', 
        required: false 
      }
    };

    // Check for required documents ONLY in create mode (not edit)
    const isEditMode = req.method === 'PUT' || req.params.id;
    if (!isEditMode) {
      const missingRequiredDocs = [];
      for (const [docType, config] of Object.entries(documentTypes)) {
        if (config.required && !req.files[docType]) {
          missingRequiredDocs.push(docType.replace('Document', '').toUpperCase());
        }
      }

      if (missingRequiredDocs.length > 0) {
        console.log('❌ Missing required documents:', missingRequiredDocs);
        return res.status(400).json({ 
          message: `Missing required documents: ${missingRequiredDocs.join(', ')}` 
        });
      }
    } else {
      console.log('✅ Edit mode detected - skipping required document validation');
    }

    for (const [docType, config] of Object.entries(documentTypes)) {
      const file = req.files[docType];
      
      if (file) {
        const folderPath = path.join(DOCUMENTS_BASE_PATH, 'Helper-Documents', config.folder);
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true });
        }

        const fileExtension = path.extname(file.name);
        // Use upload date + helper identifier + prefix for unique filenames (matches driver pattern)
        const fileName = `${uploadDate}_${cleanName}_${config.prefix}${fileExtension}`;
        const filePath = path.join(folderPath, fileName);

        try {
          await file.mv(filePath);
          console.log(`✅ Saved ${config.prefix} document to:`, filePath);
          
          // Verify file was actually saved
          if (fs.existsSync(filePath)) {
            console.log(`✅ Verified: ${config.prefix} document exists on disk`);
          }
          
          const relPath = `Helper-Documents/${config.folder}/${fileName}`;
          const cloudPath = await uploadToFirebaseStorage(filePath, relPath, file.mimetype);
          uploadedDocuments[docType] = {
            filename: fileName,
            originalName: file.name,
            fullPath: filePath,
            relativePath: path.join('Helper-Documents', config.folder, fileName),
            storagePath: cloudPath || relPath,
            uploadDate: new Date().toISOString(),
            fileSize: file.size,
            mimeType: file.mimetype,
            documentType: config.prefix
          };
        } catch (moveError) {
          console.error(`❌ Failed to save ${config.prefix} document:`, moveError);
          errors.push(`Failed to save ${config.prefix} document: ${moveError.message}`);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ 
        message: 'Document upload failed', 
        errors: errors 
      });
    }

    req.uploadedDocuments = uploadedDocuments;
    console.log(`✅ Helper middleware complete, uploaded documents:`, uploadedDocuments);
    next();

  } catch (error) {
    console.error('Helper document upload error:', error);
    res.status(500).json({ 
      message: 'Error handling document upload', 
      error: error.message 
    });
  }
};

// Document upload middleware for staff
const uploadStaffDocuments = async (req, res, next) => {
  console.log('👔 ===== uploadStaffDocuments middleware called =====');
  console.log('📄 Files received:', req.files ? Object.keys(req.files) : 'No files');
  
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      console.log('No documents uploaded, continuing without document processing');
      req.uploadedDocuments = {};
      return next();
    }

    // Use staff ID from URL params for EDIT, or name + timestamp for CREATE
    const staffId = req.params.id;
    const staffName = req.body.staffName || req.body.StaffName || 'UnknownStaff';
    
    console.log('👤 Processing documents for staff ID:', staffId, 'Name:', staffName);

    // Create unique filename base
    let cleanName;
    if (staffId) {
      // EDIT mode: Use staff ID
      cleanName = `Staff${staffId}`.replace(/[^a-zA-Z0-9]/g, '');
    } else {
      // CREATE mode: Use name + timestamp for uniqueness
      const timestamp = Date.now();
      const cleanStaffName = staffName.replace(/[^a-zA-Z0-9]/g, '');
      cleanName = `${cleanStaffName}_${timestamp}`;
    }
    
    const uploadDate = new Date().toISOString().split('T')[0];

    const uploadedDocuments = {};
    const errors = [];
    
    const documentTypes = {
      validId: { 
        folder: 'Valid-IDs', 
        prefix: 'VALID-ID', 
        required: true 
      },
      employmentContract: { 
        folder: 'Employment-Contracts', 
        prefix: 'CONTRACT', 
        required: true 
      },
      medicalCertificate: { 
        folder: 'Medical-Certificates', 
        prefix: 'MEDICAL', 
        required: false 
      },
      certifications: { 
        folder: 'Certifications', 
        prefix: 'CERT', 
        required: false 
      }
    };

    // Check for required documents ONLY in create mode (not edit)
    const isEditMode = req.method === 'PUT' || req.params.id;
    if (!isEditMode) {
      const missingRequiredDocs = [];
      for (const [docType, config] of Object.entries(documentTypes)) {
        if (config.required && !req.files[docType]) {
          missingRequiredDocs.push(docType.replace('Document', '').toUpperCase());
        }
      }

      if (missingRequiredDocs.length > 0) {
        console.log('❌ Missing required documents:', missingRequiredDocs);
        return res.status(400).json({ 
          message: `Missing required documents: ${missingRequiredDocs.join(', ')}` 
        });
      }
    } else {
      console.log('✅ Edit mode detected - skipping required document validation');
    }

    for (const [docType, config] of Object.entries(documentTypes)) {
      const file = req.files[docType];
      
      if (file) {
        const folderPath = path.join(DOCUMENTS_BASE_PATH, 'Staff-Documents', config.folder);
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true });
        }

        const fileExtension = path.extname(file.name);
        // Use original filename with prefix to avoid conflicts
        const originalName = path.basename(file.name, fileExtension);
        const fileName = `${originalName}_${config.prefix}${fileExtension}`;
        const filePath = path.join(folderPath, fileName);

        try {
          await file.mv(filePath);
          console.log(`✅ Saved ${config.prefix} document to:`, filePath);
          
          // Verify file was actually saved
          if (fs.existsSync(filePath)) {
            console.log(`✅ Verified: ${config.prefix} document exists on disk`);
          }
          
          const relPath = `Staff-Documents/${config.folder}/${fileName}`;
          const cloudPath = await uploadToFirebaseStorage(filePath, relPath, file.mimetype);
          uploadedDocuments[docType] = {
            filename: fileName,
            originalName: file.name,
            fullPath: filePath,
            relativePath: path.join('Staff-Documents', config.folder, fileName),
            storagePath: cloudPath || relPath,
            uploadDate: new Date().toISOString(),
            fileSize: file.size,
            mimeType: file.mimetype,
            documentType: config.prefix
          };
        } catch (moveError) {
          console.error(`❌ Failed to save ${config.prefix} document:`, moveError);
          errors.push(`Failed to save ${config.prefix} document: ${moveError.message}`);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ 
        message: 'Document upload failed', 
        errors: errors 
      });
    }

    req.uploadedDocuments = uploadedDocuments;
    console.log(`✅ Staff middleware complete, uploaded documents:`, uploadedDocuments);
    next();

  } catch (error) {
    console.error('Staff document upload error:', error);
    res.status(500).json({ 
      message: 'Error handling document upload', 
      error: error.message 
    });
  }
};

// Document upload middleware for clients
const uploadClientDocuments = async (req, res, next) => {
  console.log('🏢 ===== uploadClientDocuments middleware called =====');
  console.log('📄 Files received:', req.files ? Object.keys(req.files) : 'No files');
  
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      console.log('No documents uploaded, continuing without document processing');
      req.uploadedDocuments = {};
      return next();
    }

    // Use client ID from URL params for EDIT, or name + timestamp for CREATE
    const clientId = req.params.id;
    const clientName = req.body.clientName || req.body.ClientName || 'UnknownClient';
    
    console.log('🏢 Processing documents for client ID:', clientId, 'Name:', clientName);

    // Create unique filename base
    let cleanName;
    if (clientId) {
      // EDIT mode: Use client ID
      cleanName = `Client${clientId}`.replace(/[^a-zA-Z0-9]/g, '');
    } else {
      // CREATE mode: Use name + timestamp for uniqueness
      const timestamp = Date.now();
      const cleanClientName = clientName.replace(/[^a-zA-Z0-9]/g, '');
      cleanName = `${cleanClientName}_${timestamp}`;
    }
    
    const uploadDate = new Date().toISOString().split('T')[0];

    const uploadedDocuments = {};
    const errors = [];

    const documentTypes = {
      businessPermit: { 
        folder: 'Business-Permits', 
        prefix: 'PERMIT', 
        required: true 
      },
      serviceContract: { 
        folder: 'Contracts', 
        prefix: 'CONTRACT', 
        required: false 
      },
      validId: { 
        folder: 'Valid-IDs', 
        prefix: 'ID', 
        required: true 
      },
      taxCertificate: { 
        folder: 'Tax-Certificates', 
        prefix: 'TAX', 
        required: false 
      }
    };

    // Check for required documents ONLY in create mode (not edit)
    const isEditMode = req.method === 'PUT' || req.params.id;
    if (!isEditMode) {
      const missingRequiredDocs = [];
      for (const [docType, config] of Object.entries(documentTypes)) {
        if (config.required && !req.files[docType]) {
          missingRequiredDocs.push(docType.replace('Document', '').toUpperCase());
        }
      }

      if (missingRequiredDocs.length > 0) {
        console.log('❌ Missing required documents:', missingRequiredDocs);
        return res.status(400).json({ 
          message: `Missing required documents: ${missingRequiredDocs.join(', ')}` 
        });
      }
    } else {
      console.log('✅ Edit mode detected - skipping required document validation');
    }

    for (const [docType, config] of Object.entries(documentTypes)) {
      const file = req.files[docType];

      if (file) {
        const folderPath = path.join(DOCUMENTS_BASE_PATH, 'Client-Documents', config.folder);
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true });
        }

        const fileExtension = path.extname(file.name);
        // Use original filename with prefix to avoid conflicts
        const originalName = path.basename(file.name, fileExtension);
        const fileName = `${originalName}_${config.prefix}${fileExtension}`;
        const filePath = path.join(folderPath, fileName);

        try {
          await file.mv(filePath);
          console.log(`✅ Saved ${config.prefix} document to:`, filePath);
          
          // Verify file was actually saved
          if (fs.existsSync(filePath)) {
            console.log(`✅ Verified: ${config.prefix} document exists on disk`);
          }
          
          const relPath = `Client-Documents/${config.folder}/${fileName}`;
          const cloudPath = await uploadToFirebaseStorage(filePath, relPath, file.mimetype);
          uploadedDocuments[docType] = {
            filename: fileName,
            originalName: file.name,
            fullPath: filePath,
            relativePath: path.join('Client-Documents', config.folder, fileName),
            storagePath: cloudPath || relPath,
            uploadDate: new Date().toISOString(),
            fileSize: file.size,
            mimeType: file.mimetype,
            documentType: config.prefix
          };
        } catch (moveError) {
          console.error(`❌ Failed to save ${config.prefix} document:`, moveError);
          errors.push(`Failed to save ${config.prefix} document: ${moveError.message}`);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ 
        message: 'Document upload failed', 
        errors: errors 
      });
    }

    req.uploadedDocuments = uploadedDocuments;
    console.log(`✅ Client middleware complete, uploaded documents:`, uploadedDocuments);
    next();

  } catch (error) {
    console.error('Client document upload error:', error);
    res.status(500).json({ 
      message: 'Error handling document upload', 
      error: error.message 
    });
  }
};

// Helper function to serve documents
const serveDocument = async (req, res) => {
  try {
    const { type, id, docType } = req.params;
    
    // Get the appropriate service based on type
    let service;
    switch (type) {
      case 'truck':
        service = require('../services/TruckService');
        break;
      case 'driver':
        service = require('../services/DriverService');
        break;
      case 'helper':
        service = require('../services/HelperService');
        break;
      case 'staff':
        service = require('../services/StaffService');
        break;
      case 'client':
        service = require('../services/ClientService');
        break;
      default:
        return res.status(400).json({ message: 'Invalid document type' });
    }

    const record = await service.getById(id);
    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }

    const document = record.documents && record.documents[docType];
    if (!document || !document.fullPath) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if file exists
    if (!fs.existsSync(document.fullPath)) {
      return res.status(404).json({ message: 'File not found on disk' });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${document.originalName}"`);

    // Send file
    res.sendFile(document.fullPath);
  } catch (error) {
    console.error('Error serving document:', error);
    res.status(500).json({ message: 'Error accessing document' });
  }
};

module.exports = {
  uploadTruckDocuments,
  uploadDriverDocuments,
  uploadHelperDocuments,
  uploadStaffDocuments,
  uploadClientDocuments,
  serveDocument,
  DOCUMENTS_BASE_PATH
};
