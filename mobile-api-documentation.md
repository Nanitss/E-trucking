# 📱 Mobile Driver App API Documentation

## 🏗️ **Base Configuration**

### Server Details
- **Base URL**: `http://your-server-domain.com/api/mobile`
- **Local Development**: `http://localhost:5007/api/mobile`
- **Authentication**: JWT Bearer Token
- **Content-Type**: `application/json`

### Headers Required
```javascript
{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_JWT_TOKEN" // For authenticated endpoints
}
```

---

## 🔐 **Authentication Endpoints**

### 1. Driver Login
**POST** `/auth/login`

**Request Body:**
```json
{
  "username": "driver123",
  "password": "password123",
  "deviceToken": "fcm_device_token_here", // Optional, for push notifications
  "deviceInfo": { // Optional
    "platform": "android", // or "ios"
    "version": "1.0.0",
    "deviceId": "unique_device_id"
  }
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "driver": {
    "id": "driver_id",
    "name": "John Doe",
    "username": "driver123",
    "phone": "+1234567890",
    "status": "active"
  },
  "message": "Login successful"
}
```

### 2. Refresh Token
**POST** `/auth/refresh`
- Headers: `Authorization: Bearer OLD_TOKEN`

**Response:**
```json
{
  "success": true,
  "token": "new_jwt_token",
  "message": "Token refreshed successfully"
}
```

### 3. Logout
**POST** `/auth/logout`
- Headers: `Authorization: Bearer TOKEN`

### 4. Register Device for Notifications
**POST** `/auth/register-device`

**Request Body:**
```json
{
  "deviceToken": "fcm_device_token",
  "deviceInfo": {
    "platform": "android",
    "version": "1.0.0"
  }
}
```

---

## 👤 **Driver Profile Endpoints**

### 1. Get Driver Profile
**GET** `/driver/profile`

**Response:**
```json
{
  "success": true,
  "driver": {
    "id": "driver_id",
    "name": "John Doe",
    "username": "driver123",
    "phone": "+1234567890",
    "address": "Driver Address",
    "employmentDate": "2023-01-01",
    "status": "active"
  }
}
```

### 2. Update Driver Profile
**PUT** `/driver/profile`

**Request Body:**
```json
{
  "name": "Updated Name",
  "phone": "+1234567890",
  "address": "New Address"
}
```

### 3. Update Driver Location
**POST** `/driver/location`

**Request Body:**
```json
{
  "lat": 14.5995,
  "lng": 120.9842,
  "accuracy": 5.0,
  "speed": 25.5
}
```

### 4. Update Driver Status
**PUT** `/driver/status`

**Request Body:**
```json
{
  "status": "available" // available, busy, offline
}
```

---

## 🚚 **Delivery Management Endpoints**

### 1. Get Assigned Deliveries
**GET** `/deliveries/assigned`

**Response:**
```json
{
  "success": true,
  "deliveries": [
    {
      "assignmentId": "assignment_id",
      "assignment": {
        "assignmentId": "assign_123",
        "driverId": "driver_id",
        "deliveryId": "delivery_id",
        "status": "assigned",
        "assignedAt": "2024-01-01T10:00:00Z"
      },
      "delivery": {
        "id": "delivery_id",
        "DeliveryID": "DEL123",
        "PickupLocation": "123 Pickup St",
        "DropoffLocation": "456 Dropoff Ave",
        "PickupCoordinates": {"lat": 14.5995, "lng": 120.9842},
        "DropoffCoordinates": {"lat": 14.6091, "lng": 121.0223},
        "DeliveryDistance": 15,
        "EstimatedDuration": 45,
        "CargoWeight": 500,
        "DeliveryRate": 1500,
        "DeliveryStatus": "assigned"
      }
    }
  ],
  "count": 1
}
```

### 2. Accept Delivery Assignment
**POST** `/deliveries/:assignmentId/accept`

### 3. Start Delivery
**POST** `/deliveries/:assignmentId/start`

### 4. Complete Delivery
**POST** `/deliveries/:assignmentId/complete`

**Request Body:**
```json
{
  "completionNotes": "Delivery completed successfully",
  "deliveryProof": "base64_image_data", // Optional
  "recipientName": "John Client",
  "deliveryLocation": {
    "lat": 14.6091,
    "lng": 121.0223
  }
}
```

### 5. Update Delivery Location (During Transit)
**POST** `/deliveries/:deliveryId/location`

**Request Body:**
```json
{
  "lat": 14.6000,
  "lng": 120.9900,
  "speed": 25.5
}
```

---

## 🗺️ **Enhanced Route & Data Endpoints**

### 1. Get Detailed Route Information
**GET** `/deliveries/:deliveryId/route`

**Response:**
```json
{
  "success": true,
  "deliveryId": "delivery_id",
  "routeInfo": {
    "pickupLocation": "123 Pickup Street",
    "dropoffLocation": "456 Dropoff Avenue",
    "pickupCoordinates": {"lat": 14.5995, "lng": 120.9842},
    "dropoffCoordinates": {"lat": 14.6091, "lng": 121.0223},
    "distance": 15,
    "estimatedDuration": 45,
    "routePolyline": "encoded_polyline_string",
    "waypoints": [],
    "trafficInfo": null
  },
  "clientInfo": {
    "name": "Client Name",
    "phone": "+1234567890",
    "notes": "Special delivery instructions"
  },
  "cargoInfo": {
    "weight": 500,
    "type": "General Cargo",
    "specialInstructions": "Handle with care"
  }
}
```

### 2. Get Driver Delivery History
**GET** `/driver/delivery-history?limit=50&status=completed`

**Query Parameters:**
- `limit`: Number of records (default: 50)
- `status`: Filter by status (optional)

**Response:**
```json
{
  "success": true,
  "deliveries": [
    {
      "id": "delivery_doc_id",
      "deliveryId": "DEL123",
      "date": "2024-01-01T10:00:00Z",
      "status": "completed",
      "pickupLocation": "Pickup Address",
      "dropoffLocation": "Dropoff Address",
      "distance": 15,
      "rate": 1500,
      "clientName": "Client Name",
      "completedAt": "2024-01-01T11:30:00Z",
      "duration": 90
    }
  ],
  "count": 25,
  "hasMore": false
}
```

### 3. Get Driver Earnings
**GET** `/driver/earnings?period=month`

**Query Parameters:**
- `period`: day, week, month, year
- `startDate`: Custom start date (YYYY-MM-DD)
- `endDate`: Custom end date (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "period": "month",
  "dateRange": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-31T23:59:59Z"
  },
  "earnings": {
    "total": 45000,
    "deliveries": 30,
    "distance": 450,
    "averagePerDelivery": 1500,
    "averagePerKm": 100
  }
}
```

### 4. Upload Delivery Photos
**POST** `/deliveries/:deliveryId/photos`

**Content-Type:** `multipart/form-data`

**Form Data:**
- `photos`: Array of image files (max 5)
- `photoType`: pickup, delivery, proof, damage

**Response:**
```json
{
  "success": true,
  "message": "Photos uploaded successfully",
  "photos": [
    {
      "filename": "proof-123456.jpg",
      "originalName": "delivery_proof.jpg",
      "path": "/uploads/delivery-proof/proof-123456.jpg",
      "size": 2048576,
      "uploadedAt": "2024-01-01T12:00:00Z",
      "type": "proof"
    }
  ],
  "count": 1
}
```

### 5. Add Delivery Signature
**PUT** `/deliveries/:deliveryId/signature`

**Request Body:**
```json
{
  "signature": "base64_encoded_signature_image",
  "recipientName": "John Client",
  "recipientId": "client_id_or_null"
}
```

---

## 🔔 **Notification Endpoints**

### 1. Get Driver Notifications
**GET** `/notifications?limit=20`

**Response:**
```json
{
  "success": true,
  "notifications": [
    {
      "id": "notification_id",
      "driverId": "driver_id",
      "type": "new_delivery",
      "title": "New Delivery Assignment",
      "body": "New delivery from Location A to Location B",
      "data": {
        "deliveryId": "delivery_id",
        "assignmentId": "assignment_id",
        "clientName": "Client Name"
      },
      "isRead": false,
      "sentAt": "2024-01-01T10:00:00Z"
    }
  ],
  "count": 5
}
```

### 2. Mark Notification as Read
**PUT** `/notifications/:notificationId/read`

---

## 📊 **Utility Endpoints**

### 1. Get Driver Statistics
**GET** `/stats`

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalDeliveries": 150,
    "completedDeliveries": 145,
    "pendingDeliveries": 2,
    "averageRating": 4.8,
    "totalDistance": 2500
  }
}
```

### 2. Test Notification (Development)
**POST** `/test-notification`

**Request Body:**
```json
{
  "title": "Test Notification",
  "body": "This is a test notification",
  "type": "test"
}
```

---

## 🚨 **Error Handling**

### Standard Error Response
```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE" // Optional
}
```

### HTTP Status Codes
- `200`: Success
- `400`: Bad Request
- `401`: Unauthorized (Invalid/Missing Token)
- `403`: Forbidden (Access Denied)
- `404`: Not Found
- `500`: Internal Server Error

---

## 🔄 **Real-time Updates**

### WebSocket Connection (Optional)
If you want real-time updates, you can implement WebSocket connection:

**Connection URL:** `ws://your-server-domain.com/socket`

**Events:**
- `delivery_assigned`: New delivery assigned
- `delivery_updated`: Delivery status changed
- `location_update`: Real-time location updates
- `notification`: New notification

---

## 📋 **Data Models**

### Driver Object
```typescript
interface Driver {
  id: string;
  name: string;
  username: string;
  phone: string;
  address?: string;
  status: 'active' | 'inactive';
  employmentDate: string;
}
```

### Delivery Object
```typescript
interface Delivery {
  id: string;
  DeliveryID: string;
  PickupLocation: string;
  DropoffLocation: string;
  PickupCoordinates: Coordinates;
  DropoffCoordinates: Coordinates;
  DeliveryDistance: number;
  EstimatedDuration: number;
  CargoWeight: number;
  DeliveryRate: number;
  DeliveryStatus: 'assigned' | 'accepted' | 'in-progress' | 'completed' | 'cancelled';
  DeliveryDate: string;
  clientName?: string;
  deliveryNotes?: string;
}
```

### Coordinates Object
```typescript
interface Coordinates {
  lat: number;
  lng: number;
}
```

---

## 🔐 **Security Considerations**

1. **Always include JWT token** in Authorization header for authenticated endpoints
2. **Validate file uploads** - Only image files for photos
3. **Location data** should be sent securely and frequently during deliveries
4. **Handle token expiration** gracefully with refresh token mechanism
5. **Use HTTPS** in production for all API calls

---

## 📱 **Mobile App Implementation Tips**

### Flutter/React Native Integration:
1. **HTTP Client**: Use `dio` (Flutter) or `axios` (React Native)
2. **State Management**: Implement proper state management for auth tokens
3. **Offline Support**: Cache critical data for offline functionality  
4. **Background Location**: Track location during deliveries
5. **Push Notifications**: Implement FCM for real-time notifications
6. **Image Handling**: Compress images before upload
7. **Error Handling**: Implement comprehensive error handling

### Sample Implementation (Flutter):
```dart
class ApiService {
  static const String baseUrl = 'http://your-server.com/api/mobile';
  
  Future<Map<String, dynamic>> login(String username, String password) async {
    final response = await dio.post('$baseUrl/auth/login', data: {
      'username': username,
      'password': password,
      'deviceToken': await getDeviceToken(),
    });
    return response.data;
  }
}
``` 