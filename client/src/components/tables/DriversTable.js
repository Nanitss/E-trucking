import React from 'react';
import { Link } from 'react-router-dom';
import { FaEdit, FaTrash, FaFileAlt } from 'react-icons/fa';
import StatusBadge from '../common/StatusBadge';

const DriversTable = ({ drivers, onDelete }) => {
  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Contact</th>
            <th>Employment Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {drivers.length > 0 ? (
            drivers.map(driver => (
              <tr key={driver.DriverID}>
                <td>{driver.DriverID}</td>
                <td>{driver.DriverName}</td>
                <td>{driver.DriverNumber}</td>
                <td>{new Date(driver.DriverEmploymentDate).toLocaleDateString()}</td>
                <td><StatusBadge status={driver.DriverStatus} /></td>
                <td>
                  <div className="table-actions">
                    <Link 
                      to={`/admin/drivers/${driver.DriverID}`} 
                      className="action-btn edit-btn"
                      title="Edit Driver"
                    >
                      <FaEdit />
                    </Link>
                    <button 
                      className="action-btn delete-btn" 
                      onClick={() => onDelete(driver.DriverID)}
                      title="Delete Driver"
                    >
                      <FaTrash />
                    </button>
                    {driver.DriverDocuments && (
                      <a 
                        href={`/uploads/${driver.DriverDocuments}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="action-btn view-btn"
                        title="View Documents"
                      >
                        <FaFileAlt />
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" className="text-center">No drivers found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DriversTable;