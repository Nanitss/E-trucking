import React from "react";

const BillingFilters = ({ filters, onChange }) => {
  const handleChange = (field, value) => {
    onChange({
      ...filters,
      [field]: value,
    });
  };

  return (
    <div className="filter-form-grid">
      <div className="filter-group">
        <label>Payment Status</label>
        <select
          value={filters.status || ""}
          onChange={(e) => handleChange("status", e.target.value)}
        >
          <option value="">All Status</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Client Name</label>
        <input
          type="text"
          placeholder="Search by client name"
          value={filters.name || ""}
          onChange={(e) => handleChange("name", e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Delivery Date From</label>
        <input
          type="date"
          value={filters.dateFrom || ""}
          onChange={(e) => handleChange("dateFrom", e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Delivery Date To</label>
        <input
          type="date"
          value={filters.dateTo || ""}
          onChange={(e) => handleChange("dateTo", e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Min Amount (₱)</label>
        <input
          type="number"
          placeholder="0"
          value={filters.minAmount || ""}
          onChange={(e) => handleChange("minAmount", e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Max Amount (₱)</label>
        <input
          type="number"
          placeholder="100000"
          value={filters.maxAmount || ""}
          onChange={(e) => handleChange("maxAmount", e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Due Date From</label>
        <input
          type="date"
          value={filters.dueDateFrom || ""}
          onChange={(e) => handleChange("dueDateFrom", e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Due Date To</label>
        <input
          type="date"
          value={filters.dueDateTo || ""}
          onChange={(e) => handleChange("dueDateTo", e.target.value)}
        />
      </div>
    </div>
  );
};

export default BillingFilters;
