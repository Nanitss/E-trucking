// src/components/common/ClientHeader.js - Client header navigation matching admin design
import React, { useState, useEffect, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  FaChevronDown
} from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';
import './ClientHeader.css';

const ClientHeader = () => {
  const location = useLocation();
  const { authUser, logout } = useContext(AuthContext) || { authUser: null, logout: () => {} };
  
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  // Check if a menu item is active
  const isActive = (path) => {
    return location.pathname.startsWith(path) ? 'active' : '';
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.profile-dropdown-container')) {
        setShowProfileDropdown(false);
      }
      if (!e.target.closest('.notifications-container')) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <header className="client-header">
      <div className="header-container">
        {/* Logo */}
        <div className="header-logo">
          <img src={process.env.PUBLIC_URL + '/images/logo.png.webp'} alt="Logo" />
          <span className="logo-text">Trucking MS</span>
          <span className="user-badge">Client</span>
        </div>

        {/* Navigation Menu */}
        <nav className="header-nav">
          <Link 
            to="/client/profile" 
            className={`nav-item ${isActive('/client/profile')}`}
          >
            <FaChartLine />
            <span>Overview</span>
          </Link>

          <Link 
            to="/client/profile?tab=transactions" 
            className={`nav-item ${location.search.includes('tab=transactions') ? 'active' : ''}`}
          >
            <FaHistory />
            <span>Bookings</span>
          </Link>

          <Link 
            to="/client/profile?tab=trucks" 
            className={`nav-item ${location.search.includes('tab=trucks') ? 'active' : ''}`}
          >
            <FaTruck />
            <span>My Trucks</span>
          </Link>

          <Link 
            to="/client/profile?tab=billing" 
            className={`nav-item ${location.search.includes('tab=billing') ? 'active' : ''}`}
          >
            <FaFileInvoiceDollar />
            <span>Billing</span>
          </Link>

          <Link 
            to="/client/locations" 
            className={`nav-item ${isActive('/client/locations')}`}
          >
            <FaMapPin />
            <span>Locations</span>
          </Link>

          <Link 
            to="/client/delivery-tracker" 
            className={`nav-item ${isActive('/client/delivery-tracker')}`}
          >
            <FaEye />
            <span>Track Orders</span>
          </Link>
        </nav>

        {/* Right Side Actions */}
        <div className="header-actions">
          {/* Notifications */}
          <div className="notifications-container">
            <button 
              className="notification-btn"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <FaBell />
              {notificationCount > 0 && (
                <span className="notification-badge">{notificationCount}</span>
              )}
            </button>

            {showNotifications && (
              <div className="notifications-dropdown">
                <div className="dropdown-header">
                  <h4>Notifications</h4>
                </div>
                <div className="notifications-list">
                  <div className="notification-item">
                    <p className="notification-text">No new notifications</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="profile-dropdown-container">
            <button 
              className="profile-btn"
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            >
              <div className="profile-avatar">
                {authUser?.username ? authUser.username.charAt(0).toUpperCase() : 'C'}
              </div>
              <span className="profile-name">{authUser?.username || 'Client'}</span>
              <FaChevronDown className="dropdown-icon" />
            </button>

            {showProfileDropdown && (
              <div className="profile-dropdown">
                <Link to="/client/profile?tab=profile" className="dropdown-item">
                  <FaUser />
                  <span>My Profile</span>
                </Link>
                <div className="dropdown-divider"></div>
                <button className="dropdown-item logout" onClick={logout}>
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
