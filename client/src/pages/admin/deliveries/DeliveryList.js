import React, { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  TbEdit,
  TbEye,
  TbTruck,
  TbUser,
  TbBuilding,
  TbCalendar,
  TbCheck,
  TbX,
  TbClock,
  TbAlertCircle,
  TbFileText,
  TbPlus,
  TbActivity,
  TbTruckDelivery,
  TbArrowUp,
  TbArrowDown,
  TbMapPin,
  TbFilter,
  TbFilterOff,
  TbSearch,
  TbChevronLeft,
  TbChevronRight,
  TbPackage,
} from "react-icons/tb";
import StatusBadge from "../../../components/common/StatusBadge";
import Loader from "../../../components/common/Loader";
import { AlertContext } from "../../../context/AlertContext";
import AdminHeader from "../../../components/common/AdminHeader";
import LiveMapTracker from "../../../components/tracking/LiveMapTracker";

const DeliveryList = ({ currentUser }) => {
  const [deliveries, setDeliveries] = useState([]);
  const [filteredDeliveries, setFilteredDeliveries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortField, setSortField] = useState("DeliveryID");
  const [sortDirection, setSortDirection] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const deliveriesPerPage = 20;
  const { showAlert } = useContext(AlertContext);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState(null);
  const [selectedTruckId, setSelectedTruckId] = useState(null);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Calculate active filters count
  const activeFilterCount = [
    statusFilter !== "all" ? statusFilter : null,
    startDate,
    endDate,
  ].filter(Boolean).length;

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const fetchDeliveries = async () => {
    try {
      const res = await axios.get("/api/deliveries");
      setDeliveries(res.data);
      setFilteredDeliveries(res.data);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching deliveries:", error);
      showAlert("Error fetching delivery data", "danger");
      setIsLoading(false);
    }
  };

  // Filter deliveries
  useEffect(() => {
    let filtered = [...deliveries];

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (d) => d.DeliveryStatus?.toLowerCase() === statusFilter.toLowerCase(),
      );
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (d) =>
          d.DeliveryID?.toLowerCase().includes(query) ||
          d.ClientName?.toLowerCase().includes(query) ||
          d.DriverName?.toLowerCase().includes(query) ||
          d.HelperName?.toLowerCase().includes(query) ||
          d.TruckPlate?.toLowerCase().includes(query),
      );
    }

    // Apply date range filter
    if (startDate || endDate) {
      filtered = filtered.filter((d) => {
        // Get the delivery date (try multiple field names)
        const deliveryDate =
          d.created_at || d.CreatedAt || d.deliveryDate || d.DeliveryDate;
        if (!deliveryDate) return true; // Include deliveries without dates

        const date = new Date(deliveryDate);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        // Set time to start/end of day for accurate comparison
        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);

        if (start && end) {
          return date >= start && date <= end;
        } else if (start) {
          return date >= start;
        } else if (end) {
          return date <= end;
        }
        return true;
      });
    }

    setFilteredDeliveries(filtered);
  }, [deliveries, statusFilter, searchQuery, startDate, endDate]);

  // Sorting function
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Get sorted and paginated deliveries
  const getSortedAndPaginatedDeliveries = () => {
    let sorted = [...filteredDeliveries];

    // Sort
    sorted.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    // Paginate
    const startIndex = (currentPage - 1) * deliveriesPerPage;
    const endIndex = startIndex + deliveriesPerPage;
    return sorted.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredDeliveries.length / deliveriesPerPage);

  // Helper functions
  const formatDriverStatus = (status, approvalStatus) => {
    if (!status || status === "unknown") return "Unknown";

    switch (status.toLowerCase()) {
      case "awaiting_approval":
        return "Awaiting Approval";
      case "accepted":
        return "Accepted";
      case "in_progress":
      case "in progress":
        return "In Progress";
      case "delivered":
        return "Delivered";
      case "completed":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      case "assigned":
        return approvalStatus === "approved" ? "Approved" : "Assigned";
      case "awaiting_driver":
        return "Awaiting";
      default:
        return "Unknown";
    }
  };

  const formatHelperStatus = (status, approvalStatus) => {
    if (!status || status === "unknown") return "Unknown";

    switch (status.toLowerCase()) {
      case "awaiting_approval":
        return "Awaiting Approval";
      case "accepted":
        return "Accepted";
      case "in_progress":
      case "in progress":
        return "In Progress";
      case "delivered":
        return "Delivered";
      case "completed":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      case "assigned":
        return approvalStatus === "approved" ? "Approved" : "Assigned";
      case "awaiting_helper":
        return "Awaiting";
      default:
        return "Unknown";
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AdminHeader currentUser={currentUser} />

      <div className="flex-1 p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
        {/* Greeting and Summary Cards */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800">
            Delivery Management
          </h2>
          <p className="text-gray-500 mt-1">
            Manage delivery schedules, track status, and monitor progress
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                  <TbX size={20} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Cancelled</p>
                  <p className="text-xl font-bold text-gray-900">
                    {
                      deliveries.filter(
                        (d) => d.DeliveryStatus?.toLowerCase() === "cancelled",
                      ).length
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center text-xs font-semibold text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
                <TbArrowDown size={12} className="mr-0.5" /> 0%
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
                  <TbClock size={20} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Pending</p>
                  <p className="text-xl font-bold text-gray-900">
                    {
                      deliveries.filter(
                        (d) => d.DeliveryStatus?.toLowerCase() === "pending",
                      ).length
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                <TbArrowUp size={12} className="mr-0.5" /> +3.1%
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                  <TbActivity size={20} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Active</p>
                  <p className="text-xl font-bold text-gray-900">
                    {
                      deliveries.filter((d) =>
                        ["in-progress", "in progress", "accepted"].includes(
                          d.DeliveryStatus?.toLowerCase(),
                        ),
                      ).length
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-500">
                  <TbCheck size={20} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Delivered</p>
                  <p className="text-xl font-bold text-gray-900">
                    {
                      deliveries.filter((d) =>
                        ["delivered", "completed"].includes(
                          d.DeliveryStatus?.toLowerCase(),
                        ),
                      ).length
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                <TbArrowUp size={12} className="mr-0.5" /> +2.8%
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="relative w-full md:w-96">
            <TbSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by ID, client, driver..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="relative flex items-center gap-2 w-full md:w-auto">
            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${showFilters || activeFilterCount > 0 ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <TbFilter size={18} />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Filter Popup */}
            {showFilters && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 p-4 z-20 animate-fade-in-up">
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100">
                  <h4 className="font-semibold text-sm text-gray-800">
                    Filter Options
                  </h4>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <TbX size={16} />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Status
                    </label>
                    <select
                      className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">All Statuses</option>
                      <option value="Pending">Pending</option>
                      <option value="Accepted">Accepted</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Date Range
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        className="w-full p-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                      <input
                        type="date"
                        className="w-full p-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end gap-2">
                  <button
                    className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700"
                    onClick={() => {
                      setStatusFilter("all");
                      setStartDate("");
                      setEndDate("");
                      setSearchQuery("");
                    }}
                  >
                    Reset
                  </button>
                  <button
                    className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    onClick={() => setShowFilters(false)}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Deliveries Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {filteredDeliveries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th
                      className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort("DeliveryID")}
                    >
                      <div className="flex items-center gap-1">
                        Delivery ID{" "}
                        {sortField === "DeliveryID" &&
                          (sortDirection === "asc" ? (
                            <TbArrowUp size={12} />
                          ) : (
                            <TbArrowDown size={12} />
                          ))}
                      </div>
                    </th>
                    <th
                      className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort("ClientName")}
                    >
                      <div className="flex items-center gap-1">
                        Client{" "}
                        {sortField === "ClientName" &&
                          (sortDirection === "asc" ? (
                            <TbArrowUp size={12} />
                          ) : (
                            <TbArrowDown size={12} />
                          ))}
                      </div>
                    </th>
                    <th
                      className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort("DriverName")}
                    >
                      <div className="flex items-center gap-1">
                        Driver{" "}
                        {sortField === "DriverName" &&
                          (sortDirection === "asc" ? (
                            <TbArrowUp size={12} />
                          ) : (
                            <TbArrowDown size={12} />
                          ))}
                      </div>
                    </th>
                    <th
                      className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort("HelperName")}
                    >
                      <div className="flex items-center gap-1">
                        Helper{" "}
                        {sortField === "HelperName" &&
                          (sortDirection === "asc" ? (
                            <TbArrowUp size={12} />
                          ) : (
                            <TbArrowDown size={12} />
                          ))}
                      </div>
                    </th>
                    <th
                      className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort("TruckPlate")}
                    >
                      <div className="flex items-center gap-1">
                        Truck{" "}
                        {sortField === "TruckPlate" &&
                          (sortDirection === "asc" ? (
                            <TbArrowUp size={12} />
                          ) : (
                            <TbArrowDown size={12} />
                          ))}
                      </div>
                    </th>
                    <th
                      className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort("DeliveryStatus")}
                    >
                      <div className="flex items-center gap-1">
                        Status{" "}
                        {sortField === "DeliveryStatus" &&
                          (sortDirection === "asc" ? (
                            <TbArrowUp size={12} />
                          ) : (
                            <TbArrowDown size={12} />
                          ))}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {getSortedAndPaginatedDeliveries().map((delivery) => (
                    <tr
                      key={delivery.DeliveryID}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                            <TbTruckDelivery size={16} />
                          </div>
                          <span className="font-medium text-gray-900 text-sm">
                            {delivery.DeliveryID
                              ? delivery.DeliveryID.substring(0, 12)
                              : "N/A"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                        {delivery.ClientName || "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {delivery.DriverName || "Not Assigned"}
                          </p>
                          <span className="text-xs text-gray-400 capitalize">
                            {formatDriverStatus(
                              delivery.DriverStatus,
                              delivery.DriverApprovalStatus,
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {delivery.HelperName || "Not Assigned"}
                          </p>
                          <span className="text-xs text-gray-400 capitalize">
                            {formatHelperStatus(
                              delivery.HelperStatus,
                              delivery.HelperApprovalStatus,
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                        {delivery.TruckPlate || "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge
                          status={delivery.DeliveryStatus || "unknown"}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            to={`/admin/deliveries/${delivery.DeliveryID || ""}/view`}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <TbEye size={18} />
                          </Link>
                          <button
                            onClick={() => {
                              const truckIdentifier =
                                delivery.TruckPlate || delivery.TruckID;
                              if (!truckIdentifier) {
                                showAlert(
                                  "No truck assigned to this delivery",
                                  "warning",
                                );
                                return;
                              }
                              setSelectedDeliveryId(delivery.DeliveryID);
                              setSelectedTruckId(truckIdentifier);
                              window.currentDeliveryData = delivery;
                              setShowTrackingModal(true);
                            }}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Track Live GPS"
                          >
                            <TbMapPin size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-4">
                <TbPackage size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-1">
                No deliveries found
              </h3>
              <p className="text-gray-500 max-w-sm">
                No delivery records match your current criteria. Try adjusting
                your filters.
              </p>
              <button
                onClick={() => {
                  setStatusFilter("all");
                  setSearchQuery("");
                  setStartDate("");
                  setEndDate("");
                }}
                className="mt-6 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/30">
              <span className="text-sm text-gray-500">
                Page{" "}
                <span className="font-medium text-gray-900">{currentPage}</span>{" "}
                of{" "}
                <span className="font-medium text-gray-900">{totalPages}</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <TbChevronLeft size={16} />
                </button>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="p-2 border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <TbChevronRight size={16} />
                </button>
              </div>
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

export default DeliveryList;
