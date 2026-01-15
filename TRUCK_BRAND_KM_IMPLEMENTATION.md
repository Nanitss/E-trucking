# Truck Brand and Kilometer Tracking Implementation

This document describes the implementation of truck brand identification and kilometer tracking features added to the trucking web application.

## Features Implemented

### 1. Truck Brand Identification
- **Brand Field**: Added dropdown selection for truck brands
- **Model Year Field**: Optional field for truck model year
- **Popular Brands**: Pre-configured with common truck brands in Philippines
  - Toyota, Isuzu, Mitsubishi, Hyundai, Foton, Hino, Nissan, Ford, Suzuki, Kia, Other

### 2. Kilometer Tracking
- **Automatic Calculation**: Kilometers are automatically calculated from completed deliveries
- **Real-time Updates**: Truck kilometers update when deliveries are completed
- **Statistics**: Tracks total kilometers, completed deliveries, and average km per delivery
- **Manual Recalculation**: Admin can manually recalculate kilometers from the truck list

## Technical Implementation

### Backend Changes

#### TruckService.js
- Added `truckBrand`, `modelYear`, `totalKilometers`, `totalCompletedDeliveries`, `averageKmPerDelivery` fields
- Added methods:
  - `calculateTruckKilometers(truckId)` - Calculate KM from deliveries
  - `updateTruckKilometers(truckId, deliveryDistance)` - Update after delivery
  - `recalculateAllTruckKilometers()` - Bulk recalculation for all trucks

#### TruckController.js
- Updated `createTruck` to handle brand and model year fields
- Added endpoints:
  - `POST /api/trucks/:id/recalculate-km` - Recalculate specific truck
  - `POST /api/trucks/recalculate-all-km` - Recalculate all trucks

#### DeliveryService.js
- Added automatic kilometer tracking when `completeDelivery()` is called
- Updates truck kilometers within the same transaction for data consistency

#### Client Controllers
- Added kilometer tracking to `confirmDeliveryReceived()` method
- Ensures kilometers are updated regardless of completion path

### Frontend Changes

#### TruckForm.js (Admin Form)
- Added brand dropdown with pre-configured options
- Added model year number input field
- Updated form validation and data handling

#### TruckForm.js (Component)
- Updated reusable form component with same brand and model year fields
- Maintains consistency between different form instances

#### TruckList.js
- Added columns for Brand, Year, Total KM, and Deliveries
- Shows average km per delivery as additional info
- Added recalculation button (🔄) for each truck
- Loading states for recalculation operations

## Database Schema Updates

### Trucks Collection - New Fields
```javascript
{
  // Existing fields...
  
  // New brand and identification fields
  truckBrand: 'Toyota',           // String - truck brand
  modelYear: 2023,                // Number - model year (optional)
  dateAdded: Timestamp,           // When truck was added to system
  
  // New kilometer tracking fields
  totalKilometers: 125.50,        // Number - total kilometers traveled
  totalCompletedDeliveries: 15,   // Number - count of completed deliveries
  averageKmPerDelivery: 8.37,     // Number - calculated average
  lastOdometerUpdate: Timestamp   // When kilometers were last updated
}
```

## Usage Instructions

### For Administrators

#### Adding New Trucks
1. Navigate to Admin → Trucks → Add New Truck
2. Fill in the plate number, type, and capacity as before
3. **NEW**: Select truck brand from dropdown (required)
4. **NEW**: Enter model year (optional)
5. Save the truck - kilometer tracking starts at 0

#### Managing Existing Trucks
1. Navigate to Admin → Trucks → Truck List
2. **NEW**: View brand, year, total KM, and delivery count in the table
3. **NEW**: Use the 🔄 button to recalculate kilometers for a specific truck
4. Edit trucks to update brand/model year information

#### Kilometer Management
- Kilometers automatically update when deliveries are completed
- Use recalculation if data seems incorrect
- Bulk recalculation available via API endpoint

### For System Maintenance

#### Running the Migration Script
```bash
# Navigate to project root
cd /path/to/trucking-web-app

# Run the migration script
node migrate-trucks-brand-km.js
```

This script will:
- Add brand and kilometer fields to existing trucks
- Calculate kilometers from historical delivery data
- Provide detailed migration report

#### API Endpoints for Kilometer Management
```bash
# Recalculate kilometers for a specific truck
POST /api/trucks/:truckId/recalculate-km

# Recalculate kilometers for all trucks
POST /api/trucks/recalculate-all-km
```

## Data Flow

### Automatic Kilometer Tracking
```
Delivery Created → Delivery Completed → DeliveryService.completeDelivery() 
                                    ↓
                                Truck kilometers updated automatically
                                    ↓
                                Updated data shown in Truck List
```

### Manual Recalculation Flow
```
Admin clicks 🔄 button → API call to recalculate endpoint
                      ↓
                TruckService.calculateTruckKilometers()
                      ↓
                Sum all completed delivery distances
                      ↓
                Update truck record and refresh UI
```

## Benefits

1. **Brand Tracking**: Better inventory management and maintenance planning
2. **Automatic KM Tracking**: No manual odometer readings needed
3. **Historical Data**: Retroactively calculates from existing deliveries
4. **Real-time Updates**: Always current kilometer data
5. **Statistics**: Average km per delivery helps with cost calculations
6. **Admin Control**: Manual recalculation for data accuracy

## Migration Notes

- **Safe Migration**: All existing trucks will get default brand "Unknown"
- **Non-breaking**: Existing functionality remains unchanged
- **Data Integrity**: Uses transactions to ensure consistency
- **Rollback Safe**: Migration can be re-run without issues

## Maintenance

### Regular Tasks
- No regular maintenance required - kilometers update automatically
- Periodically verify kilometer data accuracy using recalculation feature
- Update truck brands from "Unknown" to actual brands when possible

### Troubleshooting
- If kilometers seem incorrect, use the recalculation feature
- Check delivery completion logs for kilometer update messages
- Ensure delivery distances are properly recorded in delivery records

## Future Enhancements

Potential improvements for future versions:
1. **Manual Odometer Entry**: Option for manual kilometer readings
2. **Maintenance Scheduling**: Schedule maintenance based on kilometers
3. **Fuel Efficiency Tracking**: Track fuel usage vs kilometers
4. **Performance Analytics**: Detailed statistics and reporting
5. **Brand-specific Features**: Different maintenance schedules by brand

