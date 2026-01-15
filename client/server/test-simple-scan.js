const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🧪 Testing Basic File System Operations');
console.log('=====================================');

try {
  // Test basic file system operations
  const documentsPath = path.join(os.homedir(), 'Documents', 'TruckingApp-Files');
  console.log('📁 Documents path:', documentsPath);
  
  if (fs.existsSync(documentsPath)) {
    console.log('✅ Documents folder exists');
    
    const truckDocsPath = path.join(documentsPath, 'Truck-Documents');
    console.log('📁 Truck documents path:', truckDocsPath);
    
    if (fs.existsSync(truckDocsPath)) {
      console.log('✅ Truck documents folder exists');
      
      // List subfolders
      const subfolders = fs.readdirSync(truckDocsPath);
      console.log('📁 Subfolders found:', subfolders);
      
      // Check each subfolder
      subfolders.forEach(folder => {
        const folderPath = path.join(truckDocsPath, folder);
        if (fs.statSync(folderPath).isDirectory()) {
          const files = fs.readdirSync(folderPath);
          console.log(`📁 ${folder}: ${files.length} files`);
          if (files.length > 0) {
            files.slice(0, 3).forEach(file => {
              console.log(`   - ${file}`);
            });
            if (files.length > 3) {
              console.log(`   ... and ${files.length - 3} more files`);
            }
          }
        }
      });
      
    } else {
      console.log('❌ Truck documents folder does not exist');
    }
    
  } else {
    console.log('❌ Documents folder does not exist');
  }
  
  console.log('\n🎉 Basic file system test completed!');
  
} catch (error) {
  console.error('❌ Test failed:', error);
}
