// src/components/common/AdminHeader.js - Reusable header navigation for all admin pages
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { 
  TbTruck,
  TbBell,
  TbSearch,
  TbChevronDown,
  TbCalendar,
  TbDownload,
  TbPlus
} from 'react-icons/tb';
import { useTimeframe } from '../../contexts/TimeframeContext';
import { useNotification } from '../../contexts/NotificationContext';
import ExportReportModal from '../reports/ExportReportModal';
import './AdminHeader.css';

const AdminHeader = ({ currentUser }) => {
  const location = useLocation();
  const { timeframe, timeframeOptions, updateTimeframe } = useTimeframe();
  const { showDownload, showError } = useNotification();
  
  // Sidebar counts state
  const [sidebarCounts, setSidebarCounts] = useState({
    trucks: 0,
    drivers: 0,
    helpers: 0,
    staff: 0,
    clients: 0,
    deliveries: 0,
    pendingDeliveries: 0,
    unreadNotifications: 0
  });
  
  const [showTimeframeDropdown, setShowTimeframeDropdown] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Get the appropriate add button text and link based on current page
  const getAddButtonInfo = () => {
    const path = location.pathname;
    
    if (path.includes('/trucks')) {
      return { text: 'Add Truck', link: '/admin/trucks/add' };
    } else if (path.includes('/drivers')) {
      return { text: 'Add Driver', link: '/admin/drivers/add' };
    } else if (path.includes('/helpers')) {
      return { text: 'Add Helper', link: '/admin/helpers/add' };
    } else if (path.includes('/staffs')) {
      return { text: 'Add Staff', link: '/admin/staffs/add' };
    } else if (path.includes('/clients')) {
      return { text: 'Add Client', link: '/admin/clients/add' };
    } else if (path.includes('/deliveries')) {
      return { text: 'Add Delivery', link: '/admin/deliveries/add' };
    } else if (path.includes('/operators')) {
      return { text: 'Add Operator', link: '/admin/operators/add' };
    } else {
      return { text: 'Add New', link: '/admin/dashboard' };
    }
  };

  const addButtonInfo = getAddButtonInfo();

  // Open Export Report Modal
  const handleExportReport = () => {
    setShowExportModal(true);
  };

  // Check if a menu item is active
  const isActive = (path) => {
    return location.pathname.startsWith(path) ? 'active' : '';
  };

  // Fetch sidebar counts
  const fetchSidebarCounts = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const axiosWithAuth = axios.create({ headers });
      
      const requests = [
        axiosWithAuth.get('/api/trucks').catch(err => ({ data: [] })),
        axiosWithAuth.get('/api/drivers').catch(err => ({ data: [] })),
        axiosWithAuth.get('/api/helpers').catch(err => ({ data: [] })),
        axiosWithAuth.get('/api/staffs').catch(err => ({ data: [] })),
        axiosWithAuth.get('/api/clients').catch(err => ({ data: [] })),
        axiosWithAuth.get('/api/deliveries').catch(err => ({ data: [] })),
        axiosWithAuth.get('/api/deliveries/status/pending').catch(err => ({ data: [] }))
      ];
      
      const [
        trucksRes,
        driversRes, 
        helpersRes,
        staffRes,
        clientsRes,
        deliveriesRes,
        pendingDeliveriesRes
      ] = await Promise.all(requests);

      setSidebarCounts({
        trucks: trucksRes.data.length || 0,
        drivers: driversRes.data.filter(d => d.DriverStatus === 'active' || d.driverStatus === 'active').length || 0,
        helpers: helpersRes.data.filter(h => h.HelperStatus === 'active' || h.helperStatus === 'active').length || 0,
        staff: staffRes.data.filter(s => s.StaffStatus === 'active' || s.staffStatus === 'active').length || 0,
        clients: clientsRes.data.filter(c => c.ClientStatus === 'active' || c.clientStatus === 'active').length || 0,
        deliveries: deliveriesRes.data.length || 0,
        pendingDeliveries: pendingDeliveriesRes.data.length || 0,
        unreadNotifications: 3
      });
    } catch (error) {
      console.error('Error fetching sidebar counts:', error);
    }
  }, []);

  // Load counts on mount
  useEffect(() => {
    fetchSidebarCounts();
  }, [fetchSidebarCounts]);

  return (
    <div className="admin-header">
      <div className="header-top">
        <div className="header-left">
          <div className="logo-section">
            <div className="logo-icon">
              <TbTruck size={24} />
            </div>
            <div className="logo-text">
              <h1>E-TRUCKING</h1>
              <span>MANAGEMENT SYSTEM</span>
            </div>
          </div>
        </div>
        <div className="header-right">
          <div className="header-actions">
            <div className="search-bar">
              <TbSearch size={20} />
              <input type="text" placeholder="Search..." />
            </div>
            <div className="notification-bell">
              <TbBell size={20} />
              <span className="notification-dot"></span>
            </div>
            <div className="user-profile" onClick={() => setShowUserDropdown(!showUserDropdown)}>
              <div className="user-avatar">
                {currentUser?.username?.charAt(0) || 'A'}
              </div>
              <div className="user-info">
                <span className="user-name">{currentUser?.username || 'Admin'}</span>
                <span className="user-role">Head Admin</span>
              </div>
              <TbChevronDown size={16} />
              {showUserDropdown && (
                <div className="user-dropdown-menu">
                  <Link to="/logout" className="user-dropdown-item">
                    Logout
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="header-bottom">
        <div className="nav-tabs">
          <Link to="/admin/dashboard" className={`nav-tab ${isActive('/admin/dashboard')}`}>
            Dashboard
          </Link>
          
          <div className="nav-dropdown">
            <button className="nav-dropdown-btn">
              Fleet Management <TbChevronDown size={14} />
            </button>
            <div className="nav-dropdown-content">
              <Link to="/admin/trucks/trucklist" className={`nav-dropdown-item ${isActive('/admin/trucks')}`}>
                Trucks ({sidebarCounts.trucks})
              </Link>
              <Link to="/admin/deliveries/deliverylist" className={`nav-dropdown-item ${isActive('/admin/deliveries')}`}>
                Deliveries {sidebarCounts.pendingDeliveries > 0 && <span className="hot-badge">Hot</span>}
              </Link>
            </div>
          </div>
          
          <div className="nav-dropdown">
            <button className="nav-dropdown-btn">
              People <TbChevronDown size={14} />
            </button>
            <div className="nav-dropdown-content">
              <Link to="/admin/drivers/driverslist" className={`nav-dropdown-item ${isActive('/admin/drivers')}`}>
                Drivers ({sidebarCounts.drivers} Active)
              </Link>
              <Link to="/admin/helpers/helperslist" className={`nav-dropdown-item ${isActive('/admin/helpers')}`}>
                Helpers ({sidebarCounts.helpers})
              </Link>
              <Link to="/admin/staffs/stafflist" className={`nav-dropdown-item ${isActive('/admin/staffs')}`}>
                Staff ({sidebarCounts.staff})
              </Link>
              <Link to="/admin/clients/clientlist" className={`nav-dropdown-item ${isActive('/admin/clients')}`}>
                Clients ({sidebarCounts.clients})
              </Link>
            </div>
          </div>
          
          <Link to="/admin/billings" className={`nav-tab ${isActive('/admin/billings')}`}>
            Billings
          </Link>
        </div>
        
        <div className="header-controls">
          <div className="timeframe-dropdown">
            <div 
              className="timeframe-selector"
              onClick={() => setShowTimeframeDropdown(!showTimeframeDropdown)}
            >
              <TbCalendar size={16} />
              <span>Timeframe {timeframe}</span>
              <TbChevronDown size={16} />
            </div>
            {showTimeframeDropdown && (
              <div className="timeframe-dropdown-content">
                {timeframeOptions.map((option) => (
                  <div
                    key={option.value}
                    className={`timeframe-option ${timeframe === option.value ? 'active' : ''}`}
                    onClick={() => {
                      updateTimeframe(option.value);
                      setShowTimeframeDropdown(false);
                    }}
                  >
                    {option.label}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button className="export-btn" onClick={handleExportReport}>
            <TbDownload size={16} />
            Export Report
          </button>
          <Link to={addButtonInfo.link} className="add-shipment-btn">
            <TbPlus size={16} />
            {addButtonInfo.text}
          </Link>
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
