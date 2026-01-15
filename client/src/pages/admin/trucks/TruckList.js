// src/pages/admin/trucks/TruckList.js - Enhanced with better status display

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  TbTruck,
  TbEye,
  TbEdit,
  TbSettings,
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
  TbPlus,
  TbActivity,
  TbArrowUp,
  TbArrowDown,
  TbList,
  TbLayoutGrid,
  TbFilterOff,
  TbFilter,
} from "react-icons/tb";
import { useTimeframe } from "../../../contexts/TimeframeContext";
import "./TruckList.css";
import "../../../styles/ModernForms.css";
import "../../../styles/DesignSystem.css";
import FileViewer from "../../../components/FileViewer";
import AdminHeader from "../../../components/common/AdminHeader";

const TruckList = ({ currentUser }) => {
  // Define baseURL for API calls
  const baseURL = process.env.REACT_APP_API_URL || "http://localhost:5007";
  const { isWithinTimeframe, getFormattedDateRange } = useTimeframe();

  const [trucks, setTrucks] = useState([]);
  const [filteredTrucks, setFilteredTrucks] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [allocationFilter, setAllocationFilter] = useState("all");
  const [operationalFilter, setOperationalFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [complianceFilter, setComplianceFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Calculate active filters count
  const activeFilterCount = [
    statusFilter,
    typeFilter,
    brandFilter,
    complianceFilter,
    operationalFilter,
    allocationFilter,
  ].filter((f) => f && f !== "all").length;
  const [recalculatingKm, setRecalculatingKm] = useState({});
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [viewMode, setViewMode] = useState("table"); // 'table' or 'cards'
  const [sortField, setSortField] = useState("TruckPlate");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const trucksPerPage = 20;

  // Handle viewing truck details
  const handleViewDetails = (truck) => {
    setSelectedTruck(truck);
    setShowDetailsModal(true);
  };

  // Close details modal
  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedTruck(null);
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

  // Get sorted and paginated trucks
  const getSortedAndPaginatedTrucks = () => {
    let sorted = [...filteredTrucks];

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
    const startIndex = (currentPage - 1) * trucksPerPage;
    const endIndex = startIndex + trucksPerPage;
    return sorted.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredTrucks.length / trucksPerPage);

  // Handle kilometer recalculation for a specific truck
  const handleRecalculateKm = async (truckId, truckPlate) => {
    try {
      setRecalculatingKm((prev) => ({ ...prev, [truckId]: true }));

      // Refresh the trucks list to show updated data with documents
      const [fetchResponse, deliveriesResponse, allocationsResponse] =
        await Promise.all([
          axios.get(`${baseURL}/api/trucks/actual-documents`),
          axios.get(`${baseURL}/api/deliveries`).catch((err) => {
            console.warn("Failed to fetch deliveries:", err);
            return { data: deliveries }; // Use existing deliveries if fetch fails
          }),
          axios.get(`${baseURL}/api/admin/allocations`).catch((err) => {
            console.warn("Failed to fetch allocations:", err);
            return { data: allocations }; // Use existing allocations if fetch fails
          }),
        ]);

      // Update deliveries
      const deliveriesData = Array.isArray(deliveriesResponse.data)
        ? deliveriesResponse.data
        : [];
      setDeliveries(deliveriesData);

      // Update allocations
      const allocationsData = Array.isArray(allocationsResponse.data)
        ? allocationsResponse.data
        : [];
      setAllocations(allocationsData);

      // Handle both array response and object with trucks property
      const trucksData = Array.isArray(fetchResponse.data)
        ? fetchResponse.data
        : fetchResponse.data.trucks;

      if (trucksData && trucksData.length > 0) {
        const formattedTrucks = trucksData.map((truck) => {
          const tId = truck.id || truck.TruckID;

          // Check if truck has active deliveries
          const hasActiveDelivery = deliveriesData.some((delivery) => {
            const deliveryTruckId = delivery.TruckID || delivery.truckId;
            const deliveryStatus = (
              delivery.DeliveryStatus ||
              delivery.deliveryStatus ||
              ""
            ).toLowerCase();
            return (
              deliveryTruckId === tId &&
              (deliveryStatus === "pending" || deliveryStatus === "in-progress")
            );
          });

          // Check if truck has active allocation
          const hasActiveAllocation = allocationsData.some((allocation) => {
            const allocationTruckId = allocation.truckId || allocation.TruckID;
            const allocationStatus = (allocation.status || "").toLowerCase();
            return allocationTruckId === tId && allocationStatus === "active";
          });

          return {
            TruckID: tId,
            TruckPlate: truck.truckPlate || truck.TruckPlate,
            TruckType: truck.truckType || truck.TruckType,
            TruckCapacity: truck.truckCapacity || truck.TruckCapacity,
            TruckBrand: truck.truckBrand || truck.TruckBrand || "Unknown",
            ModelYear: truck.modelYear || truck.ModelYear || null,
            // Registration tracking
            registrationDate: truck.registrationDate,
            registrationExpiryDate: truck.registrationExpiryDate,
            registrationExpiryWarning: truck.registrationExpiryWarning || false,
            registrationExpiryDaysRemaining:
              truck.registrationExpiryDaysRemaining || null,
            TruckStatus: truck.truckStatus || truck.TruckStatus || "unknown",
            TotalKilometers:
              truck.TotalKilometers || truck.totalKilometers || 0,
            TotalDeliveries:
              truck.TotalDeliveries || truck.totalCompletedDeliveries || 0,
            AverageKmPerDelivery: truck.averageKmPerDelivery || 0,
            LastOdometerUpdate: truck.lastOdometerUpdate,
            DateAdded: truck.dateAdded || truck.created_at,
            AllocationStatus: hasActiveAllocation ? "allocated" : "available",
            OperationalStatus: truck.operationalStatus || "active",
            AvailabilityStatus: truck.availabilityStatus || "free",
            StatusSummary: hasActiveDelivery
              ? "On Delivery"
              : hasActiveAllocation
              ? "Allocated"
              : truck.statusSummary || "Available",
            IsAvailable:
              !hasActiveDelivery &&
              !hasActiveAllocation &&
              truck.isAvailable !== false,
            IsAllocated: hasActiveAllocation, // ✅ Based on actual allocations
            IsInUse: hasActiveDelivery, // ✅ Based on actual deliveries
            NeedsMaintenance: truck.needsMaintenance === true,
            documents: truck.documents || {},
            documentCompliance: truck.documentCompliance || null,
            licenseRequirements: truck.licenseRequirements || null,
          };
        });

        setTrucks(formattedTrucks);
      }
    } catch (err) {
      console.error("Error recalculating kilometers:", err);
      setError(`Failed to recalculate kilometers: ${err.message}`);
    } finally {
      setRecalculatingKm((prev) => ({ ...prev, [truckId]: false }));
    }
  };

  // Helper function to check if truck is in active delivery
  const isTruckInActiveDelivery = (truckId) => {
    return deliveries.some((delivery) => {
      const deliveryTruckId = delivery.TruckID || delivery.truckId;
      const deliveryStatus = (
        delivery.DeliveryStatus ||
        delivery.deliveryStatus ||
        ""
      ).toLowerCase();
      return (
        deliveryTruckId === truckId &&
        (deliveryStatus === "pending" || deliveryStatus === "in-progress")
      );
    });
  };

  // Fetch trucks, deliveries, and allocations data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch trucks, deliveries, and allocations in parallel
        const [trucksResponse, deliveriesResponse, allocationsResponse] =
          await Promise.all([
            axios.get(`${baseURL}/api/trucks/actual-documents`),
            axios.get(`${baseURL}/api/deliveries`).catch((err) => {
              console.warn("Failed to fetch deliveries:", err);
              return { data: [] };
            }),
            axios.get(`${baseURL}/api/admin/allocations`).catch((err) => {
              console.warn("Failed to fetch allocations:", err);
              return { data: [] };
            }),
          ]);

        console.log(
          "Raw API response (trucks with actual documents):",
          trucksResponse.data
        );
        console.log("Raw API response (deliveries):", deliveriesResponse.data);
        console.log(
          "Raw API response (allocations):",
          allocationsResponse.data
        );

        // Store deliveries
        const deliveriesData = Array.isArray(deliveriesResponse.data)
          ? deliveriesResponse.data
          : [];
        setDeliveries(deliveriesData);
        console.log(
          `📦 Loaded ${deliveriesData.length} deliveries for truck status validation`
        );

        // Store allocations
        const allocationsData = Array.isArray(allocationsResponse.data)
          ? allocationsResponse.data
          : [];
        setAllocations(allocationsData);
        console.log(
          `🔗 Loaded ${allocationsData.length} allocations for truck status validation`
        );

        // Handle both array response and object with trucks property
        const trucksData = Array.isArray(trucksResponse.data)
          ? trucksResponse.data
          : trucksResponse.data.trucks;

        if (trucksData && trucksData.length > 0) {
          // Filter out trucks with invalid IDs before processing
          const validTrucks = trucksData.filter((truck) => {
            const truckId = truck.id || truck.TruckID;
            // Valid truck IDs should be 20 characters (Firestore document IDs)
            // Filter out malformed IDs that contain parts of words like "document"
            if (
              !truckId ||
              truckId.length !== 20 ||
              /document/i.test(truckId)
            ) {
              console.warn(
                `⚠️ Skipping truck with invalid ID: ${truckId}`,
                truck
              );
              return false;
            }
            return true;
          });

          console.log(
            `📊 Filtered ${
              trucksData.length - validTrucks.length
            } invalid trucks`
          );

          // Trucks already have documents from the backend file scanning
          // Now cross-reference with actual deliveries and allocations
          const formattedTrucks = validTrucks.map((truck) => {
            const truckId = truck.id || truck.TruckID;

            // Check if truck has active deliveries
            const hasActiveDelivery = deliveriesData.some((delivery) => {
              const deliveryTruckId = delivery.TruckID || delivery.truckId;
              const deliveryStatus = (
                delivery.DeliveryStatus ||
                delivery.deliveryStatus ||
                ""
              ).toLowerCase();
              const isMatch =
                deliveryTruckId === truckId &&
                (deliveryStatus === "pending" ||
                  deliveryStatus === "in-progress");

              if (isMatch) {
                console.log(
                  `🚛 Truck ${
                    truck.truckPlate || truckId
                  } has active delivery (${deliveryStatus})`
                );
              }

              return isMatch;
            });

            // Check if truck has active allocation
            const hasActiveAllocation = allocationsData.some((allocation) => {
              const allocationTruckId =
                allocation.truckId || allocation.TruckID;
              const allocationStatus = (allocation.status || "").toLowerCase();
              const isMatch =
                allocationTruckId === truckId && allocationStatus === "active";

              if (isMatch) {
                console.log(
                  `🔗 Truck ${
                    truck.truckPlate || truckId
                  } has active allocation (Client: ${
                    allocation.clientId || "Unknown"
                  })`
                );
              }

              return isMatch;
            });

            console.log(
              `Processing truck ${
                truck.truckPlate || truckId
              }: hasActiveDelivery=${hasActiveDelivery}, hasActiveAllocation=${hasActiveAllocation}`
            );

            return {
              TruckID: truckId,
              TruckPlate: truck.truckPlate || truck.TruckPlate,
              TruckType: truck.truckType || truck.TruckType,
              TruckCapacity: truck.truckCapacity || truck.TruckCapacity,
              TruckBrand: truck.truckBrand || truck.TruckBrand || "Unknown",
              ModelYear: truck.modelYear || truck.ModelYear || null,
              // Registration tracking
              registrationDate: truck.registrationDate,
              registrationExpiryDate: truck.registrationExpiryDate,
              registrationExpiryWarning:
                truck.registrationExpiryWarning || false,
              registrationExpiryDaysRemaining:
                truck.registrationExpiryDaysRemaining || null,
              TruckStatus: truck.truckStatus || truck.TruckStatus || "unknown",
              TotalKilometers:
                truck.TotalKilometers || truck.totalKilometers || 0,
              TotalDeliveries:
                truck.TotalDeliveries || truck.totalCompletedDeliveries || 0,
              AverageKmPerDelivery: truck.averageKmPerDelivery || 0,
              LastOdometerUpdate: truck.lastOdometerUpdate,
              DateAdded: truck.dateAdded || truck.created_at,
              AllocationStatus: hasActiveAllocation ? "allocated" : "available",
              OperationalStatus: truck.operationalStatus || "active",
              AvailabilityStatus: truck.availabilityStatus || "free",
              StatusSummary: hasActiveDelivery
                ? "On Delivery"
                : hasActiveAllocation
                ? "Allocated"
                : truck.statusSummary || "Available",
              IsAvailable:
                !hasActiveDelivery &&
                !hasActiveAllocation &&
                truck.isAvailable !== false,
              IsAllocated: hasActiveAllocation, // ✅ Now based on ACTUAL allocations, not just status field
              IsInUse: hasActiveDelivery, // ✅ Based on ACTUAL deliveries, not just status field
              NeedsMaintenance: truck.needsMaintenance === true,
              documents: truck.documents || {},
              documentCompliance: truck.documentCompliance || null,
              licenseRequirements: truck.licenseRequirements || null,
            };
          });

          console.log(
            "Trucks with documents and delivery status:",
            formattedTrucks
          );
          setTrucks(formattedTrucks);
        } else {
          console.warn("Invalid response format:", trucksResponse.data);
          setTrucks([]);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(`Failed to load data: ${err.message}`);
        setTrucks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get unique values for filters
  const getUniqueValues = (field) => {
    return [
      ...new Set(trucks.map((truck) => truck[field]).filter(Boolean)),
    ].sort();
  };

  // Calculate status counts
  const statusCounts = {
    total: trucks.length,
    available: trucks.filter((truck) => truck.OperationalStatus === "active")
      .length, // All active trucks
    allocated: trucks.filter((truck) => truck.IsAllocated).length, // All allocated trucks (1 truck to multiple clients counts as 1)
    inUse: trucks.filter((truck) => truck.IsInUse).length,
    maintenance: trucks.filter(
      (truck) =>
        truck.NeedsMaintenance === true ||
        truck.OperationalStatus === "maintenance"
    ).length,
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...trucks];

    // Apply timeframe filter - only filter if there's a specific timeframe selected
    if (isWithinTimeframe) {
      filtered = filtered.filter((truck) => {
        if (truck.CreatedAt || truck.createdAt) {
          return isWithinTimeframe(truck.CreatedAt || truck.createdAt);
        }
        // If no creation date, include the truck (don't exclude it)
        return true;
      });
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((truck) => {
        switch (statusFilter) {
          case "available":
            return truck.IsAvailable && !truck.IsAllocated && !truck.IsInUse;
          case "allocated":
            return truck.IsAllocated;
          case "on-delivery":
            return truck.IsInUse;
          case "maintenance":
            return truck.NeedsMaintenance;
          case "scheduled":
            return truck.AvailabilityStatus === "scheduled";
          default:
            return true;
        }
      });
    }

    // Apply allocation filter
    if (allocationFilter !== "all") {
      filtered = filtered.filter(
        (truck) => truck.AllocationStatus?.toLowerCase() === allocationFilter
      );
    }

    // Apply operational filter
    if (operationalFilter !== "all") {
      filtered = filtered.filter(
        (truck) => truck.OperationalStatus?.toLowerCase() === operationalFilter
      );
    }

    // Apply type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((truck) => truck.TruckType === typeFilter);
    }

    // Apply brand filter
    if (brandFilter !== "all") {
      filtered = filtered.filter((truck) => truck.TruckBrand === brandFilter);
    }

    // Apply compliance filter
    if (complianceFilter !== "all") {
      filtered = filtered.filter((truck) => {
        console.log(
          "Filtering truck by compliance:",
          truck,
          "filter:",
          complianceFilter
        );
        if (!truck || !truck.documentCompliance)
          return complianceFilter === "incomplete";
        if (!truck.documentCompliance.overallStatus)
          return complianceFilter === "incomplete";
        return truck.documentCompliance.overallStatus === complianceFilter;
      });
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (truck) =>
          truck.TruckPlate?.toLowerCase().includes(query) ||
          truck.TruckType?.toLowerCase().includes(query) ||
          truck.TruckBrand?.toLowerCase().includes(query) ||
          truck.TruckID?.toLowerCase().includes(query)
      );
    }

    setFilteredTrucks(filtered);
  }, [
    trucks,
    statusFilter,
    allocationFilter,
    operationalFilter,
    typeFilter,
    brandFilter,
    complianceFilter,
    searchQuery,
    isWithinTimeframe,
  ]);

  // Helper function to get status badge class
  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case "available":
      case "active":
      case "free":
        return "status-available";
      case "allocated":
      case "reserved":
        return "status-allocated";
      case "on-delivery":
      case "busy":
        return "status-busy";
      case "maintenance":
        return "status-maintenance";
      case "out-of-service":
        return "status-offline";
      case "scheduled":
      case "standby":
        return "status-scheduled";
      case "registration-expiring":
        return "status-registration-expiring";
      case "registration-expired":
        return "status-registration-expired";
      default:
        return "status-unknown";
    }
  };

  // Helper function to format status text
  const formatStatus = (status) => {
    if (!status) return "Unknown";
    return status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ");
  };

  // Get summary status indicator
  const getSummaryStatusClass = (truck) => {
    if (truck.NeedsMaintenance) return "status-maintenance";
    if (truck.IsInUse) return "status-busy";
    if (truck.IsAllocated) return "status-allocated";
    if (truck.IsAvailable) return "status-available";
    return "status-unknown";
  };

  // Get license requirements for a truck type
  const getLicenseRequirements = (truckType) => {
    const requirements = {
      "mini truck": {
        driverLicense: "Non-Pro",
        helpers: 1,
        helperRequirements: ["Basic Training"],
      },
      "4 wheeler": {
        driverLicense: "Pro 1 & 2",
        helpers: 1,
        helperRequirements: ["Basic Training"],
      },
      "6 wheeler": {
        driverLicense: "Pro 1 & 2",
        helpers: 2,
        helperRequirements: ["Basic Training", "Heavy Lifting"],
      },
      "8 wheeler": {
        driverLicense: "Pro 1 & 2",
        helpers: 2,
        helperRequirements: ["Basic Training", "Heavy Lifting"],
      },
      "10 wheeler": {
        driverLicense: "Pro 1 & 2",
        helpers: 3,
        helperRequirements: [
          "Basic Training",
          "Heavy Lifting",
          "Safety Certified",
        ],
      },
    };

    return (
      requirements[truckType?.toLowerCase()] || {
        driverLicense: "Unknown",
        helpers: 0,
        helperRequirements: [],
      }
    );
  };

  if (loading) {
    return (
      <div className="modern-list-container">
        <div className="modern-loading">
          <div className="loading-spinner"></div>
          Loading trucks data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">
          {error}
          <div style={{ marginTop: "10px" }}>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page-container">
      <AdminHeader currentUser={currentUser} />

      <div className="admin-content">
        {/* Greeting and Summary Cards */}
        <div className="greeting-section">
          <h2 className="greeting-text">Truck Management</h2>
          <p className="greeting-subtitle">
            Manage your fleet vehicles, track documents, and monitor compliance
            status
          </p>
          <div className="timeframe-indicator">
            <span className="timeframe-label">
              Showing data for: {getFormattedDateRange()}
            </span>
          </div>

          <div className="summary-cards">
            <div className="summary-card">
              <div className="card-icon">
                <TbTruck size={24} />
              </div>
              <div className="card-content">
                <div className="card-value">{trucks.length}</div>
                <div className="card-label">Total Trucks</div>
                <div className="card-change positive">
                  <TbArrowUp size={12} />
                  +2.1%
                </div>
              </div>
            </div>

            <div className="summary-card">
              <div className="card-icon">
                <TbCheck size={24} />
              </div>
              <div className="card-content">
                <div className="card-value">
                  {
                    trucks.filter((t) => t.OperationalStatus === "active")
                      .length
                  }
                </div>
                <div className="card-label">Available</div>
                <div className="card-change positive">
                  <TbArrowUp size={12} />
                  +1.5%
                </div>
              </div>
            </div>

            <div className="summary-card">
              <div className="card-icon">
                <TbClock size={24} />
              </div>
              <div className="card-content">
                <div className="card-value">
                  {trucks.filter((t) => t.IsAllocated === true).length}
                </div>
                <div className="card-label">Allocated</div>
                <div className="card-change neutral">
                  <TbActivity size={12} />
                  0.0%
                </div>
              </div>
            </div>

            <div className="summary-card">
              <div className="card-icon">
                <TbSettings size={24} />
              </div>
              <div className="card-content">
                <div className="card-value">
                  {
                    trucks.filter(
                      (t) =>
                        t.NeedsMaintenance === true ||
                        t.OperationalStatus === "maintenance"
                    ).length
                  }
                </div>
                <div className="card-label">Maintenance</div>
                <div className="card-change negative">
                  <TbArrowDown size={12} />
                  -0.8%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Filter Bar - Popover Style */}
        <div
          className="modern-filter-bar"
          style={{ position: "relative", marginBottom: "24px" }}
        >
          <div
            className="search-filter-row"
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {/* Search (Top Left) */}
            <div className="search-container" style={{ flex: "0 0 350px" }}>
              <div className="search-input-wrapper">
                <div className="search-icon">🔍</div>
                <input
                  type="text"
                  placeholder="Search trucks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="modern-search-input"
                />
              </div>
            </div>

            {/* Filter Toggle Button */}
            <button
              className={`btn btn-secondary ${showFilters ? "active" : ""}`}
              style={{
                height: "42px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                position: "relative",
                paddingRight: activeFilterCount > 0 ? "36px" : "16px",
              }}
              onClick={() => setShowFilters(!showFilters)}
            >
              <TbFilter size={18} />
              Filters
              {activeFilterCount > 0 && (
                <span
                  className="filter-count-badge"
                  style={{
                    position: "absolute",
                    right: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "rgba(255,255,255,0.2)",
                    color: "white",
                    borderRadius: "12px",
                    padding: "2px 8px",
                    fontSize: "0.75rem",
                    fontWeight: "bold",
                  }}
                >
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* View Mode Toggle (Aligned Right) */}
            <div className="view-mode-toggle" style={{ marginLeft: "auto" }}>
              <button
                onClick={() => setViewMode("table")}
                className={`view-mode-btn ${
                  viewMode === "table" ? "active" : ""
                }`}
                title="Table View"
              >
                <TbList size={20} />
              </button>
              <button
                onClick={() => setViewMode("cards")}
                className={`view-mode-btn ${
                  viewMode === "cards" ? "active" : ""
                }`}
                title="Card View"
              >
                <TbLayoutGrid size={20} />
              </button>
            </div>
          </div>

          <div
            className="filter-summary"
            style={{ marginTop: "12px", color: "#64748b", fontSize: "0.9rem" }}
          >
            Showing {filteredTrucks.length} of {trucks.length} trucks
          </div>

          {/* Filter Popup */}
          {showFilters && (
            <div
              className="filter-popup-card"
              style={{
                position: "absolute",
                top: "48px",
                left: "0",
                zIndex: 1000,
                background: "white",
                borderRadius: "12px",
                boxShadow:
                  "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                border: "1px solid #f1f5f9",
                width: "480px",
                maxWidth: "90vw",
                padding: "20px",
              }}
            >
              <div
                className="popup-header"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "16px",
                  alignItems: "center",
                }}
              >
                <h4 style={{ margin: 0, color: "#1e293b", fontSize: "1.1rem" }}>
                  Filter Options
                </h4>
                <button
                  className="btn-ghost"
                  onClick={() => setShowFilters(false)}
                  style={{ height: "32px", padding: "0 8px", width: "auto" }}
                >
                  <TbX />
                </button>
              </div>

              <div
                className="filters-grid-popup"
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(200px, 1fr) minmax(200px, 1fr)",
                  gap: "12px",
                  marginBottom: "20px",
                }}
              >
                {/* Type Filter */}
                <div className="filter-group">
                  <label className="filter-label">Type</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="modern-filter-select"
                  >
                    <option value="all">All Types</option>
                    {getUniqueValues("TruckType").map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Brand Filter */}
                <div className="filter-group">
                  <label className="filter-label">Brand</label>
                  <select
                    value={brandFilter}
                    onChange={(e) => setBrandFilter(e.target.value)}
                    className="modern-filter-select"
                  >
                    <option value="all">All Brands</option>
                    {getUniqueValues("TruckBrand").map((brand) => (
                      <option key={brand} value={brand}>
                        {brand}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Compliance Filter */}
                <div className="filter-group">
                  <label className="filter-label">Compliance</label>
                  <select
                    value={complianceFilter}
                    onChange={(e) => setComplianceFilter(e.target.value)}
                    className="modern-filter-select"
                  >
                    <option value="all">All Compliance</option>
                    <option value="complete">Complete</option>
                    <option value="incomplete">Incomplete</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div className="filter-group">
                  <label className="filter-label">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="modern-filter-select"
                  >
                    <option value="all">All Status</option>
                    <option value="available">Available</option>
                    <option value="allocated">Allocated</option>
                    <option value="on-delivery">On Delivery</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="scheduled">Scheduled</option>
                  </select>
                </div>

                {/* Operational Filter */}
                <div className="filter-group">
                  <label className="filter-label">Operational</label>
                  <select
                    value={operationalFilter}
                    onChange={(e) => setOperationalFilter(e.target.value)}
                    className="modern-filter-select"
                  >
                    <option value="all">All Operational</option>
                    <option value="active">Active</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="out-of-service">Out of Service</option>
                    <option value="standby">Standby</option>
                  </select>
                </div>
              </div>

              <div
                className="popup-footer"
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px",
                  paddingTop: "16px",
                  borderTop: "1px solid #f1f5f9",
                }}
              >
                <button
                  className="btn-ghost"
                  onClick={() => {
                    setStatusFilter("all");
                    setAllocationFilter("all");
                    setOperationalFilter("all");
                    setTypeFilter("all");
                    setBrandFilter("all");
                    setComplianceFilter("all");
                    setSearchQuery("");
                  }}
                  style={{ width: "auto" }}
                >
                  <TbFilterOff size={16} /> Reset
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowFilters(false)}
                  style={{ height: "42px", padding: "0 24px" }}
                >
                  Apply Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Trucks Content */}
        {filteredTrucks.length === 0 ? (
          <div className="trucks-empty-state">
            <div className="empty-state-icon">
              <TbTruck />
            </div>
            <h3 className="empty-state-title">No trucks found</h3>
            <p className="empty-state-description">
              No trucks match your current filters. Try adjusting your search
              criteria or add a new truck.
            </p>
            <Link
              to="/admin/trucks/add"
              className="modern-btn modern-btn-primary"
            >
              <TbPlus className="btn-icon" />
              Add Your First Truck
            </Link>
          </div>
        ) : viewMode === "table" ? (
          // TABLE VIEW
          <div className="trucks-table-container">
            <div className="table-wrapper">
              <table className="trucks-table">
                <thead>
                  <tr>
                    <th
                      onClick={() => handleSort("TruckPlate")}
                      className="sortable"
                    >
                      Plate Number{" "}
                      {sortField === "TruckPlate" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      onClick={() => handleSort("TruckType")}
                      className="sortable"
                    >
                      Type{" "}
                      {sortField === "TruckType" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      onClick={() => handleSort("TruckBrand")}
                      className="sortable"
                    >
                      Brand{" "}
                      {sortField === "TruckBrand" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      onClick={() => handleSort("ModelYear")}
                      className="sortable"
                    >
                      Year{" "}
                      {sortField === "ModelYear" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      onClick={() => handleSort("OperationalStatus")}
                      className="sortable"
                    >
                      Status{" "}
                      {sortField === "OperationalStatus" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th className="sortable">Registration Status</th>
                    <th
                      onClick={() => handleSort("documentCompliance")}
                      className="sortable"
                    >
                      Compliance{" "}
                      {sortField === "documentCompliance" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getSortedAndPaginatedTrucks().map((truck) => (
                    <tr key={truck.TruckID} className="truck-row">
                      <td className="truck-name-cell">
                        <div className="truck-name-wrapper">
                          <TbTruck className="truck-icon" />
                          <span className="truck-name-text">
                            {truck.TruckPlate}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="type-badge">
                          {truck.TruckType || "N/A"}
                        </span>
                      </td>
                      <td>{truck.TruckBrand || "Unknown"}</td>
                      <td>{truck.ModelYear || "N/A"}</td>
                      <td>
                        <div className="status-cell">
                          <span
                            className={`status-badge ${getStatusBadgeClass(
                              truck.OperationalStatus
                            )}`}
                          >
                            {formatStatus(truck.OperationalStatus) || "Active"}
                          </span>
                        </div>
                      </td>
                      <td>
                        {/* New Registration Status Column */}
                        {truck.registrationExpiryWarning ? (
                          <div
                            className={`registration-warning-badge ${
                              truck.OperationalStatus === "registration-expired"
                                ? "expired"
                                : "expiring"
                            }`}
                          >
                            {truck.OperationalStatus === "registration-expired"
                              ? `❌ Expired - Blocked`
                              : `⚠️ Expires in ${truck.registrationExpiryDaysRemaining} days`}
                          </div>
                        ) : (
                          <span className="status-badge status-active">
                            Active
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="compliance-cell">
                          <span className="compliance-icon">
                            {getComplianceIcon(truck)}
                          </span>
                          <span className="compliance-text">
                            {truck.documentCompliance?.requiredDocumentCount ||
                              0}
                            /3
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            onClick={() => handleViewDetails(truck)}
                            className="action-btn view-btn"
                            title="View Details"
                          >
                            <TbEye size={18} />
                          </button>
                          <Link
                            to={`/admin/trucks/edit/${truck.TruckID}`}
                            className="action-btn edit-btn"
                            title="Edit Truck"
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
              <div className="pagination">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                  className="pagination-btn"
                >
                  ← Previous
                </button>
                <span className="pagination-info">
                  Page {currentPage} of {totalPages} ({filteredTrucks.length}{" "}
                  trucks)
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="pagination-btn"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        ) : (
          // CARD VIEW
          <div className="truck-cards-grid">
            {filteredTrucks.map((truck) => {
              const requirements = getLicenseRequirements(truck.TruckType);
              const statusClass = getSummaryStatusClass(truck);

              return (
                <div key={truck.TruckID} className="truck-card">
                  {/* Card Header */}
                  <div className="truck-card-header">
                    <div className="truck-card-title">
                      <div className="truck-card-icon">
                        <TbTruck />
                      </div>
                      <div className="truck-card-main">
                        <h3 className="truck-plate">{truck.TruckPlate}</h3>
                        <p className="truck-type">{truck.TruckType}</p>
                      </div>
                    </div>
                    <div className="truck-card-status">
                      <span
                        className={`truck-status-primary ${statusClass.replace(
                          "status-",
                          ""
                        )}`}
                      >
                        {truck.OperationalStatus || "Active"}
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="truck-card-content">
                    <div className="truck-card-info">
                      <div className="truck-info-item">
                        <span className="truck-info-label">Brand</span>
                        <span className="truck-info-value">
                          {truck.TruckBrand || "Unknown"}
                        </span>
                      </div>
                      <div className="truck-info-item">
                        <span className="truck-info-label">Year</span>
                        <span className="truck-info-value">
                          {truck.ModelYear || "-"}
                        </span>
                      </div>
                      <div className="truck-info-item">
                        <span className="truck-info-label">Total KM</span>
                        <span className="truck-info-value">
                          {truck.TotalKilometers || 0} km
                        </span>
                      </div>
                    </div>
                    <div className="truck-card-info">
                      <div className="truck-info-item">
                        <span className="truck-info-label">Deliveries</span>
                        <span className="truck-info-value">
                          {truck.TotalDeliveries || 0}
                        </span>
                      </div>
                      <div className="truck-info-item">
                        <span className="truck-info-label">Allocation</span>
                        <span className="truck-info-value">
                          {formatStatus(truck.AllocationStatus)}
                        </span>
                      </div>
                      <div className="truck-info-item">
                        <span className="truck-info-label">License Req</span>
                        <span className="truck-info-value">
                          {requirements.driverLicense}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Document Compliance */}
                  <div
                    className={`truck-card-compliance ${getComplianceClass(
                      truck
                    )}`}
                  >
                    <div className="compliance-info">
                      <div className="compliance-icon-large">
                        {getComplianceIcon(truck)}
                      </div>
                      <div className="compliance-text">
                        <div className="compliance-status">
                          {getComplianceStatus(truck)}
                        </div>
                        <div className="compliance-details">
                          {getComplianceDetails(truck)}
                        </div>
                      </div>
                    </div>
                    {/* File Counter Badge */}
                    <div className="file-counter-badge">
                      <span className="file-count-icon">📁</span>
                      <span className="file-count-text">
                        {Object.keys(truck.documents || {}).length} files
                      </span>
                      <div className="file-count-breakdown">
                        <span className="required-count">
                          {truck.documentCompliance?.requiredDocumentCount || 0}
                          /3 required
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="truck-card-actions">
                    <div className="truck-card-actions-left">
                      <Link
                        to={`/admin/trucks/edit/${truck.TruckID}`}
                        className="card-action-btn primary"
                      >
                        <TbEdit className="btn-icon" />
                        Edit
                      </Link>
                      <button
                        className={`card-action-btn ${
                          recalculatingKm[truck.TruckID] ? "loading" : ""
                        }`}
                        onClick={() =>
                          handleRecalculateKm(truck.TruckID, truck.TruckPlate)
                        }
                        disabled={recalculatingKm[truck.TruckID]}
                      >
                        {recalculatingKm[truck.TruckID] ? (
                          <TbClock className="btn-icon" />
                        ) : (
                          <TbActivity className="btn-icon" />
                        )}
                        Recalc KM
                      </button>
                    </div>
                    <button
                      className="view-details-btn"
                      onClick={() => handleViewDetails(truck)}
                    >
                      <TbEye className="btn-icon" />
                      View Details →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Truck Details Modal */}
        {showDetailsModal && selectedTruck && (
          <div className="modal-overlay" onClick={closeDetailsModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>🚛 {selectedTruck.TruckPlate} Details</h2>
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
                        <span className="detail-label">Truck ID:</span>
                        <span className="detail-value">
                          {selectedTruck.TruckID}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Plate Number:</span>
                        <span className="detail-value">
                          {selectedTruck.TruckPlate}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Type:</span>
                        <span className="detail-value">
                          {selectedTruck.TruckType}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Brand:</span>
                        <span className="detail-value">
                          {selectedTruck.TruckBrand || "Unknown"}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Model Year:</span>
                        <span className="detail-value">
                          {selectedTruck.ModelYear || "Not specified"}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Capacity:</span>
                        <span className="detail-value">
                          {selectedTruck.TruckCapacity || "Not specified"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="details-section">
                    <h3>📊 Performance Metrics</h3>
                    <div className="details-items">
                      <div className="detail-item">
                        <span className="detail-label">Total Kilometers:</span>
                        <span className="detail-value">
                          {selectedTruck.TotalKilometers?.toLocaleString() || 0}{" "}
                          km
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">
                          Completed Deliveries:
                        </span>
                        <span className="detail-value">
                          {selectedTruck.TotalDeliveries || 0}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">
                          Average KM per Delivery:
                        </span>
                        <span className="detail-value">
                          {selectedTruck.AverageKmPerDelivery || 0} km
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">
                          Last Odometer Update:
                        </span>
                        <span className="detail-value">
                          {selectedTruck.LastOdometerUpdate
                            ? new Date(
                                selectedTruck.LastOdometerUpdate
                              ).toLocaleDateString()
                            : "Never"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Information */}
                  <div className="details-section">
                    <h3>🚦 Status Information</h3>
                    <div className="details-items">
                      <div className="detail-item">
                        <span className="detail-label">
                          Operational Status:
                        </span>
                        <span
                          className={`detail-badge ${getStatusBadgeClass(
                            selectedTruck.OperationalStatus
                          )}`}
                        >
                          {formatStatus(selectedTruck.OperationalStatus)}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Allocation Status:</span>
                        <span
                          className={`detail-badge ${getStatusBadgeClass(
                            selectedTruck.AllocationStatus
                          )}`}
                        >
                          {formatStatus(selectedTruck.AllocationStatus)}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Availability:</span>
                        <span
                          className={`detail-badge ${
                            selectedTruck.IsAvailable
                              ? "status-available"
                              : "status-busy"
                          }`}
                        >
                          {selectedTruck.IsAvailable
                            ? "Available"
                            : "Not Available"}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">
                          Currently Allocated:
                        </span>
                        <span
                          className={`detail-badge ${
                            selectedTruck.IsAllocated
                              ? "status-allocated"
                              : "status-available"
                          }`}
                        >
                          {selectedTruck.IsAllocated ? "Yes" : "No"}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">In Use:</span>
                        <span
                          className={`detail-badge ${
                            selectedTruck.IsInUse
                              ? "status-busy"
                              : "status-available"
                          }`}
                        >
                          {selectedTruck.IsInUse ? "Yes" : "No"}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Needs Maintenance:</span>
                        <span
                          className={`detail-badge ${
                            selectedTruck.NeedsMaintenance
                              ? "status-maintenance"
                              : "status-available"
                          }`}
                        >
                          {selectedTruck.NeedsMaintenance ? "Yes" : "No"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* License Requirements */}
                  <div className="details-section">
                    <h3>📜 License Requirements</h3>
                    <div className="details-items">
                      {(() => {
                        const requirements = getLicenseRequirements(
                          selectedTruck.TruckType
                        );
                        return (
                          <>
                            <div className="detail-item">
                              <span className="detail-label">
                                Driver License Required:
                              </span>
                              <span className="detail-value">
                                {requirements.driverLicense}
                              </span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">
                                Helpers Required:
                              </span>
                              <span className="detail-value">
                                {requirements.helpers}
                              </span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">
                                Helper Requirements:
                              </span>
                              <span className="detail-value">
                                {requirements.helperRequirements.join(", ") ||
                                  "None"}
                              </span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Document Compliance */}
                  <div className="details-section">
                    <h3>📄 Document Compliance</h3>
                    <div className="details-items">
                      <div className="detail-item">
                        <span className="detail-label">Overall Status:</span>
                        <span
                          className={`detail-badge compliance-${getComplianceClass(
                            selectedTruck
                          ).replace("compliance-", "")}`}
                        >
                          {getComplianceStatus(selectedTruck)}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">
                          Documents Completed:
                        </span>
                        <span className="detail-value">
                          {getComplianceDetails(selectedTruck)}
                        </span>
                      </div>

                      {/* Document Status List */}
                      <div className="documents-list">
                        <div className="document-item">
                          <span className="doc-name">
                            OR (Original Receipt):
                          </span>
                          <span
                            className={`doc-status ${
                              selectedTruck.documents?.orDocument
                                ? "complete"
                                : "missing"
                            }`}
                          >
                            {selectedTruck.documents?.orDocument
                              ? "✓ Complete"
                              : "✗ Missing"}
                          </span>
                        </div>
                        <div className="document-item">
                          <span className="doc-name">
                            CR (Certificate of Registration):
                          </span>
                          <span
                            className={`doc-status ${
                              selectedTruck.documents?.crDocument
                                ? "complete"
                                : "missing"
                            }`}
                          >
                            {selectedTruck.documents?.crDocument
                              ? "✓ Complete"
                              : "✗ Missing"}
                          </span>
                        </div>
                        <div className="document-item">
                          <span className="doc-name">Insurance:</span>
                          <span
                            className={`doc-status ${
                              selectedTruck.documents?.insuranceDocument
                                ? "complete"
                                : "missing"
                            }`}
                          >
                            {selectedTruck.documents?.insuranceDocument
                              ? "✓ Complete"
                              : "✗ Missing"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Document Viewer */}
                  <div className="details-section">
                    <h3>📁 Uploaded Documents</h3>
                    <div className="document-summary">
                      <div className="document-count-badge">
                        <span className="count-icon">📁</span>
                        <span className="count-text">
                          {selectedTruck.documentCompliance?.documentCount || 0}{" "}
                          files uploaded
                        </span>
                      </div>
                      <div className="document-breakdown">
                        <span className="required-docs">
                          Required:{" "}
                          {selectedTruck.documentCompliance
                            ?.requiredDocumentCount || 0}
                          /3
                        </span>
                        <span className="optional-docs">
                          Optional:{" "}
                          {selectedTruck.documentCompliance
                            ?.optionalDocumentCount || 0}
                          /1
                        </span>
                      </div>
                    </div>
                    {selectedTruck.documents &&
                    Object.keys(selectedTruck.documents).length > 0 ? (
                      <div className="details-items">
                        <FileViewer
                          documents={selectedTruck.documents}
                          truckPlate={selectedTruck.TruckPlate}
                        />
                      </div>
                    ) : (
                      <div className="no-documents-message">
                        <p>
                          No documents have been uploaded for this truck yet.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Timestamps */}
                  <div className="details-section">
                    <h3>⏰ Timeline</h3>
                    <div className="details-items">
                      <div className="detail-item">
                        <span className="detail-label">Date Added:</span>
                        <span className="detail-value">
                          {selectedTruck.DateAdded
                            ? new Date(
                                selectedTruck.DateAdded
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
                  to={`/admin/trucks/edit/${selectedTruck.TruckID}`}
                  className="modern-btn modern-btn-primary"
                >
                  ✎ Edit Truck
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

  // Helper functions for card display
  function getComplianceClass(truck) {
    try {
      console.log("getComplianceClass called with truck:", truck);
      if (
        !truck ||
        !truck.documentCompliance ||
        !truck.documentCompliance.overallStatus
      )
        return "compliance-incomplete";
      const { overallStatus } = truck.documentCompliance;
      return `compliance-${overallStatus}`;
    } catch (error) {
      console.error("Error in getComplianceClass:", error, "truck:", truck);
      return "compliance-incomplete";
    }
  }

  function getComplianceIcon(truck) {
    try {
      console.log("getComplianceIcon called with truck:", truck);
      if (
        !truck ||
        !truck.documentCompliance ||
        !truck.documentCompliance.overallStatus
      )
        return "⚠";
      const { overallStatus } = truck.documentCompliance;
      switch (overallStatus) {
        case "complete":
          return "✓";
        case "expired":
          return "✗";
        case "optional":
          return "ℹ";
        default:
          return "⚠";
      }
    } catch (error) {
      console.error("Error in getComplianceIcon:", error, "truck:", truck);
      return "⚠";
    }
  }

  function getComplianceStatus(truck) {
    try {
      console.log("getComplianceStatus called with truck:", truck);
      if (
        !truck ||
        !truck.documentCompliance ||
        !truck.documentCompliance.overallStatus
      )
        return "Incomplete";
      const { overallStatus } = truck.documentCompliance;
      if (typeof overallStatus !== "string") return "Incomplete";
      return overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1);
    } catch (error) {
      console.error("Error in getComplianceStatus:", error, "truck:", truck);
      return "Incomplete";
    }
  }

  function getComplianceDetails(truck) {
    try {
      console.log("getComplianceDetails called with truck:", truck);
      if (!truck || !truck.documentCompliance) return "Missing documents";

      // Use the document counts from the backend if available
      if (truck.documentCompliance.documentCount !== undefined) {
        const requiredCount =
          truck.documentCompliance.requiredDocumentCount || 0;
        const optionalCount =
          truck.documentCompliance.optionalDocumentCount || 0;
        const totalCount = truck.documentCompliance.documentCount || 0;

        if (totalCount === 0) {
          return "No documents";
        } else if (requiredCount === 3 && optionalCount === 0) {
          return `${totalCount}/3 documents (Required: Complete)`;
        } else if (requiredCount === 3) {
          return `${totalCount}/3 documents (Required: Complete)`;
        } else {
          return `${totalCount}/3 documents (Required: ${requiredCount}/3)`;
        }
      }

      // Fallback to counting completed documents
      const documentTypes = [
        "orDocument",
        "crDocument",
        "insuranceDocument",
        "licenseRequirement",
      ];
      const completedCount = documentTypes.filter(
        (docType) => truck.documentCompliance[docType] === "complete"
      ).length;

      return `${completedCount}/${documentTypes.length} documents`;
    } catch (error) {
      console.error("Error in getComplianceDetails:", error, "truck:", truck);
      return "Missing documents";
    }
  }
};

export default TruckList;
