// Script to fix existing document paths in the database
const { db } = require('./client/server/config/firebase');
const fs = require('fs');
const path = require('path');

async function fixDocumentPaths() {
  console.log('🔧 Starting document path fix...');
  
  try {
    // Get all trucks
    const trucksSnapshot = await db.collection('trucks').get();
    console.log(`📋 Found ${trucksSnapshot.size} trucks`);
    
    let fixedCount = 0;
    
    for (const truckDoc of trucksSnapshot.docs) {
      const truckData = truckDoc.data();
      const truckId = truckDoc.id;
      
      if (truckData.documents) {
        let needsUpdate = false;
        const updatedDocuments = { ...truckData.documents };
        
        // Check each document type
        for (const [docType, document] of Object.entries(truckData.documents)) {
          if (document && document.fullPath) {
            console.log(`\n🔍 Checking ${docType} for truck ${truckData.TruckPlate || truckId}`);
            console.log(`   Current path: ${document.fullPath}`);
            
            // Extract the actual filename from the path
            const pathParts = document.fullPath.split('\\');
            const currentFilename = pathParts[pathParts.length - 1];
            
            // Check if file exists with current name
            if (!fs.existsSync(document.fullPath)) {
              console.log(`   ❌ File not found: ${document.fullPath}`);
              
              // Try to find the actual file in the directory
              const directory = path.dirname(document.fullPath);
              if (fs.existsSync(directory)) {
                const files = fs.readdirSync(directory);
                console.log(`   📁 Files in directory: ${files.join(', ')}`);
                
                // Look for files with the same prefix but different date
                const baseName = currentFilename.replace(/^\d{4}-\d{2}-\d{2}_/, '');
                const matchingFiles = files.filter(file => file.includes(baseName));
                
                if (matchingFiles.length > 0) {
                  const actualFile = matchingFiles[0];
                  const actualPath = path.join(directory, actualFile);
                  
                  console.log(`   ✅ Found actual file: ${actualFile}`);
                  
                  // Update the document record
                  updatedDocuments[docType] = {
                    ...document,
                    filename: actualFile,
                    fullPath: actualPath,
                    originalName: actualFile
                  };
                  
                  needsUpdate = true;
                  fixedCount++;
                }
              }
            } else {
              console.log(`   ✅ File exists: ${document.fullPath}`);
            }
          }
        }
        
        // Update the truck document if needed
        if (needsUpdate) {
          await db.collection('trucks').doc(truckId).update({
            documents: updatedDocuments
          });
          console.log(`   🔄 Updated truck ${truckData.TruckPlate || truckId}`);
        }
      }
    }
    
    console.log(`\n✅ Fixed ${fixedCount} document paths`);
    
  } catch (error) {
    console.error('❌ Error fixing document paths:', error);
  }
}

// Run the fix
fixDocumentPaths().then(() => {
  console.log('🎉 Document path fix completed!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
