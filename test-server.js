// test-server.js - Simple test script to run from project root
const http = require('http');

const tests = [
  { name: 'Base route', path: '/' },
  { name: 'Debug routes', path: '/debug/routes' },
  { name: 'Client debug', path: '/api/clients-debug' },
  { name: 'Client base', path: '/api/clients' },
  { name: 'Profile', path: '/api/clients/profile' },
  { name: 'Trucks', path: '/api/clients/trucks' },
  { name: 'Deliveries', path: '/api/clients/deliveries' }
];

console.log('Testing API endpoints...\n');

async function runTests() {
  for (const test of tests) {
    try {
      const response = await makeRequest('GET', test.path);
      console.log(`✅ ${test.name} - Status: ${response.status}`);
    } catch (error) {
      console.log(`❌ ${test.name} - Error: ${error.message}`);
    }
  }
}

function makeRequest(method, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5007,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
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

runTests();