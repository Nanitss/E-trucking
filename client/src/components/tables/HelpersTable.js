import React from 'react';
import { Link } from 'react-router-dom';
import { FaEdit, FaTrash, FaFileAlt } from 'react-icons/fa';
import StatusBadge from '../common/StatusBadge';

const HelpersTable = ({ helpers, onDelete }) => {
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
          {helpers.length > 0 ? (
            helpers.map(helper => (
              <tr key={helper.HelperID}>
                <td>{helper.HelperID}</td>
                <td>{helper.HelperName}</td>
                <td>{helper.HelperNumber}</td>
                <td>{new Date(helper.HelperEmploymentDate).toLocaleDateString()}</td>
                <td><StatusBadge status={helper.HelperStatus} /></td>
                <td>
                  <div className="table-actions">
                    <Link 
                      to={`/admin/helpers/${helper.HelperID}`} 
                      className="action-btn edit-btn"
                      title="Edit Helper"
                    >
                      <FaEdit />
                    </Link>
                    <button 
                      className="action-btn delete-btn" 
                      onClick={() => onDelete(helper.HelperID)}
                      title="Delete Helper"
                    >
                      <FaTrash />
                    </button>
                    {helper.HelperDocuments && (
                      <a 
                        href={`/uploads/${helper.HelperDocuments}`} 
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
              <td colSpan="6" className="text-center">No helpers found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default HelpersTable;