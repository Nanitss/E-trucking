const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:5007';

async function testFileScanning() {
  console.log('🔍 Testing File Scanning Functionality');
  console.log('=====================================');
  
  try {
    // Test the new test-file-scanning endpoint
    console.log('\n📋 Testing test-file-scanning endpoint...');
    
    const response = await axios.get(`${BASE_URL}/api/test-file-scanning`);
    
    if (response.data && response.data.trucks) {
      console.log(`✅ Found ${response.data.truckCount} trucks with actual documents`);
      
      // Show details for each truck
      response.data.trucks.forEach((truck, index) => {
        console.log(`\n🚛 Truck ${index + 1}:`);
        console.log(`   Plate: ${truck.truckPlate}`);
        console.log(`   Documents: ${Object.keys(truck.documents || {}).length}`);
        console.log(`   Document Count: ${truck.documentCompliance?.documentCount || 0}`);
        console.log(`   Required: ${truck.documentCompliance?.requiredDocumentCount || 0}/3`);
        console.log(`   Optional: ${truck.documentCompliance?.optionalDocumentCount || 0}/1`);
        
        if (truck.documents && Object.keys(truck.documents).length > 0) {
          console.log(`   Files found:`);
          Object.entries(truck.documents).forEach(([docType, doc]) => {
            console.log(`     ${docType}: ${doc.filename} (${doc.fileSize} bytes)`);
          });
        } else {
          console.log(`   No files found in folders`);
        }
      });
      
      console.log('\n🎉 File scanning test completed successfully!');
      
    } else {
      console.log('❌ Invalid response format:', response.data);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testFileScanning();
