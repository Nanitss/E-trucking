import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const AUTH_TOKEN_KEY = 'auth_token';
const DRIVER_INFO_KEY = 'driver_info';
const SERVER_URL_KEY = 'server_url';

/**
 * Authentication Service for Mobile App
 * Handles driver login, token management, and user session
 */
class AuthService {
  constructor() {
    this.authToken = null;
    this.driverInfo = null;
    this.serverUrl = 'http://localhost:5007/api/mobile'; // Default server URL
    this.listeners = new Set();
    
    // Initialize service
    this.initialize();
    
    console.log('🔐 Auth Service initialized');
  }

  /**
   * Initialize service - load saved data
   */
  async initialize() {
    try {
      // Load saved data
      const [token, driverInfo, serverUrl] = await Promise.all([
        AsyncStorage.getItem(AUTH_TOKEN_KEY),
        AsyncStorage.getItem(DRIVER_INFO_KEY),
        AsyncStorage.getItem(SERVER_URL_KEY)
      ]);

      if (token) {
        this.authToken = token;
        console.log('✅ Auth token loaded from storage');
      }

      if (driverInfo) {
        this.driverInfo = JSON.parse(driverInfo);
        console.log('✅ Driver info loaded from storage');
      }

      if (serverUrl) {
        this.serverUrl = serverUrl;
        console.log('✅ Server URL loaded from storage:', serverUrl);
      }

      // Configure axios defaults
      this.configureAxios();

    } catch (error) {
      console.error('❌ Error initializing auth service:', error);
    }
  }

  /**
   * Configure axios with auth token
   */
  configureAxios() {
    if (this.authToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${this.authToken}`;
    }
  }

  /**
   * Set server URL
   */
  async setServerUrl(url) {
    try {
      this.serverUrl = url;
      await AsyncStorage.setItem(SERVER_URL_KEY, url);
      console.log('✅ Server URL updated:', url);
    } catch (error) {
      console.error('❌ Error saving server URL:', error);
    }
  }

  /**
   * Login driver
   */
  async login(username, password, deviceToken = null) {
    try {
      console.log('🔐 Attempting driver login...');

      const loginData = {
        username: username.trim(),
        password: password,
        deviceToken: deviceToken,
        deviceInfo: await this.getDeviceInfo()
      };

      const response = await axios.post(`${this.serverUrl}/auth/login`, loginData, {
        timeout: 10000 // 10 second timeout
      });

      if (response.data.success) {
        const { token, driver } = response.data;
        
        // Save auth data
        await this.saveAuthData(token, driver);
        
        console.log('✅ Login successful:', driver.name);
        this.notifyListeners('loginSuccess', { driver, token });
        
        return { success: true, driver, token };
      } else {
        throw new Error(response.data.message || 'Login failed');
      }

    } catch (error) {
      console.error('❌ Login failed:', error);
      
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      this.notifyListeners('loginFailed', { error: errorMessage });
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Logout driver
   */
  async logout() {
    try {
      console.log('🔐 Logging out...');

      // Call server logout endpoint
      try {
        await axios.post(`${this.serverUrl}/auth/logout`);
      } catch (error) {
        console.warn('⚠️ Server logout failed, proceeding with local logout');
      }

      // Clear local data
      await this.clearAuthData();
      
      console.log('✅ Logout successful');
      this.notifyListeners('logoutSuccess');
      
      return { success: true };

    } catch (error) {
      console.error('❌ Logout error:', error);
      
      // Still clear local data even if server call fails
      await this.clearAuthData();
      
      throw error;
    }
  }

  /**
   * Save authentication data
   */
  async saveAuthData(token, driverInfo) {
    try {
      this.authToken = token;
      this.driverInfo = driverInfo;

      await Promise.all([
        AsyncStorage.setItem(AUTH_TOKEN_KEY, token),
        AsyncStorage.setItem(DRIVER_INFO_KEY, JSON.stringify(driverInfo))
      ]);

      // Configure axios with new token
      this.configureAxios();

      console.log('✅ Auth data saved');
    } catch (error) {
      console.error('❌ Error saving auth data:', error);
      throw error;
    }
  }

  /**
   * Clear authentication data
   */
  async clearAuthData() {
    try {
      this.authToken = null;
      this.driverInfo = null;

      await Promise.all([
        AsyncStorage.removeItem(AUTH_TOKEN_KEY),
        AsyncStorage.removeItem(DRIVER_INFO_KEY)
      ]);

      // Remove axios auth header
      delete axios.defaults.headers.common['Authorization'];

      console.log('✅ Auth data cleared');
    } catch (error) {
      console.error('❌ Error clearing auth data:', error);
      throw error;
    }
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn() {
    return !!(this.authToken && this.driverInfo);
  }

  /**
   * Get current auth token
   */
  getAuthToken() {
    return this.authToken;
  }

  /**
   * Get current driver info
   */
  getDriverInfo() {
    return this.driverInfo;
  }

  /**
   * Get server URL
   */
  getServerUrl() {
    return this.serverUrl;
  }

  /**
   * Refresh auth token
   */
  async refreshToken() {
    try {
      if (!this.authToken) {
        throw new Error('No auth token available');
      }

      console.log('🔄 Refreshing auth token...');

      const response = await axios.post(`${this.serverUrl}/auth/refresh`, {}, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        },
        timeout: 10000
      });

      if (response.data.success) {
        const { token } = response.data;
        
        // Update token
        this.authToken = token;
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
        
        // Update axios headers
        this.configureAxios();
        
        console.log('✅ Token refreshed successfully');
        this.notifyListeners('tokenRefreshed', { token });
        
        return { success: true, token };
      } else {
        throw new Error(response.data.message || 'Token refresh failed');
      }

    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      
      // If token refresh fails, logout user
      await this.logout();
      
      throw error;
    }
  }

  /**
   * Update driver profile
   */
  async updateProfile(profileData) {
    try {
      console.log('👤 Updating driver profile...');

      const response = await axios.put(`${this.serverUrl}/driver/profile`, profileData, {
        timeout: 10000
      });

      if (response.data.success) {
        const { driver } = response.data;
        
        // Update stored driver info
        this.driverInfo = driver;
        await AsyncStorage.setItem(DRIVER_INFO_KEY, JSON.stringify(driver));
        
        console.log('✅ Profile updated successfully');
        this.notifyListeners('profileUpdated', { driver });
        
        return { success: true, driver };
      } else {
        throw new Error(response.data.message || 'Profile update failed');
      }

    } catch (error) {
      console.error('❌ Profile update failed:', error);
      throw error;
    }
  }

  /**
   * Register device token for push notifications
   */
  async registerDeviceToken(deviceToken) {
    try {
      console.log('📱 Registering device token...');

      const response = await axios.post(`${this.serverUrl}/auth/register-device`, {
        deviceToken: deviceToken,
        deviceInfo: await this.getDeviceInfo()
      }, {
        timeout: 10000
      });

      if (response.data.success) {
        console.log('✅ Device token registered successfully');
        return { success: true };
      } else {
        throw new Error(response.data.message || 'Device registration failed');
      }

    } catch (error) {
      console.error('❌ Device token registration failed:', error);
      throw error;
    }
  }

  /**
   * Get device information
   */
  async getDeviceInfo() {
    try {
      const Constants = require('expo-constants').default;
      const Device = require('expo-device');
      
      return {
        platform: Device.osName || 'unknown',
        version: Device.osVersion || 'unknown',
        model: Device.modelName || 'unknown',
        brand: Device.brand || 'unknown',
        deviceId: Constants.deviceId || 'unknown',
        appVersion: Constants.manifest?.version || '1.0.0'
      };
    } catch (error) {
      console.error('Error getting device info:', error);
      return {
        platform: 'unknown',
        version: 'unknown',
        deviceId: 'unknown'
      };
    }
  }

  /**
   * Check token validity
   */
  async checkTokenValidity() {
    try {
      const response = await axios.get(`${this.serverUrl}/driver/profile`, {
        timeout: 5000
      });

      return response.data.success;
    } catch (error) {
      console.log('Token validation failed:', error.message);
      return false;
    }
  }

  /**
   * Add event listener
   */
  addEventListener(event, callback) {
    this.listeners.add({ event, callback });
  }

  /**
   * Remove event listener
   */
  removeEventListener(callback) {
    this.listeners.forEach(listener => {
      if (listener.callback === callback) {
        this.listeners.delete(listener);
      }
    });
  }

  /**
   * Notify listeners
   */
  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      if (listener.event === event) {
        try {
          listener.callback(data);
        } catch (error) {
          console.error('Error in auth listener:', error);
        }
      }
    });
  }
}

// Create and export singleton instance
const authService = new AuthService();
export default authService; 