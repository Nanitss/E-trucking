import React from 'react';
import { Link } from 'react-router-dom';
import AuditTrail from './common/AuditTrail';

const AuditPage = () => {
  return (
    <div className="admin-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Audit Trail</h1>
          <p>System activity logs and user actions</p>
        </div>
        <div className="header-actions">
          <Link to="/admin/dashboard" className="btn btn-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="btn-icon">
              <path d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z" />
            </svg>
            Dashboard
          </Link>
        </div>
      </div>
      
      <div className="page-content">
        <AuditTrail />
      </div>
    </div>
  );
};

export default AuditPage; 