// src/components/pages/Admin.js (or your main admin component)
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from '../common/Sidebar';
import Dashboard from './admin/Dashboard';

// Import user management pages
import DriversList from './admin/drivers/DriversList';
import DriverForm from './admin/drivers/DriverForm';
import OperatorsList from './admin/operators/OperatorsList';
import OperatorForm from './admin/operators/OperatorForm';
import HelpersList from './admin/helpers/HelpersList';
import HelperForm from './admin/helpers/HelperForm';
import StaffList from './admin/staff/StaffList';
import StaffForm from './admin/staff/StaffForm';

// Import other pages as needed
// import TrucksList from './admin/trucks/TrucksList';
// import ClientsList from './admin/clients/ClientsList';
// import DeliveriesList from './admin/deliveries/DeliveriesList';
// import ReportsList from './admin/reports/ReportsList';
// import Settings from './admin/settings/Settings';

import './Admin.css';

const Admin = () => {
  return (
    <div className="admin-layout">
      <Sidebar />
      <div className="admin-content">
        <Routes>
          {/* Dashboard route */}
          <Route path="/dashboard" element={<Dashboard />} />
          
          {/* Redirect from /admin to /admin/dashboard */}
          <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
          
          {/* Drivers routes */}
          <Route path="/drivers" element={<DriversList />} />
          <Route path="/drivers/add" element={<DriverForm />} />
          <Route path="/drivers/edit/:id" element={<DriverForm />} />
          
          {/* Operators routes */}
          <Route path="/operators" element={<OperatorsList />} />
          <Route path="/operators/add" element={<OperatorForm />} />
          <Route path="/operators/edit/:id" element={<OperatorForm />} />
          
          {/* Helpers routes */}
          <Route path="/helpers" element={<HelpersList />} />
          <Route path="/helpers/add" element={<HelperForm />} />
          <Route path="/helpers/edit/:id" element={<HelperForm />} />
          
          {/* Staff routes */}
          <Route path="/staff" element={<StaffList />} />
          <Route path="/staff/add" element={<StaffForm />} />
          <Route path="/staff/edit/:id" element={<StaffForm />} />
          
          {/* Other routes - uncomment and implement as needed */}
          {/* <Route path="/trucks" element={<TrucksList />} /> */}
          {/* <Route path="/clients" element={<ClientsList />} /> */}
          {/* <Route path="/deliveries" element={<DeliveriesList />} /> */}
          {/* <Route path="/reports" element={<ReportsList />} /> */}
          {/* <Route path="/settings" element={<Settings />} /> */}
          
          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default Admin;