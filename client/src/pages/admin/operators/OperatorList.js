// src/pages/admin/operators/OperatorList.js - Enhanced with improved design
import React, { useState, useEffect, useMemo } from "react";
import { Link, useHistory } from "react-router-dom";
import axios from "axios";
import {
  TbUser,
  TbEye,
  TbEdit,
  TbSettings,
  TbCheck,
  TbClock,
  TbFileText,
  TbActivity,
  TbArrowUp,
  TbArrowDown,
} from "react-icons/tb";
import AdminHeader from "../../../components/common/AdminHeader";
import { API_BASE_URL } from "../../../config/api";

const OperatorList = () => {
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const history = useHistory();

  // Fetch operators on component mount
  useEffect(() => {
    const fetchOperators = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("Fetching operators from API...");
        const baseURL = API_BASE_URL;
        console.log("API Base URL:", baseURL);

        const response = await axios.get(`${baseURL}/api/operators`);
        console.log("API Response:", response);

        if (response.data && Array.isArray(response.data)) {
          setOperators(response.data);
          console.log("Operators loaded:", response.data.length);
        } else {
          console.warn("API returned unexpected data format:", response.data);
          setOperators([]);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching operators:", err);
        if (err.response) {
          setError(
            `Server error (${err.response.status}): ${err.response.data?.message || "Unknown error"}`,
          );
        } else if (err.request) {
          setError(
            "No response received from server. Please check your API connection.",
          );
        } else {
          setError(`Request error: ${err.message}`);
        }
        setLoading(false);
        setOperators([]);
      }
    };

    fetchOperators();
  }, []);

  // Filter operators based on search and status
  const filteredOperators = useMemo(() => {
    let filtered = operators;

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (operator) =>
          operator.OperatorStatus?.toLowerCase() === statusFilter.toLowerCase(),
      );
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (operator) =>
          operator.OperatorName?.toLowerCase().includes(
            searchTerm.toLowerCase(),
          ) ||
          operator.OperatorUserName?.toLowerCase().includes(
            searchTerm.toLowerCase(),
          ) ||
          operator.OperatorNumber?.includes(searchTerm) ||
          operator.OperatorAddress?.toLowerCase().includes(
            searchTerm.toLowerCase(),
          ),
      );
    }

    return filtered;
  }, [operators, searchTerm, statusFilter]);

  // Get summary data
  const getSummaryData = () => {
    const total = operators.length;
    const active = operators.filter(
      (o) => o.OperatorStatus?.toLowerCase() === "active",
    ).length;
    const inactive = operators.filter(
      (o) => o.OperatorStatus?.toLowerCase() === "inactive",
    ).length;
    const pending = operators.filter(
      (o) => o.OperatorStatus?.toLowerCase() === "pending",
    ).length;

    return { total, active, inactive, pending };
  };

  const summaryData = getSummaryData();

  // Get unique statuses for filter dropdown
  const uniqueStatuses = [
    ...new Set(operators.map((o) => o.OperatorStatus).filter(Boolean)),
  ];

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

  // Handle operator deletion
  const handleDelete = async (operatorId) => {
    if (
      window.confirm(
        "Are you sure you want to delete this operator? This action cannot be undone.",
      )
    ) {
      try {
        const baseURL = API_BASE_URL;
        await axios.delete(`${baseURL}/api/operators/${operatorId}`);
        // Remove the operator from the state
        setOperators(
          operators.filter((operator) => operator.OperatorID !== operatorId),
        );
      } catch (err) {
        console.error("Error deleting operator:", err);
        alert("Failed to delete operator. Please try again.");
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading operators data...</div>;
  }

  return (
    <div className="admin-page-container">
      <AdminHeader currentUser={null} />

      <div className="admin-content">
        {/* Greeting and Summary Cards */}
        <div className="greeting-section">
          <h2 className="greeting-text">Operators Management</h2>
          <p className="greeting-subtitle">
            Manage operator accounts and status
          </p>

          <div className="summary-cards">
            <div className="summary-card">
              <div className="card-icon">
                <TbUser size={24} />
              </div>
              <div className="card-content">
                <div className="card-value">{operators.length}</div>
                <div className="card-label">Total Operators</div>
                <div className="card-change positive">
                  <TbArrowUp size={12} />
                  +2.3%
                </div>
              </div>
            </div>

            <div className="summary-card">
              <div className="card-icon">
                <TbCheck size={24} />
              </div>
              <div className="card-content">
                <div className="card-value">
                  {operators.filter((o) => o.status === "active").length}
                </div>
                <div className="card-label">Active</div>
                <div className="card-change positive">
                  <TbArrowUp size={12} />
                  +1.7%
                </div>
              </div>
            </div>

            <div className="summary-card">
              <div className="card-icon">
                <TbClock size={24} />
              </div>
              <div className="card-content">
                <div className="card-value">
                  {operators.filter((o) => o.status === "inactive").length}
                </div>
                <div className="card-label">Inactive</div>
                <div className="card-change neutral">
                  <TbActivity size={12} />
                  0.0%
                </div>
              </div>
            </div>

            <div className="summary-card">
              <div className="card-icon">
                <TbFileText size={24} />
              </div>
              <div className="card-content">
                <div className="card-value">
                  {operators.filter((o) => o.role === "dispatcher").length}
                </div>
                <div className="card-label">Dispatchers</div>
                <div className="card-change positive">
                  <TbArrowUp size={12} />
                  +0.8%
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
            <div style={{ marginTop: "10px", fontSize: "12px" }}>
              <button
                onClick={() => window.location.reload()}
                className="btn btn-secondary btn-sm"
              >
                Refresh Page
              </button>
            </div>
            <button onClick={() => setError(null)} className="close-btn">
              ×
            </button>
          </div>
        )}

        {/* Modern Filters */}
        <div className="modern-filters">
          <div className="filters-header">
            <div className="filters-header-icon">🔍</div>
            <h3>Search & Filter</h3>
          </div>

          <div className="filters-grid">
            {/* Search */}
            <div className="search-container">
              <label className="search-label">Search</label>
              <div className="search-input-wrapper">
                <div className="search-icon">🔍</div>
                <input
                  type="text"
                  placeholder="Search by name, username, phone, or address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="modern-search-input"
                />
              </div>
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
                {uniqueStatuses.map((status) => (
                  <option key={status} value={status}>
                    {formatStatus(status)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-actions">
            <button
              className="btn btn-secondary"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
              }}
            >
              Clear All Filters
            </button>

            <div className="filter-summary">
              Showing {filteredOperators.length} of {operators.length} operators
            </div>
          </div>
        </div>

        {/* Results */}
        {filteredOperators.length === 0 && !loading ? (
          <div className="no-data">
            {searchTerm || statusFilter !== "all"
              ? "No operators found matching the current filters."
              : "No operator records found. Add a new operator to get started."}
            {!error && !searchTerm && statusFilter === "all" && (
              <div
                style={{ marginTop: "10px", fontSize: "12px", color: "#666" }}
              >
                If you believe this is an error, check console for API debugging
                information.
              </div>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Operator ID</th>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Address</th>
                  <th>Phone Number</th>
                  <th>Employment Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOperators.map((operator) => (
                  <tr key={operator.OperatorID}>
                    <td>{operator.OperatorID}</td>
                    <td>{operator.OperatorName}</td>
                    <td>{operator.OperatorUserName}</td>
                    <td>{operator.OperatorAddress}</td>
                    <td>{operator.OperatorNumber}</td>
                    <td>
                      {operator.OperatorEmploymentDate
                        ? new Date(
                          operator.OperatorEmploymentDate,
                        ).toLocaleDateString()
                        : "-"}
                    </td>
                    <td>
                      <span
                        className={`status-badge ${getStatusBadgeClass(operator.OperatorStatus)}`}
                      >
                        {formatStatus(operator.OperatorStatus)}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <Link
                        to={`/admin/operators/edit/${operator.OperatorID}`}
                        className="action-btn edit-btn"
                        title="Edit Operator"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(operator.OperatorID)}
                        className="action-btn delete-btn"
                        title="Delete Operator"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OperatorList;
