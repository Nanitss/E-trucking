import React from 'react';
import './FilterForm.css';

const DeliveryFilters = ({ filters, onChange }) => {
  const handleChange = (field, value) => {
    onChange({
      ...filters,
      [field]: value
    });
  };

  return (
    <div className="filter-form-grid">
      <div className="filter-group">
        <label>Delivery Status</label>
        <select
          value={filters.status || ''}
          onChange={(e) => handleChange('status', e.target.value)}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Client Name</label>
        <input
          type="text"
          placeholder="Search by client"
          value={filters.clientName || ''}
          onChange={(e) => handleChange('clientName', e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Truck Plate Number</label>
        <input
          type="text"
          placeholder="Search by truck"
          value={filters.truckPlate || ''}
          onChange={(e) => handleChange('truckPlate', e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Driver Name</label>
        <input
          type="text"
          placeholder="Search by driver"
          value={filters.driverName || ''}
          onChange={(e) => handleChange('driverName', e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Delivery Date From</label>
        <input
          type="date"
          value={filters.deliveryDateFrom || ''}
          onChange={(e) => handleChange('deliveryDateFrom', e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Delivery Date To</label>
        <input
          type="date"
          value={filters.deliveryDateTo || ''}
          onChange={(e) => handleChange('deliveryDateTo', e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Min Amount (₱)</label>
        <input
          type="number"
          placeholder="0"
          value={filters.minAmount || ''}
          onChange={(e) => handleChange('minAmount', e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Max Amount (₱)</label>
        <input
          type="number"
          placeholder="100000"
          value={filters.maxAmount || ''}
          onChange={(e) => handleChange('maxAmount', e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Min Distance (km)</label>
        <input
          type="number"
          placeholder="0"
          value={filters.minDistance || ''}
          onChange={(e) => handleChange('minDistance', e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Max Distance (km)</label>
        <input
          type="number"
          placeholder="1000"
          value={filters.maxDistance || ''}
          onChange={(e) => handleChange('maxDistance', e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Pickup Location</label>
        <input
          type="text"
          placeholder="Search by pickup location"
          value={filters.pickupLocation || ''}
          onChange={(e) => handleChange('pickupLocation', e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Delivery Address</label>
        <input
          type="text"
          placeholder="Search by delivery address"
          value={filters.deliveryAddress || ''}
          onChange={(e) => handleChange('deliveryAddress', e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Payment Status</label>
        <select
          value={filters.paymentStatus || ''}
          onChange={(e) => handleChange('paymentStatus', e.target.value)}
        >
          <option value="">All</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="partial">Partial</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Cargo Weight (tons)</label>
        <div className="range-inputs">
          <input
            type="number"
            placeholder="Min"
            value={filters.minWeight || ''}
            onChange={(e) => handleChange('minWeight', e.target.value)}
            style={{ width: '48%' }}
          />
          <input
            type="number"
            placeholder="Max"
            value={filters.maxWeight || ''}
            onChange={(e) => handleChange('maxWeight', e.target.value)}
            style={{ width: '48%' }}
          />
        </div>
      </div>
    </div>
  );
};

export default DeliveryFilters;
