import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { getFromStorage, setInStorage, removeFromStorage, isStorageAvailable } from '../utils/storageUtil';

export const AuthContext = createContext();

// Configure the base URL for API requests
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5007'
  : ''; // Empty string means relative paths, which work when server and client are on same domain

// Helper to get the correct API path
// In production, Firebase hosting rewrites /api/** to the Cloud Function
// The Cloud Function routes are mounted without /api prefix
// So we use /api for localhost (where server has /api routes) but NOT for production
const getApiPath = (path) => {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isLocalhost) {
    // In development, use full path with /api
    const cleanPath = path.startsWith('/api') ? path : `/api${path}`;
    return `${API_BASE_URL}${cleanPath}`;
  } else {
    // In production, Firebase Hosting rewrite handles /api prefix
    // Just use /api + path for the rewrite to match
    const cleanPath = path.startsWith('/api') ? path : `/api${path}`;
    return cleanPath;
  }
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);

  // Note: We don't set axios.defaults.baseURL because getApiPath handles URL construction
  // This avoids potential URL duplication issues

  // Check if storage is available
  useEffect(() => {
    const available = isStorageAvailable();
    setStorageAvailable(available);
    if (!available) {
      console.warn('localStorage is not available. Login state will not persist.');
    }
  }, []);

  // Load token & user from localStorage
  useEffect(() => {
    const loadUserData = async () => {
      if (!storageAvailable) {
        console.warn('Storage not available, cannot load user data');
        setLoading(false);
        return;
      }

      try {
        const token = getFromStorage('token');
        if (token) {
          // Set the authorization header with the token
          console.log('Found token in storage, setting in axios headers');
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          // Try to load saved user data
          const parsedUser = getFromStorage('currentUser');
          if (parsedUser && parsedUser.id) {
            console.log('Loaded user data from localStorage');
            setCurrentUser(parsedUser);
            setIsAuthenticated(true);
          } else {
            // We have a token but no valid user data, try to fetch user data
            console.log('Token found but no valid user data, fetching user data...');
            try {
              const response = await axios.get(getApiPath('/auth/current-user'));
              console.log('User data retrieved:', response.data);
              setCurrentUser(response.data);
              setIsAuthenticated(true);
              if (storageAvailable) {
                setInStorage('currentUser', response.data);
              }
            } catch (err) {
              console.error('Failed to retrieve user data with token:', err.message);
              // Token is likely invalid, clear it
              logout();
            }
          }
        } else {
          console.log('No token found in storage');
        }
      } catch (e) {
        console.error('Error loading user data:', e);
        // Clear potentially corrupted data if storage is available
        if (storageAvailable) {
          removeFromStorage('token');
          removeFromStorage('currentUser');
        }
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [storageAvailable]);

  const login = async ({ username, password }) => {
    setLoading(true);
    setError(null);
    try {
      console.log('AuthContext: Attempting login with username:', username);

      // Debug: Log the URL being used
      const loginUrl = getApiPath('/auth/login');
      console.log('AuthContext: Login URL:', loginUrl);

      // Use the full URL to avoid proxy issues
      const { data } = await axios.post(loginUrl, {
        username: username.trim(),
        password
      });

      console.log('AuthContext: Login response received:', data);

      const { token, user } = data;

      // Removed overly strict token validation to avoid breaking existing tokens
      if (!token) {
        throw new Error('No token received from server');
      }

      if (storageAvailable) {
        try {
          // Store the token as a plain string
          setInStorage('token', token);
          console.log('Token stored in localStorage');

          // Store user data if available
          if (user) {
            setInStorage('currentUser', user);
            console.log('User data stored in localStorage');
          }
        } catch (storageError) {
          console.error('Failed to store auth data:', storageError);
        }
      }

      // Set token in axios headers
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      console.log('AuthContext: Set Authorization header with token');

      // If we received user data with the login response, use it
      if (user) {
        console.log('Using user data from login response');
        setCurrentUser(user);
        setIsAuthenticated(true);
        return { success: true, role: user.role };
      }

      // Otherwise try to get user data
      try {
        console.log('AuthContext: Getting user data with token');
        const { data: userData } = await axios.get(getApiPath('/auth/current-user'));

        console.log('AuthContext: User data received:', userData);
        if (storageAvailable) {
          try {
            setInStorage('currentUser', userData);
          } catch (storageError) {
            console.error('Failed to store user data:', storageError);
          }
        }
        setCurrentUser(userData);
        setIsAuthenticated(true);

        return { success: true, role: userData.role };
      } catch (userErr) {
        console.error('AuthContext: Error fetching user after login:', userErr);
        console.error('Details:', {
          message: userErr.message,
          status: userErr.response?.status,
          statusText: userErr.response?.statusText,
          data: userErr.response?.data
        });

        setError('Authentication successful but failed to load user data.');
        return { success: false, message: 'Authentication successful but failed to load user data.' };
      }
    } catch (err) {
      console.error('AuthContext: Login error:', err);
      console.error('Details:', {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data
      });

      let errorMessage = 'Login failed. Please check your credentials.';

      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.status === 400) {
        errorMessage = 'Invalid username or password.';
      } else if (err.response?.status === 403) {
        errorMessage = 'Account is inactive. Please contact administrator.';
      } else if (!err.response) {
        errorMessage = 'Network error. Please check your connection.';
      }

      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    console.log('AuthContext: Logging out user');

    // Clear axios headers first
    delete axios.defaults.headers.common['Authorization'];

    // Then clear storage
    if (storageAvailable) {
      try {
        // Try to clean up localStorage items using our utility
        removeFromStorage('token');
        removeFromStorage('currentUser');

        // Also directly clear localStorage as a fallback
        try {
          localStorage.removeItem('token');
          localStorage.removeItem('currentUser');
          localStorage.removeItem('userData');
        } catch (directError) {
          console.error('Direct localStorage removal failed:', directError);
        }
      } catch (e) {
        console.error('Error clearing localStorage during logout:', e);
      }
    }

    // Reset state
    setCurrentUser(null);
    setIsAuthenticated(false);
    setError(null);

    console.log('AuthContext: Logout complete, redirecting to login...');

    // Redirect to login page
    window.location.href = '/login';
  };

  const hasRole = role => {
    console.log('AuthContext: Checking role:', role, 'Current user role:', currentUser?.role);
    return currentUser?.role?.toLowerCase() === role.toLowerCase();
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      authUser: currentUser, // Add authUser as an alias for compatibility
      loading,
      error,
      isAuthenticated,
      login,
      logout,
      hasRole
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;