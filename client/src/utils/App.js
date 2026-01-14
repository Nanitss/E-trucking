import React from 'react';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect
} from 'react-router-dom';

import ProtectedRoute from './components/ProtectedRoute';
import Login          from './pages/auth/Login';
import Logout         from './pages/auth/Logout';
import Home           from './pages/Home';
import NotFound       from './pages/shared/NotFound';

// Standalone Reports (no sidebar/navbar)
import Reports        from './pages/staff/Reports';

// Dashboards
import AdminDashboard    from './pages/admin/Dashboard';
import StaffDashboard    from './pages/staff/Dashboard';
import ClientDashboard   from './pages/client/Dashboard';
import DriverDashboard   from './pages/driver/Dashboard';
import HelperDashboard   from './pages/helper/Dashboard';
import OperatorDashboard from './pages/operator/Dashboard';

// Client pages
import DeliveryTracker   from './pages/client/DeliveryTracker';

// Admin pages
import TrucksList        from './pages/admin/trucks/TrucksList';
import DriversList       from './pages/admin/drivers/DriversList';
import DeliveriesList    from './pages/admin/deliveries/DeliveriesList';
import ClientsList       from './pages/admin/clients/ClientsList';
import StaffsList        from './pages/admin/staffs/StaffsList';
import HelpersList       from './pages/admin/helpers/HelpersList';
import OperatorsList     from './pages/admin/operators/OperatorsList';
import ReportsPage       from './pages/admin/Reports';
import Settings          from './pages/admin/Settings';

function App() {
  return (
    <Router>
      <Switch>

        {/* Public */}
        <Route path="/login"  component={Login} />
        <Route path="/logout" component={Logout} />
        <Route path="/home" component={Home} />
        <Route exact path="/" render={() => <Redirect to="/home" />} />

        {/* Reports page STANDALONE */}
        <Route exact path="/staff/reports" component={Reports} />

        {/* Admin routes with sidebar */}
        <ProtectedRoute 
          path="/admin/dashboard" 
          component={AdminDashboard} 
          showSidebar={true} 
        />
        <ProtectedRoute 
          path="/admin/trucks" 
          component={TrucksList} 
          showSidebar={true} 
        />
        <ProtectedRoute 
          path="/admin/drivers" 
          component={DriversList} 
          showSidebar={true} 
        />
        <ProtectedRoute 
          path="/admin/deliveries" 
          component={DeliveriesList} 
          showSidebar={true} 
        />
        <ProtectedRoute 
          path="/admin/clients" 
          component={ClientsList} 
          showSidebar={true} 
        />
        <ProtectedRoute 
          path="/admin/staffs" 
          component={StaffsList} 
          showSidebar={true} 
        />
        <ProtectedRoute 
          path="/admin/helpers" 
          component={HelpersList} 
          showSidebar={true} 
        />
        <ProtectedRoute 
          path="/admin/operators" 
          component={OperatorsList} 
          showSidebar={true} 
        />
        <ProtectedRoute 
          path="/admin/reports" 
          component={ReportsPage} 
          showSidebar={true} 
        />
        <ProtectedRoute 
          path="/admin/settings" 
          component={Settings} 
          showSidebar={true} 
        />

        {/* ALL OTHER pages without sidebar */}
        <ProtectedRoute path="/client/dashboard" component={ClientDashboard} />
        <ProtectedRoute path="/client/delivery-tracker" component={DeliveryTracker} />
        <ProtectedRoute path="/staff/dashboard" component={StaffDashboard} />
        <ProtectedRoute path="/driver/dashboard" component={DriverDashboard} />
        <ProtectedRoute path="/helper/dashboard" component={HelperDashboard} />
        <ProtectedRoute path="/operator/dashboard" component={OperatorDashboard} />

        {/* Fallback */}
        <Route path="/not-found" component={NotFound} />
        <Route component={NotFound} />

      </Switch>
    </Router>
  );
}

export default App;