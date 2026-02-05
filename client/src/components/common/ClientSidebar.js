import React, { useState, useEffect, useContext } from 'react';
import { Link, useLocation, useHistory } from 'react-router-dom';
import {
  FaChartLine,
  FaHistory,
  FaTruck,
  FaFileInvoiceDollar,
  FaUser,
  FaEye,
  FaSignOutAlt,
  FaPlus,
  FaMapPin
} from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';
import './ClientSidebar.css';

const ClientSidebar = () => {
  const location = useLocation();
  const history = useHistory();
  const { authUser, logout } = useContext(AuthContext) || { authUser: null, logout: () => { } };

  // State for storing client counts
  const [counts, setCounts] = useState({
    allocatedTrucks: 0,
    activeDeliveries: 0,
    completedDeliveries: 0,
    totalSpent: 0
  });

  // Check if a menu item is active
  const isActive = (path) => {
    return location.pathname.startsWith(path) ? 'active' : '';
  };

  // Handle logout with navigation
  const handleLogout = () => {
    logout();
    history.push('/login');
  };

  return (
    <div className="client-sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <img src={process.env.PUBLIC_URL + '/images/logo.webp'} alt="Trucking Logo" />
          <span>Trucking MS</span>
        </div>
      </div>

      <div className="user-info">
        <div className="avatar">
          {authUser?.username ? authUser.username.charAt(0).toUpperCase() : 'C'}
        </div>
        <div className="user-details">
          <h4>{authUser?.username || 'Client'}</h4>
          <p>Client Account</p>
        </div>
      </div>

      <div className="sidebar-menu">
        {/* Main sections */}
        <Link to="/client/profile" className={`menu-item ${isActive('/client/profile')}`}>
          <span className="menu-icon">
            <FaChartLine />
          </span>
          <span className="menu-label">Overview</span>
        </Link>

        <Link to="/client/profile?tab=transactions" className={`menu-item ${location.search.includes('tab=transactions') ? 'active' : ''}`}>
          <span className="menu-icon">
            <FaHistory />
          </span>
          <span className="menu-label">Transaction History</span>
        </Link>

        <Link to="/client/profile?tab=trucks" className={`menu-item ${location.search.includes('tab=trucks') ? 'active' : ''}`}>
          <span className="menu-icon">
            <FaTruck />
          </span>
          <span className="menu-label">My Trucks</span>
        </Link>

        <Link to="/client/profile?tab=billing" className={`menu-item ${location.search.includes('tab=billing') ? 'active' : ''}`}>
          <span className="menu-icon">
            <FaFileInvoiceDollar />
          </span>
          <span className="menu-label">Billing</span>
        </Link>

        <Link to="/client/profile?tab=profile" className={`menu-item ${location.search.includes('tab=profile') ? 'active' : ''}`}>
          <span className="menu-icon">
            <FaUser />
          </span>
          <span className="menu-label">Profile Info</span>
        </Link>

        <Link to="/client/locations" className={`menu-item ${isActive('/client/locations')}`}>
          <span className="menu-icon">
            <FaMapPin />
          </span>
          <span className="menu-label">Saved Locations</span>
        </Link>

        <div className="menu-divider"></div>

        {/* Quick Actions */}
        <div className="menu-group-label">Quick Actions</div>

        <Link to="/client/delivery-tracker" className={`menu-item ${isActive('/client/delivery-tracker')}`}>
          <span className="menu-icon">
            <FaEye />
          </span>
          <span className="menu-label">Track Orders</span>
        </Link>

        <Link to="/client/book-truck" className={`menu-item book-truck-btn ${isActive('/client/book-truck')}`}>
          <span className="menu-icon">
            <FaPlus />
          </span>
          <span className="menu-label">Book Truck</span>
        </Link>
      </div>

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={handleLogout}>
          <span className="menu-icon">
            <FaSignOutAlt />
          </span>
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default ClientSidebar; 