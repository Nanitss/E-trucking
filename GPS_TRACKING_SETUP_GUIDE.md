# GPS Live Tracking with Google Maps - Setup Guide

## ✅ What Was Implemented

A real-time GPS tracking system that:

- ✅ Displays truck location on Google Maps in real-time
- ✅ Listens to Firebase Realtime Database for GPS updates
- ✅ Shows speed, accuracy, and last update time
- ✅ Draws path history as truck moves
- ✅ Auto-updates map as new GPS data arrives
- ✅ Works with your existing GPS module that sends data to Firebase

---

## 📋 Files Created/Modified

### **New Files:**

1. **`client/src/components/tracking/LiveMapTracker.js`**

   - Main React component for live GPS tracking
   - Connects to Firebase Realtime Database
   - Renders Google Maps with real-time updates

2. **`client/src/components/tracking/LiveMapTracker.css`**
   - Styling for the tracking modal
   - Responsive design
   - Professional UI with animations

### **Modified Files:**

1. **`client/src/pages/client/DeliveryTracker.js`**
   - Added LiveMapTracker integration
   - "Track Live" button now opens the GPS map modal

---

## 🔧 Setup Instructions

### **Step 1: Get Google Maps API Key**

1. **Go to Google Cloud Console:**

   - Visit: https://console.cloud.google.com/

2. **Create a Project** (if you don't have one):

   - Click "Select a project" → "New Project"
   - Name it: "Trucking Web App"
   - Click "Create"

3. **Enable APIs:**

   - Go to "APIs & Services" → "Library"
   - Search and enable:
     - ✅ Maps JavaScript API
     - ✅ Geocoding API (optional, for address lookup)

4. **Create API Key:**

   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy the API key (looks like: `[YOUR_GOOGLE_MAPS_API_KEY]`)

5. **Restrict API Key (Important for security):**
   - Click "Edit API key"
   - Under "Application restrictions":
     - Select "HTTP referrers (web sites)"
     - Add: `http://localhost:3000/*`
     - Add: `https://yourdomain.com/*`
   - Under "API restrictions":
     - Select "Restrict key"
     - Check: "Maps JavaScript API"
   - Click "Save"

### **Step 2: Add API Key to Your Code**

**Option A: Hardcode in Component (Quick Test)**

Edit: `client/src/components/tracking/LiveMapTracker.js`

Find line 31:

```javascript
script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY`;
```

Replace with:

```javascript
script.src = `https://maps.googleapis.com/maps/api/js?key=[YOUR_GOOGLE_MAPS_API_KEY]`;
```

**Option B: Use Environment Variable (Recommended)**

1. Create file: `client/.env`

```env
REACT_APP_GOOGLE_MAPS_API_KEY=[YOUR_GOOGLE_MAPS_API_KEY]
```

2. Edit: `client/src/components/tracking/LiveMapTracker.js`

Change line 31 to:

```javascript
script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`;
```

3. Restart your React app after adding .env file

---

## 📊 Firebase Realtime Database Structure

Your GPS module should send data to Firebase in this structure:

```json
{
  "tracking": {
    "sessions": {
      "session_unique_id_123": {
        "deliveryId": "ShvM8cJ6syCYllIn4p3MP",
        "driverId": "debug_driver",
        "currentPhase": "pickup",
        "currentLocation": {
          "lat": 14.5995,
          "lng": 120.9842,
          "accuracy": 10,
          "speed": 25,
          "heading": 180,
          "altitude": 50,
          "timestamp": "2025-01-16T10:30:00.000Z"
        },
        "startTime": "2025-01-16T10:00:00.000Z",
        "isActive": true
      }
    }
  }
}
```

### **Key Fields Explained:**

| Field                       | Type   | Description                            |
| --------------------------- | ------ | -------------------------------------- |
| `deliveryId`                | string | Matches delivery ID from Firestore     |
| `driverId`                  | string | Driver identifier                      |
| `currentPhase`              | string | "pickup" or "delivery"                 |
| `currentLocation.lat`       | number | Latitude coordinate                    |
| `currentLocation.lng`       | number | Longitude coordinate                   |
| `currentLocation.speed`     | number | Speed in m/s (converted to km/h in UI) |
| `currentLocation.accuracy`  | number | GPS accuracy in meters                 |
| `currentLocation.timestamp` | string | ISO 8601 timestamp                     |

---

## 🔌 How the GPS Module Should Work

### **When Driver Starts Tracking:**

1. GPS module gets location from device
2. Creates a session in Firebase:

```javascript
const sessionId = `session_${Date.now()}_${driverId}`;
database.ref(`tracking/sessions/${sessionId}`).set({
  deliveryId: "delivery_id_here",
  driverId: "driver_id_here",
  currentPhase: "pickup",
  startTime: new Date().toISOString(),
  isActive: true,
});
```

3. Periodically updates `currentLocation`:

```javascript
database.ref(`tracking/sessions/${sessionId}/currentLocation`).set({
  lat: position.coords.latitude,
  lng: position.coords.longitude,
  accuracy: position.coords.accuracy,
  speed: position.coords.speed || 0,
  heading: position.coords.heading || 0,
  altitude: position.coords.altitude,
  timestamp: new Date().toISOString(),
});
```

---

## 🧪 Testing the System

### **1. Test with Mock Data:**

Add test data to Firebase Realtime Database manually:

1. Go to Firebase Console → Realtime Database
2. Click "+" to add data:

```json
{
  "tracking": {
    "sessions": {
      "test_session_123": {
        "deliveryId": "ShvM8cJ6syCYllIn4p3MP",
        "driverId": "test_driver",
        "currentPhase": "delivery",
        "currentLocation": {
          "lat": 14.5995,
          "lng": 120.9842,
          "accuracy": 10,
          "speed": 25,
          "timestamp": "2025-01-16T10:30:00.000Z"
        },
        "isActive": true
      }
    }
  }
}
```

3. Go to Delivery Tracker page
4. Click "Track Live" on the delivery
5. Should see truck marker on Google Maps

### **2. Test Real-Time Updates:**

1. In Firebase Console, manually change `lat` and `lng` values
2. Watch the marker move on the map in real-time
3. Path line should draw as position changes

---

## 🚀 How to Use

### **For Drivers:**

1. Open Driver Dashboard
2. Go to GPS Tracking section
3. Click "Start Tracking"
4. GPS sends location to Firebase every 30 seconds

### **For Clients:**

1. Go to "Track Orders" page
2. Find an active delivery
3. Click "Track Live" button
4. See real-time GPS location on Google Maps

---

## 🎨 Features

### **Real-Time Updates:**

- ✅ Marker moves as truck moves
- ✅ Path history drawn in blue line
- ✅ Speed displayed in km/h
- ✅ Accuracy shown in meters
- ✅ Last update timestamp

### **Interactive Map:**

- ✅ Zoom in/out
- ✅ Pan around
- ✅ Switch map types (satellite, terrain)
- ✅ Street view available
- ✅ Info popup on marker click

### **Controls:**

- 🎯 Center Map - Re-centers on truck location
- 📱 Open in Google Maps - Opens location in Google Maps app
- ✕ Close - Closes the tracking modal

---

## 🔒 Security Considerations

### **API Key Restrictions:**

- ✅ Restrict to specific domains
- ✅ Restrict to Maps JavaScript API only
- ✅ Set up billing alerts (Google gives $200/month free credit)

### **Firebase Security Rules:**

```json
{
  "rules": {
    "tracking": {
      ".read": "auth != null",
      "sessions": {
        "$sessionId": {
          ".write": "auth != null",
          ".read": "auth != null"
        }
      }
    }
  }
}
```

---

## 📊 Database Structure Validation

Check your Firebase Realtime Database has:

```
tracking/
  └── sessions/
      └── {sessionId}/
          ├── deliveryId: "xxx"
          ├── driverId: "xxx"
          ├── currentPhase: "pickup" | "delivery"
          ├── currentLocation/
          │   ├── lat: 14.5995
          │   ├── lng: 120.9842
          │   ├── accuracy: 10
          │   ├── speed: 25
          │   ├── heading: 180
          │   ├── altitude: 50
          │   └── timestamp: "2025-01-16T..."
          ├── startTime: "2025-01-16T..."
          └── isActive: true
```

---

## 🐛 Troubleshooting

### **Map doesn't load:**

- ✅ Check API key is correct
- ✅ Check browser console for errors
- ✅ Verify API is enabled in Google Cloud
- ✅ Check domain is allowed in API restrictions

### **No GPS data showing:**

- ✅ Check Firebase Realtime Database has data
- ✅ Verify delivery ID matches
- ✅ Check session `isActive` is true
- ✅ Verify `currentPhase` is not "pickup"

### **Marker doesn't update:**

- ✅ Check Firebase console - is data updating?
- ✅ Check browser console for Firebase errors
- ✅ Verify timestamp is recent

### **"GPS tracking not active" error:**

- Driver hasn't started GPS tracking yet
- Session not created in Firebase
- Check `deliveryId` matches between Firestore and Realtime Database

---

## 💰 Google Maps Pricing

**Free Tier:**

- $200 monthly credit (enough for ~28,000 map loads)
- Dynamic Maps: $7 per 1,000 loads
- After free credit: ~$0.007 per map load

**Tips to save costs:**

- Use maps only when "Track Live" is clicked
- Map loads are cached by Google
- Set up billing alerts

---

## 🎉 Success Checklist

- [ ] Google Maps API key obtained
- [ ] API key added to code
- [ ] Maps JavaScript API enabled
- [ ] Firebase Realtime Database structure created
- [ ] Test data added to Firebase
- [ ] Map loads when clicking "Track Live"
- [ ] Marker shows on map
- [ ] Real-time updates working
- [ ] GPS module sending data to Firebase

---

## 📞 Need Help?

If you encounter issues:

1. Check browser console for errors
2. Verify Firebase Realtime Database structure
3. Test with mock data first
4. Check API key restrictions

---

_Setup completed! Your trucking app now has real-time GPS tracking with Google Maps!_ 🚚📍
