import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AuditTest = () => {
  const [auditData, setAuditData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // 1. Check all available audit events
  const fetchAllAudit = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await axios.get('/api/audit/debug');
      setAuditData(response.data);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching audit data:', err);
      setError('Failed to load audit data: ' + err.message);
      setIsLoading(false);
    }
  };
  
  // 2. Check specifically for logout events
  const fetchLogoutEvents = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await axios.get('/api/audit/debug/logout');
      setAuditData(response.data.events || []);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching logout events:', err);
      setError('Failed to load logout events: ' + err.message);
      setIsLoading(false);
    }
  };
  
  // 3. Try to force create a logout event
  const createManualLogoutEvent = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get current user from localStorage
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      
      if (!currentUser.id) {
        setError('No user found in localStorage');
        setIsLoading(false);
        return;
      }
      
      const token = localStorage.getItem('token');
      
      // Call the logout endpoint
      const response = await axios.post('/api/auth/logout', {}, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      setIsLoading(false);
      alert('Logout event created! Check logs for details.');
      
      // Refresh the logout events list
      fetchLogoutEvents();
      
    } catch (err) {
      console.error('Error creating logout event:', err);
      setError('Failed to create logout event: ' + err.message);
      setIsLoading(false);
    }
  };
  
  return (
    <div style={{ padding: '20px' }}>
      <h1>Audit Trail Diagnostic</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={fetchAllAudit}
          disabled={isLoading}
          style={{ marginRight: '10px', padding: '8px 16px' }}
        >
          Fetch All Audit Events
        </button>
        
        <button 
          onClick={fetchLogoutEvents}
          disabled={isLoading}
          style={{ marginRight: '10px', padding: '8px 16px' }}
        >
          Fetch Only Logout Events
        </button>
        
        <button 
          onClick={createManualLogoutEvent}
          disabled={isLoading}
          style={{ padding: '8px 16px', backgroundColor: '#f0ad4e', color: 'white', border: 'none' }}
        >
          Create Test Logout Event
        </button>
      </div>
      
      {isLoading && <p>Loading...</p>}
      
      {error && (
        <div style={{ backgroundColor: '#f8d7da', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      
      <div>
        <h2>Found {Array.isArray(auditData) ? auditData.length : 'Unknown'} Events</h2>
        
        {Array.isArray(auditData) && auditData.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Timestamp</th>
                <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>User</th>
                <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Action</th>
                <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {auditData.map((item, index) => (
                <tr key={index} style={{ backgroundColor: item.action === 'logout' ? '#d4edda' : 'white' }}>
                  <td style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>
                    {typeof item.timestamp === 'string' ? new Date(item.timestamp).toLocaleString() : 'Unknown'}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>
                    {item.username}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>
                    {item.action}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(item, null, 2)}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No audit data found.</p>
        )}
      </div>
    </div>
  );
};

export default AuditTest; 