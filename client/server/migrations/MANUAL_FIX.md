# Manual Fix for Cancelled Deliveries

If you can't run the migration script due to Firebase credentials issues, you can fix the cancelled deliveries manually through Firebase Console.

## Option 1: Firebase Console (Web UI)

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select your project**: `trucking-c3f4f` (or your project name)
3. **Navigate to Firestore Database**
4. **Click on the `deliveries` collection**
5. **Find cancelled deliveries**:
   - Look for deliveries where `status = 'cancelled'`
   - Or filter by clicking "Add filter" and selecting `status == cancelled`

6. **For each cancelled delivery**:
   - Click on the delivery document
   - Click "Add field" button
   - Add field: `deliveryStatus` with value: `cancelled`
   - Add field: `DeliveryStatus` with value: `cancelled`
   - Click "Update"

## Option 2: Firebase CLI (Faster for multiple documents)

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Create a temporary script** `fixCancelled.js`:
   ```javascript
   const admin = require('firebase-admin');
   
   admin.initializeApp();
   const db = admin.firestore();
   
   async function fix() {
     const snapshot = await db.collection('deliveries')
       .where('status', '==', 'cancelled')
       .get();
     
     const batch = db.batch();
     snapshot.docs.forEach(doc => {
       batch.update(doc.ref, {
         deliveryStatus: 'cancelled',
         DeliveryStatus: 'cancelled'
       });
     });
     
     await batch.commit();
     console.log(`Fixed ${snapshot.size} cancelled deliveries`);
   }
   
   fix().then(() => process.exit());
   ```

4. **Run it**:
   ```bash
   firebase functions:shell
   ```

## Option 3: Wait for New Cancellations

If you don't have many old cancelled deliveries, you can:
1. Just use the system going forward
2. New cancellations will work correctly
3. Old cancelled deliveries can remain as-is (they just won't show the cancelled status on admin page)

## How to Get Firebase Credentials for the Migration Script

1. **Go to Firebase Console** > Project Settings > Service Accounts
2. **Click "Generate New Private Key"**
3. **Download the JSON file**
4. **Create `.env` file** in `client/server/` with:
   ```
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
   ```
5. **Run the migration** again:
   ```bash
   node migrations/fixCancelledDeliveries.js
   ```

---

## Verification

After fixing, verify by:
1. Go to Admin Deliveries page
2. Previously cancelled deliveries should now show "Cancelled" status
3. Can filter by "Cancelled" status
