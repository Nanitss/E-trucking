# License-Based Assignment Validation System

## Overview
The booking system now validates driver and helper licenses before assignment to ensure they can operate the requested truck type.

## License Types Supported

### For Drivers:
- **Class CE** or **Professional** → Can drive ALL truck types
- **Class C** or **Non-professional** → Can ONLY drive Mini Trucks

### For Helpers:
- **Class CE** or **Professional** → Can work with ALL truck types  
- **Class C** or **Non-professional** → Can ONLY work with Mini Trucks
- **No License** / **Unknown** → Can ONLY work with Mini Trucks

## Truck Type Requirements

| Truck Type   | Driver License Required | Helpers Needed | Helper Level |
|--------------|------------------------|----------------|--------------|
| Mini Truck   | Class C / Non-professional | 1 | Basic |
| 4 Wheeler    | Class CE / Professional | 1 | Basic |
| 6 Wheeler    | Class CE / Professional | 2 | Standard |
| 8 Wheeler    | Class CE / Professional | 2 | Standard |
| 10 Wheeler   | Class CE / Professional | 3 | Advanced |

## How It Works

### During Booking:

1. **Client selects truck(s)** on booking page
2. **System checks truck type** (e.g., "6 Wheeler")
3. **System finds qualified drivers**:
   - Filters drivers with active status
   - Checks license type (Class CE/Professional for 6 Wheeler)
   - Validates document compliance
4. **System finds qualified helpers**:
   - Filters helpers with active status
   - Checks license type (Class CE/Professional for 6 Wheeler)
   - Checks helper level (Standard required for 6 Wheeler)
   - Validates document compliance
5. **Smart Selection**:
   - Ranks by experience, rating, and availability
   - Assigns best-qualified staff
6. **Validation**:
   - Final check before booking confirmation
   - Returns error if no qualified staff available

### Example Scenarios:

#### ✅ Valid Assignment:
- **Truck:** 6 Wheeler
- **Driver:** Has Class CE license → ✅ Qualified
- **Helpers:** 2 helpers with Class CE license and Standard level → ✅ Qualified
- **Result:** Booking proceeds

#### ❌ Invalid Assignment:
- **Truck:** 6 Wheeler  
- **Driver:** Has Class C license → ❌ NOT Qualified (can only drive Mini Trucks)
- **Result:** Error - "Driver license type (class c) not valid for 6 wheeler"

#### ✅ Valid Mini Truck Assignment:
- **Truck:** Mini Truck
- **Driver:** Has Class C license → ✅ Qualified  
- **Helper:** No license → ✅ Qualified (Mini Truck allows no license)
- **Result:** Booking proceeds

## Setting License Types

### For Drivers:
When creating/editing a driver in the admin panel:
- Set `licenseType` field to one of:
  - `"Class CE"` or `"Professional"` → For all trucks
  - `"Class C"` or `"Non-professional"` → For mini trucks only

### For Helpers:
When creating/editing a helper in the admin panel:
- Set `licenseType` field to one of:
  - `"Class CE"` or `"Professional"` → For all trucks
  - `"Class C"` or `"Non-professional"` → For mini trucks only
  - `"No License"` or leave empty → For mini trucks only
- Set `helperLevel` field to:
  - `"basic"` → Can work with mini trucks and 4-wheelers
  - `"standard"` → Can work with 6-wheelers and 8-wheelers  
  - `"advanced"` → Can work with 10-wheelers

## Error Messages

If validation fails, you'll see error messages like:

- **Driver not qualified:**
  ```
  ❌ C license - NOT qualified for 6 wheeler (can only drive mini trucks)
  ```

- **Helper not qualified:**
  ```
  ❌ CLASS C license helper - NOT qualified for 8 wheeler (can only work with mini trucks)
  ```

- **No qualified staff:**
  ```
  No qualified drivers available for 8 wheeler
  Required license: professional or Class CE
  ```

## Backend Files Modified

1. **SmartAllocationService.js** (Lines 163-268)
   - `_isDriverQualified()` - Validates driver license for truck type
   - `_isHelperQualified()` - Validates helper license for truck type
   - Supports both naming conventions (Class C/CE and Professional/Non-professional)

2. **LicenseValidationService.js**
   - `getTruckRequirements()` - Defines requirements for each truck type
   - `getQualifiedDrivers()` - Finds qualified drivers
   - `getQualifiedHelpers()` - Finds qualified helpers
   - `validateAllocation()` - Final validation before booking

## Testing

### To test the system:

1. **Create test drivers:**
   ```javascript
   // Class C driver (mini trucks only)
   {
     DriverName: "Test Driver 1",
     licenseType: "Class C",
     driverStatus: "active"
   }
   
   // Class CE driver (all trucks)
   {
     DriverName: "Test Driver 2",
     licenseType: "Class CE",
     driverStatus: "active"
   }
   ```

2. **Create test helpers:**
   ```javascript
   // Class C helper (mini trucks only)
   {
     HelperName: "Test Helper 1",
     licenseType: "Class C",
     helperLevel: "basic",
     HelperStatus: "active"
   }
   
   // Class CE helper (all trucks)
   {
     HelperName: "Test Helper 2",
     licenseType: "Class CE",
     helperLevel: "standard",
     HelperStatus: "active"
   }
   ```

3. **Try booking different truck types**
4. **Check console logs** for validation messages

## Console Logs

When booking, you'll see detailed logs:

```
🔍 Checking driver qualification: John Doe for 6 wheeler
   - Driver license type: class ce
   - Required license for 6 wheeler: professional
✅ CLASS CE license - qualified for all truck types

🔍 Checking helper qualification: Jane Smith for 6 wheeler  
   - Helper license type: class c
   - Required helper level for 6 wheeler: standard
❌ CLASS C license helper - NOT qualified for 6 wheeler (can only work with mini trucks)
```

## Summary

✅ **Automatic validation** - System checks licenses before assignment  
✅ **Clear error messages** - Know exactly why assignment failed  
✅ **Flexible naming** - Supports Class C/CE and Professional/Non-professional  
✅ **Smart selection** - Chooses best qualified staff based on experience and rating  
✅ **Comprehensive logging** - Easy to debug with detailed console logs

The system ensures only qualified drivers and helpers are assigned to appropriate truck types, maintaining safety and compliance.
