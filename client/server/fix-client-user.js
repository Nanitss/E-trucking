// fix-client-user.js - Script to fix client-user relationships
// Run this from the server directory: node fix-client-user.js

require('dotenv').config();
const { db } = require('./config/firebase');

async function fixClientUserRelationship() {
  try {
    console.log('======== FIXING CLIENT-USER RELATIONSHIPS ========');
    
    // Step 1: Get all clients
    console.log('\n1. Getting all clients...');
    const clientsSnapshot = await db.collection('clients').get();
    
    if (clientsSnapshot.empty) {
      console.error('No clients found! Please create a client first.');
      return;
    }
    
    console.log(`Found ${clientsSnapshot.size} clients.`);
    const clients = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    clients.forEach((client, index) => {
      console.log(`${index + 1}. ${client.clientName || client.ClientName || 'Unknown'} (${client.id})`);
      console.log(`   User ID: ${client.userId || 'None'}`);
    });
    
    // Step 2: Get all users
    console.log('\n2. Getting all users...');
    const usersSnapshot = await db.collection('users').get();
    
    if (usersSnapshot.empty) {
      console.error('No users found! Please create users first.');
      return;
    }
    
    console.log(`Found ${usersSnapshot.size} users.`);
    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.id}) - Role: ${user.role}`);
    });
    
    // Step 3: Find client users
    console.log('\n3. Finding users with client role...');
    const clientUsers = users.filter(user => user.role === 'client');
    
    if (clientUsers.length === 0) {
      console.log('No users with client role found. Creating a new client user...');
      
      // Create a new client user
      console.log('\n4. Creating a new client user...');
      const client = clients[0]; // Use the first client
      
      // Create a new user with client role
      const newUserRef = db.collection('users').doc();
      await newUserRef.set({
        username: `${client.clientName || client.ClientName}_user`,
        password: '$2a$10$1Xp91/FKfD3Gq3Fy3J0qU.dQ3Lm7O0sDa9sLKvR6JcaOCw/HWZRpa', // "password123"
        role: 'client',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      });
      
      console.log(`Created new client user: ${client.clientName || client.ClientName}_user (${newUserRef.id})`);
      
      // Update client with the user ID
      await db.collection('clients').doc(client.id).update({
        userId: newUserRef.id,
        updated_at: new Date()
      });
      
      console.log(`Updated client ${client.id} with user ID ${newUserRef.id}`);
      
    } else {
      console.log(`Found ${clientUsers.length} users with client role.`);
      
      // Step 4: Link clients to users
      console.log('\n4. Linking clients to users...');
      
      const batch = db.batch();
      let fixCount = 0;
      
      for (const client of clients) {
        if (!client.userId) {
          // Client doesn't have a user ID assigned
          if (clientUsers.length > 0) {
            // Assign the first available client user
            const user = clientUsers.shift();
            console.log(`Linking client ${client.clientName || client.ClientName} (${client.id}) to user ${user.username} (${user.id})`);
            
            const clientRef = db.collection('clients').doc(client.id);
            batch.update(clientRef, {
              userId: user.id,
              updated_at: new Date()
            });
            
            fixCount++;
          } else {
            console.log(`No more client users available to link to client ${client.clientName || client.ClientName} (${client.id})`);
          }
        } else {
          // Check if the user ID is valid
          const userDoc = await db.collection('users').doc(client.userId).get();
          
          if (!userDoc.exists) {
            console.log(`Client ${client.clientName || client.ClientName} (${client.id}) has invalid user ID ${client.userId}. Fixing...`);
            
            if (clientUsers.length > 0) {
              // Assign a new client user
              const user = clientUsers.shift();
              console.log(`Re-linking client to user ${user.username} (${user.id})`);
              
              const clientRef = db.collection('clients').doc(client.id);
              batch.update(clientRef, {
                userId: user.id,
                updated_at: new Date()
              });
              
              fixCount++;
            } else {
              console.log(`No more client users available to re-link`);
            }
          } else {
            console.log(`Client ${client.clientName || client.ClientName} (${client.id}) already linked to valid user ${client.userId}`);
          }
        }
      }
      
      // Commit all changes
      if (fixCount > 0) {
        console.log(`\nCommitting ${fixCount} changes to the database...`);
        await batch.commit();
        console.log('Changes committed successfully!');
      } else {
        console.log('\nNo changes needed. All clients properly linked to users.');
      }
    }
    
    console.log('\n======== CLIENT-USER FIXES COMPLETE ========');
    
  } catch (error) {
    console.error('Error fixing client-user relationships:', error);
  }
}

// Run the fix function
fixClientUserRelationship(); 