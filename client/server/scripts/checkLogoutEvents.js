// Script to check if logout events exist in audit collection
const { db } = require('../config/firebase');

async function checkLogoutEvents() {
  try {
    console.log('Checking for logout events in audit collection...');
    
    // Query for logout events specifically
    const snapshot = await db.collection('audit')
      .where('action', '==', 'logout')
      .get();
    
    if (snapshot.empty) {
      console.log('No logout events found in audit collection.');
      return;
    }
    
    console.log(`Found ${snapshot.size} logout events:`);
    
    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n--- Event ${index + 1} ---`);
      console.log(`ID: ${doc.id}`);
      console.log(`Username: ${data.username}`);
      console.log(`Timestamp: ${data.timestamp ? data.timestamp.toDate().toISOString() : 'N/A'}`);
      console.log(`Details:`, data);
    });
    
  } catch (error) {
    console.error('Error checking logout events:', error);
  }
}

checkLogoutEvents(); 