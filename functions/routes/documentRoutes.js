const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { DOCUMENT_ROOT, getAbsolutePath } = require('../config/documentConfig');
const FileUploadService = require('../services/FileUploadService');

// Route to serve document files
router.get('/view/:filePath(*)', async (req, res) => {
    try {
        // Get the relative file path from the URL parameter and decode it
        const relativePath = decodeURIComponent(req.params.filePath)
            .split('/')
            .map(part => decodeURIComponent(part)) // Decode each path part again to handle double-encoded slashes
            .join(path.sep); // Use proper path separator for the OS
        
        console.log('=== DOCUMENT ROUTE DEBUG ===');
        console.log('Current working directory:', process.cwd());
        console.log('Document Root:', DOCUMENT_ROOT);
        console.log('Document Root exists:', fs.existsSync(DOCUMENT_ROOT));
        console.log('Requested relative path:', relativePath);
        
        // Convert to absolute path using our document root
        const absolutePath = path.join(DOCUMENT_ROOT, relativePath);
        
        // Log the exact file we're looking for
        console.log('Looking for file at:', absolutePath);
        console.log('File exists?', fs.existsSync(absolutePath));
        console.log('Resolved absolute path:', absolutePath);
        
        // Debug: List contents of relevant directories
        const mainFolder = relativePath.split('/')[0];
        const subFolder = relativePath.split('/')[1];
        
        console.log('Checking directory structure:');
        console.log('Main folder exists:', fs.existsSync(path.join(DOCUMENT_ROOT, mainFolder)));
        if (subFolder) {
            console.log('Subfolder exists:', fs.existsSync(path.join(DOCUMENT_ROOT, mainFolder, subFolder)));
        }
        console.log('File exists:', fs.existsSync(absolutePath));
        
        try {
            console.log('Contents of main folder:', fs.readdirSync(path.join(DOCUMENT_ROOT, mainFolder)));
            if (subFolder) {
                console.log('Contents of subfolder:', fs.readdirSync(path.join(DOCUMENT_ROOT, mainFolder, subFolder)));
            }
        } catch (err) {
            console.log('Error reading directory contents:', err.message);
        }
        
        // Log directory contents to help debug
        try {
            console.log('Contents of document root:', fs.readdirSync(DOCUMENT_ROOT));
        } catch (err) {
            console.log('Could not read document root:', err.message);
        }

        // Security check - make sure the resolved path is within DOCUMENT_ROOT
        if (!absolutePath.startsWith(DOCUMENT_ROOT)) {
            console.error('Security check failed - path is outside DOCUMENT_ROOT');
            return res.status(403).send('Access denied');
        }

        // Get file extension
        const ext = path.extname(relativePath).toLowerCase();
        
        // Set content type based on file extension
        const contentTypes = {
            '.pdf': 'application/pdf',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        };

        // Set appropriate content type or default to octet-stream
        const contentType = contentTypes[ext] || 'application/octet-stream';

        // Check if file exists locally
        if (fs.existsSync(absolutePath)) {
            // Serve from local filesystem
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', 'inline');
            const fileStream = fs.createReadStream(absolutePath);
            fileStream.pipe(res);
        } else {
            // Fall back to Firebase Storage
            console.log(' Local file not found, trying Firebase Storage...');
            try {
                const { storageBucket } = require('../config/firebase');
                if (!storageBucket) {
                    return res.status(404).send('File not found');
                }
                // Use forward slashes for Storage path
                const storagePath = relativePath.split(path.sep).join('/');
                const storageFile = storageBucket.file(storagePath);
                const [exists] = await storageFile.exists();
                if (!exists) {
                    console.log(' File not found in Firebase Storage either:', storagePath);
                    return res.status(404).send('File not found');
                }
                res.setHeader('Content-Type', contentType);
                res.setHeader('Content-Disposition', 'inline');
                storageFile.createReadStream().pipe(res);
            } catch (storageError) {
                console.error(' Firebase Storage error:', storageError);
                return res.status(404).send('File not found');
            }
        }

    } catch (error) {
        console.error('Error serving document:', error);
        res.status(500).send('Error accessing document');
    }
});

// List files in a directory
router.get('/list/:documentType/:subFolder?', (req, res) => {
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

// Get file info
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

// Delete file
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

module.exports = router;