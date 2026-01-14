// Firebase User Service
const FirebaseService = require('./FirebaseService');
const bcrypt = require('bcryptjs');

class UserService extends FirebaseService {
  constructor() {
    super('users'); // Use the 'users' collection
  }

  // Create a new user with encrypted password
  async createUser(userData) {
    try {
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      userData.password = await bcrypt.hash(userData.password, salt);
      
      // Set default status if not provided
      if (!userData.status) userData.status = 'active';
      
      return await this.create(userData);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Update user data without changing password
  async updateUser(id, userData) {
    try {
      // Don't update password if not provided
      if (userData.password === undefined || userData.password === '') {
        delete userData.password;
      } else {
        // Hash new password if provided
        const salt = await bcrypt.genSalt(10);
        userData.password = await bcrypt.hash(userData.password, salt);
      }
      
      return await this.update(id, userData);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Find a user by username
  async findByUsername(username) {
    try {
      const snapshot = await this.collection.where('username', '==', username).limit(1).get();
      
      if (snapshot.empty) return null;
      
      return this._formatDoc(snapshot.docs[0]);
    } catch (error) {
      console.error('Error finding user by username:', error);
      throw error;
    }
  }

  // Get users by role
  async getUsersByRole(role) {
    try {
      const snapshot = await this.collection.where('role', '==', role).get();
      return this._formatDocs(snapshot);
    } catch (error) {
      console.error('Error getting users by role:', error);
      throw error;
    }
  }

  // Change user status (active/inactive)
  async changeStatus(id, status) {
    try {
      return await this.update(id, { status });
    } catch (error) {
      console.error('Error changing user status:', error);
      throw error;
    }
  }

  // Change user password
  async changePassword(id, newPassword) {
    try {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      return await this.update(id, { password: hashedPassword });
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }

  // Verify password for a user
  async verifyPassword(id, password) {
    try {
      const user = await this.getById(id);
      
      if (!user) return false;
      
      return bcrypt.compare(password, user.password);
    } catch (error) {
      console.error('Error verifying password:', error);
      throw error;
    }
  }
}

module.exports = new UserService(); 