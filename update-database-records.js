// Script to update database records to match actual files
const fs = require('fs');
const path = require('path');

console.log('🔧 Updating database records to match actual files...');

// Function to find the correct file for a given pattern
function findCorrectFile(directory, searchPattern) {
  if (!fs.existsSync(directory)) {
    return null;
  }
  
  const files = fs.readdirSync(directory);
  console.log(`   📁 Files in ${directory}: ${files.join(', ')}`);
  
  // Extract the base name from the search pattern (remove date prefix)
  const baseName = searchPattern.replace(/^\d{4}-\d{2}-\d{2}_/, '');
  console.log(`   🔍 Looking for files containing: ${baseName}`);
  
  // Find files that contain the base name
  const matchingFiles = files.filter(file => file.includes(baseName));
  
  if (matchingFiles.length > 0) {
    const actualFile = matchingFiles[0];
    const actualPath = path.join(directory, actualFile);
    console.log(`   ✅ Found actual file: ${actualFile}`);
    return { filename: actualFile, fullPath: actualPath };
  }
  
  return null;
}

// Function to update document records
function updateDocumentRecords() {
  const uploadsDir = path.join(__dirname, 'uploads');
  
  if (!fs.existsSync(uploadsDir)) {
    console.log('❌ Uploads directory not found');
    return;
  }
  
  console.log('📋 Document update plan:');
  console.log('This script will show you what needs to be updated in your database.');
  console.log('You can then manually update the records or use this information to fix them.\n');
  
  // Check Truck Documents
  const truckDocsDir = path.join(uploadsDir, 'Truck-Documents');
  if (fs.existsSync(truckDocsDir)) {
    console.log('🚛 Truck Documents Analysis:');
    
    // OR-CR-Files
    const orCrDir = path.join(truckDocsDir, 'OR-CR-Files');
    if (fs.existsSync(orCrDir)) {
      console.log('\n   📄 OR-CR-Files:');
      const orCrFiles = fs.readdirSync(orCrDir);
      
      // Group files by truck plate
      const truckFiles = {};
      orCrFiles.forEach(file => {
        if (file.includes('_OR.') || file.includes('_CR.')) {
          const parts = file.split('_');
          if (parts.length >= 3) {
            const truckPlate = parts[1];
            if (!truckFiles[truckPlate]) {
              truckFiles[truckPlate] = { OR: null, CR: null };
            }
            
            if (file.includes('_OR.')) {
              truckFiles[truckPlate].OR = file;
            } else if (file.includes('_CR.')) {
              truckFiles[truckPlate].CR = file;
            }
          }
        }
      });
      
      // Show what needs to be updated
      Object.entries(truckFiles).forEach(([truckPlate, files]) => {
        console.log(`     Truck: ${truckPlate}`);
        if (files.OR) {
          console.log(`       OR Document: ${files.OR}`);
          console.log(`       Database should point to: ${path.join(orCrDir, files.OR)}`);
        }
        if (files.CR) {
          console.log(`       CR Document: ${files.CR}`);
          console.log(`       Database should point to: ${path.join(orCrDir, files.CR)}`);
        }
        console.log('');
      });
    }
    
    // Insurance-Papers
    const insuranceDir = path.join(truckDocsDir, 'Insurance-Papers');
    if (fs.existsSync(insuranceDir)) {
      console.log('\n   🛡️ Insurance-Papers:');
      const insuranceFiles = fs.readdirSync(insuranceDir);
      
      // Group files by truck plate
      const truckInsurance = {};
      insuranceFiles.forEach(file => {
        if (file.includes('_INSURANCE.')) {
          const parts = file.split('_');
          if (parts.length >= 3) {
            const truckPlate = parts[1];
            if (!truckInsurance[truckPlate]) {
              truckInsurance[truckPlate] = [];
            }
            truckInsurance[truckPlate].push(file);
          }
        }
      });
      
      Object.entries(truckInsurance).forEach(([truckPlate, files]) => {
        console.log(`     Truck: ${truckPlate}`);
        files.forEach(file => {
          console.log(`       Insurance: ${file}`);
          console.log(`       Database should point to: ${path.join(insuranceDir, file)}`);
        });
        console.log('');
      });
    }
  }
  
  // Check Driver Documents
  const driverDocsDir = path.join(uploadsDir, 'Driver-Documents');
  if (fs.existsSync(driverDocsDir)) {
    console.log('👨‍💼 Driver Documents Analysis:');
    
    const idPhotosDir = path.join(driverDocsDir, 'ID-Photos');
    if (fs.existsSync(idPhotosDir)) {
      console.log('\n   📸 ID-Photos:');
      const idPhotoFiles = fs.readdirSync(idPhotosDir);
      
      idPhotoFiles.forEach(file => {
        console.log(`     ID Photo: ${file}`);
        console.log(`     Database should point to: ${path.join(idPhotosDir, file)}`);
      });
    }
  }
  
  console.log('\n📋 Summary:');
  console.log('The above shows the actual files on your system with September dates.');
  console.log('Your database records need to be updated to point to these correct files.');
  console.log('\nTo fix this, you can:');
  console.log('1. Manually update the database records using the paths shown above');
  console.log('2. Or delete the document records and re-upload (which will use the new naming logic)');
  console.log('3. Or I can help you create a script to automatically update the database');
}

// Run the analysis
updateDocumentRecords();
