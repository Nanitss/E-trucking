import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Surface,
  Chip,
  FAB,
  Divider,
} from 'react-native-paper';
import AuthService from '../services/AuthService';
import GPSTrackingService from '../services/GPSTrackingService';

const DashboardScreen = ({ navigation }) => {
  const [driverInfo, setDriverInfo] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    activeDeliveries: 0,
    completedToday: 0,
    totalEarnings: 0,
    gpsStatus: 'inactive',
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeDashboard();
  }, []);

  const initializeDashboard = async () => {
    try {
      const driver = AuthService.getDriverInfo();
      setDriverInfo(driver);
      
      await loadDashboardData();
      
      // Update GPS status
      updateGPSStatus();
      
    } catch (error) {
      console.error('Error initializing dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      // Mock data - replace with actual API calls
      setDashboardData({
        activeDeliveries: 2,
        completedToday: 5,
        totalEarnings: 1250.50,
        gpsStatus: GPSTrackingService.getStatus().isTracking ? 'active' : 'inactive',
      });
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const updateGPSStatus = () => {
    const status = GPSTrackingService.getStatus();
    setDashboardData(prev => ({
      ...prev,
      gpsStatus: status.isTracking ? 'active' : 'inactive',
    }));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    updateGPSStatus();
    setRefreshing(false);
  };

  const handleQuickGPSToggle = async () => {
    try {
      const status = GPSTrackingService.getStatus();
      
      if (status.isTracking) {
        const result = await GPSTrackingService.stopTracking();
        if (result.success) {
          Alert.alert('Success', 'GPS tracking stopped');
        }
      } else {
        const result = await GPSTrackingService.startTracking();
        if (result.success) {
          Alert.alert('Success', 'GPS tracking started');
        }
      }
      
      updateGPSStatus();
      
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AuthService.logout();
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  const getGPSStatusColor = () => {
    return dashboardData.gpsStatus === 'active' ? '#4CAF50' : '#FF9800';
  };

  const getGPSStatusText = () => {
    return dashboardData.gpsStatus === 'active' ? '🟢 Active' : '🟡 Inactive';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Welcome Header */}
        <Surface style={styles.welcomeCard}>
          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeEmoji}>👋</Text>
            <View style={styles.welcomeText}>
              <Title style={styles.welcomeTitle}>
                Welcome back, {driverInfo?.name || 'Driver'}!
              </Title>
              <Paragraph style={styles.welcomeSubtitle}>
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Paragraph>
            </View>
          </View>
        </Surface>

        {/* GPS Status Card */}
        <Card style={styles.statusCard}>
          <Card.Content>
            <View style={styles.statusHeader}>
              <Title style={styles.statusTitle}>📍 GPS Status</Title>
              <Chip 
                style={[styles.statusChip, { backgroundColor: getGPSStatusColor() }]}
                textStyle={styles.statusChipText}
              >
                {getGPSStatusText()}
              </Chip>
            </View>
            <Paragraph style={styles.statusDescription}>
              {dashboardData.gpsStatus === 'active' 
                ? 'Your location is being tracked for deliveries'
                : 'GPS tracking is currently disabled'
              }
            </Paragraph>
            <Button
              mode="contained"
              onPress={handleQuickGPSToggle}
              style={[styles.gpsButton, { 
                backgroundColor: dashboardData.gpsStatus === 'active' ? '#f44336' : '#4CAF50' 
              }]}
            >
              {dashboardData.gpsStatus === 'active' ? '🛑 Stop Tracking' : '🚀 Start Tracking'}
            </Button>
          </Card.Content>
        </Card>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <Text style={styles.statIcon}>🚚</Text>
              <Text style={styles.statValue}>{dashboardData.activeDeliveries}</Text>
              <Text style={styles.statLabel}>Active Deliveries</Text>
            </Card.Content>
          </Card>

          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <Text style={styles.statIcon}>✅</Text>
              <Text style={styles.statValue}>{dashboardData.completedToday}</Text>
              <Text style={styles.statLabel}>Completed Today</Text>
            </Card.Content>
          </Card>

          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <Text style={styles.statIcon}>💰</Text>
              <Text style={styles.statValue}>₱{dashboardData.totalEarnings.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Total Earnings</Text>
            </Card.Content>
          </Card>

          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <Text style={styles.statIcon}>⭐</Text>
              <Text style={styles.statValue}>4.8</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </Card.Content>
          </Card>
        </View>

        {/* Quick Actions */}
        <Card style={styles.actionsCard}>
          <Card.Content>
            <Title style={styles.actionsTitle}>⚡ Quick Actions</Title>
            <View style={styles.actionButtons}>
              <Button
                mode="outlined"
                onPress={() => navigation.navigate('GPS')}
                style={styles.actionButton}
                icon="map-marker"
              >
                GPS Tracking
              </Button>
              <Button
                mode="outlined"
                onPress={() => navigation.navigate('Profile')}
                style={styles.actionButton}
                icon="account"
              >
                View Profile
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Recent Activity */}
        <Card style={styles.activityCard}>
          <Card.Content>
            <Title style={styles.activityTitle}>📋 Recent Activity</Title>
            <View style={styles.activityList}>
              <View style={styles.activityItem}>
                <Text style={styles.activityIcon}>🚚</Text>
                <View style={styles.activityContent}>
                  <Text style={styles.activityText}>Delivery completed to Makati</Text>
                  <Text style={styles.activityTime}>2 hours ago</Text>
                </View>
              </View>
              <Divider style={styles.activityDivider} />
              <View style={styles.activityItem}>
                <Text style={styles.activityIcon}>📍</Text>
                <View style={styles.activityContent}>
                  <Text style={styles.activityText}>GPS tracking started</Text>
                  <Text style={styles.activityTime}>4 hours ago</Text>
                </View>
              </View>
              <Divider style={styles.activityDivider} />
              <View style={styles.activityItem}>
                <Text style={styles.activityIcon}>💰</Text>
                <View style={styles.activityContent}>
                  <Text style={styles.activityText}>Payment received: ₱250.00</Text>
                  <Text style={styles.activityTime}>5 hours ago</Text>
                </View>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Logout Button */}
        <Card style={styles.logoutCard}>
          <Card.Content>
            <Button
              mode="text"
              onPress={handleLogout}
              style={styles.logoutButton}
              textColor="#f44336"
            >
              🚪 Logout
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        style={styles.fab}
        icon="refresh"
        onPress={handleRefresh}
        label="Refresh"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  welcomeCard: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  welcomeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  welcomeEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  welcomeText: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  statusCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusChip: {
    paddingHorizontal: 12,
  },
  statusChipText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  statusDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  gpsButton: {
    borderRadius: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    marginBottom: 8,
    borderRadius: 12,
    elevation: 2,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  actionsCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  actionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  activityCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  activityList: {
    gap: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  activityIcon: {
    fontSize: 18,
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#666',
  },
  activityDivider: {
    marginVertical: 4,
  },
  logoutCard: {
    marginBottom: 80,
    borderRadius: 12,
    elevation: 1,
  },
  logoutButton: {
    alignSelf: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
  },
});

export default DashboardScreen; 