const express = require('express');
const router = express.Router();
const { admin, db } = require('../config/firebase');

/**
 * Helper function to apply filters to Firestore query
 */
const applyFilters = (query, filters, entityType) => {
  let filteredQuery = query;

  // Common filters (status)
  // Note: We can't efficiently filter by status in Firestore query because field names vary
  // Status filtering will be done in-memory

  // Entity-specific filters
  switch (entityType) {
    case 'trucks':
      if (filters.truckType) {
        filteredQuery = filteredQuery.where('TruckType', '==', filters.truckType);
      }
      break;

    case 'deliveries':
      if (filters.clientName) {
        // This will need to be a text search - for now using contains-like approach
      }
      break;

    // Add more entity-specific filters as needed
  }

  return filteredQuery;
};

/**
 * Filter data in memory (for filters that can't be applied at query level)
 */
const filterInMemory = (data, filters, entityType) => {
  return data.filter(item => {
    // Status filter (common for all entities)
    if (filters.status) {
      // Special handling for billings - status field is just 'status'
      let itemStatus;
      if (entityType === 'billings') {
        itemStatus = item.status;
      } else {
        const statusField = `${entityType.slice(0, -1)}Status`; // trucks -> truckStatus
        itemStatus = item[statusField] || item[`${entityType.charAt(0).toUpperCase() + entityType.slice(1, -1)}Status`];
      }
      if (itemStatus !== filters.status) return false;
    }
    
    // Date range filters
    if (filters.dateFrom || filters.dateTo) {
      const dateField = getDateField(entityType);
      if (item[dateField]) {
        const itemDate = item[dateField].toDate ? item[dateField].toDate() : new Date(item[dateField]);
        
        if (filters.dateFrom && itemDate < new Date(filters.dateFrom)) return false;
        if (filters.dateTo && itemDate > new Date(filters.dateTo)) return false;
      }
    }

    // Text search filters
    if (filters.name) {
      const nameField = getNameField(entityType);
      if (item[nameField] && !item[nameField].toLowerCase().includes(filters.name.toLowerCase())) {
        return false;
      }
    }

    // Number range filters
    if (filters.minCapacity || filters.maxCapacity) {
      const capacity = parseFloat(item.TruckCapacity) || 0;
      if (filters.minCapacity && capacity < parseFloat(filters.minCapacity)) return false;
      if (filters.maxCapacity && capacity > parseFloat(filters.maxCapacity)) return false;
    }

    if (filters.minAmount || filters.maxAmount) {
      const amount = parseFloat(item.TotalAmount || item.DeliveryRate) || 0;
      if (filters.minAmount && amount < parseFloat(filters.minAmount)) return false;
      if (filters.maxAmount && amount > parseFloat(filters.maxAmount)) return false;
    }

    if (filters.minDistance || filters.maxDistance) {
      const distance = parseFloat(item.DeliveryDistance) || 0;
      if (filters.minDistance && distance < parseFloat(filters.minDistance)) return false;
      if (filters.maxDistance && distance > parseFloat(filters.maxDistance)) return false;
    }

    // Truck-specific filters
    if (entityType === 'trucks') {
      if (filters.brand) {
        const brand = item.truckBrand || item.TruckBrand || '';
        if (!brand.toLowerCase().includes(filters.brand.toLowerCase())) {
          return false;
        }
      }
      if (filters.plateNumber) {
        const plate = item.truckPlate || item.TruckPlateNumber || '';
        if (!plate.toLowerCase().includes(filters.plateNumber.toLowerCase())) {
          return false;
        }
      }
      if (filters.minKilometers || filters.maxKilometers) {
        const km = parseFloat(item.truckKilometers || item.TruckKilometers) || 0;
        if (filters.minKilometers && km < parseFloat(filters.minKilometers)) return false;
        if (filters.maxKilometers && km > parseFloat(filters.maxKilometers)) return false;
      }
      if (filters.manufactureDateFrom || filters.manufactureDateTo) {
        const mfgDate = item.manufactureDate || item.ManufactureDate || item.modelYear;
        if (mfgDate) {
          const date = mfgDate.toDate ? mfgDate.toDate() : new Date(mfgDate);
          if (filters.manufactureDateFrom && date < new Date(filters.manufactureDateFrom)) return false;
          if (filters.manufactureDateTo && date > new Date(filters.manufactureDateTo)) return false;
        }
      }
      if (filters.minCapacity || filters.maxCapacity) {
        const capacity = parseFloat(item.truckCapacity || item.TruckCapacity) || 0;
        if (filters.minCapacity && capacity < parseFloat(filters.minCapacity)) return false;
        if (filters.maxCapacity && capacity > parseFloat(filters.maxCapacity)) return false;
      }
    }

    // Driver-specific filters
    if (entityType === 'drivers') {
      if (filters.contact && item.DriverContact && !item.DriverContact.includes(filters.contact)) {
        return false;
      }
      if (filters.licenseType && item.LicenseType !== filters.licenseType) return false;
      if (filters.assignmentStatus) {
        const isAssigned = item.AssignedTruck || item.CurrentTruck;
        if (filters.assignmentStatus === 'assigned' && !isAssigned) return false;
        if (filters.assignmentStatus === 'unassigned' && isAssigned) return false;
      }
      if (filters.licenseExpiryFrom || filters.licenseExpiryTo) {
        if (item.LicenseExpiry) {
          const expiry = item.LicenseExpiry.toDate ? item.LicenseExpiry.toDate() : new Date(item.LicenseExpiry);
          if (filters.licenseExpiryFrom && expiry < new Date(filters.licenseExpiryFrom)) return false;
          if (filters.licenseExpiryTo && expiry > new Date(filters.licenseExpiryTo)) return false;
        }
      }
      // Employment date filters (formerly join date)
      if (filters.employmentDateFrom || filters.employmentDateTo) {
        const employmentDateField = item.EmploymentDate || item.JoinDate || item.HireDate;
        if (employmentDateField) {
          const empDate = employmentDateField.toDate ? employmentDateField.toDate() : new Date(employmentDateField);
          if (filters.employmentDateFrom && empDate < new Date(filters.employmentDateFrom)) return false;
          if (filters.employmentDateTo && empDate > new Date(filters.employmentDateTo)) return false;
        }
      }
    }

    // Helper-specific filters
    if (entityType === 'helpers') {
      if (filters.contact && item.HelperContact && !item.HelperContact.includes(filters.contact)) {
        return false;
      }
      if (filters.idType && item.IDType !== filters.idType) return false;
      if (filters.assignmentStatus) {
        const isAssigned = item.AssignedTruck;
        if (filters.assignmentStatus === 'assigned' && !isAssigned) return false;
        if (filters.assignmentStatus === 'unassigned' && isAssigned) return false;
      }
      if (filters.minAge || filters.maxAge) {
        const age = item.Age ? parseInt(item.Age) : 0;
        if (filters.minAge && age < parseInt(filters.minAge)) return false;
        if (filters.maxAge && age > parseInt(filters.maxAge)) return false;
      }
    }

    // Delivery-specific filters
    if (entityType === 'deliveries') {
      if (filters.clientName && item.ClientName && !item.ClientName.toLowerCase().includes(filters.clientName.toLowerCase())) {
        return false;
      }
      if (filters.truckPlate && item.TruckPlate && !item.TruckPlate.toLowerCase().includes(filters.truckPlate.toLowerCase())) {
        return false;
      }
      if (filters.driverName && item.DriverName && !item.DriverName.toLowerCase().includes(filters.driverName.toLowerCase())) {
        return false;
      }
      if (filters.pickupLocation && item.PickupLocation && !item.PickupLocation.toLowerCase().includes(filters.pickupLocation.toLowerCase())) {
        return false;
      }
      if (filters.deliveryAddress && item.DeliveryAddress && !item.DeliveryAddress.toLowerCase().includes(filters.deliveryAddress.toLowerCase())) {
        return false;
      }
      if (filters.deliveryDateFrom || filters.deliveryDateTo) {
        if (item.DeliveryDate) {
          const delDate = item.DeliveryDate.toDate ? item.DeliveryDate.toDate() : new Date(item.DeliveryDate);
          if (filters.deliveryDateFrom && delDate < new Date(filters.deliveryDateFrom)) return false;
          if (filters.deliveryDateTo && delDate > new Date(filters.deliveryDateTo)) return false;
        }
      }
      if (filters.minWeight || filters.maxWeight) {
        const weight = parseFloat(item.CargoWeight) || 0;
        if (filters.minWeight && weight < parseFloat(filters.minWeight)) return false;
        if (filters.maxWeight && weight > parseFloat(filters.maxWeight)) return false;
      }
    }

    // Client-specific filters
    if (entityType === 'clients') {
      if (filters.companyName && item.CompanyName && !item.CompanyName.toLowerCase().includes(filters.companyName.toLowerCase())) {
        return false;
      }
      if (filters.businessType && item.BusinessType !== filters.businessType) return false;
      if (filters.email && item.ClientEmail && !item.ClientEmail.toLowerCase().includes(filters.email.toLowerCase())) {
        return false;
      }
      if (filters.contact && item.ClientContact && !item.ClientContact.includes(filters.contact)) return false;
      if (filters.city && item.City && !item.City.toLowerCase().includes(filters.city.toLowerCase())) {
        return false;
      }
    }

    // Staff-specific filters
    if (entityType === 'staff') {
      if (filters.role && item.StaffRole !== filters.role) return false;
      if (filters.department && item.Department !== filters.department) return false;
      if (filters.employmentType && item.EmploymentType !== filters.employmentType) return false;
      if (filters.email && item.StaffEmail && !item.StaffEmail.toLowerCase().includes(filters.email.toLowerCase())) {
        return false;
      }
      if (filters.contact && item.StaffContact && !item.StaffContact.includes(filters.contact)) return false;
      if (filters.minSalary || filters.maxSalary) {
        const salary = parseFloat(item.Salary) || 0;
        if (filters.minSalary && salary < parseFloat(filters.minSalary)) return false;
        if (filters.maxSalary && salary > parseFloat(filters.maxSalary)) return false;
      }
    }

    return true;
  });
};

/**
 * Helper to get date field name for entity
 */
const getDateField = (entityType) => {
  const dateFields = {
    trucks: 'CreatedAt',
    drivers: 'JoinDate',
    helpers: 'JoinDate',
    deliveries: 'DeliveryDate',
    clients: 'RegistrationDate',
    staff: 'JoinDate',
    billings: 'deliveryDate'
  };
  return dateFields[entityType] || 'CreatedAt';
};

/**
 * Helper to get name field for entity
 */
const getNameField = (entityType) => {
  const nameFields = {
    trucks: 'TruckPlateNumber',
    drivers: 'DriverName',
    helpers: 'HelperName',
    deliveries: 'DeliveryID',
    clients: 'ClientName',
    staff: 'StaffName',
    billings: 'clientName'
  };
  return nameFields[entityType] || 'Name';
};

/**
 * GET /api/reports/:reportType/count
 * Get count of records matching filters
 */
router.get('/:reportType/count', async (req, res) => {
  try {
    const { reportType } = req.params;
    const filters = req.query;

    let data;

    // Special handling for billings (derived from deliveries)
    if (reportType === 'billings') {
      const snapshot = await db.collection('deliveries').get();
      data = snapshot.docs
        .map(doc => {
          const delivery = doc.data();
          
          // Skip cancelled deliveries
          if (delivery.deliveryStatus === 'cancelled') return null;
          
          // Transform delivery to billing record
          const amount = parseFloat(delivery.deliveryRate || delivery.DeliveryRate || 0);
          
          // Get delivery date
          let deliveryDate = new Date();
          if (delivery.deliveryDate) {
            if (delivery.deliveryDate.seconds) {
              deliveryDate = new Date(delivery.deliveryDate.seconds * 1000);
            } else if (delivery.deliveryDate.toDate) {
              deliveryDate = delivery.deliveryDate.toDate();
            } else {
              deliveryDate = new Date(delivery.deliveryDate);
            }
          } else if (delivery.created_at) {
            if (delivery.created_at.seconds) {
              deliveryDate = new Date(delivery.created_at.seconds * 1000);
            } else if (delivery.created_at.toDate) {
              deliveryDate = delivery.created_at.toDate();
            } else {
              deliveryDate = new Date(delivery.created_at);
            }
          }

          // Get due date from database, or calculate if not set (30 days after delivery date)
          let dueDate;
          if (delivery.dueDate) {
            // Use stored due date from database
            dueDate = delivery.dueDate.toDate ? delivery.dueDate.toDate() : new Date(delivery.dueDate);
          } else {
            // Fallback: calculate due date (30 days after delivery date)
            dueDate = new Date(deliveryDate.getTime() + 30 * 24 * 60 * 60 * 1000);
          }
          
          // Determine payment status
          let paymentStatus = 'pending';
          const now = new Date();
          
          if (delivery.paymentStatus === 'paid') {
            paymentStatus = 'paid';
          } else if (dueDate < now) {
            paymentStatus = 'overdue';
          }
          
          return {
            id: doc.id,
            deliveryId: doc.id,
            clientId: delivery.clientId,
            clientName: delivery.clientName,
            amount: amount,
            currency: 'PHP',
            status: paymentStatus,
            dueDate: dueDate.toISOString(),
            deliveryDate: deliveryDate.toISOString(),
            paidAt: delivery.paidAt || null,
            truckPlate: delivery.truckPlate || delivery.TruckPlate,
            pickupLocation: delivery.pickupLocation || delivery.PickupLocation,
            deliveryAddress: delivery.deliveryAddress || delivery.DeliveryAddress
          };
        })
        .filter(item => item !== null);
    } else {
      // Get collection name
      const collectionName = reportType;
      
      // Fetch all data
      const snapshot = await db.collection(collectionName).get();
      data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    // Apply filters
    data = filterInMemory(data, filters, reportType);

    // Generate preview/summary
    const preview = generatePreview(data, reportType);

    res.json({
      count: data.length,
      preview: preview
    });
  } catch (error) {
    console.error('Error counting records:', error);
    res.status(500).json({ error: 'Failed to count records', details: error.message });
  }
});

/**
 * GET /api/reports/:reportType
 * Get full data matching filters
 */
router.get('/:reportType', async (req, res) => {
  try {
    const { reportType } = req.params;
    const filters = req.query;

    let data;

    // Special handling for billings (derived from deliveries)
    if (reportType === 'billings') {
      const snapshot = await db.collection('deliveries').get();
      data = snapshot.docs
        .map(doc => {
          const delivery = doc.data();
          
          // Skip cancelled deliveries
          if (delivery.deliveryStatus === 'cancelled') return null;
          
          // Transform delivery to billing record
          const amount = parseFloat(delivery.deliveryRate || delivery.DeliveryRate || 0);
          
          // Get delivery date
          let deliveryDate = new Date();
          if (delivery.deliveryDate) {
            if (delivery.deliveryDate.seconds) {
              deliveryDate = new Date(delivery.deliveryDate.seconds * 1000);
            } else if (delivery.deliveryDate.toDate) {
              deliveryDate = delivery.deliveryDate.toDate();
            } else {
              deliveryDate = new Date(delivery.deliveryDate);
            }
          } else if (delivery.created_at) {
            if (delivery.created_at.seconds) {
              deliveryDate = new Date(delivery.created_at.seconds * 1000);
            } else if (delivery.created_at.toDate) {
              deliveryDate = delivery.created_at.toDate();
            } else {
              deliveryDate = new Date(delivery.created_at);
            }
          }

          // Get due date from database, or calculate if not set (30 days after delivery date)
          let dueDate;
          if (delivery.dueDate) {
            // Use stored due date from database
            dueDate = delivery.dueDate.toDate ? delivery.dueDate.toDate() : new Date(delivery.dueDate);
          } else {
            // Fallback: calculate due date (30 days after delivery date)
            dueDate = new Date(deliveryDate.getTime() + 30 * 24 * 60 * 60 * 1000);
          }
          
          // Determine payment status
          let paymentStatus = 'pending';
          const now = new Date();
          
          if (delivery.paymentStatus === 'paid') {
            paymentStatus = 'paid';
          } else if (dueDate < now) {
            paymentStatus = 'overdue';
          }
          
          return {
            id: doc.id,
            deliveryId: doc.id,
            clientId: delivery.clientId,
            clientName: delivery.clientName,
            amount: amount,
            currency: 'PHP',
            status: paymentStatus,
            dueDate: dueDate.toISOString(),
            deliveryDate: deliveryDate.toISOString(),
            paidAt: delivery.paidAt || null,
            truckPlate: delivery.truckPlate || delivery.TruckPlate,
            pickupLocation: delivery.pickupLocation || delivery.PickupLocation,
            deliveryAddress: delivery.deliveryAddress || delivery.DeliveryAddress
          };
        })
        .filter(item => item !== null);
    } else {
      // Get collection name
      const collectionName = reportType;
      
      // Fetch all data
      const snapshot = await db.collection(collectionName).get();
      data = snapshot.docs.map(doc => {
        const docData = doc.data();
        // Convert Firestore timestamps to ISO strings
        Object.keys(docData).forEach(key => {
          if (docData[key] && docData[key].toDate) {
            docData[key] = docData[key].toDate().toISOString();
          }
        });
        return { id: doc.id, ...docData };
      });
    }

    // Apply filters
    data = filterInMemory(data, filters, reportType);

    res.json({
      data: data,
      count: data.length,
      filters: filters
    });
  } catch (error) {
    console.error('Error fetching report data:', error);
    res.status(500).json({ error: 'Failed to fetch report data', details: error.message });
  }
});

/**
 * Generate preview/summary statistics
 */
const generatePreview = (data, reportType) => {
  const preview = {};

  switch (reportType) {
    case 'trucks':
      preview['Available'] = data.filter(t => t.TruckStatus === 'available').length;
      preview['In Use'] = data.filter(t => t.TruckStatus === 'in-use').length;
      preview['Maintenance'] = data.filter(t => t.TruckStatus === 'maintenance').length;
      break;

    case 'drivers':
      preview['Active'] = data.filter(d => d.DriverStatus === 'active').length;
      preview['Inactive'] = data.filter(d => d.DriverStatus === 'inactive').length;
      break;

    case 'helpers':
      preview['Active'] = data.filter(h => h.HelperStatus === 'active').length;
      preview['Inactive'] = data.filter(h => h.HelperStatus === 'inactive').length;
      break;

    case 'deliveries':
      preview['Pending'] = data.filter(d => d.DeliveryStatus === 'pending').length;
      preview['In Progress'] = data.filter(d => d.DeliveryStatus === 'in-progress').length;
      preview['Completed'] = data.filter(d => d.DeliveryStatus === 'completed').length;
      const totalRevenue = data.reduce((sum, d) => sum + (parseFloat(d.TotalAmount) || 0), 0);
      preview['Total Revenue'] = `₱${totalRevenue.toLocaleString()}`;
      break;

    case 'clients':
      preview['Active'] = data.filter(c => c.ClientStatus === 'active').length;
      preview['Inactive'] = data.filter(c => c.ClientStatus === 'inactive').length;
      break;

    case 'staff':
      preview['Active'] = data.filter(s => s.StaffStatus === 'active').length;
      preview['On Leave'] = data.filter(s => s.StaffStatus === 'on-leave').length;
      break;

    case 'billings':
      preview['Paid'] = data.filter(b => b.status === 'paid').length;
      preview['Pending'] = data.filter(b => b.status === 'pending').length;
      preview['Overdue'] = data.filter(b => b.status === 'overdue').length;
      const totalBillings = data.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);
      preview['Total Amount'] = `₱${totalBillings.toLocaleString()}`;
      break;
  }

  return preview;
};

module.exports = router;
