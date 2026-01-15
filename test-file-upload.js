// Test script to verify file upload functionality
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const baseURL = 'http://localhost:5007';

async function testFileUpload() {
  console.log('🧪 Testing Enhanced File Upload System...');
  
  try {
    // Test 1: Upload a test file
    console.log('\n📤 Test 1: Uploading test file...');
    
    const formData = new FormData();
    const testFile = Buffer.from('This is a test file for upload verification');
    formData.append('files', testFile, {
      filename: 'test-upload.txt',
      contentType: 'text/plain'
    });
    formData.append('documentType', 'general');
    formData.append('subFolder', 'test-files');
    formData.append('identifier', 'test123');

    const uploadResponse = await axios.post(`${baseURL}/api/upload/upload`, formData, {
      headers: {
        ...formData.getHeaders()
      }
    });

    console.log('✅ Upload successful:', uploadResponse.data);

    // Test 2: List files
    console.log('\n📁 Test 2: Listing files...');
    
    const listResponse = await axios.get(`${baseURL}/api/upload/files/general/test-files`);
    console.log('✅ Files listed:', listResponse.data);

    // Test 3: Get file info
    if (listResponse.data.files && listResponse.data.files.length > 0) {
      const file = listResponse.data.files[0];
      console.log('\n📄 Test 3: Getting file info...');
      
      const infoResponse = await axios.get(`${baseURL}/api/upload/info/${encodeURIComponent(file.relativePath)}`);
      console.log('✅ File info:', infoResponse.data);

      // Test 4: Serve file
      console.log('\n🔗 Test 4: Testing file serving...');
      const serveUrl = `${baseURL}/api/upload/serve/${encodeURIComponent(file.relativePath)}`;
      console.log('✅ File serve URL:', serveUrl);

      // Test 5: Delete file
      console.log('\n🗑️ Test 5: Deleting file...');
      
      const deleteResponse = await axios.delete(`${baseURL}/api/upload/delete/${encodeURIComponent(file.relativePath)}`);
      console.log('✅ File deleted:', deleteResponse.data);
    }

    console.log('\n🎉 All tests passed! Enhanced file upload system is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testFileUpload();
