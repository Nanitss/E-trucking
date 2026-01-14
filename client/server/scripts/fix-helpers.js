// Script to fix Helper2, Helper3, Helper4 - add credentials and set to active
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
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

async function fixHelpers() {
  try {
    console.log('🔧 Starting to fix Helper2, Helper3, Helper4...\n');

    // Get all helpers
    const helpersSnapshot = await db.collection('helpers').get();
    
    const helpersToFix = [];
    helpersSnapshot.forEach(doc => {
      const helper = doc.data();
      const helperName = helper.HelperName || '';
      
      // Find Helper2, Helper3, Helper4
      if (helperName === 'Helper2' || helperName === 'Helper3' || helperName === 'Helper4') {
        helpersToFix.push({ id: doc.id, ...helper });
      }
    });

    console.log(`Found ${helpersToFix.length} helpers to fix:\n`);

    for (const helper of helpersToFix) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Fixing: ${helper.HelperName}`);
      console.log(`Current Status: ${helper.HelperStatus || 'unknown'}`);
      console.log(`Current Username: ${helper.HelperUserName || 'N/A'}`);
      
      // Generate username if missing
      const username = helper.HelperUserName || `${helper.HelperName.toLowerCase()}${Math.floor(Math.random() * 1000)}`;
      const password = 'helper123'; // Default password
      
      // Check if user account exists
      let userId = helper.userId;
      
      if (!userId || !helper.HelperUserName) {
        console.log(`📝 Creating user account with username: ${username}`);
        
        // Check if username already exists
        const existingUser = await db.collection('users')
          .where('username', '==', username)
          .get();
        
        if (!existingUser.empty) {
          console.log(`⚠️  Username ${username} already exists, using existing user`);
          userId = existingUser.docs[0].id;
        } else {
          // Hash password
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(password, salt);
          
          // Create user account
          const userRef = await db.collection('users').add({
            username: username,
            password: hashedPassword,
            role: 'helper',
            status: 'active',
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          });
          
          userId = userRef.id;
          console.log(`✅ User account created with ID: ${userId}`);
        }
      } else {
        console.log(`ℹ️  User account already exists: ${userId}`);
      }
      
      // Update helper document
      const updateData = {
        HelperStatus: 'active',
        HelperUserName: username,
        userId: userId,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };
      
      await db.collection('helpers').doc(helper.id).update(updateData);
      
      console.log(`✅ Helper updated:`);
      console.log(`   - Status: active`);
      console.log(`   - Username: ${username}`);
      console.log(`   - Password: ${password} (default)`);
      console.log(`   - User ID: ${userId}`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ All helpers fixed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Helpers fixed: ${helpersToFix.length}`);
    console.log(`   - Default password for all: helper123`);
    console.log('\n💡 Helpers can change their password after logging in');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing helpers:', error);
    process.exit(1);
  }
}

// Run the script
fixHelpers();
