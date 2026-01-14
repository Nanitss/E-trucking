const express = require('express');
const router = express.Router();
const simpleFileController = require('../controllers/simpleFileController');

// Health check endpoint
router.get('/health', simpleFileController.health);

// Truck document endpoints
router.get('/trucks-with-documents', simpleFileController.getTrucksWithDocuments);
router.get('/truck-documents/:plate', simpleFileController.getTruckDocuments);

// Driver document endpoints
router.get('/drivers-with-documents', simpleFileController.getDriversWithDocuments);
router.get('/driver-documents/:name', simpleFileController.getDriverDocuments);

// Helper document endpoints
router.get('/helpers-with-documents', simpleFileController.getHelpersWithDocuments);
router.get('/helper-documents/:name', simpleFileController.getHelperDocuments);

// Staff document endpoints
router.get('/staff-with-documents', simpleFileController.getStaffWithDocuments);
router.get('/staff-documents/:name', simpleFileController.getStaffDocuments);

// Client document endpoints
router.get('/clients-with-documents', simpleFileController.getClientsWithDocuments);
router.get('/client-documents/:name', simpleFileController.getClientDocuments);

// Comprehensive scan endpoint
router.get('/all-entities-with-documents', simpleFileController.getAllEntitiesWithDocuments);

module.exports = router;
