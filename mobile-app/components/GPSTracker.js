import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Switch,
  ActivityIndicator
} from 'react-native';
import { Card, Title, Paragraph, Button, Chip, Surface } from 'react-native-paper';
import GPSTrackingService from '../services/GPSTrackingService';

const GPSTracker = ({ authToken, driverInfo }) => {
  const [trackingStatus, setTrackingStatus] = useState({
    isTracking: false,
    currentLocation: null,
    updateInterval: 30000,
    hasAuthToken: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    locationsTracked: 0,
    locationsSent: 0,
    locationsFailed: 0,
    sessionStartTime: null
  });

  useEffect(() => {
    // Set auth token when component mounts
    if (authToken) {
      GPSTrackingService.setAuthToken(authToken);
    }

    // Initialize component
    initializeTracker();

    // Set up event listeners
    const handleLocationUpdate = (location) => {
      console.log('📍 Location update received:', location);
      setStats(prev => ({ 
        ...prev, 
        locationsTracked: prev.locationsTracked + 1 
      }));
      updateStatus();
    };

    const handleLocationSent = (data) => {
      console.log('✅ Location sent:', data);
      setStats(prev => ({ 
        ...prev, 
        locationsSent: prev.locationsSent + 1 
      }));
      setError(null);
    };

    const handleLocationSendFailed = (data) => {
      console.log('❌ Location send failed:', data);
      setStats(prev => ({ 
        ...prev, 
        locationsFailed: prev.locationsFailed + 1 
      }));
      setError(data.error);
    };

    const handleTrackingStarted = (data) => {
      console.log('🚀 Tracking started:', data);
      setStats(prev => ({ 
        ...prev, 
        sessionStartTime: new Date() 
      }));
      updateStatus();
    };

    const handleTrackingStopped = (data) => {
      console.log('🛑 Tracking stopped:', data);
      setStats(prev => ({ 
        ...prev, 
        sessionStartTime: null 
      }));
      updateStatus();
    };

    // Add event listeners
    GPSTrackingService.addEventListener('locationUpdate', handleLocationUpdate);
    GPSTrackingService.addEventListener('locationSent', handleLocationSent);
    GPSTrackingService.addEventListener('locationSendFailed', handleLocationSendFailed);
    GPSTrackingService.addEventListener('trackingStarted', handleTrackingStarted);
    GPSTrackingService.addEventListener('trackingStopped', handleTrackingStopped);

    return () => {
      // Cleanup listeners
      GPSTrackingService.removeEventListener(handleLocationUpdate);
      GPSTrackingService.removeEventListener(handleLocationSent);
      GPSTrackingService.removeEventListener(handleLocationSendFailed);
      GPSTrackingService.removeEventListener(handleTrackingStarted);
      GPSTrackingService.removeEventListener(handleTrackingStopped);
    };
  }, [authToken]);

  const initializeTracker = () => {
    updateStatus();
  };

  const updateStatus = () => {
    const status = GPSTrackingService.getStatus();
    setTrackingStatus(status);
  };

  const handleStartTracking = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await GPSTrackingService.startTracking({
        updateInterval: trackingStatus.updateInterval
      });

      if (result.success) {
        Alert.alert('Success', 'GPS tracking started successfully');
      }
    } catch (error) {
      console.error('❌ Error starting tracking:', error);
      setError(error.message);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStopTracking = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await GPSTrackingService.stopTracking();

      if (result.success) {
        Alert.alert('Success', 'GPS tracking stopped');
      }
    } catch (error) {
      console.error('❌ Error stopping tracking:', error);
      setError(error.message);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGetCurrentLocation = async () => {
    try {
      setLoading(true);
      setError(null);

      const location = await GPSTrackingService.getCurrentLocation();
      
      Alert.alert(
        'Current Location',
        `Latitude: ${location.lat.toFixed(6)}\nLongitude: ${location.lng.toFixed(6)}\nAccuracy: ±${Math.round(location.accuracy)}m`
      );
    } catch (error) {
      console.error('❌ Error getting current location:', error);
      setError(error.message);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateIntervalChange = (interval) => {
    GPSTrackingService.setUpdateInterval(interval);
    updateStatus();
  };

  const formatCoordinate = (coord) => {
    return coord ? coord.toFixed(6) : 'N/A';
  };

  const formatSessionDuration = () => {
    if (!stats.sessionStartTime) return 'Not active';
    const duration = Date.now() - new Date(stats.sessionStartTime).getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const getStatusColor = () => {
    if (trackingStatus.isTracking) return '#4CAF50'; // Green
    return '#FF9800'; // Orange
  };

  const getStatusText = () => {
    if (trackingStatus.isTracking) return '🟢 Active';
    return '🟡 Inactive';
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <Surface style={styles.header}>
        <Title style={styles.headerTitle}>📍 GPS Tracking</Title>
        <Chip 
          style={[styles.statusChip, { backgroundColor: getStatusColor() }]}
          textStyle={styles.statusChipText}
        >
          {getStatusText()}
        </Chip>
      </Surface>

      {/* Driver Info */}
      {driverInfo && (
        <Card style={styles.card}>
          <Card.Content>
            <Title>👤 Driver Information</Title>
            <Paragraph>Name: {driverInfo.name}</Paragraph>
            <Paragraph>ID: {driverInfo.id}</Paragraph>
            <Paragraph>Status: {driverInfo.status}</Paragraph>
          </Card.Content>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card style={[styles.card, styles.errorCard]}>
          <Card.Content>
            <Text style={styles.errorText}>⚠️ {error}</Text>
            <Button 
              mode="text" 
              onPress={() => setError(null)}
              style={styles.dismissButton}
            >
              Dismiss
            </Button>
          </Card.Content>
        </Card>
      )}

      {/* Control Panel */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>🎛️ Controls</Title>
          
          <View style={styles.buttonContainer}>
            {!trackingStatus.isTracking ? (
              <Button
                mode="contained"
                onPress={handleStartTracking}
                disabled={loading || !trackingStatus.hasAuthToken}
                loading={loading}
                style={[styles.button, styles.startButton]}
                contentStyle={styles.buttonContent}
              >
                🚀 Start Tracking
              </Button>
            ) : (
              <Button
                mode="contained"
                onPress={handleStopTracking}
                disabled={loading}
                loading={loading}
                style={[styles.button, styles.stopButton]}
                contentStyle={styles.buttonContent}
              >
                🛑 Stop Tracking
              </Button>
            )}

            <Button
              mode="outlined"
              onPress={handleGetCurrentLocation}
              disabled={loading}
              loading={loading}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              🎯 Get Location
            </Button>
          </View>

          {/* Update Interval Control */}
          <View style={styles.intervalControl}>
            <Text style={styles.intervalLabel}>Update Frequency:</Text>
            <View style={styles.intervalButtons}>
              {[
                { label: '10s', value: 10000 },
                { label: '30s', value: 30000 },
                { label: '1m', value: 60000 },
                { label: '5m', value: 300000 }
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.intervalButton,
                    trackingStatus.updateInterval === option.value && styles.intervalButtonActive
                  ]}
                  onPress={() => handleUpdateIntervalChange(option.value)}
                  disabled={loading}
                >
                  <Text style={[
                    styles.intervalButtonText,
                    trackingStatus.updateInterval === option.value && styles.intervalButtonTextActive
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Current Location */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>📍 Current Location</Title>
          {trackingStatus.currentLocation ? (
            <View style={styles.locationInfo}>
              <Text style={styles.locationText}>
                Lat: {formatCoordinate(trackingStatus.currentLocation.lat)}
              </Text>
              <Text style={styles.locationText}>
                Lng: {formatCoordinate(trackingStatus.currentLocation.lng)}
              </Text>
              <Text style={styles.locationDetail}>
                Accuracy: ±{Math.round(trackingStatus.currentLocation.accuracy)}m
              </Text>
              {trackingStatus.currentLocation.speed > 0 && (
                <Text style={styles.locationDetail}>
                  Speed: {Math.round(trackingStatus.currentLocation.speed * 3.6)} km/h
                </Text>
              )}
              <Text style={styles.locationDetail}>
                Updated: {new Date(trackingStatus.currentLocation.timestamp).toLocaleTimeString()}
              </Text>
            </View>
          ) : (
            <Paragraph>No location data available</Paragraph>
          )}
        </Card.Content>
      </Card>

      {/* Session Statistics */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>📊 Session Statistics</Title>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.locationsTracked}</Text>
              <Text style={styles.statLabel}>Locations Tracked</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.locationsSent}</Text>
              <Text style={styles.statLabel}>Sent Successfully</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.locationsFailed}</Text>
              <Text style={styles.statLabel}>Failed</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatSessionDuration()}</Text>
              <Text style={styles.statLabel}>Session Duration</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Processing...</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statusChip: {
    paddingHorizontal: 12,
  },
  statusChipText: {
    color: 'white',
    fontWeight: 'bold',
  },
  card: {
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
  },
  errorCard: {
    borderColor: '#f44336',
    borderWidth: 1,
  },
  errorText: {
    color: '#f44336',
    fontSize: 16,
  },
  dismissButton: {
    alignSelf: 'flex-end',
  },
  buttonContainer: {
    marginTop: 16,
  },
  button: {
    marginVertical: 8,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#f44336',
  },
  intervalControl: {
    marginTop: 24,
  },
  intervalLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  intervalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  intervalButton: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    padding: 12,
    borderRadius: 6,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  intervalButtonActive: {
    backgroundColor: '#2196F3',
  },
  intervalButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  intervalButtonTextActive: {
    color: 'white',
  },
  locationInfo: {
    marginTop: 8,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  locationDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statItem: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    marginTop: 8,
    fontSize: 16,
  },
});

export default GPSTracker; 