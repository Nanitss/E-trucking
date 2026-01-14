// Migration routes for one-time database updates
const express = require('express');
const router = express.Router();
const { admin, db } = require('../config/firebase');
const { authenticateJWT } = require('../middleware/auth');

// ─── POST /api/migrations/add-due-dates ────────────────────────────────────
// Add dueDate field to all deliveries (Admin only, one-time migration)
router.post('/add-due-dates', authenticateJWT, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    console.log('\n🚀 Starting migration: Adding dueDate to all deliveries...\n');
    
    // Get all deliveries
    const deliveriesSnapshot = await db.collection('deliveries').get();
    console.log(`📦 Found ${deliveriesSnapshot.size} deliveries to process`);
    
    if (deliveriesSnapshot.empty) {
      return res.json({
        success: true,
        message: 'No deliveries found',
        stats: {
          updated: 0,
          skipped: 0,
          errors: 0,
          total: 0
        }
      });
    }
    
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    const results = [];
    
    // Process each delivery
    for (const doc of deliveriesSnapshot.docs) {
      const delivery = doc.data();
      const deliveryId = doc.id;
      
      try {
        // Skip if dueDate already exists
        if (delivery.dueDate) {
          console.log(`⏭️  Skipped ${deliveryId} - dueDate already exists`);
          skipped++;
          results.push({
            id: deliveryId,
            status: 'skipped',
            reason: 'dueDate already exists'
          });
          continue;
        }
        
        // Get delivery date (try multiple field names)
        let deliveryDate = delivery.deliveryDate || 
                          delivery.scheduledDate || 
                          delivery.created_at || 
                          delivery.createdAt;
        
        if (!deliveryDate) {
          console.log(`⚠️  Skipped ${deliveryId} - No delivery date found`);
          skipped++;
          results.push({
            id: deliveryId,
            status: 'skipped',
            reason: 'No delivery date found'
          });
          continue;
        }
        
        // Convert to Date object if it's a Firestore Timestamp
        if (deliveryDate.toDate && typeof deliveryDate.toDate === 'function') {
          deliveryDate = deliveryDate.toDate();
        } else if (!(deliveryDate instanceof Date)) {
          deliveryDate = new Date(deliveryDate);
        }
        
        // Calculate due date (30 days after delivery date)
        const dueDate = new Date(deliveryDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        // Update the delivery with dueDate
        await db.collection('deliveries').doc(deliveryId).update({
          dueDate: admin.firestore.Timestamp.fromDate(dueDate),
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ Updated ${deliveryId} - Due Date: ${dueDate.toISOString().split('T')[0]}`);
        updated++;
        results.push({
          id: deliveryId,
          status: 'updated',
          dueDate: dueDate.toISOString()
        });
        
      } catch (error) {
        console.error(`❌ Error processing ${deliveryId}:`, error.message);
        errors++;
        results.push({
          id: deliveryId,
          status: 'error',
          error: error.message
        });
      }
    }
    
    // Summary
    const summary = {
      updated,
      skipped,
      errors,
      total: deliveriesSnapshot.size
    };
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Updated:  ${updated} deliveries`);
    console.log(`⏭️  Skipped:  ${skipped} deliveries`);
    console.log(`❌ Errors:   ${errors} deliveries`);
    console.log(`📦 Total:    ${deliveriesSnapshot.size} deliveries`);
    console.log('='.repeat(60));
    console.log('\n✨ Migration complete!\n');
    
    res.json({
      success: true,
      message: 'Migration completed successfully',
      stats: summary,
      results: results.slice(0, 50) // Return first 50 results to avoid huge response
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Migration failed',
      error: error.toString()
    });
  }
});

module.exports = router;
