import React from 'react';
import './FilterForm.css';

const TruckFilters = ({ filters, onChange }) => {
  const handleChange = (field, value) => {
    onChange({
      ...filters,
      [field]: value
    });
  };

  return (
    <div className="filter-form-grid">
      <div className="filter-group">
        <label>Brand/Manufacturer</label>
        <input
          type="text"
          placeholder="e.g., Isuzu, Hino, Fuso"
          value={filters.brand || ''}
          onChange={(e) => handleChange('brand', e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Truck Type</label>
        <select
          value={filters.truckType || ''}
          onChange={(e) => handleChange('truckType', e.target.value)}
        >
          <option value="">All Types</option>
          <option value="Dump Truck">Dump Truck</option>
          <option value="Flatbed">Flatbed</option>
          <option value="Cargo Truck">Cargo Truck</option>
          <option value="Refrigerated">Refrigerated</option>
          <option value="Tanker">Tanker</option>
          <option value="Box Truck">Box Truck</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Status</label>
        <select
          value={filters.status || ''}
          onChange={(e) => handleChange('status', e.target.value)}
        >
          <option value="">All Status</option>
          <option value="available">Available</option>
          <option value="in-use">In Use</option>
          <option value="maintenance">Maintenance</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Plate Number</label>
        <input
          type="text"
          placeholder="Search by plate number"
          value={filters.plateNumber || ''}
          onChange={(e) => handleChange('plateNumber', e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Manufacture Date From</label>
        <input
          type="date"
          value={filters.manufactureDateFrom || ''}
          onChange={(e) => handleChange('manufactureDateFrom', e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Manufacture Date To</label>
        <input
          type="date"
          value={filters.manufactureDateTo || ''}
          onChange={(e) => handleChange('manufactureDateTo', e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Min Capacity (tons)</label>
        <input
          type="number"
          placeholder="0"
          value={filters.minCapacity || ''}
          onChange={(e) => handleChange('minCapacity', e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Max Capacity (tons)</label>
        <input
          type="number"
          placeholder="100"
          value={filters.maxCapacity || ''}
          onChange={(e) => handleChange('maxCapacity', e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Min Kilometers</label>
        <input
          type="number"
          placeholder="0"
          value={filters.minKilometers || ''}
          onChange={(e) => handleChange('minKilometers', e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Max Kilometers</label>
        <input
          type="number"
          placeholder="1000000"
          value={filters.maxKilometers || ''}
          onChange={(e) => handleChange('maxKilometers', e.target.value)}
        />
      </div>
    </div>
  );
};

export default TruckFilters;
