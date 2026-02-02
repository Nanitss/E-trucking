import React, { useState, useEffect } from "react";
import axios from "axios";

const AuditTrail = () => {
  const [auditData, setAuditData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    action: "",
    entityType: "",
    user: "",
    startDate: "",
    endDate: "",
  });

  const [availableFilters, setAvailableFilters] = useState({
    actions: [],
    entityTypes: [],
    users: [],
  });

  // Fetch audit data
  useEffect(() => {
    const fetchAuditData = async () => {
      try {
        setLoading(true);
        console.log("Fetching audit data...");
        const response = await axios.get("/api/audit/filter");

        if (response.data && response.data.items) {
          console.log(`Received ${response.data.items.length} audit entries`);
          console.log(
            "Actions found:",
            [...new Set(response.data.items.map((item) => item.action))].join(
              ", ",
            ),
          );

          // Make sure 'logout' is included in actions even if not in the initial data
          setAuditData(response.data.items);
          setFilteredData(response.data.items);

          // Extract available filter options
          let actions = [
            ...new Set(response.data.items.map((item) => item.action)),
          ].filter(Boolean);

          // Ensure logout is always an option in the filter
          if (!actions.includes("logout")) {
            actions.push("logout");
          }

          const entityTypes = [
            ...new Set(response.data.items.map((item) => item.entityType)),
          ].filter(Boolean);
          const users = [
            ...new Set(response.data.items.map((item) => item.user)),
          ].filter(Boolean);

          setAvailableFilters({
            actions,
            entityTypes,
            users,
          });
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching audit data:", err);
        setError("Failed to load audit data. Please try again later.");
        setLoading(false);
      }
    };

    fetchAuditData();
  }, []);

  // Apply filters when they change
  useEffect(() => {
    if (auditData.length > 0) {
      let filtered = [...auditData];

      if (filters.action) {
        filtered = filtered.filter((item) => item.action === filters.action);
      }

      if (filters.entityType) {
        filtered = filtered.filter(
          (item) => item.entityType === filters.entityType,
        );
      }

      if (filters.user) {
        filtered = filtered.filter((item) => item.user === filters.user);
      }

      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        filtered = filtered.filter((item) => {
          const itemDate = new Date(item.timestamp);
          return itemDate >= startDate;
        });
      }

      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999); // End of day
        filtered = filtered.filter((item) => {
          const itemDate = new Date(item.timestamp);
          return itemDate <= endDate;
        });
      }

      setFilteredData(filtered);
    }
  }, [auditData, filters]);

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      action: "",
      entityType: "",
      user: "",
      startDate: "",
      endDate: "",
    });
  };

  // Format date and time for display
  const formatDateTime = (timestamp) => {
    if (!timestamp) return "Unknown";

    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="audit-trail-container">
      <div className="audit-header">
        <h2>Audit Trail</h2>
        <p>View and filter system activity logs</p>
      </div>

      {/* Filter controls */}
      <div className="audit-filters">
        <div className="filter-row">
          <div className="filter-group">
            <label htmlFor="action">Action:</label>
            <select
              id="action"
              name="action"
              value={filters.action}
              onChange={handleFilterChange}
              className="filter-select"
            >
              <option value="">All Actions</option>
              {availableFilters.actions.map((action) => (
                <option key={action} value={action}>
                  {action.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="entityType">Entity Type:</label>
            <select
              id="entityType"
              name="entityType"
              value={filters.entityType}
              onChange={handleFilterChange}
              className="filter-select"
            >
              <option value="">All Types</option>
              {availableFilters.entityTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="user">User:</label>
            <select
              id="user"
              name="user"
              value={filters.user}
              onChange={handleFilterChange}
              className="filter-select"
            >
              <option value="">All Users</option>
              {availableFilters.users.map((user) => (
                <option key={user} value={user}>
                  {user}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="filter-row">
          <div className="filter-group">
            <label htmlFor="startDate">Start Date:</label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label htmlFor="endDate">End Date:</label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="filter-input"
            />
          </div>

          <button
            onClick={resetFilters}
            className="filter-reset-btn"
            disabled={!Object.values(filters).some((value) => value !== "")}
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Results summary */}
      <div className="results-summary">
        <p>
          {loading
            ? "Loading..."
            : `Showing ${filteredData.length} of ${auditData.length} records`}
        </p>
      </div>

      {/* Audit trail table */}
      <div className="audit-table-container">
        {loading ? (
          <div className="loading-indicator">Loading audit data...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : (
          <table className="audit-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Entity Type</th>
                <th>Entity ID</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length > 0 ? (
                filteredData.map((item) => (
                  <tr key={item.id}>
                    <td>{formatDateTime(item.timestamp)}</td>
                    <td>{item.user}</td>
                    <td>
                      <span className={`action-badge ${item.action}`}>
                        {item.action?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td>{item.entityType}</td>
                    <td>{item.entityId}</td>
                    <td>{item.details}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="no-records">
                    No records match the current filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AuditTrail;
