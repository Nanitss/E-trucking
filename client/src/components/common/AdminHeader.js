// src/components/common/AdminHeader.js - Reusable header navigation for all admin pages
import React, { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";
import {
  TbTruck,
  TbBell,
  TbSearch,
  TbChevronDown,
  TbCalendar,
  TbDownload,
  TbPlus,
  TbMenu2,
} from "react-icons/tb";
import { useTimeframe } from "../../contexts/TimeframeContext";
import { useNotification } from "../../contexts/NotificationContext";
import ExportReportModal from "../reports/ExportReportModal";

const AdminHeader = ({ currentUser }) => {
  const location = useLocation();
  const { timeframe, timeframeOptions, updateTimeframe } = useTimeframe();

  // Sidebar counts state
  const [sidebarCounts, setSidebarCounts] = useState({
    trucks: 0,
    drivers: 0,
    helpers: 0,
    staff: 0,
    clients: 0,
    deliveries: 0,
    pendingDeliveries: 0,
    unreadNotifications: 0,
  });

  const [showTimeframeDropdown, setShowTimeframeDropdown] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Get the appropriate add button text and link based on current page
  const getAddButtonInfo = () => {
    const path = location.pathname;

    if (path.includes("/trucks")) {
      return { text: "Add Truck", link: "/admin/trucks/add" };
    } else if (path.includes("/drivers")) {
      return { text: "Add Driver", link: "/admin/drivers/add" };
    } else if (path.includes("/helpers")) {
      return { text: "Add Helper", link: "/admin/helpers/add" };
    } else if (path.includes("/staffs")) {
      return { text: "Add Staff", link: "/admin/staffs/add" };
    } else if (path.includes("/clients")) {
      return { text: "Add Client", link: "/admin/clients/add" };
    } else if (path.includes("/deliveries")) {
      return { text: "Add Delivery", link: "/admin/deliveries/add" };
    } else if (path.includes("/operators")) {
      return { text: "Add Operator", link: "/admin/operators/add" };
    } else {
      return { text: "Add New", link: "/admin/dashboard", isDefault: true };
    }
  };

  const addButtonInfo = getAddButtonInfo();

  // Open Export Report Modal
  const handleExportReport = () => {
    setShowExportModal(true);
  };

  // Check if a menu item is active
  const isActive = (path) => {
    return location.pathname.startsWith(path)
      ? "text-primary-600 border-b-2 border-primary-600 font-semibold"
      : "text-gray-500 hover:text-gray-800";
  };

  // Fetch sidebar counts
  const fetchSidebarCounts = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const axiosWithAuth = axios.create({ headers });

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

      setSidebarCounts({
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
        unreadNotifications: 3,
      });
    } catch (error) {
      console.error("Error fetching sidebar counts:", error);
    }
  }, []);

  // Load counts on mount
  useEffect(() => {
    fetchSidebarCounts();
  }, [fetchSidebarCounts]);

  return (
    <div className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-gray-200 mb-8 transition-all duration-200">
      <div className="px-8 py-4 flex items-center justify-between gap-6">
        {/* Left: Breadcrumbs or Page Title could go here, for now just a search bar */}
        <div className="flex-1 max-w-xl">
          <div className="relative group">
            <TbSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors"
              size={20}
            />
            <input
              type="text"
              placeholder="Search trucks, drivers, deliveries..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:bg-white transition-all text-gray-700 placeholder-gray-400"
            />
          </div>
        </div>

        {/* Right: Actions & Profile */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <button className="relative w-10 h-10 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors">
            <TbBell size={22} />
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-danger-500 rounded-full border-2 border-white"></span>
          </button>

          <div className="h-8 w-px bg-gray-200 mx-1"></div>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              className="flex items-center gap-3 p-1.5 pr-3 rounded-full hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
              onClick={() => setShowUserDropdown(!showUserDropdown)}
            >
              <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
                {currentUser?.username?.charAt(0) || "A"}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-semibold text-gray-700 leading-none">
                  {currentUser?.username || "Admin"}
                </p>
                <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mt-1">
                  {currentUser?.role || "Head Admin"}
                </p>
              </div>
              <TbChevronDown
                size={16}
                className={`text-gray-400 transition-transform ${showUserDropdown ? "rotate-180" : ""}`}
              />
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 overflow-hidden animate-slide-up origin-top-right">
                <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                  <p className="text-xs text-gray-500">Signed in as</p>
                  <p className="text-sm font-bold text-gray-800 truncate">
                    {currentUser?.username}
                  </p>
                </div>
                <Link
                  to="/profile"
                  className="block px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-primary-600"
                >
                  My Profile
                </Link>
                <Link
                  to="/settings"
                  className="block px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-primary-600"
                >
                  Settings
                </Link>
                <div className="my-1 border-t border-gray-100"></div>
                <Link
                  to="/logout"
                  className="block px-4 py-2.5 text-sm text-danger-600 hover:bg-danger-50 font-medium"
                >
                  Sign Out
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom: Secondary Navigation & Page Actions */}
      <div className="px-8 flex items-center justify-between gap-4 overflow-x-auto hide-scrollbar">
        <div className="flex items-center gap-6">
          <Link
            to="/admin/dashboard"
            className={`py-3 text-sm font-medium border-b-2 border-transparent transition-all ${isActive("/admin/dashboard")}`}
          >
            Overview
          </Link>
          <Link
            to="/admin/trucks/trucklist"
            className={`py-3 text-sm font-medium border-b-2 border-transparent transition-all ${isActive("/admin/trucks")}`}
          >
            Trucks
          </Link>
          <Link
            to="/admin/deliveries/deliverylist"
            className={`py-3 text-sm font-medium border-b-2 border-transparent transition-all ${isActive("/admin/deliveries")}`}
          >
            Deliveries
          </Link>
          <Link
            to="/admin/drivers/driverslist"
            className={`py-3 text-sm font-medium border-b-2 border-transparent transition-all ${
              location.pathname.includes("/drivers") ||
              location.pathname.includes("/staffs") ||
              location.pathname.includes("/clients")
                ? "text-primary-600 border-b-2 border-primary-600 font-semibold"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Personnel
          </Link>
          <Link
            to="/admin/billings"
            className={`py-3 text-sm font-medium border-b-2 border-transparent transition-all ${isActive("/admin/billings")}`}
          >
            Financials
          </Link>
        </div>

        <div className="flex items-center gap-3 pb-2">
          {/* Timeframe Selector */}
          <div className="relative">
            <button
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100/50 hover:bg-white border border-transparent hover:border-gray-200 rounded-lg transition-all"
              onClick={() => setShowTimeframeDropdown(!showTimeframeDropdown)}
            >
              <TbCalendar size={14} className="text-gray-400" />
              <span>{timeframe}</span>
              <TbChevronDown size={12} className="text-gray-400" />
            </button>

            {showTimeframeDropdown && (
              <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50 animate-slide-up">
                {timeframeOptions.map((option) => (
                  <button
                    key={option.value}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${timeframe === option.value ? "text-primary-600 font-medium bg-primary-50/50" : "text-gray-600"}`}
                    onClick={() => {
                      updateTimeframe(option.value);
                      setShowTimeframeDropdown(false);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleExportReport}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:border-primary-500 hover:text-primary-600 transition-all shadow-sm"
          >
            <TbDownload size={14} />
            Export
          </button>

          {!addButtonInfo.isDefault && (
            <Link
              to={addButtonInfo.link}
              className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-white bg-success-500 rounded-lg hover:bg-success-600 transition-all shadow-sm hover:shadow-success-500/30 active:scale-95"
            >
              <TbPlus size={14} />
              {addButtonInfo.text}
            </Link>
          )}
        </div>
      </div>

      {/* Export Report Modal */}
      <ExportReportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />
    </div>
  );
};

export default AdminHeader;
