# Mobile Driver App - Backend Preparation Guide

## 🎯 **Overview**
This guide outlines all the backend preparations needed before developing a mobile driver application for real-time delivery management and notifications.

## 📊 **1. Database Schema Enhancements**

### **New Collections to Add:**

#### **A. Driver Sessions Collection**
```javascript
// drivers_sessions
{
  "driverId": "driver123",
  "sessionToken": "jwt_token_here",
  "deviceToken": "fcm_device_token", // For push notifications
  "isActive": true,
  "location": {
    "lat": 14.5995,
    "lng": 120.9842,
    "timestamp": "2023-12-01T10:00:00Z",
    "accuracy": 10
  },
  "status": "available", // available, busy, offline
  "lastActivity": "2023-12-01T10:00:00Z",
  "deviceInfo": {
    "platform": "android", // android, ios
    "version": "1.0.0",
    "deviceId": "device123"
  }
}
```

#### **B. Driver Notifications Collection**
```javascript
// driver_notifications
{
  "driverId": "driver123",
  "type": "new_delivery", // new_delivery, delivery_updated, system_message
  "title": "New Delivery Assignment",
  "body": "You have been assigned a new delivery",
  "data": {
    "deliveryId": "delivery456",
    "clientName": "Acme Corp",
    "pickupLocation": "Manila",
    "dropoffLocation": "Quezon City"
  },
  "isRead": false,
  "sentAt": "2023-12-01T10:00:00Z",
  "readAt": null
}
```

#### **C. Driver Assignments Collection**
```javascript
// driver_assignments
{
  "assignmentId": "assign123",
  "driverId": "driver123",
  "deliveryId": "delivery456",
  "status": "assigned", // assigned, accepted, rejected, in_progress, completed
  "assignedAt": "2023-12-01T10:00:00Z",
  "acceptedAt": null,
  "startedAt": null,
  "completedAt": null,
  "estimatedDuration": 120, // minutes
  "actualDuration": null,
  "notes": ""
}
```

### **Enhanced Deliveries Schema:**
```javascript
// Add these fields to existing deliveries collection
{
  // ... existing fields ...
  "assignedDriverId": "driver123",
  "assignedDriverName": "John Doe",
  "driverAssignedAt": "2023-12-01T10:00:00Z",
  "driverAcceptedAt": null,
  "deliveryStartedAt": null,
  "actualRoute": [
    {
      "lat": 14.5995,
      "lng": 120.9842,
      "timestamp": "2023-12-01T10:00:00Z",
      "speed": 45
    }
  ],
  "deliveryProof": {
    "photoUrl": "https://...",
    "signature": "base64_signature",
    "timestamp": "2023-12-01T12:00:00Z",
    "notes": "Delivered to security guard"
  }
}
```

## 🔧 **2. API Endpoints for Mobile App**

### **Driver Authentication**
```javascript
// POST /api/mobile/auth/login
// POST /api/mobile/auth/refresh
// POST /api/mobile/auth/logout
// POST /api/mobile/auth/register-device // For FCM token
```

### **Driver Profile & Status**
```javascript
// GET /api/mobile/driver/profile
// PUT /api/mobile/driver/profile
// POST /api/mobile/driver/location // Update current location
// PUT /api/mobile/driver/status // available, busy, offline
```

### **Delivery Management**
```javascript
// GET /api/mobile/deliveries/assigned // Get assigned deliveries
// POST /api/mobile/deliveries/:id/accept
// POST /api/mobile/deliveries/:id/reject
// POST /api/mobile/deliveries/:id/start
// POST /api/mobile/deliveries/:id/complete
// POST /api/mobile/deliveries/:id/location // Track delivery progress
// POST /api/mobile/deliveries/:id/proof // Upload delivery proof
```

### **Notifications**
```javascript
// GET /api/mobile/notifications
// PUT /api/mobile/notifications/:id/read
// DELETE /api/mobile/notifications/:id
```

## 🚀 **3. Real-time Features Implementation**

### **A. Push Notifications Setup**
- Set up Firebase Cloud Messaging (FCM)
- Configure notification service for delivery assignments
- Implement notification scheduling and queuing

### **B. WebSocket for Real-time Updates**
- Driver location tracking
- Delivery status updates
- Live assignment notifications

### **C. Driver Selection Algorithm**
```javascript
// Function to select random available driver
async function assignRandomDriver(deliveryData) {
  const availableDrivers = await getAvailableDrivers(deliveryData.pickupCoordinates);
  
  if (availableDrivers.length === 0) {
    throw new Error('No available drivers');
  }
  
  // Random selection with proximity weighting
  const randomIndex = Math.floor(Math.random() * availableDrivers.length);
  const selectedDriver = availableDrivers[randomIndex];
  
  return selectedDriver;
}
```

## ⚡ **4. Background Services Needed**

### **A. Notification Service**
```javascript
class NotificationService {
  async sendDeliveryAssignment(driverId, deliveryData) {
    // Send FCM notification
    // Save to notifications collection
    // Track delivery time
  }
  
  async sendDeliveryUpdate(driverId, update) {
    // Notify driver of delivery changes
  }
}
```

### **B. Driver Assignment Service**
```javascript
class DriverAssignmentService {
  async assignDeliveryToDriver(deliveryId) {
    // Find available drivers
    // Select random driver
    // Create assignment record
    // Send notification
    // Set timeout for acceptance
  }
  
  async reassignIfNotAccepted(assignmentId) {
    // Check if driver accepted within time limit
    // If not, reassign to another driver
  }
}
```

### **C. Location Tracking Service**
```javascript
class LocationService {
  async updateDriverLocation(driverId, location) {
    // Update driver session with current location
    // Track delivery route if on delivery
    // Calculate ETA updates
  }
}
```

## 🔐 **5. Security Enhancements**

### **Mobile-Specific Security**
- JWT token refresh mechanism
- Device-specific tokens
- Location verification
- Delivery proof validation
- Secure file upload for delivery photos

### **API Rate Limiting**
- Location updates: 1/second max
- Notifications: 10/minute max
- Authentication: 5/minute max

## 📱 **6. Mobile Technology Stack Recommendations**

### **Option A: React Native (Recommended)**
```bash
# Advantages:
- Code reuse between iOS and Android
- Your team already knows React
- Rich ecosystem and community
- Great for rapid development
```

### **Option B: Flutter**
```bash
# Advantages:
- Excellent performance
- Single codebase
- Good for complex UI animations
```

### **Option C: Native Development**
```bash
# Advantages:
- Best performance
- Platform-specific features
- Better for complex requirements
```

## 🧪 **7. Testing Strategy**

### **Backend Testing**
```javascript
// Test driver assignment algorithm
// Test notification delivery
// Test real-time location updates
// Test failover scenarios
```

### **Integration Testing**
```javascript
// Test web app booking → driver notification flow
// Test driver acceptance → client notification
// Test location tracking → ETA updates
```

## 📋 **8. Implementation Order**

### **Phase 1: Core Backend (Week 1-2)**
1. ✅ Enhanced database schema
2. ✅ Driver assignment algorithm
3. ✅ Basic mobile API endpoints
4. ✅ Authentication system

### **Phase 2: Real-time Features (Week 3-4)**
1. ✅ Push notification setup
2. ✅ WebSocket implementation
3. ✅ Location tracking
4. ✅ Driver assignment automation

### **Phase 3: Mobile App Development (Week 5-8)**
1. ✅ Driver login/logout
2. ✅ Delivery assignment interface
3. ✅ GPS tracking and navigation
4. ✅ Delivery proof capture

### **Phase 4: Testing & Deployment (Week 9-10)**
1. ✅ End-to-end testing
2. ✅ Performance optimization
3. ✅ App store deployment
4. ✅ User training

## 🔄 **9. Data Flow Architecture**

```
Client Books Truck (Web App)
    ↓
System Creates Delivery Record
    ↓
Driver Assignment Algorithm Runs
    ↓
Random Available Driver Selected
    ↓
FCM Notification Sent to Driver's Mobile
    ↓
Driver Accepts/Rejects via Mobile App
    ↓
If Accepted: Delivery Starts
If Rejected: Reassign to Another Driver
    ↓
Real-time Location Tracking
    ↓
Delivery Completion with Proof
    ↓
Client Notification & Invoice Generation
```

## 🛠️ **10. Required NPM Packages**

### **Backend Dependencies**
```json
{
  "firebase-admin": "^11.5.0",
  "socket.io": "^4.7.4",
  "node-cron": "^3.0.2",
  "fcm-notification": "^1.1.0",
  "geolib": "^3.3.3",
  "multer": "^1.4.5"
}
```

### **Mobile App Dependencies (React Native)**
```json
{
  "@react-native-firebase/app": "^18.6.2",
  "@react-native-firebase/messaging": "^18.6.2",
  "react-native-maps": "^1.8.0",
  "react-native-geolocation-service": "^5.3.1",
  "react-native-image-picker": "^7.0.3",
  "react-native-signature-canvas": "^4.7.2",
  "@react-navigation/native": "^6.1.9"
}
```

## 📈 **11. Performance Considerations**

### **Database Optimization**
- Index on driver location for proximity queries
- Index on delivery status for quick filtering
- Archive completed deliveries older than 6 months

### **Real-time Optimization**
- Batch location updates every 10 seconds
- Use Redis for driver session caching
- Implement connection pooling for WebSocket

### **Notification Optimization**
- Queue notifications during peak hours
- Implement retry mechanism for failed notifications
- Track notification delivery success rates

## 🎯 **Next Steps**

1. **Start with Phase 1**: Implement the enhanced database schema
2. **Set up FCM**: Configure Firebase Cloud Messaging
3. **Create mobile API endpoints**: Build the driver-specific endpoints
4. **Test the flow**: Ensure web booking → driver notification works
5. **Begin mobile development**: Choose your technology stack and start coding

This comprehensive preparation will ensure your mobile driver app has a solid foundation and integrates seamlessly with your existing trucking web application. 