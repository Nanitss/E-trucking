const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:5008';

async function testSimpleEndpoint() {
  console.log('🧪 Testing Simple File Scanning Endpoint');
  console.log('=======================================');
  
  try {
    // Test the new simple file scanning endpoint
    console.log('\n📋 Testing /api/simple-files/trucks-with-documents endpoint...');
    
    const response = await axios.get(`${BASE_URL}/api/simple-files/trucks-with-documents`);
    
    if (response.data && response.data.trucks) {
      console.log(`✅ Found ${response.data.truckCount} trucks with documents`);
      
      // Show details for each truck
      response.data.trucks.forEach((truck, index) => {
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
      
      console.log('\n🎉 Simple endpoint test completed successfully!');
      
    } else {
      console.log('❌ Invalid response format:', response.data);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testSimpleEndpoint();
