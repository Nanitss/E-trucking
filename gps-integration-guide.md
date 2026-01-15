# GPS Module Integration Guide

## Overview
This guide explains how to connect your GPS module to your trucking web app's Firebase database.

## Database Structure
Your trucks are stored in Firebase with the following GPS fields:
```json
{
  "truck_12345": {
    "active": true,
    "gpsFix": false,
    "lat": "14.903787",
    "lon": "120.788956", 
    "overSpeed": false,
    "speed": "0.30"
  }
}
```

## Step 1: GPS Module Setup

### Hardware Requirements
- GPS module (GSM/GPRS enabled)
- SIM card with data plan
- Power supply for the module

### GPS Module Configuration
Configure your GPS module to send HTTP POST requests to your server:

**Endpoint**: `https://your-server.com/api/gps/update`
**Method**: POST
**Headers**: 
```
Content-Type: application/json
Authorization: Bearer YOUR_GPS_API_KEY
```

**Payload**:
```json
{
  "truckId": "truck_12345",
  "lat": 14.903787,
  "lon": 120.788956,
  "speed": 0.30,
  "heading": 180,
  "accuracy": 5,
  "timestamp": "2024-01-15T10:30:00Z",
  "gpsFix": true,
  "satellites": 8
}
```

## Step 2: Server-Side GPS Endpoint

Create an API endpoint to receive GPS data:

```javascript
// Add to your server routes
router.post('/api/gps/update', async (req, res) => {
  try {
    const { truckId, lat, lon, speed, heading, accuracy, gpsFix, satellites } = req.body;
    
    // Validate truck exists
    const truckRef = db.collection('trucks').doc(truckId);
    const truckDoc = await truckRef.get();
    
    if (!truckDoc.exists) {
      return res.status(404).json({ error: 'Truck not found' });
    }
    
    // Update truck location
    await truckRef.update({
      lat: lat.toString(),
      lon: lon.toString(), 
      speed: speed.toString(),
      heading: heading || 0,
      accuracy: accuracy || 0,
      gpsFix: gpsFix || false,
      satellites: satellites || 0,
      lastGpsUpdate: admin.firestore.FieldValue.serverTimestamp(),
      active: true
    });
    
    // Check for speeding
    const speedLimit = 80; // km/h
    const overSpeed = speed > speedLimit;
    
    if (overSpeed !== truckDoc.data().overSpeed) {
      await truckRef.update({ overSpeed });
      
      // Send alert if speeding
      if (overSpeed) {
        await sendSpeedingAlert(truckId, speed);
      }
    }
    
    res.json({ success: true, message: 'GPS data updated' });
    
  } catch (error) {
    console.error('GPS update error:', error);
    res.status(500).json({ error: 'Failed to update GPS data' });
  }
});
```

## Step 3: GPS Module Commands

### Common AT Commands for GSM GPS Modules:

```bash
# Set APN for your SIM card
AT+CGDCONT=1,"IP","your-apn-here"

# Enable GPS
AT+CGPS=1,1

# Set GPS update interval (every 30 seconds)
AT+CGPSAUTO=1

# Configure HTTP settings
AT+HTTPINIT
AT+HTTPPARA="CID",1
AT+HTTPPARA="URL","https://your-server.com/api/gps/update"
AT+HTTPPARA="CONTENT","application/json"

# Send GPS data via HTTP POST
AT+HTTPDATA=200,10000
# Then send your JSON payload
```

## Step 4: Update Your Truck Record

Update your specific truck in Firebase:

```javascript
// Update truck_12345 with GPS module info
const truckRef = db.collection('trucks').doc('truck_12345');
await truckRef.update({
  gpsModuleId: 'GPS_MODULE_SERIAL_NUMBER',
  gpsModuleType: 'YOUR_GPS_MODULE_MODEL',
  gpsEnabled: true,
  trackingActive: true,
  lastGpsUpdate: admin.firestore.FieldValue.serverTimestamp()
});
```

## Step 5: Real-time Tracking Features

### Enable Live Tracking
```javascript
// Add to your client-side code
const trackTruck = (truckId) => {
  const truckRef = db.collection('trucks').doc(truckId);
  
  return truckRef.onSnapshot((doc) => {
    if (doc.exists) {
      const data = doc.data();
      updateTruckOnMap({
        id: truckId,
        lat: parseFloat(data.lat),
        lng: parseFloat(data.lon),
        speed: parseFloat(data.speed),
        heading: data.heading || 0,
        lastUpdate: data.lastGpsUpdate
      });
    }
  });
};
```

## Step 6: Testing Your GPS Integration

### Test Commands:
```bash
# Test GPS endpoint manually
curl -X POST https://your-server.com/api/gps/update \
  -H "Content-Type: application/json" \
  -d '{
    "truckId": "truck_12345",
    "lat": 14.903787,
    "lon": 120.788956,
    "speed": 45.5,
    "gpsFix": true
  }'
```

## Troubleshooting

### Common Issues:
1. **GPS Fix Problems**: Ensure clear sky view, check antenna
2. **Network Issues**: Verify SIM card data plan and APN settings
3. **Server Errors**: Check Firebase permissions and API endpoints
4. **Data Format**: Ensure lat/lon are sent as numbers, not strings

### Debug Commands:
```bash
# Check GPS status
AT+CGPS?

# Check network registration
AT+CREG?

# Check signal strength
AT+CSQ
```

## Security Considerations

1. **API Authentication**: Use secure API keys
2. **Data Encryption**: Use HTTPS for all communications
3. **Rate Limiting**: Prevent spam/abuse
4. **Geofencing**: Set up alerts for unauthorized areas

## Next Steps

1. Install GPS module in truck_12345
2. Configure module with your server endpoint
3. Test GPS data transmission
4. Monitor real-time tracking in your web app
5. Set up alerts for speeding, geofencing, etc. 