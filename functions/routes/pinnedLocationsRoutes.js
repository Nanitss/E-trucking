const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');

// Import Firebase directly - no fallback complexity
const { db, admin } = require('../config/firebase');
console.log('📍 Firebase imported for pinned locations');

// Get all pinned locations for a client
router.get('/', authenticateJWT, async (req, res) => {
  try {
    console.log('📍 Getting pinned locations for user:', req.user.id);

    // Find client by userId
    const clientsSnapshot = await db.collection('clients')
      .where('userId', '==', req.user.id)
      .limit(1)
      .get();

    if (clientsSnapshot.empty) {
      return res.status(404).json({
        success: false,
        message: 'Client profile not found'
      });
    }

    const clientDoc = clientsSnapshot.docs[0];
    const clientId = clientDoc.id;

    // Get pinned locations for this client
    const locationsDoc = await db.collection('client_pinned_locations').doc(clientId).get();

    if (!locationsDoc.exists) {
      return res.json({
        success: true,
        locations: []
      });
    }

    const data = locationsDoc.data();
    const locations = data.locations || [];

    // Sort locations by name by default
    locations.sort((a, b) => a.name.localeCompare(b.name));

    console.log(`✅ Found ${locations.length} pinned locations for client ${clientId}`);

    res.json({
      success: true,
      locations: locations
    });

  } catch (error) {
    console.error('❌ Error getting pinned locations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pinned locations',
      error: error.message
    });
  }
});

// Add a new pinned location
router.post('/', authenticateJWT, async (req, res) => {
  try {
    console.log('📍 Adding new pinned location for user:', req.user.id);
    console.log('📍 Location data:', req.body);

    // Basic validation
    if (!req.body.name || !req.body.address) {
      return res.status(400).json({
        success: false,
        message: 'Name and address are required'
      });
    }

    // Find client by userId
    console.log('📍 Looking for client with userId:', req.user.id);
    const clientsSnapshot = await db.collection('clients')
      .where('userId', '==', req.user.id)
      .limit(1)
      .get();

    if (clientsSnapshot.empty) {
      console.log('❌ No client found for userId:', req.user.id);
      return res.status(404).json({
        success: false,
        message: 'Client profile not found'
      });
    }

    const clientDoc = clientsSnapshot.docs[0];
    const clientId = clientDoc.id;
    console.log('📍 Found client with ID:', clientId);

    // Create simple location object
    const newLocation = {
      id: `loc_${Date.now()}`,
      name: req.body.name.trim(),
      address: req.body.address.trim(),
      coordinates: req.body.coordinates || null,
      category: req.body.category || 'business',
      notes: req.body.notes || '',
      contactPerson: req.body.contactPerson || '',
      contactNumber: req.body.contactNumber || '',
      operatingHours: req.body.operatingHours || '',
      accessInstructions: req.body.accessInstructions || '',
      isDefault: req.body.isDefault || false,
      usageCount: 0,
      lastUsed: null,
      created_at: new Date(),
      updated_at: new Date()
    };

    console.log('📍 Created location object:', newLocation);

    // Get or create locations document
    const locationsDocRef = db.collection('client_pinned_locations').doc(clientId);
    const locationsDoc = await locationsDocRef.get();

    let currentLocations = [];
    if (locationsDoc.exists) {
      const data = locationsDoc.data();
      currentLocations = data.locations || [];
      console.log('📍 Found existing locations:', currentLocations.length);
    } else {
      console.log('📍 Creating new locations document for client');
    }

    // Add new location
    currentLocations.push(newLocation);

    // Save to database
    console.log('📍 Saving to Firestore...');
    await locationsDocRef.set({
      clientId,
      locations: currentLocations,
      updated_at: new Date()
    });

    console.log(`✅ Successfully saved location "${newLocation.name}" for client ${clientId}`);

    res.status(201).json({
      success: true,
      message: 'Location saved successfully',
      location: newLocation
    });

  } catch (error) {
    console.error('❌ Error adding pinned location:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      name: error.name
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to save location',
      error: error.message
    });
  }
});

// Update a pinned location
router.put('/:locationId', authenticateJWT, async (req, res) => {
  try {
    const { locationId } = req.params;
    console.log('📍 Updating pinned location:', locationId, 'for user:', req.user.id);

    const {
      name,
      address,
      coordinates,
      category = 'business',
      notes = '',
      contactPerson = '',
      contactNumber = '',
      operatingHours = '',
      accessInstructions = '',
      isDefault = false
    } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Location name is required'
      });
    }

    if (!address || !address.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Location address is required'
      });
    }

    // Find client by userId
    const clientsSnapshot = await db.collection('clients')
      .where('userId', '==', req.user.id)
      .limit(1)
      .get();

    if (clientsSnapshot.empty) {
      return res.status(404).json({
        success: false,
        message: 'Client profile not found'
      });
    }

    const clientDoc = clientsSnapshot.docs[0];
    const clientId = clientDoc.id;

    // Get current locations
    const locationsDocRef = db.collection('client_pinned_locations').doc(clientId);
    const locationsDoc = await locationsDocRef.get();

    if (!locationsDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    const data = locationsDoc.data();
    let currentLocations = data.locations || [];

    // Find the location to update
    const locationIndex = currentLocations.findIndex(loc => loc.id === locationId);

    if (locationIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    // Check for duplicate names (excluding current location)
    const duplicateName = currentLocations.find((loc, index) => 
      index !== locationIndex && 
      loc.name.toLowerCase() === name.trim().toLowerCase()
    );

    if (duplicateName) {
      return res.status(400).json({
        success: false,
        message: 'A location with this name already exists'
      });
    }

    // If this is set as default, remove default from other locations
    if (isDefault) {
      currentLocations = currentLocations.map((loc, index) => ({
        ...loc,
        isDefault: index === locationIndex ? true : false
      }));
    }

    // Update the location
    // Note: serverTimestamp() cannot be used inside arrays in Firestore, use ISO string instead
    currentLocations[locationIndex] = {
      ...currentLocations[locationIndex],
      name: name.trim(),
      address: address.trim(),
      coordinates: coordinates || null,
      category,
      notes: notes.trim(),
      contactPerson: contactPerson.trim(),
      contactNumber: contactNumber.trim(),
      operatingHours: operatingHours.trim(),
      accessInstructions: accessInstructions.trim(),
      isDefault,
      updated_at: new Date().toISOString()
    };

    // Save to database
    await locationsDocRef.set({
      clientId,
      locations: currentLocations,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log(`✅ Updated pinned location "${name}" for client ${clientId}`);

    res.json({
      success: true,
      message: 'Location updated successfully',
      location: currentLocations[locationIndex]
    });

  } catch (error) {
    console.error('❌ Error updating pinned location:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location',
      error: error.message
    });
  }
});

// Delete a pinned location
router.delete('/:locationId', authenticateJWT, async (req, res) => {
  try {
    const { locationId } = req.params;
    console.log('📍 Deleting pinned location:', locationId, 'for user:', req.user.id);

    // Find client by userId
    const clientsSnapshot = await db.collection('clients')
      .where('userId', '==', req.user.id)
      .limit(1)
      .get();

    if (clientsSnapshot.empty) {
      return res.status(404).json({
        success: false,
        message: 'Client profile not found'
      });
    }

    const clientDoc = clientsSnapshot.docs[0];
    const clientId = clientDoc.id;

    // Get current locations
    const locationsDocRef = db.collection('client_pinned_locations').doc(clientId);
    const locationsDoc = await locationsDocRef.get();

    if (!locationsDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    const data = locationsDoc.data();
    let currentLocations = data.locations || [];

    // Find the location to delete
    const locationIndex = currentLocations.findIndex(loc => loc.id === locationId);

    if (locationIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    const locationName = currentLocations[locationIndex].name;

    // Remove the location
    currentLocations.splice(locationIndex, 1);

    // Save to database
    await locationsDocRef.set({
      clientId,
      locations: currentLocations,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log(`✅ Deleted pinned location "${locationName}" for client ${clientId}`);

    res.json({
      success: true,
      message: 'Location deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting pinned location:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete location',
      error: error.message
    });
  }
});

// Update location usage (called when location is used in booking)
router.post('/:locationId/use', authenticateJWT, async (req, res) => {
  try {
    const { locationId } = req.params;
    console.log('📍 Recording usage for pinned location:', locationId);

    // Find client by userId
    const clientsSnapshot = await db.collection('clients')
      .where('userId', '==', req.user.id)
      .limit(1)
      .get();

    if (clientsSnapshot.empty) {
      return res.status(404).json({
        success: false,
        message: 'Client profile not found'
      });
    }

    const clientDoc = clientsSnapshot.docs[0];
    const clientId = clientDoc.id;

    // Get current locations
    const locationsDocRef = db.collection('client_pinned_locations').doc(clientId);
    const locationsDoc = await locationsDocRef.get();

    if (!locationsDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    const data = locationsDoc.data();
    let currentLocations = data.locations || [];

    // Find the location to update
    const locationIndex = currentLocations.findIndex(loc => loc.id === locationId);

    if (locationIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    // Update usage statistics
    currentLocations[locationIndex] = {
      ...currentLocations[locationIndex],
      usageCount: (currentLocations[locationIndex].usageCount || 0) + 1,
      lastUsed: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };

    // Save to database
    await locationsDocRef.set({
      clientId,
      locations: currentLocations,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log(`✅ Updated usage for location: ${currentLocations[locationIndex].name}`);

    res.json({
      success: true,
      message: 'Location usage updated'
    });

  } catch (error) {
    console.error('❌ Error updating location usage:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location usage',
      error: error.message
    });
  }
});

// Simple analytics endpoint (without the complex service)
router.get('/analytics', authenticateJWT, async (req, res) => {
  try {
    console.log('📊 Getting basic location analytics for user:', req.user.id);

    // Find client by userId
    const clientsSnapshot = await db.collection('clients')
      .where('userId', '==', req.user.id)
      .limit(1)
      .get();

    if (clientsSnapshot.empty) {
      return res.status(404).json({
        success: false,
        message: 'Client profile not found'
      });
    }

    const clientDoc = clientsSnapshot.docs[0];
    const clientId = clientDoc.id;

    // Get locations document
    const locationsDoc = await db.collection('client_pinned_locations').doc(clientId).get();

    if (!locationsDoc.exists) {
      return res.json({
        success: true,
        locations: [],
        suggestions: { frequent: [], recent: [], nearby: [] },
        analytics: { totalLocations: 0, totalUsage: 0, categoryCounts: {} }
      });
    }

    const data = locationsDoc.data();
    const locations = data.locations || [];

    // Basic analytics
    const analytics = {
      totalLocations: locations.length,
      totalUsage: locations.reduce((sum, loc) => sum + (loc.usageCount || 0), 0),
      categoryCounts: locations.reduce((counts, loc) => {
        const cat = loc.category || 'business';
        counts[cat] = (counts[cat] || 0) + 1;
        return counts;
      }, {})
    };

    res.json({
      success: true,
      locations,
      suggestions: { frequent: [], recent: [], nearby: [] },
      analytics
    });

  } catch (error) {
    console.error('❌ Error getting location analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get location analytics',
      error: error.message
    });
  }
});

module.exports = router;
