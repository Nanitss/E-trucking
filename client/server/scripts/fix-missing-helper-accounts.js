// Script to create missing user accounts for helpers
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

async function fixMissingHelperAccounts() {
  try {
    console.log('🔧 Fixing missing helper user accounts...\n');

    // Get all helpers
    const helpersSnapshot = await db.collection('helpers').get();
    
    console.log(`Total helpers in database: ${helpersSnapshot.size}\n`);
    
    let fixedCount = 0;
    let alreadyHadAccountCount = 0;
    let errorCount = 0;
    
    for (const doc of helpersSnapshot.docs) {
      const helper = doc.data();
      const helperId = doc.id;
      const helperName = helper.HelperName || 'Unnamed';
      const username = helper.HelperUserName;
      
      // Skip if no username
      if (!username) {
        console.log(`⚠️  ${helperName}: No username set, skipping`);
        continue;
      }
      
      // Check if user account already exists
      if (helper.userId) {
        const userDoc = await db.collection('users').doc(helper.userId).get();
        if (userDoc.exists) {
          console.log(`✅ ${helperName} (${username}): Already has user account`);
          alreadyHadAccountCount++;
          continue;
        }
      }
      
      // Check if user exists by username
      const existingUserQuery = await db.collection('users')
        .where('username', '==', username)
        .get();
      
      if (!existingUserQuery.empty) {
        const existingUserId = existingUserQuery.docs[0].id;
        console.log(`🔗 ${helperName} (${username}): User account exists, linking...`);
        
        // Update helper with userId link
        await db.collection('helpers').doc(helperId).update({
          userId: existingUserId,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`   ✅ Linked helper to existing user account`);
        fixedCount++;
        continue;
      }
      
      // Create new user account
      try {
        console.log(`🆕 ${helperName} (${username}): Creating new user account...`);
        
        // Default password
        const defaultPassword = 'helper123';
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(defaultPassword, salt);
        
        // Create user document
        const userRef = await db.collection('users').add({
          username: username,
          password: hashedPassword,
          role: 'helper',
          status: 'active',
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`   ✅ User account created with ID: ${userRef.id}`);
        console.log(`   🔑 Default password: ${defaultPassword}`);
        
        // Update helper with userId
        await db.collection('helpers').doc(helperId).update({
          userId: userRef.id,
          HelperStatus: 'active',
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`   ✅ Helper document updated with userId link\n`);
        fixedCount++;
        
      } catch (createError) {
        console.error(`   ❌ Error creating user account: ${createError.message}\n`);
        errorCount++;
      }
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📊 Summary:');
    console.log(`   ✅ Fixed/Linked: ${fixedCount}`);
    console.log(`   ℹ️  Already had accounts: ${alreadyHadAccountCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log('\n✅ Fix complete!\n');
    
    if (fixedCount > 0) {
      console.log('🔑 Default password for new accounts: helper123');
      console.log('⚠️  Users should change their password after first login\n');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
fixMissingHelperAccounts();
