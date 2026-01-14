// Script to setup the 3 unnamed helpers as HelperJohn, HelperNat, HelperNit
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

async function setupUnnamedHelpers() {
  try {
    console.log('🔧 Setting up unnamed helpers as HelperJohn, HelperNat, HelperNit...\n');

    // Get all helpers with missing names
    const helpersSnapshot = await db.collection('helpers').get();
    
    const unnamedHelpers = [];
    helpersSnapshot.forEach(doc => {
      const helper = doc.data();
      if (!helper.HelperName || helper.HelperName === 'Unnamed') {
        unnamedHelpers.push({ id: doc.id, ...helper });
      }
    });

    console.log(`Found ${unnamedHelpers.length} unnamed helpers\n`);

    if (unnamedHelpers.length !== 3) {
      console.log(`⚠️  Expected 3 unnamed helpers, found ${unnamedHelpers.length}`);
      console.log('Proceeding with available helpers...\n');
    }

    // Define the helpers to create
    const helperConfigs = [
      { name: 'HelperJohn', username: 'helperjohn' },
      { name: 'HelperNat', username: 'helpernat' },
      { name: 'HelperNit', username: 'helpernit' }
    ];

    const password = 'Admin@123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    for (let i = 0; i < Math.min(unnamedHelpers.length, helperConfigs.length); i++) {
      const helper = unnamedHelpers[i];
      const config = helperConfigs[i];

      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Setting up: ${config.name}`);
      console.log(`Document ID: ${helper.id}`);

      // Check if username already exists
      const existingUser = await db.collection('users')
        .where('username', '==', config.username)
        .get();

      let userId;
      
      if (!existingUser.empty) {
        console.log(`⚠️  Username ${config.username} already exists, updating existing user`);
        userId = existingUser.docs[0].id;
        
        // Update existing user's password
        await db.collection('users').doc(userId).update({
          password: hashedPassword,
          status: 'active',
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`✅ Updated existing user account`);
      } else {
        // Create new user account
        console.log(`📝 Creating user account: ${config.username}`);
        const userRef = await db.collection('users').add({
          username: config.username,
          password: hashedPassword,
          role: 'helper',
          status: 'active',
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        userId = userRef.id;
        console.log(`✅ User account created: ${userId}`);
      }

      // Update helper document
      await db.collection('helpers').doc(helper.id).update({
        HelperName: config.name,
        HelperUserName: config.username,
        HelperStatus: 'active',
        userId: userId,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`✅ Helper updated successfully!`);
      console.log(`   Name: ${config.name}`);
      console.log(`   Username: ${config.username}`);
      console.log(`   Password: ${password}`);
      console.log(`   Status: active`);
      console.log(`   User ID: ${userId}`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ All unnamed helpers have been set up!');
    console.log('\n📋 Credentials Summary:');
    console.log('   - HelperJohn: helperjohn / Admin@123');
    console.log('   - HelperNat: helpernat / Admin@123');
    console.log('   - HelperNit: helpernit / Admin@123');
    console.log('\n💡 All helpers are now set to ACTIVE status');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up helpers:', error);
    process.exit(1);
  }
}

// Run the script
setupUnnamedHelpers();
