import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import GPSTracker from '../../components/driver/GPSTracker';
import gpsTrackingService from '../../services/GPSTrackingService';
import axios from 'axios';
import './DriverDashboard.css';

const DriverDashboard = () => {
  const { authUser, logout } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('overview');
  const [driverInfo, setDriverInfo] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [truckInfo, setTruckInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gpsStatus, setGpsStatus] = useState({
    isTracking: false,
    currentPosition: null,
    lastUpdate: null
  });

  useEffect(() => {
    fetchDriverData();
    initializeGpsListener();
  }, []);

  const fetchDriverData = async () => {
    try {
      setLoading(true);
      
      // Fetch driver profile info
      try {
        const driverResponse = await axios.get('/api/drivers/profile');
        setDriverInfo(driverResponse.data);
      } catch (error) {
        console.error('Error fetching driver info:', error);
      }

      // Fetch assigned deliveries
      try {
        const deliveriesResponse = await axios.get('/api/drivers/deliveries');
        setDeliveries(deliveriesResponse.data.deliveries || []);
      } catch (error) {
        console.error('Error fetching deliveries:', error);
      }

      // Fetch truck information
      try {
        const truckResponse = await axios.get('/api/drivers/truck');
        setTruckInfo(truckResponse.data);
      } catch (error) {
        console.error('Error fetching truck info:', error);
      }

    } catch (error) {
      console.error('Error fetching driver data:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeGpsListener = () => {
    // Listen for GPS status updates
    const handlePositionUpdate = (position) => {
      setGpsStatus(prev => ({
        ...prev,
        currentPosition: position,
        lastUpdate: new Date()
      }));
    };

    const handleTrackingStarted = () => {
      setGpsStatus(prev => ({ ...prev, isTracking: true }));
    };

    const handleTrackingStopped = () => {
      setGpsStatus(prev => ({ ...prev, isTracking: false }));
    };

    gpsTrackingService.addEventListener('positionUpdate', handlePositionUpdate);
    gpsTrackingService.addEventListener('trackingStarted', handleTrackingStarted);
    gpsTrackingService.addEventListener('trackingStopped', handleTrackingStopped);

    // Update initial status
    const status = gpsTrackingService.getStatus();
    setGpsStatus({
      isTracking: status.isTracking,
      currentPosition: status.currentPosition,
      lastUpdate: status.lastUpdateTime ? new Date(status.lastUpdateTime) : null
    });

    return () => {
      gpsTrackingService.removeEventListener(handlePositionUpdate);
      gpsTrackingService.removeEventListener(handleTrackingStarted);
      gpsTrackingService.removeEventListener(handleTrackingStopped);
    };
  };

  const handleLogout = () => {
    // Stop GPS tracking before logout
    if (gpsStatus.isTracking) {
      gpsTrackingService.stopTracking();
    }
    logout();
  };

  const formatTime = (date) => {
    return date ? date.toLocaleTimeString() : 'Never';
  };

  const getDeliveryStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return '#f59e0b';
      case 'in-progress': case 'started': return '#3b82f6';
      case 'picked-up': return '#8b5cf6';
      case 'completed': return '#10b981';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div className="driver-dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading driver dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="driver-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="driver-info-header">
            <div className="driver-avatar">
              {authUser?.username?.charAt(0).toUpperCase() || 'D'}
            </div>
            <div className="driver-details">
              <h1>Welcome, {driverInfo?.DriverName || authUser?.username || 'Driver'}!</h1>
              <p className="driver-role">Driver Dashboard</p>
              <div className="status-indicators">
                <div className={`status-badge ${gpsStatus.isTracking ? 'active' : 'inactive'}`}>
                  📍 GPS: {gpsStatus.isTracking ? 'Active' : 'Inactive'}
                </div>
                {truckInfo && (
                  <div className="status-badge active">
                    🚛 Truck: {truckInfo.truckPlate}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="header-actions">
            <button 
              className="btn btn-logout"
              onClick={handleLogout}
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="dashboard-nav">
        <button 
          className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button 
          className={`nav-tab ${activeTab === 'gps' ? 'active' : ''}`}
          onClick={() => setActiveTab('gps')}
        >
          📍 GPS Tracking
        </button>
        <button 
          className={`nav-tab ${activeTab === 'deliveries' ? 'active' : ''}`}
          onClick={() => setActiveTab('deliveries')}
        >
          📦 My Deliveries
        </button>
        <button 
          className={`nav-tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          👤 Profile
        </button>
      </div>

      {/* Tab Content */}
      <div className="dashboard-content">
        {activeTab === 'overview' && (
          <div className="overview-section">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon delivery">📦</div>
                <div className="stat-details">
                  <h3>{deliveries.length}</h3>
                  <p>Assigned Deliveries</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon active">🚀</div>
                <div className="stat-details">
                  <h3>{deliveries.filter(d => d.status === 'in-progress').length}</h3>
                  <p>Active Deliveries</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon completed">✅</div>
                <div className="stat-details">
                  <h3>{deliveries.filter(d => d.status === 'completed').length}</h3>
                  <p>Completed Today</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon gps">📍</div>
                <div className="stat-details">
                  <h3>{gpsStatus.isTracking ? 'ON' : 'OFF'}</h3>
                  <p>GPS Status</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
              <h3>Quick Actions</h3>
              <div className="actions-grid">
                <button 
                  className="action-btn"
                  onClick={() => setActiveTab('gps')}
                >
                  <span className="action-icon">📍</span>
                  <span>GPS Tracking</span>
                </button>
                <button 
                  className="action-btn"
                  onClick={() => setActiveTab('deliveries')}
                >
                  <span className="action-icon">📦</span>
                  <span>View Deliveries</span>
                </button>
                <button 
                  className="action-btn"
                  onClick={() => window.open('tel:911', '_blank')}
                >
                  <span className="action-icon">🆘</span>
                  <span>Emergency</span>
                </button>
                <button 
                  className="action-btn"
                  onClick={() => setActiveTab('profile')}
                >
                  <span className="action-icon">👤</span>
                  <span>My Profile</span>
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="recent-activity">
              <h3>Recent Activity</h3>
              <div className="activity-list">
                {gpsStatus.lastUpdate && (
                  <div className="activity-item">
                    <div className="activity-icon">📍</div>
                    <div className="activity-details">
                      <p>Last GPS update: {formatTime(gpsStatus.lastUpdate)}</p>
                    </div>
                  </div>
                )}
                {deliveries.slice(0, 3).map((delivery, index) => (
                  <div key={index} className="activity-item">
                    <div className="activity-icon">📦</div>
                    <div className="activity-details">
                      <p>Delivery #{delivery.id} - {delivery.status}</p>
                      <small>{delivery.destination}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'gps' && (
          <div className="gps-section">
            <GPSTracker />
          </div>
        )}

        {activeTab === 'deliveries' && (
          <div className="deliveries-section">
            <div className="section-header">
              <h2>📦 My Deliveries</h2>
              <p>Manage your assigned deliveries</p>
            </div>
            
            {deliveries.length > 0 ? (
              <div className="deliveries-grid">
                {deliveries.map((delivery, index) => (
                  <div key={index} className="delivery-card">
                    <div className="delivery-header">
                      <h4>Delivery #{delivery.id}</h4>
                      <div 
                        className="status-badge"
                        style={{ backgroundColor: getDeliveryStatusColor(delivery.status) }}
                      >
                        {delivery.status}
                      </div>
                    </div>
                    <div className="delivery-details">
                      <div className="detail-row">
                        <span>📍 From:</span>
                        <span>{delivery.pickup}</span>
                      </div>
                      <div className="detail-row">
                        <span>🎯 To:</span>
                        <span>{delivery.destination}</span>
                      </div>
                      <div className="detail-row">
                        <span>📅 Date:</span>
                        <span>{delivery.date}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📦</div>
                <h3>No Deliveries Assigned</h3>
                <p>You don't have any deliveries assigned at the moment.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="profile-section">
            <div className="section-header">
              <h2>👤 Driver Profile</h2>
              <p>Your profile information</p>
            </div>
            
            <div className="profile-cards">
              <div className="profile-card">
                <h3>Personal Information</h3>
                <div className="profile-details">
                  <div className="detail-row">
                    <span>Name:</span>
                    <span>{driverInfo?.DriverName || 'Not specified'}</span>
                  </div>
                  <div className="detail-row">
                    <span>Username:</span>
                    <span>{authUser?.username || 'Not specified'}</span>
                  </div>
                  <div className="detail-row">
                    <span>Phone:</span>
                    <span>{driverInfo?.DriverNumber || 'Not specified'}</span>
                  </div>
                  <div className="detail-row">
                    <span>Address:</span>
                    <span>{driverInfo?.DriverAddress || 'Not specified'}</span>
                  </div>
                </div>
              </div>

              {truckInfo && (
                <div className="profile-card">
                  <h3>Assigned Truck</h3>
                  <div className="profile-details">
                    <div className="detail-row">
                      <span>Truck Plate:</span>
                      <span>{truckInfo.truckPlate}</span>
                    </div>
                    <div className="detail-row">
                      <span>Truck Type:</span>
                      <span>{truckInfo.truckType}</span>
                    </div>
                    <div className="detail-row">
                      <span>Status:</span>
                      <span>{truckInfo.status}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverDashboard; 