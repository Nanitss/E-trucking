# Deliveries Collection Schema

The deliveries collection in Firestore stores information about all delivery bookings. The following fields should be included to properly support location-based features:

## Core Fields

| Field | Type | Description |
|-------|------|-------------|
| `clientId` | String | Reference to the client who booked the delivery |
| `truckId` | String | Reference to the truck assigned to this delivery |
| `clientName` | String | Name of the client (for quick display without joins) |
| `truckPlate` | String | License plate of the truck (for quick display without joins) |
| `truckType` | String | Type of the truck (for quick display without joins) |
| `driverName` | String | Name of the driver assigned (if any) |
| `helperName` | String | Name of the helper assigned (if any) |
| `cargoWeight` | Number | Weight of cargo in tons |
| `deliveryDate` | Timestamp | Date and time of scheduled delivery |
| `deliveryStatus` | String | Status: 'pending', 'in-progress', 'completed', 'cancelled' |
| `created_at` | Timestamp | When the record was created |
| `updated_at` | Timestamp | When the record was last updated |

## Location Fields

These fields are essential for the maps integration:

| Field | Type | Description |
|-------|------|-------------|
| `pickupLocation` | String | Human-readable address for pickup location |
| `deliveryAddress` | String | Human-readable address for delivery/dropoff location |
| `pickupCoordinates` | Object | Geo coordinates for pickup location |
| `pickupCoordinates.lat` | Number | Latitude of pickup location |
| `pickupCoordinates.lng` | Number | Longitude of pickup location |
| `dropoffCoordinates` | Object | Geo coordinates for dropoff location |
| `dropoffCoordinates.lat` | Number | Latitude of dropoff location |
| `dropoffCoordinates.lng` | Number | Longitude of dropoff location |

## Route Information Fields

These fields store calculated information about the delivery route:

| Field | Type | Description |
|-------|------|-------------|
| `deliveryDistance` | Number | Distance between pickup and dropoff in kilometers |
| `estimatedDuration` | Number | Estimated travel time in minutes |
| `deliveryRate` | Number | Price calculated for this delivery |
| `routePolyline` | String | Encoded polyline of the route (optional, for displaying on maps) |
| `routeWaypoints` | Array | Intermediate waypoints (optional, for complex routes) |

## Implementation Notes

1. **Coordinates Storage**: Always store both the human-readable address and the coordinates. This allows for:
   - Displaying the address to users
   - Using coordinates for accurate distance calculations
   - Showing markers on maps without needing to geocode again

2. **Firestore Geospatial Queries**: For advanced features, you can use Firestore's geospatial queries:
   ```javascript
   // Example: Find deliveries near a location
   const center = new firebase.firestore.GeoPoint(lat, lng);
   const radiusInM = 10 * 1000; // 10km in meters
   
   // This requires the geofirestore library
   const query = geofirestore.collection('deliveries')
     .near({ center, radius: radiusInM });
   ```

3. **Distance Calculation**: For accurate distance calculation between pickup and dropoff:
   - Use Google's Distance Matrix API for most accurate results (traffic, etc.)
   - Use Haversine formula for quick client-side estimates (as currently implemented)

## Example Document

```javascript
{
  "id": "delivery123",
  "clientId": "client456",
  "clientName": "Acme Corporation",
  "truckId": "truck789",
  "truckPlate": "ABC123",
  "truckType": "Semi",
  "driverName": "John Doe",
  "helperName": "Jane Smith",
  "cargoWeight": 5.5,
  "deliveryDate": timestamp,
  "deliveryStatus": "pending",
  "pickupLocation": "123 Main St, New York, NY",
  "pickupCoordinates": {
    "lat": 40.7128,
    "lng": -74.0060
  },
  "deliveryAddress": "456 Elm St, Boston, MA",
  "dropoffCoordinates": {
    "lat": 42.3601,
    "lng": -71.0589
  },
  "deliveryDistance": 346.2,
  "estimatedDuration": 240,
  "deliveryRate": 750,
  "created_at": timestamp,
  "updated_at": timestamp
}
``` 