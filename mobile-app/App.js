import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { Alert } from 'react-native';
import Toast from 'react-native-toast-message';

// Import screens
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import GPSTrackerScreen from './screens/GPSTrackerScreen';
import ProfileScreen from './screens/ProfileScreen';
import SettingsScreen from './screens/SettingsScreen';

// Import services
import AuthService from './services/AuthService';
import GPSTrackingService from './services/GPSTrackingService';

// Import theme
import { theme } from './theme';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Main tab navigator for authenticated users
function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
        },
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: 'white',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>🏠</Text>
          ),
          title: 'Dashboard',
        }}
      />
      <Tab.Screen
        name="GPS"
        component={GPSTrackerScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>📍</Text>
          ),
          title: 'GPS Tracking',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>👤</Text>
          ),
          title: 'Profile',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>⚙️</Text>
          ),
          title: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
}

// Main App component
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [driverInfo, setDriverInfo] = useState(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('🚀 Initializing Trucking Driver App...');

      // Wait for AuthService to initialize
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if user is already logged in
      const isLoggedIn = AuthService.isLoggedIn();
      const driver = AuthService.getDriverInfo();

      if (isLoggedIn && driver) {
        console.log('✅ User already logged in:', driver.name);
        setIsAuthenticated(true);
        setDriverInfo(driver);

        // Validate token
        const isValid = await AuthService.checkTokenValidity();
        if (!isValid) {
          console.warn('⚠️ Token is invalid, logging out');
          await handleLogout();
        } else {
          // Initialize GPS tracking service with auth token
          const token = AuthService.getAuthToken();
          GPSTrackingService.setAuthToken(token);
          GPSTrackingService.setServerUrl(AuthService.getServerUrl());
        }
      } else {
        console.log('ℹ️ User not logged in');
        setIsAuthenticated(false);
      }

      // Set up auth event listeners
      setupAuthListeners();

    } catch (error) {
      console.error('❌ App initialization failed:', error);
      Alert.alert('Error', 'Failed to initialize app. Please restart.');
    } finally {
      setIsLoading(false);
    }
  };

  const setupAuthListeners = () => {
    // Listen for login success
    AuthService.addEventListener('loginSuccess', ({ driver, token }) => {
      console.log('✅ Login successful, updating app state');
      setIsAuthenticated(true);
      setDriverInfo(driver);

      // Initialize GPS tracking service
      GPSTrackingService.setAuthToken(token);
      GPSTrackingService.setServerUrl(AuthService.getServerUrl());

      Toast.show({
        type: 'success',
        text1: 'Welcome!',
        text2: `Hello ${driver.name}`,
        visibilityTime: 3000,
      });
    });

    // Listen for logout
    AuthService.addEventListener('logoutSuccess', () => {
      console.log('ℹ️ Logout successful, updating app state');
      handleLogout();
    });

    // Listen for login failures
    AuthService.addEventListener('loginFailed', ({ error }) => {
      console.error('❌ Login failed:', error);
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: error,
        visibilityTime: 4000,
      });
    });

    // Listen for token refresh
    AuthService.addEventListener('tokenRefreshed', ({ token }) => {
      console.log('🔄 Token refreshed, updating GPS service');
      GPSTrackingService.setAuthToken(token);
    });
  };

  const handleLogout = async () => {
    try {
      // Stop GPS tracking
      if (GPSTrackingService.getStatus().isTracking) {
        await GPSTrackingService.stopTracking();
      }

      // Clear GPS service auth
      GPSTrackingService.setAuthToken(null);

      // Update app state
      setIsAuthenticated(false);
      setDriverInfo(null);

      Toast.show({
        type: 'info',
        text1: 'Logged Out',
        text2: 'You have been logged out successfully',
        visibilityTime: 3000,
      });

    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  };

  if (isLoading) {
    return (
      <PaperProvider theme={theme}>
        <StatusBar style="light" backgroundColor={theme.colors.primary} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 18, marginBottom: 20 }}>🚚 Trucking Driver</Text>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 10, color: 'gray' }}>Loading...</Text>
        </View>
      </PaperProvider>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <NavigationContainer>
        <StatusBar style="light" backgroundColor={theme.colors.primary} />
        
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          {isAuthenticated ? (
            // Authenticated user screens
            <Stack.Screen name="Main" component={MainTabNavigator} />
          ) : (
            // Unauthenticated user screens
            <Stack.Screen 
              name="Login" 
              component={LoginScreen}
              options={{
                headerShown: true,
                title: '🚚 Trucking Driver Login',
                headerStyle: {
                  backgroundColor: theme.colors.primary,
                },
                headerTintColor: 'white',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />
          )}
        </Stack.Navigator>
        
        <Toast />
      </NavigationContainer>
    </PaperProvider>
  );
} 