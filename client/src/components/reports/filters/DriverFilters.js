import React from 'react';
import './FilterForm.css';

const DriverFilters = ({ filters, onChange }) => {
  const handleChange = (field, value) => {
    onChange({
      ...filters,
      [field]: value
    });
  };

  return (
    <div className="filter-form-grid">
      <div className="filter-group">
        <label>Driver Name</label>
        <input
          type="text"
          placeholder="Search by name"
          value={filters.name || ''}
          onChange={(e) => handleChange('name', e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Status</label>
        <select
          value={filters.status || ''}
          onChange={(e) => handleChange('status', e.target.value)}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="on-leave">On Leave</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Assignment Status</label>
        <select
          value={filters.assignmentStatus || ''}
          onChange={(e) => handleChange('assignmentStatus', e.target.value)}
        >
          <option value="">All</option>
          <option value="assigned">Assigned</option>
          <option value="unassigned">Unassigned</option>
        </select>
      </div>

      <div className="filter-group">
        <label>License Type</label>
        <select
          value={filters.licenseType || ''}
          onChange={(e) => handleChange('licenseType', e.target.value)}
        >
          <option value="">All Types</option>
          <option value="Professional">Professional</option>
          <option value="Non-Professional">Non-Professional</option>
          <option value="Restriction Code 1">Restriction Code 1</option>
          <option value="Restriction Code 2">Restriction Code 2</option>
        </select>
      </div>

      <div className="filter-group">
        <label>License Expiry From</label>
        <input
          type="date"
          value={filters.licenseExpiryFrom || ''}
          onChange={(e) => handleChange('licenseExpiryFrom', e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>License Expiry To</label>
        <input
          type="date"
          value={filters.licenseExpiryTo || ''}
          onChange={(e) => handleChange('licenseExpiryTo', e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Medical Certificate Status</label>
        <select
          value={filters.medicalStatus || ''}
          onChange={(e) => handleChange('medicalStatus', e.target.value)}
        >
          <option value="">All</option>
          <option value="valid">Valid</option>
          <option value="expiring-soon">Expiring Soon (30 days)</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Employment Date From</label>
        <input
          type="date"
          value={filters.employmentDateFrom || ''}
          onChange={(e) => handleChange('employmentDateFrom', e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Employment Date To</label>
        <input
          type="date"
          value={filters.employmentDateTo || ''}
          onChange={(e) => handleChange('employmentDateTo', e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Contact Number</label>
        <input
          type="text"
          placeholder="Search by contact"
          value={filters.contact || ''}
          onChange={(e) => handleChange('contact', e.target.value)}
        />
      </div>
    </div>
  );
};

export default DriverFilters;
