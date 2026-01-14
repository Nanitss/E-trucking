import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const LOCATION_TASK_NAME = 'background-location-task';
const LOCATION_STORAGE_KEY = 'cached_locations';

/**
 * GPS Tracking Service for Expo/React Native
 * Provides real-time location tracking for iOS devices using expo-location
 */
class GPSTrackingService {
  constructor() {
    this.isTracking = false;
    this.subscription = null;
    this.currentLocation = null;
    this.listeners = new Set();
    this.updateInterval = 30000; // 30 seconds default
    this.serverUrl = 'http://localhost:5007/api/drivers/location';
    this.authToken = null;
    
    // Initialize background task
    this.initializeBackgroundTask();
    
    console.log('📱 Expo GPS Tracking Service initialized');
  }

  /**
   * Initialize background location task
   */
  initializeBackgroundTask() {
    TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
      if (error) {
        console.error('Background location error:', error);
        return;
      }
      if (data) {
        const { locations } = data;
        console.log('📍 Background location update:', locations);
        
        // Process background locations
        locations.forEach(location => {
          this.handleLocationUpdate(location);
        });
      }
    });
  }

  /**
   * Set authentication token
   */
  setAuthToken(token) {
    this.authToken = token;
  }

  /**
   * Set server URL
   */
  setServerUrl(url) {
    this.serverUrl = url;
  }

  /**
   * Request location permissions
   */
  async requestPermissions() {
    try {
      console.log('📱 Requesting location permissions...');
      
      // Request foreground permission
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        throw new Error('Foreground location permission denied');
      }

      // Request background permission for iOS
      const backgroundStatus = await Location.requestBackgroundPermissionsAsync();
      
      if (backgroundStatus.status !== 'granted') {
        console.warn('⚠️ Background location permission not granted');
        // Continue without background permission
      }

      console.log('✅ Location permissions granted');
      return true;
    } catch (error) {
      console.error('❌ Permission request failed:', error);
      throw error;
    }
  }

  /**
   * Check if location services are enabled
   */
  async isLocationEnabled() {
    try {
      return await Location.hasServicesEnabledAsync();
    } catch (error) {
      console.error('Error checking location services:', error);
      return false;
    }
  }

  /**
   * Start GPS tracking
   */
  async startTracking(options = {}) {
    try {
      if (this.isTracking) {
        console.log('⚠️ GPS tracking already active');
        return;
      }

      console.log('🚀 Starting GPS tracking...');

      // Request permissions
      await this.requestPermissions();

      // Check if location services are enabled
      const isEnabled = await this.isLocationEnabled();
      if (!isEnabled) {
        throw new Error('Location services are disabled. Please enable location services in your device settings.');
      }

      // Configure tracking options
      const trackingOptions = {
        accuracy: Location.Accuracy.High,
        timeInterval: options.updateInterval || this.updateInterval,
        distanceInterval: options.distanceInterval || 10, // 10 meters
        ...options.trackingOptions
      };

      console.log('📍 Starting location tracking with options:', trackingOptions);

      // Start foreground location updates
      this.subscription = await Location.watchPositionAsync(
        trackingOptions,
        (location) => {
          this.handleLocationUpdate(location);
        }
      );

      // Start background location updates
      try {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.High,
          timeInterval: this.updateInterval,
          distanceInterval: 10,
          deferredUpdatesInterval: 60000, // 1 minute
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: 'Tracking Location',
            notificationBody: 'Trucking app is tracking your location for deliveries',
          },
        });
        console.log('✅ Background location tracking started');
      } catch (bgError) {
        console.warn('⚠️ Background location tracking failed:', bgError.message);
      }

      this.isTracking = true;
      this.notifyListeners('trackingStarted', { isTracking: true });

      console.log('✅ GPS tracking started successfully');
      return { success: true, message: 'GPS tracking started' };

    } catch (error) {
      console.error('❌ Failed to start GPS tracking:', error);
      throw error;
    }
  }

  /**
   * Stop GPS tracking
   */
  async stopTracking() {
    try {
      if (!this.isTracking) {
        console.log('⚠️ GPS tracking not active');
        return;
      }

      console.log('🛑 Stopping GPS tracking...');

      // Stop foreground tracking
      if (this.subscription) {
        this.subscription.remove();
        this.subscription = null;
      }

      // Stop background tracking
      try {
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
        if (hasStarted) {
          await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
          console.log('✅ Background location tracking stopped');
        }
      } catch (bgError) {
        console.warn('⚠️ Error stopping background tracking:', bgError.message);
      }

      // Send final location update
      if (this.currentLocation) {
        await this.sendLocationToServer(this.currentLocation, true);
      }

      this.isTracking = false;
      this.currentLocation = null;
      this.notifyListeners('trackingStopped', { isTracking: false });

      console.log('✅ GPS tracking stopped');
      return { success: true, message: 'GPS tracking stopped' };

    } catch (error) {
      console.error('❌ Error stopping GPS tracking:', error);
      throw error;
    }
  }

  /**
   * Handle location updates
   */
  handleLocationUpdate(location) {
    try {
      const locationData = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        accuracy: location.coords.accuracy,
        speed: location.coords.speed || 0,
        heading: location.coords.heading || 0,
        altitude: location.coords.altitude,
        timestamp: new Date(location.timestamp).toISOString()
      };

      console.log('📍 GPS location update:', {
        lat: locationData.lat.toFixed(6),
        lng: locationData.lng.toFixed(6),
        accuracy: Math.round(locationData.accuracy),
        speed: Math.round(locationData.speed * 3.6), // m/s to km/h
        timestamp: locationData.timestamp
      });

      this.currentLocation = locationData;
      this.notifyListeners('locationUpdate', locationData);

      // Send to server
      this.sendLocationToServer(locationData);

      // Cache location locally
      this.cacheLocation(locationData);

    } catch (error) {
      console.error('❌ Error handling location update:', error);
    }
  }

  /**
   * Get current location (one-time)
   */
  async getCurrentLocation() {
    try {
      console.log('📍 Getting current location...');
      
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Location permission denied');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        maximumAge: 60000, // 1 minute cache
      });

      const locationData = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        accuracy: location.coords.accuracy,
        speed: location.coords.speed || 0,
        heading: location.coords.heading || 0,
        altitude: location.coords.altitude,
        timestamp: new Date(location.timestamp).toISOString()
      };

      console.log('✅ Current location obtained:', locationData);
      return locationData;

    } catch (error) {
      console.error('❌ Error getting current location:', error);
      throw error;
    }
  }

  /**
   * Send location to server
   */
  async sendLocationToServer(locationData, isFinal = false) {
    try {
      if (!this.authToken) {
        console.warn('⚠️ No auth token available, caching location');
        await this.cacheLocation(locationData);
        return;
      }

      const updateData = {
        ...locationData,
        isFinal: isFinal,
        deviceInfo: await this.getDeviceInfo()
      };

      console.log('📤 Sending location to server...');

      const response = await axios.post(this.serverUrl, updateData, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });

      if (response.data.success) {
        console.log('✅ Location sent successfully');
        this.notifyListeners('locationSent', { success: true, timestamp: locationData.timestamp });
        
        // Process any cached locations
        await this.processCachedLocations();
      } else {
        throw new Error(response.data.message || 'Server rejected location');
      }

    } catch (error) {
      console.error('❌ Failed to send location:', error);
      
      // Cache location for retry
      await this.cacheLocation(locationData);
      this.notifyListeners('locationSendFailed', { 
        error: error.message, 
        timestamp: locationData.timestamp 
      });
    }
  }

  /**
   * Cache location locally
   */
  async cacheLocation(locationData) {
    try {
      const cached = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
      const locations = cached ? JSON.parse(cached) : [];
      
      locations.push({
        ...locationData,
        cachedAt: new Date().toISOString()
      });

      // Keep only last 100 locations
      if (locations.length > 100) {
        locations.splice(0, locations.length - 100);
      }

      await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(locations));
      console.log('💾 Location cached locally');
    } catch (error) {
      console.error('❌ Error caching location:', error);
    }
  }

  /**
   * Process cached locations
   */
  async processCachedLocations() {
    try {
      const cached = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
      if (!cached) return;

      const locations = JSON.parse(cached);
      if (locations.length === 0) return;

      console.log(`📤 Processing ${locations.length} cached locations`);

      for (const location of locations) {
        try {
          await this.sendLocationToServer(location);
          // Small delay to avoid overwhelming server
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error('❌ Failed to send cached location:', error);
          break; // Stop processing if server is unavailable
        }
      }

      // Clear processed locations
      await AsyncStorage.removeItem(LOCATION_STORAGE_KEY);
      console.log('✅ Cached locations processed');

    } catch (error) {
      console.error('❌ Error processing cached locations:', error);
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
        platform: Device.osName,
        version: Device.osVersion,
        model: Device.modelName,
        brand: Device.brand,
        deviceId: Constants.deviceId,
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
          console.error('Error in event listener:', error);
        }
      }
    });
  }

  /**
   * Get tracking status
   */
  getStatus() {
    return {
      isTracking: this.isTracking,
      currentLocation: this.currentLocation,
      updateInterval: this.updateInterval,
      hasAuthToken: !!this.authToken
    };
  }

  /**
   * Set update interval
   */
  setUpdateInterval(interval) {
    this.updateInterval = interval;
    console.log(`⏱️ Update interval set to ${interval}ms`);
  }
}

// Create and export singleton instance
const gpsTrackingService = new GPSTrackingService();
export default gpsTrackingService; 