const express = require('express');
const router = express.Router();
const fileUpload = require('express-fileupload');
const FileUploadService = require('../services/FileUploadService');
const path = require('path');

// Configure file upload middleware
router.use(fileUpload({
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  useTempFiles: false,
  debug: true
}));

// Enhanced file upload endpoint with replacement logic
router.post('/upload', async (req, res) => {
  try {
    console.log('📤 Enhanced upload endpoint called');
    console.log('📄 Files received:', req.files ? Object.keys(req.files) : 'No files');
    console.log('📄 Request body:', req.body);
    
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'No files uploaded' 
      });
    }

    const { documentType = 'general', subFolder = '', identifier = '' } = req.body;
    const uploadedFiles = [];
    const errors = [];

    // Process each uploaded file
    for (const [fieldName, file] of Object.entries(req.files)) {
      try {
        console.log(`📄 Processing file: ${file.name} (${file.size} bytes)`);
        
        const fileInfo = await FileUploadService.saveFile(
          file, 
          documentType, 
          subFolder, 
          identifier
        );
        
        uploadedFiles.push(fileInfo);
        console.log(`✅ File uploaded successfully: ${fileInfo.filename}`);
        
      } catch (fileError) {
        console.error(`❌ Error uploading file ${file.name}:`, fileError);
        errors.push({
          file: file.name,
          error: fileError.message
        });
      }
    }

    if (errors.length > 0 && uploadedFiles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'All file uploads failed',
        errors: errors
      });
    }

    res.json({
      success: true,
      message: 'Files uploaded successfully',
      files: uploadedFiles,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Upload failed', 
      error: error.message 
    });
  }
});

// Get files endpoint
router.get('/files/:documentType/:subFolder?', (req, res) => {
  try {
    const { documentType, subFolder = '' } = req.params;
    
    console.log(`📁 Listing files for: ${documentType}/${subFolder}`);
    
    const files = FileUploadService.listFiles(documentType, subFolder);
    
    res.json({
      success: true,
      documentType,
      subFolder,
      files: files
    });
    
  } catch (error) {
    console.error('❌ Error listing files:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error listing files', 
      error: error.message 
    });
  }
});

// Serve file endpoint
router.get('/serve/:filePath(*)', (req, res) => {
  try {
    const relativePath = decodeURIComponent(req.params.filePath);
    
    console.log('📄 Serving file:', relativePath);
    
    // Security check
    if (relativePath.includes('..') || relativePath.startsWith('/')) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const fileInfo = FileUploadService.getFileInfo(relativePath);
    
    if (!fileInfo || !fileInfo.isFile) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Set appropriate headers
    const contentType = FileUploadService.getContentType(fileInfo.fullPath);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    // Stream the file
    const fileStream = FileUploadService.getFileStream(relativePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('❌ Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error serving file' });
      }
    });
    
  } catch (error) {
    console.error('❌ Error serving file:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error serving file', 
      error: error.message 
    });
  }
});

// Delete file endpoint
router.delete('/delete/:filePath(*)', (req, res) => {
  try {
    const relativePath = decodeURIComponent(req.params.filePath);
    
    console.log('🗑️ Deleting file:', relativePath);
    
    // Security check
    if (relativePath.includes('..') || relativePath.startsWith('/')) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const success = FileUploadService.deleteFile(relativePath);
    
    if (success) {
      res.json({
        success: true,
        message: 'File deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
  } catch (error) {
    console.error('❌ Error deleting file:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting file', 
      error: error.message 
    });
  }
});

// Get file info endpoint
router.get('/info/:filePath(*)', (req, res) => {
  try {
    const relativePath = decodeURIComponent(req.params.filePath);
    
    console.log('📄 Getting file info:', relativePath);
    
    // Security check
    if (relativePath.includes('..') || relativePath.startsWith('/')) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const fileInfo = FileUploadService.getFileInfo(relativePath);
    
    if (!fileInfo) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    res.json({
      success: true,
      file: fileInfo
    });
    
  } catch (error) {
    console.error('❌ Error getting file info:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error getting file info', 
      error: error.message 
    });
  }
});

module.exports = router;
