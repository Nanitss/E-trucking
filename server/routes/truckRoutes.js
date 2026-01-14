const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { DOCUMENT_ROOT } = require('../config/documentConfig');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Create directory if it doesn't exist
        const uploadPath = path.join(DOCUMENT_ROOT, 'Truck-Documents', 'OR-CR-Files');
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter to validate file types
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, JPG, and PNG files are allowed.'));
    }
};

// Configure multer with storage and file filter
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 25 * 1024 * 1024 // 25MB limit
    }
});

// Fields configuration for document uploads
const documentFields = [
    { name: 'orDocument', maxCount: 1 },
    { name: 'crDocument', maxCount: 1 },
    { name: 'insuranceDocument', maxCount: 1 },
    { name: 'licenseRequirement', maxCount: 1 }
];

// Route to handle truck creation with document uploads
router.post('/admin/trucks', upload.fields(documentFields), async (req, res) => {
    try {
        console.log('Received truck creation request');
        console.log('Files:', req.files);
        console.log('Body:', req.body);

        // Validate required documents
        const requiredDocs = ['orDocument', 'crDocument', 'insuranceDocument'];
        const missingDocs = requiredDocs.filter(doc => !req.files[doc]);
        
        if (missingDocs.length > 0) {
            return res.status(400).json({
                error: `Missing required documents: ${missingDocs.join(', ')}`
            });
        }

        // Process uploaded files and create document records
        const documents = {};
        Object.entries(req.files).forEach(([fieldName, files]) => {
            const file = files[0]; // Get first file from array
            documents[fieldName] = {
                filename: file.filename,
                originalName: file.originalname,
                path: path.relative(DOCUMENT_ROOT, file.path),
                mimetype: file.mimetype,
                size: file.size
            };
        });

        // Here you would typically save the truck data to your database
        // For now, we'll just return success with the document info
        res.status(201).json({
            message: 'Truck created successfully',
            documents: documents
        });

    } catch (error) {
        console.error('Error handling truck creation:', error);
        res.status(500).json({
            error: 'Failed to process truck creation',
            details: error.message
        });
    }
});

// Route to handle truck updates with document uploads
router.put('/admin/trucks/:id', upload.fields(documentFields), async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`Received truck update request for ID: ${id}`);
        console.log('Files:', req.files);
        console.log('Body:', req.body);

        // Process uploaded files
        const documents = {};
        if (req.files) {
            Object.entries(req.files).forEach(([fieldName, files]) => {
                const file = files[0];
                documents[fieldName] = {
                    filename: file.filename,
                    originalName: file.originalname,
                    path: path.relative(DOCUMENT_ROOT, file.path),
                    mimetype: file.mimetype,
                    size: file.size
                };
            });
        }

        // Here you would typically update the truck data in your database
        // For now, we'll just return success with the document info
        res.json({
            message: 'Truck updated successfully',
            documents: documents
        });

    } catch (error) {
        console.error('Error handling truck update:', error);
        res.status(500).json({
            error: 'Failed to process truck update',
            details: error.message
        });
    }
});

module.exports = router;
