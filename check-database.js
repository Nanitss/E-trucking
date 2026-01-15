// Simple script to check what's in the database
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking your file system for actual files...');

// Check the uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
console.log(`📁 Checking directory: ${uploadsDir}`);

if (fs.existsSync(uploadsDir)) {
  console.log('✅ Uploads directory exists');
  
  // Check Truck-Documents
  const truckDocsDir = path.join(uploadsDir, 'Truck-Documents');
  if (fs.existsSync(truckDocsDir)) {
    console.log('\n🚛 Truck Documents:');
    
    // Check OR-CR-Files
    const orCrDir = path.join(truckDocsDir, 'OR-CR-Files');
    if (fs.existsSync(orCrDir)) {
      const orCrFiles = fs.readdirSync(orCrDir);
      console.log(`   OR-CR-Files (${orCrFiles.length} files):`);
      orCrFiles.forEach(file => {
        console.log(`     - ${file}`);
      });
    }
    
    // Check Insurance-Papers
    const insuranceDir = path.join(truckDocsDir, 'Insurance-Papers');
    if (fs.existsSync(insuranceDir)) {
      const insuranceFiles = fs.readdirSync(insuranceDir);
      console.log(`   Insurance-Papers (${insuranceFiles.length} files):`);
      insuranceFiles.forEach(file => {
        console.log(`     - ${file}`);
      });
    }
  }
  
  // Check Driver-Documents
  const driverDocsDir = path.join(uploadsDir, 'Driver-Documents');
  if (fs.existsSync(driverDocsDir)) {
    console.log('\n👨‍💼 Driver Documents:');
    
    // Check ID-Photos
    const idPhotosDir = path.join(driverDocsDir, 'ID-Photos');
    if (fs.existsSync(idPhotosDir)) {
      const idPhotosFiles = fs.readdirSync(idPhotosDir);
      console.log(`   ID-Photos (${idPhotosFiles.length} files):`);
      idPhotosFiles.forEach(file => {
        console.log(`     - ${file}`);
      });
    }
  }
} else {
  console.log('❌ Uploads directory not found');
}

console.log('\n📋 Summary:');
console.log('This shows the actual files on your system.');
console.log('If you see September dates (2025-09-XX), those are your real files.');
console.log('The database might still have records pointing to October dates (2025-10-09).');
console.log('\nTo fix this, you need to either:');
console.log('1. Delete the document records from the database and re-upload');
console.log('2. Or manually update the database records to point to the correct files');
