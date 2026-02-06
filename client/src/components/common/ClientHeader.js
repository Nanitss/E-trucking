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
  FaCheckCircle,
  FaTimesCircle,
  FaMoneyBillWave,
  FaInfoCircle,
} from "react-icons/fa";
import { AuthContext } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";

const ClientHeader = () => {
  const location = useLocation();
  const { authUser, logout } = useContext(AuthContext) || {
    authUser: null,
    logout: () => { },
  };

  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Use the notification context for real notifications from the API
  const {
    notifications = [],
    unreadCount = 0,
    loading: notificationsLoading,
    markAsRead,
    markAllAsRead,
    fetchNotifications,
  } = useNotifications() || {};

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
            src={process.env.PUBLIC_URL + "/images/logo.webp"}
            alt="Logo"
            className="h-14 w-auto object-contain"
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
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications && fetchNotifications) {
                  fetchNotifications();
                }
              }}
            >
              <FaBell className="text-lg" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-danger-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-modal border border-gray-200 overflow-hidden z-50">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <h4 className="text-gray-800 font-semibold m-0">
                    Notifications
                  </h4>
                  {unreadCount > 0 && markAllAsRead && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAllAsRead();
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notificationsLoading ? (
                    <div className="p-6 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-gray-500 text-sm">Loading...</p>
                    </div>
                  ) : notifications && notifications.length > 0 ? (
                    notifications.slice(0, 20).map((notification) => {
                      const isPaymentApproved =
                        notification.type === "payment" &&
                        (notification.title?.includes("Approved") ||
                          notification.title?.includes("approved"));
                      const isPaymentRejected =
                        notification.type === "payment" &&
                        (notification.title?.includes("Rejected") ||
                          notification.title?.includes("rejected"));

                      return (
                        <div
                          key={notification.id}
                          className={`px-4 py-3 border-b border-gray-50 cursor-pointer transition-colors ${
                            notification.read
                              ? "bg-white hover:bg-gray-50"
                              : "bg-blue-50/50 hover:bg-blue-50"
                          }`}
                          onClick={() => {
                            if (!notification.read && markAsRead) {
                              markAsRead(notification.id);
                            }
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                isPaymentApproved
                                  ? "bg-green-100 text-green-600"
                                  : isPaymentRejected
                                    ? "bg-red-100 text-red-600"
                                    : notification.type === "payment"
                                      ? "bg-blue-100 text-blue-600"
                                      : notification.type === "delivery"
                                        ? "bg-indigo-100 text-indigo-600"
                                        : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {isPaymentApproved ? (
                                <FaCheckCircle size={14} />
                              ) : isPaymentRejected ? (
                                <FaTimesCircle size={14} />
                              ) : notification.type === "payment" ? (
                                <FaMoneyBillWave size={14} />
                              ) : (
                                <FaInfoCircle size={14} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p
                                  className={`text-sm truncate ${
                                    notification.read
                                      ? "text-gray-700 font-medium"
                                      : "text-gray-900 font-semibold"
                                  }`}
                                >
                                  {notification.title}
                                </p>
                                {!notification.read && (
                                  <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full"></span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {formatNotificationTime(
                                  notification.created_at || notification.time,
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-6 text-center">
                      <FaBell className="text-gray-300 text-2xl mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">
                        No notifications yet
                      </p>
                    </div>
                  )}
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

// Helper to format notification timestamps
const formatNotificationTime = (timestamp) => {
  if (!timestamp) return "Just now";

  let date;
  if (timestamp instanceof Date) {
    date = timestamp;
  } else if (timestamp?.toDate) {
    date = timestamp.toDate();
  } else if (timestamp?._seconds) {
    // Firestore Timestamp serialized from API as { _seconds, _nanoseconds }
    date = new Date(timestamp._seconds * 1000);
  } else if (timestamp?.seconds) {
    // Firestore Timestamp serialized as { seconds, nanoseconds }
    date = new Date(timestamp.seconds * 1000);
  } else {
    date = new Date(timestamp);
  }

  if (isNaN(date.getTime())) return "Recently";

  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

export default ClientHeader;
