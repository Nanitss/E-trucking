import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import {
  FaTruck,
  FaSave,
  FaEdit,
  FaPlus,
  FaSignOutAlt,
  FaTimes,
  FaDollarSign,
  FaRoad,
  FaInfoCircle,
} from "react-icons/fa";
import { AuthContext } from "../../context/AuthContext";
import { useModernToast } from "../../context/ModernToastContext";

export default function VehicleRateManagement() {
  const { currentUser } = useContext(AuthContext);
  const { showSuccess, showError } = useModernToast();

  const [vehicleRates, setVehicleRates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingRate, setEditingRate] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRate, setNewRate] = useState({
    vehicleType: "",
    ratePerKm: "",
    baseRate: "",
    description: "",
  });

  // Available vehicle types
  const availableVehicleTypes = [
    "mini truck",
    "4 wheeler",
    "6 wheeler",
    "8 wheeler",
    "10 wheeler",
  ];

  const vehicleIcons = {
    "mini truck": "🛻",
    "4 wheeler": "🚐",
    "6 wheeler": "🚛",
    "8 wheeler": "🚚",
    "10 wheeler": "🚜",
  };

  useEffect(() => {
    fetchVehicleRates();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("currentUser");
    window.location.href = "/login";
  };

  const fetchVehicleRates = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get("/api/staffs/vehicle-rates", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.data.success) {
        setVehicleRates(response.data.data || []);
      } else {
        throw new Error(
          response.data.message || "Failed to fetch vehicle rates",
        );
      }
    } catch (error) {
      console.error("Error fetching vehicle rates:", error);
      showError("Error", "Failed to load vehicle rates");

      // Initialize with default rates if none exist
      const defaultRates = availableVehicleTypes.map((type, index) => ({
        id: `default-${index}`,
        vehicleType: type,
        ratePerKm: getDefaultRate(type),
        baseRate: getDefaultBaseRate(type),
        description: `Default rate for ${type}`,
        isDefault: true,
      }));
      setVehicleRates(defaultRates);
    } finally {
      setIsLoading(false);
    }
  };

  const getDefaultRate = (vehicleType) => {
    const rates = {
      "mini truck": 15,
      "4 wheeler": 20,
      "6 wheeler": 25,
      "8 wheeler": 30,
      "10 wheeler": 35,
    };
    return rates[vehicleType] || 20;
  };

  const getDefaultBaseRate = (vehicleType) => {
    const baseRates = {
      "mini truck": 100,
      "4 wheeler": 150,
      "6 wheeler": 200,
      "8 wheeler": 250,
      "10 wheeler": 300,
    };
    return baseRates[vehicleType] || 150;
  };

  const handleSaveRate = async (rateData) => {
    try {
      const payload = {
        vehicleType: rateData.vehicleType,
        ratePerKm: parseFloat(rateData.ratePerKm),
        baseRate: parseFloat(rateData.baseRate),
        description: rateData.description || `Rate for ${rateData.vehicleType}`,
      };

      let response;
      if (rateData.id && !rateData.isDefault) {
        response = await axios.put(
          `/api/staffs/vehicle-rates/${rateData.id}`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
      } else {
        response = await axios.post("/api/staffs/vehicle-rates", payload, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
      }

      if (response.data.success) {
        showSuccess("Success", "Vehicle rate saved successfully");
        fetchVehicleRates();
        setEditingRate(null);
        setShowAddForm(false);
        setNewRate({
          vehicleType: "",
          ratePerKm: "",
          baseRate: "",
          description: "",
        });
      } else {
        throw new Error(response.data.message || "Failed to save rate");
      }
    } catch (error) {
      console.error("Error saving vehicle rate:", error);
      showError(
        "Error",
        error.response?.data?.message || "Failed to save vehicle rate",
      );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading vehicle rates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white shadow-md">
                <FaTruck size={18} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  Welcome, {currentUser?.username || "Staff Member"}
                </h1>
                <p className="text-xs text-gray-500">Vehicle Rate Management</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <FaSignOutAlt size={14} /> Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title & Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Vehicle Rates</h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage pricing for different truck types. Changes apply to all new bookings.
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            disabled={showAddForm}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaPlus size={12} /> Add New Rate
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <FaTruck className="text-blue-600" size={16} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{vehicleRates.length}</p>
                <p className="text-xs text-gray-500">Vehicle Types</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <FaDollarSign className="text-green-600" size={16} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  ₱{Math.min(...vehicleRates.map(r => r.baseRate || 0))}
                </p>
                <p className="text-xs text-gray-500">Lowest Base</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <FaDollarSign className="text-purple-600" size={16} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  ₱{Math.max(...vehicleRates.map(r => r.baseRate || 0))}
                </p>
                <p className="text-xs text-gray-500">Highest Base</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                <FaRoad className="text-orange-600" size={16} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  ₱{vehicleRates.length > 0 ? Math.round(vehicleRates.reduce((s, r) => s + (r.ratePerKm || 0), 0) / vehicleRates.length) : 0}
                </p>
                <p className="text-xs text-gray-500">Avg Rate/KM</p>
              </div>
            </div>
          </div>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-md mb-8 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FaPlus size={14} /> Add New Vehicle Rate
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Vehicle Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newRate.vehicleType}
                    onChange={(e) =>
                      setNewRate({ ...newRate, vehicleType: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  >
                    <option value="">Select Type</option>
                    {availableVehicleTypes
                      .filter(
                        (type) =>
                          !vehicleRates.some(
                            (rate) =>
                              rate.vehicleType === type && !rate.isDefault,
                          ),
                      )
                      .map((type) => (
                        <option key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Rate per KM (₱) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newRate.ratePerKm}
                    onChange={(e) =>
                      setNewRate({ ...newRate, ratePerKm: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    placeholder="e.g. 25"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Base Rate (₱) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newRate.baseRate}
                    onChange={(e) =>
                      setNewRate({ ...newRate, baseRate: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    placeholder="e.g. 1000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Description
                  </label>
                  <input
                    type="text"
                    value={newRate.description}
                    onChange={(e) =>
                      setNewRate({ ...newRate, description: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    placeholder="Optional description"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-6 pt-5 border-t border-gray-100">
                <button
                  onClick={() => handleSaveRate(newRate)}
                  disabled={
                    !newRate.vehicleType ||
                    !newRate.ratePerKm ||
                    !newRate.baseRate
                  }
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <FaSave size={12} /> Save Rate
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewRate({
                      vehicleType: "",
                      ratePerKm: "",
                      baseRate: "",
                      description: "",
                    });
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 text-gray-600 bg-gray-100 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors"
                >
                  <FaTimes size={12} /> Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rates Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <FaTruck className="text-blue-600" size={16} /> Current Vehicle Rates
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Vehicle Type</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Rate per KM</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Base Rate</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vehicleRates.map((rate) => (
                  <tr key={rate.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{vehicleIcons[rate.vehicleType] || "🚛"}</span>
                        <div>
                          <p className="font-semibold text-gray-900 capitalize">{rate.vehicleType}</p>
                          {rate.isDefault && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wider">
                              Default
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {editingRate?.id === rate.id ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editingRate.ratePerKm}
                          onChange={(e) =>
                            setEditingRate({
                              ...editingRate,
                              ratePerKm: e.target.value,
                            })
                          }
                          className="w-28 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-sm font-medium text-blue-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        />
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold">
                          <FaRoad size={10} /> ₱{Number(rate.ratePerKm).toLocaleString()}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingRate?.id === rate.id ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editingRate.baseRate}
                          onChange={(e) =>
                            setEditingRate({
                              ...editingRate,
                              baseRate: e.target.value,
                            })
                          }
                          className="w-28 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-sm font-medium text-green-800 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                        />
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-lg text-sm font-bold">
                          <FaDollarSign size={10} /> ₱{Number(rate.baseRate).toLocaleString()}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingRate?.id === rate.id ? (
                        <input
                          type="text"
                          value={editingRate.description}
                          onChange={(e) =>
                            setEditingRate({
                              ...editingRate,
                              description: e.target.value,
                            })
                          }
                          className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        />
                      ) : (
                        <span className="text-sm text-gray-500">{rate.description}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {editingRate?.id === rate.id ? (
                          <>
                            <button
                              onClick={() => handleSaveRate(editingRate)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                            >
                              <FaSave size={10} /> Save
                            </button>
                            <button
                              onClick={() => setEditingRate(null)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-gray-600 bg-gray-100 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
                            >
                              <FaTimes size={10} /> Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setEditingRate({ ...rate })}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
                          >
                            <FaEdit size={10} /> Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {vehicleRates.length === 0 && (
            <div className="text-center py-16 px-8">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <FaTruck className="text-gray-400" size={28} />
              </div>
              <h3 className="text-lg font-bold text-gray-600 mb-2">No Vehicle Rates</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
                Add vehicle rates to start managing pricing for different truck types.
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-md"
              >
                <FaPlus size={12} /> Add First Rate
              </button>
            </div>
          )}
        </div>

        {/* Info Footer */}
        <div className="mt-6 flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
          <FaInfoCircle className="text-blue-500 mt-0.5 flex-shrink-0" size={16} />
          <div className="text-sm text-blue-700">
            <p className="font-semibold mb-1">How pricing works</p>
            <p className="text-blue-600">
              Total delivery cost = <strong>Base Rate</strong> + (<strong>Rate per KM</strong> x Distance).
              The base rate is the minimum charge regardless of distance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
