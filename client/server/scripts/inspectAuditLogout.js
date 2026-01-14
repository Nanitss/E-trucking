// Script to directly inspect the audit_trail collection for logout events
const { db } = require('../config/firebase');

async function inspectAuditCollection() {
  try {
    console.log('Checking audit_trail collection for logout events...');
    
    // Get the most recent 50 events from audit_trail collection
    const snapshot = await db.collection('audit_trail')
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();
    
    if (snapshot.empty) {
      console.log('No recent audit events found.');
      return;
    }
    
    console.log(`Found ${snapshot.size} recent audit events.`);
    
    // Count of each action type
    const actionCounts = {};
    
    // Specifically look for logout events
    const logoutEvents = [];
    
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      
      // Count the action types
      if (!actionCounts[data.action]) {
        actionCounts[data.action] = 1;
      } else {
        actionCounts[data.action]++;
      }
      
      // Collect logout events
      if (data.action === 'logout') {
        logoutEvents.push({
          id: doc.id,
          timestamp: data.timestamp ? data.timestamp.toDate().toISOString() : 'unknown',
          username: data.username,
          userId: data.userId
        });
      }
    });
    
    console.log('\nAction type distribution:');
    Object.entries(actionCounts)
      .sort((a, b) => b[1] - a[1])  // Sort by count descending
      .forEach(([action, count]) => {
        console.log(`- ${action}: ${count}`);
      });
    
    if (logoutEvents.length > 0) {
      console.log('\nFound logout events:');
      logoutEvents.forEach((event, i) => {
        console.log(`\n[${i+1}] Logout event:`);
        console.log(`- ID: ${event.id}`);
        console.log(`- User: ${event.username} (${event.userId})`);
        console.log(`- Time: ${event.timestamp}`);
      });
    } else {
      console.log('\nNo logout events found in the recent audit trail.');
    }
  } catch (error) {
    console.error('Error inspecting audit collection:', error);
  }
}

// Run the function
inspectAuditCollection(); 