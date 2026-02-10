const path = require('path');
const fs = require('fs');
const os = require('os');

// Detect Cloud Functions environment
const isCloudFunctions = process.env.FUNCTION_TARGET || process.env.K_SERVICE;
const UPLOAD_BASE = isCloudFunctions
  ? path.join(os.tmpdir(), 'uploads')
  : path.join(__dirname, '..', 'uploads');

const uploadDocument = (req, res, next) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return next();
    }

    const file = req.files.document;
    const userType = req.body.userType || 'general';
    const uploadPath = path.join(UPLOAD_BASE, `${userType}-documents`);

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    const fileName = `${Date.now()}_${file.name}`;
    const filePath = path.join(uploadPath, fileName);

    file.mv(filePath, (err) => {
      if (err) {
        return res.status(500).json({ message: "Error uploading file", error: err });
      }
      req.documentPath = `${userType}-documents/${fileName}`;
      next();
    });
  } catch (error) {
    res.status(500).json({ message: "Error handling file upload", error: error.message });
  }
};

const uploadHelperDocuments = async (req, res, next) => {
  try {
    console.log('\n=== FILE UPLOAD MIDDLEWARE ===');
    console.log('📁 Processing helper document uploads...');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Files received:', req.files ? Object.keys(req.files) : 'none');
    console.log('Body keys:', req.body ? Object.keys(req.body) : 'none');

    if (!req.files || Object.keys(req.files).length === 0) {
      console.log('⚠️ No files uploaded - continuing without files');
      req.uploadedDocuments = {};
      return next();
    }

    const uploadPath = path.join(UPLOAD_BASE, 'helper-documents');
    console.log('Upload path:', uploadPath);

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
      console.log('✅ Created upload directory:', uploadPath);
    }

    const uploadedDocuments = {};
    const allowedFields = ['validId', 'barangayClearance', 'medicalCertificate', 'helperLicense'];
    const uploadPromises = [];

    // Process each uploaded file
    for (const fieldName of allowedFields) {
      if (req.files[fieldName]) {
        const file = req.files[fieldName];
        console.log(`Processing ${fieldName}:`, {
          name: file.name,
          size: file.size,
          mimetype: file.mimetype
        });
        
        // Validate file size (25MB max)
        if (file.size > 25 * 1024 * 1024) {
          console.error(`❌ File ${fieldName} too large: ${file.size} bytes`);
          return res.status(400).json({ 
            message: `File ${fieldName} is too large. Maximum size is 25MB.`,
            field: fieldName,
            size: file.size
          });
        }

        // Validate file type
        const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
        const fileExtension = path.extname(file.name).toLowerCase();
        if (!allowedExtensions.includes(fileExtension)) {
          console.error(`❌ Invalid file type for ${fieldName}: ${fileExtension}`);
          return res.status(400).json({ 
            message: `Invalid file type for ${fieldName}. Only PDF, JPG, PNG allowed.`,
            field: fieldName,
            extension: fileExtension
          });
        }

        const timestamp = Date.now();
        const fileName = `${timestamp}_${fieldName}${fileExtension}`;
        const filePath = path.join(uploadPath, fileName);

        // Create upload promise
        const uploadPromise = new Promise((resolve, reject) => {
          file.mv(filePath, (err) => {
            if (err) {
              console.error(`❌ Error uploading ${fieldName}:`, err);
              reject(new Error(`Failed to save ${fieldName}: ${err.message}`));
            } else {
              console.log(`✅ Uploaded ${fieldName}: ${fileName}`);
              uploadedDocuments[fieldName] = {
                originalName: file.name,
                fileName: fileName,
                path: `helper-documents/${fileName}`,
                size: file.size,
                mimeType: file.mimetype,
                uploadedAt: new Date().toISOString()
              };
              resolve();
            }
          });
        });

        uploadPromises.push(uploadPromise);
      }
    }

    // Wait for all uploads to complete
    try {
      await Promise.all(uploadPromises);
      console.log('✅ All documents uploaded successfully:', Object.keys(uploadedDocuments));
    } catch (uploadError) {
      console.error('❌ File upload failed:', uploadError);
      return res.status(400).json({ 
        message: "File upload failed",
        error: uploadError.message 
      });
    }

    req.uploadedDocuments = uploadedDocuments;
    console.log('=== FILE UPLOAD COMPLETE ===\n');
    next();
  } catch (error) {
    console.error('❌ Error in upload middleware:', error);
    console.error('Stack:', error.stack);
    return res.status(400).json({ 
      message: "Error processing file upload",
      error: error.message,
      stack: error.stack 
    });
  }
};

module.exports = { uploadDocument, uploadHelperDocuments };