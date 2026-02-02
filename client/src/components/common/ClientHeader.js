// src/components/common/ClientHeader.js - Client header navigation matching admin design
import React, { useState, useEffect, useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FaChartLine,
  FaHistory,
  FaTruck,
  FaFileInvoiceDollar,
  FaUser,
  FaEye,
  FaMapPin,
  FaBell,
  FaSignOutAlt,
  FaChevronDown,
} from "react-icons/fa";
import { AuthContext } from "../../context/AuthContext";

const ClientHeader = () => {
  const location = useLocation();
  const { authUser, logout } = useContext(AuthContext) || {
    authUser: null,
    logout: () => {},
  };

  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  // Check if a menu item is active
  const isActive = (path) => {
    return location.pathname.startsWith(path);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".profile-dropdown-container")) {
        setShowProfileDropdown(false);
      }
      if (!e.target.closest(".notifications-container")) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const navLinkBase =
    "flex items-center gap-2 px-4 py-2 text-gray-300 text-sm font-medium rounded-lg transition-all duration-200 hover:bg-white/10 hover:text-white";
  const navLinkActive = "bg-white/20 text-white shadow-sm";

  return (
    <header className="fixed top-0 left-0 right-0 h-[70px] bg-gradient-to-r from-primary-900 via-primary-800 to-secondary-700 shadow-lg z-50">
      <div className="flex items-center justify-between h-full px-6 max-w-[1920px] mx-auto">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img
            src={process.env.PUBLIC_URL + "/images/logo.png.webp"}
            alt="Logo"
            className="h-10 w-auto object-contain"
          />
          <span className="text-white text-lg font-bold">Trucking MS</span>
          <span className="bg-secondary-500 text-white text-xs font-bold px-2 py-1 rounded-full ml-1">
            Client
          </span>
        </div>

        {/* Navigation Menu */}
        <nav className="flex items-center gap-1">
          <Link
            to="/client/profile"
            className={`${navLinkBase} ${isActive("/client/profile") && !location.search ? navLinkActive : ""}`}
          >
            <FaChartLine />
            <span>Overview</span>
          </Link>

          <Link
            to="/client/profile?tab=transactions"
            className={`${navLinkBase} ${location.search.includes("tab=transactions") ? navLinkActive : ""}`}
          >
            <FaHistory />
            <span>Bookings</span>
          </Link>

          <Link
            to="/client/profile?tab=trucks"
            className={`${navLinkBase} ${location.search.includes("tab=trucks") ? navLinkActive : ""}`}
          >
            <FaTruck />
            <span>My Trucks</span>
          </Link>

          <Link
            to="/client/profile?tab=billing"
            className={`${navLinkBase} ${location.search.includes("tab=billing") ? navLinkActive : ""}`}
          >
            <FaFileInvoiceDollar />
            <span>Billing</span>
          </Link>

          <Link
            to="/client/locations"
            className={`${navLinkBase} ${isActive("/client/locations") ? navLinkActive : ""}`}
          >
            <FaMapPin />
            <span>Locations</span>
          </Link>

          <Link
            to="/client/delivery-tracker"
            className={`${navLinkBase} ${isActive("/client/delivery-tracker") ? navLinkActive : ""}`}
          >
            <FaEye />
            <span>Track Orders</span>
          </Link>
        </nav>

        {/* Right Side Actions */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <div className="notifications-container relative">
            <button
              className="flex items-center justify-center w-10 h-10 text-gray-300 rounded-lg transition-all duration-200 hover:bg-white/10 hover:text-white relative"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <FaBell className="text-lg" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-danger-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                  {notificationCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-modal border border-gray-200 overflow-hidden z-50">
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                  <h4 className="text-gray-800 font-semibold m-0">
                    Notifications
                  </h4>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  <div className="p-4 text-center">
                    <p className="text-gray-500 text-sm">
                      No new notifications
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="profile-dropdown-container relative">
            <button
              className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 hover:bg-white/10"
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            >
              <div className="w-9 h-9 bg-gradient-to-br from-secondary-400 to-secondary-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {authUser?.username
                  ? authUser.username.charAt(0).toUpperCase()
                  : "C"}
              </div>
              <span className="text-white font-medium text-sm hidden md:block">
                {authUser?.username || "Client"}
              </span>
              <FaChevronDown
                className={`text-gray-300 text-xs transition-transform duration-200 ${showProfileDropdown ? "rotate-180" : ""}`}
              />
            </button>

            {showProfileDropdown && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-modal border border-gray-200 overflow-hidden z-50">
                <Link
                  to="/client/profile?tab=profile"
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  <FaUser className="text-gray-400" />
                  <span>My Profile</span>
                </Link>
                <div className="h-px bg-gray-200 mx-3" />
                <button
                  className="flex items-center gap-3 w-full px-4 py-3 text-danger-600 text-sm font-medium hover:bg-danger-50 transition-colors"
                  onClick={logout}
                >
                  <FaSignOutAlt />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default ClientHeader;
