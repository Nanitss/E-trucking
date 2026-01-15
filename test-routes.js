// server/test-routes.js - Run this to test your routes
const axios = require('axios');

async function testRoutes() {
  const baseUrl = 'http://localhost:5007';
  
  console.log('Testing server routes...\n');
  
  // Test 1: Base health check
  try {
    const response = await axios.get(`${baseUrl}/`);
    console.log('✅ Base route working:', response.data);
  } catch (error) {
    console.log('❌ Base route failed:', error.message);
  }
  
  // Test 2: Client test route
  try {
    const response = await axios.get(`${baseUrl}/api/clients/test`);
    console.log('✅ Client test route working:', response.data);
  } catch (error) {
    console.log('❌ Client test route failed:', error.message);
  }
  
  // Test 3: Profile route
  try {
    const response = await axios.get(`${baseUrl}/api/clients/profile`);
    console.log('✅ Profile route working:', response.data);
  } catch (error) {
    console.log('❌ Profile route failed:', error.message);
  }
  
  // Test 4: Trucks route
  try {
    const response = await axios.get(`${baseUrl}/api/clients/trucks`);
    console.log('✅ Trucks route working:', response.data);
  } catch (error) {
    console.log('❌ Trucks route failed:', error.message);
  }
  
  // Test 5: Deliveries route
  try {
    const response = await axios.get(`${baseUrl}/api/clients/deliveries`);
    console.log('✅ Deliveries route working:', response.data);
  } catch (error) {
    console.log('❌ Deliveries route failed:', error.message);
  }
  
  // Test 6: Truck rental route
  try {
    const response = await axios.post(`${baseUrl}/api/clients/truck-rental`, {
      pickupLocation: 'San Juan',
      dropoffLocation: 'San Ildefonso',
      weight: '1',
      deliveryDate: '2025-03-05',
      deliveryTime: '11:50'
    });
    console.log('✅ Truck rental route working:', response.data);
  } catch (error) {
    console.log('❌ Truck rental route failed:', error.message);
  }
}

testRoutes().catch(console.error);