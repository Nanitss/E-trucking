# Contact Fields Migration Instructions

## Overview
This migration updates all existing deliveries to have separate pickup and dropoff contact information.

## What Changed
- **Old Structure**: Single `contactPerson` and `contactNumber` field
- **New Structure**: Separate fields for pickup and dropoff contacts
  - `pickupContactPerson` (optional)
  - `pickupContactNumber` (required)
  - `dropoffContactPerson` (optional)
  - `dropoffContactNumber` (required)

## Migration Steps

### Step 1: Run the Migration Script

**Option A: Using Node directly**
```bash
cd client\server
node scripts\migrateContactFields.js
```

**Option B: Using npm (if you have a script set up)**
```bash
npm run migrate-contacts
```

### Step 2: Verify Migration
The script will display a summary:
```
✅ Successfully updated: X
⏭️  Skipped (already migrated): Y
❌ Errors: 0
📦 Total processed: X
```

### Step 3: Restart the Server
After migration completes, restart your server:
```bash
# Stop the current server (Ctrl+C)
# Then start again
npm start
```

## What the Migration Does
- Updates ALL existing deliveries with contact information:
  - Pickup Contact: Nathaniel Garcia - 09605877964
  - Dropoff Contact: Nathaniel Garcia - 09605877964
- Adds a `migrated: true` flag to track migrated records
- Skips records that already have the new contact fields

## After Migration
- ✅ All old deliveries will show contact info in booking details
- ✅ New bookings will use the new pickup/dropoff contact structure
- ✅ Contact names are optional (can be left blank)
- ✅ Contact numbers are required for both pickup and dropoff

## Rollback (if needed)
If something goes wrong, the old `contactPerson` and `contactNumber` fields are still in the database. You can manually revert if needed.

## Questions?
If you encounter any issues during migration, check the console output for error details.
