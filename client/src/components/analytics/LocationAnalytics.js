import React, { useState, useEffect } from 'react';
import { 
  FaChartBar, 
  FaMapMarkerAlt, 
  FaClock, 
  FaEye, 
  FaStar,
  FaTrophy,
  FaLightbulb,
  FaArrowUp,
  FaArrowDown,
  FaBuilding,
  FaHome,
  FaStore,
  FaIndustry
} from 'react-icons/fa';
import './LocationAnalytics.css';

const LocationAnalytics = ({ onClose }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // Get user's current location for nearby suggestions
      let userCoordinates = null;
      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              enableHighAccuracy: false
            });
          });
          userCoordinates = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
        } catch (geoError) {
          console.log('Geolocation not available:', geoError);
        }
      }

      const token = localStorage.getItem('token');
      const url = userCoordinates 
        ? `/api/client/pinned-locations/analytics?lat=${userCoordinates.lat}&lng=${userCoordinates.lng}`
        : '/api/client/pinned-locations/analytics';

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      } else {
        throw new Error('Failed to load analytics');
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      business: FaBuilding,
      residential: FaHome,
      commercial: FaStore,
      industrial: FaIndustry
    };
    return icons[category] || FaMapMarkerAlt;
  };

  const getCategoryColor = (category) => {
    const colors = {
      business: '#3b82f6',
      residential: '#10b981',
      commercial: '#f59e0b',
      industrial: '#ef4444'
    };
    return colors[category] || '#6b7280';
  };

  if (loading) {
    return (
      <div className="analytics-modal-overlay">
        <div className="analytics-modal">
          <div className="analytics-loading">
            <div className="loading-spinner"></div>
            <p>Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-modal-overlay">
        <div className="analytics-modal">
          <div className="analytics-error">
            <h3>Error Loading Analytics</h3>
            <p>{error}</p>
            <button onClick={onClose} className="btn-secondary">Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-modal-overlay" onClick={onClose}>
      <div className="analytics-modal" onClick={(e) => e.stopPropagation()}>
        <div className="analytics-header">
          <div className="analytics-title">
            <FaChartBar className="title-icon" />
            <h2>Location Analytics</h2>
          </div>
          <button className="analytics-close" onClick={onClose}>×</button>
        </div>

        <div className="analytics-content">
          {/* Overview Stats */}
          <div className="analytics-section">
            <h3>Overview</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">
                  <FaMapMarkerAlt />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{analytics.analytics.totalLocations}</div>
                  <div className="stat-label">Total Locations</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">
                  <FaEye />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{analytics.analytics.totalUsage}</div>
                  <div className="stat-label">Total Usage</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">
                  <FaChartBar />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{Math.round(analytics.analytics.averageUsage * 10) / 10}</div>
                  <div className="stat-label">Average Usage</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">
                  <FaStar />
                </div>
                <div className="stat-content">
                  <div className="stat-value">
                    {analytics.analytics.defaultLocation ? 1 : 0}
                  </div>
                  <div className="stat-label">Default Location</div>
                </div>
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="analytics-section">
            <h3>Category Breakdown</h3>
            <div className="category-breakdown">
              {Object.entries(analytics.analytics.categoryCounts).map(([category, count]) => {
                const IconComponent = getCategoryIcon(category);
                const color = getCategoryColor(category);
                const percentage = analytics.analytics.totalLocations > 0 
                  ? Math.round((count / analytics.analytics.totalLocations) * 100) 
                  : 0;

                return (
                  <div key={category} className="category-item">
                    <div className="category-info">
                      <IconComponent style={{ color }} />
                      <span className="category-name">
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </span>
                    </div>
                    <div className="category-stats">
                      <span className="category-count">{count}</span>
                      <span className="category-percentage">({percentage}%)</span>
                    </div>
                    <div className="category-bar">
                      <div 
                        className="category-fill" 
                        style={{ width: `${percentage}%`, backgroundColor: color }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Performers */}
          {(analytics.analytics.mostUsed || analytics.suggestions.frequent.length > 0) && (
            <div className="analytics-section">
              <h3>Top Performers</h3>
              <div className="performers-grid">
                {analytics.analytics.mostUsed && (
                  <div className="performer-card most-used">
                    <div className="performer-header">
                      <FaTrophy className="performer-icon" />
                      <span>Most Used Location</span>
                    </div>
                    <div className="performer-content">
                      <div className="performer-name">{analytics.analytics.mostUsed.name}</div>
                      <div className="performer-stat">
                        {analytics.analytics.mostUsed.usageCount} times used
                      </div>
                      <div className="performer-address">{analytics.analytics.mostUsed.address}</div>
                    </div>
                  </div>
                )}

                {analytics.suggestions.recent.length > 0 && (
                  <div className="performer-card recently-used">
                    <div className="performer-header">
                      <FaClock className="performer-icon" />
                      <span>Recently Active</span>
                    </div>
                    <div className="performer-content">
                      <div className="recent-locations">
                        {analytics.suggestions.recent.slice(0, 3).map((location, index) => (
                          <div key={location.id} className="recent-location">
                            <span className="recent-rank">#{index + 1}</span>
                            <span className="recent-name">{location.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Smart Suggestions */}
          {analytics.suggestions.recommended.length > 0 && (
            <div className="analytics-section">
              <h3>Smart Recommendations</h3>
              <div className="recommendations">
                {analytics.suggestions.recommended.map((recommendation, index) => (
                  <div key={index} className={`recommendation ${recommendation.priority}`}>
                    <div className="recommendation-header">
                      <FaLightbulb className="recommendation-icon" />
                      <span className="recommendation-title">{recommendation.title}</span>
                      <span className={`priority-badge ${recommendation.priority}`}>
                        {recommendation.priority}
                      </span>
                    </div>
                    <div className="recommendation-description">
                      {recommendation.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nearby Locations */}
          {analytics.suggestions.nearby.length > 0 && (
            <div className="analytics-section">
              <h3>Nearby Locations</h3>
              <div className="nearby-locations">
                {analytics.suggestions.nearby.map((location) => (
                  <div key={location.id} className="nearby-location">
                    <div className="location-info">
                      <FaMapMarkerAlt className="location-icon" />
                      <div className="location-details">
                        <div className="location-name">{location.name}</div>
                        <div className="location-distance">
                          {location.distance}km away
                        </div>
                      </div>
                    </div>
                    <div className="location-usage">
                      {location.usageCount || 0} uses
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="analytics-section">
            <h3>Quick Actions</h3>
            <div className="quick-actions">
              <button 
                className="action-btn primary"
                onClick={() => {
                  onClose();
                  // Navigate to add location
                  window.dispatchEvent(new CustomEvent('openAddLocationModal'));
                }}
              >
                <FaMapMarkerAlt />
                Add New Location
              </button>
              
              {!analytics.analytics.defaultLocation && analytics.analytics.totalLocations > 0 && (
                <button 
                  className="action-btn secondary"
                  onClick={() => {
                    onClose();
                    // Navigate to locations page
                    window.location.href = '/client/locations';
                  }}
                >
                  <FaStar />
                  Set Default Location
                </button>
              )}

              <button 
                className="action-btn secondary"
                onClick={() => {
                  onClose();
                  window.location.href = '/client/locations';
                }}
              >
                <FaEye />
                View All Locations
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationAnalytics;
