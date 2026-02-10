// src/pages/admin/helpers/HelpersList.js - Tailwind UI matching DriversList

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  TbUser,
  TbEye,
  TbEdit,
  TbCheck,
  TbX,
  TbFileText,
  TbActivity,
  TbArrowUp,
  TbArrowDown,
  TbList,
  TbLayoutGrid,
  TbFilter,
  TbFilterOff,
  TbSearch,
  TbPlus,
  TbCalendar,
  TbTruck,
  TbAlertCircle,
} from "react-icons/tb";
import { useTimeframe } from "../../../contexts/TimeframeContext";
import FileViewer from "../../../components/FileViewer";
import AdminHeader from "../../../components/common/AdminHeader";
import PersonnelSubNav from "../../../components/common/PersonnelSubNav";
import StatusBadge from "../../../components/common/StatusBadge";
import { API_BASE_URL } from "../../../config/api";

const HelpersList = ({ currentUser }) => {
  const baseURL = API_BASE_URL;
  const { isWithinTimeframe, getFormattedDateRange } = useTimeframe();

  const [helpers, setHelpers] = useState([]);
  const [filteredHelpers, setFilteredHelpers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHelper, setSelectedHelper] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [viewMode, setViewMode] = useState("table");
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const helpersPerPage = 20;
  const [showFilters, setShowFilters] = useState(false);

  // Calculate active filters count
  const activeFilterCount = [
    statusFilter !== "all" ? statusFilter : null,
  ].filter(Boolean).length;

  // Handle viewing helper details
  const handleViewDetails = (helper) => {
    setSelectedHelper(helper);
    setShowDetailsModal(true);
  };

  // Close details modal
  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedHelper(null);
  };

  // Sorting function
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Get sorted and paginated helpers
  const getSortedAndPaginatedHelpers = () => {
    let sorted = [...filteredHelpers];

    // Sort
    sorted.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle special cases
      if (sortField === "documentCompliance") {
        aVal = a.documentCompliance?.requiredDocumentCount || 0;
        bVal = b.documentCompliance?.requiredDocumentCount || 0;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    // Paginate
    const startIndex = (currentPage - 1) * helpersPerPage;
    const endIndex = startIndex + helpersPerPage;
    return sorted.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredHelpers.length / helpersPerPage);

  // Fetch helpers data
  useEffect(() => {
    const fetchHelpers = async () => {
      try {
        setLoading(true);

        // Get helpers with actual documents from file system (all in one call)
        const response = await axios.get(
          `${baseURL}/api/simple-files/helpers-with-documents`,
        );
        console.log(
          "Raw API response (helpers with actual documents):",
          response.data,
        );

        // Handle both array response and object with helpers property
        const helpersData = Array.isArray(response.data)
          ? response.data
          : response.data.helpers;

        if (helpersData && helpersData.length > 0) {
          const formattedHelpers = helpersData.map((helper) => {
            console.log("Processing helper data:", helper);
            console.log("📊 Document Compliance:", helper.documentCompliance);
            console.log("📁 Documents:", helper.documents);
            return {
              id: helper.id || helper.HelperID,
              name: helper.name || helper.HelperName,
              contactNumber: helper.contactNumber || helper.HelperNumber,
              address: helper.address || helper.HelperAddress,
              status: helper.status || helper.HelperStatus || "Active",
              employmentDate:
                helper.employmentDate || helper.HelperEmploymentDate,
              licenseType: helper.licenseType || "Class C",
              licenseNumber: helper.licenseNumber || "",
              licenseExpiryDate: helper.licenseExpiryDate || "",
              documents: helper.documents || {},
              documentCompliance: (() => {
                const docs = helper.documents || {};
                const requiredDocs = ["validId", "barangayClearance"];
                const optionalDocs = ["medicalCertificate", "helperLicense"];
                const requiredCount = requiredDocs.filter((d) => docs[d]).length;
                const optionalCount = optionalDocs.filter((d) => docs[d]).length;
                let overallStatus = "pending";
                if (requiredCount === 2) overallStatus = "complete";
                else if (requiredCount > 0) overallStatus = "incomplete";
                return {
                  documentCount: requiredCount + optionalCount,
                  requiredDocumentCount: requiredCount,
                  optionalDocumentCount: optionalCount,
                  overallStatus,
                };
              })(),
            };
          });

          setHelpers(formattedHelpers);
        } else {
          console.log("No helpers data received, setting empty array");
          setHelpers([]);
        }
      } catch (err) {
        console.error("Error fetching helpers:", err);
        setError(`Failed to fetch helpers: ${err.message}`);
        setHelpers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHelpers();
  }, [baseURL]);

  // Calculate status counts
  const statusCounts = {
    total: helpers.length,
    active: helpers.filter((helper) => helper.status === "Active").length,
    inactive: helpers.filter((helper) => helper.status === "Inactive").length,
    onLeave: helpers.filter((helper) => helper.status === "On Leave").length,
    terminated: helpers.filter((helper) => helper.status === "Terminated")
      .length,
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...helpers];

    // Apply timeframe filter - only filter if there's a specific timeframe selected
    if (isWithinTimeframe) {
      filtered = filtered.filter((helper) => {
        if (helper.employmentDate) {
          return isWithinTimeframe(helper.employmentDate);
        }
        // If no employment date, include the helper (don't exclude it)
        return true;
      });
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((helper) => {
        const normalizedHelperStatus = helper.status
          ?.toLowerCase()
          .replace(/[\s-]/g, "");
        const normalizedFilter = statusFilter
          .toLowerCase()
          .replace(/[\s-]/g, "");
        return normalizedHelperStatus === normalizedFilter;
      });
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (helper) =>
          helper.name?.toLowerCase().includes(query) ||
          helper.contactNumber?.includes(query) ||
          helper.licenseType?.toLowerCase().includes(query) ||
          helper.address?.toLowerCase().includes(query),
      );
    }

    setFilteredHelpers(filtered);
  }, [helpers, statusFilter, searchQuery, isWithinTimeframe]);

  // Helper functions for compliance
  const getComplianceClass = (helper) => {
    if (!helper.documentCompliance) return "bg-gray-50 border-gray-200 text-gray-700";
    const status = helper.documentCompliance.overallStatus;
    if (status === "complete") return "bg-emerald-50 border-emerald-200 text-emerald-700";
    if (status === "incomplete") return "bg-amber-50 border-amber-200 text-amber-700";
    return "bg-gray-50 border-gray-200 text-gray-700";
  };

  const getComplianceIcon = (helper) => {
    if (!helper.documentCompliance) return <TbAlertCircle className="text-gray-400" size={16} />;
    const status = helper.documentCompliance.overallStatus;
    if (status === "complete") return <TbCheck className="text-emerald-600" size={16} />;
    if (status === "incomplete") return <TbAlertCircle className="text-amber-600" size={16} />;
    return <TbAlertCircle className="text-gray-400" size={16} />;
  };

  const getComplianceStatus = (helper) => {
    if (!helper.documentCompliance) return "Compliance Pending";
    const status = helper.documentCompliance.overallStatus;
    if (status === "complete") return "Compliance Complete";
    if (status === "incomplete") return "Compliance Incomplete";
    return "Compliance Pending";
  };

  const getComplianceDetails = (helper) => {
    if (!helper.documentCompliance) return "No compliance data";
    const {
      requiredDocumentCount = 0,
      optionalDocumentCount = 0,
      overallStatus = "pending",
    } = helper.documentCompliance;
    return `${requiredDocumentCount} required, ${optionalDocumentCount} optional - ${overallStatus}`;
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Loading helpers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AdminHeader currentUser={currentUser} />
      <PersonnelSubNav activeTab="helpers" />

      <div className="flex-1 p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
        {/* Greeting and Summary Cards */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Helpers Management
          </h2>
          <p className="text-gray-500 mt-1">
            Manage helpers, assistant drivers, and support personnel
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
                  <TbUser size={22} />
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                  <TbArrowUp size={12} />
                  +2.5%
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {helpers.length}
                </div>
                <div className="text-sm text-gray-500 font-medium">
                  Total Helpers
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
                  +1.8%
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {
                    helpers.filter((h) => h.status?.toLowerCase() === "active")
                      .length
                  }
                </div>
                <div className="text-sm text-gray-500 font-medium">Active</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                  <TbTruck size={22} />
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                  <TbActivity size={12} />
                  0.0%
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {
                    helpers.filter((h) => {
                      const status = h.status
                        ?.toLowerCase()
                        .replace(/[\s-]/g, "");
                      return status === "ondelivery";
                    }).length
                  }
                </div>
                <div className="text-sm text-gray-500 font-medium">
                  On Delivery
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                  <TbFileText size={22} />
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                  <TbArrowDown size={12} />
                  -0.3%
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {
                    helpers.filter(
                      (h) =>
                        h.licenseExpiryDate &&
                        new Date(h.licenseExpiryDate) < new Date(),
                    ).length
                  }
                </div>
                <div className="text-sm text-gray-500 font-medium">
                  Expired Licenses
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
          <div className="relative flex-1 max-w-lg w-full">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <TbSearch size={20} />
            </div>
            <input
              type="text"
              placeholder="Search by name, contact, license..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
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
          Showing {filteredHelpers.length} of {helpers.length} helpers
        </div>

        <div className="relative mb-6">
          {/* Filter Popup */}
          {showFilters && (
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
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="On Leave">On Leave</option>
                    <option value="On Delivery">On Delivery</option>
                    <option value="Terminated">Terminated</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                  onClick={() => {
                    setStatusFilter("all");
                    setSearchQuery("");
                  }}
                >
                  <TbFilterOff size={16} /> Reset
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

        {/* Helpers Content */}
        {filteredHelpers.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400">
              <TbUser size={40} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              No helpers found
            </h3>
            <p className="text-gray-500 max-w-md mx-auto mb-8">
              No helpers match your current filters. Try adjusting your search
              criteria or add a new helper.
            </p>
            <Link
              to="/admin/helpers/add"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm shadow-blue-200 transition-colors"
            >
              <TbPlus size={20} /> Add Your First Helper
            </Link>
          </div>
        ) : viewMode === "table" ? (
          // TABLE VIEW
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th
                      onClick={() => handleSort("name")}
                      className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Helper Name{" "}
                        {sortField === "name" &&
                          (sortDirection === "asc" ? (
                            <TbArrowUp size={14} />
                          ) : (
                            <TbArrowDown size={14} />
                          ))}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("contactNumber")}
                      className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Contact{" "}
                        {sortField === "contactNumber" &&
                          (sortDirection === "asc" ? (
                            <TbArrowUp size={14} />
                          ) : (
                            <TbArrowDown size={14} />
                          ))}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("licenseType")}
                      className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        License Type{" "}
                        {sortField === "licenseType" &&
                          (sortDirection === "asc" ? (
                            <TbArrowUp size={14} />
                          ) : (
                            <TbArrowDown size={14} />
                          ))}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("licenseNumber")}
                      className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        License #{" "}
                        {sortField === "licenseNumber" &&
                          (sortDirection === "asc" ? (
                            <TbArrowUp size={14} />
                          ) : (
                            <TbArrowDown size={14} />
                          ))}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("status")}
                      className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Status{" "}
                        {sortField === "status" &&
                          (sortDirection === "asc" ? (
                            <TbArrowUp size={14} />
                          ) : (
                            <TbArrowDown size={14} />
                          ))}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("documentCompliance")}
                      className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      Compliance{" "}
                      {sortField === "documentCompliance" &&
                        (sortDirection === "asc" ? (
                          <TbArrowUp size={14} />
                        ) : (
                          <TbArrowDown size={14} />
                        ))}
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {getSortedAndPaginatedHelpers().map((helper) => (
                    <tr
                      key={helper.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                            {helper.name?.charAt(0) || "H"}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {helper.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              ID: {helper.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {helper.contactNumber || "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-0.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold border border-gray-200">
                          {helper.licenseType || "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-gray-600">
                        {helper.licenseNumber || "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={helper.status || "Active"} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {getComplianceIcon(helper)}
                          </span>
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-gray-900">
                              {helper.documentCompliance
                                ?.requiredDocumentCount || 0}
                              /2
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewDetails(helper)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <TbEye size={18} />
                          </button>
                          <Link
                            to={`/admin/helpers/edit/${helper.id}`}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit Helper"
                          >
                            <TbEdit size={18} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium shadow-sm"
                >
                  ← Previous
                </button>
                <span className="text-sm text-gray-600 font-medium">
                  Page {currentPage} of {totalPages} ({filteredHelpers.length}{" "}
                  helpers)
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium shadow-sm"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        ) : (
          // CARD VIEW
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredHelpers.map((helper) => (
              <div
                key={helper.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group"
              >
                {/* Card Header */}
                <div className="p-5 border-b border-gray-50 flex justify-between items-start gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <TbUser size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">
                        {helper.name}
                      </h3>
                      <p className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded mt-1 inline-block capitalize">
                        {helper.licenseType || "No License"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={helper.status || "Active"} />
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="block text-xs text-gray-500 mb-1">
                        Contact
                      </span>
                      <span
                        className="font-medium text-gray-900 truncate block text-sm"
                        title={helper.contactNumber}
                      >
                        {helper.contactNumber || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-500 mb-1">
                        License #
                      </span>
                      <span className="font-mono text-xs font-semibold text-gray-700 bg-gray-50 px-2 py-1 rounded border border-gray-200 block w-fit">
                        {helper.licenseNumber || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-500 mb-1">
                        Expiry
                      </span>
                      <span className="font-medium text-gray-900 text-sm">
                        {helper.licenseExpiryDate
                          ? new Date(
                            helper.licenseExpiryDate,
                          ).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-500 mb-1">
                        Hired
                      </span>
                      <span className="font-medium text-gray-900 text-sm">
                        {helper.employmentDate
                          ? new Date(
                            helper.employmentDate,
                          ).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </div>
                  </div>

                  {/* Compliance Section */}
                  <div
                    className={`p-3 rounded-xl border ${getComplianceClass(helper)}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {getComplianceIcon(helper)}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-bold opacity-90 mb-0.5">
                          {getComplianceStatus(helper)}
                        </div>
                        <div className="text-xs opacity-75">
                          {getComplianceDetails(helper)}
                        </div>

                        <div className="mt-2 text-xs flex items-center justify-between border-t border-black/5 pt-2">
                          <span className="font-medium flex items-center gap-1 opacity-80">
                            <TbFileText size={12} />
                            {Object.keys(helper.documents || {}).length} files
                          </span>
                          <span className="font-medium opacity-80">
                            {helper.documentCompliance
                              ?.requiredDocumentCount || 0}
                            /2 required
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 grid grid-cols-2 gap-3">
                  {helper.id ? (
                    <Link
                      to={`/admin/helpers/edit/${helper.id}`}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all text-sm font-medium shadow-sm"
                    >
                      <TbEdit size={16} />
                      Edit
                    </Link>
                  ) : (
                    <button
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 border border-gray-200 text-gray-400 rounded-lg cursor-not-allowed text-sm font-medium shadow-sm"
                      disabled
                      title="Helper ID missing"
                    >
                      <TbEdit size={16} />
                      Edit
                    </button>
                  )}
                  <button
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-medium shadow-sm shadow-blue-200"
                    onClick={() => handleViewDetails(helper)}
                  >
                    <TbEye size={16} />
                    Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Helper Details Modal */}
        {showDetailsModal && selectedHelper && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={closeDetailsModal}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                    <TbUser size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedHelper.name} Details
                    </h2>
                    <p className="text-sm text-gray-500">
                      View complete helper information and documents
                    </p>
                  </div>
                </div>
                <button
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                  onClick={closeDetailsModal}
                >
                  <TbX size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Personal & Employment Information */}
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                        👤 Personal Information
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                        <div>
                          <span className="text-xs text-gray-500 block mb-1">
                            Full Name
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {selectedHelper.name}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 block mb-1">
                            Contact Number
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {selectedHelper.contactNumber || "N/A"}
                          </span>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-xs text-gray-500 block mb-1">
                            Address
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {selectedHelper.address || "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 block mb-1">
                            Current Status
                          </span>
                          <StatusBadge status={selectedHelper.status || "Active"} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                        💼 Employment Information
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                        <div>
                          <span className="text-xs text-gray-500 block mb-1">
                            Employment Date
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {selectedHelper.employmentDate
                              ? new Date(
                                selectedHelper.employmentDate,
                              ).toLocaleDateString()
                              : "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* License & Documents */}
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                        📜 License Information
                      </h3>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                          <div>
                            <span className="text-xs text-gray-500 block mb-1">
                              License Type
                            </span>
                            <span className="text-sm font-bold text-gray-900">
                              {selectedHelper.licenseType || "N/A"}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500 block mb-1">
                              License Number
                            </span>
                            <span className="text-sm font-mono font-bold text-gray-700 bg-white px-2 py-1 rounded border border-gray-200 inline-block">
                              {selectedHelper.licenseNumber || "N/A"}
                            </span>
                          </div>
                          <div className="sm:col-span-2">
                            <span className="text-xs text-gray-500 block mb-1">
                              Expiry Date
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              {selectedHelper.licenseExpiryDate
                                ? new Date(
                                  selectedHelper.licenseExpiryDate,
                                ).toLocaleDateString()
                                : "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                        📄 Compliance Status
                      </h3>

                      <div
                        className={`p-4 rounded-xl border mb-6 ${getComplianceClass(selectedHelper)}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {getComplianceIcon(selectedHelper)}
                          </div>
                          <div>
                            <div className="font-bold text-sm mb-1">
                              {getComplianceStatus(selectedHelper)}
                            </div>
                            <div className="text-xs opacity-80">
                              {getComplianceDetails(selectedHelper)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                          <span className="text-sm text-gray-700">
                            Valid ID
                          </span>
                          {selectedHelper.documents?.validId ? (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                              <TbCheck size={12} /> Complete
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-100">
                              <TbX size={12} /> Missing
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                          <span className="text-sm text-gray-700">
                            Barangay Clearance
                          </span>
                          {selectedHelper.documents?.barangayClearance ? (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                              <TbCheck size={12} /> Complete
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-100">
                              <TbX size={12} /> Missing
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                          <span className="text-sm text-gray-700">
                            Medical Certificate
                          </span>
                          {selectedHelper.documents?.medicalCertificate ? (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                              <TbCheck size={12} /> Complete
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200">
                              Optional
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                          <span className="text-sm text-gray-700">
                            Helper License
                          </span>
                          {selectedHelper.documents?.helperLicense ? (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                              <TbCheck size={12} /> Complete
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200">
                              Optional
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Documents Viewer Section */}
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center justify-between">
                    <span>📁 Uploaded Documents</span>
                    <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                      {selectedHelper.documentCompliance?.documentCount || 0}{" "}
                      files uploaded
                    </span>
                  </h3>

                  {selectedHelper.documents &&
                    Object.keys(selectedHelper.documents).length > 0 ? (
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <FileViewer
                        documents={selectedHelper.documents}
                        entityType="helper"
                        entityName={selectedHelper.name}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400">
                      <TbFileText
                        size={32}
                        className="mx-auto mb-2 opacity-50"
                      />
                      <p className="mb-4">
                        No documents have been uploaded for this helper yet.
                      </p>
                      <Link
                        to={`/admin/helpers/edit/${selectedHelper.id}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                      >
                        <TbEdit size={16} /> Upload Documents
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                <Link
                  to={`/admin/helpers/edit/${selectedHelper.id}`}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm shadow-blue-200 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <TbEdit size={16} /> Edit Helper
                </Link>
                <button
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium shadow-sm"
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

export default HelpersList;
