// Base Firebase service class
const { db, admin } = require('../config/firebase');

class FirebaseService {
  constructor(collectionName) {
    this.collectionName = collectionName;
    this.collection = db.collection(collectionName);
  }

  // Convert Firestore document to a standard format
  _formatDoc(doc) {
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }

  // Format an array of documents
  _formatDocs(snapshot) {
    return snapshot.docs.map(doc => this._formatDoc(doc));
  }

  // Create a new document
  async create(data) {
    try {
      // Add timestamps
      const timestamp = admin.firestore.FieldValue.serverTimestamp();
      data.created_at = timestamp;
      data.updated_at = timestamp;
      
      // Create document with auto-generated ID
      const docRef = await this.collection.add(data);
      
      // Get the created document
      const doc = await docRef.get();
      return this._formatDoc(doc);
    } catch (error) {
      console.error(`Error creating ${this.collectionName}:`, error);
      throw error;
    }
  }

  // Get all documents
  async getAll(filters = []) {
    try {
      let query = this.collection;
      
      // Apply any filters
      filters.forEach(filter => {
        query = query.where(filter.field, filter.operator, filter.value);
      });
      
      const snapshot = await query.get();
      return this._formatDocs(snapshot);
    } catch (error) {
      console.error(`Error getting all ${this.collectionName}:`, error);
      throw error;
    }
  }

  // Get a document by ID
  async getById(id) {
    try {
      const doc = await this.collection.doc(id).get();
      return this._formatDoc(doc);
    } catch (error) {
      console.error(`Error getting ${this.collectionName} by ID:`, error);
      throw error;
    }
  }

  // Update a document
  async update(id, data) {
    try {
      const docRef = this.collection.doc(id);
      
      // Add updated timestamp
      data.updated_at = admin.firestore.FieldValue.serverTimestamp();
      
      await docRef.update(data);
      
      // Get the updated document
      const doc = await docRef.get();
      return this._formatDoc(doc);
    } catch (error) {
      console.error(`Error updating ${this.collectionName}:`, error);
      throw error;
    }
  }

  // Delete a document
  async delete(id) {
    try {
      // Validate ID
      if (!id || typeof id !== 'string' || id === 'undefined') {
        throw new Error(`Invalid ID provided for ${this.collectionName} deletion: ${id}`);
      }
      
      // Check if document exists before deletion
      const docRef = this.collection.doc(id);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        throw new Error(`${this.collectionName} with ID ${id} not found for deletion`);
      }
      
      // Perform deletion
      await docRef.delete();
      console.log(`Successfully deleted ${this.collectionName} with ID ${id}`);
      return { id, deleted: true };
    } catch (error) {
      console.error(`Error deleting ${this.collectionName}:`, error);
      throw error;
    }
  }

  // Utility method for pagination
  async getPaginated(page = 1, limit = 10, filters = []) {
    try {
      const startAt = (page - 1) * limit;
      let query = this.collection;
      
      // Apply any filters
      filters.forEach(filter => {
        query = query.where(filter.field, filter.operator, filter.value);
      });
      
      // Get total count (inefficient in Firestore but works for small collections)
      const countSnapshot = await query.get();
      const totalItems = countSnapshot.size;
      
      // Apply pagination
      query = query.limit(limit);
      
      // If not the first page, use startAfter with a document cursor
      if (page > 1) {
        // This is a simplistic approach - real pagination would use cursors
        const snapshot = await this.collection.limit(startAt).get();
        if (snapshot.docs.length > 0) {
          const lastDoc = snapshot.docs[snapshot.docs.length - 1];
          query = query.startAfter(lastDoc);
        }
      }
      
      const snapshot = await query.get();
      const items = this._formatDocs(snapshot);
      
      return {
        items,
        pagination: {
          page,
          limit,
          totalItems,
          totalPages: Math.ceil(totalItems / limit)
        }
      };
    } catch (error) {
      console.error(`Error getting paginated ${this.collectionName}:`, error);
      throw error;
    }
  }
}

module.exports = FirebaseService; 