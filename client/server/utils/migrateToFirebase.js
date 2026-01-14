// Utility to migrate MySQL data to Firebase
const pool = require('../config/db');
const { db, admin } = require('../config/firebase');
const fs = require('fs');
const path = require('path');

// Log management
const logPath = path.join(__dirname, '../logs');
if (!fs.existsSync(logPath)) {
  fs.mkdirSync(logPath, { recursive: true });
}
const logFile = path.join(logPath, 'migration_log.txt');
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  logStream.write(logMessage);
};

// Helper function to fetch data from MySQL table
const getMySQLData = async (tableName) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM ${tableName}`);
    log(`✅ Retrieved ${rows.length} records from MySQL table: ${tableName}`);
    return rows;
  } catch (error) {
    log(`❌ Error fetching data from MySQL table ${tableName}: ${error.message}`);
    throw error;
  }
};

// Helper function to import data to Firestore collection
const importToFirestore = async (collectionName, data) => {
  try {
    let count = 0;
    const batchSize = 400; // Firestore batches are limited to 500 operations
    let batch = db.batch();

    for (const item of data) {
      // Convert MySQL timestamp strings to Firestore timestamps
      const docData = { ...item };
      
      // Handle date fields that need conversion
      if (docData.created_at) {
        docData.created_at = admin.firestore.Timestamp.fromDate(new Date(docData.created_at));
      }
      if (docData.updated_at) {
        docData.updated_at = admin.firestore.Timestamp.fromDate(new Date(docData.updated_at));
      }
      
      // Use MySQL ID as document ID for easier reference
      const docRef = db.collection(collectionName).doc(String(item.id));
      batch.set(docRef, docData);
      count++;
      
      // Commit when batch size is reached
      if (count % batchSize === 0) {
        await batch.commit();
        log(`✅ Committed batch of ${batchSize} documents to ${collectionName}`);
        batch = db.batch();
      }
    }
    
    // Commit any remaining documents
    if (count % batchSize !== 0) {
      await batch.commit();
      log(`✅ Committed remaining ${count % batchSize} documents to ${collectionName}`);
    }
    
    log(`✅ Successfully imported ${count} documents to Firestore collection: ${collectionName}`);
    return count;
  } catch (error) {
    log(`❌ Error importing to Firestore collection ${collectionName}: ${error.message}`);
    throw error;
  }
};

// Main migration function
const migrateToFirebase = async () => {
  log('🚀 Starting MySQL to Firebase migration...');
  
  try {
    // Tables to migrate - map MySQL table names to Firestore collection names
    const tables = [
      { mysql: 'users', firestore: 'users' },
      { mysql: 'clients', firestore: 'clients' },
      { mysql: 'drivers', firestore: 'drivers' },
      { mysql: 'operators', firestore: 'operators' },
      { mysql: 'helpers', firestore: 'helpers' },
      { mysql: 'staffs', firestore: 'staffs' },
      { mysql: 'trucks', firestore: 'trucks' },
      { mysql: 'client_allocated_trucks', firestore: 'allocations' },
      { mysql: 'deliveries', firestore: 'deliveries' }
    ];
    
    // Migrate each table
    for (const table of tables) {
      log(`⏳ Migrating ${table.mysql} to ${table.firestore}...`);
      
      // Get data from MySQL
      const data = await getMySQLData(table.mysql);
      
      // Import to Firestore
      const count = await importToFirestore(table.firestore, data);
      
      log(`✅ Migration completed for ${table.mysql}: ${count} records migrated`);
    }
    
    log('🎉 Migration completed successfully!');
  } catch (error) {
    log(`❌ Migration failed: ${error.message}`);
    log(error.stack);
  } finally {
    logStream.end();
  }
};

// Export the migration function
module.exports = { migrateToFirebase };

// Run migration directly if this script is executed directly
if (require.main === module) {
  migrateToFirebase().then(() => {
    console.log('Migration script completed');
    process.exit(0);
  }).catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
} 