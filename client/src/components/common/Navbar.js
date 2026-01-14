// src/components/common/Navbar.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import './Navbar.css';

const Navbar = () => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // Get current user from localStorage
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  
  // Use the notification context
  const { 
    notifications, 
    unreadCount, 
    loading,
    markAsRead,
    markAllAsRead
  } = useNotifications();
  
  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    if (showUserMenu) setShowUserMenu(false);
  };
  
  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
    if (showNotifications) setShowNotifications(false);
  };
  
  const handleLogout = async () => {
    try {
      // Call the logout API if available
      if (currentUser && currentUser.id) {
        // Try to log the logout action
        try {
          console.log('Logout initiated for user:', currentUser);
          console.log('Attempting to log logout for user:', currentUser.id, currentUser.username);
          
          // Use fetch with better error handling
          const response = await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ 
              userId: currentUser.id,
              username: currentUser.username
            })
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data = await response.json();
          console.log('Logout API call successful, response:', data);
        } catch (error) {
          console.error('Error logging logout:', error);
          console.error('Error details:', error.message);
          // Try with axios as fallback
          try {
            console.log('Trying fallback with direct test endpoint...');
            const response = await fetch('/api/auth/test-logout-audit', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });
            const data = await response.json();
            console.log('Test logout API call result:', data);
          } catch (testError) {
            console.error('Test endpoint also failed:', testError);
          }
          // Continue with logout even if logging fails
        }
      } else {
        console.warn('No user ID found for logout audit logging');
      }
      
      // Clear localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
      
      // Redirect to login
      window.location.href = '/login';
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };
  
  // Helper function to format the time
  const formatTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    
    const date = timestamp instanceof Date 
      ? timestamp 
      : new Date(timestamp);
    
    // For timestamps less than 24 hours old
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    
    // For older timestamps
    return date.toLocaleDateString();
  };
  
  // Function to get the appropriate icon class based on entity type
  const getIconClass = (notification) => {
    const { type, entityType } = notification;
    
    // Debug log
    console.log(`Rendering notification: ${notification.title} - Type: ${type}, EntityType: ${entityType}`);
    
    // Entity types that should take precedence over notification type
    if (entityType === 'operator') return 'notification-icon-operator';
    if (entityType === 'helper') return 'notification-icon-helper';
    if (entityType === 'driver') return 'notification-icon-driver';
    
    // Type takes precedence if available (security, etc)
    if (type === 'security') return 'notification-icon-security';
    if (type === 'delivery') return 'notification-icon-delivery';
    
    // Fall back to other entity types
    switch (entityType) {
      case 'truck':
        return 'notification-icon-truck';
      case 'client':
        return 'notification-icon-client';
      case 'staff':
        return 'notification-icon-staff';
      case 'user':
        return 'notification-icon-user';
      default:
        return 'notification-icon-default';
    }
  };
  
  // Handle clicking on a notification
  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    // Could add additional logic to navigate to relevant pages based on notification
  };
  
  // Handle mark all as read
  const handleMarkAllAsRead = (e) => {
    e.preventDefault();
    markAllAsRead();
  };
  
  return (
    <div className="navbar">
      <div className="navbar-left">
        <div className="search-bar">
          <span className="search-icon"></span>
          <input type="text" placeholder="Search..." />
        </div>
      </div>
      
      <div className="navbar-right">
        <div className="notification-container">
          <button className="notification-button" onClick={toggleNotifications}>
            <span className="notification-icon"></span>
            <span className="notification-badge">{unreadCount || 0}</span>
          </button>
          
          {showNotifications && (
            <div className="notification-dropdown">
              <div className="dropdown-header">
                <h4>Notifications</h4>
                <button className="mark-all-read" onClick={handleMarkAllAsRead}>
                  Mark all as read
                </button>
              </div>
              
              <div className="notification-list">
                {loading ? (
                  <div className="loading-notifications">
                    <p>Loading notifications...</p>
                  </div>
                ) : notifications.length > 0 ? (
                  notifications.map(notification => (
                    <div 
                      key={notification.id} 
                      className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="notification-icon-wrapper" style={{ display: 'flex', alignItems: 'center' }}>
                        <span 
                          className={`notification-icon-entity ${getIconClass(notification)}`} 
                          style={{ 
                            display: 'inline-block',
                            width: '24px',
                            height: '24px',
                            backgroundColor: notification.read ? '#95a5a6' : '#3498db'
                          }}
                        ></span>
                      </div>
                      <div className="notification-content">
                        <p className="notification-title">{notification.title}</p>
                        <p>{notification.message}</p>
                        <span className="notification-time">
                          {formatTime(notification.created_at || notification.time)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-notifications">
                    <p>No notifications</p>
                  </div>
                )}
              </div>
              
              <div className="dropdown-footer">
                <Link to="/notifications" onClick={() => setShowNotifications(false)}>
                  View all notifications
                </Link>
              </div>
            </div>
          )}
        </div>
        
        <div className="user-menu-container">
          <button className="user-menu-button" onClick={toggleUserMenu}>
            <div className="user-avatar">
              {currentUser.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <span className="user-name">{currentUser.username || 'User'}</span>
            <span className="dropdown-arrow"></span>
          </button>
          
          {showUserMenu && (
            <div className="user-dropdown">
              <div className="user-dropdown-header">
                <div className="user-avatar large">
                  {currentUser.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="user-info">
                  <h4>{currentUser.username || 'User'}</h4>
                  <p>{currentUser.role || 'Role'}</p>
                </div>
              </div>
              
              <div className="dropdown-menu">
                <Link to="/profile" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                  <span className="dropdown-icon profile-icon"></span>
                  <span>My Profile</span>
                </Link>
                <Link to="/settings" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                  <span className="dropdown-icon settings-icon"></span>
                  <span>Settings</span>
                </Link>
                <button onClick={handleLogout} className="dropdown-item">
                  <span className="dropdown-icon logout-icon"></span>
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;