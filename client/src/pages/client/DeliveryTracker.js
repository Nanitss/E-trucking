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
  FaFilter,
  FaTimes,
} from "react-icons/fa";
import Loader from "../../components/common/Loader";
import StatusBadge from "../../components/common/StatusBadge";
import LiveMapTracker from "../../components/tracking/LiveMapTracker";
import { AuthContext } from "../../context/AuthContext";

const DeliveryTracker = () => {
  const { logout } = useContext(AuthContext) || { logout: () => { } };
  const history = useHistory();
  const [deliveries, setDeliveries] = useState([]);
  const [filteredDeliveries, setFilteredDeliveries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState(null);
  const [selectedTruckId, setSelectedTruckId] = useState(null);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
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
    <div className="h-full bg-gray-50 flex flex-col p-4 md:p-6 font-sans text-gray-800 overflow-hidden">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-600/20">
          <FaTruck className="text-xl" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 m-0">
          Delivery Tracker
        </h1>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-6 overflow-hidden">
        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
          <h2 className="text-xl font-bold text-gray-800 m-0">
            In-Progress Deliveries
          </h2>
          <div className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full">
            Showing {filteredDeliveries.length} of {deliveries.length}{" "}
            deliveries
          </div>
        </div>

        {/* Modern Filter Bar - Popup Style */}
        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/60 mb-6 relative">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-lg w-full">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                name="search"
                placeholder="Search by ID, driver, truck, location..."
                value={filters.search}
                onChange={handleFilterChange}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              {/* Filter Toggle Button */}
              <button
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-medium ${showFilters ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                onClick={() => setShowFilters(!showFilters)}
              >
                <FaFilter size={14} />
                Filters
                {(filters.status || filters.dateFrom || filters.dateTo) && (
                  <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1">
                    {[filters.status, filters.dateFrom, filters.dateTo].filter(Boolean).length}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="mt-3 text-gray-500 text-sm font-medium">
            Showing {filteredDeliveries.length} of {deliveries.length} deliveries
          </div>

          {/* Filter Popup */}
          {showFilters && (
            <div className="absolute top-full mt-2 right-4 z-50 bg-white rounded-xl shadow-xl border border-gray-100 w-[400px] max-w-[90vw] p-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-gray-900 text-lg">Filter Options</h4>
                <button
                  className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                  onClick={() => setShowFilters(false)}
                >
                  <FaTimes size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 mb-6">
                {/* Status Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Status</label>
                  <select
                    name="status"
                    value={filters.status}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="started">Started</option>
                    <option value="picked-up">Picked Up</option>
                  </select>
                </div>

                {/* Date Range */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Date Range</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      name="dateFrom"
                      value={filters.dateFrom}
                      onChange={handleFilterChange}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <input
                      type="date"
                      name="dateTo"
                      value={filters.dateTo}
                      onChange={handleFilterChange}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                  onClick={() => {
                    setFilters({ search: "", status: "", dateFrom: "", dateTo: "" });
                    setShowFilters(false);
                  }}
                >
                  Reset
                </button>
                <button
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm shadow-blue-200 transition-colors"
                  onClick={() => setShowFilters(false)}
                >
                  Apply Filters
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-400px)] rounded-xl border border-gray-200">
          {filteredDeliveries.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
                  >
                    Delivery ID
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
                  >
                    <div className="flex items-center gap-2">
                      <FaCalendarAlt /> <span>Date</span>
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
                  >
                    <div className="flex items-center gap-2">
                      <FaTruck /> <span>Truck</span>
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
                  >
                    <div className="flex items-center gap-2">
                      <FaMapMarkerAlt /> <span>Route</span>
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredDeliveries.map((delivery) => (
                  <tr
                    key={delivery.deliveryId}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg font-mono text-xs font-bold border border-blue-100">
                        #{delivery.deliveryId.substring(0, 12)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                      {formatDeliveryDate(delivery.deliveryDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-800">
                          {delivery.truckPlate || "N/A"}
                        </span>
                        {delivery.driverName && (
                          <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                            {delivery.driverName}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {delivery.pickupLocation || delivery.deliveryAddress ? (
                        <div className="flex items-center gap-2 max-w-[300px]">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <FaMapMarkerAlt className="text-emerald-500 flex-shrink-0 text-xs" />
                            <span
                              className="truncate text-gray-600"
                              title={delivery.pickupLocation}
                            >
                              {delivery.pickupLocation
                                ? delivery.pickupLocation.split(",")[0]
                                : "N/A"}
                            </span>
                          </div>
                          <span className="text-gray-300 font-bold">→</span>
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <FaMapMarkerAlt className="text-red-500 flex-shrink-0 text-xs" />
                            <span
                              className="truncate text-gray-600"
                              title={delivery.deliveryAddress}
                            >
                              {delivery.deliveryAddress
                                ? delivery.deliveryAddress.split(",")[0]
                                : "N/A"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-xs">
                          No route info
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={delivery.deliveryStatus} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-100 transition-all flex items-center justify-center mx-auto shadow-sm hover:shadow-md hover:shadow-blue-500/20"
                        onClick={() => {
                          const truckIdentifier =
                            delivery.truckPlate || delivery.TruckPlate;
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-4xl text-gray-300">
                <FaTruck />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-1">
                No active deliveries found
              </h3>
              <p className="text-gray-500 text-sm max-w-sm mx-auto">
                No active deliveries match your current filters. Try adjusting
                your search criteria.
              </p>
            </div>
          )}
        </div>
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
