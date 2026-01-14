// src/components/pages/admin/routes.js
import React from 'react';
import { Route, Routes } from 'react-router-dom';

// Import dashboard
import Dashboard from './Dashboard';

// Import drivers pages
import DriversList from './drivers/DriversList';
import DriverForm from './drivers/DriverForm';

// Import operators pages
import OperatorsList from './operators/OperatorsList';
import OperatorForm from './operators/OperatorForm';

// Import helpers pages
import HelpersList from './helpers/HelpersList';
import HelperForm from './helpers/HelperForm';

// Import staff pages
import StaffList from './staffs/StaffList';
import StaffForm from './staffs/StaffForm';

// Import client pages
import ClientList from './clients/ClientList';
import ClientForm from './clients/ClientForm';
import ClientTruckAllocation from './clients/ClientTruckAllocation';

// Import truck pages
import TruckList from './trucks/TruckList';
import TruckForm from './trucks/TruckForm';

// Import delivery pages
import DeliveryList from './deliveries/DeliveryList';
import DeliveryForm from './deliveries/DeliveryForm';

// Import payment pages
import PaymentRecords from './payments/PaymentRecords';

// Import audit page
import AuditPage from './AuditPage';

// Import protected route component
import ProtectedRoute from '../../common/ProtectedRoute';

const AdminRoutes = () => {
  return (
    <Routes>
      {/* Dashboard */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Audit Trail */}
      <Route 
        path="/audit" 
        element={
          <ProtectedRoute>
            <AuditPage />
          </ProtectedRoute>
        }
      />

      {/* Drivers Routes */}
      <Route 
        path="/drivers" 
        element={
          <ProtectedRoute>
            <DriversList />
          </ProtectedRoute>
        }
      />
      <Route 
        path="/drivers/add" 
        element={
          <ProtectedRoute>
            <DriverForm />
          </ProtectedRoute>
        }
      />
      <Route 
        path="/drivers/edit/:id" 
        element={
          <ProtectedRoute>
            <DriverForm />
          </ProtectedRoute>
        }
      />

      {/* Operators Routes */}
      <Route 
        path="/operators" 
        element={
          <ProtectedRoute>
            <OperatorsList />
          </ProtectedRoute>
        }
      />
      <Route 
        path="/operators/add" 
        element={
          <ProtectedRoute>
            <OperatorForm />
          </ProtectedRoute>
        }
      />
      <Route 
        path="/operators/edit/:id" 
        element={
          <ProtectedRoute>
            <OperatorForm />
          </ProtectedRoute>
        }
      />

      {/* Helpers Routes */}
      <Route 
        path="/helpers" 
        element={
          <ProtectedRoute>
            <HelpersList />
          </ProtectedRoute>
        }
      />
      <Route 
        path="/helpers/add" 
        element={
          <ProtectedRoute>
            <HelperForm />
          </ProtectedRoute>
        }
      />
      <Route 
        path="/helpers/edit/:id" 
        element={
          <ProtectedRoute>
            <HelperForm />
          </ProtectedRoute>
        }
      />

      {/* Staff Routes */}
      <Route 
        path="/staffs" 
        element={
          <ProtectedRoute>
            <StaffList />
          </ProtectedRoute>
        }
      />
      <Route 
        path="/staffs/add" 
        element={
          <ProtectedRoute>
            <StaffForm />
          </ProtectedRoute>
        }
      />
      <Route 
        path="/staffs/edit/:id" 
        element={
          <ProtectedRoute>
            <StaffForm />
          </ProtectedRoute>
        }
      />

      {/* Client Routes */}
      <Route 
        path="/clients" 
        element={
          <ProtectedRoute>
            <ClientList />
          </ProtectedRoute>
        }
      />
      <Route 
        path="/clients/add" 
        element={
          <ProtectedRoute>
            <ClientForm />
          </ProtectedRoute>
        }
      />
      <Route 
        path="/clients/edit/:id" 
        element={
          <ProtectedRoute>
            <ClientForm />
          </ProtectedRoute>
        }
      />
      <Route 
        path="/clients/:id/trucks" 
        element={
          <ProtectedRoute>
            <ClientTruckAllocation />
          </ProtectedRoute>
        }
      />

      {/* Truck Routes */}
      <Route 
        path="/trucks" 
        element={
          <ProtectedRoute>
            <TruckList />
          </ProtectedRoute>
        }
      />
      <Route 
        path="/trucks/add" 
        element={
          <ProtectedRoute>
            <TruckForm />
          </ProtectedRoute>
        }
      />
      <Route 
        path="/trucks/edit/:id" 
        element={
          <ProtectedRoute>
            <TruckForm />
          </ProtectedRoute>
        }
      />

      {/* Delivery Routes */}
      <Route 
        path="/deliveries" 
        element={
          <ProtectedRoute>
            <DeliveryList />
          </ProtectedRoute>
        }
      />
      <Route 
        path="/deliveries/add" 
        element={
          <ProtectedRoute>
            <DeliveryForm />
          </ProtectedRoute>
        }
      />
      <Route 
        path="/deliveries/edit/:id" 
        element={
          <ProtectedRoute>
            <DeliveryForm />
          </ProtectedRoute>
        }
      />

      {/* Payment Routes */}
      <Route 
        path="/payments" 
        element={
          <ProtectedRoute>
            <PaymentRecords />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default AdminRoutes;