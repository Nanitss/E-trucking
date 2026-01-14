// Test script to directly record a logout event
const { db } = require('../config/firebase');
const AuditService = require('../services/AuditService');

async function testLogout() {
  try {
    console.log('Testing logout event recording...');
    
    // Create a test user ID and username
    const userId = 'test_user_' + Date.now();
    const username = 'test_user_' + Date.now().toString().slice(-4);
    
    console.log(`Creating test logout for user ID: ${userId}, username: ${username}`);
    
    // Log a direct logout action
    const result = await AuditService.logLogout(userId, username);
    
    if (result && result.id) {
      console.log('✅ Logout event recorded successfully!');
      console.log('Document ID:', result.id);
      
      // Now fetch and verify it exists
      console.log('\nVerifying logout event exists...');
      const snapshot = await db.collection('audit_trail')
        .where('action', '==', 'logout')
        .where('userId', '==', userId)
        .get();
        
      if (snapshot.empty) {
        console.log('❌ No logout event found in query! This suggests a query or index issue.');
      } else {
        console.log(`✅ Found ${snapshot.size} logout event(s):`);
        snapshot.docs.forEach(doc => {
          console.log('Document data:', doc.data());
        });
      }
    } else {
      console.log('❌ Failed to record logout event.');
    }
  } catch (error) {
    console.error('Error testing logout:', error);
    
    // Check if it's an index error
    if (error.code === 9 && error.message.includes('index')) {
      console.log('\n🔍 DIAGNOSIS: Missing Firestore index detected!');
      console.log('You need to create a composite index for the audit_trail collection.');
      console.log('Fields to index:');
      console.log('  - action (Ascending)');
      console.log('  - timestamp (Descending)');
      console.log('\nFollow the link in the error message to create the required index.');
    }
  }
}

testLogout(); 