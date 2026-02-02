import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { FaTruck, FaSave, FaEdit, FaPlus, FaSignOutAlt } from "react-icons/fa";
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
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading vehicle rates...</p>
      </div>
    );
  }

  return (
    <div className="vehicle-rate-management">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-left">
            <h1>Welcome, {currentUser?.username || "Staff Member"}</h1>
            <p className="page-subtitle">Vehicle Rate Management</p>
          </div>
          <button onClick={handleLogout} className="btn btn-logout">
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="page-content">
        {/* Add New Rate Button */}
        <div className="actions-bar">
          <button
            onClick={() => setShowAddForm(true)}
            className="btn btn-primary"
            disabled={showAddForm}
          >
            <FaPlus /> Add New Vehicle Rate
          </button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="rate-form">
            <h3>Add New Vehicle Rate</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Vehicle Type</label>
                <select
                  value={newRate.vehicleType}
                  onChange={(e) =>
                    setNewRate({ ...newRate, vehicleType: e.target.value })
                  }
                  className="form-control"
                >
                  <option value="">Select Vehicle Type</option>
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
                        {type}
                      </option>
                    ))}
                </select>
              </div>
              <div className="form-group">
                <label>Rate per KM (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newRate.ratePerKm}
                  onChange={(e) =>
                    setNewRate({ ...newRate, ratePerKm: e.target.value })
                  }
                  className="form-control"
                  placeholder="0.00"
                />
              </div>
              <div className="form-group">
                <label>Base Rate (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newRate.baseRate}
                  onChange={(e) =>
                    setNewRate({ ...newRate, baseRate: e.target.value })
                  }
                  className="form-control"
                  placeholder="0.00"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={newRate.description}
                  onChange={(e) =>
                    setNewRate({ ...newRate, description: e.target.value })
                  }
                  className="form-control"
                  placeholder="Optional description"
                />
              </div>
            </div>
            <div className="form-actions">
              <button
                onClick={() => handleSaveRate(newRate)}
                className="btn btn-success"
                disabled={
                  !newRate.vehicleType ||
                  !newRate.ratePerKm ||
                  !newRate.baseRate
                }
              >
                <FaSave /> Save Rate
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
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Rates Table */}
        <div className="rates-table">
          <table className="table">
            <thead>
              <tr>
                <th>Vehicle Type</th>
                <th>Rate per KM</th>
                <th>Base Rate</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicleRates.map((rate) => (
                <tr key={rate.id}>
                  <td>
                    <div className="vehicle-type">
                      <FaTruck className="vehicle-icon" />
                      {rate.vehicleType}
                      {rate.isDefault && (
                        <span className="default-badge">Default</span>
                      )}
                    </div>
                  </td>
                  <td>
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
                        className="form-control-sm"
                      />
                    ) : (
                      `₱${rate.ratePerKm}`
                    )}
                  </td>
                  <td>
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
                        className="form-control-sm"
                      />
                    ) : (
                      `₱${rate.baseRate}`
                    )}
                  </td>
                  <td>
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
                        className="form-control-sm"
                      />
                    ) : (
                      rate.description
                    )}
                  </td>
                  <td>
                    <div className="action-buttons">
                      {editingRate?.id === rate.id ? (
                        <>
                          <button
                            onClick={() => handleSaveRate(editingRate)}
                            className="btn btn-sm btn-success"
                          >
                            <FaSave />
                          </button>
                          <button
                            onClick={() => setEditingRate(null)}
                            className="btn btn-sm btn-secondary"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setEditingRate(rate)}
                          className="btn btn-sm btn-primary"
                        >
                          <FaEdit />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {vehicleRates.length === 0 && (
            <div className="empty-state">
              <FaTruck />
              <p>No vehicle rates configured</p>
              <p>
                Add vehicle rates to start managing pricing for different truck
                types.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
