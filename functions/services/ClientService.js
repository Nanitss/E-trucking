// Firebase Client Service
const FirebaseService = require('./FirebaseService');
const UserService = require('./UserService');
const bcrypt = require('bcryptjs');
const { db } = require('../config/firebase');

class ClientService extends FirebaseService {
  constructor() {
    super('clients');
  }

  // Get client with associated user details
  async getClientWithUser(id) {
    try {
      const client = await this.getById(id);
      
      if (!client || !client.userId) return client;
      
      // Get associated user details
      const user = await UserService.getById(client.userId);
      
      if (user) {
        return {
          ...client,
          username: user.username,
          status: user.status
        };
      }
      
      return client;
    } catch (error) {
      console.error('Error getting client with user:', error);
      throw error;
    }
  }

  // Create a new client with associated user
  async createClientWithUser(clientData, userData) {
    const batch = db.batch();
    
    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Create user first
      const userRef = db.collection('users').doc();
      batch.set(userRef, {
        username: userData.username,
        password: hashedPassword,
        role: userData.role || 'client',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      });
      
      // Create client and link to user
      const clientRef = this.collection.doc();
      batch.set(clientRef, {
        ...clientData,
        userId: userRef.id,
        created_at: new Date(),
        updated_at: new Date()
      });
      
      // Commit the batch
      await batch.commit();
      
      // Return the created client with ID
      return {
        id: clientRef.id,
        ...clientData,
        userId: userRef.id,
        username: userData.username
      };
    } catch (error) {
      console.error('Error creating client with user:', error);
      throw error;
    }
  }

  // Update client and associated user
  async updateClientWithUser(id, clientData, userData) {
    const batch = db.batch();
    
    try {
      // Get the client to find the userId
      const client = await this.getById(id);
      
      if (!client) {
        throw new Error(`Client with ID ${id} not found`);
      }
      
      // Update client
      const clientRef = this.collection.doc(id);
      batch.update(clientRef, {
        ...clientData,
        updated_at: new Date()
      });
      
      // If there's user data and the client has a userId, update the user
      if (userData && Object.keys(userData).length > 0 && client.userId) {
        const userRef = db.collection('users').doc(client.userId);
        
        const userToUpdate = {};
        
        if (userData.username) userToUpdate.username = userData.username;
        if (userData.status) userToUpdate.status = userData.status;
        
        // If password is provided, hash it
        if (userData.password) {
          userToUpdate.password = await bcrypt.hash(userData.password, 10);
        }
        
        if (Object.keys(userToUpdate).length > 0) {
          userToUpdate.updated_at = new Date();
          batch.update(userRef, userToUpdate);
        }
      }
      
      // Commit the batch
      await batch.commit();
      
      // Return the updated client
      const updatedClient = await this.getClientWithUser(id);
      return updatedClient;
    } catch (error) {
      console.error('Error updating client with user:', error);
      throw error;
    }
  }

  // Get client by user ID
  async getClientByUserId(userId) {
    try {
      const snapshot = await this.collection.where('userId', '==', userId).limit(1).get();
      
      if (snapshot.empty) {
        return null;
      }
      
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error('Error getting client by user ID:', error);
      throw error;
    }
  }

  // Get all active clients
  async getActiveClients() {
    try {
      return await this.getAll([{ field: 'clientStatus', operator: '==', value: 'active' }]);
    } catch (error) {
      console.error('Error getting active clients:', error);
      throw error;
    }
  }
  
  // Get all clients with user details
  async getAllWithUsers() {
    try {
      const clients = await this.getAll();
      
      // Fetch user details for each client
      const clientsWithUsers = await Promise.all(
        clients.map(async (client) => {
          if (client.userId) {
            return await this.getClientWithUser(client.id);
          }
          return client;
        })
      );
      
      return clientsWithUsers;
    } catch (error) {
      console.error('Error getting all clients with users:', error);
      throw error;
    }
  }
  
  // Handle client deletion with linked user
  async deleteWithUser(id) {
    try {
      const client = await this.getById(id);
      
      if (!client) {
        throw new Error(`Client with ID ${id} not found`);
      }
      
      // If there's a linked user, set their status to inactive rather than deleting
      if (client.userId) {
        await UserService.changeStatus(client.userId, 'inactive');
      }
      
      // Delete the client
      await this.delete(id);
      
      return { success: true, message: 'Client deleted successfully' };
    } catch (error) {
      console.error('Error deleting client with user:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new ClientService(); 