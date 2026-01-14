// Script to check if HelperJohn, HelperNat, HelperNit have username and password
const admin = require('firebase-admin');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Initialize Firebase Admin
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs"
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkHelperCredentials() {
  try {
    console.log('🔍 Checking all helpers in database...\n');

    // Get all helpers
    const helpersSnapshot = await db.collection('helpers').get();
    
    console.log(`Total helpers in database: ${helpersSnapshot.size}\n`);
    
    // List all helper names first
    console.log('📋 All helper names in database:');
    const allHelpers = [];
    helpersSnapshot.forEach(doc => {
      const helper = doc.data();
      const helperName = helper.HelperName || 'Unnamed';
      console.log(`   - ${helperName} (Status: ${helper.HelperStatus || 'N/A'})`);
      allHelpers.push({ id: doc.id, ...helper });
    });
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🔍 Checking credentials for ALL helpers:\n');

    for (const helper of allHelpers) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Helper: ${helper.HelperName}`);
      console.log(`Document ID: ${helper.id}`);
      console.log(`Status: ${helper.HelperStatus || 'N/A'}`);
      console.log(`\n📋 Credentials in Helper Document:`);
      console.log(`   Username: ${helper.HelperUserName || '❌ MISSING'}`);
      console.log(`   User ID: ${helper.userId || '❌ MISSING'}`);
      
      // Check if user account exists in users collection
      if (helper.userId) {
        const userDoc = await db.collection('users').doc(helper.userId).get();
        
        if (userDoc.exists) {
          const userData = userDoc.data();
          console.log(`\n👤 User Account Found:`);
          console.log(`   Username: ${userData.username || 'N/A'}`);
          console.log(`   Password: ${userData.password ? '✅ EXISTS (hashed)' : '❌ MISSING'}`);
          console.log(`   Role: ${userData.role || 'N/A'}`);
          console.log(`   Status: ${userData.status || 'N/A'}`);
        } else {
          console.log(`\n❌ User Account NOT FOUND in users collection`);
          console.log(`   User ID ${helper.userId} does not exist`);
        }
      } else if (helper.HelperUserName) {
        // Try to find user by username
        console.log(`\n🔍 Searching for user by username: ${helper.HelperUserName}`);
        const userQuery = await db.collection('users')
          .where('username', '==', helper.HelperUserName)
          .get();
        
        if (!userQuery.empty) {
          const userData = userQuery.docs[0].data();
          console.log(`\n👤 User Account Found by Username:`);
          console.log(`   User ID: ${userQuery.docs[0].id}`);
          console.log(`   Username: ${userData.username || 'N/A'}`);
          console.log(`   Password: ${userData.password ? '✅ EXISTS (hashed)' : '❌ MISSING'}`);
          console.log(`   Role: ${userData.role || 'N/A'}`);
          console.log(`   Status: ${userData.status || 'N/A'}`);
          console.log(`\n⚠️  Note: userId not set in helper document, should be: ${userQuery.docs[0].id}`);
        } else {
          console.log(`\n❌ No user account found with username: ${helper.HelperUserName}`);
        }
      } else {
        console.log(`\n❌ No credentials found - helper has no username or user ID`);
      }
      
      console.log('');
    }

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    console.log('✅ Credential check complete!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking credentials:', error);
    process.exit(1);
  }
}

// Run the script
checkHelperCredentials();
