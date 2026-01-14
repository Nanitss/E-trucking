import React from 'react';
import { Link } from 'react-router-dom';
import { FaEdit, FaTrash, FaFileAlt } from 'react-icons/fa';
import StatusBadge from '../common/StatusBadge';

const StaffsTable = ({ staffs, onDelete }) => {
  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Department</th>
            <th>Contact</th>
            <th>Employment Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {staffs.length > 0 ? (
            staffs.map(staff => (
              <tr key={staff.StaffID}>
                <td>{staff.StaffID}</td>
                <td>{staff.StaffName}</td>
                <td>{staff.StaffDepartment}</td>
                <td>{staff.StaffNumber}</td>
                <td>{new Date(staff.StaffEmploymentDate).toLocaleDateString()}</td>
                <td><StatusBadge status={staff.StaffStatus} /></td>
                <td>
                  <div className="table-actions">
                    <Link 
                      to={`/admin/staffs/${staff.StaffID}`} 
                      className="action-btn edit-btn"
                      title="Edit Staff"
                    >
                      <FaEdit />
                    </Link>
                    <button 
                      className="action-btn delete-btn" 
                      onClick={() => onDelete(staff.StaffID)}
                      title="Delete Staff"
                    >
                      <FaTrash />
                    </button>
                    {staff.StaffDocuments && (
                      <a 
                        href={`/uploads/${staff.StaffDocuments}`} 
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
              <td colSpan="7" className="text-center">No staff found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default StaffsTable;