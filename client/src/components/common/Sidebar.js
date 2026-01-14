// src/components/common/Sidebar.js
import React, { useState, useCallback, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import './Sidebar.css';
import './SidebarOverride.css'; // Add override CSS to ensure our styles take precedence

// Create a custom event for data changes
export const refreshSidebarEvent = () => {
  window.dispatchEvent(new Event('refreshSidebar'));
};

const Sidebar = () => {
  const location = useLocation();
  
  // Get current user from localStorage
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  
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
    settingsUpdates: 0
  });

  // Create a function to fetch counts that can be called multiple times
  const fetchCounts = useCallback(async () => {
    try {
      console.log('Fetching updated sidebar counts...');
      
      // Get token for authenticated requests
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      // Create axios instance with auth headers
      const axiosWithAuth = axios.create({ headers });
      
      // Fetch counts for each category with error handling
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

      setCounts({
        trucks: trucksRes.data.length || 0,
        drivers: driversRes.data.filter(d => d.DriverStatus === 'active' || d.driverStatus === 'active').length || 0,
        helpers: helpersRes.data.filter(h => h.HelperStatus === 'active' || h.helperStatus === 'active').length || 0,
        staff: staffRes.data.filter(s => s.StaffStatus === 'active' || s.staffStatus === 'active').length || 0,
        clients: clientsRes.data.filter(c => c.ClientStatus === 'active' || c.clientStatus === 'active').length || 0,
        deliveries: deliveriesRes.data.length || 0,
        pendingDeliveries: pendingDeliveriesRes.data.length || 0,
        unreadNotifications: 3 // Demo value
      });
      
      console.log('✅ Sidebar counts updated successfully');
    } catch (error) {
      console.error('Error fetching counts:', error);
      // Keep existing counts if there's an error - don't reset to zero
      console.log('⚠️ Using cached counts due to fetch error');
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
    window.addEventListener('refreshSidebar', fetchCounts);
    
    // Clean up on unmount
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('refreshSidebar', fetchCounts);
    };
  }, [fetchCounts]);
  
  // Add listener for route changes to refresh data when navigating
  useEffect(() => {
    fetchCounts();
  }, [location.pathname, fetchCounts]);
  
  // Check if a menu item is active
  const isActive = (path) => {
    return location.pathname.startsWith(path) ? 'active' : '';
  };
  
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <img src={process.env.PUBLIC_URL + '/images/logo.png.webp'} alt="Trucking Logo" />
          <span>Trucking MS</span>
        </div>
      </div>
      
      <div className="user-info">
        <div className="avatar">
          {currentUser.username ? currentUser.username.charAt(0).toUpperCase() : 'A'}
        </div>
        <div className="user-details">
          <h4>{currentUser.username || 'Admin'}</h4>
          <p>{currentUser.role || 'Admin'}</p>
        </div>
      </div>
      
      <div className="sidebar-menu">
        {/* Main Dashboard */}
        <Link to="/admin/dashboard" className={`menu-item ${isActive('/admin/dashboard')}`}>
          <span className="menu-icon icon-dashboard"></span>
          <span className="menu-label">Dashboard</span>
        </Link>
        
        {/* Fleet Management Group with count indicator */}
        <div className="menu-group-label">
          Fleet Management
          <span className="group-count">{counts.trucks}</span>
        </div>
        
        <Link to="/admin/trucks/trucklist" className={`menu-item ${isActive('/admin/trucks/trucklist')}`}>
          <span className="menu-icon icon-truck"></span>
          <span className="menu-label">Trucks</span>
          <span className="menu-badge">{counts.trucks}</span>
        </Link>
        
        {/* Add hot badge to deliveries */}
        <Link to="/admin/deliveries/deliverylist" className={`menu-item ${isActive('/admin/deliveries/deliverylist')}`}>
          <span className="menu-icon icon-delivery"></span>
          <span className="menu-label">Deliveries</span>
          {counts.pendingDeliveries > 0 && (
            <span className="menu-badge hot-badge">{counts.pendingDeliveries > 0 ? 'Hot' : ''}</span>
          )}
        </Link>
        
        {/* People Management Group with count indicator */}
        <div className="menu-group-label">
          People
          <span className="group-count">{counts.drivers + counts.helpers + counts.staff + counts.clients}</span>
        </div>
        
        {/* Add active count to drivers */}
        <Link to="/admin/drivers/driverslist" className={`menu-item ${isActive('/admin/drivers/driverslist')}`}>
          <span className="menu-icon icon-driver"></span>
          <span className="menu-label">Drivers</span>
          <span className="menu-badge active-badge">{counts.drivers} Active</span>
        </Link>
        
        <Link to="/admin/helpers/helperslist" className={`menu-item ${isActive('/admin/helpers/helperslist')}`}>
          <span className="menu-icon icon-helper"></span>
          <span className="menu-label">Helpers</span>
          <span className="menu-badge">{counts.helpers}</span>
        </Link>
        

        
        <Link to="/admin/staffs/stafflist" className={`menu-item ${isActive('/admin/staffs/stafflist')}`}>
          <span className="menu-icon icon-staff"></span>
          <span className="menu-label">Staff</span>
          <span className="menu-badge">{counts.staff}</span>
        </Link>
        
        <Link to="/admin/clients/clientlist" className={`menu-item ${isActive('/admin/clients/clientlist')}`}>
          <span className="menu-icon icon-client"></span>
          <span className="menu-label">Clients</span>
          <span className="menu-badge">{counts.clients}</span>
        </Link>

        <div className="menu-group-label">
          Finance
        </div>
        
        <Link to="/admin/payments" className={`menu-item ${isActive('/admin/payments')}`}>
          <span className="menu-icon icon-payments"></span>
          <span className="menu-label">Payment Records</span>
        </Link>

      </div>
      
      <div className="sidebar-footer">
        <Link to="/logout" className="logout-btn">
          <span className="menu-icon icon-logout"></span>
          <span>Logout</span>
        </Link>
      </div>
    </div>
  );
};

export default Sidebar;