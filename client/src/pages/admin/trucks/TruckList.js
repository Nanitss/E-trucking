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
  TbSearch,
} from "react-icons/tb";
import { useTimeframe } from "../../../contexts/TimeframeContext";
import FileViewer from "../../../components/FileViewer";
import AdminHeader from "../../../components/common/AdminHeader";
import { API_BASE_URL } from "../../../config/api";

const TruckList = ({ currentUser }) => {
  // Use centralized API configuration
  const baseURL = API_BASE_URL;
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
          trucksResponse.data,
        );
        console.log("Raw API response (deliveries):", deliveriesResponse.data);
        console.log(
          "Raw API response (allocations):",
          allocationsResponse.data,
        );

        // Store deliveries
        const deliveriesData = Array.isArray(deliveriesResponse.data)
          ? deliveriesResponse.data
          : [];
        setDeliveries(deliveriesData);
        console.log(
          `📦 Loaded ${deliveriesData.length} deliveries for truck status validation`,
        );

        // Store allocations
        const allocationsData = Array.isArray(allocationsResponse.data)
          ? allocationsResponse.data
          : [];
        setAllocations(allocationsData);
        console.log(
          `🔗 Loaded ${allocationsData.length} allocations for truck status validation`,
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
                truck,
              );
              return false;
            }
            return true;
          });

          console.log(
            `📊 Filtered ${trucksData.length - validTrucks.length
            } invalid trucks`,
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
                  `🚛 Truck ${truck.truckPlate || truckId
                  } has active delivery (${deliveryStatus})`,
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
                  `🔗 Truck ${truck.truckPlate || truckId
                  } has active allocation (Client: ${allocation.clientId || "Unknown"
                  })`,
                );
              }

              return isMatch;
            });

            console.log(
              `Processing truck ${truck.truckPlate || truckId
              }: hasActiveDelivery=${hasActiveDelivery}, hasActiveAllocation=${hasActiveAllocation}`,
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
            formattedTrucks,
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
        truck.OperationalStatus === "maintenance",
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
        (truck) => truck.AllocationStatus?.toLowerCase() === allocationFilter,
      );
    }

    // Apply operational filter
    if (operationalFilter !== "all") {
      filtered = filtered.filter(
        (truck) => truck.OperationalStatus?.toLowerCase() === operationalFilter,
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
          complianceFilter,
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
          truck.TruckID?.toLowerCase().includes(query),
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
    const baseClasses =
      "px-2.5 py-0.5 rounded-full text-xs font-bold capitalize border";
    switch (status?.toLowerCase()) {
      case "available":
      case "active":
      case "free":
        return `${baseClasses} bg-emerald-100 text-emerald-700 border-emerald-200`;
      case "allocated":
      case "reserved":
        return `${baseClasses} bg-blue-100 text-blue-700 border-blue-200`;
      case "on-delivery":
      case "busy":
        return `${baseClasses} bg-amber-100 text-amber-700 border-amber-200`;
      case "maintenance":
        return `${baseClasses} bg-red-100 text-red-700 border-red-200`;
      case "out-of-service":
        return `${baseClasses} bg-gray-600 text-white border-gray-600`;
      case "scheduled":
      case "standby":
        return `${baseClasses} bg-purple-100 text-purple-700 border-purple-200`;
      case "registration-expiring":
        return `${baseClasses} bg-amber-50 text-amber-600 border-amber-200`;
      case "registration-expired":
        return `${baseClasses} bg-red-50 text-red-600 border-red-200`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-700 border-gray-200`;
    }
  };

  // Helper function to format status text
  const formatStatus = (status) => {
    if (!status) return "Unknown";
    return status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ");
  };

  // Get summary status indicator
  const getSummaryStatusClass = (truck) => {
    const baseClasses =
      "px-2.5 py-0.5 rounded-full text-xs font-bold capitalize border";
    if (truck.NeedsMaintenance)
      return `${baseClasses} bg-red-100 text-red-700 border-red-200`;
    if (truck.IsInUse)
      return `${baseClasses} bg-amber-100 text-amber-700 border-amber-200`;
    if (truck.IsAllocated)
      return `${baseClasses} bg-blue-100 text-blue-700 border-blue-200`;
    if (truck.IsAvailable)
      return `${baseClasses} bg-emerald-100 text-emerald-700 border-emerald-200`;
    return `${baseClasses} bg-gray-100 text-gray-700 border-gray-200`;
  };

  // Get display status (for Status column - shows Inactive when registration issues)
  const getDisplayStatus = (truck) => {
    if (
      truck.OperationalStatus === "registration-expired" ||
      truck.OperationalStatus === "registration-expiring"
    ) {
      return "Inactive";
    }
    return formatStatus(truck.OperationalStatus) || "Active";
  };

  // Get status badge class for display status
  const getDisplayStatusBadgeClass = (truck) => {
    const baseClasses =
      "px-2.5 py-0.5 rounded-full text-xs font-bold capitalize border";
    if (
      truck.OperationalStatus === "registration-expired" ||
      truck.OperationalStatus === "registration-expiring"
    ) {
      return `${baseClasses} bg-gray-100 text-gray-500 border-gray-200`;
    }
    return getStatusBadgeClass(truck.OperationalStatus);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Loading trucks data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
            <TbAlertCircle size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Error Loading Data
          </h3>
          <p className="text-gray-500 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AdminHeader currentUser={currentUser} />

      <div className="flex-1 p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
        {/* Greeting and Summary Cards */}
        <div className="flex flex-col gap-1 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Truck Management
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Manage your fleet vehicles, track documents, and monitor
                compliance status
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 shadow-sm">
              <TbCalendar size={14} className="text-gray-400" />
              <span>Showing data for: {getFormattedDateRange()}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 transition-transform hover:-translate-y-1 hover:shadow-md">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                <TbTruck size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {trucks.length}
                </div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Total Trucks
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 mt-1">
                  <TbArrowUp size={12} />
                  <span>+2.1%</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 transition-transform hover:-translate-y-1 hover:shadow-md">
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
                <TbCheck size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {
                    trucks.filter((t) => t.OperationalStatus === "active")
                      .length
                  }
                </div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Available
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 mt-1">
                  <TbArrowUp size={12} />
                  <span>+1.5%</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 transition-transform hover:-translate-y-1 hover:shadow-md">
              <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center text-purple-600">
                <TbClock size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {trucks.filter((t) => t.IsAllocated === true).length}
                </div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Allocated
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-gray-500 mt-1">
                  <TbActivity size={12} />
                  <span>0.0%</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 transition-transform hover:-translate-y-1 hover:shadow-md">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-600">
                <TbSettings size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {
                    trucks.filter(
                      (t) =>
                        t.NeedsMaintenance === true ||
                        t.OperationalStatus === "maintenance",
                    ).length
                  }
                </div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Maintenance
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-red-600 mt-1">
                  <TbArrowDown size={12} />
                  <span>-0.8%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Filter Bar - Popover Style */}
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-6 relative">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-lg w-full">
              <TbSearch
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Search trucks by plate, brand, or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              {/* Filter Button */}
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

              {/* View Toggle */}
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

          <div className="mt-3 text-gray-500 text-sm font-medium">
            Showing {filteredTrucks.length} of {trucks.length} trucks
          </div>

          {/* Filter Popup */}
          {showFilters && (
            <div className="absolute top-full mt-2 right-0 md:left-0 z-50 bg-white rounded-xl shadow-xl border border-gray-100 w-[480px] max-w-[90vw] p-5 animate-in fade-in zoom-in-95 duration-200">
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

              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Type Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase">
                    Type
                  </label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase">
                    Brand
                  </label>
                  <select
                    value={brandFilter}
                    onChange={(e) => setBrandFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase">
                    Compliance
                  </label>
                  <select
                    value={complianceFilter}
                    onChange={(e) => setComplianceFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="all">All Compliance</option>
                    <option value="complete">Complete</option>
                    <option value="incomplete">Incomplete</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>

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
                    <option value="available">Available</option>
                    <option value="allocated">Allocated</option>
                    <option value="on-delivery">On Delivery</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="scheduled">Scheduled</option>
                  </select>
                </div>

                {/* Operational Filter */}
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase">
                    Operational
                  </label>
                  <select
                    value={operationalFilter}
                    onChange={(e) => setOperationalFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="all">All Operational</option>
                    <option value="active">Active</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="out-of-service">Out of Service</option>
                    <option value="standby">Standby</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                  onClick={() => {
                    setStatusFilter("all");
                    setAllocationFilter("all");
                    setOperationalFilter("all");
                    setTypeFilter("all");
                    setBrandFilter("all");
                    setComplianceFilter("all");
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

        {/* Trucks Content */}
        {filteredTrucks.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400">
              <TbTruck size={40} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              No trucks found
            </h3>
            <p className="text-gray-500 max-w-md mx-auto mb-8">
              No trucks match your current filters. Try adjusting your search
              criteria or add a new truck.
            </p>
            <Link
              to="/admin/trucks/add"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm shadow-blue-200 transition-colors"
            >
              <TbPlus size={20} />
              Add Your First Truck
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
                      onClick={() => handleSort("TruckPlate")}
                      className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      Plate Number{" "}
                      {sortField === "TruckPlate" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      onClick={() => handleSort("TruckType")}
                      className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      Type{" "}
                      {sortField === "TruckType" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      onClick={() => handleSort("TruckBrand")}
                      className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      Brand{" "}
                      {sortField === "TruckBrand" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      onClick={() => handleSort("ModelYear")}
                      className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      Year{" "}
                      {sortField === "ModelYear" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      onClick={() => handleSort("OperationalStatus")}
                      className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      Status{" "}
                      {sortField === "OperationalStatus" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Registration Status
                    </th>
                    <th
                      onClick={() => handleSort("documentCompliance")}
                      className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      Compliance{" "}
                      {sortField === "documentCompliance" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 border-t border-gray-100">
                  {getSortedAndPaginatedTrucks().map((truck) => (
                    <tr
                      key={truck.TruckID}
                      className="hover:bg-gray-50/50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <TbTruck size={16} />
                          </div>
                          <span className="font-medium text-gray-900 line-clamp-1">
                            {truck.TruckPlate}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                          {truck.TruckType || "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {truck.TruckBrand || "Unknown"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {truck.ModelYear || "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        <span className={getDisplayStatusBadgeClass(truck)}>
                          {getDisplayStatus(truck)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {/* Registration Status Column */}
                        {truck.registrationExpiryWarning ? (
                          <div
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${truck.OperationalStatus === "registration-expired"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                          >
                            {truck.OperationalStatus ===
                              "registration-expired" ? (
                              <span>
                                <TbAlertCircle
                                  size={14}
                                  className="inline mr-1"
                                />
                                Expired
                              </span>
                            ) : (
                              <span>
                                <TbClock size={14} className="inline mr-1" />
                                Expires in{" "}
                                {truck.registrationExpiryDaysRemaining} days
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {getComplianceIcon(truck)}
                          </span>
                          <span className="text-sm font-medium text-gray-600">
                            {truck.documentCompliance?.requiredDocumentCount ||
                              0}
                            /3
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleViewDetails(truck)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <TbEye size={18} />
                          </button>
                          <Link
                            to={`/admin/trucks/edit/${truck.TruckID}`}
                            className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
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
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm font-medium"
                >
                  ← Previous
                </button>
                <span className="text-sm text-gray-600 font-medium">
                  Page {currentPage} of {totalPages} ({filteredTrucks.length}{" "}
                  trucks)
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm font-medium"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        ) : (
          // CARD VIEW
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTrucks.map((truck) => {
              const requirements = getLicenseRequirements(truck.TruckType);
              const statusClass = getSummaryStatusClass(truck);

              return (
                <div
                  key={truck.TruckID}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group"
                >
                  {/* Card Header */}
                  <div className="p-5 border-b border-gray-50 flex justify-between items-start gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <TbTruck size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">
                          {truck.TruckPlate}
                        </h3>
                        <p className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded mt-1 inline-block capitalize">
                          {truck.TruckType}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={getDisplayStatusBadgeClass(truck)}>
                        {getDisplayStatus(truck)}
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs text-gray-500 uppercase font-semibold block mb-1">
                          Brand
                        </span>
                        <span className="text-sm font-medium text-gray-700">
                          {truck.TruckBrand || "Unknown"}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 uppercase font-semibold block mb-1">
                          Year
                        </span>
                        <span className="text-sm font-medium text-gray-700">
                          {truck.ModelYear || "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 uppercase font-semibold block mb-1">
                          Total KM
                        </span>
                        <span className="text-sm font-medium text-gray-700">
                          {truck.TotalKilometers || 0} km
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 uppercase font-semibold block mb-1">
                          Deliveries
                        </span>
                        <span className="text-sm font-medium text-gray-700">
                          {truck.TotalDeliveries || 0}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-50">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Allocation:</span>
                        <span className="font-medium text-gray-700">
                          {formatStatus(truck.AllocationStatus)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Document Compliance */}
                  <div
                    className={`px-5 py-3 border-t flex items-center justify-between ${getComplianceClass(truck).includes("complete") ? "bg-emerald-50/50 border-emerald-100" : "bg-gray-50/50 border-gray-100"}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {getComplianceIcon(truck)}
                      </span>
                      <div className="text-xs">
                        <div
                          className={`font-medium ${getComplianceClass(truck).includes("complete") ? "text-emerald-700" : "text-gray-600"}`}
                        >
                          {getComplianceStatus(truck)}
                        </div>
                        <div className="text-gray-500">
                          {truck.documentCompliance?.requiredDocumentCount || 0}
                          /3 documents
                        </div>
                      </div>
                    </div>
                    <div className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded border border-gray-200 shadow-sm">
                      {Object.keys(truck.documents || {}).length} files
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="p-4 bg-gray-50 border-t border-gray-100 grid grid-cols-2 gap-3">
                    <Link
                      to={`/admin/trucks/edit/${truck.TruckID}`}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all text-sm font-medium shadow-sm"
                    >
                      <TbEdit size={16} />
                      Edit
                    </Link>
                    <button
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all text-sm font-medium shadow-sm"
                      onClick={() => handleViewDetails(truck)}
                    >
                      <TbEye size={16} />
                      Details
                    </button>
                    <button
                      className={`col-span-2 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all shadow-sm ${recalculatingKm[truck.TruckID] ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200"}`}
                      onClick={() =>
                        handleRecalculateKm(truck.TruckID, truck.TruckPlate)
                      }
                      disabled={recalculatingKm[truck.TruckID]}
                    >
                      {recalculatingKm[truck.TruckID] ? (
                        <TbClock size={16} className="animate-spin" />
                      ) : (
                        <TbActivity size={16} />
                      )}
                      {recalculatingKm[truck.TruckID]
                        ? "Recalculating..."
                        : "Recalculate KM"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Truck Details Modal */}
        {showDetailsModal && selectedTruck && (
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
                    <TbTruck size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedTruck.TruckPlate} Details
                    </h2>
                    <p className="text-sm text-gray-500">
                      View complete truck information and documents
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
                  {/* Basic Information */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                        📋 Basic Information
                      </h3>
                      <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                        <div>
                          <span className="text-xs text-gray-500 block mb-1">
                            Truck ID
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {selectedTruck.TruckID}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 block mb-1">
                            Plate Number
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {selectedTruck.TruckPlate}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 block mb-1">
                            Type
                          </span>
                          <span className="text-sm font-medium text-gray-900 capitalize">
                            {selectedTruck.TruckType}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 block mb-1">
                            Brand
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {selectedTruck.TruckBrand || "Unknown"}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 block mb-1">
                            Model Year
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {selectedTruck.ModelYear || "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 block mb-1">
                            Capacity
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {selectedTruck.TruckCapacity || "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                        📊 Performance Metrics
                      </h3>
                      <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                        <div>
                          <span className="text-xs text-gray-500 block mb-1">
                            Total Kilometers
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {selectedTruck.TotalKilometers?.toLocaleString() ||
                              0}{" "}
                            km
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 block mb-1">
                            Completed Deliveries
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {selectedTruck.TotalDeliveries || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 block mb-1">
                            Avg KM/Delivery
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {selectedTruck.AverageKmPerDelivery || 0} km
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status & Compliance */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                        🚦 Status Information
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium text-gray-600">
                            Operational Status
                          </span>
                          <span
                            className={getStatusBadgeClass(
                              selectedTruck.OperationalStatus,
                            )}
                          >
                            {formatStatus(selectedTruck.OperationalStatus)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium text-gray-600">
                            Allocation Status
                          </span>
                          <span
                            className={getStatusBadgeClass(
                              selectedTruck.AllocationStatus,
                            )}
                          >
                            {formatStatus(selectedTruck.AllocationStatus)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium text-gray-600">
                            Maintenance
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${selectedTruck.NeedsMaintenance ? "bg-red-100 text-red-700 border-red-200" : "bg-emerald-100 text-emerald-700 border-emerald-200"}`}
                          >
                            {selectedTruck.NeedsMaintenance ? "Yes" : "No"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                        📄 Document Compliance
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-sm text-gray-600">
                            Overall Status:
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${getComplianceClass(selectedTruck).includes("complete") ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                          >
                            {getComplianceStatus(selectedTruck)}
                          </span>
                        </div>

                        {/* Document List */}
                        <div className="space-y-2">
                          {[
                            "orDocument",
                            "crDocument",
                            "insuranceDocument",
                          ].map((docType) => (
                            <div
                              key={docType}
                              className="flex items-center justify-between p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-100"
                            >
                              <span className="text-sm text-gray-600 capitalize">
                                {docType.replace("Document", "").toUpperCase()}
                              </span>
                              <span
                                className={`flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${selectedTruck.documents?.[docType] ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
                              >
                                {selectedTruck.documents?.[docType] ? (
                                  <>
                                    <TbCheck size={12} /> Complete
                                  </>
                                ) : (
                                  <>
                                    <TbX size={12} /> Missing
                                  </>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Documents Viewer Section */}
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
                    📁 Documents
                  </h3>
                  {selectedTruck.documents &&
                    Object.keys(selectedTruck.documents).length > 0 ? (
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <FileViewer
                        documents={selectedTruck.documents}
                        truckPlate={selectedTruck.TruckPlate}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400">
                      <TbFileText
                        size={32}
                        className="mx-auto mb-2 opacity-50"
                      />
                      <p>No documents have been uploaded for this truck yet.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                <Link
                  to={`/admin/trucks/edit/${selectedTruck.TruckID}`}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm shadow-blue-200 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <TbEdit size={16} /> Edit Truck
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
        (docType) => truck.documentCompliance[docType] === "complete",
      ).length;

      return `${completedCount}/${documentTypes.length} documents`;
    } catch (error) {
      console.error("Error in getComplianceDetails:", error, "truck:", truck);
      return "Missing documents";
    }
  }
};

export default TruckList;
