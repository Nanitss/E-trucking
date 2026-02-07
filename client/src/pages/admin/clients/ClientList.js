import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  TbBuilding,
  TbEye,
  TbEdit,
  TbTruck,
  TbChartBar,
  TbUser,
  TbMail,
  TbPhone,
  TbCalendar,
  TbCheck,
  TbX,
  TbClock,
  TbAlertCircle,
  TbFileText,
  TbActivity,
  TbArrowUp,
  TbArrowDown,
  TbFilter,
  TbList,
  TbLayoutGrid,
  TbSearch,
} from "react-icons/tb";
import { useTimeframe } from "../../../contexts/TimeframeContext";
import AdminHeader from "../../../components/common/AdminHeader";
import PersonnelSubNav from "../../../components/common/PersonnelSubNav";
import StatusBadge from "../../../components/common/StatusBadge";
import { API_BASE_URL } from "../../../config/api";

const ClientList = ({ currentUser }) => {
  const { isWithinTimeframe, getFormattedDateRange } = useTimeframe();

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedClient, setSelectedClient] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState("table"); // 'table' or 'cards'
  const [sortField, setSortField] = useState("ClientName");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const clientsPerPage = 20;

  // Calculate active filters count
  const activeFilterCount = [
    statusFilter !== "all" ? statusFilter : null,
  ].filter(Boolean).length;

  // Overdue payment tracking
  const [clientPayments, setClientPayments] = useState({});
  const OVERDUE_PAYMENT_THRESHOLD = 3;

  // Handle viewing client details
  const handleViewDetails = (client) => {
    setSelectedClient(client);
    setShowDetailsModal(true);
  };

  // Close details modal
  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedClient(null);
  };

  // Fetch payment data for all clients
  const fetchAllClientPayments = async (clientsList) => {
    try {
      const token = localStorage.getItem("token");
      const baseURL = API_BASE_URL;
      const paymentsData = {};

      for (const client of clientsList) {
        try {
          const response = await axios.get(
            `${baseURL}/api/payments/client/${client.ClientID}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );

          const payments = response.data.payments || [];

          // Calculate overdue payments
          const currentDate = new Date();
          const overduePayments = payments.filter((payment) => {
            const dueDate = new Date(payment.dueDate);
            return currentDate > dueDate && payment.status !== "paid";
          });

          paymentsData[client.ClientID] = {
            overdueCount: overduePayments.length,
            overdueAmount: overduePayments.reduce(
              (sum, p) => sum + (p.amount || 0),
              0,
            ),
            hasOverdueRisk: overduePayments.length >= OVERDUE_PAYMENT_THRESHOLD,
          };

          console.log(
            `Client ${client.ClientName}: ${overduePayments.length} overdue payments`,
          );
        } catch (err) {
          console.warn(
            `Failed to fetch payments for client ${client.ClientID}:`,
            err.message,
          );
        }
      }

      setClientPayments(paymentsData);
    } catch (error) {
      console.error("Error fetching client payments:", error);
    }
  };

  // Fetch clients on component mount
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("Fetching clients from API...");
        const baseURL = API_BASE_URL;
        console.log("API Base URL:", baseURL);

        const response = await axios.get(`${baseURL}/api/clients`);
        console.log("API Response:", response.data);

        if (response.data && Array.isArray(response.data)) {
          // Map the response data to standardize field names
          const formattedClients = response.data.map((client) => ({
            ClientID: client.id || client.ClientID,
            ClientName: client.clientName || client.ClientName,
            ClientEmail: client.clientEmail || client.ClientEmail,
            ClientNumber: client.clientNumber || client.ClientNumber,
            ClientStatus:
              client.clientStatus || client.ClientStatus || "active",
            ClientCreationDate:
              client.clientCreationDate || client.ClientCreationDate,
            UserID: client.userId || client.UserID,
          }));
          setClients(formattedClients);
          console.log("Clients loaded:", formattedClients.length);

          // Fetch payment data for each client
          fetchAllClientPayments(formattedClients);
        } else {
          console.warn("API returned unexpected data format:", response.data);
          setClients([]);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching clients:", err);

        // More specific error handling
        if (err.code === "ERR_NETWORK") {
          setError(
            "Network error. Please check your connection and try again.",
          );
        } else if (err.response) {
          if (err.response.status === 404) {
            setError(
              "Client data not found. The API endpoint may not be configured properly.",
            );
          } else if (err.response.status === 500) {
            setError("Server error. Please try again later.");
          } else {
            setError(
              `Server error (${err.response.status}): ${err.response.data?.message || "Unknown error"}`,
            );
          }
        } else if (err.request) {
          setError(
            "No response received from server. Please check if the backend is running.",
          );
        } else {
          setError(`Request error: ${err.message}`);
        }

        setLoading(false);
        setClients([]);
      }
    };

    fetchClients();
  }, []);

  // Filter clients based on search, status, and timeframe
  const filteredClients = useMemo(() => {
    let filtered = clients;

    // Apply timeframe filter - only filter if there's a specific timeframe selected
    if (isWithinTimeframe) {
      filtered = filtered.filter((client) => {
        if (client.CreatedAt || client.createdAt || client.registrationDate) {
          return isWithinTimeframe(
            client.CreatedAt || client.createdAt || client.registrationDate,
          );
        }
        // If no creation date, include the client (don't exclude it)
        return true;
      });
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (client) =>
          client.ClientStatus?.toLowerCase() === statusFilter.toLowerCase(),
      );
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (client) =>
          client.ClientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.ClientEmail?.toLowerCase().includes(
            searchTerm.toLowerCase(),
          ) ||
          client.ClientNumber?.includes(searchTerm),
      );
    }

    return filtered;
  }, [clients, searchTerm, statusFilter, isWithinTimeframe]);

  // Sorting function
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Get sorted and paginated clients
  const getSortedAndPaginatedClients = () => {
    let sorted = [...filteredClients];

    // Sort
    sorted.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    // Paginate
    const startIndex = (currentPage - 1) * clientsPerPage;
    const endIndex = startIndex + clientsPerPage;
    return sorted.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredClients.length / clientsPerPage);

  // Get summary data
  const getSummaryData = () => {
    const total = clients.length;
    const active = clients.filter(
      (c) => c.ClientStatus?.toLowerCase() === "active",
    ).length;
    const inactive = clients.filter(
      (c) => c.ClientStatus?.toLowerCase() === "inactive",
    ).length;
    const pending = clients.filter(
      (c) => c.ClientStatus?.toLowerCase() === "pending",
    ).length;

    return { total, active, inactive, pending };
  };

  const summaryData = getSummaryData();

  // Get unique statuses for filter dropdown
  const uniqueStatuses = [
    ...new Set(clients.map((c) => c.ClientStatus).filter(Boolean)),
  ];

  // Handle error dismissal
  const dismissError = () => {
    setError(null);
  };

  // Handle retry
  const retryFetch = () => {
    setError(null);
    setLoading(true);
    // Re-run the effect
    const fetchClients = async () => {
      try {
        const baseURL = API_BASE_URL;
        const response = await axios.get(`${baseURL}/api/clients`);

        if (response.data && Array.isArray(response.data)) {
          // Map the response data to standardize field names
          const formattedClients = response.data.map((client) => ({
            ClientID: client.id || client.ClientID,
            ClientName: client.clientName || client.ClientName,
            ClientEmail: client.clientEmail || client.ClientEmail,
            ClientNumber: client.clientNumber || client.ClientNumber,
            ClientStatus:
              client.clientStatus || client.ClientStatus || "active",
            ClientCreationDate:
              client.clientCreationDate || client.ClientCreationDate,
            UserID: client.userId || client.UserID,
          }));
          setClients(formattedClients);
        } else {
          setClients([]);
        }
        setLoading(false);
      } catch (err) {
        console.error("Retry failed:", err);
        setError("Retry failed. Please check your connection and try again.");
        setLoading(false);
      }
    };
    fetchClients();
  };

  // Helper function to format status
  const formatStatus = (status) => {
    if (!status) return "Unknown";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Helper function to get status badge class
  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "status-active";
      case "inactive":
        return "status-inactive";
      case "pending":
        return "status-pending";
      default:
        return "status-unknown";
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Loading clients data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AdminHeader currentUser={null} />
      <PersonnelSubNav activeTab="clients" />

      <div className="flex-1 p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
        {/* Greeting and Summary Cards */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Clients Management
          </h2>
          <p className="text-gray-500 mt-1">
            Manage client accounts, contracts, and business relationships
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 shadow-sm">
            <TbCalendar size={16} className="text-gray-400" />
            <span>
              Showing data for:{" "}
              <span className="font-medium text-gray-900">
                {getFormattedDateRange()}
              </span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <TbBuilding size={22} />
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                  <TbArrowUp size={12} />
                  +4.1%
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {clients.length}
                </div>
                <div className="text-sm text-gray-500 font-medium">
                  Total Clients
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                  <TbCheck size={22} />
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                  <TbArrowUp size={12} />
                  +2.4%
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {clients.filter((c) => c.ClientStatus === "active").length}
                </div>
                <div className="text-sm text-gray-500 font-medium">Active</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-gray-50 text-gray-600 rounded-xl flex items-center justify-center">
                  <TbClock size={22} />
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                  <TbActivity size={12} />
                  0.0%
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {clients.filter((c) => c.ClientStatus === "inactive").length}
                </div>
                <div className="text-sm text-gray-500 font-medium">
                  Inactive
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                  <TbAlertCircle size={22} />
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                  <TbArrowUp size={12} />
                  +1.2%
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {clients.filter((c) => c.ClientStatus === "pending").length}
                </div>
                <div className="text-sm text-gray-500 font-medium">Pending</div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
            <div style={{ marginTop: "10px" }}>
              <button
                onClick={dismissError}
                className="btn btn-secondary btn-sm"
                style={{ marginRight: "10px" }}
              >
                Dismiss
              </button>
              <button onClick={retryFetch} className="btn btn-primary btn-sm">
                Retry
              </button>
            </div>
            <button onClick={dismissError} className="close-btn">
              ×
            </button>
          </div>
        )}

        {/* Modern Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
          {/* Search (Top Left) */}
          <div className="relative flex-1 max-w-lg w-full">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <TbSearch size={20} />
            </div>
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Filter Toggle Button */}
            <button
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-medium ${showFilters ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <TbFilter size={18} />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200">
              <button
                onClick={() => setViewMode("table")}
                className={`p-2 rounded-md transition-all ${viewMode === "table" ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                title="Table View"
              >
                <TbList size={18} />
              </button>
              <button
                onClick={() => setViewMode("cards")}
                className={`p-2 rounded-md transition-all ${viewMode === "cards" ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                title="Card View"
              >
                <TbLayoutGrid size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 text-gray-500 text-sm font-medium mb-6">
          Showing {filteredClients.length} of {clients.length} clients
        </div>

        {/* Filter Popup */}
        {showFilters && (
          <div className="relative mb-6">
            <div className="absolute top-0 right-0 md:left-0 z-50 bg-white rounded-xl shadow-xl border border-gray-100 w-80 max-w-[90vw] p-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-gray-900 text-lg">
                  Filter Options
                </h4>
                <button
                  className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                  onClick={() => setShowFilters(false)}
                >
                  <TbX size={20} />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                {/* Status Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="all">All Status</option>
                    {uniqueStatuses.map((status) => (
                      <option key={status} value={status}>
                        {formatStatus(status)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                  }}
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Client Cards */}
        {filteredClients.length === 0 && !loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400">
              <TbBuilding size={40} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              No clients found
            </h3>
            <p className="text-gray-500 max-w-md mx-auto mb-8">
              {searchTerm || statusFilter !== "all"
                ? "No clients match your current filters. Try adjusting your search criteria."
                : "No client records found. Add your first client to get started."}
            </p>
            <Link
              to="/admin/clients/add"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all shadow-sm shadow-blue-200"
            >
              <TbUser size={20} />
              Add Your First Client
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Client Name
                    </th>
                    <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {getSortedAndPaginatedClients().map((client) => {
                    const paymentData = clientPayments[client.ClientID] || {};
                    const hasOverdueRisk = paymentData.hasOverdueRisk || false;
                    const overdueCount = paymentData.overdueCount || 0;

                    return (
                      <tr
                        key={client.ClientID}
                        className={`hover:bg-gray-50/80 transition-colors group ${hasOverdueRisk ? "bg-red-50/50 border-l-4 border-red-500" : ""}`}
                        title={
                          hasOverdueRisk
                            ? `⚠️ ${overdueCount} overdue payments`
                            : ""
                        }
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                              <TbBuilding size={18} />
                            </div>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900">
                                  {client.ClientName}
                                </span>
                                {hasOverdueRisk && (
                                  <span
                                    className="text-red-500"
                                    title={`${overdueCount} overdue payments`}
                                  >
                                    <TbAlertCircle size={16} />
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-600">
                          {client.ClientEmail || "N/A"}
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-600">
                          {client.ClientNumber || "N/A"}
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-600">
                          {client.ClientCreationDate
                            ? new Date(
                              client.ClientCreationDate,
                            ).toLocaleDateString()
                            : "N/A"}
                        </td>
                        <td className="py-4 px-6">
                          <StatusBadge status={client.ClientStatus || "Active"} />
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleViewDetails(client)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <TbEye size={18} />
                            </button>
                            <Link
                              to={`/admin/clients/edit/${client.ClientID}`}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Edit Client"
                            >
                              <TbEdit size={18} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="text-sm text-gray-500">
                  Showing{" "}
                  <span className="font-medium text-gray-900">
                    {currentPage}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-gray-900">
                    {totalPages}
                  </span>{" "}
                  pages
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-white hover:text-blue-600 hover:border-blue-200 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-600 transition-all"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-white hover:text-blue-600 hover:border-blue-200 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-600 transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Client Details Modal */}
        {showDetailsModal && selectedClient && (
          <div className="modal-overlay" onClick={closeDetailsModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>🏢 {selectedClient.ClientName} Details</h2>
                <button className="modal-close-btn" onClick={closeDetailsModal}>
                  ✕
                </button>
              </div>

              <div className="modal-body">
                <div className="details-grid">
                  {/* Basic Information */}
                  <div className="details-section">
                    <h3>📋 Basic Information</h3>
                    <div className="details-items">
                      <div className="detail-item">
                        <span className="detail-label">Client ID:</span>
                        <span className="detail-value">
                          {selectedClient.ClientID}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Client Name:</span>
                        <span className="detail-value">
                          {selectedClient.ClientName}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Email:</span>
                        <span className="detail-value">
                          {selectedClient.ClientEmail || "Not provided"}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Phone Number:</span>
                        <span className="detail-value">
                          {selectedClient.ClientNumber || "Not provided"}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">User ID:</span>
                        <span className="detail-value">
                          {selectedClient.UserID || "Not linked"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Information */}
                  <div className="details-section">
                    <h3>🚦 Status Information</h3>
                    <div className="details-items">
                      <div className="detail-item">
                        <span className="detail-label">Current Status:</span>
                        <span
                          className={`detail-badge status-${selectedClient.ClientStatus?.toLowerCase() || "unknown"}`}
                        >
                          {formatStatus(selectedClient.ClientStatus)}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Account Created:</span>
                        <span className="detail-value">
                          {selectedClient.ClientCreationDate
                            ? new Date(
                              selectedClient.ClientCreationDate,
                            ).toLocaleDateString()
                            : "Unknown"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <Link
                  to={`/admin/clients/edit/${selectedClient.ClientID}`}
                  className="modern-btn modern-btn-primary"
                >
                  ✎ Edit Client
                </Link>
                <Link
                  to={`/admin/clients/${selectedClient.ClientID}/trucks`}
                  className="modern-btn modern-btn-secondary"
                >
                  🚛 Manage Trucks
                </Link>
                <button
                  className="modern-btn modern-btn-secondary"
                  onClick={closeDetailsModal}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientList;
