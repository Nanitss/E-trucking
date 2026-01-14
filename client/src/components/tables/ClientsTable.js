import React from 'react';
import { Link } from 'react-router-dom';
import { FaEdit, FaTrash, FaTruck } from 'react-icons/fa';
import StatusBadge from '../common/StatusBadge';

const ClientsTable = ({ clients, onDelete }) => {
  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Contact</th>
            <th>Email</th>
            <th>Creation Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {clients.length > 0 ? (
            clients.map(client => (
              <tr key={client.ClientID}>
                <td>{client.ClientID}</td>
                <td>{client.ClientName}</td>
                <td>{client.ClientNumber}</td>
                <td>{client.ClientEmail}</td>
                <td>{new Date(client.ClientCreationDate).toLocaleDateString()}</td>
                <td><StatusBadge status={client.ClientStatus} /></td>
                <td>
                  <div className="table-actions">
                    <Link 
                      to={`/admin/clients/${client.ClientID}`} 
                      className="action-btn edit-btn"
                      title="Edit Client"
                    >
                      <FaEdit />
                    </Link>
                    <button 
                      className="action-btn delete-btn" 
                      onClick={() => onDelete(client.ClientID)}
                      title="Delete Client"
                    >
                      <FaTrash />
                    </button>
                    <Link 
                      to={`/admin/clients/${client.ClientID}/truck-allocation`} 
                      className="action-btn view-btn"
                      title="Truck Allocation"
                    >
                      <FaTruck />
                    </Link>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7" className="text-center">No clients found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ClientsTable;