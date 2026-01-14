// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY SCRIPT: Fix Stuck Driver/Helper Statuses
// ═══════════════════════════════════════════════════════════════════════════════
// 
// This script finds all drivers and helpers stuck in "on-delivery" status
// but have no active deliveries, and updates them back to "active" status.
//
// Usage: node scripts/fix-stuck-statuses.js
//
// ═══════════════════════════════════════════════════════════════════════════════

// Load environment variables from .env file
require('dotenv').config();

const { db, admin } = require('../config/firebase');

async function fixStuckStatuses() {
  try {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('🔧 FIXING STUCK DRIVER/HELPER STATUSES');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('');
    
    const results = {
      driversChecked: 0,
      driversFixed: 0,
      helpersChecked: 0,
      helpersFixed: 0,
      errors: []
    };
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // FIX DRIVERS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    console.log('📋 Checking drivers...');
    
    // First, check what statuses actually exist (check both field name variations)
    const allDriversSnapshot = await db.collection('drivers').get();
    const driverStatuses = new Set();
    let driverStatusFieldName = null;
    
    allDriversSnapshot.docs.forEach(doc => {
      const data = doc.data();
      // Check both lowercase and capitalized field names
      const status = data.driverStatus || data.DriverStatus;
      if (status) {
        driverStatuses.add(status);
        // Remember which field name is actually used
        if (!driverStatusFieldName) {
          driverStatusFieldName = data.driverStatus ? 'driverStatus' : 'DriverStatus';
        }
      }
    });
    
    console.log(`   Total drivers in database: ${allDriversSnapshot.size}`);
    console.log(`   Status field name: ${driverStatusFieldName || 'not found'}`);
    console.log(`   Unique driver statuses found: ${Array.from(driverStatuses).join(', ')}`);
    
    // Get all drivers with any "on-delivery" variation
    const onDeliveryVariations = ['on-delivery', 'On-Delivery', 'ON-DELIVERY', 'on delivery', 'On Delivery'];
    let onDeliveryDriversSnapshot = null;
    
    for (const statusVariation of onDeliveryVariations) {
      if (driverStatuses.has(statusVariation) && driverStatusFieldName) {
        console.log(`   🔍 Found drivers with status: "${statusVariation}" in field "${driverStatusFieldName}"`);
        onDeliveryDriversSnapshot = await db.collection('drivers')
          .where(driverStatusFieldName, '==', statusVariation)
          .get();
        break;
      }
    }
    
    if (!onDeliveryDriversSnapshot || onDeliveryDriversSnapshot.empty) {
      console.log(`   ✅ No drivers need fixing`);
      results.driversChecked = 0;
    } else {
      console.log(`   Found ${onDeliveryDriversSnapshot.size} drivers with on-delivery status`);
      results.driversChecked = onDeliveryDriversSnapshot.size;
      // Check each driver
      for (const driverDoc of onDeliveryDriversSnapshot.docs) {
        const driverId = driverDoc.id;
        const driverData = driverDoc.data();
        const driverName = driverData.driverName || driverData.name || 'Unknown';
        
        try {
          // Check if driver has any active deliveries
          const activeDeliveriesSnapshot = await db.collection('deliveries')
            .where('driverId', '==', driverId)
            .where('deliveryStatus', 'in', ['pending', 'in-progress', 'started', 'picked-up'])
            .get();
          
          if (activeDeliveriesSnapshot.empty) {
            // No active deliveries - update status to active
            const updateData = {
              [driverStatusFieldName]: 'active',
              currentDeliveryId: null,
              updated_at: admin.firestore.FieldValue.serverTimestamp()
            };
            
            await db.collection('drivers').doc(driverId).update(updateData);
            
            console.log(`   ✅ Fixed: ${driverName} (${driverId}) - set ${driverStatusFieldName} to active`);
            results.driversFixed++;
          } else {
            console.log(`   ⏭️  Skipped: ${driverName} (${driverId}) - has ${activeDeliveriesSnapshot.size} active delivery(ies)`);
          }
        } catch (error) {
          console.error(`   ❌ Error fixing ${driverName} (${driverId}):`, error.message);
          results.errors.push(`Driver ${driverId}: ${error.message}`);
        }
      }
    }
    
    console.log('');
    console.log(`   📊 Drivers: ${results.driversFixed}/${results.driversChecked} fixed`);
    console.log('');
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // FIX HELPERS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    console.log('📋 Checking helpers...');
    
    // First, check what statuses actually exist (check both field name variations)
    const allHelpersSnapshot = await db.collection('helpers').get();
    const helperStatuses = new Set();
    let helperStatusFieldName = null;
    
    allHelpersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      // Check both lowercase and capitalized field names
      const status = data.helperStatus || data.HelperStatus;
      if (status) {
        helperStatuses.add(status);
        // Remember which field name is actually used
        if (!helperStatusFieldName) {
          helperStatusFieldName = data.helperStatus ? 'helperStatus' : 'HelperStatus';
        }
      }
    });
    
    console.log(`   Total helpers in database: ${allHelpersSnapshot.size}`);
    console.log(`   Status field name: ${helperStatusFieldName || 'not found'}`);
    console.log(`   Unique helper statuses found: ${Array.from(helperStatuses).join(', ')}`);
    
    // Get all helpers with any "on-delivery" variation
    const onDeliveryVariationsHelpers = ['on-delivery', 'On-Delivery', 'ON-DELIVERY', 'on delivery', 'On Delivery'];
    let onDeliveryHelpersSnapshot = null;
    
    for (const statusVariation of onDeliveryVariationsHelpers) {
      if (helperStatuses.has(statusVariation) && helperStatusFieldName) {
        console.log(`   🔍 Found helpers with status: "${statusVariation}" in field "${helperStatusFieldName}"`);
        onDeliveryHelpersSnapshot = await db.collection('helpers')
          .where(helperStatusFieldName, '==', statusVariation)
          .get();
        break;
      }
    }
    
    if (!onDeliveryHelpersSnapshot || onDeliveryHelpersSnapshot.empty) {
      console.log(`   ✅ No helpers need fixing`);
      results.helpersChecked = 0;
    } else {
      console.log(`   Found ${onDeliveryHelpersSnapshot.size} helpers with on-delivery status`);
      results.helpersChecked = onDeliveryHelpersSnapshot.size;
      // Check each helper
      for (const helperDoc of onDeliveryHelpersSnapshot.docs) {
        const helperId = helperDoc.id;
        const helperData = helperDoc.data();
        const helperName = helperData.helperName || helperData.name || 'Unknown';
        
        try {
          // Check if helper has any active deliveries
          const activeDeliveriesSnapshot = await db.collection('deliveries')
            .where('helperId', '==', helperId)
            .where('deliveryStatus', 'in', ['pending', 'in-progress', 'started', 'picked-up'])
            .get();
          
          if (activeDeliveriesSnapshot.empty) {
            // No active deliveries - update status to active
            const updateData = {
              [helperStatusFieldName]: 'active',
              currentDeliveryId: null,
              updated_at: admin.firestore.FieldValue.serverTimestamp()
            };
            
            await db.collection('helpers').doc(helperId).update(updateData);
            
            console.log(`   ✅ Fixed: ${helperName} (${helperId}) - set ${helperStatusFieldName} to active`);
            results.helpersFixed++;
          } else {
            console.log(`   ⏭️  Skipped: ${helperName} (${helperId}) - has ${activeDeliveriesSnapshot.size} active delivery(ies)`);
          }
        } catch (error) {
          console.error(`   ❌ Error fixing ${helperName} (${helperId}):`, error.message);
          results.errors.push(`Helper ${helperId}: ${error.message}`);
        }
      }
    }
    
    console.log('');
    console.log(`   📊 Helpers: ${results.helpersFixed}/${results.helpersChecked} fixed`);
    console.log('');
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════════════════════
    
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('✅ COMPLETED');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   Drivers:  ${results.driversFixed}/${results.driversChecked} fixed`);
    console.log(`   Helpers:  ${results.helpersFixed}/${results.helpersChecked} fixed`);
    
    if (results.errors.length > 0) {
      console.log('');
      console.log('⚠️  Errors encountered:');
      results.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    
    process.exit(0);
    
  } catch (error) {
    console.error('');
    console.error('═══════════════════════════════════════════════════════════════════════════════');
    console.error('❌ FATAL ERROR');
    console.error('═══════════════════════════════════════════════════════════════════════════════');
    console.error('');
    console.error(error);
    console.error('');
    console.error('═══════════════════════════════════════════════════════════════════════════════');
    process.exit(1);
  }
}

// Run the script
fixStuckStatuses();
