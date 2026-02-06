// src/context/NotificationContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch notifications when component mounts
  useEffect(() => {
    fetchNotifications();
    // Set up a timer to periodically check for new notifications
    const intervalId = setInterval(fetchNotifications, 60000); // Every minute

    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  // Fetch notifications from API
  const fetchNotifications = async () => {
    try {
      // Safely get token with storage availability check
      let token = null;
      try {
        if (typeof Storage !== 'undefined' && typeof localStorage !== 'undefined') {
          token = localStorage.getItem('token');
        }
      } catch (storageError) {
        console.warn('Cannot access localStorage for token:', storageError);
        setLoading(false);
        return;
      }

      if (!token) {
        setLoading(false);
        return;
      }

      // Use the main server for notifications
      const response = await axios.get(`${API_BASE_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unreadCount || 0);
      setLoading(false);
    } catch (error) {
      console.warn('Error fetching notifications:', error);
      // Don't log this as an error since notifications are optional
      setLoading(false);
    }
  };

  // Mark a notification as read
  const markAsRead = async (notificationId) => {
    try {
      let token = null;
      try { token = localStorage.getItem('token'); } catch (e) { /* ignore */ }
      if (!token) return;

      await axios.put(`${API_BASE_URL}/api/notifications/${notificationId}/read`, null, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update the state locally
      setNotifications(prevNotifications =>
        prevNotifications.map(notif =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );

      setUnreadCount(prevCount => Math.max(0, prevCount - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      let token = null;
      try { token = localStorage.getItem('token'); } catch (e) { /* ignore */ }
      if (!token) return;

      await axios.put(`${API_BASE_URL}/api/notifications/read-all`, null, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update the state locally
      setNotifications(prevNotifications =>
        prevNotifications.map(notif => ({ ...notif, read: true }))
      );

      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Add a local notification (for immediate feedback before API sync)
  const addLocalNotification = (notification) => {
    const newNotification = {
      id: `local-${Date.now()}`,
      ...notification,
      read: false,
      local: true,
      time: 'Just now'
    };

    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      fetchNotifications,
      markAsRead,
      markAllAsRead,
      addLocalNotification
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

// Custom hook for using the notification context
export const useNotifications = () => useContext(NotificationContext); 