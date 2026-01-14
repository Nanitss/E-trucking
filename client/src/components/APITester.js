// Create this as a temporary component to test your API
import React, { useState } from 'react';
import axios from 'axios';

const APITester = () => {
  const [results, setResults] = useState([]);
  
  const testEndpoint = async (url, method = 'GET', data = null) => {
    try {
      const response = await axios({
        method,
        url,
        data,
        baseURL: 'http://localhost:5007'
      });
      setResults(prev => [...prev, {
        url,
        status: response.status,
        data: response.data,
        success: true
      }]);
    } catch (error) {
      setResults(prev => [...prev, {
        url,
        status: error.response?.status || 'Error',
        error: error.message,
        success: false
      }]);
    }
  };
  
  return (
    <div style={{ padding: '20px' }}>
      <h1>API Tester</h1>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => testEndpoint('/')}>Test Base Route</button>
        <button onClick={() => testEndpoint('/api/clients/test')}>Test Client Test Route</button>
        <button onClick={() => testEndpoint('/api/clients/profile')}>Test Profile</button>
        <button onClick={() => testEndpoint('/api/clients/trucks')}>Test Trucks</button>
        <button onClick={() => testEndpoint('/api/clients/deliveries')}>Test Deliveries</button>
        <button onClick={() => testEndpoint('/api/clients/truck-rental', 'POST', {
          pickupLocation: 'San Juan',
          dropoffLocation: 'San Ildefonso',
          weight: '1',
          deliveryDate: '2025-03-05',
          deliveryTime: '11:50'
        })}>Test Truck Rental</button>
      </div>
      
      <div>
        <h2>Results:</h2>
        {results.map((result, index) => (
          <div key={index} style={{ 
            padding: '10px', 
            margin: '10px 0', 
            backgroundColor: result.success ? '#e8f5e9' : '#ffebee',
            border: `1px solid ${result.success ? '#4caf50' : '#f44336'}`
          }}>
            <h3>{result.url}</h3>
            <p>Status: {result.status}</p>
            {result.success ? (
              <pre>{JSON.stringify(result.data, null, 2)}</pre>
            ) : (
              <p style={{ color: 'red' }}>{result.error}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default APITester;