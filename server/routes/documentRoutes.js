const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { DOCUMENT_ROOT, getAbsolutePath } = require('../config/documentConfig');

// Route to serve document files
router.get('/view/:filePath(*)', (req, res) => {
    try {
        // Get the relative file path from the URL parameter and decode it
        const relativePath = decodeURIComponent(req.params.filePath)
            .split('/')
            .map(part => decodeURIComponent(part)) // Decode each path part again to handle double-encoded slashes
            .join(path.sep); // Use proper path separator for the OS
        
        console.log('Document Root:', DOCUMENT_ROOT);
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
        console.log('Contents of document root:', fs.readdirSync(DOCUMENT_ROOT));

        // Security check - make sure the resolved path is within DOCUMENT_ROOT
        if (!absolutePath.startsWith(DOCUMENT_ROOT)) {
            console.error('Security check failed - path is outside DOCUMENT_ROOT');
            return res.status(403).send('Access denied');
        }

        // Check if file exists
        if (!fs.existsSync(absolutePath)) {
            return res.status(404).send('File not found');
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
        
        // Set headers
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', 'inline');

        // Stream the file
        const fileStream = fs.createReadStream(absolutePath);
        fileStream.pipe(res);

    } catch (error) {
        console.error('Error serving document:', error);
        res.status(500).send('Error accessing document');
    }
});

module.exports = router;