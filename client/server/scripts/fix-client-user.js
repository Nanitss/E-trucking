// Script to fix client-user relationships in Firebase
const { db } = require('../config/firebase');
const admin = require('firebase-admin');

async function fixClientUserRelationships() {
  console.log('🔄 Starting to fix client-user relationships...');
  
  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`🔍 Found ${users.length} total users`);
    
    // Filter to just client users
    const clientUsers = users.filter(user => user.role === 'client');
    console.log(`🔍 Found ${clientUsers.length} client users`);
    
    // Get all clients
    const clientsSnapshot = await db.collection('clients').get();
    const clients = clientsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`🔍 Found ${clients.length} total clients`);
    
    // Find users without client associations
    const clientUsersWithoutClients = clientUsers.filter(user => 
      !clients.some(client => client.userId === user.id)
    );
    
    console.log(`⚠️ Found ${clientUsersWithoutClients.length} client users without associated clients`);
    
    // Find clients without user associations
    const clientsWithoutUsers = clients.filter(client => 
      !client.userId || !users.some(user => user.id === client.userId)
    );
    
    console.log(`⚠️ Found ${clientsWithoutUsers.length} clients without associated users`);
    
    // Match orphaned users with orphaned clients
    const batch = db.batch();
    let fixCount = 0;
    
    // Fix clients without users by assigning an available client user
    for (let i = 0; i < clientsWithoutUsers.length; i++) {
      const client = clientsWithoutUsers[i];
      
      // If we have available client users, assign one
      if (i < clientUsersWithoutClients.length) {
        const user = clientUsersWithoutClients[i];
        console.log(`🔧 Assigning client ${client.id} (${client.clientName || 'unnamed'}) to user ${user.id} (${user.username})`);
        
        const clientRef = db.collection('clients').doc(client.id);
        batch.update(clientRef, { 
          userId: user.id,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        
        fixCount++;
      } else {
        console.log(`⚠️ No available client user to assign to client ${client.id}`);
      }
    }
    
    // If we have leftover users without clients and no more orphaned clients,
    // create new clients for them
    const remainingUsersWithoutClients = clientUsersWithoutClients.slice(Math.min(clientsWithoutUsers.length, clientUsersWithoutClients.length));
    
    for (const user of remainingUsersWithoutClients) {
      console.log(`🔧 Creating new client for user ${user.id} (${user.username})`);
      
      const newClientRef = db.collection('clients').doc();
      batch.set(newClientRef, {
        clientName: user.username || 'New Client',
        clientEmail: user.email || '',
        clientNumber: '',
        clientStatus: 'active',
        userId: user.id,
        clientCreationDate: admin.firestore.FieldValue.serverTimestamp(),
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      
      fixCount++;
    }
    
    // Commit the batch
    if (fixCount > 0) {
      await batch.commit();
      console.log(`✅ Fixed ${fixCount} client-user relationships`);
    } else {
      console.log('ℹ️ No client-user relationships needed fixing');
    }
    
    console.log('✅ Client-user relationship fix complete!');
  } catch (error) {
    console.error('❌ Error fixing client-user relationships:', error);
  }
}

// Run the function if this file is executed directly
if (require.main === module) {
  fixClientUserRelationships()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
} else {
  // Export for use in other modules
  module.exports = { fixClientUserRelationships }; 
} 