const { db } = require('../config/firebase');
const DeliveryService = require('../services/DeliveryService');
const admin = require('firebase-admin');

// Get all deliveries
exports.getAllDeliveries = async (req, res) => {
  try {
    // Get all deliveries from Firestore
    const deliveries = await DeliveryService.getAll();
    
    // For each delivery, get the associated client and truck details
    const enrichedDeliveries = await Promise.all(deliveries.map(async (delivery) => {
      let clientName = 'Unknown';
      let truckPlate = 'Unknown';
      let truckType = 'Unknown';
      let truckBrand = 'Unknown';
      let modelYear = null;
      let truckCapacity = 0;
      let totalKilometers = 0;
      let totalCompletedDeliveries = 0;
      let averageKmPerDelivery = 0;
      
      // Get client details
      if (delivery.clientId) {
        const clientDoc = await db.collection('clients').doc(delivery.clientId).get();
        if (clientDoc.exists) {
          clientName = clientDoc.data().clientName;
        }
      }
      
      // Get truck details
      if (delivery.truckId) {
        const truckDoc = await db.collection('trucks').doc(delivery.truckId).get();
        if (truckDoc.exists) {
          const truckData = truckDoc.data();
          truckPlate = truckData.truckPlate || 'Unknown';
          truckType = truckData.truckType || 'Unknown';
          truckBrand = truckData.truckBrand || 'Unknown';
          modelYear = truckData.modelYear || null;
          truckCapacity = truckData.truckCapacity || 0;
          totalKilometers = truckData.totalKilometers || 0;
          totalCompletedDeliveries = truckData.totalCompletedDeliveries || 0;
          averageKmPerDelivery = truckData.averageKmPerDelivery || 0;
        }
      }
      
      return {
        ...delivery,
        clientName,
        truckPlate,
        truckType,
        truckBrand,
        modelYear,
        truckCapacity,
        totalKilometers,
        totalCompletedDeliveries,
        averageKmPerDelivery
      };
    }));
    
    res.json(enrichedDeliveries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get delivery by ID
exports.getDeliveryById = async (req, res) => {
  try {
    const delivery = await DeliveryService.getById(req.params.id);
    
    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }
    
    // Get client details
    let clientName = 'Unknown';
    if (delivery.clientId) {
      const clientDoc = await db.collection('clients').doc(delivery.clientId).get();
      if (clientDoc.exists) {
        clientName = clientDoc.data().clientName;
      }
    }
    
    // Get truck details
    let truckPlate = 'Unknown';
    let truckType = 'Unknown';
    let truckBrand = 'Unknown';
    let modelYear = null;
    let truckCapacity = 0;
    let totalKilometers = 0;
    let totalCompletedDeliveries = 0;
    let averageKmPerDelivery = 0;
    
    if (delivery.truckId) {
      const truckDoc = await db.collection('trucks').doc(delivery.truckId).get();
      if (truckDoc.exists) {
        const truckData = truckDoc.data();
        truckPlate = truckData.truckPlate || 'Unknown';
        truckType = truckData.truckType || 'Unknown';
        truckBrand = truckData.truckBrand || 'Unknown';
        modelYear = truckData.modelYear || null;
        truckCapacity = truckData.truckCapacity || 0;
        totalKilometers = truckData.totalKilometers || 0;
        totalCompletedDeliveries = truckData.totalCompletedDeliveries || 0;
        averageKmPerDelivery = truckData.averageKmPerDelivery || 0;
      }
    }
    
    const enrichedDelivery = {
      ...delivery,
      clientName,
      truckPlate,
      truckType,
      truckBrand,
      modelYear,
      truckCapacity,
      totalKilometers,
      totalCompletedDeliveries,
      averageKmPerDelivery
    };
    
    res.json(enrichedDelivery);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create delivery
exports.createDelivery = async (req, res) => {
  try {
    const {
      clientId,
      driverName,
      helperName,
      truckId,
      deliveryDate,
      deliveryStatus,
      deliveryDistance,
      deliveryRate,
      deliveryAddress
    } = req.body;
    
    // Check if client exists
    const clientDoc = await db.collection('clients').doc(clientId).get();
    
    if (!clientDoc.exists) {
      return res.status(404).json({ message: 'Client not found' });
    }
    
    // Check if truck exists and is available
    const truckDoc = await db.collection('trucks').doc(truckId).get();
    
    if (!truckDoc.exists) {
      return res.status(404).json({ message: 'Truck not found' });
    }
    
    const truck = truckDoc.data();
    if (truck.truckStatus !== 'available' && truck.truckStatus !== 'allocated') {
      return res.status(400).json({ message: 'Truck is not available for delivery' });
    }
    
    // Check if client has this truck allocated
    if (truck.truckStatus === 'allocated') {
      const allocationsSnapshot = await db.collection('allocations')
        .where('clientId', '==', clientId)
        .where('truckId', '==', truckId)
        .where('status', '==', 'active')
        .get();
      
      if (allocationsSnapshot.empty) {
        return res.status(400).json({ message: 'This truck is not allocated to the selected client' });
      }
    }
    
    // Get truck details to include in delivery data
    const truckDoc = await db.collection('trucks').doc(truckId).get();
    if (!truckDoc.exists) {
      return res.status(404).json({ message: 'Truck not found' });
    }
    const truckData = truckDoc.data();

    // Create delivery using DeliveryService
    const deliveryData = {
      clientId,
      driverName,
      helperName,
      truckId,
      truckPlate: truckData.truckPlate,
      truckType: truckData.truckType,
      truckBrand: truckData.truckBrand || 'Unknown',
      modelYear: truckData.modelYear || null,
      truckCapacity: truckData.truckCapacity || 0,
      totalKilometers: truckData.totalKilometers || 0,
      totalCompletedDeliveries: truckData.totalCompletedDeliveries || 0,
      averageKmPerDelivery: truckData.averageKmPerDelivery || 0,
      deliveryDate: new Date(deliveryDate),
      deliveryStatus: deliveryStatus || 'pending',
      deliveryDistance,
      deliveryRate,
      deliveryAddress
    };
    
    const delivery = await DeliveryService.createDelivery(deliveryData);
    
    res.status(201).json({
      message: 'Delivery created successfully',
      deliveryId: delivery.id
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update delivery
exports.updateDelivery = async (req, res) => {
  try {
    const deliveryId = req.params.id;
    
    // Check if delivery exists
    const delivery = await DeliveryService.getById(deliveryId);
    
    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }
    
    const {
      driverName,
      helperName,
      deliveryDate,
      deliveryStatus,
      deliveryDistance,
      deliveryRate,
      deliveryAddress
    } = req.body;
    
    const updateData = {};
    
    // Only update provided fields
    if (driverName) updateData.driverName = driverName;
    if (helperName) updateData.helperName = helperName;
    if (deliveryDate) updateData.deliveryDate = new Date(deliveryDate);
    if (deliveryDistance) updateData.deliveryDistance = deliveryDistance;
    if (deliveryRate) updateData.deliveryRate = deliveryRate;
    if (deliveryAddress) updateData.deliveryAddress = deliveryAddress;
    
    // Handle delivery status change with special logic
    if (deliveryStatus && delivery.deliveryStatus !== deliveryStatus) {
      updateData.deliveryStatus = deliveryStatus;
      
      // Update truck status based on delivery status
      const truckRef = db.collection('trucks').doc(delivery.truckId);
      
      if (deliveryStatus === 'in-progress') {
        await truckRef.update({ truckStatus: 'on-delivery' });
      } else if (deliveryStatus === 'delivered' || deliveryStatus === 'completed' || deliveryStatus === 'cancelled') {
        // Restore truck, driver, and helper statuses when delivery is finished
        console.log(`🔄 Delivery ${deliveryId} status changed to '${deliveryStatus}' - restoring resource statuses...`);
        
        // Check if truck is allocated to a client to determine correct status
        const allocationsSnapshot = await db.collection('allocations')
          .where('truckId', '==', delivery.truckId)
          .where('status', '==', 'active')
          .get();
        
        // Restore truck status
        if (!allocationsSnapshot.empty) {
          // Truck is allocated - set to 'free' (available for client to book)
          await truckRef.update({ 
            truckStatus: 'free',
            TruckStatus: 'free', // Also update TitleCase version for consistency
            availabilityStatus: 'free',
            AvailabilityStatus: 'free',
            activeDelivery: false,
            currentDeliveryId: null,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`✅ Truck ${delivery.truckPlate || delivery.truckId} status restored to 'free' (allocated truck)`);
        } else {
          // Truck is not allocated - set to 'available'
          await truckRef.update({ 
            truckStatus: 'available',
            TruckStatus: 'available',
            availabilityStatus: 'available',
            AvailabilityStatus: 'available',
            activeDelivery: false,
            currentDeliveryId: null,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`✅ Truck ${delivery.truckPlate || delivery.truckId} status restored to 'available' (unallocated truck)`);
        }
        
        // Restore driver status to 'active'
        if (delivery.driverId) {
          await db.collection('drivers').doc(delivery.driverId).update({
            DriverStatus: 'active',
            driverStatus: 'active',
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`✅ Driver ${delivery.driverName || delivery.driverId} status restored to 'active'`);
        }
        
        // Restore helper status to 'active'
        if (delivery.helperId) {
          await db.collection('helpers').doc(delivery.helperId).update({
            HelperStatus: 'active',
            helperStatus: 'active',
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`✅ Helper ${delivery.helperName || delivery.helperId} status restored to 'active'`);
        }
      }
    }
    
    // Update the delivery
    await DeliveryService.update(deliveryId, updateData);
    
    res.json({ message: 'Delivery updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};