# Truck Statistics Tracking

## Overview
The system now automatically tracks truck statistics (Total Deliveries and Total Kilometers) every time a delivery is marked as **"delivered"**.

## Features

### 1. Automatic Updates
When a delivery status changes to **"delivered"**, the system automatically:
- ✅ Adds **+1** to the truck's `TotalDeliveries` count
- ✅ Adds the delivery's `estimatedDistance` to the truck's `TotalKilometers`

### 2. Where It Happens
The statistics are updated in **two places**:
1. **DeliveryService.updateDeliveryStatus()** - Admin panel updates
2. **MobileDriverService.updateDeliveryStatus()** - Driver mobile app updates

### 3. Database Fields
- **TotalDeliveries** (Number) - Total number of delivered deliveries
- **TotalKilometers** (Number) - Total kilometers driven (2 decimal places)

## Migration Script

### Purpose
Calculates and updates statistics for all existing trucks based on their historical delivered deliveries.

### How to Run

```bash
# Navigate to the server directory
cd client/server

# Run the migration script
node migrations/updateTruckStatistics.js
```

### What It Does
1. ✅ Gets all trucks from the database
2. ✅ For each truck, finds all deliveries with status = "delivered"
3. ✅ Calculates:
   - Total number of delivered deliveries
   - Sum of all `estimatedDistance` values
4. ✅ Updates the truck's `TotalDeliveries` and `TotalKilometers` fields

### Example Output
```
🔧 Starting migration to calculate truck statistics...

📊 Found 15 trucks to process

🚛 Processing truck: ABC123 (truck_001)
   Found 12 delivered deliveries
   📏 Total kilometers: 1,245.50km from 12 deliveries
   ✅ Updated truck statistics:
      - TotalDeliveries: 12
      - TotalKilometers: 1245.50km

============================================================
✅ Migration completed successfully!
============================================================
📊 Summary:
   🚛 Total trucks: 15
   ✅ Trucks updated: 12
   ⏭️  Trucks skipped (no deliveries): 3
   📦 Total deliveries processed: 156
============================================================

🎉 All truck statistics have been calculated and updated!
```

## Testing

### Test the Feature
1. **Go to a delivery** in the admin panel or driver app
2. **Change status to "delivered"**
3. **Check the truck** - verify:
   - `TotalDeliveries` increased by 1
   - `TotalKilometers` increased by the delivery's `estimatedDistance`

### Check Console Logs
When a delivery is marked as "delivered", you should see:
```
📊 Delivery XXXXX marked as 'delivered' - updating truck statistics...
✅ Truck ABC123 stats updated:
   Deliveries: 5 → 6
   Kilometers: 450.25km → 523.75km (+73.5km)
```

## Important Notes

⚠️ **Status Trigger**
- Only triggers when status = **"delivered"**
- Does NOT trigger for "completed", "cancelled", etc.

⚠️ **Distance Field**
- Uses `estimatedDistance` from the delivery
- If `estimatedDistance` is 0 or missing, adds 0km (but still counts the delivery)

⚠️ **Decimal Precision**
- Kilometers are stored with 2 decimal places (e.g., 123.45)

⚠️ **Run Migration Once**
- The migration script should be run once to initialize stats for existing trucks
- After that, stats update automatically for new deliveries

## Troubleshooting

### Statistics Not Updating
1. Check the server console logs for errors
2. Verify the delivery has `estimatedDistance` field
3. Verify the delivery has `truckId` field
4. Ensure status is exactly "delivered" (case-sensitive)

### Incorrect Statistics
- Run the migration script again to recalculate from historical data
- This will overwrite current values with fresh calculations

## Future Enhancements

Possible additions:
- Average kilometers per delivery
- Fuel efficiency tracking
- Delivery completion rate
- Performance metrics per driver
