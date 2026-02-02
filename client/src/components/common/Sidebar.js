// src/components/common/Sidebar.js
import React, { useState, useCallback, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";
import {
  TbDashboard,
  TbTruck,
  TbSteeringWheel,
  TbUsers,
  TbUser,
  TbBuildingSkyscraper,
  TbFileInvoice,
  TbLogout,
  TbPackage,
  TbSettings,
} from "react-icons/tb";

// Create a custom event for data changes
export const refreshSidebarEvent = () => {
  window.dispatchEvent(new Event("refreshSidebar"));
};

const Sidebar = () => {
  const location = useLocation();

  // Get current user from localStorage
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");

  // State for storing counts
  const [counts, setCounts] = useState({
    trucks: 0,
    drivers: 0,
    helpers: 0,
    staff: 0,
    clients: 0,
    deliveries: 0,
    pendingDeliveries: 0,
    unreadNotifications: 0,
    newAuditEntries: 0,
    settingsUpdates: 0,
  });

  // Create a function to fetch counts that can be called multiple times
  const fetchCounts = useCallback(async () => {
    try {
      // Get token for authenticated requests
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Create axios instance with auth headers
      const axiosWithAuth = axios.create({ headers });

      // Fetch counts for each category with error handling
      const requests = [
        axiosWithAuth.get("/api/trucks").catch((err) => ({ data: [] })),
        axiosWithAuth.get("/api/drivers").catch((err) => ({ data: [] })),
        axiosWithAuth.get("/api/helpers").catch((err) => ({ data: [] })),
        axiosWithAuth.get("/api/staffs").catch((err) => ({ data: [] })),
        axiosWithAuth.get("/api/clients").catch((err) => ({ data: [] })),
        axiosWithAuth.get("/api/deliveries").catch((err) => ({ data: [] })),
        axiosWithAuth
          .get("/api/deliveries/status/pending")
          .catch((err) => ({ data: [] })),
      ];

      const [
        trucksRes,
        driversRes,
        helpersRes,
        staffRes,
        clientsRes,
        deliveriesRes,
        pendingDeliveriesRes,
      ] = await Promise.all(requests);

      setCounts({
        trucks: trucksRes.data.length || 0,
        drivers:
          driversRes.data.filter(
            (d) => d.DriverStatus === "active" || d.driverStatus === "active",
          ).length || 0,
        helpers:
          helpersRes.data.filter(
            (h) => h.HelperStatus === "active" || h.helperStatus === "active",
          ).length || 0,
        staff:
          staffRes.data.filter(
            (s) => s.StaffStatus === "active" || s.staffStatus === "active",
          ).length || 0,
        clients:
          clientsRes.data.filter(
            (c) => c.ClientStatus === "active" || c.clientStatus === "active",
          ).length || 0,
        deliveries: deliveriesRes.data.length || 0,
        pendingDeliveries: pendingDeliveriesRes.data.length || 0,
        unreadNotifications: 3, // Demo value
      });
    } catch (error) {
      console.log("⚠️ Using cached counts due to fetch error");
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchCounts();

    // Set up a refresh interval (every 30 seconds)
    const intervalId = setInterval(() => {
      fetchCounts();
    }, 30000);

    // Set up event listener for manual refresh
    window.addEventListener("refreshSidebar", fetchCounts);

    // Clean up on unmount
    return () => {
      clearInterval(intervalId);
      window.removeEventListener("refreshSidebar", fetchCounts);
    };
  }, [fetchCounts]);

  // Add listener for route changes to refresh data when navigating
  useEffect(() => {
    fetchCounts();
  }, [location.pathname, fetchCounts]);

  // Check if a menu item is active
  const isActive = (path) => {
    return location.pathname.startsWith(path)
      ? "bg-sidebar-active text-sidebar-text-active border-r-4 border-primary-500"
      : "text-sidebar-text hover:bg-sidebar-hover hover:text-white";
  };

  const NavItem = ({
    to,
    icon: Icon,
    label,
    count,
    countColor = "bg-primary-500",
    hot = false,
    activeText = "",
  }) => (
    <Link
      to={to}
      className={`group flex items-center justify-between px-6 py-3.5 text-sm font-medium transition-all duration-200 ${isActive(to)}`}
    >
      <div className="flex items-center gap-3">
        <Icon
          size={20}
          className={
            location.pathname.startsWith(to)
              ? "text-primary-400"
              : "text-gray-400 group-hover:text-white"
          }
        />
        <span>{label}</span>
      </div>
      {count !== undefined && !activeText && (
        <span
          className={`px-2 py-0.5 text-xs font-semibold rounded-full ${hot ? "bg-danger-500 text-white animate-pulse" : "bg-sidebar-border text-gray-300"}`}
        >
          {hot && "Hot "}
          {count}
        </span>
      )}
      {activeText && (
        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-success-500/20 text-success-400 border border-success-500/30">
          {activeText}
        </span>
      )}
    </Link>
  );

  const GroupLabel = ({ label, count }) => (
    <div className="px-6 mt-8 mb-2 flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider">
      {label}
      {count !== undefined && <span className="text-gray-600">{count}</span>}
    </div>
  );

  return (
    <div className="flex flex-col h-screen w-72 bg-sidebar-bg border-r border-sidebar-border shadow-sidebar fixed left-0 top-0 z-50 transition-all duration-300">
      {/* Header / Logo */}
      <div className="flex items-center gap-3 px-6 h-20 border-b border-sidebar-border bg-sidebar-bg/50 backdrop-blur-sm">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20 text-white font-bold text-xl">
          T
        </div>
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">
            Trucking MS
          </h1>
          <p className="text-xs text-sidebar-text">Fleet Manager</p>
        </div>
      </div>

      {/* User Info */}
      <div className="px-6 py-4 border-b border-sidebar-border bg-sidebar-hover/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-sidebar-active flex items-center justify-center text-primary-400 font-bold border border-sidebar-border">
            {currentUser.username
              ? currentUser.username.charAt(0).toUpperCase()
              : "A"}
          </div>
          <div className="overflow-hidden">
            <h4 className="text-sm font-semibold text-white truncate">
              {currentUser.username || "Admin User"}
            </h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-success-500"></span>
              <p className="text-xs text-sidebar-text capitalize">
                {currentUser.role || "Administrator"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 hide-scrollbar">
        <NavItem to="/admin/dashboard" icon={TbDashboard} label="Dashboard" />

        <GroupLabel label="Fleet Management" count={counts.trucks} />

        <NavItem
          to="/admin/trucks/trucklist"
          icon={TbTruck}
          label="Trucks"
          count={counts.trucks}
        />

        <NavItem
          to="/admin/deliveries/deliverylist"
          icon={TbPackage}
          label="Deliveries"
          count={counts.pendingDeliveries}
          hot={counts.pendingDeliveries > 0}
        />

        <GroupLabel
          label="People"
          count={
            counts.drivers + counts.helpers + counts.staff + counts.clients
          }
        />

        <NavItem
          to="/admin/drivers/driverslist"
          icon={TbSteeringWheel}
          label="Drivers"
          activeText={`${counts.drivers} Active`}
        />

        <NavItem
          to="/admin/helpers/helperslist"
          icon={TbUsers}
          label="Helpers"
          count={counts.helpers}
        />

        <NavItem
          to="/admin/staffs/stafflist"
          icon={TbUser}
          label="Staff"
          count={counts.staff}
        />

        <NavItem
          to="/admin/clients/clientlist"
          icon={TbBuildingSkyscraper}
          label="Clients"
          count={counts.clients}
        />

        <GroupLabel label="Finance" />

        <NavItem
          to="/admin/payments"
          icon={TbFileInvoice}
          label="Payment Records"
        />
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border bg-sidebar-bg">
        <Link
          to="/logout"
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-sidebar-hover text-sidebar-text hover:bg-danger-500/10 hover:text-danger-500 hover:border-danger-500/20 border border-transparent transition-all duration-200 group"
        >
          <TbLogout
            size={20}
            className="group-hover:text-danger-500 transition-colors"
          />
          <span className="font-medium text-sm">Sign Out</span>
        </Link>
      </div>
    </div>
  );
};

export default Sidebar;
