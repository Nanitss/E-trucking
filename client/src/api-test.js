// api-test.js - Create this file to test your API directly
// Run with Node.js: node api-test.js

const axios = require('axios');

// Replace with your actual credentials
const credentials = {
  username: 'admin',
  password: 'admin123'
};

async function testAuth() {
  try {
    console.log(`Testing login with username: ${credentials.username}`);
    
    const response = await axios.post('http://localhost:5007/api/auth/login', credentials);
    
    console.log('SUCCESS! Login successful.');
    console.log('Response:', response.data);
    
    // If you got a token, try to use it
    if (response.data.token) {
      console.log('\nTrying to get user data with the token...');
      
      const userResponse = await axios.get('http://localhost:5007/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${response.data.token}`
        }
      });
      
      console.log('User data retrieved successfully:');
      console.log(userResponse.data);
    }
  } catch (error) {
    console.log('ERROR: Login failed.');
    console.log('Status:', error.response?.status);
    console.log('Error message:', error.response?.data);
    
    // Additional debugging
    console.log('\nDetailed error info:');
    console.log('Headers sent:', error.config?.headers);
    console.log('Request data:', error.config?.data);
  }
}

testAuth();