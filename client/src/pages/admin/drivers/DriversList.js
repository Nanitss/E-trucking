import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  TbUser,
  TbEye,
  TbEdit,
  TbTruck,
  TbChartBar,
  TbMail,
  TbPhone,
  TbCalendar,
  TbCheck,
  TbX,
  TbClock,
  TbList,
  TbLayoutGrid,
  TbAlertCircle,
  TbFileText,
  TbPlus,
  TbActivity,
  TbId,
  TbArrowUp,
  TbArrowDown,
  TbFilter,
  TbFilterOff,
  TbSearch,
} from "react-icons/tb";
import { useTimeframe } from "../../../contexts/TimeframeContext";
import { useExportData } from "../../../contexts/ExportDataContext";
import DriverForm from "./DriverForm";
import FileViewer from "../../../components/FileViewer";
import AdminHeader from "../../../components/common/AdminHeader";
import PersonnelSubNav from "../../../components/common/PersonnelSubNav";
import StatusBadge from "../../../components/common/StatusBadge";
import { API_BASE_URL } from "../../../config/api";

const DriversList = ({ currentUser }) => {
  const { isWithinTimeframe, getFormattedDateRange } = useTimeframe();
  const { updateExportData } = useExportData();

  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filteredDrivers, setFilteredDrivers] = useState([]);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Calculate active filters count
  const activeFilterCount = [
    statusFilter !== "all" ? statusFilter : null,
  ].filter(Boolean).length;

  const [viewMode, setViewMode] = useState("table"); // 'table' or 'cards'
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const driversPerPage = 20;
  const baseURL = API_BASE_URL;

  // Helper function to calculate document compliance
  const calculateDocumentCompliance = (documents) => {
    if (!documents)
      return {
        documentCount: 0,
        requiredDocumentCount: 0,
        optionalDocumentCount: 0,
        overallStatus: "pending",
      };

    const requiredDocs = ["licenseDocument", "medicalCertificate", "idPhoto"];
    const optionalDocs = ["nbiClearance"];

    const requiredCount = requiredDocs.filter((doc) => documents[doc]).length;
    const optionalCount = optionalDocs.filter((doc) => documents[doc]).length;

    // Determine overall status
    let overallStatus = "pending";
    if (requiredCount === 3) {
      overallStatus = "complete"; // All 3 required docs uploaded
    } else if (requiredCount > 0) {
      overallStatus = "incomplete"; // Some docs uploaded but not all
    }

    return {
      documentCount: requiredCount + optionalCount,
      requiredDocumentCount: requiredCount,
      optionalDocumentCount: optionalCount,
      overallStatus: overallStatus,
    };
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  // Sorting function
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Get sorted and paginated drivers
  const getSortedAndPaginatedDrivers = () => {
    let sorted = [...filteredDrivers];

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
    const startIndex = (currentPage - 1) * driversPerPage;
    const endIndex = startIndex + driversPerPage;
    return sorted.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredDrivers.length / driversPerPage);

  const fetchDrivers = async () => {
    try {
      setLoading(true);

      // Get auth token for admin endpoint
      const token = localStorage.getItem("token");
      const headers = token
        ? {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        }
        : {};

      // Fetch drivers from admin endpoint (has document scanning logic)
      const response = await fetch(`${baseURL}/api/admin/drivers`, { headers });
      if (response.ok) {
        const driversData = await response.json();
        console.log(
          "✅ Fetched drivers from admin endpoint:",
          driversData.length,
        );
        console.log("📋 First driver data:", driversData[0]);
        console.log("🔍 Raw emergency contact from API:", {
          name: driversData[0]?.emergencyContactName,
          phone: driversData[0]?.emergencyContactPhone,
          relationship: driversData[0]?.emergencyContactRelationship,
        });

        // Transform the data to match expected format
        const transformedDrivers = driversData.map((driver) => {
          const transformed = {
            id: driver.DriverID || driver.id, // Handle both field names
            name: driver.DriverName,
            contactNumber: driver.DriverNumber,
            address: driver.DriverAddress,
            status: driver.DriverStatus || "active",
            employmentDate: driver.DriverEmploymentDate,
            licenseType: driver.licenseType,
            licenseNumber: driver.licenseNumber,
            licenseExpiryDate: driver.licenseExpiryDate,
            licenseRegistrationDate: driver.licenseRegistrationDate,
            emergencyContactName: driver.emergencyContactName,
            emergencyContactPhone: driver.emergencyContactPhone,
            emergencyContactRelationship: driver.emergencyContactRelationship,
            documents: driver.documents || {},
            documentCompliance: calculateDocumentCompliance(
              driver.documents || {},
            ),
          };

          // Log if ID is missing
          if (!transformed.id) {
            console.error("⚠️ Driver missing ID:", driver);
          }

          return transformed;
        });

        console.log("✅ Transformed drivers:", transformedDrivers.length);
        console.log("📋 First transformed driver:", transformedDrivers[0]);
        console.log("🚨 First driver emergency contact:", {
          name: transformedDrivers[0]?.emergencyContactName,
          phone: transformedDrivers[0]?.emergencyContactPhone,
          relationship: transformedDrivers[0]?.emergencyContactRelationship,
        });
        setDrivers(transformedDrivers);
      } else {
        console.error("Error fetching drivers:", response.statusText);
        // Fallback to basic driver data if admin endpoint fails
        await fetchBasicDrivers();
      }
    } catch (error) {
      console.error("Error fetching drivers:", error);
      // Fallback to basic driver data if admin endpoint fails
      await fetchBasicDrivers();
    } finally {
      setLoading(false);
    }
  };

  const fetchBasicDrivers = async () => {
    try {
      // Get auth token
      const token = localStorage.getItem("token");
      const config = token
        ? {
          headers: { Authorization: `Bearer ${token}` },
        }
        : {};

      const response = await axios.get(`${baseURL}/api/drivers`, config);
      const driversData = response.data || [];

      // Transform to ensure consistent field names
      const transformedDrivers = driversData.map((driver) => ({
        id: driver.DriverID || driver.id, // Handle both field names
        name: driver.DriverName,
        contactNumber: driver.DriverNumber,
        address: driver.DriverAddress,
        status: driver.DriverStatus || "active",
        employmentDate: driver.DriverEmploymentDate,
        licenseType: driver.licenseType,
        licenseNumber: driver.licenseNumber,
        licenseExpiryDate: driver.licenseExpiryDate,
        licenseRegistrationDate: driver.licenseRegistrationDate,
        emergencyContactName: driver.emergencyContactName,
        emergencyContactPhone: driver.emergencyContactPhone,
        emergencyContactRelationship: driver.emergencyContactRelationship,
        documents: driver.documents || {},
        documentCompliance: calculateDocumentCompliance(driver.documents || {}),
      }));

      setDrivers(transformedDrivers);
    } catch (error) {
      console.error("Error fetching basic drivers:", error);
      alert("Error fetching drivers");
    }
  };

  const handleAddDriver = () => {
    // No longer needed - using routing instead
  };

  const handleEditDriver = (driver) => {
    // No longer needed - using routing instead
  };

  const handleDeleteDriver = async (driverId) => {
    if (window.confirm("Are you sure you want to delete this driver?")) {
      try {
        // Get auth token
        const token = localStorage.getItem("token");
        const config = token
          ? {
            headers: { Authorization: `Bearer ${token}` },
          }
          : {};

        await axios.delete(`${baseURL}/api/admin/drivers/${driverId}`, config);
        alert("Driver deleted successfully!");
        fetchDrivers();
      } catch (error) {
        console.error("Error deleting driver:", error);
        alert("Error deleting driver");
      }
    }
  };

  const handleSaveDriver = (driverData) => {
    // No longer needed - using routing instead
    fetchDrivers();
  };

  const handleViewDetails = async (driver) => {
    try {
      // Get auth token for admin endpoint
      const token = localStorage.getItem("token");
      const headers = token
        ? {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        }
        : {};

      // Fetch fresh driver data with scanned documents
      const response = await fetch(
        `${baseURL}/api/admin/drivers/${driver.id}`,
        { headers },
      );
      if (response.ok) {
        const freshDriver = await response.json();
        console.log("🔍 Fresh driver data from API:", freshDriver);
        console.log("🚨 Emergency contact from API:", {
          name: freshDriver.emergencyContactName,
          phone: freshDriver.emergencyContactPhone,
          relationship: freshDriver.emergencyContactRelationship,
        });

        // Transform to match expected format
        const transformedDriver = {
          id: freshDriver.DriverID || freshDriver.id, // Handle both field names
          name: freshDriver.DriverName,
          contactNumber: freshDriver.DriverNumber,
          address: freshDriver.DriverAddress,
          status: freshDriver.DriverStatus || "active",
          employmentDate: freshDriver.DriverEmploymentDate,
          licenseType: freshDriver.licenseType,
          licenseNumber: freshDriver.licenseNumber,
          licenseExpiryDate: freshDriver.licenseExpiryDate,
          licenseRegistrationDate: freshDriver.licenseRegistrationDate,
          emergencyContactName: freshDriver.emergencyContactName,
          emergencyContactPhone: freshDriver.emergencyContactPhone,
          emergencyContactRelationship:
            freshDriver.emergencyContactRelationship,
          documents: freshDriver.documents || {},
          documentCompliance: calculateDocumentCompliance(
            freshDriver.documents || {},
          ),
        };

        console.log("✅ Transformed driver for modal:", transformedDriver);
        console.log("✅ Emergency contacts in transformed:", {
          name: transformedDriver.emergencyContactName,
          phone: transformedDriver.emergencyContactPhone,
          relationship: transformedDriver.emergencyContactRelationship,
        });

        setSelectedDriver(transformedDriver);
        setShowDetailsModal(true);
      } else {
        console.error("Error fetching driver details");
        // Fallback to cached data
        setSelectedDriver(driver);
        setShowDetailsModal(true);
      }
    } catch (error) {
      console.error("Error fetching driver details:", error);
      // Fallback to cached data
      setSelectedDriver(driver);
      setShowDetailsModal(true);
    }
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedDriver(null);
  };

  // Calculate status counts
  const statusCounts = {
    total: drivers.length,
    active: drivers.filter((driver) => driver.status === "Active").length,
    inactive: drivers.filter((driver) => driver.status === "Inactive").length,
    onLeave: drivers.filter((driver) => driver.status === "On Leave").length,
    terminated: drivers.filter((driver) => driver.status === "Terminated")
      .length,
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...drivers];

    // Apply timeframe filter - only filter if there's a specific timeframe selected
    // If no timeframe is selected, show all drivers
    if (isWithinTimeframe) {
      filtered = filtered.filter((driver) => {
        if (driver.employmentDate || driver.createdAt || driver.CreatedAt) {
          return isWithinTimeframe(
            driver.employmentDate || driver.createdAt || driver.CreatedAt,
          );
        }
        // If no creation date, include the driver (don't exclude it)
        return true;
      });
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((driver) => {
        const normalizedDriverStatus = driver.status
          ?.toLowerCase()
          .replace(/[\s-]/g, "");
        const normalizedFilter = statusFilter
          .toLowerCase()
          .replace(/[\s-]/g, "");
        return normalizedDriverStatus === normalizedFilter;
      });
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (driver) =>
          driver.name?.toLowerCase().includes(query) ||
          driver.contactNumber?.includes(query) ||
          driver.licenseType?.toLowerCase().includes(query) ||
          driver.address?.toLowerCase().includes(query),
      );
    }

    setFilteredDrivers(filtered);
  }, [drivers, statusFilter, searchQuery, isWithinTimeframe]);

  // Update export data whenever filtered drivers change
  useEffect(() => {
    const columns = [
      { key: "name", label: "Name", type: "text" },
      { key: "status", label: "Status", type: "status" },
      { key: "contactNumber", label: "Contact", type: "text" },
      { key: "licenseType", label: "License Type", type: "text" },
      { key: "address", label: "Address", type: "text" },
    ];

    const summary = {
      total: filteredDrivers.length,
      active: filteredDrivers.filter((driver) => driver.status === "Active")
        .length,
      inactive: filteredDrivers.filter((driver) => driver.status === "Inactive")
        .length,
      onLeave: filteredDrivers.filter((driver) => driver.status === "On Leave")
        .length,
      terminated: filteredDrivers.filter(
        (driver) => driver.status === "Terminated",
      ).length,
    };

    updateExportData({
      data: filteredDrivers,
      columns,
      summary,
      entityType: "drivers",
      title: "Drivers Management Report",
    });
  }, [filteredDrivers, updateExportData]);

  // Helper function to get status badge class
  const getStatusBadgeClass = (status) => {
    const baseClass =
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border";
    switch (status?.toLowerCase()) {
      case "active":
      case "available":
        return `${baseClass} bg-emerald-100 text-emerald-700 border-emerald-200`;
      case "inactive":
        return `${baseClass} bg-gray-100 text-gray-700 border-gray-200`;
      case "on leave":
        return `${baseClass} bg-amber-100 text-amber-700 border-amber-200`;
      case "on-delivery":
      case "on_delivery":
      case "on delivery":
        return `${baseClass} bg-blue-100 text-blue-700 border-blue-200`;
      case "terminated":
        return `${baseClass} bg-red-100 text-red-700 border-red-200`;
      case "license-expiring":
        return `${baseClass} bg-orange-100 text-orange-700 border-orange-200`;
      case "license-expired":
        return `${baseClass} bg-red-100 text-red-700 border-red-200`;
      default:
        return `${baseClass} bg-gray-100 text-gray-700 border-gray-200`;
    }
  };

  const getComplianceClass = (driver) => {
    // License expiry takes priority over document compliance
    if (driver.status === "license-expired") {
      return "bg-red-50 border-red-200 text-red-700";
    } else if (driver.status === "license-expiring") {
      return "bg-amber-50 border-amber-200 text-amber-700";
    }

    if (driver.documentCompliance?.overallStatus === "complete") {
      return "bg-emerald-50 border-emerald-200 text-emerald-700";
    } else if (driver.documentCompliance?.overallStatus === "incomplete") {
      return "bg-amber-50 border-amber-200 text-amber-700";
    } else {
      return "bg-gray-50 border-gray-200 text-gray-700";
    }
  };

  const getComplianceIcon = (driver) => {
    // License expiry takes priority over document compliance
    if (driver.status === "license-expired") {
      return <TbX className="text-red-600" size={16} />;
    } else if (driver.status === "license-expiring") {
      return <TbAlertCircle className="text-amber-600" size={16} />;
    }

    if (driver.documentCompliance?.overallStatus === "complete") {
      return <TbCheck className="text-emerald-600" size={16} />;
    } else if (driver.documentCompliance?.overallStatus === "incomplete") {
      return <TbAlertCircle className="text-amber-600" size={16} />;
    } else {
      return <TbActivity className="text-gray-400" size={16} />;
    }
  };

  const getComplianceStatus = (driver) => {
    // Check license expiry first - highest priority
    if (driver.status === "license-expired") {
      return "License Expired";
    } else if (driver.status === "license-expiring") {
      return "License Expiring Soon";
    }

    // Then check document compliance
    if (driver.documentCompliance?.overallStatus === "complete") {
      return "Ready to Drive";
    } else if (driver.documentCompliance?.overallStatus === "incomplete") {
      return "Compliance Incomplete";
    } else {
      return "Compliance Pending";
    }
  };

  const getComplianceDetails = (driver) => {
    const required = driver.documentCompliance?.requiredDocumentCount || 0;
    const optional = driver.documentCompliance?.optionalDocumentCount || 0;
    const overall = driver.documentCompliance?.overallStatus || "Incomplete";

    let details = [];
    if (required > 0) {
      details.push(`${required} required`);
    }
    if (optional > 0) {
      details.push(`${optional} optional`);
    }
    if (overall === "complete") {
      details.push("Overall: Complete");
    } else if (overall === "incomplete") {
      details.push("Overall: Incomplete");
    } else {
      details.push("Overall: Pending");
    }
    return details.join(", ");
  };

  // Get license expiry warning text (for License Status column - only license info)
  const getLicenseExpiryWarning = (driver) => {
    if (driver.status === "license-expired") {
      return (
        <span className="flex items-center gap-1 text-red-600 font-medium">
          <TbX size={14} /> License Expired
        </span>
      );
    }
    if (
      driver.status === "license-expiring" &&
      driver.licenseExpiryDaysRemaining !== undefined
    ) {
      const days = driver.licenseExpiryDaysRemaining;
      return (
        <span className="flex items-center gap-1 text-amber-600 font-medium">
          <TbAlertCircle size={14} /> Expires in {days} day
          {days !== 1 ? "s" : ""}
        </span>
      );
    }
    return null;
  };

  // Get display status (for Status column - shows On Leave when license issues)
  const getDisplayStatus = (driver) => {
    if (
      driver.status === "license-expired" ||
      driver.status === "license-expiring"
    ) {
      return "On Leave";
    }
    return driver.status || "Active";
  };

  // Get status badge class for display status
  const getDisplayStatusBadgeClass = (driver) => {
    if (
      driver.status === "license-expired" ||
      driver.status === "license-expiring"
    ) {
      return getStatusBadgeClass("on leave");
    }
    return getStatusBadgeClass(driver.status);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Loading drivers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AdminHeader currentUser={currentUser} />
      <PersonnelSubNav activeTab="drivers" />

      <div className="flex-1 p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
        {/* Greeting and Summary Cards */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Drivers Management
          </h2>
          <p className="text-gray-500 mt-1">
            Manage drivers, licenses, and driving credentials
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
                  +3.2%
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {drivers.length}
                </div>
                <div className="text-sm text-gray-500 font-medium">
                  Total Drivers
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
                  +2.1%
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {
                    drivers.filter((d) => d.status?.toLowerCase() === "active")
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
                    drivers.filter((d) => {
                      const status = d.status
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
                  -1.2%
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {
                    drivers.filter(
                      (d) =>
                        d.licenseExpiryDate &&
                        new Date(d.licenseExpiryDate) < new Date(),
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

        {/* Modern Filter Bar - Drivers List */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
          {/* Search (Top Left) */}
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

            {/* View Mode Toggle (Aligned Right) */}
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
          Showing {filteredDrivers.length} of {drivers.length} drivers
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

        {/* Drivers Content */}
        {filteredDrivers.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400">
              <TbUser size={40} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              No drivers found
            </h3>
            <p className="text-gray-500 max-w-md mx-auto mb-8">
              No drivers match your current filters. Try adjusting your search
              criteria or add a new driver.
            </p>
            <Link
              to="/admin/drivers/add"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm shadow-blue-200 transition-colors"
            >
              <TbPlus size={20} /> Add Your First Driver
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
                        Driver Name{" "}
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
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      License Status
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
                  {getSortedAndPaginatedDrivers().map((driver) => (
                    <tr
                      key={driver.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                            {driver.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {driver.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              ID: {driver.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {driver.contactNumber || "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-0.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold border border-gray-200">
                          {driver.licenseType || "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-gray-600">
                        {driver.licenseNumber || "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={getDisplayStatus(driver)} />
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {/* License Status Column */}
                        {getLicenseExpiryWarning(driver) ? (
                          getLicenseExpiryWarning(driver)
                        ) : (
                          <span className="flex items-center gap-1 text-emerald-600 font-medium text-xs">
                            <TbCheck size={14} /> Valid
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {getComplianceIcon(driver)}
                          </span>
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-gray-900">
                              {driver.documentCompliance
                                ?.requiredDocumentCount || 0}
                              /3
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewDetails(driver)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <TbEye size={18} />
                          </button>
                          <Link
                            to={`/admin/drivers/edit/${driver.id}`}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit Driver"
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
                  Page {currentPage} of {totalPages} ({filteredDrivers.length}{" "}
                  drivers)
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
            {filteredDrivers.map((driver) => {
              const statusClass = getStatusBadgeClass(driver.status);

              return (
                <div
                  key={driver.id}
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
                          {driver.name}
                        </h3>
                        <p className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded mt-1 inline-block capitalize">
                          {driver.licenseType || "No License"}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={getDisplayStatus(driver)} />
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
                          title={driver.contactNumber}
                        >
                          {driver.contactNumber || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="block text-xs text-gray-500 mb-1">
                          License #
                        </span>
                        <span className="font-mono text-xs font-semibold text-gray-700 bg-gray-50 px-2 py-1 rounded border border-gray-200 block w-fit">
                          {driver.licenseNumber || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="block text-xs text-gray-500 mb-1">
                          Expiry
                        </span>
                        <span className="font-medium text-gray-900 text-sm">
                          {driver.licenseExpiryDate
                            ? new Date(
                              driver.licenseExpiryDate,
                            ).toLocaleDateString()
                            : "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="block text-xs text-gray-500 mb-1">
                          Hired
                        </span>
                        <span className="font-medium text-gray-900 text-sm">
                          {driver.employmentDate
                            ? new Date(
                              driver.employmentDate,
                            ).toLocaleDateString()
                            : "N/A"}
                        </span>
                      </div>
                    </div>

                    {/* Compliance Section */}
                    <div
                      className={`p-3 rounded-xl border ${getComplianceClass(driver)}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">
                          {getComplianceIcon(driver)}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-bold opacity-90 mb-0.5">
                            {getComplianceStatus(driver)}
                          </div>
                          <div className="text-xs opacity-75">
                            {getComplianceDetails(driver)}
                          </div>

                          <div className="mt-2 text-xs flex items-center justify-between border-t border-black/5 pt-2">
                            <span className="font-medium flex items-center gap-1 opacity-80">
                              <TbFileText size={12} />
                              {Object.keys(driver.documents || {}).length} files
                            </span>
                            <span className="font-medium opacity-80">
                              {driver.documentCompliance
                                ?.requiredDocumentCount || 0}
                              /3 required
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="p-4 bg-gray-50 border-t border-gray-100 grid grid-cols-2 gap-3">
                    {driver.id ? (
                      <Link
                        to={`/admin/drivers/edit/${driver.id}`}
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all text-sm font-medium shadow-sm"
                      >
                        <TbEdit size={16} />
                        Edit
                      </Link>
                    ) : (
                      <button
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 border border-gray-200 text-gray-400 rounded-lg cursor-not-allowed text-sm font-medium shadow-sm"
                        disabled
                        title="Driver ID missing"
                      >
                        <TbEdit size={16} />
                        Edit
                      </button>
                    )}
                    <button
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-medium shadow-sm shadow-blue-200"
                      onClick={() => handleViewDetails(driver)}
                    >
                      <TbEye size={16} />
                      Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Driver Details Modal */}
        {/* Driver Details Modal */}
        {showDetailsModal && selectedDriver && (
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
                      {selectedDriver.name} Details
                    </h2>
                    <p className="text-sm text-gray-500">
                      View complete driver information and documents
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
                            {selectedDriver.name}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 block mb-1">
                            Contact Number
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {selectedDriver.contactNumber || "N/A"}
                          </span>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-xs text-gray-500 block mb-1">
                            Address
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {selectedDriver.address || "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 block mb-1">
                            Current Status
                          </span>
                          <span
                            className={getStatusBadgeClass(
                              selectedDriver.status,
                            )}
                          >
                            {selectedDriver.status}
                          </span>
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
                            {selectedDriver.employmentDate
                              ? new Date(
                                selectedDriver.employmentDate,
                              ).toLocaleDateString()
                              : "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                        🚨 Emergency Contact
                      </h3>
                      <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                          <div>
                            <span className="text-xs text-red-500 block mb-1 font-medium">
                              Contact Name
                            </span>
                            <span className="text-sm font-bold text-red-900">
                              {selectedDriver.emergencyContactName || "N/A"}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs text-red-500 block mb-1 font-medium">
                              Relationship
                            </span>
                            <span className="text-sm font-bold text-red-900">
                              {selectedDriver.emergencyContactRelationship ||
                                "N/A"}
                            </span>
                          </div>
                          <div className="sm:col-span-2">
                            <span className="text-xs text-red-500 block mb-1 font-medium">
                              Contact Phone
                            </span>
                            <span className="text-sm font-bold text-red-900">
                              {selectedDriver.emergencyContactPhone || "N/A"}
                            </span>
                          </div>
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
                              {selectedDriver.licenseType || "N/A"}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500 block mb-1">
                              License Number
                            </span>
                            <span className="text-sm font-mono font-bold text-gray-700 bg-white px-2 py-1 rounded border border-gray-200 inline-block">
                              {selectedDriver.licenseNumber || "N/A"}
                            </span>
                          </div>
                          <div className="sm:col-span-2">
                            <span className="text-xs text-gray-500 block mb-1">
                              Expiry Date
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">
                                {selectedDriver.licenseExpiryDate
                                  ? new Date(
                                    selectedDriver.licenseExpiryDate,
                                  ).toLocaleDateString()
                                  : "N/A"}
                              </span>
                              {getLicenseExpiryWarning(selectedDriver)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                        📄 Compliance Status
                      </h3>

                      <div
                        className={`p-4 rounded-xl border mb-6 ${getComplianceClass(selectedDriver)}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {getComplianceIcon(selectedDriver)}
                          </div>
                          <div>
                            <div className="font-bold text-sm mb-1">
                              {getComplianceStatus(selectedDriver)}
                            </div>
                            <div className="text-xs opacity-80">
                              {getComplianceDetails(selectedDriver)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                          <span className="text-sm text-gray-700">
                            License Document
                          </span>
                          {selectedDriver.documents?.licenseDocument ? (
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
                          {selectedDriver.documents?.medicalCertificate ? (
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
                            ID Photo
                          </span>
                          {selectedDriver.documents?.idPhoto ? (
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
                            NBI Clearance
                          </span>
                          {selectedDriver.documents?.nbiClearance ? (
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
                      {selectedDriver.documentCompliance?.documentCount || 0}{" "}
                      files uploaded
                    </span>
                  </h3>

                  {selectedDriver.documents &&
                    Object.keys(selectedDriver.documents).length > 0 ? (
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <FileViewer
                        documents={selectedDriver.documents}
                        entityType="driver"
                        entityName={selectedDriver.name}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400">
                      <TbFileText
                        size={32}
                        className="mx-auto mb-2 opacity-50"
                      />
                      <p className="mb-4">
                        No documents have been uploaded for this driver yet.
                      </p>
                      <Link
                        to={`/admin/drivers/edit/${selectedDriver.id}`}
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
                  to={`/admin/drivers/edit/${selectedDriver.id}`}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm shadow-blue-200 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <TbEdit size={16} /> Edit Driver
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

export default DriversList;
