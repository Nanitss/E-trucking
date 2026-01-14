import React from 'react';
import { Link } from 'react-router-dom';
import { FaEdit, FaTrash } from 'react-icons/fa';
import StatusBadge from '../common/StatusBadge';

const TrucksTable = ({ trucks, onDelete }) => {
  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Plate Number</th>
            <th>Type</th>
            <th>Capacity</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {trucks.length > 0 ? (
            trucks.map(truck => (
              <tr key={truck.TruckID}>
                <td>{truck.TruckID}</td>
                <td>{truck.TruckPlate}</td>
                <td>{truck.TruckType}</td>
                <td>{truck.TruckCapacity} tons</td>
                <td><StatusBadge status={truck.TruckStatus} /></td>
                <td>
                  <div className="table-actions">
                    <Link 
                      to={`/admin/trucks/${truck.TruckID}`} 
                      className="action-btn edit-btn"
                      title="Edit Truck"
                    >
                      <FaEdit />
                    </Link>
                    <button 
                      className="action-btn delete-btn" 
                      onClick={() => onDelete(truck.TruckID)}
                      title="Delete Truck"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" className="text-center">No trucks found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TrucksTable;