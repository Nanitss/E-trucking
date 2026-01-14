import React from 'react';
import './FilterForm.css';

const HelperFilters = ({ filters, onChange }) => {
  const handleChange = (field, value) => {
    onChange({
      ...filters,
      [field]: value
    });
  };

  return (
    <div className="filter-form-grid">
      <div className="filter-group">
        <label>Helper Name</label>
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
        <label>ID Type</label>
        <select
          value={filters.idType || ''}
          onChange={(e) => handleChange('idType', e.target.value)}
        >
          <option value="">All Types</option>
          <option value="National ID">National ID</option>
          <option value="Voter's ID">Voter's ID</option>
          <option value="Passport">Passport</option>
          <option value="Driver's License">Driver's License</option>
        </select>
      </div>

      <div className="filter-group">
        <label>ID Expiry From</label>
        <input
          type="date"
          value={filters.idExpiryFrom || ''}
          onChange={(e) => handleChange('idExpiryFrom', e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>ID Expiry To</label>
        <input
          type="date"
          value={filters.idExpiryTo || ''}
          onChange={(e) => handleChange('idExpiryTo', e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Join Date From</label>
        <input
          type="date"
          value={filters.joinDateFrom || ''}
          onChange={(e) => handleChange('joinDateFrom', e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Join Date To</label>
        <input
          type="date"
          value={filters.joinDateTo || ''}
          onChange={(e) => handleChange('joinDateTo', e.target.value)}
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

      <div className="filter-group">
        <label>Age Range</label>
        <div className="age-range">
          <input
            type="number"
            placeholder="Min"
            value={filters.minAge || ''}
            onChange={(e) => handleChange('minAge', e.target.value)}
            style={{ width: '48%' }}
          />
          <input
            type="number"
            placeholder="Max"
            value={filters.maxAge || ''}
            onChange={(e) => handleChange('maxAge', e.target.value)}
            style={{ width: '48%' }}
          />
        </div>
      </div>
    </div>
  );
};

export default HelperFilters;
