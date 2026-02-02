import React from "react";

const ClientFilters = ({ filters, onChange }) => {
  const handleChange = (field, value) => {
    onChange({
      ...filters,
      [field]: value,
    });
  };

  return (
    <div className="filter-form-grid">
      <div className="filter-group">
        <label>Client Name</label>
        <input
          type="text"
          placeholder="Search by name"
          value={filters.name || ""}
          onChange={(e) => handleChange("name", e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Status</label>
        <select
          value={filters.status || ""}
          onChange={(e) => handleChange("status", e.target.value)}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Business Type</label>
        <select
          value={filters.businessType || ""}
          onChange={(e) => handleChange("businessType", e.target.value)}
        >
          <option value="">All Types</option>
          <option value="Construction">Construction</option>
          <option value="Manufacturing">Manufacturing</option>
          <option value="Agriculture">Agriculture</option>
          <option value="Retail">Retail</option>
          <option value="Wholesale">Wholesale</option>
          <option value="Logistics">Logistics</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Company Name</label>
        <input
          type="text"
          placeholder="Search by company"
          value={filters.companyName || ""}
          onChange={(e) => handleChange("companyName", e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Registration Date From</label>
        <input
          type="date"
          value={filters.registrationDateFrom || ""}
          onChange={(e) => handleChange("registrationDateFrom", e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Registration Date To</label>
        <input
          type="date"
          value={filters.registrationDateTo || ""}
          onChange={(e) => handleChange("registrationDateTo", e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Min Total Deliveries</label>
        <input
          type="number"
          placeholder="0"
          value={filters.minDeliveries || ""}
          onChange={(e) => handleChange("minDeliveries", e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Max Total Deliveries</label>
        <input
          type="number"
          placeholder="1000"
          value={filters.maxDeliveries || ""}
          onChange={(e) => handleChange("maxDeliveries", e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Email</label>
        <input
          type="text"
          placeholder="Search by email"
          value={filters.email || ""}
          onChange={(e) => handleChange("email", e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Contact Number</label>
        <input
          type="text"
          placeholder="Search by contact"
          value={filters.contact || ""}
          onChange={(e) => handleChange("contact", e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>City/Municipality</label>
        <input
          type="text"
          placeholder="Search by location"
          value={filters.city || ""}
          onChange={(e) => handleChange("city", e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Credit Status</label>
        <select
          value={filters.creditStatus || ""}
          onChange={(e) => handleChange("creditStatus", e.target.value)}
        >
          <option value="">All</option>
          <option value="good">Good Standing</option>
          <option value="warning">Warning</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>
    </div>
  );
};

export default ClientFilters;
