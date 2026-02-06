import React, { useState, useEffect, useContext } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { FaArrowLeft, FaPrint, FaRoute, FaMapMarkerAlt } from "react-icons/fa";
import Loader from "../../../components/common/Loader";
// Using ProtectedRoute with header navigation
import { AlertContext } from "../../../context/AlertContext";
import StatusBadge from "../../../components/common/StatusBadge";
import { formatCurrency, formatDistance } from "../../../utils/formatUtils";
import { formatDateLocale } from "../../../utils/dateUtils";
import RouteMap from "../../../components/maps/RouteMap";

const DeliveryView = ({ currentUser }) => {
  const { id } = useParams();
  const { showAlert } = useContext(AlertContext);
  const [delivery, setDelivery] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRouteMap, setShowRouteMap] = useState(false);

  useEffect(() => {
    fetchDelivery();
  }, []);

  const fetchDelivery = async () => {
    try {
      const res = await axios.get(`/api/deliveries/${id}`);
      setDelivery(res.data);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching delivery details:", error);
      showAlert("Error loading delivery details", "danger");
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
    if (!dateValue) return "Not available";

    try {
      let date;
      if (typeof dateValue === "string") {
        date = new Date(dateValue);
      } else if (dateValue.toDate && typeof dateValue.toDate === "function") {
        date = dateValue.toDate();
      } else {
        date = new Date(dateValue);
      }

      if (isNaN(date.getTime())) {
        return "Invalid date";
      }

      return formatDateLocale(date);
    } catch (error) {
      console.error("Date formatting error:", error);
      return "Date error";
    }
  };

  // Calculate total amount
  const calculateTotalAmount = () => {
    if (delivery.TotalAmount && delivery.TotalAmount > 0) {
      return delivery.TotalAmount;
    }
    if (delivery.DeliveryRate && delivery.DeliveryRate > 0) {
      if (delivery.DeliveryRate > 1000) {
        return delivery.DeliveryRate;
      }
    }
    const distance = delivery.DeliveryDistance || 0;
    const rate = delivery.DeliveryRate || 0;
    return distance * rate;
  };

  // Get timeline step status
  const getTimelineStatus = (step) => {
    const status = delivery.DeliveryStatus?.toLowerCase();

    switch (step) {
      case "created":
        return "completed";
      case "pending":
        if (status === "pending") return "active";
        if (
          [
            "in-progress",
            "in_progress",
            "on-delivery",
            "on_delivery",
            "completed",
            "cancelled",
          ].includes(status)
        )
          return "completed";
        return "completed";
      case "in-progress":
        if (
          ["in-progress", "in_progress", "on-delivery", "on_delivery"].includes(
            status,
          )
        )
          return "active";
        if (["completed", "cancelled"].includes(status)) return "completed";
        return "pending";
      case "completed":
        if (status === "completed") return "active";
        return "pending";
      default:
        return "pending";
    }
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

  const hasRouteData =
    (delivery.pickupCoordinates && delivery.dropoffCoordinates) ||
    (delivery.PickupCoordinates && delivery.DropoffCoordinates);

  const isCancelled = delivery.DeliveryStatus?.toLowerCase() === "cancelled";

  return (
    <div className="delivery-view-container">
      <div className="delivery-view-card">
        <div className="delivery-view-header">
          <div className="header-left">
            <h2>Delivery #{delivery.DeliveryID}</h2>
            <div className="delivery-status-header">
              <StatusBadge status={delivery.DeliveryStatus} />
              <span className="delivery-date">
                {formatSafeDate(delivery.DeliveryDate)}
              </span>
            </div>
          </div>
          <div className="header-actions">
            <Link to="/admin/deliveries" className="btn btn-secondary btn-sm">
              <FaArrowLeft /> Back
            </Link>
          </div>
        </div>

        <div className="delivery-view-body">
          {/* Horizontal Timeline Tracker */}
          <div className="timeline-tracker">
            <div className={`timeline-step ${getTimelineStatus("created")}`}>
              <div className="step-icon">📝</div>
              <div className="step-label">Created</div>
            </div>
            <div className="timeline-connector"></div>
            <div className={`timeline-step ${getTimelineStatus("pending")}`}>
              <div className="step-icon">⏳</div>
              <div className="step-label">Pending</div>
            </div>
            <div className="timeline-connector"></div>
            <div
              className={`timeline-step ${getTimelineStatus("in-progress")}`}
            >
              <div className="step-icon">🚚</div>
              <div className="step-label">In Transit</div>
            </div>
            <div className="timeline-connector"></div>
            {isCancelled ? (
              <div className="timeline-step cancelled active">
                <div className="step-icon">❌</div>
                <div className="step-label">Cancelled</div>
              </div>
            ) : (
              <div
                className={`timeline-step ${getTimelineStatus("completed")}`}
              >
                <div className="step-icon">✅</div>
                <div className="step-label">Completed</div>
              </div>
            )}
          </div>

          {/* Key Metrics - Compact */}
          <div className="metrics-row">
            <div className="metric-item">
              <span className="metric-icon">📏</span>
              <span className="metric-value">
                {formatDistance(delivery.DeliveryDistance)}
              </span>
              <span className="metric-label">Distance</span>
            </div>
            {delivery.EstimatedDuration && (
              <div className="metric-item">
                <span className="metric-icon">⏱️</span>
                <span className="metric-value">
                  {Math.round(delivery.EstimatedDuration)} min
                </span>
                <span className="metric-label">Duration</span>
              </div>
            )}
            <div className="metric-item">
              <span className="metric-icon">💰</span>
              <span className="metric-value">
                {formatCurrency(delivery.DeliveryRate)}
              </span>
              <span className="metric-label">Rate</span>
            </div>
            <div className="metric-item highlight">
              <span className="metric-icon">💵</span>
              <span className="metric-value">
                {formatCurrency(calculateTotalAmount())}
              </span>
              <span className="metric-label">Total</span>
            </div>
          </div>

          {/* Route Map Section */}
          {showRouteMap && hasRouteData && (
            <div className="route-section">
              <div className="route-map">
                <RouteMap
                  pickupCoordinates={
                    delivery.pickupCoordinates || delivery.PickupCoordinates
                  }
                  dropoffCoordinates={
                    delivery.dropoffCoordinates || delivery.DropoffCoordinates
                  }
                  pickupAddress={delivery.PickupLocation}
                  dropoffAddress={delivery.DeliveryAddress}
                  onRouteCalculated={() => { }}
                />
              </div>
            </div>
          )}

          {/* Compact Content Sections */}
          <div className="content-grid">
            {/* Route Row - Clickable to show map */}
            <div
              className={`route-row ${hasRouteData ? "clickable" : ""}`}
              onClick={hasRouteData ? toggleRouteMap : undefined}
              title={
                hasRouteData
                  ? "Click to view route map"
                  : "Route map not available"
              }
            >
              <div className="route-from">
                <span className="route-label">📍 FROM</span>
                <span className="route-address">
                  {delivery.PickupLocation || "Not specified"}
                </span>
              </div>
              <div className="route-arrow">→</div>
              <div className="route-to">
                <span className="route-label">🎯 TO</span>
                <span className="route-address">
                  {delivery.DeliveryAddress || "Not specified"}
                </span>
              </div>
              {hasRouteData && (
                <div className="route-action">
                  <span className="map-icon">
                    {showRouteMap ? "🗺️ Hide Map" : "🗺️ View Map"}
                  </span>
                </div>
              )}
              {(delivery.CargoWeight || delivery.TotalCargoWeight) && (
                <div className="cargo-badge">
                  📦 {delivery.CargoWeight || 0} tons
                </div>
              )}
            </div>

            {/* Details Grid - 4 columns */}
            <div className="details-grid">
              <div className="detail-cell">
                <span className="detail-label">CLIENT</span>
                <span className="detail-value">{delivery.ClientName}</span>
              </div>
              <div className="detail-cell">
                <span className="detail-label">TRUCK</span>
                <span className="detail-value truck-badge">
                  🚛 {delivery.TruckPlate} • {delivery.TruckType}
                </span>
              </div>
              <div className="detail-cell">
                <span className="detail-label">DRIVER</span>
                <div className="detail-value-row">
                  <span className="detail-value">
                    {delivery.DriverName || "Not Assigned"}
                  </span>
                  {delivery.DriverStatus === "awaiting_approval" && (
                    <span className="status-tag pending">⏳ Pending</span>
                  )}
                </div>
                <span className="detail-price">💰 ₱1,050.00</span>
              </div>
              <div className="detail-cell">
                <span className="detail-label">HELPER</span>
                <div className="detail-value-row">
                  <span className="detail-value">
                    {delivery.HelperName || "Not Assigned"}
                  </span>
                  {delivery.HelperStatus === "awaiting_approval" && (
                    <span className="status-tag pending">⏳ Pending</span>
                  )}
                </div>
                <span className="detail-price">💰 ₱750.00</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryView;
