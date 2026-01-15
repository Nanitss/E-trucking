# License Type Migration Instructions

## Overview
This migration changes all license types from the old system to the new Philippine driver's license classification system.

### Changes:
- `professional` / `pro` → **Class CE** (All truck types)
- `non-professional` / `non-pro` → **Class C** (Mini trucks only)
- `student`, `restricted`, `none` → **Class C** (Removed, converted to default)

---

## Completed Changes ✅

### Frontend (Code Updated)
1. ✅ **DriverForm.js** - Updated dropdown options and defaults
2. ✅ **HelperForm.js** - Updated dropdown options and defaults
3. ✅ **HelpersList.js** - Updated default fallback value
4. ✅ **DriversList.js** - No changes needed (displays from database)

### Backend
- ✅ No backend validation found - no changes needed

---

## Database Migration (ACTION REQUIRED)

### Before Running Migration:

**1. Backup Your Database (CRITICAL)**
```bash
# The migration script will update ALL driver and helper records
# Make sure you have a Firebase backup or export before proceeding
```

**2. Verify Firebase Credentials**
Make sure `serviceAccountKey.json` exists at:
```
client/server/serviceAccountKey.json
```

### Running the Migration:

**Step 1: Navigate to project root**
```bash
cd c:\Users\garci\Downloads\trucking-web-app (3) (1)\trucking-web-app
```

**Step 2: Run the migration script**
```bash
node migrate-license-types.js
```

**Step 3: Review the output**
The script will show:
- Each driver/helper being updated
- Old value → New value
- Count of records updated vs skipped
- Final summary

### Expected Output Example:
```
🚀 Starting License Type Migration...

📋 Migrating Drivers...
Found 5 drivers to process

✅ Driver abc123 (John Doe): professional -> Class CE
✅ Driver def456 (Jane Smith): non-professional -> Class C
⏭️  Driver ghi789 (Bob Wilson): Already correct (Class CE)

✅ Drivers Migration Complete: 2 updated, 1 skipped

📋 Migrating Helpers...
Found 3 helpers to process

✅ Helper xyz123 (HelperSewel): non-professional -> Class C
✅ Helpers Migration Complete: 1 updated, 0 skipped

📊 MIGRATION SUMMARY
Drivers: 2 updated, 1 already correct
Helpers: 1 updated, 0 already correct
Total Records Updated: 3
```

---

## Testing After Migration

### 1. Test Driver Management
- ✅ Add new driver - should see "Class C" and "Class CE" options only
- ✅ Edit existing driver - should show updated license type
- ✅ View driver list - should display new license types

### 2. Test Helper Management
- ✅ Add new helper - should see "Class C" and "Class CE" options only
- ✅ Edit existing helper - should show updated license type
- ✅ View helper list - should display new license types

### 3. Test Booking System
- ✅ Create new booking - helpers should be assigned properly
- ✅ Check if license-based allocation still works (if implemented)

---

## Rollback Plan

If you need to revert:

1. **Restore from Firebase backup** (recommended)
2. **Manual update** (if needed):
   - Go to Firebase Console
   - Navigate to Firestore Database
   - Update `licenseType` field manually for affected records

---

## Files Modified

### Frontend Files:
1. `client/src/pages/admin/drivers/DriverForm.js`
2. `client/src/pages/admin/helpers/HelperForm.js`
3. `client/src/pages/admin/helpers/HelpersList.js`

### Migration Files Created:
1. `migrate-license-types.js` (Database migration script)
2. `MIGRATION-INSTRUCTIONS.md` (This file)

---

## Mapping Reference

| Old Value | New Value | Description |
|-----------|-----------|-------------|
| professional | Class CE | Can drive all truck types |
| pro | Class CE | Can drive all truck types |
| non-professional | Class C | Mini trucks only |
| non-pro | Class C | Mini trucks only |
| student | Class C | Removed - converted to default |
| restricted | Class C | Removed - converted to default |
| none | Class C | Removed - converted to default |
| (empty/null) | Class C | Set to default |

---

## Questions?

If you encounter any issues:
1. Check the script output for errors
2. Verify Firebase credentials
3. Ensure you have proper permissions to update Firestore
4. Contact support if migration fails

**DO NOT run the migration script multiple times** - it's designed to be run once.
