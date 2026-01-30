import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { Link, useHistory } from "react-router-dom";
import {
  FaArrowLeft,
  FaTruck,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaClock,
  FaSearch,
  FaEye,
} from "react-icons/fa";
import Loader from "../../components/common/Loader";
import StatusBadge from "../../components/common/StatusBadge";
import LiveMapTracker from "../../components/tracking/LiveMapTracker";
import "./DeliveryTracker.css";
import "../../styles/DesignSystem.css";
import "../../styles/ClientPage.css";
import "../../components/common/DeliveryTrackerAdjust.css";
import { AuthContext } from "../../context/AuthContext";

const DeliveryTracker = () => {
  const { logout } = useContext(AuthContext) || { logout: () => {} };
  const history = useHistory();
  const [deliveries, setDeliveries] = useState([]);
  const [filteredDeliveries, setFilteredDeliveries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState(null);
  const [selectedTruckId, setSelectedTruckId] = useState(null);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    dateFrom: "",
    dateTo: "",
  });

  useEffect(() => {
    const fetchActiveDeliveries = async () => {
      try {
        console.log("🔍 Fetching active deliveries...");

        // Check if user is authenticated
        const token = localStorage.getItem("token");
        console.log("🔒 Token found:", !!token);
        console.log("🔒 Token length:", token?.length || 0);

        if (!token) {
          console.log("❌ No authentication token found");
          setDeliveries([]);
          setFilteredDeliveries([]);
          setIsLoading(false);
          return;
        }

        // Ensure axios has the token
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        console.log("🔒 Set authorization header");

        // Try the new tracking API first (with timeout)
        try {
          console.log("🔍 Trying tracking API...");
          const trackingResponse = await axios.get(
            "/api/tracking/active-deliveries",
            {
              timeout: 10000, // 10 second timeout
            },
          );

          if (
            trackingResponse.data.success &&
            trackingResponse.data.data.length > 0
          ) {
            console.log(
              "✅ Got deliveries from tracking API:",
              trackingResponse.data.data.length,
            );
            const activeDeliveries = trackingResponse.data.data;
            setDeliveries(activeDeliveries);
            setFilteredDeliveries(activeDeliveries);
            setIsLoading(false);
            return;
          } else {
            console.log(
              "⚠️ Tracking API returned no data:",
              trackingResponse.data,
            );
          }
        } catch (trackingError) {
          console.log(
            "⚠️ Tracking API failed:",
            trackingError.response?.status,
            trackingError.response?.data || trackingError.message,
          );
          if (trackingError.code === "ECONNABORTED") {
            console.log(
              "⏰ Tracking API timed out - server may not be running",
            );
          }
        }

        // Fallback to original client deliveries API
        console.log("🔍 Trying client deliveries API...");
        const clientResponse = await axios.get("/api/clients/deliveries", {
          timeout: 10000, // 10 second timeout
        });
        console.log(
          "📋 Got deliveries from client API:",
          clientResponse.data?.length || 0,
        );
        console.log("📋 Client API response:", clientResponse.data);

        // Filter for active deliveries only (case-insensitive)
        const activeDeliveries = clientResponse.data.filter((delivery) => {
          const status = (
            delivery.DeliveryStatus ||
            delivery.deliveryStatus ||
            ""
          )
            .toLowerCase()
            .trim();

          // Only show deliveries that are actually IN PROGRESS (not pending)
          const activeStatuses = [
            "in-progress",
            "in progress",
            "in_progress",
            "inprogress",
            "started",
            "picked-up",
            "picked up",
            "picked_up",
            "pickedup",
            "ongoing",
            "active",
          ];

          console.log(`📊 Checking delivery ${delivery.DeliveryID}:`);
          console.log(`   - DeliveryStatus: "${delivery.DeliveryStatus}"`);
          console.log(`   - deliveryStatus: "${delivery.deliveryStatus}"`);
          console.log(`   - Normalized status: "${status}"`);
          console.log(`   - Is active: ${activeStatuses.includes(status)}`);

          return activeStatuses.includes(status);
        });

        console.log("🎯 Active deliveries found:", activeDeliveries.length);

        // Convert to new format for consistency
        const formattedDeliveries = activeDeliveries.map((delivery) => ({
          deliveryId: delivery.DeliveryID || delivery.id,
          deliveryStatus: delivery.DeliveryStatus || delivery.deliveryStatus,
          truckId: delivery.TruckID || delivery.truckId,
          truckPlate: delivery.TruckPlate || delivery.truckPlate,
          driverName: delivery.DriverName || delivery.driverName,
          clientName: delivery.ClientName || delivery.clientName,
          pickupLocation: delivery.PickupLocation || delivery.pickupLocation,
          deliveryAddress: delivery.DropoffLocation || delivery.deliveryAddress,
          deliveryDate: delivery.DeliveryDate || delivery.deliveryDate,
          deliveryTime: delivery.DeliveryTime || delivery.deliveryTime,
          currentLocation: null, // No GPS data from client API
          isActive: false,
          currentSpeed: 0,
        }));

        setDeliveries(formattedDeliveries);
        setFilteredDeliveries(formattedDeliveries);
        setIsLoading(false);
      } catch (error) {
        console.error("❌ Error fetching deliveries:", error);
        console.error("❌ Error details:", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
        });

        // Show error message but don't leave user stuck on loading
        setDeliveries([]);
        setFilteredDeliveries([]);
        setIsLoading(false);

        // Show user-friendly error message
        if (error.code === "ECONNABORTED") {
          console.log("⏰ Request timed out - server may be starting up");
        } else if (error.response?.status === 403) {
          console.log("🔒 Authentication issue - please try logging in again");
        } else if (error.response?.status === 500) {
          console.log("🔧 Server error - please try again in a moment");
        }
      }
    };

    fetchActiveDeliveries();

    // Set up auto-refresh every 30 seconds for real-time updates
    const interval = setInterval(fetchActiveDeliveries, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let result = deliveries;

    // Filter by search term
    if (filters.search) {
      result = result.filter((delivery) => {
        const searchTerm = filters.search.toLowerCase();
        return (
          (delivery.deliveryId &&
            delivery.deliveryId.toString().includes(filters.search)) ||
          (delivery.driverName &&
            delivery.driverName.toLowerCase().includes(searchTerm)) ||
          (delivery.pickupLocation &&
            delivery.pickupLocation.toLowerCase().includes(searchTerm)) ||
          (delivery.deliveryAddress &&
            delivery.deliveryAddress.toLowerCase().includes(searchTerm)) ||
          (delivery.truckPlate &&
            delivery.truckPlate.toLowerCase().includes(searchTerm)) ||
          (delivery.clientName &&
            delivery.clientName.toLowerCase().includes(searchTerm))
        );
      });
    }

    // Filter by status
    if (filters.status) {
      result = result.filter(
        (delivery) =>
          delivery.deliveryStatus &&
          delivery.deliveryStatus.toLowerCase() ===
            filters.status.toLowerCase(),
      );
    }

    // Filter by date range
    if (filters.dateFrom) {
      result = result.filter((delivery) => {
        const deliveryDate = delivery.deliveryDate;
        if (!deliveryDate) return true;
        return new Date(deliveryDate) >= new Date(filters.dateFrom);
      });
    }

    if (filters.dateTo) {
      result = result.filter((delivery) => {
        const deliveryDate = delivery.deliveryDate;
        if (!deliveryDate) return true;
        return new Date(deliveryDate) <= new Date(filters.dateTo);
      });
    }

    setFilteredDeliveries(result);
  }, [filters, deliveries]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Robust date formatting function
  const formatDeliveryDate = (dateValue) => {
    try {
      if (!dateValue) return "Not specified";

      let dateToFormat = null;

      // Handle Firestore Timestamp object
      if (dateValue && typeof dateValue === "object" && dateValue.seconds) {
        dateToFormat = new Date(dateValue.seconds * 1000);
      }
      // Handle string dates
      else if (typeof dateValue === "string") {
        const cleanDateString = dateValue.trim();

        // Check for invalid string values
        if (
          !cleanDateString ||
          cleanDateString.toLowerCase() === "invalid date" ||
          cleanDateString.toLowerCase() === "null" ||
          cleanDateString.toLowerCase() === "undefined"
        ) {
          return "Not specified";
        }

        dateToFormat = new Date(cleanDateString);
      }
      // Handle numeric timestamps
      else if (typeof dateValue === "number") {
        if (dateValue === 0 || isNaN(dateValue)) {
          return "Not specified";
        }

        // Convert seconds to milliseconds if needed
        if (dateValue < 10000000000) {
          dateToFormat = new Date(dateValue * 1000);
        } else {
          dateToFormat = new Date(dateValue);
        }
      }

      // Validate the resulting date
      if (dateToFormat && !isNaN(dateToFormat.getTime())) {
        return dateToFormat.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      } else {
        return "Not specified";
      }
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Not specified";
    }
  };

  if (isLoading) {
    return <Loader message="Loading active deliveries..." />;
  }

  return (
    <div className="client-page-container">
      <div className="client-page-header">
        <h1>
          <FaTruck style={{ marginRight: "10px" }} /> Delivery Tracker
        </h1>
      </div>

      <div className="section-container">
        <div className="section-header-row">
          <h2 className="section-title">In-Progress Deliveries</h2>
        </div>

        <div className="filters-section">
          <div className="filter-group">
            <label className="filter-label">SEARCH</label>
            <div className="search-box">
              <FaSearch />
              <input
                type="text"
                name="search"
                placeholder="Search bookings"
                value={filters.search}
                onChange={handleFilterChange}
                className="form-control"
              />
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">STATUS</label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="form-control"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="started">Started</option>
              <option value="picked-up">Picked Up</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">DATE RANGE</label>
            <div className="date-range-inputs">
              <input
                type="date"
                name="dateFrom"
                value={filters.dateFrom}
                onChange={handleFilterChange}
                className="form-control"
                placeholder="From Date"
              />
              <input
                type="date"
                name="dateTo"
                value={filters.dateTo}
                onChange={handleFilterChange}
                className="form-control"
                placeholder="To Date"
              />
            </div>
          </div>
        </div>

        <div className="filter-summary">
          Showing {filteredDeliveries.length} of {deliveries.length} deliveries
        </div>
      </div>

      <div className="modern-deliveries-table-wrapper">
        {filteredDeliveries.length > 0 ? (
          <table className="modern-deliveries-table">
            <thead>
              <tr>
                <th>Delivery ID</th>
                <th>
                  <div className="th-content">
                    <FaCalendarAlt />
                    <span>Delivery Date</span>
                  </div>
                </th>
                <th>
                  <div className="th-content">
                    <FaTruck />
                    <span>Truck</span>
                  </div>
                </th>
                <th>
                  <div className="th-content">
                    <FaMapMarkerAlt />
                    <span>Route</span>
                  </div>
                </th>
                <th>Status</th>
                <th className="actions-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeliveries.map((delivery) => (
                <tr key={delivery.deliveryId} className="modern-delivery-row">
                  <td className="delivery-id-col">
                    <div className="id-badge">
                      #{delivery.deliveryId.substring(0, 12)}
                    </div>
                  </td>
                  <td className="date-col">
                    <div className="date-value">
                      {formatDeliveryDate(delivery.deliveryDate)}
                    </div>
                  </td>
                  <td className="truck-col">
                    <div className="truck-info">
                      <span className="truck-plate">
                        {delivery.truckPlate || "N/A"}
                      </span>
                      {delivery.driverName && (
                        <span className="truck-brand">
                          {delivery.driverName}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="route-col-compact">
                    {delivery.pickupLocation || delivery.deliveryAddress ? (
                      <div className="route-compact">
                        <div className="route-location-compact">
                          <FaMapMarkerAlt className="pickup-icon-small" />
                          <span className="location-text">
                            {delivery.pickupLocation
                              ? delivery.pickupLocation.split(",")[0]
                              : "N/A"}
                          </span>
                        </div>
                        <div className="route-arrow-compact">→</div>
                        <div className="route-location-compact">
                          <FaMapMarkerAlt className="dropoff-icon-small" />
                          <span className="location-text">
                            {delivery.deliveryAddress
                              ? delivery.deliveryAddress.split(",")[0]
                              : "N/A"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="no-route">No route</span>
                    )}
                  </td>
                  <td className="status-col">
                    <StatusBadge status={delivery.deliveryStatus} />
                  </td>
                  <td className="actions-col">
                    <div className="modern-action-buttons">
                      <button
                        className="modern-action-btn view"
                        onClick={() => {
                          const truckIdentifier =
                            delivery.truckPlate || delivery.TruckPlate;
                          console.log(
                            "🚚 Opening tracking for delivery:",
                            delivery.deliveryId,
                          );
                          console.log("🚚 Truck Plate/ID:", truckIdentifier);
                          console.log(
                            "📍 Pickup Location:",
                            delivery.pickupLocation,
                          );
                          console.log(
                            "📍 Dropoff Location:",
                            delivery.deliveryAddress,
                          );

                          if (!truckIdentifier) {
                            alert("No truck assigned to this delivery");
                            return;
                          }

                          setSelectedDeliveryId(delivery.deliveryId);
                          setSelectedTruckId(truckIdentifier);
                          window.currentDeliveryData = delivery;
                          setShowTrackingModal(true);
                        }}
                        title="Track Live GPS"
                      >
                        <FaEye />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="trucks-empty-state">
            <div className="empty-state-icon">📦</div>
            <h3 className="empty-state-title">No active deliveries found</h3>
            <p className="empty-state-description">
              No active deliveries match your current filters. Try adjusting
              your search criteria.
            </p>
          </div>
        )}
      </div>

      {/* Live GPS Tracking Modal */}
      {showTrackingModal && selectedDeliveryId && (
        <LiveMapTracker
          deliveryId={selectedDeliveryId}
          truckId={selectedTruckId}
          onClose={() => {
            setShowTrackingModal(false);
            setSelectedDeliveryId(null);
            setSelectedTruckId(null);
          }}
        />
      )}
    </div>
  );
};

export default DeliveryTracker;
