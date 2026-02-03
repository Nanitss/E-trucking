// Temporary MySQL compatibility layer for Firebase migration
const { db } = require('./firebase');
require('dotenv').config();

// Create a mock MySQL pool that logs usage but actually uses Firebase
const pool = {
  // Mock query method that uses Firestore instead
  query: async (sql, params = []) => {
    console.log('⚠️ MySQL query intercepted and redirected to Firebase:');
    console.log('SQL:', sql);
    console.log('Params:', params);
    
    // Very basic SQL parsing to detect table name
    // This is a temporary solution and won't work for complex queries
    const tableMatch = sql.match(/FROM\s+([a-zA-Z_]+)/i);
    const whereMatch = sql.match(/WHERE\s+([a-zA-Z_\.]+)\s*=\s*\?/i);
    
    let collection = 'unknown';
    let field = null;
    
    if (tableMatch && tableMatch[1]) {
      collection = tableMatch[1].toLowerCase();
    }
    
    if (whereMatch && whereMatch[1]) {
      field = whereMatch[1].split('.').pop().toLowerCase();
    }
    
    console.log('Collection:', collection);
    console.log('Field:', field);
    
    // Try to intelligently handle the query
    try {
      if (sql.toUpperCase().startsWith('SELECT')) {
        // Handle SELECT query
        let snapshot;
        
        if (field && params.length > 0) {
          // If we have a WHERE clause, apply it as a filter
          snapshot = await db.collection(collection).where(field, '==', params[0]).get();
        } else {
          // Otherwise, get all documents in the collection
          snapshot = await db.collection(collection).get();
        }
        
        const results = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }));
        
        return [results];
      } 
      else if (sql.toUpperCase().startsWith('INSERT')) {
        // Handle INSERT (very simplified)
        console.log('INSERT operation - Create Firebase document');
        
        // Extract field names from SQL (very simplified)
        const fieldsMatch = sql.match(/\(([^)]+)\)/);
        
        if (fieldsMatch && fieldsMatch[1]) {
          const fields = fieldsMatch[1].split(',').map(f => f.trim());
          const data = {};
          
          // Create data object from fields and params
          fields.forEach((field, index) => {
            if (params[index] !== undefined) {
              data[field] = params[index];
            }
          });
          
          // Add timestamps
          data.created_at = new Date();
          data.updated_at = new Date();
          
          // Add to Firestore
          const docRef = await db.collection(collection).add(data);
          return [{ insertId: docRef.id }];
        }
      }
      else if (sql.toUpperCase().startsWith('UPDATE')) {
        // Handle UPDATE (very simplified)
        console.log('UPDATE operation - Update Firebase document');
        
        if (field && params.length > 0) {
          // Very simplified, assumes last param is the ID
          const id = params[params.length - 1];
          const docRef = db.collection(collection).doc(id);
          
          // Extract update fields (very naive approach)
          const setClause = sql.match(/SET\s+([^WHERE]+)/i);
          if (setClause && setClause[1]) {
            const updateData = {};
            const setItems = setClause[1].split(',');
            
            setItems.forEach((item, index) => {
              const [field] = item.split('=');
              if (field && params[index] !== undefined) {
                updateData[field.trim()] = params[index];
              }
            });
            
            // Add updated timestamp
            updateData.updated_at = new Date();
            
            await docRef.update(updateData);
            return [{ affectedRows: 1 }];
          }
        }
      }
      else if (sql.toUpperCase().startsWith('DELETE')) {
        // Handle DELETE (very simplified)
        console.log('DELETE operation - Delete Firebase document');
        
        if (field && params.length > 0) {
          const snapshot = await db.collection(collection)
            .where(field, '==', params[0])
            .limit(1)
            .get();
            
          if (!snapshot.empty) {
            await snapshot.docs[0].ref.delete();
            return [{ affectedRows: 1 }];
          }
        }
      }
      
      // Default empty result
      return [[]];
    } catch (error) {
      console.error('Error in SQL->Firebase compatibility layer:', error);
      throw error;
    }
  },
  
  // Mock connection method
  getConnection: async () => {
    console.log('⚠️ MySQL connection requested (using Firebase compatibility layer)');
    
    return {
      // Mock methods on connections
      beginTransaction: async () => console.log('MySQL beginTransaction() called (NO-OP)'),
      commit: async () => console.log('MySQL commit() called (NO-OP)'),
      rollback: async () => console.log('MySQL rollback() called (NO-OP)'),
      release: () => console.log('MySQL connection released (NO-OP)'),
      query: pool.query // Use the same query method defined above
    };
  }
};

// Export the pool for use in other files
module.exports = pool; 