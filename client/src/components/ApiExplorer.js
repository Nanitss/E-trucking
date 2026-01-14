import React, { useState } from 'react';
import axios from 'axios';

const ApiExplorer = () => {
  const [endpoint, setEndpoint] = useState('/auth/login');
  const [method, setMethod] = useState('POST');
  const [requestBody, setRequestBody] = useState(JSON.stringify({
    username: '',
    password: ''
  }, null, 2));
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);

  // Common API endpoint patterns to try
  const commonEndpoints = [
    '/auth/login',
    '/api/auth/login',
    '/login',
    '/users/login',
    '/api/users/login',
    '/auth/signin',
    '/api/auth/signin'
  ];

  const testEndpoint = async () => {
    setLoading(true);
    setResponse(null);
    setError(null);
    
    try {
      // Parse the request body
      const body = JSON.parse(requestBody);
      
      let result;
      switch (method) {
        case 'GET':
          result = await axios.get(endpoint);
          break;
        case 'POST':
          result = await axios.post(endpoint, body);
          break;
        case 'PUT':
          result = await axios.put(endpoint, body);
          break;
        case 'DELETE':
          result = await axios.delete(endpoint);
          break;
        default:
          result = await axios.post(endpoint, body);
      }
      
      setResponse({
        status: result.status,
        statusText: result.statusText,
        data: result.data,
        headers: result.headers
      });
    } catch (err) {
      setError({
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data
      });
    } finally {
      setLoading(false);
    }
  };
  
  const testAllEndpoints = async () => {
    setLoading(true);
    setResponse(null);
    setError(null);
    
    const results = {};
    
    for (const ep of commonEndpoints) {
      try {
        const body = JSON.parse(requestBody);
        const result = await axios.post(ep, body);
        
        results[ep] = {
          success: true,
          status: result.status,
          data: result.data
        };
      } catch (err) {
        results[ep] = {
          success: false,
          status: err.response?.status,
          error: err.message,
          data: err.response?.data
        };
      }
    }
    
    setResponse(results);
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '900px', margin: '20px auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>API Endpoint Explorer</h2>
      <p>Use this tool to discover and test your backend API endpoints.</p>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <div style={{ flex: '3' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Endpoint</label>
          <input
            type="text"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ flex: '1' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Request Body (JSON)</label>
        <textarea
          value={requestBody}
          onChange={(e) => setRequestBody(e.target.value)}
          style={{ width: '100%', height: '120px', padding: '8px', boxSizing: 'border-box', fontFamily: 'monospace' }}
        />
      </div>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={testEndpoint}
          disabled={loading}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#4CAF50', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: loading ? 'wait' : 'pointer' 
          }}
        >
          {loading ? 'Testing...' : 'Test Endpoint'}
        </button>
        
        <button
          onClick={testAllEndpoints}
          disabled={loading}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#2196F3', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: loading ? 'wait' : 'pointer' 
          }}
        >
          {loading ? 'Testing All...' : 'Try Common Endpoints'}
        </button>
      </div>
      
      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={{ flex: '1' }}>
          <h3>Common API Patterns</h3>
          <ul style={{ padding: '0 0 0 20px' }}>
            {commonEndpoints.map((ep, index) => (
              <li key={index} style={{ marginBottom: '5px' }}>
                <button
                  onClick={() => setEndpoint(ep)}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: '#2196F3', 
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  {ep}
                </button>
              </li>
            ))}
          </ul>
        </div>
        
        <div style={{ flex: '1' }}>
          <h3>Sample Body Templates</h3>
          <ul style={{ padding: '0 0 0 20px' }}>
            <li style={{ marginBottom: '5px' }}>
              <button
                onClick={() => setRequestBody(JSON.stringify({ username: '', password: '' }, null, 2))}
                style={{ background: 'none', border: 'none', color: '#2196F3', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Basic Auth
              </button>
            </li>
            <li style={{ marginBottom: '5px' }}>
              <button
                onClick={() => setRequestBody(JSON.stringify({ email: '', password: '' }, null, 2))}
                style={{ background: 'none', border: 'none', color: '#2196F3', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Email Auth
              </button>
            </li>
            <li style={{ marginBottom: '5px' }}>
              <button
                onClick={() => setRequestBody(JSON.stringify({ user: '', pass: '' }, null, 2))}
                style={{ background: 'none', border: 'none', color: '#2196F3', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Simple Auth
              </button>
            </li>
          </ul>
        </div>
      </div>
      
      {error && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#ffebee', borderRadius: '4px' }}>
          <h3>Error Response</h3>
          <pre style={{ 
            whiteSpace: 'pre-wrap', 
            wordBreak: 'break-word',
            backgroundColor: '#f8f8f8',
            padding: '10px',
            borderRadius: '4px'
          }}>
            {JSON.stringify(error, null, 2)}
          </pre>
        </div>
      )}
      
      {response && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>
          <h3>Response</h3>
          <pre style={{ 
            whiteSpace: 'pre-wrap', 
            wordBreak: 'break-word',
            backgroundColor: '#f8f8f8',
            padding: '10px',
            borderRadius: '4px'
          }}>
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ApiExplorer;