require('dotenv').config({ path: './.env' });
const admin = require('firebase-admin');

// Initialize Firebase Admin using environment variables (same as server)
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
    console.log('✅ Firebase Admin SDK initialized successfully');
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  process.exit(1);
}

const db = admin.firestore();

async function fixDeliveryClientIDs() {
  try {
    console.log('🔍 Fixing delivery client IDs to match user login ID...');
    
    // Get all delivery documents with the incorrect client ID
    const incorrectClientId = 'p4hj4KW644Ih52aCQ40';
    const correctClientId = 'j412kdTjjvMNXWdLTHAc'; // User's login ID
    
    console.log(`Looking for deliveries with clientId: ${incorrectClientId}`);
    console.log(`Will update them to use clientId: ${correctClientId}`);
    
    const deliveriesSnapshot = await db.collection('deliveries')
      .where('clientId', '==', incorrectClientId)
      .get();
    
    if (deliveriesSnapshot.empty) {
      console.log('❌ No delivery documents found with incorrect client ID.');
      console.log('Checking all deliveries to see what client IDs exist...');
      
      // Check all deliveries to see what's there
      const allDeliveries = await db.collection('deliveries').get();
      console.log(`\nFound ${allDeliveries.size} total deliveries:`);
      
      allDeliveries.forEach(doc => {
        const data = doc.data();
        console.log(`- Delivery ${doc.id}: clientId = ${data.clientId}, rate = ${data.deliveryRate}`);
      });
      
      return;
    }
    
    console.log(`📦 Found ${deliveriesSnapshot.size} delivery documents to fix`);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    // Update each delivery
    for (const doc of deliveriesSnapshot.docs) {
      const data = doc.data();
      
      try {
        // Update the clientId to use the user's login ID
        await db.collection('deliveries').doc(doc.id).update({
          clientId: correctClientId,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ Updated delivery ${doc.id}`);
        console.log(`   Rate: ₱${data.deliveryRate || 'Unknown'}`);
        console.log(`   Date: ${data.deliveryDate || 'Unknown'}`);
        console.log(`   Old clientId: ${incorrectClientId}`);
        console.log(`   New clientId: ${correctClientId}`);
        updatedCount++;
      } catch (error) {
        console.error(`❌ Error updating delivery ${doc.id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n🎉 Update complete!`);
    console.log(`   Successfully updated: ${updatedCount} deliveries`);
    console.log(`   Errors: ${errorCount} deliveries`);
    
    // Verify the fix by checking deliveries with the new client ID
    console.log(`\n🔍 Verifying fix...`);
    const verifySnapshot = await db.collection('deliveries')
      .where('clientId', '==', correctClientId)
      .get();
    
    console.log(`✅ Found ${verifySnapshot.size} deliveries with correct clientId: ${correctClientId}`);
    
    // Show sample data
    console.log(`\n📋 Sample delivery data after fix:`);
    verifySnapshot.forEach((doc, index) => {
      if (index < 3) { // Show first 3
        const data = doc.data();
        console.log(`\n   Delivery ${doc.id}:`);
        console.log(`   clientId: ${data.clientId}`);
        console.log(`   Rate: ₱${data.deliveryRate || 'Unknown'}`);
        console.log(`   Date: ${data.deliveryDate || 'Unknown'}`);
        console.log(`   Status: ${data.deliveryStatus || 'Unknown'}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error fixing delivery client IDs:', error);
  } finally {
    // Close the connection
    process.exit(0);
  }
}

// Run the fix
fixDeliveryClientIDs(); 