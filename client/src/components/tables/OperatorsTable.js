import React from 'react';
import { Link } from 'react-router-dom';
import { FaEdit, FaTrash, FaFileAlt } from 'react-icons/fa';
import StatusBadge from '../common/StatusBadge';

const OperatorsTable = ({ operators, onDelete }) => {
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
          {operators.length > 0 ? (
            operators.map(operator => (
              <tr key={operator.OperatorID}>
                <td>{operator.OperatorID}</td>
                <td>{operator.OperatorName}</td>
                <td>{operator.OperatorNumber}</td>
                <td>{new Date(operator.OperatorEmploymentDate).toLocaleDateString()}</td>
                <td><StatusBadge status={operator.OperatorStatus} /></td>
                <td>
                  <div className="table-actions">
                    <Link 
                      to={`/admin/operators/${operator.OperatorID}`} 
                      className="action-btn edit-btn"
                      title="Edit Operator"
                    >
                      <FaEdit />
                    </Link>
                    <button 
                      className="action-btn delete-btn" 
                      onClick={() => onDelete(operator.OperatorID)}
                      title="Delete Operator"
                    >
                      <FaTrash />
                    </button>
                    {operator.OperatorDocuments && (
                      <a 
                        href={`/uploads/${operator.OperatorDocuments}`} 
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
              <td colSpan="6" className="text-center">No operators found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default OperatorsTable;