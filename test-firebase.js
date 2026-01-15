// Test script to check Firebase connection
const { db, admin } = require('./client/server/config/firebase');

console.log('Testing Firebase connection...');

// Check if Firebase Admin SDK is initialized
if (admin && admin.apps.length) {
  console.log('✅ Firebase Admin SDK is initialized');
} else {
  console.error('❌ Firebase Admin SDK is NOT initialized');
}

// Try to list collections in Firestore
db.listCollections()
  .then(collections => {
    console.log(`✅ Successfully connected to Firestore. Found ${collections.length} collections:`);
    collections.forEach(collection => {
      console.log(` - ${collection.id}`);
    });
  })
  .catch(error => {
    console.error('❌ Error connecting to Firestore:', error);
  })
  .finally(() => {
    console.log('Test complete');
  }); 