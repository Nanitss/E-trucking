// Create this file as: test-api.js in your project root directory

// Simple API tester to run from project root
const http = require('http');

const tests = [
  { name: 'Base route', path: '/' },
  { name: 'Debug routes', path: '/debug/routes' },
  { name: 'Client base', path: '/api/clients' },
  { name: 'Client test', path: '/api/clients/test' },
  { name: 'Profile', path: '/api/clients/profile' },
  { name: 'Trucks', path: '/api/clients/trucks' },
  { name: 'Deliveries', path: '/api/clients/deliveries' }
];

console.log('Testing API endpoints...\n');

async function testEndpoint(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5007,
      path: path,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({ status: res.statusCode, data: data });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function runTests() {
  for (const test of tests) {
    try {
      const result = await testEndpoint(test.path);
      console.log(`✅ ${test.name} - Status: ${result.status}`);
      console.log(`   Data: ${result.data.slice(0, 100)}...\n`);
    } catch (error) {
      console.log(`❌ ${test.name} - Error: ${error.message}\n`);
    }
  }
}

runTests();