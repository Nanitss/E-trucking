const SimpleFileScanner = require('./services/SimpleFileScanner');

async function testFileScannerOnly() {
  console.log('🧪 Testing SimpleFileScanner Only (No Server)');
  console.log('============================================');
  
  try {
    console.log('🔍 Testing SimpleFileScanner.getTrucksWithDocuments()...');
    
    const trucks = await SimpleFileScanner.getTrucksWithDocuments();
    
    console.log(`✅ Found ${trucks.length} trucks with documents`);
    
    if (trucks.length > 0) {
      trucks.forEach((truck, index) => {
        console.log(`\n🚛 Truck ${index + 1}:`);
        console.log(`   Plate: ${truck.truckPlate}`);
        console.log(`   Documents: ${Object.keys(truck.documents || {}).length}`);
        console.log(`   Document Count: ${truck.documentCompliance?.documentCount || 0}`);
        console.log(`   Required: ${truck.documentCompliance?.requiredDocumentCount || 0}/3`);
        console.log(`   Optional: ${truck.documentCompliance?.optionalDocumentCount || 0}/1`);
        console.log(`   Overall Status: ${truck.documentCompliance?.overallStatus || 'unknown'}`);
        
        if (truck.documents && Object.keys(truck.documents).length > 0) {
          console.log(`   Files found:`);
          Object.entries(truck.documents).forEach(([docType, doc]) => {
            console.log(`     ${docType}: ${doc.filename} (${doc.fileSize} bytes)`);
          });
        } else {
          console.log(`   No files found in folders`);
        }
      });
    } else {
      console.log('📁 No trucks found with documents');
    }
    
    console.log('\n🎉 File scanner test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error stack:', error.stack);
  }
}

// Run the test
testFileScannerOnly();
