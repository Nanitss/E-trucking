import React from 'react';
import { Link } from 'react-router-dom';
import { FaEdit, FaTrash, FaEye, FaTruck } from 'react-icons/fa';
import ModernTable, { ModernStatusBadge } from '../common/ModernTable';

/**
 * Modern Trucks Table - Using Standardized Design System
 * Preserves your exact navy blue and yellow color scheme
 */
const ModernTrucksTable = ({ 
  trucks = [], 
  onDelete, 
  onEdit,
  onView,
  onAdd,
  loading = false 
}) => {
  const columns = [
    {
      key: 'TruckID',
      header: 'ID',
      width: '80px',
      render: (value) => (
        <span className="font-semibold text-primary">#{value}</span>
      )
    },
    {
      key: 'TruckPlate',
      header: 'Plate Number',
      width: '140px',
      render: (value) => (
        <div className="d-flex align-items-center">
          <FaTruck className="me-2 text-primary" />
          <span className="font-bold text-gray-800">{value}</span>
        </div>
      )
    },
    {
      key: 'TruckType',
      header: 'Type',
      width: '120px',
      render: (value) => (
        <span className="text-capitalize font-medium">{value}</span>
      )
    },
    {
      key: 'TruckCapacity',
      header: 'Capacity',
      width: '100px',
      render: (value) => (
        <span className="font-semibold">{value} tons</span>
      )
    },
    {
      key: 'TruckBrand',
      header: 'Brand',
      width: '120px',
      render: (value) => (
        <span className="font-medium">{value}</span>
      )
    },
    {
      key: 'ModelYear',
      header: 'Year',
      width: '80px',
      render: (value) => (
        <span className="text-center">{value}</span>
      )
    },
    {
      key: 'TruckStatus',
      header: 'Status',
      width: '140px',
      render: (value) => <ModernStatusBadge status={value} />
    }
  ];

  const handleEdit = (truck) => {
    if (onEdit) {
      onEdit(truck);
    }
  };

  const handleDelete = (truck) => {
    if (onDelete && window.confirm(`Are you sure you want to delete truck ${truck.TruckPlate}?`)) {
      onDelete(truck.TruckID);
    }
  };

  const handleView = (truck) => {
    if (onView) {
      onView(truck);
    }
  };

  const handleAdd = () => {
    if (onAdd) {
      onAdd();
    }
  };

  return (
    <ModernTable
      data={trucks}
      columns={columns}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onView={handleView}
      onAdd={handleAdd}
      title="Truck Fleet"
      subtitle={`${trucks.length} trucks in your fleet`}
      emptyMessage="No trucks found. Add your first truck to get started."
      loading={loading}
    />
  );
};

/**
 * Modern Trucks Card View - Alternative to Table
 */
const ModernTrucksCard = ({ 
  trucks = [], 
  onDelete, 
  onEdit,
  onView,
  onAdd,
  loading = false 
}) => {
  const renderTruckCard = (truck) => (
    <div className="card truck-card">
      <div className="card-header">
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <FaTruck className="me-2 text-primary" />
            <h5 className="card-title mb-0">{truck.TruckPlate}</h5>
          </div>
          <ModernStatusBadge status={truck.TruckStatus} />
        </div>
      </div>
      
      <div className="card-body">
        <div className="row g-2">
          <div className="col-6">
            <small className="text-muted">Type</small>
            <div className="font-medium text-capitalize">{truck.TruckType}</div>
          </div>
          <div className="col-6">
            <small className="text-muted">Capacity</small>
            <div className="font-semibold">{truck.TruckCapacity} tons</div>
          </div>
          <div className="col-6">
            <small className="text-muted">Brand</small>
            <div className="font-medium">{truck.TruckBrand}</div>
          </div>
          <div className="col-6">
            <small className="text-muted">Year</small>
            <div className="font-medium">{truck.ModelYear}</div>
          </div>
        </div>
      </div>
      
      <div className="card-footer">
        <div className="d-flex gap-2">
          {onView && (
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => onView(truck)}
              title="View Details"
            >
              <FaEye />
            </button>
          )}
          {onEdit && (
            <button
              className="btn btn-sm btn-primary"
              onClick={() => onEdit(truck)}
              title="Edit Truck"
            >
              <FaEdit />
            </button>
          )}
          {onDelete && (
            <button
              className="btn btn-sm btn-danger"
              onClick={() => handleDelete(truck)}
              title="Delete Truck"
            >
              <FaTrash />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const handleDelete = (truck) => {
    if (onDelete && window.confirm(`Are you sure you want to delete truck ${truck.TruckPlate}?`)) {
      onDelete(truck.TruckID);
    }
  };

  return (
    <ModernDataCard
      data={trucks}
      renderCard={renderTruckCard}
      title="Truck Fleet"
      subtitle={`${trucks.length} trucks in your fleet`}
      onAdd={onAdd}
      emptyMessage="No trucks found. Add your first truck to get started."
      loading={loading}
    />
  );
};

export { ModernTrucksTable, ModernTrucksCard };
export default ModernTrucksTable;
