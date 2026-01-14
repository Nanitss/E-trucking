import React from 'react';
import './FilterForm.css';

const StaffFilters = ({ filters, onChange }) => {
  const handleChange = (field, value) => {
    onChange({
      ...filters,
      [field]: value
    });
  };

  return (
    <div className="filter-form-grid">
      <div className="filter-group">
        <label>Staff Name</label>
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
        <label>Role/Position</label>
        <select
          value={filters.role || ''}
          onChange={(e) => handleChange('role', e.target.value)}
        >
          <option value="">All Roles</option>
          <option value="Admin">Admin</option>
          <option value="Operator">Operator</option>
          <option value="Dispatcher">Dispatcher</option>
          <option value="Accountant">Accountant</option>
          <option value="HR">HR</option>
          <option value="Maintenance">Maintenance</option>
          <option value="Manager">Manager</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Department</label>
        <select
          value={filters.department || ''}
          onChange={(e) => handleChange('department', e.target.value)}
        >
          <option value="">All Departments</option>
          <option value="Operations">Operations</option>
          <option value="Finance">Finance</option>
          <option value="HR">Human Resources</option>
          <option value="Logistics">Logistics</option>
          <option value="Maintenance">Maintenance</option>
          <option value="IT">IT</option>
          <option value="Administration">Administration</option>
        </select>
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
        <label>Employment Type</label>
        <select
          value={filters.employmentType || ''}
          onChange={(e) => handleChange('employmentType', e.target.value)}
        >
          <option value="">All Types</option>
          <option value="Full-time">Full-time</option>
          <option value="Part-time">Part-time</option>
          <option value="Contract">Contract</option>
          <option value="Probationary">Probationary</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Email</label>
        <input
          type="text"
          placeholder="Search by email"
          value={filters.email || ''}
          onChange={(e) => handleChange('email', e.target.value)}
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
        <label>Salary Range (₱)</label>
        <div className="range-inputs">
          <input
            type="number"
            placeholder="Min"
            value={filters.minSalary || ''}
            onChange={(e) => handleChange('minSalary', e.target.value)}
            style={{ width: '48%' }}
          />
          <input
            type="number"
            placeholder="Max"
            value={filters.maxSalary || ''}
            onChange={(e) => handleChange('maxSalary', e.target.value)}
            style={{ width: '48%' }}
          />
        </div>
      </div>
    </div>
  );
};

export default StaffFilters;
