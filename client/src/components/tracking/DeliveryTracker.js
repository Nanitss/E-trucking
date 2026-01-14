import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './DeliveryTracker.css';

const DeliveryTracker = ({ deliveryId, onClose }) => {
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRealTime, setIsRealTime] = useState(false);
  const intervalRef = useRef(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});

  // Fetch tracking data
  const fetchTrackingData = async () => {
    try {
      const response = await axios.get(`/api/tracking/delivery/${deliveryId}`);
      if (response.data.success) {
        setTrackingData(response.data.data);
        updateMap(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching tracking data:', err);
      setError('Failed to load tracking data');
    } finally {
      setLoading(false);
    }
  };

  // Initialize map
  const initializeMap = (data) => {
    if (!window.google || !mapRef.current) return;

    const map = new window.google.maps.Map(mapRef.current, {
      zoom: 13,
      center: data.currentLocation || data.pickupCoordinates || { lat: 14.5995, lng: 120.9842 },
      mapTypeId: 'roadmap'
    });

    mapInstanceRef.current = map;
    updateMap(data);
  };

  // Update map with tracking data
  const updateMap = (data) => {
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    // Clear existing markers
    Object.values(markersRef.current).forEach(marker => marker.setMap(null));
    markersRef.current = {};

    // Add pickup marker
    if (data.pickupCoordinates) {
      markersRef.current.pickup = new window.google.maps.Marker({
        position: data.pickupCoordinates,
        map: map,
        title: 'Pickup Location',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="18" fill="#10b981" stroke="white" stroke-width="2"/>
              <text x="20" y="26" text-anchor="middle" fill="white" font-size="16" font-weight="bold">P</text>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(40, 40)
        }
      });

      // Add pickup info window
      const pickupInfoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 10px;">
            <h4 style="margin: 0 0 5px 0; color: #10b981;">📍 Pickup Location</h4>
            <p style="margin: 0; font-size: 14px;">${data.pickupLocation}</p>
          </div>
        `
      });

      markersRef.current.pickup.addListener('click', () => {
        pickupInfoWindow.open(map, markersRef.current.pickup);
      });
    }

    // Add dropoff marker
    if (data.dropoffCoordinates) {
      markersRef.current.dropoff = new window.google.maps.Marker({
        position: data.dropoffCoordinates,
        map: map,
        title: 'Delivery Location',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="18" fill="#ef4444" stroke="white" stroke-width="2"/>
              <text x="20" y="26" text-anchor="middle" fill="white" font-size="16" font-weight="bold">D</text>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(40, 40)
        }
      });

      // Add dropoff info window
      const dropoffInfoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 10px;">
            <h4 style="margin: 0 0 5px 0; color: #ef4444;">🎯 Delivery Location</h4>
            <p style="margin: 0; font-size: 14px;">${data.deliveryAddress}</p>
          </div>
        `
      });

      markersRef.current.dropoff.addListener('click', () => {
        dropoffInfoWindow.open(map, markersRef.current.dropoff);
      });
    }

    // Add current truck location marker
    if (data.currentLocation) {
      markersRef.current.truck = new window.google.maps.Marker({
        position: data.currentLocation,
        map: map,
        title: `Truck ${data.truckPlate}`,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
              <circle cx="25" cy="25" r="23" fill="#3b82f6" stroke="white" stroke-width="2"/>
              <text x="25" y="30" text-anchor="middle" fill="white" font-size="20" font-weight="bold">🚛</text>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(50, 50)
        }
      });

      // Add truck info window
      const truckInfoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 10px;">
            <h4 style="margin: 0 0 5px 0; color: #3b82f6;">🚛 ${data.truckPlate}</h4>
            <p style="margin: 0; font-size: 14px;"><strong>Driver:</strong> ${data.driverName}</p>
            <p style="margin: 0; font-size: 14px;"><strong>Speed:</strong> ${data.currentSpeed} km/h</p>
            <p style="margin: 0; font-size: 14px;"><strong>Status:</strong> ${data.isActive ? '🟢 Active' : '🔴 Inactive'}</p>
            <p style="margin: 0; font-size: 14px;"><strong>GPS:</strong> ${data.hasGpsFix ? '🛰️ Fixed' : '❌ No Fix'}</p>
            <p style="margin: 0; font-size: 12px; color: #666;">Last update: ${new Date(data.lastGpsUpdate).toLocaleTimeString()}</p>
          </div>
        `
      });

      markersRef.current.truck.addListener('click', () => {
        truckInfoWindow.open(map, markersRef.current.truck);
      });

      // Center map on truck location
      map.setCenter(data.currentLocation);
    }

    // Draw route if we have pickup and dropoff coordinates
    if (data.pickupCoordinates && data.dropoffCoordinates) {
      const directionsService = new window.google.maps.DirectionsService();
      const directionsRenderer = new window.google.maps.DirectionsRenderer({
        suppressMarkers: true, // We're using custom markers
        polylineOptions: {
          strokeColor: '#3b82f6',
          strokeWeight: 4,
          strokeOpacity: 0.8
        }
      });

      directionsRenderer.setMap(map);

      directionsService.route({
        origin: data.pickupCoordinates,
        destination: data.dropoffCoordinates,
        travelMode: window.google.maps.TravelMode.DRIVING
      }, (result, status) => {
        if (status === 'OK') {
          directionsRenderer.setDirections(result);
        }
      });
    }
  };

  // Toggle real-time tracking
  const toggleRealTime = () => {
    if (isRealTime) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsRealTime(false);
    } else {
      intervalRef.current = setInterval(fetchTrackingData, 10000);
      setIsRealTime(true);
    }
  };

  // Format delivery status
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return '#f59e0b';
      case 'in-progress': case 'started': return '#3b82f6';
      case 'picked-up': return '#8b5cf6';
      case 'completed': return '#10b981';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  // Format time
  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  useEffect(() => {
    fetchTrackingData();

    // Load Google Maps if not already loaded
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&libraries=geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (trackingData) {
          initializeMap(trackingData);
        }
      };
      document.head.appendChild(script);
    } else if (trackingData) {
      initializeMap(trackingData);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [deliveryId]);

  useEffect(() => {
    if (trackingData && window.google) {
      initializeMap(trackingData);
    }
  }, [trackingData]);

  if (loading) {
    return (
      <div className="delivery-tracker">
        <div className="tracker-header">
          <h3>🚛 Loading Tracking Data...</h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="delivery-tracker">
        <div className="tracker-header">
          <h3>❌ {error}</h3>
          <button onClick={fetchTrackingData} className="retry-btn">Retry</button>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
      </div>
    );
  }

  return (
    <div className="delivery-tracker">
      <div className="tracker-header">
        <h3>🚛 Delivery Tracking - {trackingData.deliveryId}</h3>
        <div className="header-controls">
          <button 
            onClick={toggleRealTime} 
            className={`realtime-btn ${isRealTime ? 'active' : ''}`}
          >
            {isRealTime ? '⏸️ Stop Live' : '▶️ Start Live'}
          </button>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
      </div>

      <div className="tracker-content">
        {/* Status Panel */}
        <div className="status-panel">
          <div className="status-item">
            <span className="status-label">Status:</span>
            <span 
              className="status-value"
              style={{ color: getStatusColor(trackingData.deliveryStatus) }}
            >
              {trackingData.deliveryStatus?.toUpperCase()}
            </span>
          </div>
          
          <div className="status-item">
            <span className="status-label">Truck:</span>
            <span className="status-value">{trackingData.truckPlate}</span>
          </div>
          
          <div className="status-item">
            <span className="status-label">Driver:</span>
            <span className="status-value">{trackingData.driverName}</span>
          </div>
          
          {trackingData.currentLocation && (
            <>
              <div className="status-item">
                <span className="status-label">Speed:</span>
                <span className="status-value">
                  {trackingData.currentSpeed} km/h
                  {trackingData.isOverSpeed && <span className="warning"> ⚠️ SPEEDING</span>}
                </span>
              </div>
              
              <div className="status-item">
                <span className="status-label">GPS Status:</span>
                <span className="status-value">
                  {trackingData.isActive ? '🟢 Active' : '🔴 Inactive'}
                  {trackingData.hasGpsFix ? ' 🛰️ Fixed' : ' ❌ No Fix'}
                </span>
              </div>
              
              <div className="status-item">
                <span className="status-label">Last Update:</span>
                <span className="status-value">
                  {formatTime(trackingData.lastGpsUpdate)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Map */}
        <div className="map-container">
          <div ref={mapRef} className="map"></div>
          {!trackingData.currentLocation && (
            <div className="map-overlay">
              <p>📍 Real-time GPS tracking not available for this truck</p>
              <p>This truck ({trackingData.truckPlate}) does not have GPS tracking enabled</p>
            </div>
          )}
        </div>

        {/* Route Info */}
        <div className="route-info">
          <div className="route-item">
            <div className="route-point pickup">
              <span className="route-icon">📍</span>
              <div>
                <strong>Pickup:</strong>
                <p>{trackingData.pickupLocation}</p>
              </div>
            </div>
          </div>
          
          <div className="route-item">
            <div className="route-point dropoff">
              <span className="route-icon">🎯</span>
              <div>
                <strong>Delivery:</strong>
                <p>{trackingData.deliveryAddress}</p>
              </div>
            </div>
          </div>
          
          {trackingData.deliveryDistance && (
            <div className="route-stats">
              <span>📏 Distance: {trackingData.deliveryDistance} km</span>
              {trackingData.estimatedDuration && (
                <span>⏱️ Est. Duration: {trackingData.estimatedDuration} min</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeliveryTracker; 