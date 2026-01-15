# GPS Tracking Troubleshooting Guide

## 🚚 IMPORTANT: Shared GPS Device Configuration

**All deliveries use ONE shared GPS device:**
- **Main Truck ID:** truck_12345
- **Firebase Path:** `Trucks/truck_12345/data`
- **Hardware:** Single ESP32 GPS device configured as "truck_12345"

Individual truck IDs (CBA123, ABC789, etc.) are for delivery assignment only. GPS tracking always reads from the main device.

⚠️ **Note the underscore:** The truck name is `truck_12345` not `12345`

---

## ✅ Fixes Applied

### 1. **Shared GPS Device Configuration**
- **Change:** All deliveries now use main truck (truck_12345) for GPS data
- **Reason:** Single GPS hardware device shared across fleet
- **Path:** Always reads from `Trucks/truck_12345/data` regardless of delivery truck

### 2. **Google Maps Loading Fixed**
- **Issue:** Maps loaded without async causing postMessage CORS errors
- **Fix:** Added proper callback parameter and async loading
- **Before:** `script.src = "...api/js?key=..."`
- **After:** `script.src = "...api/js?key=...&callback=initGoogleMap&loading=async"`

### 3. **Enhanced Error Handling**
- Added detailed GPS data validation
- Better error messages with troubleshooting steps
- Console logging for debugging

### 4. **Multi-line Error Display**
- Error messages now support multiple lines
- Added "Refresh Page" button
- Better formatted error information

---

## 🔍 Common GPS Tracking Issues

### Issue 1: "No GPS data from ESP32 device"

**Possible Causes:**
1. Main ESP32 device (truck_12345) is not powered on
2. ESP32 is not connected to WiFi
3. GPS module has no satellite fix
4. Firebase path is incorrect

**Solution:**
```
1. Check MAIN ESP32 device power (truck_12345)
   - Should have LED indicators
2. Verify WiFi connection on ESP32 (check serial monitor)
3. Confirm device is configured as Truck ID "truck_12345"
4. Move ESP32 outdoors for better GPS signal
5. Wait 2-5 minutes for GPS to acquire satellites
```

**Check Firebase Database:**
- Go to: https://console.firebase.google.com
- Navigate to: Realtime Database
- Look for: `Trucks/truck_12345/data` ⚠️ **Must be exactly "truck_12345"**
- Should see: `{ lat, lon, speed, gpsFix }`

**Note:** Individual truck plates (CBA123, ABC789, etc.) don't need GPS data. All deliveries track the main device.

---

### Issue 2: "GPS hardware has no satellite fix"

**Meaning:** ESP32 is connected but GPS hasn't locked onto satellites

**Solution:**
```
1. Move device to open outdoor area (away from buildings)
2. Ensure GPS antenna has clear view of sky
3. Wait 2-5 minutes for initial satellite acquisition
4. Check GPS module LED (should be blinking)
```

---

### Issue 3: "Failed to load Google Maps"

**Possible Causes:**
1. Invalid or expired API key
2. No internet connection
3. API key restrictions

**Solution:**
```
1. Check internet connection
2. Verify Google Maps API key in code
3. Check Google Cloud Console for API restrictions
4. Ensure "Maps JavaScript API" is enabled
```

---

### Issue 4: PostMessage CORS Error

**Status:** ✅ FIXED
- This error has been resolved by adding proper callback parameter
- If you still see this, clear browser cache and refresh

---

## 📋 How GPS Tracking Works (Shared Device)

```
┌──────────────────────────┐         ┌──────────────┐         ┌───────────────────┐
│  ESP32 (truck_12345)     │         │   Firebase   │         │   Web App         │
│  GPS Module              │ ──WiFi──│   Realtime   │ ──────  │  (All Clients)    │
│  SHARED DEVICE           │         │   Database   │         │  All Deliveries   │
└──────────────────────────┘         └──────────────┘         └───────────────────┘
     Sends:                          Stores at:                All Read from:
  - lat, lon                         Trucks/truck_12345/       Trucks/truck_12345/
  - speed                            data/                     data/
  - gpsFix                           (ONE path)                (SAME path)
```

1. **ONE ESP32** device (configured as truck_12345) reads GPS coordinates
2. **ESP32** sends data to Firebase path: `Trucks/truck_12345/data`
3. **Firebase** stores data in single location
4. **ALL Web Apps** listen to the SAME Firebase path regardless of delivery truck
5. **Google Maps** displays location for any tracked delivery

**Key Point:** Delivery truck IDs (CBA123, ABC789, etc.) are for assignment only. GPS always comes from truck_12345.

---

## 🧪 Testing GPS Tracking

### Step 1: Check Firebase Database for Main Device
```javascript
// Open browser console and run:
const db = getDatabase();
const ref = ref(db, 'Trucks/truck_12345/data');
onValue(ref, (snapshot) => {
  console.log('GPS Data from MAIN device:', snapshot.val());
});

// Expected output:
// { lat: 14.5995, lon: 120.9842, speed: 45.2, gpsFix: true }
```

### Step 2: Verify Shared Device Configuration
```
1. Go to Client Dashboard → Deliveries
2. Find ANY active delivery (with ANY truck plate)
3. Click "Track Live"
4. Check console for:
   🚚 Original truck ID from delivery: CBA123 (or any truck)
   🚚 Using MAIN GPS truck ID: truck_12345
   📍 All deliveries will use GPS data from truck: truck_12345
5. All deliveries should show same GPS location (from device truck_12345)
```

### Step 3: Check ESP32 Serial Monitor
```
Expected output:
✅ WiFi connected
✅ GPS Fix acquired
📡 Sending data to Firebase...
   Lat: 14.5995, Lon: 120.9842
   Speed: 45.2 km/h
```

---

## 🔧 Configuration Checklist

### Firebase Setup
- [ ] Realtime Database is enabled
- [ ] Database URL is correct in firebase.js
- [ ] ESP32 has read/write permissions
- [ ] Database rules allow access
- [ ] Path `Trucks/truck_12345/data` exists with GPS data

### ESP32 Setup (Main Device - truck_12345)
- [ ] GPS module is connected properly
- [ ] WiFi credentials are correct
- [ ] Firebase credentials are set
- [ ] **Device configured as Truck ID "truck_12345"** ⚠️ CRITICAL (with underscore)
- [ ] Device is powered on and active
- [ ] GPS has satellite fix (test outdoors)

### Web App Setup
- [ ] Firebase config is correct
- [ ] Google Maps API key is valid
- [ ] User is logged in as client
- [ ] LiveMapTracker.js uses mainTruckId = 'truck_12345'
- [ ] Deliveries can have ANY truck plate assigned

### Important Notes
- ⚠️ Only ONE ESP32 device needed for entire fleet
- ⚠️ Must be configured as "truck_12345" exactly (note the underscore)
- ✅ All deliveries share this GPS stream
- ✅ Individual truck plates don't need GPS devices

---

## 📞 Support

If issues persist after checking all above:

1. **Check console logs** in browser DevTools (F12)
2. **Check ESP32 serial monitor** for device-side errors
3. **Verify Firebase Database** has incoming data
4. **Test with different truck/delivery** to isolate issue

### Error Codes

| Error Message | Meaning | Solution |
|--------------|---------|----------|
| `No GPS data from ESP32 device` | No data in Firebase | Check ESP32 connection |
| `GPS has no satellite fix` | GPS searching for satellites | Wait outdoors |
| `Failed to load Google Maps` | Maps API issue | Check API key |
| `Invalid GPS coordinates` | Bad data from device | Check ESP32 GPS module |
| `postMessage error` | Browser security warning | **FIXED** - clear cache |

---

## 🎯 Expected Behavior

When GPS tracking is working correctly:

1. Click "Track Live" button on delivery
2. Modal opens showing "Connecting to GPS..."
3. Within 2-3 seconds, map appears
4. Truck marker shows current location
5. Location info updates in real-time
6. Blue path line shows movement history
7. Speed and coordinates display accurately

---

**Last Updated:** GPS tracking fixes applied
**Status:** ✅ All critical issues resolved
