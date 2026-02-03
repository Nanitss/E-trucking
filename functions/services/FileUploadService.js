const fs = require('fs');
const path = require('path');
const { DOCUMENT_ROOT } = require('../config/documentConfig');

class FileUploadService {
  constructor() {
    this.basePath = DOCUMENT_ROOT;
    this.ensureBaseDirectory();
  }

  // Ensure base directory exists
  ensureBaseDirectory() {
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
      console.log('✅ Created base uploads directory:', this.basePath);
    }
  }

  // Get upload path for specific document type
  getUploadPath(documentType, subFolder = '') {
    const uploadPath = path.join(this.basePath, documentType, subFolder);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
      console.log('✅ Created directory:', uploadPath);
    }
    
    return uploadPath;
  }

  // Save file with replacement logic
  async saveFile(file, documentType, subFolder = '', identifier = '') {
    try {
      const uploadPath = this.getUploadPath(documentType, subFolder);
      
      // Generate filename with identifier if provided
      const fileExtension = path.extname(file.name);
      const baseName = path.basename(file.name, fileExtension);
      
      let fileName;
      if (identifier) {
        // If identifier provided, use it to replace existing files
        fileName = `${identifier}_${baseName}${fileExtension}`;
        
        // Check if file with same identifier exists and delete it
        const existingFiles = fs.readdirSync(uploadPath);
        const filesToDelete = existingFiles.filter(f => f.startsWith(identifier + '_'));
        
        filesToDelete.forEach(existingFile => {
          const existingFilePath = path.join(uploadPath, existingFile);
          try {
            fs.unlinkSync(existingFilePath);
            console.log('🗑️ Deleted existing file:', existingFile);
          } catch (deleteError) {
            console.warn('⚠️ Could not delete existing file:', existingFile, deleteError.message);
          }
        });
      } else {
        // Generate unique filename
        const timestamp = Date.now();
        const randomSuffix = Math.round(Math.random() * 1E9);
        fileName = `${baseName}_${timestamp}_${randomSuffix}${fileExtension}`;
      }

      const filePath = path.join(uploadPath, fileName);
      
      // Move file to destination
      await file.mv(filePath);
      
      console.log('✅ File saved successfully:', fileName);
      
      return {
        filename: fileName,
        originalName: file.name,
        fullPath: filePath,
        relativePath: path.relative(this.basePath, filePath),
        uploadDate: new Date().toISOString(),
        fileSize: file.size,
        mimeType: file.mimetype,
        documentType: documentType,
        subFolder: subFolder
      };
      
    } catch (error) {
      console.error('❌ Error saving file:', error);
      throw new Error(`Failed to save file: ${error.message}`);
    }
  }

  // Get file info
  getFileInfo(relativePath) {
    const fullPath = path.join(this.basePath, relativePath);
    
    if (!fs.existsSync(fullPath)) {
      return null;
    }
    
    const stats = fs.statSync(fullPath);
    return {
      filename: path.basename(fullPath),
      fullPath: fullPath,
      relativePath: relativePath,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory()
    };
  }

  // List files in directory
  listFiles(documentType, subFolder = '') {
    try {
      const dirPath = this.getUploadPath(documentType, subFolder);
      const files = fs.readdirSync(dirPath);
      
      return files.map(file => {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        const relativePath = path.relative(this.basePath, filePath);
        
        return {
          filename: file,
          relativePath: relativePath,
          fullPath: filePath,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          isFile: stats.isFile(),
          isDirectory: stats.isDirectory()
        };
      });
    } catch (error) {
      console.error('❌ Error listing files:', error);
      return [];
    }
  }

  // Delete file
  deleteFile(relativePath) {
    try {
      const fullPath = path.join(this.basePath, relativePath);
      
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log('🗑️ File deleted:', relativePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error deleting file:', error);
      return false;
    }
  }

  // Get file stream for serving
  getFileStream(relativePath) {
    const fullPath = path.join(this.basePath, relativePath);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error('File not found');
    }
    
    return fs.createReadStream(fullPath);
  }

  // Get content type for file
  getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.txt': 'text/plain'
    };
    
    return contentTypes[ext] || 'application/octet-stream';
  }
}

module.exports = new FileUploadService();
