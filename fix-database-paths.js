// Script to automatically fix database records to point to correct files
const fs = require('fs');
const path = require('path');

console.log('🔧 Auto-fixing database records to point to correct files...');

// Function to find the correct file for a given pattern
function findCorrectFile(directory, searchPattern) {
  if (!fs.existsSync(directory)) {
    return null;
  }
  
  const files = fs.readdirSync(directory);
  
  // Extract the base name from the search pattern (remove date prefix)
  const baseName = searchPattern.replace(/^\d{4}-\d{2}-\d{2}_/, '');
  
  // Find files that contain the base name
  const matchingFiles = files.filter(file => file.includes(baseName));
  
  if (matchingFiles.length > 0) {
    const actualFile = matchingFiles[0];
    const actualPath = path.join(directory, actualPath);
    return { filename: actualFile, fullPath: actualPath };
  }
  
  return null;
}

// Function to generate the correct database update commands
function generateDatabaseUpdates() {
  const uploadsDir = path.join(__dirname, 'uploads');
  
  if (!fs.existsSync(uploadsDir)) {
    console.log('❌ Uploads directory not found');
    return;
  }
  
  console.log('📋 Database Update Commands:');
  console.log('Copy and run these commands in your Firebase console or use them in your application:\n');
  
  // Check Truck Documents
  const truckDocsDir = path.join(uploadsDir, 'Truck-Documents');
  if (fs.existsSync(truckDocsDir)) {
    console.log('🚛 Truck Documents Updates:');
    
    // OR-CR-Files
    const orCrDir = path.join(truckDocsDir, 'OR-CR-Files');
    if (fs.existsSync(orCrDir)) {
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
      
      // Generate update commands for each truck
      Object.entries(truckFiles).forEach(([truckPlate, files]) => {
        console.log(`\n   📄 Truck: ${truckPlate}`);
        
        if (files.OR) {
          const orPath = path.join(orCrDir, files.OR).replace(/\\/g, '/');
          console.log(`     // Update OR document for ${truckPlate}`);
          console.log(`     db.collection('trucks').where('TruckPlate', '==', '${truckPlate}').get().then(snapshot => {`);
          console.log(`       snapshot.forEach(doc => {`);
          console.log(`         if (doc.data().documents && doc.data().documents.orDocument) {`);
          console.log(`           doc.ref.update({`);
          console.log(`             'documents.orDocument.filename': '${files.OR}',`);
          console.log(`             'documents.orDocument.fullPath': '${orPath}',`);
          console.log(`             'documents.orDocument.originalName': '${files.OR}'`);
          console.log(`           });`);
          console.log(`         }`);
          console.log(`       });`);
          console.log(`     });`);
        }
        
        if (files.CR) {
          const crPath = path.join(orCrDir, files.CR).replace(/\\/g, '/');
          console.log(`     // Update CR document for ${truckPlate}`);
          console.log(`     db.collection('trucks').where('TruckPlate', '==', '${truckPlate}').get().then(snapshot => {`);
          console.log(`       snapshot.forEach(doc => {`);
          console.log(`         if (doc.data().documents && doc.data().documents.crDocument) {`);
          console.log(`           doc.ref.update({`);
          console.log(`             'documents.crDocument.filename': '${files.CR}',`);
          console.log(`             'documents.crDocument.fullPath': '${crPath}',`);
          console.log(`             'documents.crDocument.originalName': '${files.CR}'`);
          console.log(`           });`);
          console.log(`         }`);
          console.log(`       });`);
          console.log(`     });`);
        }
      });
    }
    
    // Insurance-Papers
    const insuranceDir = path.join(truckDocsDir, 'Insurance-Papers');
    if (fs.existsSync(insuranceDir)) {
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
        console.log(`\n   🛡️ Truck: ${truckPlate} Insurance`);
        files.forEach(file => {
          const insurancePath = path.join(insuranceDir, file).replace(/\\/g, '/');
          console.log(`     // Update Insurance document for ${truckPlate}`);
          console.log(`     db.collection('trucks').where('TruckPlate', '==', '${truckPlate}').get().then(snapshot => {`);
          console.log(`       snapshot.forEach(doc => {`);
          console.log(`         if (doc.data().documents && doc.data().documents.insuranceDocument) {`);
          console.log(`           doc.ref.update({`);
          console.log(`             'documents.insuranceDocument.filename': '${file}',`);
          console.log(`             'documents.insuranceDocument.fullPath': '${insurancePath}',`);
          console.log(`             'documents.insuranceDocument.originalName': '${file}'`);
          console.log(`           });`);
          console.log(`         }`);
          console.log(`       });`);
          console.log(`     });`);
        });
      });
    }
  }
  
  // Check Driver Documents
  const driverDocsDir = path.join(uploadsDir, 'Driver-Documents');
  if (fs.existsSync(driverDocsDir)) {
    console.log('\n👨‍💼 Driver Documents Updates:');
    
    const idPhotosDir = path.join(driverDocsDir, 'ID-Photos');
    if (fs.existsSync(idPhotosDir)) {
      const idPhotoFiles = fs.readdirSync(idPhotosDir);
      
      idPhotoFiles.forEach(file => {
        const idPhotoPath = path.join(idPhotosDir, file).replace(/\\/g, '/');
        console.log(`\n   📸 Driver ID Photo: ${file}`);
        console.log(`     // Update Driver ID document`);
        console.log(`     db.collection('drivers').where('documents.idPhoto.filename', '==', '${file}').get().then(snapshot => {`);
        console.log(`       snapshot.forEach(doc => {`);
        console.log(`         if (doc.data().documents && doc.data().documents.idPhoto) {`);
        console.log(`           doc.ref.update({`);
        console.log(`             'documents.idPhoto.filename': '${file}',`);
        console.log(`             'documents.idPhoto.fullPath': '${idPhotoPath}',`);
        console.log(`             'documents.idPhoto.originalName': '${file}'`);
        console.log(`           });`);
        console.log(`         }`);
        console.log(`       });`);
        console.log(`     });`);
      });
    }
  }
  
  console.log('\n📋 Instructions:');
  console.log('1. Copy the commands above');
  console.log('2. Open your Firebase console or use them in your application');
  console.log('3. Run the commands to update the database records');
  console.log('4. Your documents should now display correctly!');
  console.log('\n🎉 This will fix all your document display issues!');
}

// Run the analysis
generateDatabaseUpdates();
