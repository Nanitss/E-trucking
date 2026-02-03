// Firebase Allocation Service
const FirebaseService = require('./FirebaseService');
const { admin, db } = require('../config/firebase');

class AllocationService extends FirebaseService {
  constructor() {
    super('allocations');
  }

  // Get active allocations for a client
  async getClientAllocations(clientId) {
    try {
      const snapshot = await this.collection
        .where('clientId', '==', clientId)
        .where('status', '==', 'active')
        .get();
      
      return this._formatDocs(snapshot);
    } catch (error) {
      console.error('Error getting client allocations:', error);
      throw error;
    }
  }

  // Get allocations for a truck
  async getTruckAllocations(truckId) {
    try {
      const snapshot = await this.collection
        .where('truckId', '==', truckId)
        .get();
      
      return this._formatDocs(snapshot);
    } catch (error) {
      console.error('Error getting truck allocations:', error);
      throw error;
    }
  }

  // Create a new allocation with transaction for truck status update
  async createAllocation(allocationData) {
    try {
      // Start a transaction to ensure data consistency
      const result = await db.runTransaction(async (transaction) => {
        // Check if truck is available
        const truckRef = db.collection('trucks').doc(allocationData.truckId);
        const truckDoc = await transaction.get(truckRef);
        
        if (!truckDoc.exists) {
          throw new Error(`Truck with ID ${allocationData.truckId} not found`);
        }
        
        const truck = truckDoc.data();
        if (truck.truckStatus !== 'available') {
          throw new Error(`Truck with ID ${allocationData.truckId} is not available`);
        }
        
        // Check if client exists
        const clientRef = db.collection('clients').doc(allocationData.clientId);
        const clientDoc = await transaction.get(clientRef);
        
        if (!clientDoc.exists) {
          throw new Error(`Client with ID ${allocationData.clientId} not found`);
        }
        
        // Update truck status with enhanced fields
        transaction.update(truckRef, { 
          // Legacy status
          truckStatus: 'allocated',
          // Enhanced status tracking
          allocationStatus: 'allocated',
          availabilityStatus: 'busy',
          // Allocation tracking
          currentClientId: allocationData.clientId,
          // Timestamps
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
          lastAllocationChange: admin.firestore.FieldValue.serverTimestamp(),
          // Increment allocation counter
          totalAllocations: admin.firestore.FieldValue.increment(1)
        });
        
        // Add timestamps
        const timestamp = admin.firestore.FieldValue.serverTimestamp();
        allocationData.created_at = timestamp;
        allocationData.updated_at = timestamp;
        allocationData.status = 'active';
        
        // Create allocation document
        const allocationRef = db.collection('allocations').doc();
        transaction.set(allocationRef, allocationData);
        
        // Return the ID of the new allocation
        return { allocationId: allocationRef.id };
      });
      
      // Get the created allocation
      const allocationDoc = await this.collection.doc(result.allocationId).get();
      return this._formatDoc(allocationDoc);
    } catch (error) {
      console.error('Error creating allocation:', error);
      throw error;
    }
  }

  // Return a truck (end allocation) with transaction
  async returnTruck(allocationId) {
    try {
      return await db.runTransaction(async (transaction) => {
        // Get the allocation
        const allocationRef = this.collection.doc(allocationId);
        const allocationDoc = await transaction.get(allocationRef);
        
        if (!allocationDoc.exists) {
          throw new Error(`Allocation with ID ${allocationId} not found`);
        }
        
        const allocation = allocationDoc.data();
        
        // Can only return active allocations
        if (allocation.status !== 'active') {
          throw new Error(`Allocation with ID ${allocationId} is not active`);
        }
        
        // Update allocation status
        transaction.update(allocationRef, { 
          status: 'returned',
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Update truck status with enhanced fields
        const truckRef = db.collection('trucks').doc(allocation.truckId);
        transaction.update(truckRef, { 
          // Legacy status
          truckStatus: 'available',
          // Enhanced status tracking
          allocationStatus: 'available',
          availabilityStatus: 'free',
          // Clear allocation tracking
          currentClientId: null,
          currentAllocationId: null,
          currentDeliveryId: null,
          // Timestamps
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
          lastAllocationChange: admin.firestore.FieldValue.serverTimestamp()
        });
        
        return this._formatDoc(allocationDoc);
      });
    } catch (error) {
      console.error('Error returning truck:', error);
      throw error;
    }
  }
}

module.exports = new AllocationService(); 