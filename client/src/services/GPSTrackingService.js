/**
 * GPS Tracking Service for Driver Devices
 * 
 * Features:
 * - Real-time location tracking using HTML5 Geolocation API
 * - Periodic location updates to server
 * - Offline support with queued updates
 * - Battery optimization
 * - Error handling and permission management
 * - Background tracking capabilities
 */

import axios from 'axios';

class GPSTrackingService {
  constructor() {
    this.isTracking = false;
    this.watchId = null;
    this.updateInterval = null;
    this.currentPosition = null;
    this.lastUpdateTime = null;
    this.offlineQueue = [];
    this.trackingOptions = {
      enableHighAccuracy: true,
      timeout: 15000, // 15 seconds
      maximumAge: 60000 // 1 minute cache
    };
    this.updateFrequency = 30000; // 30 seconds default
    this.listeners = [];
    
    // Bind methods to maintain context
    this.handlePositionUpdate = this.handlePositionUpdate.bind(this);
    this.handlePositionError = this.handlePositionError.bind(this);
    
    // Initialize offline event listeners
    this.initializeOfflineSupport();
    
    console.log('🛰️ GPS Tracking Service initialized');
  }

  /**
   * Check if GPS tracking is supported
   */
  static isSupported() {
    return 'geolocation' in navigator;
  }

  /**
   * Request location permissions
   */
  async requestPermissions() {
    try {
      if (!GPSTrackingService.isSupported()) {
        throw new Error('Geolocation is not supported by this browser');
      }

      // Check current permission status
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        
        if (permission.state === 'denied') {
          throw new Error('Location permission denied. Please enable location access in your browser settings.');
        }
      }

      // Test geolocation access
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('✅ Location permissions granted');
            resolve(true);
          },
          (error) => {
            console.error('❌ Location permission error:', error);
            reject(this.formatGeolocationError(error));
          },
          { timeout: 10000 }
        );
      });
    } catch (error) {
      console.error('❌ Permission request failed:', error);
      throw error;
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

      // Request permissions first
      await this.requestPermissions();

      // Configure tracking options
      this.updateFrequency = options.updateFrequency || 30000;
      this.trackingOptions = {
        ...this.trackingOptions,
        ...options.trackingOptions
      };

      console.log('🚀 Starting GPS tracking...', {
        updateFrequency: this.updateFrequency,
        trackingOptions: this.trackingOptions
      });

      // Start continuous position watching
      this.watchId = navigator.geolocation.watchPosition(
        this.handlePositionUpdate,
        this.handlePositionError,
        this.trackingOptions
      );

      // Start periodic server updates
      this.updateInterval = setInterval(() => {
        if (this.currentPosition) {
          this.sendLocationUpdate(this.currentPosition);
        }
      }, this.updateFrequency);

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
  stopTracking() {
    try {
      if (!this.isTracking) {
        console.log('⚠️ GPS tracking not active');
        return;
      }

      console.log('🛑 Stopping GPS tracking...');

      // Clear watch position
      if (this.watchId !== null) {
        navigator.geolocation.clearWatch(this.watchId);
        this.watchId = null;
      }

      // Clear update interval
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }

      // Send final location update
      if (this.currentPosition) {
        this.sendLocationUpdate(this.currentPosition, true);
      }

      this.isTracking = false;
      this.currentPosition = null;
      this.lastUpdateTime = null;

      this.notifyListeners('trackingStopped', { isTracking: false });

      console.log('✅ GPS tracking stopped');
      
      return { success: true, message: 'GPS tracking stopped' };
    } catch (error) {
      console.error('❌ Error stopping GPS tracking:', error);
      throw error;
    }
  }

  /**
   * Handle position updates from navigator.geolocation
   */
  handlePositionUpdate(position) {
    try {
      const locationData = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        speed: position.coords.speed || 0,
        heading: position.coords.heading || 0,
        altitude: position.coords.altitude,
        timestamp: new Date().toISOString()
      };

      console.log('📍 GPS position update:', {
        lat: locationData.lat.toFixed(6),
        lng: locationData.lng.toFixed(6),
        accuracy: Math.round(locationData.accuracy),
        speed: Math.round(locationData.speed * 3.6), // m/s to km/h
        timestamp: locationData.timestamp
      });

      this.currentPosition = locationData;
      this.lastUpdateTime = Date.now();

      // Notify listeners
      this.notifyListeners('positionUpdate', locationData);

      // Optionally send immediate update for high-priority events
      if (this.shouldSendImmediateUpdate(locationData)) {
        this.sendLocationUpdate(locationData);
      }

    } catch (error) {
      console.error('❌ Error handling position update:', error);
    }
  }

  /**
   * Handle geolocation errors
   */
  handlePositionError(error) {
    console.error('❌ GPS position error:', error);
    
    const errorInfo = {
      code: error.code,
      message: this.formatGeolocationError(error),
      timestamp: new Date().toISOString()
    };

    this.notifyListeners('positionError', errorInfo);
  }

  /**
   * Send location update to server
   */
  async sendLocationUpdate(locationData, isFinal = false) {
    try {
      const updateData = {
        ...locationData,
        isFinal: isFinal,
        deviceInfo: this.getDeviceInfo()
      };

      console.log('📤 Sending location update to server...', {
        lat: updateData.lat.toFixed(6),
        lng: updateData.lng.toFixed(6),
        isFinal: isFinal
      });

      const response = await axios.post('/api/drivers/location', updateData);

      if (response.data.success) {
        console.log('✅ Location update sent successfully');
        
        // Process any queued offline updates
        if (this.offlineQueue.length > 0) {
          this.processOfflineQueue();
        }
        
        this.notifyListeners('updateSent', { success: true, timestamp: updateData.timestamp });
        return true;
      } else {
        throw new Error(response.data.message || 'Server rejected location update');
      }

    } catch (error) {
      console.error('❌ Failed to send location update:', error);
      
      // Queue for offline processing if network error
      if (this.isNetworkError(error)) {
        console.log('📝 Queuing location update for offline processing');
        this.offlineQueue.push({
          ...locationData,
          queuedAt: new Date().toISOString(),
          isFinal: isFinal
        });
        
        this.notifyListeners('updateQueued', { 
          success: false, 
          error: error.message,
          queued: true,
          timestamp: locationData.timestamp 
        });
      } else {
        this.notifyListeners('updateFailed', { 
          success: false, 
          error: error.message,
          timestamp: locationData.timestamp 
        });
      }
      
      return false;
    }
  }

  /**
   * Get current location immediately (one-time)
   */
  async getCurrentLocation() {
    try {
      if (!GPSTrackingService.isSupported()) {
        throw new Error('Geolocation not supported');
      }

      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const locationData = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
              speed: position.coords.speed || 0,
              heading: position.coords.heading || 0,
              timestamp: new Date().toISOString()
            };
            
            console.log('📍 Current location obtained:', locationData);
            resolve(locationData);
          },
          (error) => {
            const errorMessage = this.formatGeolocationError(error);
            console.error('❌ Error getting current location:', errorMessage);
            reject(new Error(errorMessage));
          },
          this.trackingOptions
        );
      });
    } catch (error) {
      console.error('❌ getCurrentLocation failed:', error);
      throw error;
    }
  }

  /**
   * Initialize offline support
   */
  initializeOfflineSupport() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('🌐 Back online - processing queued location updates');
      this.processOfflineQueue();
      this.notifyListeners('networkStatusChanged', { isOnline: true });
    });

    window.addEventListener('offline', () => {
      console.log('📵 Gone offline - location updates will be queued');
      this.notifyListeners('networkStatusChanged', { isOnline: false });
    });
  }

  /**
   * Process queued offline location updates
   */
  async processOfflineQueue() {
    if (this.offlineQueue.length === 0) return;

    console.log(`📤 Processing ${this.offlineQueue.length} queued location updates`);

    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const locationData of queue) {
      try {
        await this.sendLocationUpdate(locationData);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Throttle requests
      } catch (error) {
        console.error('❌ Failed to process queued update:', error);
        // Re-queue if still network error
        if (this.isNetworkError(error)) {
          this.offlineQueue.push(locationData);
        }
      }
    }

    if (this.offlineQueue.length > 0) {
      console.log(`📝 ${this.offlineQueue.length} updates still queued`);
    } else {
      console.log('✅ All queued updates processed');
    }
  }

  /**
   * Add event listener
   */
  addEventListener(eventType, callback) {
    this.listeners.push({ eventType, callback });
  }

  /**
   * Remove event listener
   */
  removeEventListener(callback) {
    this.listeners = this.listeners.filter(listener => listener.callback !== callback);
  }

  /**
   * Notify all listeners of events
   */
  notifyListeners(eventType, data) {
    this.listeners
      .filter(listener => listener.eventType === eventType)
      .forEach(listener => {
        try {
          listener.callback(data);
        } catch (error) {
          console.error('❌ Error in GPS tracking listener:', error);
        }
      });
  }

  /**
   * Check if should send immediate update
   */
  shouldSendImmediateUpdate(locationData) {
    // Send immediate updates for significant speed changes, direction changes, etc.
    if (!this.lastPosition) return false;

    const speedChange = Math.abs((locationData.speed || 0) - (this.lastPosition.speed || 0));
    const significantSpeedChange = speedChange > 10; // 10 m/s change

    this.lastPosition = locationData;
    return significantSpeedChange;
  }

  /**
   * Format geolocation errors
   */
  formatGeolocationError(error) {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Location access denied by user. Please enable location permissions.';
      case error.POSITION_UNAVAILABLE:
        return 'Location information unavailable. Please check your GPS settings.';
      case error.TIMEOUT:
        return 'Location request timed out. Please try again.';
      default:
        return `Location error: ${error.message}`;
    }
  }

  /**
   * Check if error is network-related
   */
  isNetworkError(error) {
    return error.code === 'NETWORK_ERROR' || 
           error.message.includes('Network Error') ||
           error.message.includes('timeout') ||
           !navigator.onLine;
  }

  /**
   * Get device information
   */
  getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      online: navigator.onLine,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get tracking status
   */
  getStatus() {
    return {
      isTracking: this.isTracking,
      isSupported: GPSTrackingService.isSupported(),
      currentPosition: this.currentPosition,
      lastUpdateTime: this.lastUpdateTime,
      queuedUpdates: this.offlineQueue.length,
      isOnline: navigator.onLine,
      updateFrequency: this.updateFrequency
    };
  }

  /**
   * Update tracking frequency
   */
  setUpdateFrequency(frequency) {
    this.updateFrequency = frequency;
    
    if (this.isTracking && this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = setInterval(() => {
        if (this.currentPosition) {
          this.sendLocationUpdate(this.currentPosition);
        }
      }, this.updateFrequency);
    }
    
    console.log(`📱 Update frequency changed to ${frequency}ms`);
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.stopTracking();
    this.listeners = [];
    this.offlineQueue = [];
    console.log('🧹 GPS Tracking Service destroyed');
  }
}

// Create singleton instance
const gpsTrackingService = new GPSTrackingService();

export default gpsTrackingService; 