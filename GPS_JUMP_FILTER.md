# GPS Jump Filter - IMPLEMENTED

## 🎯 Problem Solved

The GPS was **jumping between Manila and Malolos** because the ESP32 device was sending **bad/flickering GPS coordinates** to Firebase. The coordinates would alternate between:
- Malolos: ~14.848°N, 120.829°E
- Manila: ~14.600°N, 120.984°E

This is a **~30km jump** which is impossible for a truck to do in a few seconds!

---

## ✅ Solution: GPS Coordinate Validation

Added **smart filtering** to reject unrealistic GPS jumps:

### **1. Philippines Bounds Check**
```javascript
// Reject coordinates outside Philippines
Latitude: 4.5° to 21.5° N
Longitude: 116.0° to 127.0° E
```

### **2. Distance Jump Check**
```javascript
// Calculate distance between GPS updates
if (distance > 10 km) {
  // REJECT - Impossible for truck to move 10km in seconds
  console.warn('GPS jump detected!');
  return; // Keep using last valid location
}
```

### **3. Distance Calculation**
Uses **Haversine formula** to calculate accurate distance on sphere:
```javascript
// Earth radius: 6,371 km
distance = calculateDistance(lastLat, lastLng, newLat, newLng)
```

---

## 🛡️ How It Works

### **When GPS Update Arrives:**

**Step 1: Parse Coordinates**
```javascript
lat = 14.848028
lng = 120.829243
```

**Step 2: Basic Validation**
- Check if valid numbers ✅
- Check if in range (-90 to 90, -180 to 180) ✅

**Step 3: GPS Jump Detection**
```javascript
if (lastValidLocation exists) {
  distance = calculateDistance(last, new);
  
  if (distance > 10km) {
    ⚠️ REJECT this update
    Keep showing last valid location
  }
}
```

**Step 4: Accept Valid GPS**
```javascript
✅ Update map
✅ Store as lastValidLocation
✅ Add to trail
```

---

## 📊 Console Output

### **Valid GPS Update:**
```
📍 ESP32 GPS data received: {lat: 14.848028, lon: 120.829243}
✅ GPS valid - Distance from last: 0.087 km
✅ Converted GPS data: {lat, lng, speed}
📍 GPS update - following truck to: {lat, lng}
```

### **Invalid GPS Update (Filtered):**
```
📍 ESP32 GPS data received: {lat: 14.600, lon: 120.984}
⚠️ GPS jump detected! Distance: 30.45 km
Last valid: {lat: 14.848028, lng: 120.829243}
New (rejected): {lat: 14.600, lon: 120.984}
⚠️ Ignoring this GPS update - likely bad data from sensor
⚠️ GPS update rejected - using last valid location
```

**Result:** Map doesn't jump! Stays at Malolos (last valid location)

---

## 🎚️ Configurable Threshold

Current setting: **10 km maximum jump**

### Why 10 km?

**Reasoning:**
- Typical GPS update frequency: 1-5 seconds
- Max truck speed: ~100 km/h
- Distance in 5 seconds at 100 km/h: ~0.14 km
- **10 km buffer** catches obvious GPS errors

### Can be adjusted:
```javascript
const maxReasonableDistance = 10; // 10 km threshold

// For different scenarios:
// - City driving: 5 km
// - Highway: 15 km  
// - Stationary: 1 km
```

---

## 🧪 Test Scenarios

### **Scenario 1: Normal Movement**
```
Location A: 14.848, 120.829 (Malolos)
Location B: 14.849, 120.830 (100m away)
Distance: 0.1 km ✅ ACCEPTED
Result: Map updates smoothly
```

### **Scenario 2: GPS Glitch**
```
Location A: 14.848, 120.829 (Malolos)
Location B: 14.600, 120.984 (Manila - 30km away!)
Distance: 30.45 km ❌ REJECTED
Result: Map stays at Malolos
```

### **Scenario 3: Recovery**
```
Location A: 14.848, 120.829 (Malolos - valid)
Location B: 14.600, 120.984 (Manila - rejected)
Location C: 14.848, 120.829 (Malolos - valid again)
Distance C from A: 0 km ✅ ACCEPTED
Result: Map stable at Malolos
```

---

## 🔍 Root Cause Analysis

### Why is ESP32 GPS flickering?

**Possible causes:**

1. **Poor GPS Signal**
   - Indoor placement
   - Weak satellite lock
   - Interference

2. **Bad GPS Module**
   - Faulty hardware
   - Loose connections
   - Old/cheap GPS module

3. **Software Issues**
   - Incorrect GPS parsing
   - Coordinate system confusion
   - Buffer overflow

4. **Power Issues**
   - Unstable power supply
   - Voltage drops
   - Brown-outs

### **Short-term fix:** ✅ Filter bad data (implemented)
### **Long-term fix:** 🔧 Fix ESP32 hardware/software

---

## 🛠️ ESP32 Recommendations

### **Hardware Checks:**
```
✓ GPS antenna has clear sky view
✓ GPS module properly connected
✓ Stable 5V power supply
✓ No interference from other devices
```

### **Software Checks:**
```
✓ Wait for GPS fix before reading (gpsFix = true)
✓ Validate coordinates before sending
✓ Check HDOP (Horizontal Dilution of Precision)
✓ Implement moving average filter
```

### **ESP32 Code Improvement:**
```cpp
// Only send GPS data if fix is good
if (gps.satellites.value() >= 4 && 
    gps.hdop.value() < 2.0) {
    // Good fix - send data
    sendToFirebase(lat, lon);
} else {
    // Poor fix - skip this update
    Serial.println("Waiting for better GPS fix...");
}
```

---

## 📈 Benefits

✅ **No More Jumping** - Map stays stable
✅ **Better User Experience** - Smooth tracking
✅ **Realistic Data** - Only valid GPS shown
✅ **Automatic Filtering** - No user intervention needed
✅ **Clear Logging** - Know when bad data is filtered
✅ **Configurable** - Easy to adjust threshold

---

## 🔄 How to Test

1. **Refresh page** (Ctrl+F5)
2. **Open tracking** on any delivery
3. **Watch console:**
   - Look for "GPS valid" messages
   - Look for "GPS jump detected" warnings
4. **Verify:** Map should NOT jump between cities
5. **Check:** Distance calculations in console

### **Expected Console Output:**
```
✅ GPS valid - Distance from last: 0.023 km
✅ GPS valid - Distance from last: 0.045 km
⚠️ GPS jump detected! Distance: 30.45 km  ← Filtered!
✅ GPS valid - Distance from last: 0.012 km
```

---

## ⚙️ Technical Details

### **Haversine Formula:**
```javascript
R = 6371 km (Earth radius)
dLat = (lat2 - lat1) * π/180
dLon = (lon2 - lon1) * π/180

a = sin²(dLat/2) + cos(lat1) * cos(lat2) * sin²(dLon/2)
c = 2 * atan2(√a, √(1-a))
distance = R * c
```

### **State Management:**
```javascript
lastValidLocation.current = {
  lat: 14.848028,
  lng: 120.829243
}

// Updated only when GPS passes validation
// Used for next validation check
```

---

## 🚨 Edge Cases Handled

### **First GPS Update:**
- No previous location to compare
- Always accepted (if in Philippines bounds)

### **Device Restart:**
- lastValidLocation resets
- First update after restart accepted

### **Long Stop:**
- Truck stationary for hours
- Next movement accepted regardless of time

### **Legitimate Long Movement:**
- If truck really moved 10km
- Will be rejected (threshold can be increased)
- Manual adjustment needed for long-distance scenarios

---

## 📝 Future Improvements

Potential enhancements:

1. **Adaptive Threshold**
   - Adjust based on truck speed
   - Higher threshold at highway speeds

2. **Time-Based Validation**
   - Calculate max possible distance based on time elapsed
   - Distance = (time in seconds) * (max speed / 3600)

3. **Kalman Filter**
   - Smooth GPS coordinates
   - Predict next position
   - Better for noisy GPS data

4. **GPS Quality Indicator**
   - Show signal strength to user
   - Warn when GPS accuracy is poor

5. **Historical Validation**
   - Check against multiple previous points
   - Detect systematic errors

---

**Status:** ✅ IMPLEMENTED AND ACTIVE
**Threshold:** 10 km maximum jump
**Result:** Map no longer jumps between Manila and Malolos!
