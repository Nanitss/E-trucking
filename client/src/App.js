import React from "react";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect,
} from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import AlertComponent from "./components/common/AlertComponent";
import { NotificationProvider } from "./context/NotificationContext";
import { ModernToastProvider } from "./context/ModernToastContext";
import { TimeframeProvider } from "./contexts/TimeframeContext";
import { NotificationProvider as GlobalNotificationProvider } from "./contexts/NotificationContext";
import { ExportDataProvider } from "./contexts/ExportDataContext";
import ClientLayout from "./components/layouts/ClientLayout";
import Login from "./pages/auth/Login";
import Logout from "./pages/auth/Logout";
import Home from "./pages/Home";
import NotFound from "./pages/shared/NotFound";
import SimpleFileUpload from "./components/SimpleFileUpload";
import FileUploadTest from "./pages/FileUploadTest";

// Standalone Reports (no sidebar/navbar)
import Reports from "./pages/staff/Reports";
import VehicleRateManagement from "./pages/staff/VehicleRateManagement";

// Dashboards
import AdminDashboard from "./pages/admin/Dashboard";
import StaffDashboard from "./pages/staff/Dashboard";
import ClientDashboard from "./pages/client/Dashboard";
// ClientLanding removed - redirects directly to profile
import ClientProfile from "./pages/client/ClientProfile";
import DriverDashboard from "./pages/driver/Dashboard";
import HelperDashboard from "./pages/helper/Dashboard";
import OperatorDashboard from "./pages/operator/Dashboard";

// Client pages
import DeliveryTracker from "./pages/client/DeliveryTracker";
import DeliveryDetails from "./pages/client/DeliveryDetails";
import DeliveriesList from "./pages/client/DeliveriesList";
import PaymentManagement from "./pages/client/PaymentManagement";
import PinnedLocations from "./pages/client/PinnedLocations";
import BookTruck from "./pages/client/BookTruck";

// Admin pages with explicit paths matching sidebar
import TruckList from "./pages/admin/trucks/TruckList";
import TruckForm from "./pages/admin/trucks/TruckForm";
import DriversList from "./pages/admin/drivers/DriversList";
import DriverForm from "./pages/admin/drivers/DriverForm";
import DeliveryList from "./pages/admin/deliveries/DeliveryList";
import DeliveryForm from "./pages/admin/deliveries/DeliveryForm";
import DeliveryView from "./pages/admin/deliveries/DeliveryView";
import ClientList from "./pages/admin/clients/ClientList";
import ClientForm from "./pages/admin/clients/ClientForm";
import ClientTruckAllocation from "./pages/admin/clients/ClientTruckAllocation";
import StaffList from "./pages/admin/staffs/StaffList";
import StaffForm from "./pages/admin/staffs/StaffForm";
import HelpersList from "./pages/admin/helpers/HelpersList";
import HelperForm from "./pages/admin/helpers/HelperForm";
import OperatorList from "./pages/admin/operators/OperatorList";
import OperatorForm from "./pages/admin/operators/OperatorForm";
import AuditTest from "./pages/admin/common/AuditTest";
import PaymentsDashboard from "./pages/admin/payments/PaymentsDashboard";
import PaymentRecords from "./pages/admin/payments/PaymentRecords";
import AdminBillings from "./pages/admin/billings/AdminBillings";

function App() {
  return (
    <NotificationProvider>
      <ModernToastProvider>
        <TimeframeProvider>
          <GlobalNotificationProvider>
            <ExportDataProvider>
              <Router>
                <AlertComponent />
                <Switch>
                  {/* Public */}
                  <Route path="/login" component={Login} />
                  <Route path="/logout" component={Logout} />
                  <Route path="/home" component={Home} />
                  <Route
                    exact
                    path="/"
                    render={() => <Redirect to="/home" />}
                  />

                  {/* Reports page STANDALONE */}
                  <Route exact path="/staff/reports" component={Reports} />

                  {/* Staff Vehicle Rate Management */}
                  <ProtectedRoute
                    path="/staff/vehicle-rates"
                    component={VehicleRateManagement}
                    showSidebar={false}
                  />

                  {/* Admin routes with header navigation - exact path matching */}
                  <ProtectedRoute
                    path="/admin/dashboard"
                    component={AdminDashboard}
                    showSidebar={false}
                  />

                  {/* Truck Routes */}
                  <ProtectedRoute
                    path="/admin/trucks/trucklist"
                    component={TruckList}
                    showSidebar={false}
                  />
                  <ProtectedRoute
                    path="/admin/trucks"
                    exact
                    component={TruckList}
                    showSidebar={false}
                  />
                  <ProtectedRoute
                    path="/admin/trucks/add"
                    component={TruckForm}
                    showSidebar={false}
                  />
                  <ProtectedRoute
                    path="/admin/trucks/edit/:id"
                    component={TruckForm}
                    showSidebar={false}
                  />

                  {/* Driver Routes */}
                  <ProtectedRoute
                    path="/admin/drivers/driverslist"
                    component={DriversList}
                    showSidebar={false}
                  />
                  <ProtectedRoute
                    path="/admin/drivers"
                    exact
                    component={DriversList}
                    showSidebar={false}
                  />
                  <ProtectedRoute
                    path="/admin/drivers/add"
                    component={DriverForm}
                    showSidebar={false}
                  />
                  <ProtectedRoute
                    path="/admin/drivers/edit/:id"
                    component={DriverForm}
                    showSidebar={false}
                  />

                  {/* Delivery Routes */}
                  <ProtectedRoute
                    path="/admin/deliveries/deliverylist"
                    component={DeliveryList}
                    showSidebar={false}
                  />
                  <ProtectedRoute
                    path="/admin/deliveries"
                    exact
                    component={DeliveryList}
                    showSidebar={false}
                  />
                  <ProtectedRoute
                    path="/admin/deliveries/add"
                    component={DeliveryForm}
                    showSidebar={false}
                  />
                  <ProtectedRoute
                    path="/admin/deliveries/:id/view"
                    component={DeliveryView}
                    showSidebar={false}
                  />
                  <ProtectedRoute
                    path="/admin/deliveries/edit/:id"
                    component={DeliveryForm}
                    showSidebar={false}
                  />

                  {/* Client Routes */}
                  <ProtectedRoute
                    path="/admin/clients/clientlist"
                    component={ClientList}
                    showSidebar={false}
                  />
                  <ProtectedRoute
                    path="/admin/clients"
                    exact
                    component={ClientList}
                    showSidebar={false}
                  />
                  <ProtectedRoute
                    path="/admin/clients/add"
                    component={ClientForm}
                    showSidebar={false}
                  />
                  <ProtectedRoute
                    path="/admin/clients/edit/:id"
                    component={ClientForm}
                    showSidebar={false}
                  />
                  <ProtectedRoute
                    path="/admin/clients/:id/trucks"
                    component={ClientTruckAllocation}
                    showSidebar={false}
                  />

                  {/* Staff Routes */}
                  <ProtectedRoute
                    path="/admin/staffs/stafflist"
                    component={StaffList}
                    showSidebar={false}
                  />
                  <ProtectedRoute
                    path="/admin/staffs"
                    exact
                    component={StaffList}
                    showSidebar={false}
                  />
                  <ProtectedRoute
                    path="/admin/staffs/add"
                    component={StaffForm}
                    showSidebar={false}
                  />
                  <ProtectedRoute
                    path="/admin/staffs/edit/:id"
                    component={StaffForm}
                    showSidebar={false}
                  />

                  {/* Helper Routes */}
                  <ProtectedRoute
                    path="/admin/helpers/helperslist"
                    component={HelpersList}
                    showSidebar={false}
                  />
                  <ProtectedRoute
                    path="/admin/helpers"
                    exact
                    component={HelpersList}
                    showSidebar={false}
                  />
                  <ProtectedRoute
                    path="/admin/helpers/add"
                    component={HelperForm}
                    showSidebar={false}
                  />
                  <ProtectedRoute
                    path="/admin/helpers/edit/:id"
                    component={HelperForm}
                    showSidebar={false}
                  />

                  {/* Operator Routes */}
                  <ProtectedRoute
                    path="/admin/operators/operatorlist"
                    component={OperatorList}
                    showSidebar={false}
                  />
                  <ProtectedRoute
                    path="/admin/operators"
                    exact
                    component={OperatorList}
                    showSidebar={false}
                  />
                  <ProtectedRoute
                    path="/admin/operators/add"
                    component={OperatorForm}
                    showSidebar={false}
                  />
                  <ProtectedRoute
                    path="/admin/operators/edit/:id"
                    component={OperatorForm}
                    showSidebar={false}
                  />

                  {/* Audit Test Route */}
                  <ProtectedRoute
                    path="/admin/audit-test"
                    component={AuditTest}
                    showSidebar={false}
                  />

                  {/* Payment Routes */}
                  <ProtectedRoute
                    path="/admin/payments"
                    exact
                    component={PaymentRecords}
                    showSidebar={false}
                  />

                  {/* Admin Billings Route */}
                  <ProtectedRoute
                    path="/admin/billings"
                    exact
                    component={AdminBillings}
                    showSidebar={false}
                  />

                  {/* Client Routes with Sidebar Layout */}
                  <ProtectedRoute path="/client/profile">
                    <ClientLayout>
                      <ClientProfile />
                    </ClientLayout>
                  </ProtectedRoute>

                  <ProtectedRoute path="/client/delivery-tracker">
                    <ClientLayout>
                      <DeliveryTracker />
                    </ClientLayout>
                  </ProtectedRoute>

                  <ProtectedRoute path="/client/deliveries/:id">
                    <ClientLayout>
                      <DeliveryDetails />
                    </ClientLayout>
                  </ProtectedRoute>

                  <ProtectedRoute path="/client/deliveries" exact>
                    <ClientLayout>
                      <DeliveriesList />
                    </ClientLayout>
                  </ProtectedRoute>

                  <ProtectedRoute path="/client/locations">
                    <ClientLayout>
                      <PinnedLocations />
                    </ClientLayout>
                  </ProtectedRoute>

                  <ProtectedRoute path="/client/book-truck">
                    <ClientLayout>
                      <BookTruck />
                    </ClientLayout>
                  </ProtectedRoute>

                  {/* Client Landing redirects directly to profile */}
                  <ProtectedRoute path="/client/landing">
                    <Redirect to="/client/profile" />
                  </ProtectedRoute>
                  <ProtectedRoute path="/client/dashboard" exact>
                    <Redirect to="/client/profile" />
                  </ProtectedRoute>

                  {/* Other role dashboards without sidebar */}
                  <ProtectedRoute
                    path="/staff/dashboard"
                    component={StaffDashboard}
                  />
                  <ProtectedRoute
                    path="/driver/dashboard"
                    component={DriverDashboard}
                  />
                  <ProtectedRoute
                    path="/helper/dashboard"
                    component={HelperDashboard}
                  />
                  <ProtectedRoute
                    path="/operator/dashboard"
                    component={OperatorDashboard}
                  />

                  {/* Payment Management Routes */}
                  <ProtectedRoute path="/client/payment-management">
                    <ClientLayout>
                      <PaymentManagement />
                    </ClientLayout>
                  </ProtectedRoute>

                  {/* Payment Dashboard Route */}
                  <ProtectedRoute
                    path="/admin/payments/payments-dashboard"
                    component={PaymentsDashboard}
                  />

                  {/* File Upload Test */}
                  <Route path="/upload-test" component={SimpleFileUpload} />
                  <Route
                    path="/enhanced-upload-test"
                    component={FileUploadTest}
                  />

                  {/* Fallback */}
                  <Route component={NotFound} />
                </Switch>
              </Router>
            </ExportDataProvider>
          </GlobalNotificationProvider>
        </TimeframeProvider>
      </ModernToastProvider>
    </NotificationProvider>
  );
}

export default App;
