# Admin Billings Page - Testing & Troubleshooting Guide

## Overview
The Admin Billings page displays payment records derived from the **deliveries** collection. No separate payments are created - billing data is calculated on-the-fly from existing deliveries.

---

## How It Works

### Payment Record Creation
**Billing records are NOT created separately.** They come from deliveries:

1. **When a client books a delivery:**
   - Record saved to `deliveries` collection
   - Contains: clientId, deliveryRate, deliveryDate, etc.

2. **Admin Billings page reads deliveries and calculates:**
   - **Amount:** `deliveryRate` or `DeliveryRate` field
   - **Due Date:** Delivery date + 30 days
   - **Status:** 
     - `paid` if `paymentStatus === 'paid'`
     - `overdue` if due date < current date && not paid
     - `pending` otherwise

---

## Testing Steps

### Step 1: Check If You Have Deliveries

Open browser console and check the server logs when visiting `/admin/billings`:

**Expected Server Output:**
```
📊 GET /api/payments/all - Admin requesting all payments
👤 User: admin | Role: admin
🔍 Fetching deliveries from Firebase...
📦 Found X deliveries in database
✅ Returning X payment records to client
```

**Expected Browser Console:**
```
🔍 Fetching all payments from /api/payments/all
✅ Payments response: {success: true, data: [...]}
📊 Number of payments: X
```

### Step 2: If NO Deliveries (0 payments)

You'll see:
```
⚠️ No payment records found. This means you have no deliveries in the database.
💡 Clients need to book deliveries first!
```

**Solution: Create a test delivery**

1. Navigate to **Admin → Deliveries → Add Delivery**
2. Fill in required fields:
   - Client (select from dropdown)
   - Truck (select from dropdown)
   - Delivery Date
   - Delivery Rate (amount in PHP)
   - Pickup Location
   - Delivery Address
   - Cargo Weight
3. Click **Save**
4. Go back to **Admin → Billings**
5. You should now see the billing record!

### Step 3: If You See "Failed to load payments"

**Check these common issues:**

#### Issue 1: Not logged in as Admin
- Ensure you're logged in with admin credentials
- Check server logs for: `❌ Access denied - User is not admin`

#### Issue 2: Firebase Connection
- Check if Firebase is configured properly
- Verify `.env` has correct Firebase credentials

#### Issue 3: Token Issues
- Clear localStorage and login again
- Check browser console for authentication errors

---

## Manual Database Check

### Check Firebase Console:

1. Go to Firebase Console → Firestore Database
2. Look for `deliveries` collection
3. Check if you have any documents
4. Each delivery should have:
   ```javascript
   {
     clientId: "...",
     clientName: "...",
     deliveryRate: 1500,  // or DeliveryRate
     deliveryDate: timestamp,
     deliveryStatus: "pending" | "completed" | "in-progress",
     paymentStatus: "pending" | "paid" | "overdue",
     truckPlate: "...",
     pickupLocation: "...",
     deliveryAddress: "...",
     // ... other fields
   }
   ```

---

## Creating Test Data (If Needed)

### Option 1: Through Admin UI
1. Admin → Deliveries → Add Delivery
2. Fill all required fields
3. Save

### Option 2: Through Client UI
1. Login as a client
2. Navigate to Client Dashboard
3. Book a new delivery
4. Complete the booking form

### Option 3: Manually in Firebase (For Testing)
Add a document to `deliveries` collection:
```javascript
{
  clientId: "test_client_id",
  clientName: "Test Client",
  deliveryRate: 2500,
  deliveryDate: new Date(),
  deliveryStatus: "pending",
  paymentStatus: "pending",
  truckPlate: "ABC-123",
  truckType: "Box Truck",
  pickupLocation: "Manila, Philippines",
  deliveryAddress: "Quezon City, Philippines",
  cargoWeight: 500,
  created_at: new Date(),
  updated_at: new Date()
}
```

---

## Understanding the Admin Billings Page

### Statistics Cards
Shows real-time calculations:
- **Total Billings:** All non-cancelled deliveries
- **Overdue:** Past due date & not paid
- **Pending:** Not yet due & not paid
- **Paid:** Marked as paid

### Filters
- **Search:** Delivery ID, client name, truck plate
- **Status Filter:** All, Pending, Overdue, Paid, Failed
- **Pagination:** 5, 10, 25, 50 rows per page

### Status Update
1. Click **Edit Status** icon (pencil)
2. Select new status from dropdown
3. Click **Update Status**
4. Changes save to Firebase immediately
5. Updates `paymentStatus` field in delivery document

---

## Common Issues & Solutions

### ❌ "No billing records found"
**Cause:** No deliveries in database  
**Solution:** Create deliveries first (see Step 2 above)

### ❌ "Authentication token missing"
**Cause:** Not logged in or token expired  
**Solution:** Logout and login again

### ❌ "Admin access required"
**Cause:** Logged in as non-admin user  
**Solution:** Login with admin account

### ❌ Page shows loading forever
**Cause:** Network error or server not running  
**Solution:** 
- Check if backend server is running on port 5007
- Open browser DevTools → Network tab
- Look for failed requests to `/api/payments/all`

### ❌ Status update doesn't work
**Cause:** Permission issue or database error  
**Solution:**
- Check server logs for errors
- Verify admin role is set correctly
- Check Firebase rules allow updates

---

## Verification Checklist

✅ **Backend Server Running:** Port 5007  
✅ **Frontend Server Running:** Port 3000  
✅ **Logged in as Admin**  
✅ **At least 1 delivery in database**  
✅ **Firebase configured correctly**  
✅ **Browser console shows no errors**  

---

## Debug Commands

### Check Server Logs
Watch the terminal where you ran `node server.js`:
- Look for payment-related logs
- Check for Firebase connection messages
- Watch for authentication logs

### Browser Console Commands
```javascript
// Check current user
localStorage.getItem('currentUser')

// Check token
localStorage.getItem('token')

// Manual API test
fetch('/api/payments/all', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})
.then(r => r.json())
.then(d => console.log('Payments:', d))
```

---

## Expected Behavior

### When Everything Works:
1. Open `/admin/billings`
2. See statistics cards with numbers
3. See table with delivery/payment records
4. Can search and filter
5. Can click Edit Status and update
6. Changes reflect immediately in Firebase

### Sample Payment Record Display:
```
Delivery ID: abc123
Truck: ABC-123

Client: Test Client
ID: client_id_123

Amount: ₱2,500.00

Delivery Date: Jan 15, 2025
Due Date: Feb 14, 2025

Status: PENDING (orange badge)

Days Until Due: 28 days

[Edit Icon]
```

---

## Next Steps After Testing

1. ✅ Verify billings display correctly
2. ✅ Test status updates
3. ✅ Test filtering and search
4. ✅ Create more test deliveries
5. ✅ Test with different payment statuses
6. ✅ Verify overdue logic (deliveries past due date)

---

## Support

If issues persist:
1. Check all server logs
2. Check browser console errors
3. Verify Firebase connection
4. Ensure deliveries exist in database
5. Test with simple delivery first
6. Check user role is 'admin'
