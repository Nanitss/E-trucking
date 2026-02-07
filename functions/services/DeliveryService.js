// Firebase Delivery Service
const FirebaseService = require('./FirebaseService');
const { db, admin } = require('../config/firebase');

class DeliveryService extends FirebaseService {
  constructor() {
    super('deliveries');
  }

  // Format delivery data for admin interface (transforms field names)
  _formatDeliveryForAdmin(delivery) {
    if (!delivery) return null;
    
    // Convert Firestore timestamp to JavaScript Date
    let deliveryDate = null;
    if (delivery.deliveryDate) {
      if (delivery.deliveryDate.seconds) {
        // Firestore timestamp
        deliveryDate = new Date(delivery.deliveryDate.seconds * 1000).toISOString();
      } else if (delivery.deliveryDate.toDate) {
        // Firestore timestamp object
        deliveryDate = delivery.deliveryDate.toDate().toISOString();
      } else {
        // String or other format
        deliveryDate = new Date(delivery.deliveryDate).toISOString();
      }
    } else if (delivery.created_at) {
      if (delivery.created_at.seconds) {
        deliveryDate = new Date(delivery.created_at.seconds * 1000).toISOString();
      } else if (delivery.created_at.toDate) {
        deliveryDate = delivery.created_at.toDate().toISOString();
      } else {
        deliveryDate = new Date(delivery.created_at).toISOString();
      }
    }

    // Convert created_at timestamp
    let createdAt = null;
    if (delivery.created_at) {
      if (delivery.created_at.seconds) {
        createdAt = new Date(delivery.created_at.seconds * 1000).toISOString();
      } else if (delivery.created_at.toDate) {
        createdAt = delivery.created_at.toDate().toISOString();
      } else {
        createdAt = new Date(delivery.created_at).toISOString();
      }
    }

    // Convert updated_at timestamp
    let updatedAt = null;
    if (delivery.updated_at) {
      if (delivery.updated_at.seconds) {
        updatedAt = new Date(delivery.updated_at.seconds * 1000).toISOString();
      } else if (delivery.updated_at.toDate) {
        updatedAt = delivery.updated_at.toDate().toISOString();
      } else {
        updatedAt = new Date(delivery.updated_at).toISOString();
      }
    }
    
    return {
      DeliveryID: delivery.id,
      ClientID: delivery.clientId,
      ClientName: delivery.clientName,
      DriverID: delivery.driverId,
      DriverName: delivery.driverName,
      DriverStatus: delivery.driverStatus || delivery.DriverStatus || 'unknown',
      HelperID: delivery.helperId,
      HelperName: delivery.helperName,
      HelperStatus: delivery.helperStatus || delivery.HelperStatus || 'unknown',
      DriverApprovalStatus: delivery.driverApprovalStatus || delivery.DriverApprovalStatus || 'not_applicable',
      HelperApprovalStatus: delivery.helperApprovalStatus || delivery.HelperApprovalStatus || 'not_applicable',
      TruckID: delivery.truckId,
      TruckPlate: delivery.truckPlate,
      TruckType: delivery.truckType,
      TruckBrand: delivery.truckBrand || 'Unknown',
      ModelYear: delivery.modelYear || null,
      TruckCapacity: delivery.truckCapacity || 0,
      TotalKilometers: delivery.totalKilometers || 0,
      TotalCompletedDeliveries: delivery.totalCompletedDeliveries || 0,
      AverageKmPerDelivery: delivery.averageKmPerDelivery || 0,
      DeliveryDate: deliveryDate, // Now properly converted
      DeliveryStatus: delivery.deliveryStatus || delivery.DeliveryStatus || 'pending', // Default to 'pending' if missing
      DeliveryAddress: delivery.deliveryAddress || delivery.dropoffLocation,
      DeliveryDistance: delivery.deliveryDistance,
      DeliveryRate: delivery.deliveryRate,
      PickupLocation: delivery.pickupLocation,
      PickupCoordinates: delivery.pickupCoordinates, // lowercase is the correct field name
      DropoffCoordinates: delivery.dropoffCoordinates, // lowercase is the correct field name
      CargoWeight: delivery.cargoWeight,
      TotalCargoWeight: delivery.totalCargoWeight || delivery.cargoWeight,
      EstimatedDuration: delivery.estimatedDuration,
      CreatedAt: createdAt, // Now properly converted
      UpdatedAt: updatedAt // Now properly converted
    };
  }

  // Override getAll to format data for admin interface
  async getAll(filters = []) {
    try {
      let query = this.collection;
      
      // Apply any filters
      filters.forEach(filter => {
        query = query.where(filter.field, filter.operator, filter.value);
      });
      
      const snapshot = await query.orderBy('created_at', 'desc').get();
      const deliveries = this._formatDocs(snapshot);
      
      // Transform each delivery for admin interface
      return deliveries.map(delivery => this._formatDeliveryForAdmin(delivery));
    } catch (error) {
      console.error('Error getting all deliveries:', error);
      throw error;
    }
  }

  // Override getById to format data for admin interface
  async getById(id) {
    try {
      const doc = await this.collection.doc(id).get();
      const delivery = this._formatDoc(doc);
      return this._formatDeliveryForAdmin(delivery);
    } catch (error) {
      console.error('Error getting delivery by ID:', error);
      throw error;
    }
  }

  // Create a new delivery with transaction for truck status update
  async createDelivery(deliveryData) {
    try {
      // Start a transaction to ensure data consistency
      const result = await db.runTransaction(async (transaction) => {
        // Check if truck is available
        const truckRef = db.collection('trucks').doc(deliveryData.truckId);
        const truckDoc = await transaction.get(truckRef);
        
        if (!truckDoc.exists) {
          throw new Error(`Truck with ID ${deliveryData.truckId} not found`);
        }
        
        const truck = truckDoc.data();
        // Check if truck is available for booking (accept 'available', 'free', or 'active' status)
        const availableStatuses = ['available', 'free', 'active'];
        if (!availableStatuses.includes(truck.truckStatus)) {
          throw new Error(`Truck with ID ${deliveryData.truckId} is not available. Current status: ${truck.truckStatus}`);
        }
        
        // Update truck status to allocated
        transaction.update(truckRef, { truckStatus: 'allocated' });
        
        // Create delivery document reference first to get the ID
        const deliveryRef = db.collection('deliveries').doc();
        
        // Add timestamps and ensure DeliveryID field exists
        const timestamp = admin.firestore.FieldValue.serverTimestamp();
        deliveryData.created_at = timestamp;
        deliveryData.updated_at = timestamp;
        deliveryData.deliveryStatus = 'pending';
        deliveryData.DeliveryID = deliveryRef.id; // Add DeliveryID field
        
        // Create delivery document
        transaction.set(deliveryRef, deliveryData);
        
        // Also update the allocations collection
        const allocationRef = db.collection('allocations').doc();
        const allocationData = {
          clientId: deliveryData.clientId,
          truckId: deliveryData.truckId,
          allocationDate: admin.firestore.Timestamp.fromDate(new Date(deliveryData.deliveryDate)),
          status: 'active',
          created_at: timestamp,
          updated_at: timestamp
        };
        
        transaction.set(allocationRef, allocationData);
        
        // Return the ID of the new delivery
        return { deliveryId: deliveryRef.id };
      });
      
      // Get the created delivery
      const deliveryDoc = await this.collection.doc(result.deliveryId).get();
      return this._formatDoc(deliveryDoc);
    } catch (error) {
      console.error('Error creating delivery:', error);
      throw error;
    }
  }

  // Complete a delivery with transaction
  async completeDelivery(id) {
    try {
      return await db.runTransaction(async (transaction) => {
        // Get the delivery
        const deliveryRef = this.collection.doc(id);
        const deliveryDoc = await transaction.get(deliveryRef);
        
        if (!deliveryDoc.exists) {
          throw new Error(`Delivery with ID ${id} not found`);
        }
        
        const delivery = deliveryDoc.data();
        
        // Can only complete deliveries that are in-progress
        if (delivery.deliveryStatus !== 'in-progress') {
          throw new Error(`Delivery with ID ${id} is not in-progress`);
        }
        
        // Recalculate delivery rate using current rates at completion time
        let updatedRate = null;
        try {
          const StaffService = require('./StaffService');
          const truckType = delivery.truckType || delivery.TruckType || 'mini truck';
          const distance = delivery.deliveryDistance || 0;
          const cargoWeight = delivery.cargoWeight || 0;
          
          if (distance > 0) {
            const costDetails = await StaffService.calculateDeliveryCost(truckType, distance, cargoWeight);
            updatedRate = Math.round(costDetails.totalCost);
            console.log(`💰 Recalculated rate at completion: ₱${updatedRate} (was ₱${delivery.deliveryRate || delivery.DeliveryRate || 'N/A'}) - Base: ₱${costDetails.baseRate}, ${distance}km × ₱${costDetails.ratePerKm}/km`);
          }
        } catch (rateError) {
          console.warn('⚠️ Could not recalculate rate at completion, keeping original:', rateError.message);
        }

        // Update delivery status and rate
        const updateData = {
          deliveryStatus: 'completed',
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        };
        
        if (updatedRate !== null) {
          updateData.deliveryRate = updatedRate;
          updateData.DeliveryRate = updatedRate;
          updateData.rateRecalculatedAt = admin.firestore.FieldValue.serverTimestamp();
          updateData.originalBookingRate = delivery.deliveryRate || delivery.DeliveryRate || null;
        }
        
        transaction.update(deliveryRef, updateData);
        
        // Get truck reference for updates
        const truckRef = db.collection('trucks').doc(delivery.truckId);
        
        // Update truck kilometers when delivery is completed
        if (delivery.truckId && delivery.deliveryDistance && delivery.deliveryDistance > 0) {
          console.log(`🛻 Updating kilometers for truck ${delivery.truckId}: +${delivery.deliveryDistance}km`);
          try {
            // Get current truck data from transaction
            const currentTruckDoc = await transaction.get(truckRef);
            if (currentTruckDoc.exists) {
              const currentTruck = currentTruckDoc.data();
              const currentKm = currentTruck.totalKilometers || 0;
              const currentDeliveries = currentTruck.totalCompletedDeliveries || 0;
              const newTotalKm = currentKm + delivery.deliveryDistance;
              const newTotalDeliveries = currentDeliveries + 1;
              const newAverageKm = newTotalDeliveries > 0 ? Math.round((newTotalKm / newTotalDeliveries) * 100) / 100 : 0;
              
              // Update truck kilometers within the same transaction
              transaction.update(truckRef, {
                totalKilometers: Math.round(newTotalKm * 100) / 100,
                totalCompletedDeliveries: newTotalDeliveries,
                averageKmPerDelivery: newAverageKm,
                lastOdometerUpdate: admin.firestore.FieldValue.serverTimestamp()
              });
              
              console.log(`✅ Updated truck ${delivery.truckId} kilometers: ${currentKm}km → ${newTotalKm}km (${newTotalDeliveries} deliveries)`);
            }
          } catch (kmError) {
            console.error('Error updating truck kilometers:', kmError);
            // Don't fail the entire transaction if kilometer update fails
          }
        }
        
        // Update truck status - check if truck should remain allocated
        
        // Check if there's an active allocation for this truck
        const allocationsSnapshot = await db.collection('allocations')
          .where('truckId', '==', delivery.truckId)
          .where('status', '==', 'active')
          .limit(1)
          .get();
        
        if (!allocationsSnapshot.empty) {
          // Truck should remain allocated but no longer actively in delivery
          transaction.update(truckRef, { 
            truckStatus: 'allocated',
            activeDelivery: false,
            currentDeliveryId: null,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          });
        } else {
          // No allocation exists, truck becomes available
          transaction.update(truckRef, { 
            truckStatus: 'available',
            activeDelivery: false,
            currentDeliveryId: null,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          });
        }
        
        // Update driver status back to active if assigned
        if (delivery.driverId) {
          const driverRef = db.collection('drivers').doc(delivery.driverId);
          transaction.update(driverRef, {
            DriverStatus: 'active',
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`✅ Updated driver ${delivery.driverName} status back to 'active'`);
        }
        
        // Update helper status back to active if assigned
        if (delivery.helperId) {
          const helperRef = db.collection('helpers').doc(delivery.helperId);
          transaction.update(helperRef, {
            HelperStatus: 'active',
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`✅ Updated helper ${delivery.helperName} status back to 'active'`);
        }
        
        // DO NOT automatically deallocate trucks when delivery completes
        // Trucks should remain allocated to the client after delivery completion
        // Only deallocate if explicitly requested by admin through the deallocate endpoint
        console.log(`✅ Delivery completed but truck ${delivery.truckId} remains allocated to client ${delivery.clientId}`);
        console.log(`🔧 Truck status updated to 'allocated' with activeDelivery: false`);
        
        return this._formatDoc(deliveryDoc);
      });
    } catch (error) {
      console.error('Error completing delivery:', error);
      throw error;
    }
  }

  // Get all deliveries for a client
  async getClientDeliveries(clientId) {
    try {
      // Remove orderBy to avoid Firebase index requirement
      const snapshot = await this.collection.where('clientId', '==', clientId).get();
      const deliveries = this._formatDocs(snapshot);
      
      // Sort in memory by created_at (newest first)
      const sortedDeliveries = deliveries.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at.seconds * 1000) : new Date(0);
        const dateB = b.created_at ? new Date(b.created_at.seconds * 1000) : new Date(0);
        return dateB - dateA;
      });
      
      // Transform each delivery for admin interface
      return sortedDeliveries.map(delivery => this._formatDeliveryForAdmin(delivery));
    } catch (error) {
      console.error('Error getting client deliveries:', error);
      throw error;
    }
  }

  // Get all deliveries for a driver
  async getDriverDeliveries(driverId) {
    try {
      // Remove orderBy to avoid Firebase index requirement
      const snapshot = await this.collection.where('driverId', '==', driverId).get();
      const deliveries = this._formatDocs(snapshot);
      
      // Sort in memory by created_at (newest first)
      const sortedDeliveries = deliveries.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at.seconds * 1000) : new Date(0);
        const dateB = b.created_at ? new Date(b.created_at.seconds * 1000) : new Date(0);
        return dateB - dateA;
      });
      
      // Transform each delivery for admin interface
      return sortedDeliveries.map(delivery => this._formatDeliveryForAdmin(delivery));
    } catch (error) {
      console.error('Error getting driver deliveries:', error);
      throw error;
    }
  }

  // Get all deliveries by status
  async getDeliveriesByStatus(status) {
    try {
      // Remove orderBy to avoid Firebase index requirement
      const snapshot = await this.collection.where('deliveryStatus', '==', status).get();
      const deliveries = this._formatDocs(snapshot);
      
      // Sort in memory by created_at (newest first)
      const sortedDeliveries = deliveries.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at.seconds * 1000) : new Date(0);
        const dateB = b.created_at ? new Date(b.created_at.seconds * 1000) : new Date(0);
        return dateB - dateA; // Descending order (newest first)
      });
      
      // Transform each delivery for admin interface
      return sortedDeliveries.map(delivery => this._formatDeliveryForAdmin(delivery));
    } catch (error) {
      console.error('Error getting deliveries by status:', error);
      
      // Fallback: try without any filtering if the where clause fails
      try {
        console.log('Attempting fallback query without status filter...');
        const snapshot = await this.collection.get();
        const allDeliveries = this._formatDocs(snapshot);
        
        // Filter by status in memory
        const filteredDeliveries = allDeliveries.filter(delivery => delivery.deliveryStatus === status);
        
        // Sort in memory by created_at (newest first)
        const sortedDeliveries = filteredDeliveries.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at.seconds * 1000) : new Date(0);
          const dateB = b.created_at ? new Date(b.created_at.seconds * 1000) : new Date(0);
          return dateB - dateA;
        });
        
        return sortedDeliveries.map(delivery => this._formatDeliveryForAdmin(delivery));
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
        throw error; // Throw original error
      }
    }
  }

  // Override update method to ensure driver/helper status restoration
  async update(id, data) {
    try {
      // Check if deliveryStatus is being updated to a final state (check both field name variations)
      const finalStatuses = ['delivered', 'completed', 'cancelled'];
      const status = data.deliveryStatus || data.DeliveryStatus;
      const isStatusUpdate = status && finalStatuses.includes(status.toLowerCase());
      
      if (isStatusUpdate) {
        // Use updateDeliveryStatus to ensure proper resource restoration
        console.log(`📋 Delivery ${id} status changing to '${status}' - triggering status restoration logic`);
        return await this.updateDeliveryStatus(id, status);
      }
      
      // For non-status updates or non-final status updates, use base update
      return await super.update(id, data);
    } catch (error) {
      console.error('Error updating delivery:', error);
      throw error;
    }
  }

  // Update delivery status with automatic resource restoration
  async updateDeliveryStatus(id, status) {
    try {
      return await db.runTransaction(async (transaction) => {
        // Get the delivery
        const deliveryRef = this.collection.doc(id);
        const deliveryDoc = await transaction.get(deliveryRef);
        
        if (!deliveryDoc.exists) {
          throw new Error(`Delivery with ID ${id} not found`);
        }
        
        const delivery = deliveryDoc.data();
        
        // Map delivery status to driver/helper status
        let driverStatus = delivery.driverStatus || 'unknown';
        let helperStatus = delivery.helperStatus || 'unknown';
        
        // Update driver and helper status to match delivery status
        const statusLower = status.toLowerCase();
        
        if (statusLower === 'pending') {
          driverStatus = 'awaiting_approval';
          helperStatus = 'awaiting_approval';
        } else if (statusLower === 'accepted') {
          driverStatus = 'accepted';
          helperStatus = 'accepted';
        } else if (statusLower === 'in-progress' || statusLower === 'in progress' || statusLower === 'started') {
          driverStatus = 'in_progress';
          helperStatus = 'in_progress';
        } else if (statusLower === 'delivered') {
          driverStatus = 'delivered';
          helperStatus = 'delivered';
        } else if (statusLower === 'completed') {
          driverStatus = 'completed';
          helperStatus = 'completed';
        } else if (statusLower === 'cancelled') {
          driverStatus = 'cancelled';
          helperStatus = 'cancelled';
        }
        
        console.log(`📋 Updating delivery ${id}: status=${status}, driverStatus=${driverStatus}, helperStatus=${helperStatus}`);
        
        // Update delivery status along with driver/helper statuses
        transaction.update(deliveryRef, { 
          deliveryStatus: status,
          DeliveryStatus: status, // TitleCase for compatibility
          driverStatus: driverStatus,
          helperStatus: helperStatus,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Update truck statistics when delivery is delivered
        if (status === 'delivered' && delivery.truckId) {
          console.log(`📊 Delivery ${id} marked as 'delivered' - updating truck statistics...`);
          
          const truckRef = db.collection('trucks').doc(delivery.truckId);
          const truckDoc = await transaction.get(truckRef);
          
          if (truckDoc.exists) {
            const truckData = truckDoc.data();
            const currentTotalDeliveries = truckData.TotalDeliveries || 0;
            const currentTotalKilometers = truckData.TotalKilometers || 0;
            const deliveryDistance = delivery.estimatedDistance || 0;
            
            const newTotalDeliveries = currentTotalDeliveries + 1;
            const newTotalKilometers = currentTotalKilometers + deliveryDistance;
            
            transaction.update(truckRef, {
              TotalDeliveries: newTotalDeliveries,
              TotalKilometers: parseFloat(newTotalKilometers.toFixed(2)),
              updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
            
            console.log(`✅ Truck ${delivery.truckPlate || delivery.truckId} stats updated:`);
            console.log(`   Deliveries: ${currentTotalDeliveries} → ${newTotalDeliveries}`);
            console.log(`   Kilometers: ${currentTotalKilometers}km → ${newTotalKilometers.toFixed(2)}km (+${deliveryDistance}km)`);
          }
        }
        
        // Restore resources when delivery is finished (delivered, completed, or cancelled)
        if (status === 'delivered' || status === 'completed' || status === 'cancelled') {
          console.log(`🔄 Delivery ${id} status changed to '${status}' - restoring resource statuses...`);
          
          const truckRef = db.collection('trucks').doc(delivery.truckId);
          
          // Check if truck is allocated to determine correct status
          const allocationsSnapshot = await db.collection('allocations')
            .where('truckId', '==', delivery.truckId)
            .where('status', '==', 'active')
            .limit(1)
            .get();
          
          // Restore truck status
          if (!allocationsSnapshot.empty) {
            // Truck is allocated - set to 'free' (available for client to book)
            transaction.update(truckRef, { 
              truckStatus: 'free',
              TruckStatus: 'free',
              availabilityStatus: 'free',
              AvailabilityStatus: 'free',
              activeDelivery: false,
              currentDeliveryId: null,
              updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`✅ Truck ${delivery.truckPlate || delivery.truckId} status restored to 'free' (allocated)`);
          } else {
            // Truck is not allocated - set to 'available'
            transaction.update(truckRef, { 
              truckStatus: 'available',
              TruckStatus: 'available',
              availabilityStatus: 'available',
              AvailabilityStatus: 'available',
              activeDelivery: false,
              currentDeliveryId: null,
              updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`✅ Truck ${delivery.truckPlate || delivery.truckId} status restored to 'available'`);
          }
          
          // Restore driver status to 'active'
          if (delivery.driverId) {
            const driverRef = db.collection('drivers').doc(delivery.driverId);
            transaction.update(driverRef, {
              DriverStatus: 'active',
              driverStatus: 'active',
              updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`✅ Driver ${delivery.driverName || delivery.driverId} status restored to 'active'`);
          }
          
          // Restore helper status to 'active'
          if (delivery.helperId) {
            const helperRef = db.collection('helpers').doc(delivery.helperId);
            transaction.update(helperRef, {
              HelperStatus: 'active',
              helperStatus: 'active',
              updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`✅ Helper ${delivery.helperName || delivery.helperId} status restored to 'active'`);
          }
        }
        
        return this._formatDoc(deliveryDoc);
      });
    } catch (error) {
      console.error('Error updating delivery status:', error);
      throw error;
    }
  }

  // Find deliveries near a specific location within a radius
  async getDeliveriesNearLocation(location, radiusInKm, type = 'pickup') {
    try {
      // Get all deliveries first since Firestore doesn't support geospatial queries natively
      let deliveries = [];
      
      if (type === 'pickup') {
        // Search by pickup location
        const snapshot = await this.collection.get();
        deliveries = this._formatDocs(snapshot);
      } else {
        // Search by dropoff location
        const snapshot = await this.collection.get();
        deliveries = this._formatDocs(snapshot);
      }
      
      // Filter deliveries by calculating distance using Haversine formula
      return deliveries.filter(delivery => {
        // Determine which coordinates to use
        const coords = type === 'pickup' ? delivery.pickupCoordinates : delivery.dropoffCoordinates;
        
        // Skip if coordinates are missing
        if (!coords || !coords.lat || !coords.lng) return false;
        
        // Calculate distance using Haversine formula
        const R = 6371; // Earth's radius in km
        const dLat = (coords.lat - location.lat) * Math.PI / 180;
        const dLon = (coords.lng - location.lng) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(location.lat * Math.PI / 180) * Math.cos(coords.lat * Math.PI / 180) * 
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        // Return true if distance is within radius
        return distance <= radiusInKm;
      });
    } catch (error) {
      console.error('Error getting deliveries near location:', error);
      throw error;
    }
  }
}

module.exports = new DeliveryService(); 