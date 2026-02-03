const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { uploadTruckDocuments } = require('../middleware/documentUpload');
const { db } = require('../config/firebase');
const { authenticateJWT } = require('../middleware/auth');

// Get all trucks (basic route for Dashboard and other components)
router.get('/', authenticateJWT, async (req, res) => {
    try {
        console.log('Fetching all trucks (basic route)');
        const trucksSnapshot = await db.collection('trucks').get();
        const trucks = trucksSnapshot.docs
            .filter(doc => {
                // Validate truck ID - skip malformed documents
                const truckId = doc.id;
                if (!truckId || truckId.length !== 20 || /document/i.test(truckId)) {
                    console.warn(`⚠️ Skipping truck with invalid ID: ${truckId}`);
                    return false;
                }
                return true;
            })
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        res.json(trucks);
    } catch (error) {
        console.error('Error fetching trucks:', error);
        res.status(500).json({ error: 'Failed to fetch trucks' });
    }
});

// Get available trucks for allocation (not allocated to any client)
router.get('/available', authenticateJWT, async (req, res) => {
    try {
        console.log('\n\n');
        console.log('='.repeat(80));
        console.log('🚨 /API/TRUCKS/AVAILABLE ENDPOINT HIT!');
        console.log('='.repeat(80));
        console.log('🔍 Fetching available trucks for allocation...');
        
        // Get all trucks
        const trucksSnapshot = await db.collection('trucks').get();
        
        // Get all client allocations to exclude allocated trucks
        const allocationsSnapshot = await db.collection('clientTruckAllocations').get();
        const allocatedTruckIds = new Set();
        
        allocationsSnapshot.docs.forEach(doc => {
            const allocation = doc.data();
            if (allocation.truckId || allocation.TruckID) {
                allocatedTruckIds.add(allocation.truckId || allocation.TruckID);
            }
        });
        
        console.log(`📊 Found ${allocatedTruckIds.size} allocated trucks`);
        
        // Filter trucks: not allocated AND status is available/free
        const allTrucks = trucksSnapshot.docs
            .filter(doc => {
                // Validate truck ID - skip malformed documents
                const truckId = doc.id;
                if (!truckId || truckId.length !== 20 || /document/i.test(truckId)) {
                    console.warn(`⚠️ Skipping truck with invalid ID: ${truckId}`);
                    return false;
                }
                return true;
            })
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        
        console.log(`📊 Total trucks in database: ${allTrucks.length}`);
        
        const availableTrucks = allTrucks.filter(truck => {
            console.log(`\n🔍 Checking truck ${truck.id}:`, {
                truckPlate: truck.truckPlate || truck.TruckPlate,
                allocationStatus: truck.allocationStatus || truck.AllocationStatus,
                availabilityStatus: truck.availabilityStatus || truck.AvailabilityStatus,
                operationalStatus: truck.operationalStatus || truck.OperationalStatus,
                truckStatus: truck.truckStatus || truck.TruckStatus,
                isAllocated: allocatedTruckIds.has(truck.id)
            });
            
            // Exclude already allocated trucks
            if (allocatedTruckIds.has(truck.id)) {
                console.log(`   ❌ Already allocated to a client`);
                return false;
            }
            
            // Check various status fields (handling different naming conventions)
            const allocationStatus = truck.allocationStatus || truck.AllocationStatus;
            const availabilityStatus = truck.availabilityStatus || truck.AvailabilityStatus;
            const operationalStatus = truck.operationalStatus || truck.OperationalStatus;
            
            // Include truck if:
            // 1. Allocation status is 'Available' (not allocated)
            // 2. OR no allocation status set (legacy trucks)
            // 3. AND operational status is not 'Inactive'
            const isAvailableForAllocation = 
                (!allocationStatus || allocationStatus === 'Available') &&
                (!operationalStatus || operationalStatus !== 'Inactive');
            
            console.log(`   ${isAvailableForAllocation ? '✅' : '❌'} Available: ${isAvailableForAllocation}`);
            
            return isAvailableForAllocation;
        });
        
        console.log(`✅ Returning ${availableTrucks.length} available trucks`);
        console.log(`📊 DEBUG: Total trucks fetched: ${allTrucks.length}`);
        console.log(`📊 DEBUG: Allocated truck IDs:`, Array.from(allocatedTruckIds));
        
        // TEMPORARY: Return all trucks for debugging
        console.log('⚠️ DEBUG MODE: Returning ALL trucks (no filtering)');
        res.json(allTrucks);
        
    } catch (error) {
        console.error('❌ Error fetching available trucks:', error);
        res.status(500).json({ 
            error: 'Failed to fetch available trucks',
            details: error.message 
        });
    }
});

// Get all trucks with actual documents
router.get('/actual-documents', authenticateJWT, async (req, res) => {
    try {
        console.log('Fetching trucks with actual documents');
        const trucksSnapshot = await db.collection('trucks').get();
        const trucks = [];

        for (const doc of trucksSnapshot.docs) {
            // Validate truck ID - skip malformed documents
            const truckId = doc.id;
            if (!truckId || truckId.length !== 20 || /document/i.test(truckId)) {
                console.warn(`⚠️ Skipping truck with invalid ID: ${truckId}`);
                continue;
            }
            
            const truck = { id: doc.id, ...doc.data() };
            
            // Check for actual documents in the filesystem
            // Go up from routes to server, then to client, then to project root
            const DOCUMENTS_BASE_PATH = path.join(__dirname, '..', '..', '..', 'uploads');
            const documents = {};
            
            // Check each document type
            const documentTypes = ['orDocument', 'crDocument', 'insuranceDocument', 'licenseRequirement'];
            let requiredDocumentCount = 0;
            let optionalDocumentCount = 0;
            
            for (const docType of documentTypes) {
                if (truck.documents && truck.documents[docType]) {
                    // Determine the correct subfolder for each document type
                    let subfolder = '';
                    if (docType === 'orDocument' || docType === 'crDocument') {
                        subfolder = 'OR-CR-Files';
                    } else if (docType === 'insuranceDocument') {
                        subfolder = 'Insurance-Papers';
                    } else if (docType === 'licenseRequirement') {
                        subfolder = 'License-Documents';
                    }
                    
                    const docPath = path.join(DOCUMENTS_BASE_PATH, 'Truck-Documents', subfolder, truck.documents[docType].filename);
                    
                    if (fs.existsSync(docPath)) {
                        documents[docType] = truck.documents[docType];
                        if (docType !== 'licenseRequirement') {
                            requiredDocumentCount++;
                        } else {
                            optionalDocumentCount++;
                        }
                    }
                }
            }
            
            // Add document compliance information
            truck.documentCompliance = {
                documentCount: Object.keys(documents).length,
                requiredDocumentCount,
                optionalDocumentCount,
                overallStatus: requiredDocumentCount === 3 ? 'complete' : 'incomplete'
            };
            
            truck.documents = documents;
            trucks.push(truck);
        }

        res.json(trucks);
    } catch (error) {
        console.error('Error fetching trucks with documents:', error);
        res.status(500).json({ error: 'Failed to fetch trucks with documents' });
    }
});

// ─── POST /api/trucks/fix-stuck-statuses - Fix trucks stuck in On-Delivery ──────────
// MUST BE BEFORE /:id ROUTES to prevent route matching issues
router.post('/fix-stuck-statuses', authenticateJWT, async (req, res) => {
  try {
    console.log('🔧 POST /api/trucks/fix-stuck-statuses - Fixing stuck truck statuses');
    
    // Get all deliveries that are delivered, completed, or cancelled
    const finalStatuses = ['delivered', 'completed', 'cancelled'];
    const deliveriesSnapshot = await db.collection('deliveries').get();
    
    const finishedDeliveries = [];
    deliveriesSnapshot.forEach(doc => {
      const delivery = doc.data();
      if (delivery.deliveryStatus && finalStatuses.includes(delivery.deliveryStatus.toLowerCase())) {
        finishedDeliveries.push({
          id: doc.id,
          ...delivery
        });
      }
    });
    
    console.log(`Found ${finishedDeliveries.length} finished deliveries`);
    
    // Track unique trucks to restore
    const trucksToRestore = new Set();
    finishedDeliveries.forEach(delivery => {
      if (delivery.truckId) {
        trucksToRestore.add(delivery.truckId);
      }
    });
    
    console.log(`Trucks to check: ${trucksToRestore.size}`);
    
    // Restore truck statuses
    let trucksFixed = 0;
    const fixedTrucks = [];
    
    for (const truckId of trucksToRestore) {
      const truckRef = db.collection('trucks').doc(truckId);
      const truckDoc = await truckRef.get();
      
      if (truckDoc.exists) {
        const truck = truckDoc.data();
        const currentStatus = truck.truckStatus || truck.TruckStatus;
        
        // Only update if not already available or free
        if (currentStatus && !['available', 'free'].includes(currentStatus.toLowerCase())) {
          // Check if truck is allocated to determine correct status
          const allocationsSnapshot = await db.collection('allocations')
            .where('truckId', '==', truckId)
            .where('status', '==', 'active')
            .limit(1)
            .get();
          
          const newStatus = !allocationsSnapshot.empty ? 'free' : 'available';
          
          await truckRef.update({
            truckStatus: newStatus,
            TruckStatus: newStatus,
            availabilityStatus: newStatus,
            AvailabilityStatus: newStatus,
            activeDelivery: false,
            currentDeliveryId: null,
            updated_at: new Date()
          });
          
          const truckPlate = truck.truckPlate || truck.TruckPlate || truckId;
          console.log(`✅ Restored truck: ${truckPlate} (${currentStatus} → ${newStatus})`);
          fixedTrucks.push({ id: truckId, plate: truckPlate, oldStatus: currentStatus, newStatus });
          trucksFixed++;
        }
      }
    }
    
    res.json({
      message: `Successfully restored ${trucksFixed} truck(s) to available/free status`,
      totalChecked: trucksToRestore.size,
      fixed: trucksFixed,
      trucks: fixedTrucks
    });
    
  } catch (error) {
    console.error('Error fixing stuck truck statuses:', error);
    res.status(500).json({
      message: 'Error fixing stuck truck statuses',
      error: error.message
    });
  }
});

// Route to handle truck creation with document uploads
router.post('/', uploadTruckDocuments, async (req, res) => {
    try {
        console.log('🚛 Received truck creation request');
        console.log('📄 Files:', req.files ? Object.keys(req.files) : 'No files');
        console.log('📄 Body:', req.body);
        console.log('📄 Uploaded documents:', req.uploadedDocuments);

        const truckService = require('../services/TruckService');
        
        // Prepare truck data with uploaded documents
        const truckData = {
            ...req.body,
            documents: req.uploadedDocuments || {}
        };
        
        console.log('📊 Creating truck with data:', truckData);
        
        // Create the truck using TruckService (this will trigger registration expiry check)
        const newTruck = await truckService.createTruckWithStatus(truckData);
        
        console.log('✅ Truck created successfully:', newTruck.truckPlate);
        console.log('📊 Initial operational status:', newTruck.operationalStatus);
        
        res.status(201).json({
            message: 'Truck created successfully',
            truck: newTruck,
            documents: req.uploadedDocuments
        });

    } catch (error) {
        console.error('❌ Error handling truck creation:', error);
        res.status(500).json({
            error: 'Failed to process truck creation',
            details: error.message
        });
    }
});

// Route to serve truck documents - MUST come before GET /:id
router.get('/:id/documents/:docType', async (req, res) => {
    try {
        const { id, docType } = req.params;
        console.log(`🚛 Serving document ${docType} for truck ${id}`);
        
        const { serveDocument } = require('../middleware/documentUpload');
        // Use the serveDocument helper from documentUpload middleware
        await serveDocument(req, res);
    } catch (error) {
        console.error('❌ Error serving truck document:', error);
        res.status(500).json({
            error: 'Failed to serve document',
            details: error.message
        });
    }
});

// Get truck by ID - comes after more specific routes
router.get('/:id', authenticateJWT, async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`🚛 Fetching truck by ID: ${id}`);
        
        // Validate truck ID before processing
        if (!id || id.length !== 20 || /document/i.test(id)) {
            console.error(`❌ Invalid truck ID format: ${id}`);
            return res.status(400).json({ 
                error: 'Invalid truck ID format',
                message: 'The truck ID appears to be corrupted. Please refresh the page and try again.' 
            });
        }
        
        const truckService = require('../services/TruckService');
        
        // Check registration expiry before returning truck
        await truckService.checkAndUpdateRegistrationExpiry(id);
        
        const truck = await truckService.getTruckByIdWithDocuments(id);
        
        if (!truck) {
            console.log(`❌ Truck not found: ${id}`);
            return res.status(404).json({ message: 'Truck not found' });
        }
        
        console.log(`✅ Truck found: ${truck.truckPlate || truck.TruckPlate}`);
        console.log(`📊 Current status: ${truck.operationalStatus}`);
        res.json(truck);
    } catch (error) {
        console.error('❌ Error fetching truck:', error);
        res.status(500).json({
            error: 'Failed to fetch truck',
            details: error.message
        });
    }
});

// Route to handle truck updates with document uploads
router.put('/:id', uploadTruckDocuments, async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`🚛 Received truck update request for ID: ${id}`);
        console.log('📄 Files:', req.files ? Object.keys(req.files) : 'No files');
        console.log('📄 Body:', req.body);
        console.log('📄 Uploaded documents:', req.uploadedDocuments);
        
        const truckService = require('../services/TruckService');
        
        // Prepare truck data with uploaded documents
        const truckData = {
            ...req.body,
            documents: req.uploadedDocuments || {}
        };
        
        console.log('📊 Updating truck with data:', truckData);
        
        // Update the truck using TruckService (this will trigger registration expiry check)
        const updatedTruck = await truckService.update(id, truckData);
        
        console.log('✅ Truck updated successfully:', updatedTruck.truckPlate);
        console.log('📊 New operational status:', updatedTruck.operationalStatus);
        
        res.json({
            message: 'Truck updated successfully',
            truck: updatedTruck,
            documents: req.uploadedDocuments
        });

    } catch (error) {
        console.error('❌ Error handling truck update:', error);
        res.status(500).json({
            error: 'Failed to process truck update',
            details: error.message
        });
    }
});

module.exports = router;