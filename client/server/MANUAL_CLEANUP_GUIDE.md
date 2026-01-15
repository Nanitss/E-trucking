# Manual Cleanup Guide for Duplicate Coordinates

Since the automated script requires Firebase credentials, here's how to clean up the duplicate coordinate fields **manually using Firebase Console**:

## Option 1: Use Firebase Console (Easiest)

### Step 1: Open Firebase Console
1. Go to https://console.firebase.google.com/
2. Select your project: **trucking-web-app**
3. Click on **Firestore Database** in the left menu

### Step 2: Clean Up Each Delivery
1. Click on the **deliveries** collection
2. For each delivery document:
   - Click to open it
   - Look for these fields:
     - `PickupCoordinates` (uppercase) ❌ **DELETE THIS**
     - `DropoffCoordinates` (uppercase) ❌ **DELETE THIS**
   - Keep these fields:
     - `pickupCoordinates` (lowercase) ✅ **KEEP**
     - `dropoffCoordinates` (lowercase) ✅ **KEEP**
   - Click the **trash icon** next to the uppercase fields to delete them
   - Save the document

### What to Delete:
```
❌ DELETE: PickupCoordinates (capital P)
✅ KEEP:   pickupCoordinates (lowercase p)

❌ DELETE: DropoffCoordinates (capital D)  
✅ KEEP:   dropoffCoordinates (lowercase d)
```

---

## Option 2: Set Up .env File for Automated Script

If you want to use the automated script, create a `.env` file in `client\server\` folder:

### Step 1: Get Your Firebase Credentials
1. Go to Firebase Console
2. Click the **gear icon** (Project Settings)
3. Go to **Service Accounts** tab
4. Click **Generate New Private Key**
5. Download the JSON file

### Step 2: Create .env File
Create file: `client\server\.env`

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour\nPrivate\nKey\nHere\n-----END PRIVATE KEY-----\n"
FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
```

### Step 3: Run the Automated Script
```bash
cd client\server
node fix-duplicate-coordinates.js
```

---

## Option 3: Use Firebase CLI (Advanced)

If you have Firebase CLI installed:

```bash
# Login to Firebase
firebase login

# List your deliveries
firebase firestore:read deliveries

# You can write a Firebase script to update in bulk
```

---

## Verification

After cleanup, verify that:
- ✅ No delivery has `PickupCoordinates` (uppercase)
- ✅ No delivery has `DropoffCoordinates` (uppercase)  
- ✅ All deliveries have `pickupCoordinates` (lowercase)
- ✅ All deliveries have `dropoffCoordinates` (lowercase)

## Why This Matters

Having duplicate coordinate fields:
- ❌ Wastes database storage
- ❌ Causes confusion in code
- ❌ Violates the schema documentation
- ❌ Makes maintenance harder

After cleanup:
- ✅ Clean, consistent data structure
- ✅ Follows schema correctly
- ✅ Easier code maintenance
- ✅ Reduced storage usage

---

## Need Help?

If you have many deliveries (50+), Option 2 (automated script) is recommended.
If you have fewer deliveries (< 50), Option 1 (manual) is faster to set up.

The frontend code has already been updated to handle both formats during the transition period, so you can clean up at your own pace.
