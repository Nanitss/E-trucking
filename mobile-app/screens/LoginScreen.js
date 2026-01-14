import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import {
  TextInput,
  Button,
  Card,
  Title,
  Paragraph,
  HelperText,
  Surface,
} from 'react-native-paper';

import AuthService from '../services/AuthService';

const LoginScreen = () => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleInputChange = (field, value) => {
    setCredentials(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null,
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!credentials.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!credentials.password) {
      newErrors.password = 'Password is required';
    } else if (credentials.password.length < 3) {
      newErrors.password = 'Password must be at least 3 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      await AuthService.login(
        credentials.username,
        credentials.password
      );
      
      // Success is handled by the AuthService event listeners in App.js
      
    } catch (error) {
      console.error('Login error:', error);
      // Error is handled by the AuthService event listeners in App.js
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setCredentials({
      username: 'demo_driver',
      password: 'demo123',
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Surface style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>🚚</Text>
            <Title style={styles.appTitle}>Trucking Driver</Title>
            <Paragraph style={styles.subtitle}>GPS Tracking & Delivery Management</Paragraph>
          </View>
        </Surface>

        {/* Login Form */}
        <Card style={styles.loginCard}>
          <Card.Content>
            <Title style={styles.loginTitle}>Welcome Back!</Title>
            <Paragraph style={styles.loginSubtitle}>
              Sign in to start tracking your deliveries
            </Paragraph>

            <View style={styles.form}>
              {/* Username Input */}
              <TextInput
                label="Username"
                value={credentials.username}
                onChangeText={(value) => handleInputChange('username', value)}
                mode="outlined"
                style={styles.input}
                error={!!errors.username}
                disabled={loading}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="username"
                left={<TextInput.Icon icon="account" />}
              />
              <HelperText type="error" visible={!!errors.username}>
                {errors.username}
              </HelperText>

              {/* Password Input */}
              <TextInput
                label="Password"
                value={credentials.password}
                onChangeText={(value) => handleInputChange('password', value)}
                mode="outlined"
                secureTextEntry
                style={styles.input}
                error={!!errors.password}
                disabled={loading}
                textContentType="password"
                left={<TextInput.Icon icon="lock" />}
              />
              <HelperText type="error" visible={!!errors.password}>
                {errors.password}
              </HelperText>

              {/* Login Button */}
              <Button
                mode="contained"
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
                style={styles.loginButton}
                contentStyle={styles.loginButtonContent}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>

              {/* Demo Login Button */}
              <Button
                mode="text"
                onPress={handleDemoLogin}
                disabled={loading}
                style={styles.demoButton}
              >
                Use Demo Credentials
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Features Info */}
        <Card style={styles.featuresCard}>
          <Card.Content>
            <Title style={styles.featuresTitle}>App Features</Title>
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>📍</Text>
                <Text style={styles.featureText}>Real-time GPS tracking</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>🚚</Text>
                <Text style={styles.featureText}>Delivery management</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>📱</Text>
                <Text style={styles.featureText}>Push notifications</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>💰</Text>
                <Text style={styles.featureText}>Earnings tracking</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Footer */}
        <View style={styles.footer}>
          <Paragraph style={styles.footerText}>
            Version 1.0.0 • Trucking Management System
          </Paragraph>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    padding: 20,
    marginBottom: 20,
    borderRadius: 12,
    elevation: 2,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoText: {
    fontSize: 48,
    marginBottom: 10,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  loginCard: {
    marginBottom: 20,
    borderRadius: 12,
    elevation: 4,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
    color: '#333',
  },
  loginSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
  },
  form: {
    marginTop: 10,
  },
  input: {
    marginBottom: 5,
  },
  loginButton: {
    marginTop: 20,
    borderRadius: 8,
  },
  loginButtonContent: {
    paddingVertical: 8,
  },
  demoButton: {
    marginTop: 10,
  },
  featuresCard: {
    marginBottom: 20,
    borderRadius: 12,
    elevation: 2,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  featureIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  featureText: {
    fontSize: 16,
    color: '#555',
    flex: 1,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});

export default LoginScreen; 