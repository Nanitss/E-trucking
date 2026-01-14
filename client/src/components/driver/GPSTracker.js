import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import gpsTrackingService from '../../services/GPSTrackingService';
import './GPSTracker.css';

const GPSTracker = () => {
  const { authUser } = useContext(AuthContext);
  const [trackingStatus, setTrackingStatus] = useState({
    isTracking: false,
    isSupported: false,
    currentPosition: null,
    lastUpdateTime: null,
    queuedUpdates: 0,
    isOnline: navigator.onLine,
    updateFrequency: 30000
  });
  const [permissionStatus, setPermissionStatus] = useState('unknown');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    updatesSuccess: 0,
    updatesFailed: 0,
    updatesQueued: 0,
    sessionStartTime: null
  });

  useEffect(() => {
    // Initialize component
    initializeTracker();
    
    // Set up GPS service event listeners
    const handleTrackingStarted = (data) => {
      console.log('🚀 Tracking started:', data);
      updateTrackingStatus();
      setStats(prev => ({ ...prev, sessionStartTime: new Date() }));
    };

    const handleTrackingStopped = (data) => {
      console.log('🛑 Tracking stopped:', data);
      updateTrackingStatus();
      setStats(prev => ({ ...prev, sessionStartTime: null }));
    };

    const handlePositionUpdate = (position) => {
      console.log('📍 Position update:', position);
      updateTrackingStatus();
    };

    const handlePositionError = (error) => {
      console.error('❌ Position error:', error);
      setError(error.message);
    };

    const handleUpdateSent = (data) => {
      console.log('✅ Update sent:', data);
      setStats(prev => ({ ...prev, updatesSuccess: prev.updatesSuccess + 1 }));
      setError(null);
    };

    const handleUpdateFailed = (data) => {
      console.log('❌ Update failed:', data);
      setStats(prev => ({ ...prev, updatesFailed: prev.updatesFailed + 1 }));
      setError(data.error);
    };

    const handleUpdateQueued = (data) => {
      console.log('📝 Update queued:', data);
      setStats(prev => ({ ...prev, updatesQueued: prev.updatesQueued + 1 }));
    };

    const handleNetworkStatusChanged = (data) => {
      console.log('🌐 Network status changed:', data);
      updateTrackingStatus();
    };

    // Add event listeners
    gpsTrackingService.addEventListener('trackingStarted', handleTrackingStarted);
    gpsTrackingService.addEventListener('trackingStopped', handleTrackingStopped);
    gpsTrackingService.addEventListener('positionUpdate', handlePositionUpdate);
    gpsTrackingService.addEventListener('positionError', handlePositionError);
    gpsTrackingService.addEventListener('updateSent', handleUpdateSent);
    gpsTrackingService.addEventListener('updateFailed', handleUpdateFailed);
    gpsTrackingService.addEventListener('updateQueued', handleUpdateQueued);
    gpsTrackingService.addEventListener('networkStatusChanged', handleNetworkStatusChanged);

    // Cleanup on unmount
    return () => {
      gpsTrackingService.removeEventListener(handleTrackingStarted);
      gpsTrackingService.removeEventListener(handleTrackingStopped);
      gpsTrackingService.removeEventListener(handlePositionUpdate);
      gpsTrackingService.removeEventListener(handlePositionError);
      gpsTrackingService.removeEventListener(handleUpdateSent);
      gpsTrackingService.removeEventListener(handleUpdateFailed);
      gpsTrackingService.removeEventListener(handleUpdateQueued);
      gpsTrackingService.removeEventListener(handleNetworkStatusChanged);
    };
  }, []);

  const initializeTracker = async () => {
    try {
      setLoading(true);
      
      // Check if geolocation is supported
      if (!gpsTrackingService.constructor.isSupported()) {
        setError('GPS tracking is not supported on this device');
        setPermissionStatus('unsupported');
        return;
      }

      // Check permissions
      try {
        await gpsTrackingService.requestPermissions();
        setPermissionStatus('granted');
      } catch (permError) {
        setPermissionStatus('denied');
        setError(permError.message);
      }

      // Update initial status
      updateTrackingStatus();
      
    } catch (error) {
      console.error('❌ Error initializing GPS tracker:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateTrackingStatus = () => {
    const status = gpsTrackingService.getStatus();
    setTrackingStatus(status);
  };

  const handleStartTracking = async () => {
    try {
      setLoading(true);
      setError(null);

      await gpsTrackingService.startTracking({
        updateFrequency: trackingStatus.updateFrequency,
        trackingOptions: {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 30000
        }
      });

    } catch (error) {
      console.error('❌ Error starting tracking:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStopTracking = async () => {
    try {
      setLoading(true);
      setError(null);

      gpsTrackingService.stopTracking();

    } catch (error) {
      console.error('❌ Error stopping tracking:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFrequencyChange = (frequency) => {
    gpsTrackingService.setUpdateFrequency(frequency);
    updateTrackingStatus();
  };

  const handleGetCurrentLocation = async () => {
    try {
      setLoading(true);
      setError(null);

      const location = await gpsTrackingService.getCurrentLocation();
      console.log('📍 Current location:', location);

    } catch (error) {
      console.error('❌ Error getting current location:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCoordinate = (coord) => {
    return coord ? coord.toFixed(6) : 'N/A';
  };

  const formatTime = (timestamp) => {
    return timestamp ? new Date(timestamp).toLocaleTimeString() : 'Never';
  };

  const formatSessionDuration = () => {
    if (!stats.sessionStartTime) return 'Not active';
    const duration = Date.now() - new Date(stats.sessionStartTime).getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const getStatusColor = () => {
    if (!trackingStatus.isSupported) return 'red';
    if (permissionStatus === 'denied') return 'red';
    if (trackingStatus.isTracking) return 'green';
    return 'orange';
  };

  const getStatusText = () => {
    if (!trackingStatus.isSupported) return '❌ Not Supported';
    if (permissionStatus === 'denied') return '🚫 Permission Denied';
    if (trackingStatus.isTracking) return '🟢 Active';
    return '🟡 Inactive';
  };

  return (
    <div className="gps-tracker">
      <div className="gps-tracker-header">
        <h2>📍 GPS Tracking</h2>
        <div className={`status-indicator status-${getStatusColor()}`}>
          {getStatusText()}
        </div>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button 
            className="error-dismiss"
            onClick={() => setError(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Control Panel */}
      <div className="control-panel">
        <div className="control-buttons">
          {!trackingStatus.isTracking ? (
            <button
              className="btn btn-start"
              onClick={handleStartTracking}
              disabled={loading || permissionStatus !== 'granted'}
            >
              {loading ? '⏳ Starting...' : '🚀 Start Tracking'}
            </button>
          ) : (
            <button
              className="btn btn-stop"
              onClick={handleStopTracking}
              disabled={loading}
            >
              {loading ? '⏳ Stopping...' : '🛑 Stop Tracking'}
            </button>
          )}

          <button
            className="btn btn-locate"
            onClick={handleGetCurrentLocation}
            disabled={loading || permissionStatus !== 'granted'}
          >
            {loading ? '⏳ Locating...' : '🎯 Get Location'}
          </button>
        </div>

        {/* Update Frequency Control */}
        <div className="frequency-control">
          <label>Update Frequency:</label>
          <select
            value={trackingStatus.updateFrequency}
            onChange={(e) => handleUpdateFrequencyChange(parseInt(e.target.value))}
            disabled={loading}
          >
            <option value={10000}>10 seconds (High frequency)</option>
            <option value={30000}>30 seconds (Normal)</option>
            <option value={60000}>1 minute (Battery saver)</option>
            <option value={300000}>5 minutes (Low frequency)</option>
          </select>
        </div>
      </div>

      {/* Status Information */}
      <div className="status-grid">
        <div className="status-card">
          <h3>🌐 Connection</h3>
          <div className="status-value">
            {trackingStatus.isOnline ? '🟢 Online' : '🔴 Offline'}
          </div>
          {trackingStatus.queuedUpdates > 0 && (
            <div className="status-detail">
              {trackingStatus.queuedUpdates} updates queued
            </div>
          )}
        </div>

        <div className="status-card">
          <h3>📍 Location</h3>
          {trackingStatus.currentPosition ? (
            <div className="location-info">
              <div className="coordinates">
                <div>Lat: {formatCoordinate(trackingStatus.currentPosition.lat)}</div>
                <div>Lng: {formatCoordinate(trackingStatus.currentPosition.lng)}</div>
              </div>
              <div className="accuracy">
                Accuracy: ±{Math.round(trackingStatus.currentPosition.accuracy)}m
              </div>
              {trackingStatus.currentPosition.speed > 0 && (
                <div className="speed">
                  Speed: {Math.round(trackingStatus.currentPosition.speed * 3.6)} km/h
                </div>
              )}
            </div>
          ) : (
            <div className="status-value">No location data</div>
          )}
        </div>

        <div className="status-card">
          <h3>⏰ Last Update</h3>
          <div className="status-value">
            {formatTime(trackingStatus.lastUpdateTime)}
          </div>
        </div>

        <div className="status-card">
          <h3>📊 Session Stats</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Duration:</span>
              <span className="stat-value">{formatSessionDuration()}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Successful:</span>
              <span className="stat-value success">{stats.updatesSuccess}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Failed:</span>
              <span className="stat-value error">{stats.updatesFailed}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Queued:</span>
              <span className="stat-value warning">{stats.updatesQueued}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Driver Info */}
      <div className="driver-info">
        <h3>👤 Driver Information</h3>
        <div className="driver-details">
          <div>Name: {authUser?.username || 'Unknown'}</div>
          <div>Role: {authUser?.role || 'Unknown'}</div>
          <div>Device: {navigator.platform}</div>
          <div>Browser: {navigator.userAgent.split(' ')[0]}</div>
        </div>
      </div>

      {/* Permission Help */}
      {permissionStatus === 'denied' && (
        <div className="permission-help">
          <h3>🔧 Enable Location Permissions</h3>
          <ol>
            <li>Click the location icon in your browser's address bar</li>
            <li>Select "Allow" for location access</li>
            <li>Refresh this page</li>
            <li>Click "Start Tracking" again</li>
          </ol>
        </div>
      )}
    </div>
  );
};

export default GPSTracker; 