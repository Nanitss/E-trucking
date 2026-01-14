import React from 'react';
import { View, StyleSheet } from 'react-native';
import GPSTracker from '../components/GPSTracker';
import AuthService from '../services/AuthService';

const GPSTrackerScreen = () => {
  const authToken = AuthService.getAuthToken();
  const driverInfo = AuthService.getDriverInfo();

  return (
    <View style={styles.container}>
      <GPSTracker 
        authToken={authToken}
        driverInfo={driverInfo}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});

export default GPSTrackerScreen; 