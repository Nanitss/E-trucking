# Database Migration Scripts

This folder contains one-time migration scripts to fix or update database records.

## Fix Cancelled Deliveries Migration

### What it does:
This script fixes existing cancelled deliveries that have the wrong status field names. It updates all cancelled deliveries to include both `deliveryStatus` and `DeliveryStatus` fields so they appear correctly on the admin page.

### When to run:
- **Run this once** after updating the cancel delivery functionality
- Only needed if you have existing cancelled deliveries that aren't showing on the admin page

### How to run:

1. **Navigate to the server directory:**
   ```bash
   cd client\server
   ```

2. **Run the migration script:**
   ```bash
   node migrations/fixCancelledDeliveries.js
   ```

3. **Wait for completion:**
   The script will show progress and statistics:
   - Total cancelled deliveries found
   - Number of deliveries fixed
   - Number already correct

### What it updates:
For each cancelled delivery, it ensures these fields are set:
- `deliveryStatus: 'cancelled'`
- `DeliveryStatus: 'cancelled'`
- `status: 'cancelled'`

### Safety:
- ✅ Read-only check first (counts before updating)
- ✅ Uses batched writes for efficiency
- ✅ Only updates cancelled deliveries
- ✅ Preserves all other delivery data
- ✅ Can be run multiple times safely (idempotent)

### After running:
All previously cancelled deliveries will now show correctly on the admin deliveries page with "Cancelled" status.

---

## Requirements

The script uses your existing Firebase configuration from `config/firebase.js`, so make sure:
- Your Firebase environment variables are set (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)
- Your server is properly configured to connect to Firebase

## Troubleshooting

**Error: Firebase not initialized**
- Make sure your Firebase environment variables are configured
- Check that `server/config/firebase.js` is working properly
- Try running your server first to verify Firebase connection

**Error: Permission denied**
- Verify your Firebase service account has Firestore read/write permissions

**Script hangs**
- Large databases may take a few minutes
- Wait for the "Migration completed" message before closing
