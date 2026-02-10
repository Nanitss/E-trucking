// src/pages/admin/clients/ClientTruckAllocation.js - Modern Tailwind UI

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useHistory, Link } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../../../config/api";
import {
  TbTruck,
  TbArrowLeft,
  TbCheck,
  TbX,
  TbFilter,
  TbFilterOff,
  TbAlertTriangle,
  TbCircleCheck,
  TbTrash,
  TbPlus,
  TbLoader2,
} from "react-icons/tb";

const ClientTruckAllocation = () => {
  const { id } = useParams();
  const history = useHistory();
  const baseURL = API_BASE_URL;

  const [client, setClient] = useState(null);
  const [allocatedTrucks, setAllocatedTrucks] = useState([]);
  const [availableTrucks, setAvailableTrucks] = useState([]);
  const [selectedTrucks, setSelectedTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allocating, setAllocating] = useState(false);
  const [deallocating, setDeallocating] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [allocationType, setAllocationType] = useState("individual");
  const [truckTypes, setTruckTypes] = useState([]);
  const [selectedType, setSelectedType] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch client data
        console.log("🔄 Fetching client data...");
        const clientResponse = await axios.get(`${baseURL}/api/clients/${id}`);
        console.log("✅ Client data:", clientResponse.data);
        setClient(clientResponse.data);

        // Fetch allocated trucks for this client
        console.log("🔄 Fetching allocated trucks...");
        const allocatedResponse = await axios.get(
          `${baseURL}/api/clients/${id}/trucks`,
        );
        console.log("✅ Allocated trucks:", allocatedResponse.data);
        setAllocatedTrucks(allocatedResponse.data);

        // Fetch available trucks
        console.log("🔄 Fetching available trucks...");
        const availableResponse = await axios.get(
          `${baseURL}/api/trucks/available`,
        );
        console.log("✅ Available trucks:", availableResponse.data);
        setAvailableTrucks(availableResponse.data);

        // Extract unique truck types
        const allTrucks = [
          ...allocatedResponse.data,
          ...availableResponse.data,
        ];
        const types = [
          ...new Set(
            allTrucks.map((truck) => truck.truckType || truck.TruckType),
          ),
        ];
        setTruckTypes(types);
        if (types.length > 0) {
          setSelectedType(types[0]);
        }

        setLoading(false);
      } catch (err) {
        console.error("❌ Error fetching data:", err);
        setError("Failed to load data. Please try again.");
        setLoading(false);
      }
    };

    fetchData();
  }, [id, baseURL]);

  // Filter available trucks - SHARED ALLOCATION MODEL
  // Trucks can be allocated to multiple clients regardless of status
  // Only exclude trucks already allocated to THIS client
  const filteredAvailableTrucks = useMemo(() => {
    // Get IDs of trucks already allocated to THIS client
    const allocatedTruckIds = allocatedTrucks.map(
      (truck) => truck.id || truck.TruckID,
    );

    // Filter out only trucks already allocated to THIS client
    // NO STATUS RESTRICTIONS - booking restrictions enforced at delivery creation
    let filtered = availableTrucks.filter((truck) => {
      const truckId = truck.id || truck.TruckID;

      // Only exclude if already allocated to this client
      return !allocatedTruckIds.includes(truckId);
    });

    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (truck) => (truck.truckStatus || truck.TruckStatus) === statusFilter,
      );
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter(
        (truck) => (truck.truckType || truck.TruckType) === typeFilter,
      );
    }

    return filtered;
  }, [availableTrucks, allocatedTrucks, statusFilter, typeFilter]);

  // Get available trucks count by type - SHARED ALLOCATION MODEL
  const getAvailableTruckCountByType = (type) => {
    const allocatedTruckIds = allocatedTrucks.map(
      (truck) => truck.id || truck.TruckID,
    );
    return availableTrucks.filter((truck) => {
      const truckId = truck.id || truck.TruckID;
      return (
        (truck.truckType || truck.TruckType) === type &&
        !allocatedTruckIds.includes(truckId)
      );
    }).length;
  };

  // Handle truck selection for individual allocation
  const handleTruckSelection = (truckId) => {
    setSelectedTrucks((prev) =>
      prev.includes(truckId)
        ? prev.filter((id) => id !== truckId)
        : [...prev, truckId],
    );
  };

  // Allocate trucks to client
  const handleAllocateTrucks = async () => {
    if (allocationType === "individual" && selectedTrucks.length === 0) {
      setError("Please select at least one truck to allocate");
      return;
    }

    if (allocationType === "byType" && (!selectedType || quantity <= 0)) {
      setError("Please select a truck type and specify a valid quantity");
      return;
    }

    try {
      setAllocating(true);
      setError(null);

      let truckIds;

      if (allocationType === "individual") {
        truckIds = selectedTrucks;
      } else {
        // Get IDs of trucks already allocated to THIS client
        const allocatedTruckIds = allocatedTrucks.map(
          (truck) => truck.id || truck.TruckID,
        );

        // Get available trucks of the selected type (SHARED MODEL - exclude only this client's trucks)
        const availableTrucksOfType = availableTrucks
          .filter((truck) => {
            const truckId = truck.id || truck.TruckID;
            return (
              (truck.truckType || truck.TruckType) === selectedType &&
              !allocatedTruckIds.includes(truckId)
            );
          })
          .map((truck) => truck.id || truck.TruckID);

        // Take only the requested quantity
        const availableQuantity = Math.min(
          availableTrucksOfType.length,
          quantity,
        );

        if (availableQuantity < quantity) {
          setError(
            `Only ${availableQuantity} trucks of type "${selectedType}" are available. Allocating all available.`,
          );
        }

        truckIds = availableTrucksOfType.slice(0, availableQuantity);

        if (truckIds.length === 0) {
          setError(
            `No trucks of type "${selectedType}" are available for allocation.`,
          );
          setAllocating(false);
          return;
        }
      }

      console.log("🔄 Allocating trucks:", truckIds);
      console.log("🔄 Client ID:", id);

      // Allocate the trucks
      const response = await axios.post(
        `${baseURL}/api/clients/${id}/allocate-trucks`,
        {
          truckIds,
        },
      );

      console.log("✅ Allocation response:", response.data);

      if (
        response.data.failedAllocations &&
        response.data.failedAllocations.length > 0
      ) {
        console.warn(
          "⚠️ Some allocations failed:",
          response.data.failedAllocations,
        );
        setError(
          `Some trucks could not be allocated. ${response.data.failedAllocations.map((f) => f.reason).join(", ")}`,
        );
      }

      // Refresh data
      await refreshData();

      // Clear selection
      setSelectedTrucks([]);
      setQuantity(1);

      // Show success message
      const successMsg =
        response.data.successfulAllocations &&
          response.data.successfulAllocations.length
          ? `${response.data.successfulAllocations.length} trucks allocated successfully!`
          : "Trucks allocated successfully!";

      setSuccessMessage(successMsg);
      setTimeout(() => setSuccessMessage(""), 3000);

      setAllocating(false);
    } catch (err) {
      console.error("❌ Error allocating trucks:", err);
      setError(
        "Failed to allocate trucks. Please try again. " +
        (err.response?.data?.message || err.message),
      );
      setAllocating(false);
    }
  };

  // Deallocate individual truck
  const handleDeallocate = async (truckId) => {
    if (!window.confirm("Are you sure you want to deallocate this truck?")) {
      return;
    }

    try {
      setDeallocating(truckId);

      await axios.delete(`${baseURL}/api/clients/${id}/trucks/${truckId}`);

      await refreshData();

      setSuccessMessage("Truck deallocated successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);

      setDeallocating(null);
    } catch (err) {
      console.error("Error deallocating truck:", err);
      setError("Failed to deallocate truck. Please try again.");
      setDeallocating(null);
    }
  };

  // Deallocate trucks by type
  const handleDeallocateByType = async (type) => {
    const trucksToRemove = allocatedTrucks.filter(
      (truck) => (truck.truckType || truck.TruckType) === type,
    );

    if (trucksToRemove.length === 0) {
      alert(`No trucks of type "${type}" are allocated to this client.`);
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to deallocate all ${trucksToRemove.length} truck(s) of type "${type}"?`,
      )
    ) {
      return;
    }

    try {
      setDeallocating(`type-${type}`);

      const promises = trucksToRemove.map((truck) =>
        axios.delete(
          `${baseURL}/api/clients/${id}/trucks/${truck.id || truck.TruckID}`,
        ),
      );

      await Promise.all(promises);

      await refreshData();

      setSuccessMessage(
        `${trucksToRemove.length} truck(s) of type "${type}" deallocated successfully!`,
      );
      setTimeout(() => setSuccessMessage(""), 3000);

      setDeallocating(null);
    } catch (err) {
      console.error("Error deallocating trucks:", err);
      setError("Failed to deallocate trucks. Please try again.");
      setDeallocating(null);
    }
  };

  // Refresh data helper
  const refreshData = async () => {
    const [allocatedResponse, availableResponse] = await Promise.all([
      axios.get(`${baseURL}/api/clients/${id}/trucks`),
      axios.get(`${baseURL}/api/trucks/available`),
    ]);

    setAllocatedTrucks(allocatedResponse.data);
    setAvailableTrucks(availableResponse.data);

    // Update truck types
    const allTrucks = [...allocatedResponse.data, ...availableResponse.data];
    const types = [
      ...new Set(allTrucks.map((truck) => truck.truckType || truck.TruckType)),
    ];
    setTruckTypes(types);
  };

  // Helper functions
  const formatStatus = (status) => {
    if (!status) return "Unknown";
    return status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ");
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case "available":
        return "status-available";
      case "allocated":
        return "status-allocated";
      case "on-delivery":
        return "status-busy";
      case "maintenance":
        return "status-maintenance";
      case "active":
        return "status-active";
      default:
        return "status-unknown";
    }
  };

  // Get allocated truck counts by type
  const getAllocatedTrucksByType = () => {
    const counts = {};
    allocatedTrucks.forEach((truck) => {
      const type = truck.truckType || truck.TruckType || "Unknown";
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
  };

  // Get summary data - SHARED ALLOCATION MODEL
  const getSummaryData = () => {
    const allocatedByType = getAllocatedTrucksByType();
    const totalAllocated = allocatedTrucks.length;
    // Count trucks available for this client (excluding already allocated to this client)
    const allocatedTruckIds = allocatedTrucks.map(
      (truck) => truck.id || truck.TruckID,
    );
    const totalAvailable = availableTrucks.filter((truck) => {
      const truckId = truck.id || truck.TruckID;
      return !allocatedTruckIds.includes(truckId);
    }).length;

    return {
      totalAllocated,
      totalAvailable,
      allocatedByType,
    };
  };

  const summaryData = getSummaryData();

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "available": return "bg-green-100 text-green-700 border-green-200";
      case "allocated": return "bg-blue-100 text-blue-700 border-blue-200";
      case "on-delivery": return "bg-orange-100 text-orange-700 border-orange-200";
      case "maintenance": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "active": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  if (loading && !client) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <TbLoader2 className="animate-spin text-primary-600" size={40} />
          <p className="text-gray-500 font-medium">Loading truck allocation data...</p>
        </div>
      </div>
    );
  }

  if (error && !client) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <TbAlertTriangle className="text-red-500 mx-auto mb-4" size={48} />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <button onClick={() => window.location.reload()} className="px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <TbTruck className="text-primary-600" size={24} />
                Truck Allocation
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Client: <span className="font-semibold text-gray-800">{client?.clientName || client?.name || "—"}</span>
              </p>
            </div>
            <button
              onClick={() => history.push("/admin/clients/clientlist")}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all flex items-center gap-2"
            >
              <TbArrowLeft size={16} /> Back to Clients
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
            ℹ️ Trucks can be shared across multiple clients. Booking restrictions apply by date.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Alerts */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            <TbAlertTriangle size={20} />
            <span className="text-sm font-medium flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600"><TbX size={18} /></button>
          </div>
        )}
        {successMessage && (
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700">
            <TbCircleCheck size={20} />
            <span className="text-sm font-medium flex-1">{successMessage}</span>
            <button onClick={() => setSuccessMessage("")} className="text-green-400 hover:text-green-600"><TbX size={18} /></button>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <TbTruck size={22} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{summaryData.totalAllocated}</p>
                <p className="text-xs text-gray-500 font-medium">Allocated Trucks</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                <TbCheck size={22} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{summaryData.totalAvailable}</p>
                <p className="text-xs text-gray-500 font-medium">Available Trucks</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                <TbFilter size={22} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{truckTypes.length}</p>
                <p className="text-xs text-gray-500 font-medium">Truck Types</p>
              </div>
            </div>
          </div>
        </div>

        {/* Allocated Trucks Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Allocated Trucks</h2>
          </div>

          {allocatedTrucks.length === 0 ? (
            <div className="p-12 text-center">
              <TbTruck className="mx-auto text-gray-300 mb-3" size={48} />
              <p className="text-gray-500 font-medium">No trucks allocated to this client yet.</p>
              <p className="text-xs text-gray-400 mt-1">Use the section below to allocate trucks.</p>
            </div>
          ) : (
            <>
              {/* Allocation Summary by Type */}
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Summary by Type</p>
                <div className="flex flex-wrap gap-2">
                  {summaryData.allocatedByType.map(([type, count]) => (
                    <div key={type} className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-1.5">
                      <span className="text-sm font-medium text-gray-700">{type}</span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">{count}</span>
                      <button
                        onClick={() => handleDeallocateByType(type)}
                        disabled={deallocating === `type-${type}`}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded p-0.5 transition-colors disabled:opacity-50"
                        title={`Deallocate all ${type}`}
                      >
                        {deallocating === `type-${type}` ? <TbLoader2 className="animate-spin" size={14} /> : <TbTrash size={14} />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Allocated Trucks Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plate</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Capacity</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {allocatedTrucks.map((truck) => {
                      const truckId = truck.id || truck.TruckID;
                      return (
                        <tr key={truckId} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-3">
                            <span className="font-mono text-sm font-semibold text-gray-800">{truck.truckPlate || truck.TruckPlate}</span>
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-600">{truck.truckType || truck.TruckType}</td>
                          <td className="px-6 py-3 text-sm text-gray-600">{truck.truckCapacity || truck.TruckCapacity} tons</td>
                          <td className="px-6 py-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(truck.truckStatus || truck.TruckStatus)}`}>
                              {formatStatus(truck.truckStatus || truck.TruckStatus)}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <button
                              onClick={() => handleDeallocate(truckId)}
                              disabled={deallocating === truckId}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                            >
                              {deallocating === truckId ? <TbLoader2 className="animate-spin" size={14} /> : <TbTrash size={14} />}
                              {deallocating === truckId ? "Removing..." : "Remove"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Allocate New Trucks Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <TbPlus size={18} className="text-primary-600" /> Allocate New Trucks
            </h2>
          </div>

          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            {/* Allocation Type Toggle */}
            <div className="flex items-center gap-4 mb-4">
              <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border text-sm font-medium transition-all ${allocationType === "individual" ? "bg-primary-50 border-primary-300 text-primary-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                <input type="radio" value="individual" checked={allocationType === "individual"} onChange={(e) => setAllocationType(e.target.value)} className="sr-only" />
                <TbCheck size={16} /> Select Individual Trucks
              </label>
              <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border text-sm font-medium transition-all ${allocationType === "byType" ? "bg-primary-50 border-primary-300 text-primary-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                <input type="radio" value="byType" checked={allocationType === "byType"} onChange={(e) => setAllocationType(e.target.value)} className="sr-only" />
                <TbFilter size={16} /> Allocate by Type
              </label>
            </div>

            {allocationType === "byType" && (
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Truck Type</label>
                  <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}
                    className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 min-w-[200px]">
                    {truckTypes.map((type) => (
                      <option key={type} value={type}>{type} ({getAvailableTruckCountByType(type)} available)</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Quantity</label>
                  <input type="number" min="1" max={getAvailableTruckCountByType(selectedType)} value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 w-24" />
                </div>
                <button onClick={handleAllocateTrucks} disabled={allocating || !selectedType || quantity <= 0}
                  className="px-5 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
                  {allocating ? <><TbLoader2 className="animate-spin" size={16} /> Allocating...</> : <><TbPlus size={16} /> Allocate {quantity} Truck(s)</>}
                </button>
              </div>
            )}

            {allocationType === "individual" && (
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</label>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 min-w-[180px]">
                    <option value="all">All Status</option>
                    <option value="available">Available</option>
                    <option value="active">Active</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</label>
                  <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                    className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 min-w-[160px]">
                    <option value="all">All Types</option>
                    {truckTypes.map((type) => (<option key={type} value={type}>{type}</option>))}
                  </select>
                </div>
                {(statusFilter !== "all" || typeFilter !== "all") && (
                  <button onClick={() => { setStatusFilter("all"); setTypeFilter("all"); }}
                    className="px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 transition-colors">
                    <TbFilterOff size={16} /> Clear
                  </button>
                )}
                <button onClick={handleAllocateTrucks} disabled={allocating || selectedTrucks.length === 0}
                  className="px-5 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ml-auto">
                  {allocating ? <><TbLoader2 className="animate-spin" size={16} /> Allocating...</> : <><TbPlus size={16} /> Allocate Selected ({selectedTrucks.length})</>}
                </button>
              </div>
            )}
          </div>

          {allocationType === "individual" && (
            <>
              {filteredAvailableTrucks.length === 0 ? (
                <div className="p-12 text-center">
                  <TbTruck className="mx-auto text-gray-300 mb-3" size={40} />
                  <p className="text-gray-500 font-medium">No available trucks matching filters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="px-6 py-3 w-12">
                          <input type="checkbox"
                            checked={selectedTrucks.length === filteredAvailableTrucks.length && filteredAvailableTrucks.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTrucks(filteredAvailableTrucks.map(t => t.id || t.TruckID));
                              } else {
                                setSelectedTrucks([]);
                              }
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                        </th>
                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plate</th>
                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Capacity</th>
                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredAvailableTrucks.map((truck) => {
                        const truckId = truck.id || truck.TruckID;
                        const isSelected = selectedTrucks.includes(truckId);
                        return (
                          <tr key={truckId} onClick={() => handleTruckSelection(truckId)}
                            className={`cursor-pointer transition-colors ${isSelected ? "bg-primary-50" : "hover:bg-gray-50"}`}>
                            <td className="px-6 py-3">
                              <input type="checkbox" checked={isSelected} readOnly
                                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 pointer-events-none" />
                            </td>
                            <td className="px-6 py-3">
                              <span className="font-mono text-sm font-semibold text-gray-800">{truck.truckPlate || truck.TruckPlate}</span>
                            </td>
                            <td className="px-6 py-3 text-sm text-gray-600">{truck.truckType || truck.TruckType}</td>
                            <td className="px-6 py-3 text-sm text-gray-600">{truck.truckCapacity || truck.TruckCapacity} tons</td>
                            <td className="px-6 py-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(truck.truckStatus || truck.TruckStatus)}`}>
                                {formatStatus(truck.truckStatus || truck.TruckStatus)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientTruckAllocation;
