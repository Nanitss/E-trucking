import React from 'react';
import { Link } from 'react-router-dom';
import { FaEdit, FaEye } from 'react-icons/fa';
import StatusBadge from '../common/StatusBadge';

const DeliveriesTable = ({ deliveries }) => {
  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Client</th>
            <th>Driver</th>
            <th>Truck</th>
            <th>Date</th>
            <th>Status</th>
            <th>Distance</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {deliveries.length > 0 ? (
            deliveries.map(delivery => (
              <tr key={delivery.DeliveryID}>
                <td>{delivery.DeliveryID}</td>
                <td>{delivery.ClientName}</td>
                <td>{delivery.DriverName}</td>
                <td>{delivery.TruckPlate}</td>
                <td>{new Date(delivery.DeliveryDate).toLocaleDateString()}</td>
                <td><StatusBadge status={delivery.DeliveryStatus} /></td>
                <td>{delivery.DeliveryDistance} km</td>
                <td>
                  <div className="table-actions">
                    <Link 
                      to={`/admin/deliveries/${delivery.DeliveryID}`} 
                      className="action-btn edit-btn"
                      title="Edit Delivery"
                    >
                      <FaEdit />
                    </Link>
                    <Link 
                      to={`/admin/deliveries/${delivery.DeliveryID}/view`} 
                      className="action-btn view-btn"
                      title="View Details"
                    >
                      <FaEye />
                    </Link>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="8" className="text-center">No deliveries found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DeliveriesTable;