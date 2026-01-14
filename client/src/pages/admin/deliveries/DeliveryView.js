import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { FaArrowLeft, FaPrint, FaRoute, FaMapMarkerAlt } from 'react-icons/fa';
import Loader from '../../../components/common/Loader';
// Using ProtectedRoute with header navigation
import { AlertContext } from '../../../context/AlertContext';
import StatusBadge from '../../../components/common/StatusBadge';
import { formatCurrency, formatDistance } from '../../../utils/formatUtils';
import { formatDateLocale } from '../../../utils/dateUtils';
import RouteMap from '../../../components/maps/RouteMap';
import './DeliveryView.css';

const DeliveryView = ({ currentUser }) => {
  const { id } = useParams();
  const { showAlert } = useContext(AlertContext);
  const [delivery, setDelivery] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRouteMap, setShowRouteMap] = useState(false);

  useEffect(() => {
    fetchDelivery();
  }, []);

  // Debug: Log delivery data to see available fields
  useEffect(() => {
    if (delivery) {
      console.log('Delivery data:', delivery);
      console.log('Available address fields:', {
        PickupLocation: delivery.PickupLocation,
        pickup_location: delivery.pickup_location,
        DeliveryAddress: delivery.DeliveryAddress,
        delivery_address: delivery.delivery_address,
        dropoff_location: delivery.dropoff_location
      });
    }
  }, [delivery]);

  const fetchDelivery = async () => {
    try {
      const res = await axios.get(`/api/deliveries/${id}`);
      setDelivery(res.data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching delivery details:', error);
      showAlert('Error loading delivery details', 'danger');
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const toggleRouteMap = () => {
    setShowRouteMap(!showRouteMap);
  };

  // Helper function to safely format dates
  const formatSafeDate = (dateValue) => {
    if (!dateValue) return 'Not available';
    
    try {
      // Handle different date formats
      let date;
      if (typeof dateValue === 'string') {
        date = new Date(dateValue);
      } else if (dateValue.toDate && typeof dateValue.toDate === 'function') {
        // Firestore timestamp
        date = dateValue.toDate();
      } else {
        date = new Date(dateValue);
      }
      
      if (isNaN(date.getTime())) {
        return 'Invalid date format';
      }
      
      return formatDateLocale(date);
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Date formatting error';
    }
  };

  // Calculate total amount properly - use existing total if available, otherwise calculate
  const calculateTotalAmount = () => {
    // First, check if there's already a calculated total amount in the delivery data
    if (delivery.TotalAmount && delivery.TotalAmount > 0) {
      return delivery.TotalAmount;
    }
    
    // If no total amount, check for delivery rate (which might be the total)
    if (delivery.DeliveryRate && delivery.DeliveryRate > 0) {
      // If delivery rate seems like a total amount (not per km), use it
      if (delivery.DeliveryRate > 1000) {
        return delivery.DeliveryRate;
      }
    }
    
    // Last resort: calculate from distance and rate
    const distance = delivery.DeliveryDistance || 0;
    const rate = delivery.DeliveryRate || 0;
    return distance * rate;
  };

  if (isLoading) {
    return <Loader />;
  }

  if (!delivery) {
    return (
      <div className="delivery-view-container">
        <div className="delivery-view-card">
            <div className="delivery-view-header">
              <h2>Delivery Not Found</h2>
              <Link to="/admin/deliveries" className="btn btn-secondary btn-sm">
                <FaArrowLeft /> Back to List
              </Link>
            </div>
            <div className="delivery-view-body">
              <p>The requested delivery could not be found.</p>
            </div>
          </div>
        </div>
    );
  }

  // Check if we have coordinates for route display (check lowercase first, then uppercase for old records)
  const hasRouteData = (delivery.pickupCoordinates && delivery.dropoffCoordinates) || 
                       (delivery.PickupCoordinates && delivery.DropoffCoordinates);

  return (
    <div className="delivery-view-container">
      <div className="delivery-view-card">
          <div className="delivery-view-header">
            <div className="header-left">
              <h2>Delivery #{delivery.DeliveryID}</h2>
              <div className="delivery-status-header">
                <StatusBadge status={delivery.DeliveryStatus} />
                <span className="delivery-date">{formatSafeDate(delivery.DeliveryDate)}</span>
              </div>
            </div>
            <div className="header-actions">
              {hasRouteData && (
                <button 
                  className="btn btn-outline-primary btn-sm" 
                  onClick={toggleRouteMap}
                >
                  <FaRoute /> {showRouteMap ? 'Hide Route' : 'Show Route'}
                </button>
              )}
              <button className="btn btn-outline-secondary btn-sm" onClick={handlePrint}>
                <FaPrint /> Print
              </button>
              <Link to="/admin/deliveries" className="btn btn-secondary btn-sm">
                <FaArrowLeft /> Back
              </Link>
            </div>
          </div>
          
          <div className="delivery-view-body">
            {/* Route Map Section */}
            {showRouteMap && hasRouteData && (
              <div className="route-section">
                <h3><FaRoute /> Delivery Route</h3>
                <div className="route-summary">
                  <div className="route-addresses">
                    <div className="route-address pickup">
                      <FaMapMarkerAlt />
                      <strong>Pickup:</strong>
                      <span>{delivery.PickupLocation || delivery.pickup_location || 'Address not available'}</span>
                    </div>
                    <div className="route-address dropoff">
                      <FaMapMarkerAlt />
                      <strong>Dropoff:</strong>
                      <span>{delivery.DeliveryAddress || delivery.delivery_address || delivery.dropoff_location || 'Address not available'}</span>
                    </div>
                  </div>
                  <div className="route-stats">
                    <div className="route-stat">
                      <span className="stat-value">{formatDistance(delivery.DeliveryDistance)}</span>
                      <span className="stat-label">Distance</span>
                    </div>
                    {delivery.EstimatedDuration && (
                      <div className="route-stat">
                        <span className="stat-value">{Math.round(delivery.EstimatedDuration)} min</span>
                        <span className="stat-label">Duration</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="route-map">
                  <RouteMap 
                    pickupCoordinates={delivery.pickupCoordinates || delivery.PickupCoordinates}
                    dropoffCoordinates={delivery.dropoffCoordinates || delivery.DropoffCoordinates}
                    pickupAddress={delivery.PickupLocation}
                    dropoffAddress={delivery.DeliveryAddress}
                    onRouteCalculated={() => {}}
                  />
                </div>
              </div>
            )}
            
            {/* Key Metrics Summary */}
            <div className="metrics-summary">
              <div className="metric-card">
                <div className="metric-icon">📏</div>
                <div className="metric-content">
                  <div className="metric-value">{formatDistance(delivery.DeliveryDistance)}</div>
                  <div className="metric-label">Distance</div>
                </div>
              </div>
              {delivery.EstimatedDuration && (
                <div className="metric-card">
                  <div className="metric-icon">⏱️</div>
                  <div className="metric-content">
                    <div className="metric-value">{Math.round(delivery.EstimatedDuration)} min</div>
                    <div className="metric-label">Est. Duration</div>
                  </div>
                </div>
              )}
              <div className="metric-card">
                <div className="metric-icon">💰</div>
                <div className="metric-content">
                  <div className="metric-value">{formatCurrency(delivery.DeliveryRate)}</div>
                  <div className="metric-label">Rate</div>
                </div>
              </div>
              <div className="metric-card highlight-metric">
                <div className="metric-icon">💵</div>
                <div className="metric-content">
                  <div className="metric-value total">{formatCurrency(calculateTotalAmount())}</div>
                  <div className="metric-label">Total Amount</div>
                </div>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="delivery-two-column">
              {/* Left Column - Location & Delivery Info */}
              <div className="left-column">
                {/* Client Info */}
                <div className="info-section">
                  <h3>Client Information</h3>
                  <div className="info-grid">
                    <div className="info-item">
                      <label>Client Name:</label>
                      <span>{delivery.ClientName}</span>
                    </div>
                  </div>
                </div>

                {/* Locations */}
                <div className="info-section">
                  <h3>Pickup Location</h3>
                  <div className="location-box pickup">
                    <div className="location-icon">📍</div>
                    <div className="location-text">{delivery.PickupLocation || 'Not specified'}</div>
                  </div>
                </div>

                <div className="info-section">
                  <h3>Delivery Address</h3>
                  <div className="location-box dropoff">
                    <div className="location-icon">🎯</div>
                    <div className="location-text">{delivery.DeliveryAddress}</div>
                  </div>
                </div>

                {!hasRouteData && (
                  <div className="route-notice">
                    <small>📍 Route map unavailable (coordinates not saved during booking)</small>
                  </div>
                )}

                {/* Cargo Details */}
                {(delivery.CargoWeight || delivery.TotalCargoWeight) && (
                  <div className="info-section">
                    <h3>Cargo Information</h3>
                    <div className="info-grid">
                      <div className="info-item">
                        <label>Weight:</label>
                        <span>{delivery.CargoWeight || 0} tons</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Resources & Status */}
              <div className="right-column">
                {/* Truck Info */}
                <div className="info-section">
                  <h3>Assigned Truck</h3>
                  <div className="truck-card">
                    <div className="truck-icon">🚚</div>
                    <div className="truck-info">
                      <div className="truck-plate">{delivery.TruckPlate}</div>
                      <div className="truck-type">{delivery.TruckType}</div>
                    </div>
                  </div>
                </div>

                {/* Driver Info */}
                <div className="info-section">
                  <h3>Driver</h3>
                  <div className="resource-card">
                    <div className="resource-name">{delivery.DriverName || 'Not Assigned'}</div>
                    {delivery.DriverStatus && (
                      <div className="resource-status">
                        {delivery.DriverStatus === 'awaiting_approval' && '⏳ Awaiting Approval'}
                        {delivery.DriverStatus === 'assigned' && delivery.DriverApprovalStatus === 'approved' && '✅ Approved'}
                        {delivery.DriverStatus === 'assigned' && (!delivery.DriverApprovalStatus || delivery.DriverApprovalStatus === 'not_applicable') && '📋 Assigned'}
                        {delivery.DriverStatus === 'awaiting_driver' && '🔍 Awaiting Assignment'}
                        {delivery.DriverStatus === 'unknown' && '❓ Unknown'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Helper Info */}
                <div className="info-section">
                  <h3>Helper</h3>
                  <div className="resource-card">
                    <div className="resource-name">{delivery.HelperName || 'Not Assigned'}</div>
                    {delivery.HelperStatus && (
                      <div className="resource-status">
                        {delivery.HelperStatus === 'awaiting_approval' && '⏳ Awaiting Approval'}
                        {delivery.HelperStatus === 'assigned' && delivery.HelperApprovalStatus === 'approved' && '✅ Approved'}
                        {delivery.HelperStatus === 'assigned' && (!delivery.HelperApprovalStatus || delivery.HelperApprovalStatus === 'not_applicable') && '📋 Assigned'}
                        {delivery.HelperStatus === 'awaiting_helper' && '🔍 Awaiting Assignment'}
                        {delivery.HelperStatus === 'unknown' && '❓ Unknown'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline - Full Width */}
            <div className="info-section timeline-section">
              <h3>Delivery Timeline</h3>
              <div className="timeline">
                <div className={`timeline-item ${delivery.DeliveryStatus === 'pending' ? 'active' : 'completed'}`}>
                  <div className="timeline-marker"></div>
                  <div className="timeline-content">
                    <h4>Created</h4>
                    <p>{formatSafeDate(delivery.CreatedAt || delivery.created_at)}</p>
                  </div>
                </div>
                
                <div className={`timeline-item ${delivery.DeliveryStatus === 'in-progress' ? 'active' : (delivery.DeliveryStatus === 'completed' || delivery.DeliveryStatus === 'cancelled' ? 'completed' : '')}`}>
                  <div className="timeline-marker"></div>
                  <div className="timeline-content">
                    <h4>In Progress</h4>
                    <p>{delivery.DeliveryStatus === 'in-progress' || delivery.DeliveryStatus === 'completed' || delivery.DeliveryStatus === 'cancelled' ? 'Delivery started' : 'Pending'}</p>
                  </div>
                </div>
                
                <div className={`timeline-item ${delivery.DeliveryStatus === 'completed' ? 'active' : ''}`}>
                  <div className="timeline-marker"></div>
                  <div className="timeline-content">
                    <h4>Completed</h4>
                    <p>{delivery.DeliveryStatus === 'completed' ? 'Delivery completed successfully' : 'Pending'}</p>
                  </div>
                </div>
                
                {delivery.DeliveryStatus === 'cancelled' && (
                  <div className="timeline-item active cancelled">
                    <div className="timeline-marker"></div>
                    <div className="timeline-content">
                      <h4>Cancelled</h4>
                      <p>Delivery was cancelled</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};

export default DeliveryView;