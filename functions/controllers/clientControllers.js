const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, admin } = require('../config/firebase');
const ClientService = require('../services/ClientService');
const TruckService = require('../services/TruckService');
const AllocationService = require('../services/AllocationService');
const AuditService = require('../services/AuditService');
const DeliveryService = require('../services/DeliveryService');
const NotificationService = require('../services/NotificationService');
const axios = require('axios');

// Get all clients
exports.getAllClients = async (req, res) => {
  try {
    const clients = await ClientService.getAll();
    
    // Format client data for the frontend
    const formattedClients = clients.map(client => ({
      ClientID: client.id,
      ClientName: client.clientName,
      ClientEmail: client.clientEmail,
      ClientNumber: client.clientNumber,
      ClientStatus: client.clientStatus,
      ClientCreationDate: client.clientCreationDate,
      ClientUserName: client.username
    }));
    
    res.json(formattedClients);
  } catch (error) {
    console.error('Error getting all clients:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get client by ID
exports.getClientById = async (req, res) => {
  try {
    const { id } = req.params;
    const client = await ClientService.getClientWithUser(id);
    
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }
    
    // Format client data for the frontend
    const formattedClient = {
      ClientID: client.id,
      ClientName: client.clientName,
      ClientEmail: client.clientEmail,
      ClientNumber: client.clientNumber,
      ClientStatus: client.clientStatus,
      ClientCreationDate: client.clientCreationDate,
      ClientUserName: client.username,
      UserID: client.userId
    };
    
    res.json(formattedClient);
  } catch (error) {
    console.error('Error getting client by ID:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new client
exports.createClient = async (req, res) => {
  try {
    console.log('📝 Creating client with data:', req.body);
    console.log('📝 Files:', req.files);
    console.log('📝 Uploaded documents:', req.uploadedDocuments);
    
    const { clientName, clientNumber, clientEmail, username, password } = req.body;
    
    // Validate required fields
    if (!clientName || !clientEmail || !username || !password) {
      return res.status(400).json({ message: 'Required fields missing' });
    }
    
    const clientData = {
      clientName,
      clientNumber,
      clientEmail,
      clientStatus: 'active',
      clientCreationDate: new Date().toISOString().split('T')[0],
      documents: req.uploadedDocuments || {}
    };
    
    const userData = {
      username,
      password,
      role: 'client'
    };
    
    const client = await ClientService.createClientWithUser(clientData, userData);
    
    // Add audit logging
    if (req.user) {
      await AuditService.logCreate(
        req.user.id,
        req.user.username,
        'client',
        client.id,
        {
          name: client.clientName,
          email: client.clientEmail,
          documentsUploaded: req.uploadedDocuments ? Object.keys(req.uploadedDocuments) : []
        }
      );
      console.log(`✅ Client creation logged to audit trail for client ${client.id}`);
    }
    
    // Format the response
    const formattedClient = {
      ClientID: client.id,
      ClientName: client.clientName,
      ClientEmail: client.clientEmail,
      ClientNumber: client.clientNumber,
      ClientStatus: client.clientStatus,
      ClientCreationDate: client.clientCreationDate,
      ClientUserName: username,
      message: 'Client created successfully'
    };
    
    res.status(201).json(formattedClient);
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update client
exports.updateClient = async (req, res) => {
  try {
    console.log('📝 Updating client with data:', req.body);
    console.log('📝 Files:', req.files);
    console.log('📝 Uploaded documents:', req.uploadedDocuments);
    
    const { id } = req.params;
    const { clientName, clientNumber, clientEmail, clientStatus, username } = req.body;
    
    // Get the client before update for audit purposes
    const oldClient = await ClientService.getById(id);
    if (!oldClient) {
      return res.status(404).json({ message: 'Client not found' });
    }
    
    // Handle document updates (similar to truck controller)
    let updatedDocuments = { ...(oldClient.documents || {}) };
    
    // Add new uploaded documents
    if (req.uploadedDocuments) {
      updatedDocuments = {
        ...updatedDocuments,
        ...req.uploadedDocuments
      };
    }
    
    // Handle existing documents that should be preserved
    Object.keys(req.body).forEach(key => {
      if (key.startsWith('existing_')) {
        const docType = key.replace('existing_', '');
        try {
          const existingDoc = JSON.parse(req.body[key]);
          updatedDocuments[docType] = existingDoc;
          console.log(`📄 Preserving existing document ${docType}:`, existingDoc.filename);
        } catch (error) {
          console.error(`❌ Error parsing existing document ${docType}:`, error);
        }
      }
    });
    
    const clientData = {
      documents: updatedDocuments
    };
    
    // Only update provided fields
    if (clientName) clientData.clientName = clientName;
    if (clientNumber) clientData.clientNumber = clientNumber;
    if (clientEmail) clientData.clientEmail = clientEmail;
    if (clientStatus) clientData.clientStatus = clientStatus;
    
    // User data to update
    const userData = {};
    if (username) userData.username = username;
    
    // Update password only if provided
    if (req.body.password) {
      userData.password = req.body.password;
    }
    
    const client = await ClientService.updateClientWithUser(id, clientData, userData);
    
    // Add audit logging
    if (req.user) {
      await AuditService.logUpdate(
        req.user.id,
        req.user.username,
        'client',
        id,
        {
          name: client.clientName,
          oldStatus: oldClient.clientStatus,
          newStatus: client.clientStatus,
          changes: req.body,
          documentsUploaded: req.uploadedDocuments ? Object.keys(req.uploadedDocuments) : []
        }
      );
      console.log(`✅ Client update logged to audit trail for client ${id}`);
    }
    
    // Format the response
    const formattedClient = {
      ClientID: client.id,
      ClientName: client.clientName,
      ClientEmail: client.clientEmail,
      ClientNumber: client.clientNumber,
      ClientStatus: client.clientStatus,
      ClientCreationDate: client.clientCreationDate,
      ClientUserName: client.username,
      message: 'Client updated successfully'
    };
    
    res.json(formattedClient);
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete client
exports.deleteClient = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the client before deletion for audit purposes
    const client = await ClientService.getById(id);
    
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }
    
    // Delete client first
    await ClientService.delete(id);
    
    // If client had a user account, disable it rather than delete
    if (client.userId) {
      const UserService = require('../services/UserService');
      await UserService.changeStatus(client.userId, 'inactive');
    }
    
    // Add audit logging
    if (req.user) {
      await AuditService.logDelete(
        req.user.id,
        req.user.username,
        'client',
        id,
        {
          name: client.clientName
        }
      );
      console.log(`✅ Client deletion logged to audit trail for client ${id}`);
    }
    
    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get clients by status
exports.getClientsByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    
    const clients = await ClientService.getAll([
      { field: 'clientStatus', operator: '==', value: status }
    ]);
    
    // Format client data for the frontend
    const formattedClients = clients.map(client => ({
      ClientID: client.id,
      ClientName: client.clientName,
      ClientEmail: client.clientEmail,
      ClientNumber: client.clientNumber,
      ClientStatus: client.clientStatus,
      ClientCreationDate: client.clientCreationDate,
      ClientUserName: client.username
    }));
    
    res.json(formattedClients);
  } catch (error) {
    console.error('Error getting clients by status:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get client by user ID
exports.getClientByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const client = await ClientService.getClientByUserId(userId);
    
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }
    
    // Format client data for the frontend
    const formattedClient = {
      ClientID: client.id,
      ClientName: client.clientName,
      ClientEmail: client.clientEmail,
      ClientNumber: client.clientNumber,
      ClientStatus: client.clientStatus,
      ClientCreationDate: client.clientCreationDate,
      ClientUserName: client.username,
      UserID: client.userId
    };
    
    res.json(formattedClient);
  } catch (error) {
    console.error('Error getting client by user ID:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get client's allocated trucks
exports.getClientTrucks = async (req, res) => {
  try {
    const clientId = req.params.id;
    console.log(`🔍 getClientTrucks called for client: ${clientId}`);
    
    // Get allocations for the client (SHARED ALLOCATION MODEL)
    const allocationsSnapshot = await db.collection('allocations')
      .where('clientId', '==', clientId)
      .where('status', '==', 'active')
      .get();
    
    console.log(`🔍 Found ${allocationsSnapshot.size} active allocations for client ${clientId} (shared model)`);
    
    if (allocationsSnapshot.empty) {
      console.log(`⚠️ No active allocations found for client ${clientId}`);
      return res.json([]);
    }
    
    // Log all allocations
    allocationsSnapshot.docs.forEach((doc, index) => {
      const allocation = doc.data();
      console.log(`   ${index + 1}. Allocation ${doc.id}: Client ${allocation.clientId} → Truck ${allocation.truckId}, Status: ${allocation.status}`);
    });
    
    // Get all truck IDs from allocations
    const truckIds = allocationsSnapshot.docs.map(doc => doc.data().truckId);
    console.log(`🔍 Truck IDs to fetch: ${truckIds}`);
    
    // Get truck details
    const trucks = [];
    for (const truckId of truckIds) {
      const truckDoc = await db.collection('trucks').doc(truckId).get();
      if (truckDoc.exists) {
        const truckData = truckDoc.data();
        console.log(`✅ Found truck ${truckId} (${truckData.truckPlate}): status=${truckData.truckStatus}, activeDelivery=${truckData.activeDelivery}`);
        
        // Add allocation date from the allocation document
        const allocation = allocationsSnapshot.docs.find(doc => doc.data().truckId === truckId);
        const allocationDate = allocation.data().allocationDate;
        
        trucks.push({
          id: truckDoc.id,
          ...truckDoc.data(),
          AllocationDate: allocationDate
        });
      } else {
        console.log(`❌ Truck ${truckId} not found in trucks collection`);
      }
    }
    
    console.log(`✅ Returning ${trucks.length} trucks for client ${clientId}`);
    trucks.forEach((truck, index) => {
      console.log(`   ${index + 1}. Truck ${truck.id} (${truck.truckPlate}): status=${truck.truckStatus}`);
    });
    
    res.json(trucks);
  } catch (error) {
    console.error('❌ Error in getClientTrucks:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Allocate trucks to client
exports.allocateTrucks = async (req, res) => {
  try {
    console.log('🔄 allocateTrucks called with:', {
      clientId: req.params.id,
      truckIds: req.body.truckIds
    });
    
    const { truckIds } = req.body;
    const clientId = req.params.id;
    
    // Check if client exists
    const clientDoc = await db.collection('clients').doc(clientId).get();
    
    if (!clientDoc.exists) {
      console.log('❌ Client not found:', clientId);
      return res.status(404).json({ message: 'Client not found' });
    }
    
    console.log('✅ Client exists:', clientDoc.data().clientName);
    
    // Use a batch to update multiple documents
    const batch = db.batch();
    
    const successfulAllocations = [];
    const failedAllocations = [];
    
    // Validate and allocate each truck
    for (const truckId of truckIds) {
      console.log(`🔍 Processing truck ID: ${truckId}`);
      
      // Check if truck exists and is available
      const truckDoc = await db.collection('trucks').doc(truckId).get();
      
      if (!truckDoc.exists) {
        console.log(`❌ Truck does not exist: ${truckId}`);
        failedAllocations.push({ truckId, reason: 'Truck does not exist' });
        continue;
      }
      
      const truckData = truckDoc.data();
      console.log(`🔍 Truck status: ${truckData.truckStatus}, plate: ${truckData.truckPlate}`);
      
      // NEW ALLOCATION LOGIC: Allow multiple clients to allocate the same truck
      // NO STATUS RESTRICTIONS - allocation is always allowed
      // Booking restrictions are enforced at delivery creation time based on dates
      
      // Check if this specific client already has this truck allocated
      const existingAllocationSnapshot = await db.collection('allocations')
        .where('clientId', '==', clientId)
        .where('truckId', '==', truckId)
        .where('status', '==', 'active')
        .get();
      
      if (!existingAllocationSnapshot.empty) {
        console.log(`⚠️ Truck is already allocated to this client: ${truckId}`);
        failedAllocations.push({ 
          truckId, 
          reason: 'You already have this truck allocated' 
        });
        continue;
      }
      
      // Truck can be allocated to multiple clients - no conflict check needed
      console.log(`✅ Truck ${truckId} can be allocated (shared allocation enabled)`);
      
      // Allocate the truck - create allocation document
      const allocationRef = db.collection('allocations').doc();
      console.log(`✅ Creating new allocation: ${allocationRef.id}`);
      
      batch.set(allocationRef, {
        clientId,
        truckId,
        allocationDate: new Date(),
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      });
      
      // Update truck status with enhanced fields (SHARED ALLOCATION MODEL)
      const truckRef = db.collection('trucks').doc(truckId);
      console.log(`✅ Adding allocation for client ${clientId} to truck ${truckId} (shared model)`);
      
      // Only update truck if it's not already active (first allocation)
      if (truckData.truckStatus === 'available' || truckData.truckStatus === 'maintenance') {
        batch.update(truckRef, {
          // Set to 'active' so truck is ready for deliveries across all allocated clients
          truckStatus: 'active',
          // Enhanced status tracking
          allocationStatus: 'allocated-shared', // Indicates shared allocation
          availabilityStatus: 'free', // Free for deliveries from any allocated client
          // Timestamps
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
          lastAllocationChange: admin.firestore.FieldValue.serverTimestamp(),
          // Increment allocation counter
          totalAllocations: admin.firestore.FieldValue.increment(1),
          // Track multiple clients (array)
          allocatedClientIds: admin.firestore.FieldValue.arrayUnion(clientId)
        });
      } else {
        // Truck already active, just add this client to the list
        batch.update(truckRef, {
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
          totalAllocations: admin.firestore.FieldValue.increment(1),
          allocatedClientIds: admin.firestore.FieldValue.arrayUnion(clientId)
        });
      }
      
      successfulAllocations.push(truckId);
    }
    
    if (successfulAllocations.length === 0) {
      console.log('❌ No trucks were allocated');
      return res.status(400).json({ 
        message: 'No trucks were allocated', 
        failedAllocations 
      });
    }
    
    // Commit all changes as a batch
    console.log('🔄 Committing batch with successful allocations:', successfulAllocations);
    await batch.commit();
    
    console.log('✅ Batch committed successfully');
    
    // Generate response
    const response = {
      message: 'Trucks allocated successfully',
      successfulAllocations,
      failedAllocations: failedAllocations.length > 0 ? failedAllocations : undefined
    };
    
    res.json(response);
  } catch (error) {
    console.error('❌ Error in allocateTrucks:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Deallocate truck from client (SHARED ALLOCATION MODEL)
exports.deallocateTruck = async (req, res) => {
  try {
    const clientId = req.params.id;
    const truckId = req.params.truckId;
    
    console.log(`🔄 Deallocating truck ${truckId} from client ${clientId} (shared model)`);
    
    // Find the allocation document
    const allocationsSnapshot = await db.collection('allocations')
      .where('clientId', '==', clientId)
      .where('truckId', '==', truckId)
      .where('status', '==', 'active')
      .get();
    
    if (allocationsSnapshot.empty) {
      return res.status(404).json({ message: 'Truck allocation not found' });
    }
    
    // Check how many other active allocations exist for this truck
    const allActiveAllocationsSnapshot = await db.collection('allocations')
      .where('truckId', '==', truckId)
      .where('status', '==', 'active')
      .get();
    
    const otherActiveAllocations = allActiveAllocationsSnapshot.size - 1; // Subtract this allocation
    console.log(`📊 Truck ${truckId} has ${otherActiveAllocations} other active allocations`);
    
    // Use a batch to update both documents
    const batch = db.batch();
    
    // Update allocation status
    const allocationRef = allocationsSnapshot.docs[0].ref;
    batch.update(allocationRef, {
      status: 'returned',
      updated_at: new Date()
    });
    
    // Update truck status
    const truckRef = db.collection('trucks').doc(truckId);
    
    // Remove this client from the allocated clients array
    batch.update(truckRef, {
      allocatedClientIds: admin.firestore.FieldValue.arrayRemove(clientId),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      lastAllocationChange: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Only set truck to 'available' if no other clients have it allocated
    if (otherActiveAllocations === 0) {
      console.log(`✅ No other allocations - setting truck ${truckId} to available`);
      batch.update(truckRef, {
        truckStatus: 'available',
        allocationStatus: 'available',
        availabilityStatus: 'free',
        allocatedClientIds: [], // Clear the array
        currentDeliveryId: null
      });
    } else {
      console.log(`✅ Truck ${truckId} still allocated to ${otherActiveAllocations} other client(s) - keeping active`);
    }
    
    // Commit all changes
    await batch.commit();
    
    res.json({ 
      message: 'Truck deallocated successfully',
      remainingAllocations: otherActiveAllocations
    });
  } catch (error) {
    console.error('Error deallocating truck:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get client profile
exports.getClientProfile = async (req, res) => {
  try {
    console.log('🔍 getClientProfile called with user:', req.user);
    
    if (!req.user || !req.user.id) {
      console.error('❌ No user found in request! Authentication middleware issue?');
      return res.status(401).json({ message: 'Unauthorized: User not authenticated.' });
    }

    let clientsSnapshot;
    
    // If admin is requesting a client profile, handle it differently
    if (req.user.role === 'admin' && req.query.clientId) {
      console.log(`🔍 Admin is requesting profile for client ID: ${req.query.clientId}`);
      const clientDoc = await db.collection('clients').doc(req.query.clientId).get();
      
      if (!clientDoc.exists) {
        console.log(`❌ Client with ID ${req.query.clientId} not found`);
        return res.status(404).json({ message: `Client with ID ${req.query.clientId} not found` });
      }
      
      const clientData = { id: clientDoc.id, ...clientDoc.data() };
      console.log('✅ Admin found client:', clientData);
      
      // Format the response
      const formattedClient = {
        ClientID: clientData.id,
        ClientName: clientData.clientName || clientData.ClientName || 'Unknown Client',
        ClientEmail: clientData.clientEmail || clientData.ClientEmail || '',
        ClientNumber: clientData.clientNumber || clientData.ClientNumber || '',
        ClientStatus: clientData.clientStatus || clientData.ClientStatus || 'active',
        ClientCreationDate: clientData.clientCreationDate || clientData.ClientCreationDate || '',
        UserID: clientData.userId || ''
      };
      
      console.log('✅ Returning client profile for admin:', formattedClient);
      return res.json(formattedClient);
    }
    
    // Client is requesting their own profile
    if (req.user.role === 'client') {
      console.log(`🔍 Client is requesting their own profile. User ID: ${req.user.id}`);
      
      // Find client by userId
      clientsSnapshot = await db.collection('clients')
        .where('userId', '==', req.user.id)
        .limit(1)
        .get();
      
      console.log(`🔍 Client lookup results - found: ${!clientsSnapshot.empty}, count: ${clientsSnapshot.size}`);
      
      if (clientsSnapshot.empty) {
        console.log('❌ No client profile found for this user ID:', req.user.id);
        
        // Log all clients for debugging
        const allClientsSnapshot = await db.collection('clients').get();
        console.log('🔍 All clients in database:', allClientsSnapshot.size);
        if (allClientsSnapshot.size > 0) {
          console.log('🔍 Sample client userIds:', allClientsSnapshot.docs.slice(0, 5).map(doc => ({
            id: doc.id,
            userId: doc.data().userId,
            name: doc.data().clientName
          })));
        }
        
        return res.status(404).json({ 
          message: 'Client profile not found. Please contact administrator.',
          error: 'NO_CLIENT_PROFILE'
        });
      }
      
      const clientDoc = clientsSnapshot.docs[0];
      const client = { id: clientDoc.id, ...clientDoc.data() };
      console.log('✅ Found client:', client);
      
      // Format the response
      const formattedClient = {
        ClientID: client.id,
        ClientName: client.clientName || client.ClientName || 'Unknown Client',
        ClientEmail: client.clientEmail || client.ClientEmail || '',
        ClientNumber: client.clientNumber || client.ClientNumber || '',
        ClientStatus: client.clientStatus || client.ClientStatus || 'active',
        ClientCreationDate: client.clientCreationDate || client.ClientCreationDate || '',
        UserID: client.userId || req.user.id
      };
      
      console.log('✅ Returning client profile:', formattedClient);
      return res.json(formattedClient);
    }
    
    // If we get here, the user is not a client or admin
    console.log('❌ User is not a client or admin:', req.user.role);
    return res.status(403).json({ 
      message: 'Access denied. Only clients can view their profiles.',
      error: 'ROLE_NOT_ALLOWED'
    });
  } catch (error) {
    console.error('❌ Error in getClientProfile:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Update client's own profile
exports.updateClientProfile = async (req, res) => {
  try {
    console.log('🔍 updateClientProfile called with user:', req.user);
    console.log('🔍 Request body:', req.body);
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized: User not authenticated.' });
    }

    const { clientName, clientEmail, clientNumber } = req.body;
    
    // Validate required fields
    if (!clientName && !clientEmail && !clientNumber) {
      return res.status(400).json({ message: 'At least one field must be provided for update' });
    }

    // Find client by userId
    const clientsSnapshot = await db.collection('clients')
      .where('userId', '==', req.user.id)
      .limit(1)
      .get();
    
    if (clientsSnapshot.empty) {
      return res.status(404).json({ message: 'Client profile not found' });
    }

    const clientDoc = clientsSnapshot.docs[0];
    const clientId = clientDoc.id;
    const currentData = clientDoc.data();
    
    // Prepare update data
    const updateData = {};
    if (clientName) updateData.clientName = clientName;
    if (clientEmail) updateData.clientEmail = clientEmail;
    if (clientNumber) updateData.clientNumber = clientNumber;
    
    // Update client document
    await db.collection('clients').doc(clientId).update(updateData);
    
    // Get updated client data
    const updatedDoc = await db.collection('clients').doc(clientId).get();
    const updatedClient = { id: updatedDoc.id, ...updatedDoc.data() };
    
    // Add audit logging
    await AuditService.logUpdate(
      req.user.id,
      req.user.username,
      'client_profile',
      clientId,
      {
        name: updatedClient.clientName,
        updatedFields: Object.keys(updateData),
        requestBody: req.body
      }
    );
    
    // Format the response
    const formattedClient = {
      ClientID: updatedClient.id,
      ClientName: updatedClient.clientName || 'Unknown Client',
      ClientEmail: updatedClient.clientEmail || '',
      ClientNumber: updatedClient.clientNumber || '',
      ClientStatus: updatedClient.clientStatus || 'active',
      ClientCreationDate: updatedClient.clientCreationDate || '',
      UserID: updatedClient.userId || req.user.id
    };
    
    console.log('✅ Profile updated successfully:', formattedClient);
    res.json({ 
      message: 'Profile updated successfully',
      client: formattedClient
    });
    
  } catch (error) {
    console.error('❌ Error in updateClientProfile:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Change client's password
exports.changeClientPassword = async (req, res) => {
  try {
    console.log('🔍 changeClientPassword called with user:', req.user);
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized: User not authenticated.' });
    }

    const { currentPassword, newPassword } = req.body;
    
    // Validate required fields
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    // Get user document
    const userDoc = await db.collection('users').doc(req.user.id).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = userDoc.data();
    
    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, userData.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password in users collection
    await db.collection('users').doc(req.user.id).update({
      password: hashedNewPassword,
      passwordChangedAt: new Date().toISOString()
    });
    
    // Add audit logging
    await AuditService.logUpdate(
      req.user.id,
      req.user.username,
      'user_password',
      req.user.id,
      {
        action: 'password_change',
        timestamp: new Date().toISOString()
      }
    );
    
    console.log('✅ Password changed successfully for user:', req.user.id);
    res.json({ 
      message: 'Password changed successfully'
    });
    
  } catch (error) {
    console.error('❌ Error in changeClientPassword:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Get client's allocated trucks
exports.getClientTrucksForProfile = async (req, res) => {
  try {
    console.log('🔍 getClientTrucksForProfile called with user:', req.user);
    
    if (!req.user || !req.user.id) {
      console.error('❌ No user found in request! Authentication middleware issue?');
      return res.status(401).json({ message: 'Unauthorized: User not authenticated.' });
    }
    
    // Find client by userId
    const clientsSnapshot = await db.collection('clients')
      .where('userId', '==', req.user.id)
      .limit(1)
      .get();
    
    console.log('🔍 Client lookup results - found:', !clientsSnapshot.empty, 'count:', clientsSnapshot.size);
    
    if (clientsSnapshot.empty) {
      console.log('❌ No client found for userId:', req.user.id);
      return res.status(404).json({ message: 'Client not found' });
    }
    
    const clientDoc = clientsSnapshot.docs[0];
    const clientId = clientDoc.id;
    const clientName = clientDoc.data().clientName;
    console.log('✅ Found client with ID:', clientId, 'Name:', clientName);
    
    // Get ONLY currently allocated trucks for this client
    console.log('🔍 Finding CURRENTLY ALLOCATED trucks for client...');
    console.log('🔍 Client ID being searched:', clientId);
    console.log('🔍 Client name:', clientName);
    
    // Get only ACTIVE allocations for the client
    console.log('\n📋 Searching for ACTIVE allocations...');
    const activeAllocationsSnapshot = await db.collection('allocations')
      .where('clientId', '==', clientId)
      .where('status', '==', 'active')
      .get();
    
    console.log('🔍 Active allocations found:', activeAllocationsSnapshot.size);
    
    const allocatedTruckIds = [];
    activeAllocationsSnapshot.docs.forEach((doc, index) => {
      const allocation = doc.data();
      console.log(`   ${index + 1}. Active Allocation ${doc.id}: Client ${allocation.clientId} → Truck ${allocation.truckId}`);
      if (allocation.truckId) {
        allocatedTruckIds.push(allocation.truckId);
      }
    });
    
    console.log('\n🎯 CURRENTLY ALLOCATED TRUCKS:');
    console.log('🔍 Total allocated truck IDs:', allocatedTruckIds.length);
    console.log('🔍 Truck IDs:', allocatedTruckIds);
    
    // If no active allocations found, return empty array
    if (allocatedTruckIds.length === 0) {
      console.log('⚠️ No currently allocated trucks found for client');
      return res.json([]);
    }
    
    // Get truck details for allocated truck IDs only
    const trucks = [];
    console.log('\n🚛 FETCHING TRUCK DETAILS...');
    console.log('🔍 Fetching details for allocated truck IDs:', allocatedTruckIds);
    
    for (const truckId of allocatedTruckIds) {
      const truckDoc = await db.collection('trucks').doc(truckId).get();
      if (truckDoc.exists) {
        console.log('✅ Found truck details for:', truckId, truckDoc.data().truckPlate, 'Status:', truckDoc.data().truckStatus);
        
        // Find allocation for allocation date
        const truckAllocationSnapshot = await db.collection('allocations')
          .where('truckId', '==', truckId)
          .where('clientId', '==', clientId)
          .where('status', '==', 'active')
          .limit(1)
          .get();
        
        let allocationDate = new Date();
        if (!truckAllocationSnapshot.empty) {
          allocationDate = truckAllocationSnapshot.docs[0].data().allocationDate || new Date();
        }
        
        trucks.push({
          id: truckDoc.id,
          ...truckDoc.data(),
          AllocationDate: allocationDate
        });
      } else {
        console.log('❌ No truck found for ID:', truckId);
      }
    }
    
    // Format trucks for frontend
    const formattedTrucks = trucks.map(truck => ({
      TruckID: truck.id,
      TruckPlate: truck.truckPlate,
      TruckType: truck.truckType,
      TruckCapacity: truck.truckCapacity,
      TruckBrand: truck.truckBrand || truck.brand || 'Unknown',
      TruckStatus: truck.truckStatus,
      AllocationDate: truck.AllocationDate,
      TotalCompletedDeliveries: truck.totalCompletedDeliveries || truck.completedDeliveries || 0,
      TotalKilometers: truck.totalKilometers || truck.kilometers || 0,
      // Include enhanced status fields for availability checking
      allocationStatus: truck.allocationStatus,
      operationalStatus: truck.operationalStatus,
      availabilityStatus: truck.availabilityStatus,
      // Also include them in capitalized format for compatibility
      AllocationStatus: truck.allocationStatus,
      OperationalStatus: truck.operationalStatus,
      AvailabilityStatus: truck.availabilityStatus,
      // Include additional status metadata
      lastStatusChange: truck.lastStatusChange,
      lastAllocationChange: truck.lastAllocationChange,
      currentClientId: truck.currentClientId,
      activeDelivery: truck.activeDelivery,
      maintenanceScheduled: truck.maintenanceScheduled
    }));
    
    console.log('🔍 Raw trucks from database:', trucks.map(t => ({
      id: t.id,
      plate: t.truckPlate,
      status: t.truckStatus
    })));
    console.log('🔍 Formatted trucks being returned:', formattedTrucks);
    console.log('🔍 Returning ONLY ALLOCATED trucks count:', formattedTrucks.length);
    res.json(formattedTrucks);
  } catch (error) {
    console.error('❌ Error in getClientTrucksForProfile:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get client's deliveries - completely rewritten to fix error
exports.getClientDeliveries = async (req, res) => {
  try {
    console.log('🔍 getClientDeliveries called for user:', req.user?.id);
    
    if (!req.user || !req.user.id) {
      console.log('❌ No user found in request');
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    // Use the user's login ID directly as clientId (since delivery records use this)
    const clientId = req.user.id;
    console.log('✅ Using user ID as clientId:', clientId);
    
    // Get deliveries for the client using the user's login ID
    const deliveriesSnapshot = await db.collection('deliveries')
      .where('clientId', '==', clientId)
      .get();
    
    console.log('📦 Deliveries found:', deliveriesSnapshot.size);
    
    // Create a simple array of deliveries with minimal processing
    const deliveries = deliveriesSnapshot.docs.map(doc => {
      const data = doc.data();
      
      // Convert Firestore timestamp to JavaScript Date
      let deliveryDate = new Date();
      if (data.deliveryDate) {
        if (data.deliveryDate.seconds) {
          // Firestore timestamp
          deliveryDate = new Date(data.deliveryDate.seconds * 1000);
        } else if (data.deliveryDate.toDate) {
          // Firestore timestamp object
          deliveryDate = data.deliveryDate.toDate();
        } else {
          // String or other format
          deliveryDate = new Date(data.deliveryDate);
        }
      } else if (data.created_at) {
        if (data.created_at.seconds) {
          deliveryDate = new Date(data.created_at.seconds * 1000);
        } else if (data.created_at.toDate) {
          deliveryDate = data.created_at.toDate();
        } else {
          deliveryDate = new Date(data.created_at);
        }
      }
      
      return {
        DeliveryID: doc.id,
        DeliveryDate: deliveryDate.toISOString(), // Convert to ISO string for frontend
        DeliveryStatus: data.deliveryStatus || 'pending',
        DriverStatus: data.driverStatus || 'unknown', // Add driver assignment status
        HelperStatus: data.helperStatus || 'unknown', // Add helper assignment status
        DriverApprovalStatus: data.driverApprovalStatus || 'not_applicable', // Add driver approval status
        HelperApprovalStatus: data.helperApprovalStatus || 'not_applicable', // Add helper approval status
        PickupLocation: data.pickupLocation || '',
        DropoffLocation: data.dropoffLocation || data.deliveryAddress || '',
        DeliveryAddress: data.deliveryAddress || data.dropoffLocation || '',
        DeliveryDistance: data.deliveryDistance || 0,
        EstimatedDuration: data.estimatedDuration || 0,
        DeliveryRate: data.deliveryRate || 0,
        TruckID: data.truckId || '',
        TruckPlate: data.truckPlate || 'Unknown',
        TruckType: data.truckType || 'Standard',
        DriverName: data.driverName || 'Not Assigned',
        HelperName: data.helperName || 'Not Assigned',
        CargoWeight: data.cargoWeight || 0,
        TotalCargoWeight: data.totalCargoWeight || data.cargoWeight || 0, // Add total cargo weight
        PickupCoordinates: data.pickupCoordinates || null,
        DropoffCoordinates: data.dropoffCoordinates || null,
        // Include route information for map display
        RouteInfo: data.routeInfo || {
          pickupLocation: data.pickupLocation || '',
          dropoffLocation: data.dropoffLocation || data.deliveryAddress || '',
          pickupCoordinates: data.pickupCoordinates || null,
          dropoffCoordinates: data.dropoffCoordinates || null,
          distance: data.deliveryDistance || 0,
          duration: data.estimatedDuration || 0
        },
        // Contact information for pickup and dropoff
        PickupContactPerson: data.pickupContactPerson || '',
        PickupContactNumber: data.pickupContactNumber || '',
        DropoffContactPerson: data.dropoffContactPerson || '',
        DropoffContactNumber: data.dropoffContactNumber || ''
      };
    });
    
    console.log('✅ Returning deliveries:', deliveries.length);
    return res.json(deliveries);
  } catch (error) {
    console.error('❌ Error in getClientDeliveries:', error);
    return res.status(500).json({ message: 'Error fetching deliveries' });
  }
};

// Get delivery by ID
exports.getDeliveryById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find client by userId
    const clientsSnapshot = await db.collection('clients')
      .where('userId', '==', req.user.id)
      .limit(1)
      .get();
    
    if (clientsSnapshot.empty) {
      return res.status(404).json({ message: 'Client not found' });
    }
    
    const clientDocId = clientsSnapshot.docs[0].id; // Firestore document ID
    const clientUserId = req.user.id; // User login ID
    const clientData = clientsSnapshot.docs[0].data();
    
    console.log('🔍 Client authorization check:', {
      clientDocId,
      clientUserId,
      clientName: clientData.clientName
    });
    
    // Get the delivery
    const deliveryDoc = await db.collection('deliveries').doc(id).get();
    
    if (!deliveryDoc.exists) {
      return res.status(404).json({ 
        success: false,
        message: 'Delivery not found' 
      });
    }
    
    const delivery = deliveryDoc.data();
    
    console.log('🔍 Delivery authorization data:', {
      deliveryId: id,
      deliveryClientId: delivery.clientId,
      deliveryStatus: delivery.deliveryStatus,
      clientConfirmed: delivery.clientConfirmed
    });
    
    // Verify this delivery belongs to the client - check both possible client ID formats
    if (delivery.clientId !== clientDocId && delivery.clientId !== clientUserId) {
      console.log('❌ Authorization failed:');
      console.log('   - Delivery clientId:', delivery.clientId);
      console.log('   - Firestore clientId:', clientDocId);
      console.log('   - User login ID:', clientUserId);
      return res.status(403).json({ 
        success: false,
        message: 'Unauthorized: This delivery does not belong to your account' 
      });
    }
    
    console.log('✅ Authorization passed - delivery belongs to client');
    
    // Get truck details
    let truckDetails = {};
    if (delivery.truckId) {
      const truckDoc = await db.collection('trucks').doc(delivery.truckId).get();
      if (truckDoc.exists) {
        truckDetails = truckDoc.data();
      }
    }
    
    // Format response
    const formattedDelivery = {
      ...delivery,
      TruckPlate: truckDetails.truckPlate || delivery.TruckPlate,
      TruckType: truckDetails.truckType || delivery.TruckType,
      TruckCapacity: truckDetails.truckCapacity || delivery.TruckCapacity
    };
    
    res.json(formattedDelivery);
  } catch (error) {
    console.error('❌ Error in getDeliveryById:', error);
    res.status(500).json({ message: 'Error fetching delivery details' });
  }
};

// Create truck rental booking for client
exports.createTruckRental = async (req, res) => {
  // Add timeout to prevent hanging
  const timeoutId = setTimeout(() => {
    console.error('🚨 BOOKING TIMEOUT: Request taking too long, sending timeout response');
    if (!res.headersSent) {
      res.status(408).json({
        success: false,
        message: 'Booking request timed out. Please try again.',
        error: 'TIMEOUT'
      });
    }
  }, 30000); // 30 second timeout

  try {
    console.log('🔄 Processing truck rental request:', req.body);
    console.log('🔄 User from request:', req.user);
    
    // Clear timeout if we complete successfully
    const clearTimeoutAndRespond = (response) => {
      clearTimeout(timeoutId);
      if (!res.headersSent) {
        res.json(response);
      }
    };
    
    // Clear timeout if we error out
    const clearTimeoutAndError = (statusCode, response) => {
      clearTimeout(timeoutId);
      if (!res.headersSent) {
        res.status(statusCode).json(response);
      }
    };
    
    // Get booking data from request
    const {
      selectedTruckId,
      selectedTrucks, // Handle both single truck and multiple trucks
      pickupLocation,
      pickupCoordinates,
      dropoffLocation,
      dropoffCoordinates,
      weight,
      deliveryDate,
      deliveryTime,
      deliveryDistance: requestedDistance, // Get distance from frontend
      estimatedDuration: requestedDuration, // Get duration from frontend
      pickupContactPerson,
      pickupContactNumber,
      dropoffContactPerson,
      dropoffContactNumber
    } = req.body;
    
    // DEBUG: Log all received fields
    console.log('🔍 DEBUG: Received booking data:');
    console.log('   - selectedTruckId:', selectedTruckId);
    console.log('   - selectedTrucks:', selectedTrucks);
    console.log('   - pickupLocation:', pickupLocation);
    console.log('   - dropoffLocation:', dropoffLocation);
    console.log('   - weight:', weight);
    console.log('   - deliveryDate:', deliveryDate);
    console.log('   - deliveryTime:', deliveryTime);
    console.log('   - pickupCoordinates:', pickupCoordinates);
    console.log('   - dropoffCoordinates:', dropoffCoordinates);
    console.log('   - pickupContactPerson:', pickupContactPerson);
    console.log('   - pickupContactNumber:', pickupContactNumber);
    console.log('   - dropoffContactPerson:', dropoffContactPerson);
    console.log('   - dropoffContactNumber:', dropoffContactNumber);
    
    // Determine which trucks to book - handle both single and multiple truck selection
    let trucksToBook = [];
    if (selectedTrucks && Array.isArray(selectedTrucks) && selectedTrucks.length > 0) {
      trucksToBook = selectedTrucks;
      console.log('🚛 Multiple trucks selected:', trucksToBook);
    } else if (selectedTruckId) {
      trucksToBook = [selectedTruckId];
      console.log('🚛 Single truck selected:', selectedTruckId);
    } else {
      console.log('❌ No trucks selected - both selectedTrucks and selectedTruckId are missing');
      return clearTimeoutAndError(400, { 
        success: false,
        message: 'No trucks selected for booking'
      });
    }
    
    // Validate required fields with detailed logging
    console.log('🔍 DEBUG: Validating required fields...');
    const missingFields = [];
    
    if (!pickupLocation) missingFields.push('pickupLocation');
    if (!dropoffLocation) missingFields.push('dropoffLocation');
    if (!weight) missingFields.push('weight');
    if (!deliveryDate) missingFields.push('deliveryDate');
    if (!deliveryTime) missingFields.push('deliveryTime');
    if (!pickupContactNumber) missingFields.push('pickupContactNumber');
    if (!dropoffContactNumber) missingFields.push('dropoffContactNumber');
    
    if (missingFields.length > 0) {
      console.log('❌ Missing required fields:', missingFields);
      console.log('   - pickupLocation:', pickupLocation ? '✅ Present' : '❌ Missing');
      console.log('   - dropoffLocation:', dropoffLocation ? '✅ Present' : '❌ Missing');
      console.log('   - weight:', weight ? '✅ Present' : '❌ Missing');
      console.log('   - deliveryDate:', deliveryDate ? '✅ Present' : '❌ Missing');
      console.log('   - deliveryTime:', deliveryTime ? '✅ Present' : '❌ Missing');
      console.log('   - pickupContactNumber:', pickupContactNumber ? '✅ Present' : '❌ Missing');
      console.log('   - dropoffContactNumber:', dropoffContactNumber ? '✅ Present' : '❌ Missing');
      
      return clearTimeoutAndError(400, { 
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields: missingFields
      });
    }
    
    console.log('✅ All required fields are present');
    
    // Validate coordinates - these are required for the map functionality
    if (!pickupCoordinates || !dropoffCoordinates) {
      console.log('⚠️ Missing coordinates, using default coordinate values');
      // Use default coordinates for Manila if not provided
      pickupCoordinates = pickupCoordinates || { lat: 14.5995, lng: 120.9842 }; // Manila fallback
      dropoffCoordinates = dropoffCoordinates || { lat: 14.6091, lng: 121.0223 }; // Quezon City fallback
    }
    
    // Validate location data - ensure it contains actual address information
    if (pickupLocation.trim().length < 5 || dropoffLocation.trim().length < 5) {
      return clearTimeoutAndError(400, {
        success: false,
        message: 'Please provide complete address information for pickup and dropoff locations'
      });
    }
    
    // Validate cargo weight is a positive number
    const cargoWeight = parseFloat(weight);
    if (isNaN(cargoWeight) || cargoWeight <= 0) {
      return clearTimeoutAndError(400, {
        success: false,
        message: 'Please provide a valid cargo weight'
      });
    }
    
    // Find client by userId
    const clientsSnapshot = await db.collection('clients')
      .where('userId', '==', req.user.id)
      .limit(1)
      .get();
    
    if (clientsSnapshot.empty) {
      return clearTimeoutAndError(404, { 
        success: false,
        message: 'Client not found'
      });
    }
    
    const clientDoc = clientsSnapshot.docs[0];
    const clientId = req.user.id; // Use the user's login ID directly as clientId
    const clientData = clientDoc.data();
    
    console.log('✅ Client found:', clientId, 'Name:', clientData.clientName);
    
    // ===== PAYMENT STATUS CHECK =====
    // Check if client has any overdue payments before allowing new bookings
    try {
      const PaymentService = require('../../../server/services/PaymentService');
      const paymentService = new PaymentService();
      
      const canBook = await paymentService.canClientBookTrucks(clientId);
      if (!canBook) {
        console.log('❌ Client has overdue payments - blocking booking');
        return clearTimeoutAndError(403, {
          success: false,
          message: 'Your account has overdue payments. Please settle all outstanding payments before booking new deliveries.',
          error: 'PAYMENT_OVERDUE',
          redirectTo: '/client/payments'
        });
      }
      
      console.log('✅ Payment status check passed - client can book trucks');
    } catch (paymentError) {
      console.error('❌ Error checking payment status:', paymentError);
      // Don't block booking if payment service is down, but log the error
      console.log('⚠️ Payment status check failed, allowing booking to proceed');
    }
    
    // Get truck data for all trucks to be booked
    const trucksData = [];
    console.log(`🔍 Fetching data for ${trucksToBook.length} requested trucks:`, trucksToBook);
    
    for (const truckId of trucksToBook) {
      console.log(`🔍 Fetching truck data for ID: ${truckId}`);
      const truckDoc = await db.collection('trucks').doc(truckId).get();
      if (truckDoc.exists) {
        const truckData = {
          id: truckDoc.id,
          ...truckDoc.data()
        };
        trucksData.push(truckData);
        console.log(`✅ Found truck: ${truckData.truckPlate || truckData.TruckPlate} (${truckData.truckCapacity || truckData.TruckCapacity}t)`);
      } else {
        console.log(`❌ Truck not found: ${truckId}`);
      }
    }

    console.log(`📋 Fetched data for ${trucksData.length} trucks out of ${trucksToBook.length} requested`);
    
    // Get all active drivers and helpers for assignment
    let availableDrivers = [];
    let availableHelpers = [];
    
    try {
      // Get active drivers from the drivers collection (case-insensitive check)
      const allDriversSnapshot = await db.collection('drivers').get();
      const activeDriverDocs = allDriversSnapshot.docs.filter(doc => {
        const driverData = doc.data();
        const status = (driverData.DriverStatus || driverData.driverStatus || driverData.status || '').toLowerCase();
        return status === 'active' || status === 'available';
      });
      
      if (activeDriverDocs.length > 0) {
        availableDrivers = activeDriverDocs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log(`✅ Found ${availableDrivers.length} active drivers for assignment`);
        console.log('Available drivers:', availableDrivers.map(d => `${d.DriverName || d.driverName} (Status: ${d.DriverStatus || d.driverStatus}, ID: ${d.id})`));
      } else {
        console.log('⚠️ No active drivers found in drivers collection');
        console.log('All driver statuses:', allDriversSnapshot.docs.map(d => `${d.data().DriverName || d.data().driverName}: "${d.data().DriverStatus || d.data().driverStatus || d.data().status}"`));
      }
      
      // Get active/available helpers from the helpers collection (case-insensitive status check)
      const allHelpersSnapshot = await db.collection('helpers').get();
      const activeHelperDocs = allHelpersSnapshot.docs.filter(doc => {
        const helperData = doc.data();
        // Check both HelperStatus and status fields (database has inconsistent naming)
        const status = (helperData.HelperStatus || helperData.status || '').toLowerCase();
        return status === 'active' || status === 'available';
      });
      
      if (activeHelperDocs.length > 0) {
        availableHelpers = activeHelperDocs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log(`✅ Found ${availableHelpers.length} active/available helpers for assignment`);
        console.log('Available helpers:', availableHelpers.map(h => `${h.HelperName || h.helperName} (Status: ${h.HelperStatus || h.status}, ID: ${h.id})`));
      } else {
        console.log('⚠️ No active/available helpers found in helpers collection');
      }
    } catch (assignmentError) {
      console.error('❌ Error finding active drivers/helpers:', assignmentError);
    }
    
    // Create copies for unique assignment (remove assigned ones)
    let remainingDrivers = [...availableDrivers];
    let remainingHelpers = [...availableHelpers];
    
    console.log(`🔄 Starting assignment with ${remainingDrivers.length} drivers and ${remainingHelpers.length} helpers available`);
    console.log('Initial remaining drivers:', remainingDrivers.map(d => `${d.DriverName || d.driverName} (ID: ${d.id})`));
    console.log('Initial remaining helpers:', remainingHelpers.map(h => `${h.HelperName || h.helperName} (ID: ${h.id})`));
    
    // Validate if we have enough drivers for all trucks - BLOCK booking if no drivers available
    const trucksToBookCount = trucksToBook.length;
    
    if (remainingDrivers.length === 0) {
      console.log(`❌ No drivers available: Need ${trucksToBookCount}, but 0 drivers are active`);
      return clearTimeoutAndError(400, {
        success: false,
        message: 'No drivers are available at the moment. Please try booking at a different time or contact your account manager.',
        errorType: 'NO_DRIVERS_AVAILABLE',
        details: {
          driversNeeded: trucksToBookCount,
          driversAvailable: 0
        }
      });
    }
    
    if (remainingDrivers.length < trucksToBookCount) {
      console.log(`❌ Driver shortage: Need ${trucksToBookCount}, but only ${remainingDrivers.length} available - BLOCKING BOOKING`);
      return clearTimeoutAndError(400, {
        success: false,
        message: `Not enough drivers available. You need ${trucksToBookCount} driver(s) but only ${remainingDrivers.length} driver(s) are available. Please reduce the number of trucks or try booking at a different time.`,
        errorType: 'INSUFFICIENT_DRIVERS',
        details: {
          driversNeeded: trucksToBookCount,
          driversAvailable: remainingDrivers.length
        }
      });
    }
    
    if (remainingHelpers.length < trucksToBookCount) {
      console.log(`⚠️ Helper shortage: Need ${trucksToBookCount}, but only ${remainingHelpers.length} available - ALLOWING BOOKING TO PROCEED`);
      console.log(`   - Some trucks will be marked as "awaiting_helper"`);
    }
    
    console.log(`✅ Sufficient staff available: ${remainingDrivers.length} drivers and ${remainingHelpers.length} helpers for ${trucksToBookCount} trucks`);
    
    // Create combined date-time
    const deliveryDateTime = new Date(`${deliveryDate}T${deliveryTime}`);
    console.log('🕒 Delivery scheduled for:', deliveryDateTime);
    
    // Enforce 24-hour minimum lead time
    const now = new Date();
    const hoursUntilDelivery = (deliveryDateTime - now) / (1000 * 60 * 60);
    if (hoursUntilDelivery < 24) {
      console.log(`❌ Booking rejected: only ${hoursUntilDelivery.toFixed(1)} hours until delivery (minimum 24h required)`);
      return clearTimeoutAndError(400, {
        success: false,
        message: 'Bookings must be made at least 24 hours before the delivery date and time. Please select a later date or time.'
      });
    }
    
    // Convert to Firestore timestamp for proper storage
    const deliveryDateTimestamp = admin.firestore.Timestamp.fromDate(deliveryDateTime);
    console.log('🕒 Delivery timestamp:', deliveryDateTimestamp);
    
    // Use distance and duration from frontend if available, otherwise calculate
    let deliveryDistance = 0;
    let estimatedDuration = 0;
    let deliveryRate = 0;
    
    if (requestedDistance && requestedDuration) {
      // Use values from frontend (from route calculation)
      deliveryDistance = Math.round(parseFloat(requestedDistance));
      estimatedDuration = Math.round(parseFloat(requestedDuration));
      console.log(`📏 Using frontend route data: ${deliveryDistance}km, ${estimatedDuration}min`);
    } else {
      // Fallback: Calculate using Haversine formula
      console.log('📏 Calculating route using Haversine formula (fallback)');
      const R = 6371; // Earth's radius in km
      const dLat = (dropoffCoordinates.lat - pickupCoordinates.lat) * Math.PI / 180;
      const dLon = (dropoffCoordinates.lng - pickupCoordinates.lng) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(pickupCoordinates.lat * Math.PI / 180) * Math.cos(dropoffCoordinates.lat * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      deliveryDistance = Math.round(R * c);
      
      // Estimate duration based on average speed of 60 km/h
      estimatedDuration = Math.round(deliveryDistance * 60 / 60); // minutes
      console.log(`📏 Calculated route: ${deliveryDistance}km, ${estimatedDuration}min`);
    }
    
    // Calculate delivery rate using vehicle rate system
    try {
      console.log('💰 Calculating delivery rate using vehicle rate system...');
      
      // Get the first truck's type for rate calculation
      // In case of multiple trucks, we'll use the same rate structure for all
      const firstTruck = trucksToBook[0];
      const vehicleType = firstTruck.TruckType || 'mini truck'; // Default fallback
      
      console.log(`🚛 Using vehicle type: ${vehicleType} for rate calculation`);
      
      // Use the StaffService to calculate cost
      const StaffService = require('../services/StaffService');
      const costDetails = await StaffService.calculateDeliveryCost(vehicleType, deliveryDistance, cargoWeight);
      
      deliveryRate = Math.round(costDetails.totalCost);
      // Store base rate and rate per km for separate display
      var deliveryBaseRate = costDetails.baseRate || 0;
      var deliveryRatePerKm = costDetails.ratePerKm || 0;
      console.log(`💰 Calculated rate using vehicle rates: ₱${deliveryRate} per truck (Base: ₱${costDetails.baseRate}, Distance: ${deliveryDistance}km × ₱${costDetails.ratePerKm}/km = ₱${costDetails.kmCost})`);
      
    } catch (error) {
      console.warn('⚠️ Vehicle rate system failed, using fallback calculation:', error.message);
      
      // Fallback to old calculation method
      deliveryRate = Math.round(deliveryDistance * 2 + cargoWeight * 10);
      var deliveryBaseRate = 0;
      var deliveryRatePerKm = 0;
      console.log(`💰 Fallback rate: ₱${deliveryRate} per truck`);
    }
    
    // Process each truck booking separately
    const createdDeliveries = [];
    const failedBookings = [];
    
    // Calculate cargo distribution among selected trucks
    console.log('\n📦 Calculating cargo weight distribution among trucks...');
    
    // Get truck capacities for distribution calculation
    const selectedTrucksWithCapacity = [];
    for (const truckId of trucksToBook) {
      const truckDoc = await db.collection('trucks').doc(truckId).get();
      if (truckDoc.exists) {
        const truckData = truckDoc.data();
        const capacity = parseFloat(truckData.truckCapacity) || 0;
        selectedTrucksWithCapacity.push({
          truckId: truckId,
          capacity: capacity,
          truckPlate: truckData.truckPlate
        });
      }
    }
    
    // Sort trucks by capacity (biggest first) - same as frontend algorithm
    selectedTrucksWithCapacity.sort((a, b) => b.capacity - a.capacity);
    
    // Calculate cargo distribution using the same algorithm as frontend
    const cargoDistribution = [];
    let remainingCargo = cargoWeight;
    
    for (let i = 0; i < selectedTrucksWithCapacity.length; i++) {
      const truck = selectedTrucksWithCapacity[i];
      const assignedCargo = Math.min(remainingCargo, truck.capacity);
      cargoDistribution.push({
        truckId: truck.truckId,
        assignedCargo: assignedCargo,
        capacity: truck.capacity,
        truckPlate: truck.truckPlate
      });
      remainingCargo -= assignedCargo;
      
      console.log(`🚛 Truck ${truck.truckPlate} (${truck.capacity}t capacity): ${assignedCargo}t assigned`);
    }
    
    console.log(`📊 Cargo distribution complete. Remaining cargo: ${remainingCargo}t`);
    
    if (remainingCargo > 0) {
      console.log(`⚠️ Warning: ${remainingCargo}t of cargo cannot be accommodated`);
    }
    
    for (let i = 0; i < trucksToBook.length; i++) {
      const truckId = trucksToBook[i];
      console.log(`\n🚛 Processing truck ${i + 1}/${trucksToBook.length}: ${truckId}`);
      
      // Find the cargo assignment for this truck
      const cargoAssignment = cargoDistribution.find(dist => dist.truckId === truckId);
      const actualCargoWeight = cargoAssignment ? cargoAssignment.assignedCargo : 0;
      
      console.log(`📦 Assigned cargo for truck ${truckId}: ${actualCargoWeight} tons`);
      
      try {
        // Check if the truck exists
        const truckDoc = await db.collection('trucks').doc(truckId).get();
        
        if (!truckDoc.exists) {
          console.log(`❌ Truck ${truckId} not found`);
          failedBookings.push({
            truckId,
            reason: 'Truck not found'
          });
          continue;
        }
        
        const truckData = truckDoc.data();
        console.log('✅ Truck found:', truckId, 'Plate:', truckData.truckPlate, 'Status:', truckData.truckStatus);
        
        // Check if the truck has enough capacity for the assigned cargo
        const truckCapacity = parseFloat(truckData.truckCapacity) || 0;
        
        console.log(`✅ Truck ${truckId} capacity: ${truckCapacity} tons (assigned cargo: ${actualCargoWeight} tons)`);
        
        if (truckCapacity <= 0) {
          console.log(`❌ Truck ${truckId} has no capacity`);
          failedBookings.push({
            truckId,
            reason: `Truck has no capacity specified`
          });
          continue;
        }
        
        if (actualCargoWeight > truckCapacity) {
          console.log(`❌ Assigned cargo (${actualCargoWeight}t) exceeds truck capacity (${truckCapacity}t)`);
          failedBookings.push({
            truckId,
            reason: `Assigned cargo exceeds truck capacity`
          });
          continue;
        }
        
        // SIMPLIFIED AVAILABILITY LOGIC - Only check if truck is active (removed allocation requirement)
        const isActive = truckData.truckStatus?.toLowerCase() === 'active' || 
                        truckData.TruckStatus?.toLowerCase() === 'active' ||
                        truckData.operationalStatus?.toLowerCase() === 'active' ||
                        truckData.OperationalStatus?.toLowerCase() === 'active';
        
        console.log(`🔍 SIMPLIFIED availability check for truck ${truckId}:`);
        console.log(`   - truckStatus: ${truckData.truckStatus || truckData.TruckStatus || 'unknown'}`);
        console.log(`   - operationalStatus: ${truckData.operationalStatus || truckData.OperationalStatus || 'unknown'}`);
        console.log(`   - isActive: ${isActive}`);

        if (!isActive) {
          console.log(`❌ Truck ${truckId} is not active`);
          failedBookings.push({
            truckId,
            reason: `Truck is not active - Status: ${truckData.truckStatus || truckData.TruckStatus || 'unknown'}`
          });
          continue;
        }

        console.log(`✅ Truck ${truckId} is active - checking time-window availability...`);
        
        // 12-HOUR COOLDOWN BOOKING CONFLICT CHECK
        const requestedDate = deliveryDate;
        const requestedDateTime = new Date(`${deliveryDate}T${deliveryTime}`);
        const cooldownHours = 12;
        const prevDate = new Date(requestedDateTime); prevDate.setDate(prevDate.getDate() - 1);
        const nextDate = new Date(requestedDateTime); nextDate.setDate(nextDate.getDate() + 1);
        const datesToCheck = [prevDate.toISOString().split('T')[0], requestedDate, nextDate.toISOString().split('T')[0]];
        
        let conflictFound = null;
        for (const checkDate of datesToCheck) {
          let snap = await db.collection('deliveries')
            .where('truckId', '==', truckId).where('deliveryDateString', '==', checkDate)
            .where('deliveryStatus', 'in', ['pending', 'in-progress', 'started', 'picked-up']).get();
          if (snap.empty) {
            snap = await db.collection('deliveries')
              .where('truckId', '==', truckId).where('deliveryDateString', '==', checkDate)
              .where('DeliveryStatus', 'in', ['pending', 'in-progress', 'started', 'picked-up']).get();
          }
          if (!snap.empty) {
            for (const ds of snap.docs) {
              const ex = ds.data();
              let et;
              if (ex.deliveryDate && ex.deliveryDate._seconds) { et = new Date(ex.deliveryDate._seconds * 1000); }
              else if (ex.deliveryDate && typeof ex.deliveryDate.toDate === 'function') { et = ex.deliveryDate.toDate(); }
              else if (ex.deliveryDateString) { et = new Date(ex.deliveryDateString + 'T12:00:00'); }
              else { et = new Date(ex.deliveryDate); }
              const hd = Math.abs(requestedDateTime - et) / (1000 * 60 * 60);
              if (hd < cooldownHours) { conflictFound = { deliveryId: ds.id, clientId: ex.clientId, existingTime: et, hoursDiff: hd }; break; }
            }
          }
          if (conflictFound) break;
        }
        
        if (conflictFound) {
          const isSame = conflictFound.clientId === clientId;
          const ets = conflictFound.existingTime.toLocaleString('en-PH');
          failedBookings.push({
            truckId, truckPlate: truckData.truckPlate,
            reason: isSame ? `You already have this truck booked near this time (${ets}). Trucks need a 12-hour gap.`
              : `This truck is already booked near this time (${ets}). Trucks require a 12-hour cooldown. Please select a different time or truck.`,
            conflictDate: requestedDate, existingDeliveryId: conflictFound.deliveryId
          });
          continue;
        }
        
        // Allocate driver and helper with license-truck matching
        let driverName = "Not Assigned", helperName = "Not Assigned";
        let assignedDriverId = null, assignedHelperId = null;
        let allocationDetails = { allocationScore: 0, method: 'none' };
        try {
          const truckType = (truckData.truckType || truckData.TruckType || '').toLowerCase();
          const isSmallTruck = truckType === 'mini truck' || truckType === '4 wheeler';
          
          // Fetch all active drivers
          const ds = await db.collection('drivers').get();
          const activeDs = ds.docs.filter(d => {
            const st = (d.data().DriverStatus || d.data().driverStatus || d.data().status || '').toLowerCase();
            return st === 'active' || st === 'available';
          });
          
          // Match drivers based on license type:
          // - Class C: can only drive mini truck or 4 wheeler
          // - Class CE: can drive any truck
          let matchedDriver = null;
          for (const dDoc of activeDs) {
            const dData = dDoc.data();
            const licenseType = (dData.licenseType || '').toLowerCase();
            if (isSmallTruck) {
              // Small trucks accept Class C or Class CE
              matchedDriver = dDoc;
              break;
            } else {
              // Larger trucks require Class CE only
              if (licenseType === 'class ce') {
                matchedDriver = dDoc;
                break;
              }
            }
          }
          
          if (matchedDriver) {
            driverName = matchedDriver.data().DriverName || matchedDriver.data().driverName || 'Driver';
            assignedDriverId = matchedDriver.id;
            console.log(`✅ Matched driver: ${driverName} (license: ${matchedDriver.data().licenseType}) for truck type: ${truckType}`);
          } else if (activeDs.length > 0) {
            console.log(`⚠️ No license-matched driver found for ${truckType}. Active drivers available but none with correct license.`);
          }
          
          // Helpers are NOT restricted by license - assign any available helper
          const hs = await db.collection('helpers').get();
          const ah = hs.docs.filter(d => { const s = (d.data().HelperStatus || d.data().status || '').toLowerCase(); return s === 'active' || s === 'available'; });
          if (ah.length > 0) { helperName = ah[0].data().HelperName || ah[0].data().helperName || 'Helper'; assignedHelperId = ah[0].id; }
          allocationDetails = { allocationScore: matchedDriver ? 100 : 50, method: 'license_matched' };
        } catch (ae) { console.log('⚠️ Allocation failed:', ae.message); }
        
        const result = await db.runTransaction(async (transaction) => {
          const ts = admin.firestore.Timestamp.fromDate(new Date());
          const ref = db.collection('deliveries').doc();
          const dd = {
            DeliveryID: ref.id, clientId, truckId, pickupLocation,
            pickupCoordinates: pickupCoordinates || null, deliveryAddress: dropoffLocation,
            dropoffLocation, dropoffCoordinates: dropoffCoordinates || null,
            cargoWeight: actualCargoWeight, totalCargoWeight: cargoWeight,
            cargoDistribution, deliveryDate: deliveryDateTimestamp,
            deliveryDateString: deliveryDate, deliveryStatus: 'pending', DeliveryStatus: 'pending',
            driverStatus: assignedDriverId ? 'awaiting_approval' : 'awaiting_driver',
            helperStatus: assignedHelperId ? 'awaiting_approval' : 'awaiting_helper',
            driverApprovalStatus: assignedDriverId ? 'pending_driver_approval' : 'not_applicable',
            helperApprovalStatus: assignedHelperId ? 'pending_helper_approval' : 'not_applicable',
            created_at: ts, updated_at: admin.firestore.FieldValue.serverTimestamp(),
            clientName: clientData.clientName, truckPlate: truckData.truckPlate,
            truckType: truckData.truckType, truckBrand: truckData.truckBrand || 'Unknown',
            modelYear: truckData.modelYear || null, truckCapacity: truckData.truckCapacity || 0,
            totalKilometers: truckData.totalKilometers || 0,
            totalCompletedDeliveries: truckData.totalCompletedDeliveries || 0,
            averageKmPerDelivery: truckData.averageKmPerDelivery || 0,
            deliveryDistance, estimatedDuration, deliveryRate,
            deliveryBaseRate: deliveryBaseRate || 0, deliveryRatePerKm: deliveryRatePerKm || 0,
            driverName, driverId: assignedDriverId, helperName, helperId: assignedHelperId,
            allocationData: allocationDetails, licenseValidated: true,
            driverLicenseType: assignedDriverId ? 'assigned' : 'not_assigned',
            helperLevels: assignedHelperId ? ['assigned'] : ['not_assigned'],
            allocationScore: allocationDetails.allocationScore || 0,
            routeInfo: { pickupLocation, dropoffLocation, pickupCoordinates, dropoffCoordinates, distance: deliveryDistance, duration: estimatedDuration },
            RouteInfo: { pickupLocation, dropoffLocation, pickupCoordinates, dropoffCoordinates, distance: deliveryDistance, duration: estimatedDuration },
            pickupContactPerson: pickupContactPerson || '', pickupContactNumber,
            dropoffContactPerson: dropoffContactPerson || '', dropoffContactNumber
          };
          transaction.set(ref, dd);
          transaction.update(db.collection('trucks').doc(truckId), { currentDeliveryId: ref.id, updated_at: admin.firestore.FieldValue.serverTimestamp() });
          if (assignedDriverId) { transaction.update(db.collection('drivers').doc(assignedDriverId), { DriverStatus: 'on-delivery', updated_at: admin.firestore.FieldValue.serverTimestamp() }); }
          if (assignedHelperId) { transaction.update(db.collection('helpers').doc(assignedHelperId), { HelperStatus: 'on-delivery', updated_at: admin.firestore.FieldValue.serverTimestamp() }); }
          return { deliveryId: ref.id };
        });
        
        console.log(`✅ Delivery created for truck ${truckId}: ${result.deliveryId}`);
        const cDoc = await db.collection('deliveries').doc(result.deliveryId).get();
        createdDeliveries.push({
          deliveryId: result.deliveryId, truckId, truckPlate: truckData.truckPlate,
          driverName, helperName, deliveryData: cDoc.data(),
          allocationScore: allocationDetails.allocationScore, licenseValidated: true
        });
        
      } catch (error) {
        console.error(`❌ Error creating delivery for truck ${truckId}:`, error);
        failedBookings.push({ truckId, reason: error.message || 'Server error' });
      }
    }
    
    // Validate total capacity of successfully booked trucks
    if (createdDeliveries.length > 0) {
      const totalCapacity = createdDeliveries.reduce((sum, delivery) => {
        const truck = trucksData.find(t => t.id === delivery.truckId);
        const capacity = parseFloat(truck?.truckCapacity) || 0;
        return sum + capacity;
      }, 0);
      
      console.log(`📊 Total capacity validation: ${totalCapacity} tons capacity vs ${cargoWeight} tons cargo`);
      
      if (totalCapacity < cargoWeight) {
        console.log(`⚠️ Warning: Total capacity (${totalCapacity}t) is less than cargo weight (${cargoWeight}t)`);
        // Note: We don't fail the booking here as the client may have intentionally selected this combination
        // Instead, we'll include this information in the response
      } else {
        console.log(`✅ Total capacity (${totalCapacity}t) is sufficient for cargo weight (${cargoWeight}t)`);
      }
    }
    
    // Prepare response with detailed debugging
    console.log(`📊 BOOKING RESULTS SUMMARY:`);
    console.log(`   - Trucks requested: ${trucksToBook.length}`);
    console.log(`   - Deliveries created: ${createdDeliveries.length}`);
    console.log(`   - Failed bookings: ${failedBookings.length}`);
    console.log(`   - Failed reasons:`, failedBookings.map(f => `${f.truckId}: ${f.reason}`));
    
    if (createdDeliveries.length === 0) {
      console.log(`❌ NO TRUCKS COULD BE BOOKED - All ${trucksToBook.length} trucks failed`);
      
      const detailedError = {
        success: false,
        message: 'No trucks could be booked. Please check truck availability and try again.',
        failedBookings: failedBookings,
        debug: {
          requestedTrucks: trucksToBook.length,
          availableDrivers: availableDrivers.length,
          availableHelpers: availableHelpers.length,
          commonIssues: [
            'Check if trucks are under maintenance',
            'Verify truck allocation status', 
            'Ensure sufficient drivers and helpers are available',
            'Contact administrator if issue persists'
          ]
        }
      };
      
      return clearTimeoutAndError(400, detailedError);
    }
    
    console.log(`🎉 Successfully created ${createdDeliveries.length} deliveries out of ${trucksToBook.length} requested trucks`);
    
    // Create notification for successful booking
    try {
      const clientDocId = req.user.clientId || req.user.id;
      await NotificationService.createNotification({
        userId: clientDocId,
        type: 'delivery',
        title: 'Booking Confirmed 🚛',
        message: `${createdDeliveries.length} delivery${createdDeliveries.length !== 1 ? 'ies' : 'y'} booked successfully for ${deliveryDate}.`,
        metadata: {
          action: 'booking_created',
          deliveryIds: createdDeliveries.map(d => d.deliveryId),
          truckCount: createdDeliveries.length,
          deliveryDate,
        },
        priority: 'medium',
      });
    } catch (notifError) {
      console.error('⚠️ Failed to create booking notification:', notifError);
    }
    
    // Calculate total capacity for response
    const totalCapacity = createdDeliveries.reduce((sum, delivery) => {
      const truck = trucksData.find(t => t.id === delivery.truckId);
      const capacity = parseFloat(truck?.truckCapacity) || 0;
      return sum + capacity;
    }, 0);
    
    clearTimeoutAndRespond({
      success: true,
      message: `Successfully booked ${createdDeliveries.length} trucks for delivery`,
      deliveries: createdDeliveries,
      totalCapacity: totalCapacity,
      summary: {
        requestedTrucks: trucksToBook.length,
        successfulBookings: createdDeliveries.length,
        failedBookings: failedBookings.length,
        totalCapacity: totalCapacity,
        cargoWeight: cargoWeight
      }
    });
    
  } catch (error) {
    console.error('❌ CRITICAL ERROR in createTruckRental:', error);
    
    // Clear timeout and send error response
    clearTimeoutAndError(500, {
      success: false,
      message: 'Internal server error occurred while processing truck rental request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Confirm delivery received by client
exports.confirmDeliveryReceived = async (req, res) => {
  try {
    const { id } = req.params;
    const clientId = req.user.id;
    
    console.log(`🔍 Client ${clientId} confirming delivery ${id} received`);
    
    // Get delivery and verify ownership
    const deliveryDoc = await db.collection('deliveries').doc(id).get();
    if (!deliveryDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }
    
    const deliveryData = deliveryDoc.data();
    if (deliveryData.clientId !== clientId) {
      return res.status(403).json({
        success: false,
        message: 'You can only confirm your own deliveries'
      });
    }
    
    // Update delivery status
    await db.collection('deliveries').doc(id).update({
      status: 'delivered',
      deliveryStatus: 'delivered',
      DeliveryStatus: 'delivered',
      deliveredAt: new Date().toISOString(),
      clientConfirmation: true,
      lastUpdated: new Date().toISOString()
    });
    
    console.log(`✅ Delivery ${id} confirmed as received by client ${clientId}`);
    
    // Create notification for delivery received confirmation
    try {
      const clientDocId = req.user.clientId || clientId;
      await NotificationService.createNotification({
        userId: clientDocId,
        type: 'delivery',
        title: 'Delivery Received ✅',
        message: `You have confirmed receipt of delivery #${id.substring(0, 8)}. Thank you!`,
        metadata: {
          deliveryId: id,
          action: 'delivery_received',
          truckPlate: deliveryData.truckPlate || '',
        },
        priority: 'medium',
      });
    } catch (notifError) {
      console.error('⚠️ Failed to create delivery received notification:', notifError);
    }
    
    // Update truck status back to allocated/available
    if (deliveryData.truckId) {
      const allocationsSnapshot = await db.collection('allocations')
        .where('truckId', '==', deliveryData.truckId)
        .where('status', '==', 'active')
        .limit(1)
        .get();
      
      if (!allocationsSnapshot.empty) {
        await db.collection('trucks').doc(deliveryData.truckId).update({
          truckStatus: 'allocated',
          activeDelivery: false,
          currentDeliveryId: null,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`✅ Truck ${deliveryData.truckId} status updated to allocated`);
      } else {
        await db.collection('trucks').doc(deliveryData.truckId).update({
          truckStatus: 'available',
          activeDelivery: false,
          currentDeliveryId: null,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`✅ Truck ${deliveryData.truckId} status updated to available`);
      }
    }
    
    // Update driver status back to active
    if (deliveryData.driverId) {
      await db.collection('drivers').doc(deliveryData.driverId).update({
        driverStatus: 'active',
        currentDeliveryId: null,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`✅ Driver ${deliveryData.driverId} status updated to active`);
    }
    
    // Update helper status back to active
    if (deliveryData.helperId) {
      await db.collection('helpers').doc(deliveryData.helperId).update({
        helperStatus: 'active',
        currentDeliveryId: null,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`✅ Helper ${deliveryData.helperId} status updated to active`);
    }
    
    res.json({
      success: true,
      message: 'Delivery confirmed as received successfully',
      deliveryId: id
    });
    
  } catch (error) {
    console.error('❌ Error confirming delivery received:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm delivery received',
      error: error.message
    });
  }
};

// Cancel delivery - Client only (before driver starts)
exports.cancelDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const clientId = req.user.id;
    
    console.log(`🔍 Client ${clientId} requesting to cancel delivery ${id}`);
    
    // Get delivery and verify ownership
    const deliveryDoc = await db.collection('deliveries').doc(id).get();
    if (!deliveryDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }
    
    const deliveryData = deliveryDoc.data();
    if (deliveryData.clientId !== clientId) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own deliveries'
      });
    }
    
    // Check if delivery can be cancelled (not started)
    const currentStatus = deliveryData.deliveryStatus || deliveryData.DeliveryStatus || deliveryData.status;
    if (currentStatus === 'in_progress' || currentStatus === 'in-progress' || currentStatus === 'completed' || currentStatus === 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel delivery that has already started or been completed'
      });
    }
    
    // Update delivery status and restore resources
    const updateData = {
      deliveryStatus: 'cancelled',
      DeliveryStatus: 'cancelled', // TitleCase for compatibility
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancelledBy: clientId,
      lastUpdated: new Date().toISOString()
    };
    
    // Restore truck, driver, and helper statuses
    const truckId = deliveryData.truckId;
    const driverId = deliveryData.driverId;
    const helperId = deliveryData.helperId;
    
    // Update delivery
    await db.collection('deliveries').doc(id).update(updateData);
    
    // Restore truck status
    if (truckId) {
      try {
        // Check if truck is allocated to determine correct status
        const allocationsSnapshot = await db.collection('allocations')
          .where('truckId', '==', truckId)
          .where('status', '==', 'active')
          .limit(1)
          .get();
        
        const truckStatus = allocationsSnapshot.empty ? 'available' : 'free';
        await db.collection('trucks').doc(truckId).update({
          TruckStatus: truckStatus,
          truckStatus: truckStatus,
          availabilityStatus: truckStatus,
          AvailabilityStatus: truckStatus,
          activeDelivery: false,
          currentDeliveryId: null
        });
        console.log(`✅ Truck ${deliveryData.truckPlate || truckId} status restored to '${truckStatus}'`);
      } catch (err) {
        console.error(`⚠️  Failed to restore truck status: ${err.message}`);
      }
    }
    
    // Restore driver status
    if (driverId) {
      try {
        await db.collection('drivers').doc(driverId).update({
          DriverStatus: 'active',
          driverStatus: 'active'
        });
        console.log(`✅ Driver ${deliveryData.driverName || driverId} status restored to active`);
      } catch (err) {
        console.error(`⚠️  Failed to restore driver status: ${err.message}`);
      }
    }
    
    // Restore helper status
    if (helperId) {
      try {
        await db.collection('helpers').doc(helperId).update({
          HelperStatus: 'active',
          helperStatus: 'active'
        });
        console.log(`✅ Helper ${deliveryData.helperName || helperId} status restored to active`);
      } catch (err) {
        console.error(`⚠️  Failed to restore helper status: ${err.message}`);
      }
    }
    
    console.log(`✅ Delivery ${id} cancelled by client ${clientId} - all resources restored`);
    
    // Create notification for cancellation
    try {
      const clientDocId = req.user.clientId || clientId;
      await NotificationService.createNotification({
        userId: clientDocId,
        type: 'delivery',
        title: 'Delivery Cancelled ❌',
        message: `Your delivery #${id.substring(0, 8)} has been cancelled. No payment is required.`,
        metadata: {
          deliveryId: id,
          action: 'cancelled',
          truckPlate: deliveryData.truckPlate || '',
        },
        priority: 'medium',
      });
    } catch (notifError) {
      console.error('⚠️ Failed to create cancellation notification:', notifError);
    }
    
    res.json({
      success: true,
      message: 'Delivery cancelled successfully',
      deliveryId: id
    });
    
  } catch (error) {
    console.error('❌ Error cancelling delivery:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel delivery',
      error: error.message
    });
  }
};

// Change delivery route - Client only (before driver starts)
exports.changeDeliveryRoute = async (req, res) => {
  try {
    const { id } = req.params;
    const authId = req.user.id;
    const clientDocId = req.user.clientId;
    const { pickupLocation, dropoffLocation, pickupCoordinates, dropoffCoordinates } = req.body;
    
    console.log(`🔍 Client ${authId} (clientId: ${clientDocId}) requesting to change route for delivery ${id}`);
    
    // Validate required fields
    if (!pickupLocation || !dropoffLocation) {
      return res.status(400).json({
        success: false,
        message: 'Pickup and dropoff locations are required'
      });
    }
    
    // Get delivery and verify ownership
    const deliveryDoc = await db.collection('deliveries').doc(id).get();
    if (!deliveryDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }
    
    const deliveryData = deliveryDoc.data();
    const isOwner = deliveryData.clientId === authId || deliveryData.clientId === clientDocId;
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'You can only change routes for your own deliveries'
      });
    }
    
    // Check if delivery can be modified (not started) - handle both field name conventions
    const deliveryStatus = (deliveryData.status || deliveryData.DeliveryStatus || '').toLowerCase();
    if (deliveryStatus === 'in_progress' || deliveryStatus === 'in-progress' || deliveryStatus === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot change route for delivery that has already started'
      });
    }
    
    // Update delivery route
    await db.collection('deliveries').doc(id).update({
      pickupLocation,
      dropoffLocation,
      PickupLocation: pickupLocation,
      DropoffLocation: dropoffLocation,
      pickupCoordinates: pickupCoordinates || deliveryData.pickupCoordinates,
      dropoffCoordinates: dropoffCoordinates || deliveryData.dropoffCoordinates,
      routeChangedAt: new Date().toISOString(),
      routeChangedBy: authId,
      lastUpdated: new Date().toISOString()
    });
    
    console.log(`✅ Route changed for delivery ${id} by client ${authId}`);
    
    // Create notification for the client
    try {
      await NotificationService.createNotification({
        userId: clientDocId || authId,
        type: 'delivery',
        title: 'Route Updated 🗺️',
        message: `Route for delivery #${id.substring(0, 8)} has been updated. New route: ${pickupLocation.substring(0, 30)}... → ${dropoffLocation.substring(0, 30)}...`,
        metadata: {
          deliveryId: id,
          action: 'reroute',
          pickupLocation,
          dropoffLocation,
        },
        priority: 'medium',
      });
    } catch (notifError) {
      console.error('⚠️ Failed to create reroute notification:', notifError);
    }
    
    res.json({
      success: true,
      message: 'Delivery route updated successfully',
      deliveryId: id,
      newRoute: {
        pickupLocation,
        dropoffLocation,
        pickupCoordinates: pickupCoordinates || deliveryData.pickupCoordinates,
        dropoffCoordinates: dropoffCoordinates || deliveryData.dropoffCoordinates
      }
    });
    
  } catch (error) {
    console.error('❌ Error changing delivery route:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change delivery route',
      error: error.message
    });
  }
};

// Rebook delivery date - Client only (before driver starts)
exports.rebookDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const authId = req.user.id;
    const clientDocId = req.user.clientId;
    const { deliveryDate, deliveryTime } = req.body;
    
    console.log(`🔍 Client ${authId} (clientId: ${clientDocId}) requesting to rebook delivery ${id}`);
    
    // Validate required fields
    if (!deliveryDate || !deliveryTime) {
      return res.status(400).json({
        success: false,
        message: 'New delivery date and time are required'
      });
    }
    
    // Get delivery and verify ownership
    const deliveryDoc = await db.collection('deliveries').doc(id).get();
    if (!deliveryDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }
    
    const deliveryData = deliveryDoc.data();
    const isOwner = deliveryData.clientId === authId || deliveryData.clientId === clientDocId;
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'You can only rebook your own deliveries'
      });
    }
    
    // Check if delivery can be modified (not started) - handle both field name conventions
    const deliveryStatus = (deliveryData.status || deliveryData.DeliveryStatus || deliveryData.deliveryStatus || '').toLowerCase();
    if (deliveryStatus === 'in_progress' || deliveryStatus === 'in-progress' || deliveryStatus === 'completed' || deliveryStatus === 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Cannot rebook delivery that has already started or been completed'
      });
    }
    
    // Enforce 24-hour minimum lead time
    const newDateObj = new Date(`${deliveryDate}T${deliveryTime}`);
    const now = new Date();
    const hoursUntilDelivery = (newDateObj - now) / (1000 * 60 * 60);
    if (hoursUntilDelivery < 24) {
      return res.status(400).json({
        success: false,
        message: 'Rescheduled deliveries must be at least 24 hours from now. Please select a later date or time.'
      });
    }
    
    // 12-HOUR COOLDOWN CHECK for the truck
    const truckId = deliveryData.truckId;
    if (truckId) {
      const cooldownHours = 12;
      const prevDate = new Date(newDateObj); prevDate.setDate(prevDate.getDate() - 1);
      const nextDate = new Date(newDateObj); nextDate.setDate(nextDate.getDate() + 1);
      const datesToCheck = [prevDate.toISOString().split('T')[0], deliveryDate, nextDate.toISOString().split('T')[0]];
      
      let conflictFound = null;
      for (const checkDate of datesToCheck) {
        let snap = await db.collection('deliveries')
          .where('truckId', '==', truckId).where('deliveryDateString', '==', checkDate)
          .where('deliveryStatus', 'in', ['pending', 'in-progress', 'started', 'picked-up']).get();
        if (snap.empty) {
          snap = await db.collection('deliveries')
            .where('truckId', '==', truckId).where('deliveryDateString', '==', checkDate)
            .where('DeliveryStatus', 'in', ['pending', 'in-progress', 'started', 'picked-up']).get();
        }
        if (!snap.empty) {
          for (const ds of snap.docs) {
            if (ds.id === id) continue; // Skip the current delivery being rescheduled
            const ex = ds.data();
            let et;
            if (ex.deliveryDate && ex.deliveryDate._seconds) { et = new Date(ex.deliveryDate._seconds * 1000); }
            else if (ex.deliveryDate && typeof ex.deliveryDate.toDate === 'function') { et = ex.deliveryDate.toDate(); }
            else if (ex.deliveryDateString) { et = new Date(ex.deliveryDateString + 'T12:00:00'); }
            else { et = new Date(ex.deliveryDate); }
            const hd = Math.abs(newDateObj - et) / (1000 * 60 * 60);
            if (hd < cooldownHours) { conflictFound = { deliveryId: ds.id, existingTime: et, hoursDiff: hd }; break; }
          }
        }
        if (conflictFound) break;
      }
      
      if (conflictFound) {
        const ets = conflictFound.existingTime.toLocaleString('en-PH');
        return res.status(400).json({
          success: false,
          message: `This truck is already booked near that time (${ets}). Trucks require a 12-hour cooldown between bookings. Please select a different time.`
        });
      }
    }
    
    // Update delivery date and time - write both field name conventions for compatibility
    await db.collection('deliveries').doc(id).update({
      deliveryDate: newDateObj,
      DeliveryDate: newDateObj,
      deliveryDateString: deliveryDate,
      deliveryTime,
      DeliveryTime: deliveryTime,
      rebookedAt: new Date().toISOString(),
      rebookedBy: authId,
      lastUpdated: new Date().toISOString()
    });
    
    console.log(`✅ Delivery ${id} rebooked by client ${authId} to ${deliveryDate} ${deliveryTime}`);
    
    // Create notification for the client
    const formattedDate = new Date(`${deliveryDate}T${deliveryTime}`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    try {
      await NotificationService.createNotification({
        userId: clientDocId || authId,
        type: 'delivery',
        title: 'Delivery Rescheduled 📅',
        message: `Your delivery #${id.substring(0, 8)} has been rescheduled to ${formattedDate} at ${deliveryTime}.`,
        metadata: {
          deliveryId: id,
          action: 'rebook',
          newDate: deliveryDate,
          newTime: deliveryTime,
        },
        priority: 'medium',
      });
    } catch (notifError) {
      console.error('⚠️ Failed to create rebook notification:', notifError);
    }
    
    res.json({
      success: true,
      message: 'Delivery rebooked successfully',
      deliveryId: id,
      newSchedule: {
        deliveryDate,
        deliveryTime
      }
    });
    
  } catch (error) {
    console.error('❌ Error rebooking delivery:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to rebook delivery',
      error: error.message
    });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// AVAILABILITY CHECKING ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

// Get available trucks for a specific date
exports.getAvailableTrucksForDate = async (req, res) => {
  try {
    const { date } = req.params; // Format: YYYY-MM-DD
    const clientId = req.user.id;
    
    console.log(`🔍 Checking available trucks for date: ${date}`);
    console.log(`👤 Client ID: ${clientId}`);
    
    // Get all allocated trucks for this client
    const allocationsSnapshot = await db.collection('allocations')
      .where('clientId', '==', clientId)
      .where('status', '==', 'active')
      .get();
    
    if (allocationsSnapshot.empty) {
      console.log('❌ No allocated trucks found for this client');
      return res.json({
        success: true,
        availableTrucks: [],
        bookedTrucks: []
      });
    }
    
    const allocatedTruckIds = allocationsSnapshot.docs.map(doc => doc.data().truckId);
    console.log(`📋 Client has ${allocatedTruckIds.length} allocated trucks`);
    
    // Get all active bookings for trucks allocated to this client
    // We can't filter by date directly in Firestore for Timestamp fields, so we get all active bookings
    const bookingsSnapshot = await db.collection('deliveries')
      .where('truckId', 'in', allocatedTruckIds.length > 0 ? allocatedTruckIds : ['dummy'])
      .where('deliveryStatus', 'in', ['pending', 'in-progress', 'started', 'picked-up'])
      .get();
    
    console.log(`📦 Found ${bookingsSnapshot.size} total active bookings for client's trucks`);
    
    // Filter bookings by date (handle both deliveryDateString and deliveryDate Timestamp)
    const bookedTruckIds = [];
    bookingsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const deliveryId = doc.id;
      
      // Check deliveryDateString first (new bookings)
      if (data.deliveryDateString === date) {
        console.log(`   📅 Truck ${data.truckId} booked via deliveryDateString: ${data.deliveryDateString} (${deliveryId})`);
        bookedTruckIds.push(data.truckId);
        return;
      }
      
      // Fallback: Check deliveryDate Timestamp (old bookings)
      if (data.deliveryDate && data.deliveryDate.toDate) {
        const deliveryDateObj = data.deliveryDate.toDate();
        const deliveryDateStr = deliveryDateObj.toISOString().split('T')[0]; // Convert to YYYY-MM-DD
        
        if (deliveryDateStr === date) {
          console.log(`   📅 Truck ${data.truckId} booked via deliveryDate Timestamp: ${deliveryDateStr} (${deliveryId})`);
          bookedTruckIds.push(data.truckId);
        }
      }
    });
    
    // Remove duplicates
    const uniqueBookedTruckIds = [...new Set(bookedTruckIds)];
    console.log(`📅 ${uniqueBookedTruckIds.length} unique trucks booked on ${date}:`, uniqueBookedTruckIds);
    
    // Filter available trucks (allocated to client AND not booked on this date)
    const availableTruckIds = allocatedTruckIds.filter(truckId => !uniqueBookedTruckIds.includes(truckId));
    const unavailableTruckIds = allocatedTruckIds.filter(truckId => uniqueBookedTruckIds.includes(truckId));
    
    console.log(`✅ ${availableTruckIds.length} trucks available`);
    console.log(`❌ ${unavailableTruckIds.length} trucks unavailable`);
    
    // Get truck details for available trucks
    const availableTrucks = [];
    for (const truckId of availableTruckIds) {
      const truckDoc = await db.collection('trucks').doc(truckId).get();
      if (truckDoc.exists) {
        availableTrucks.push({
          id: truckId,
          ...truckDoc.data()
        });
      }
    }
    
    res.json({
      success: true,
      date: date,
      availableTrucks: availableTrucks,
      bookedTruckIds: unavailableTruckIds,
      totalAllocated: allocatedTruckIds.length,
      totalAvailable: availableTruckIds.length,
      totalBooked: unavailableTruckIds.length
    });
    
  } catch (error) {
    console.error('❌ Error checking truck availability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check truck availability',
      error: error.message
    });
  }
};

// Get booked dates for a specific truck
exports.getBookedDatesForTruck = async (req, res) => {
  try {
    const { truckId } = req.params;
    const clientId = req.user.clientId;
    
    console.log(`🔍 Checking booked dates for truck: ${truckId}`);
    console.log(`👤 Client ID: ${clientId}`);
    
    // Verify truck is allocated to this client
    const allocationSnapshot = await db.collection('allocations')
      .where('clientId', '==', clientId)
      .where('truckId', '==', truckId)
      .where('status', '==', 'active')
      .get();
    
    if (allocationSnapshot.empty) {
      console.log('❌ Truck not allocated to this client');
      return res.status(403).json({
        success: false,
        message: 'Truck not allocated to your account'
      });
    }
    
    // Get all bookings for this truck (ALL clients including this one)
    const bookingsSnapshot = await db.collection('deliveries')
      .where('truckId', '==', truckId)
      .where('deliveryStatus', 'in', ['pending', 'in-progress', 'started', 'picked-up'])
      .get();
    
    const bookedDates = [];
    bookingsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      
      // Check deliveryDateString first (new bookings)
      if (data.deliveryDateString) {
        bookedDates.push({
          date: data.deliveryDateString,
          deliveryId: doc.id,
          clientId: data.clientId,
          isOwnBooking: data.clientId === clientId
        });
      } 
      // Fallback: Check deliveryDate Timestamp (old bookings)
      else if (data.deliveryDate && data.deliveryDate.toDate) {
        const deliveryDateObj = data.deliveryDate.toDate();
        const deliveryDateStr = deliveryDateObj.toISOString().split('T')[0]; // Convert to YYYY-MM-DD
        
        bookedDates.push({
          date: deliveryDateStr,
          deliveryId: doc.id,
          clientId: data.clientId,
          isOwnBooking: data.clientId === clientId
        });
      }
    });
    
    console.log(`📅 Truck ${truckId} has ${bookedDates.length} booked dates`);
    
    res.json({
      success: true,
      truckId: truckId,
      bookedDates: bookedDates,
      bookedDateStrings: bookedDates.map(b => b.date),
      totalBooked: bookedDates.length
    });
    
  } catch (error) {
    console.error('❌ Error checking truck booked dates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check truck booked dates',
      error: error.message
    });
  }
};

// Get available trucks for a specific date - checks ALL deliveries system-wide
exports.getAvailableTrucksForDate = async (req, res) => {
  try {
    const { date } = req.params;
    const clientId = req.user.clientId;
    
    console.log(`\n📅 Checking truck availability for date: ${date}`);
    console.log(`👤 Requested by client: ${clientId}`);
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required'
      });
    }
    
    // Get client's allocated trucks from allocations collection
    const allocationsSnapshot = await db.collection('allocations')
      .where('clientId', '==', clientId)
      .where('status', '==', 'active')
      .get();
    
    const allocatedTruckIds = allocationsSnapshot.docs.map(doc => doc.data().truckId);
    
    console.log(`🚚 Client has ${allocatedTruckIds.length} allocated trucks:`, allocatedTruckIds);
    
    // Check ALL deliveries on this date (not just client's deliveries)
    // Query with lowercase status first
    let deliveriesSnapshot = await db.collection('deliveries')
      .where('deliveryDateString', '==', date)
      .where('deliveryStatus', 'in', ['pending', 'in-progress', 'started', 'picked-up'])
      .get();
    
    console.log(`📦 Found ${deliveriesSnapshot.size} active deliveries on ${date} (lowercase status)`);
    
    // Also check with TitleCase status for compatibility
    const deliveriesSnapshotTitleCase = await db.collection('deliveries')
      .where('deliveryDateString', '==', date)
      .where('DeliveryStatus', 'in', ['pending', 'in-progress', 'started', 'picked-up'])
      .get();
    
    console.log(`📦 Found ${deliveriesSnapshotTitleCase.size} active deliveries on ${date} (TitleCase status)`);
    
    // Get truck IDs that are booked on this date (combine both query results)
    const bookedTruckIds = new Set();
    
    // Process lowercase status results
    deliveriesSnapshot.forEach(doc => {
      const delivery = doc.data();
      const truckId = delivery.truckId || delivery.TruckID;
      if (truckId) {
        bookedTruckIds.add(truckId);
        console.log(`  ❌ Truck ${truckId} is booked (Delivery: ${doc.id}, Client: ${delivery.clientId})`);
      }
    });
    
    // Process TitleCase status results
    deliveriesSnapshotTitleCase.forEach(doc => {
      const delivery = doc.data();
      const truckId = delivery.truckId || delivery.TruckID;
      if (truckId && !bookedTruckIds.has(truckId)) {
        bookedTruckIds.add(truckId);
        console.log(`  ❌ Truck ${truckId} is booked (Delivery: ${doc.id}, Client: ${delivery.clientId})`);
      }
    });
    
    // Filter allocated trucks to get available ones
    const availableTrucks = [];
    const unavailableTrucks = [];
    
    for (const truckId of allocatedTruckIds) {
      if (bookedTruckIds.has(truckId)) {
        unavailableTrucks.push(truckId);
      } else {
        availableTrucks.push(truckId);
      }
    }
    
    console.log(`✅ ${availableTrucks.length} trucks available on ${date}`);
    console.log(`❌ ${unavailableTrucks.length} trucks booked on ${date}`);
    
    res.json({
      success: true,
      date: date,
      totalAllocated: allocatedTruckIds.length,
      totalAvailable: availableTrucks.length,
      totalBooked: unavailableTrucks.length,
      availableTrucks: availableTrucks.map(id => ({ id })),
      bookedTrucks: unavailableTrucks.map(id => ({ id }))
    });
    
  } catch (error) {
    console.error('❌ Error checking truck availability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check truck availability',
      error: error.message
    });
  }
};