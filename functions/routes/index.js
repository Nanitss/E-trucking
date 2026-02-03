const express = require('express');
const router = express.Router();

// Import route files
const authRoutes = require('./authRoutes');
const clientRoutes = require('./clientRoutes');
const deliveryRoutes = require('./deliveryRoutes');
const driverRoutes = require('./driverRoutes');
const helperRoutes = require('./helperRoutes');
const operatorRoutes = require('./operatorRoutes');
const staffRoutes = require('./staffRoutes');
const truckRoutes = require('./truckRoutes');
const userRoutes = require('./userRoutes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/clients', clientRoutes);
router.use('/deliveries', deliveryRoutes);
router.use('/drivers', driverRoutes);
router.use('/helpers', helperRoutes);
router.use('/operators', operatorRoutes);
router.use('/staffs', staffRoutes);
router.use('/trucks', truckRoutes);
router.use('/users', userRoutes);

module.exports = router;