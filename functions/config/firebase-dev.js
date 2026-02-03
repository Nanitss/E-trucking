// firebase-dev.js - Development Firebase configuration with fallback
const admin = require('firebase-admin');

// Simple in-memory database for development
const mockDB = {
  collections: new Map(),
  
  collection(name) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new Map());
    }
    
    return {
      doc: (id) => ({
        get: async () => {
          const collection = mockDB.collections.get(name);
          const data = collection.get(id);
          return {
            exists: !!data,
            data: () => data,
            id
          };
        },
        set: async (data, options = {}) => {
          const collection = mockDB.collections.get(name);
          if (options.merge && collection.has(id)) {
            const existing = collection.get(id);
            collection.set(id, { ...existing, ...data });
          } else {
            collection.set(id, data);
          }
          return { id };
        },
        update: async (data) => {
          const collection = mockDB.collections.get(name);
          const existing = collection.get(id) || {};
          collection.set(id, { ...existing, ...data });
          return { id };
        },
        delete: async () => {
          const collection = mockDB.collections.get(name);
          collection.delete(id);
          return true;
        }
      }),
      where: (field, op, value) => ({
        limit: (num) => ({
          get: async () => {
            const collection = mockDB.collections.get(name);
            const docs = [];
            let count = 0;
            for (const [id, data] of collection.entries()) {
              if (count >= num) break;
              if (data[field] === value) {
                docs.push({
                  id,
                  data: () => data,
                  exists: true
                });
                count++;
              }
            }
            return {
              empty: docs.length === 0,
              size: docs.length,
              docs
            };
          }
        })
      }),
      get: async () => {
        const collection = mockDB.collections.get(name);
        const docs = [];
        for (const [id, data] of collection.entries()) {
          docs.push({
            id,
            data: () => data,
            exists: true
          });
        }
        return {
          empty: docs.length === 0,
          size: docs.length,
          docs
        };
      }
    };
  }
};

// Create mock admin object
const mockAdmin = {
  firestore: {
    FieldValue: {
      serverTimestamp: () => new Date(),
      arrayUnion: (value) => ({ _type: 'arrayUnion', value }),
      arrayRemove: (value) => ({ _type: 'arrayRemove', value })
    }
  }
};

console.log('🔧 Using development Firebase mock');
console.log('⚠️ Data will not persist between server restarts');
console.log('📝 To use real Firebase, fix your environment variables');

module.exports = {
  db: mockDB,
  admin: mockAdmin
};
