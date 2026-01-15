const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Test configuration
const BASE_URL = 'http://localhost:5007';
const TEST_TRUCK_PLATE = 'TEST_DOC_' + Date.now();

async function testDocumentUpload() {
  console.log('🧪 Testing Document Upload and Retrieval');
  console.log('=====================================');
  
  try {
    // Step 1: Create a test truck with documents
    console.log('\n📝 Step 1: Creating test truck...');
    
    const formData = new FormData();
    formData.append('truckPlate', TEST_TRUCK_PLATE);
    formData.append('truckType', 'Test Truck');
    formData.append('truckCapacity', '1000');
    formData.append('truckBrand', 'Test Brand');
    
    // Add test files (create dummy files if they don't exist)
    const testFiles = [
      { field: 'orDocument', filename: 'test-or.pdf', content: 'Test OR Document' },
      { field: 'crDocument', filename: 'test-cr.pdf', content: 'Test CR Document' },
      { field: 'insuranceDocument', filename: 'test-insurance.pdf', content: 'Test Insurance Document' }
    ];
    
    for (const file of testFiles) {
      const tempPath = path.join(__dirname, file.filename);
      fs.writeFileSync(tempPath, file.content);
      formData.append(file.field, fs.createReadStream(tempPath));
    }
    
    const createResponse = await axios.post(`${BASE_URL}/api/test-truck-create`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    
    console.log('✅ Truck created:', createResponse.data);
    
    // Clean up temp files
    for (const file of testFiles) {
      const tempPath = path.join(__dirname, file.filename);
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }
    
    // Step 2: Retrieve the truck to verify documents
    console.log('\n📋 Step 2: Retrieving truck to verify documents...');
    
    const truckId = createResponse.data.id;
    const retrieveResponse = await axios.get(`${BASE_URL}/api/trucks/${truckId}`);
    
    console.log('✅ Truck retrieved:', {
      id: retrieveResponse.data.id,
      truckPlate: retrieveResponse.data.truckPlate,
      documents: retrieveResponse.data.documents,
      documentCompliance: retrieveResponse.data.documentCompliance
    });
    
    // Step 3: Get all trucks to verify they appear in the list
    console.log('\n📋 Step 3: Retrieving all trucks to verify document display...');
    
    const allTrucksResponse = await axios.get(`${BASE_URL}/api/trucks/detailed-status`);
    const testTruck = allTrucksResponse.data.find(t => t.id === truckId);
    
    if (testTruck) {
      console.log('✅ Test truck found in detailed status:', {
        id: testTruck.id,
        truckPlate: testTruck.truckPlate,
        documents: testTruck.documents,
        documentCompliance: testTruck.documentCompliance,
        documentCount: testTruck.documentCompliance?.documentCount
      });
    } else {
      console.log('❌ Test truck not found in detailed status');
    }
    
    console.log('\n🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testDocumentUpload();
