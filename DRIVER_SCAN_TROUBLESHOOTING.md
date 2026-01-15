# 🔧 Driver Document Scanning - Troubleshooting Guide

## ❌ **Current Issue**

Driver "Nanit" still shows Driver4's old files even after the scan function was added.

**Console Error**:
```
fullPath: C:\Users\garci\Documents\TruckingApp-Files\Driver-Documents\ID-Photos\2025-10-09_Driver4_ID.png
GET /api/documents/view/Driver-Documents/ID-Photos/2025-09-02_Driver4_ID.png 404 (Not Found)
```

---

## 🔍 **Diagnosis**

The scan function was added but **logs aren't showing in console**, which means either:
1. The scan function isn't being called
2. Logs aren't displaying properly
3. The code changes haven't taken effect

---

## ✅ **Step-by-Step Fix**

### **Step 1: Verify Code Changes**

Open `DriverService.js` and verify these sections exist:

**Lines 19-20** - Function signature:
```javascript
async scanDriverDocuments(driverId, driverUsername = null) {
  console.log('🔍 Scanning documents for driver ID:', driverId, 'Username:', driverUsername);
```

**Lines 50-62** - Username matching:
```javascript
const matchingFiles = files.filter(file => {
  const hasCorrectType = file.includes(config.prefix);
  const matchesId = file.includes(`Driver${driverId}`);
  const matchesUsername = driverUsername && file.includes(`Driver${driverUsername}`);
  
  return hasCorrectType && (matchesId || matchesUsername);
});
```

**Lines 234-259** - getDriverById calls scan:
```javascript
const driverUsername = driverData.DriverUserName || driverData.DriverName;
const actualDocuments = await this.scanDriverDocuments(id, driverUsername);
if (Object.keys(actualDocuments).length > 0) {
  driverData.documents = actualDocuments;
}
```

✅ If all present → Code is correct
❌ If missing → Apply the edits again

---

### **Step 2: Restart Backend Server Properly**

**Kill all Node processes**:
```powershell
taskkill /f /im node.exe
```

**Start backend server** (from `client/server` directory):
```powershell
cd client\server
npm start
```

**Wait for**:
```
🔧 SERVER.JS STARTING - FIREBASE VERSION
✅ Firebase Admin SDK initialized
Server listening on port 5007
```

---

### **Step 3: Test with Browser Console**

1. **Open browser console**: Press `F12`
2. **Clear console**: Click trash icon
3. **Go to Drivers page**
4. **Click Edit on driver "Nanit"**
5. **Watch console for these logs**:

**Expected Logs** ✅:
```
🔍 ===== DRIVER DOCUMENT SCAN START =====
Driver ID: U0XMfAiAsKMyD49CaJLE
Driver Name: Nanit
Driver Username: Nanit
🔍 Calling scanDriverDocuments with ID: U0XMfAiAsKMyD49CaJLE Username: Nanit
🔍 Scanning documents for driver ID: U0XMfAiAsKMyD49CaJLE Username: Nanit
📂 Scanning folder: ID-Photos
📂 Total files in folder: 4
  Checking: 2025-10-13_DriverNanit_1760342486027_ID.png
    Has type (ID): true
    Matches ID (DriverU0XMfAiAsKMyD49CaJLE): false
    Matches Username (DriverNanit): true
    Final match: true
🔍 Found 1 matching files for idPhoto
✅ Found idPhoto: 2025-10-13_DriverNanit_1760342486027_ID.png
📦 Scan result - found 3 documents
✅ Overriding database documents with actual files from disk
🔍 ===== DRIVER DOCUMENT SCAN END =====
```

**If you DON'T see these logs** ❌:
- Server didn't restart properly
- Code changes didn't save
- Using wrong `getDriverById` function

---

### **Step 4: Check Server Terminal**

The **backend server terminal** should show the same logs when you view a driver.

**If logs appear** ✅:
- Scan is running
- Check what it finds

**If NO logs appear** ❌:
- `getDriverById` not being called
- OR using cached data
- OR different code path

---

## 🐛 **Common Issues**

### **Issue 1: Scan Logs Not Showing**

**Symptom**: No "🔍 DRIVER DOCUMENT SCAN START" in console

**Possible Causes**:
1. Frontend calling different endpoint
2. Cached response
3. Server not restarted

**Fix**:
1. Hard refresh browser: `Ctrl + Shift + R`
2. Restart backend server
3. Check Network tab for `/api/admin/drivers/{id}` request

---

### **Issue 2: Files Not Found**

**Symptom**: Logs show "📦 Scan result - found 0 documents"

**Possible Causes**:
1. Username doesn't match filename
2. File in wrong folder
3. Incorrect matching logic

**Check**:
```powershell
# List files in ID-Photos folder
Get-ChildItem "uploads\Driver-Documents\ID-Photos" | Select-Object Name
```

**Expected for driver "Nanit"**:
```
2025-10-13_DriverNanit_1760342486027_ID.png
```

**Match Logic**:
- Looking for: `file.includes("DriverNanit")`  
- Will it match? YES ✅

---

### **Issue 3: Files Found But Not Overriding**

**Symptom**: Logs show files found, but still using old paths

**Check**:
```javascript
if (Object.keys(actualDocuments).length > 0) {
  console.log('✅ Overriding database documents');
  driverData.documents = actualDocuments;  // ← This line
}
```

**Verify**: 
- This code exists in your `getDriverById`
- `actualDocuments` actually has files
- `driverData.documents` is being replaced

---

## 🧪 **Manual Test Script**

Create this file to test the scan directly:

**File**: `client/server/test-driver-scan.js`
```javascript
const DriverService = require('./services/DriverService');

async function testScan() {
  console.log('🧪 Testing Driver Document Scan');
  
  const driverId = 'U0XMfAiAsKMyD49CaJLE'; // Replace with actual ID
  const driverUsername = 'Nanit';
  
  console.log('Testing with ID:', driverId);
  console.log('Testing with Username:', driverUsername);
  
  const docs = await DriverService.scanDriverDocuments(driverId, driverUsername);
  
  console.log('📦 Result:', JSON.stringify(docs, null, 2));
  process.exit(0);
}

testScan().catch(console.error);
```

**Run**:
```powershell
cd client\server
node test-driver-scan.js
```

**Expected Output**:
```
🔍 Scanning documents for driver ID: U0XMfAiAsKMyD49CaJLE Username: Nanit
📂 Scanning folder: ID-Photos
  Checking: 2025-10-13_DriverNanit_1760342486027_ID.png
    Matches Username (DriverNanit): true
✅ Found idPhoto: 2025-10-13_DriverNanit_1760342486027_ID.png
📦 Result: {
  "idPhoto": {
    "filename": "2025-10-13_DriverNanit_1760342486027_ID.png",
    ...
  }
}
```

---

## 🎯 **What Should Happen**

### **Correct Flow**:
```
User clicks "Edit Driver Nanit"
  ↓
Frontend: GET /api/admin/drivers/U0XMfAiAsKMyD49CaJLE
  ↓
Backend: adminController.getDriverById()
  ↓
Backend: DriverService.getById(id)
  ↓
Backend: DriverService.getDriverById(id)  ← Our modified function
  ↓
Backend: Logs "🔍 ===== DRIVER DOCUMENT SCAN START ====="
  ↓
Backend: scanDriverDocuments(id, "Nanit")
  ↓
Backend: Scans uploads/Driver-Documents/*/
  ↓
Backend: Finds 2025-10-13_DriverNanit_*_ID.png
  ↓
Backend: Returns { idPhoto: { filename: "2025-10-13_DriverNanit..." } }
  ↓
Backend: Overrides driverData.documents
  ↓
Backend: Returns driver with NEW document paths
  ↓
Frontend: Receives driver with CORRECT paths
  ↓
Frontend: document.fullPath = "C:\\...\\uploads\\Driver-Documents\\ID-Photos\\2025-10-13_DriverNanit..."
  ↓
Frontend: FileViewer constructs URL
  ↓
Frontend: GET /api/documents/view/Driver-Documents/ID-Photos/2025-10-13_DriverNanit_...
  ↓
✅ SUCCESS: File displays
```

### **Current (Broken) Flow**:
```
User clicks "Edit Driver Nanit"
  ↓
Frontend: GET /api/admin/drivers/U0XMfAiAsKMyD49CaJLE
  ↓
Backend: Returns driver with OLD database paths ❌
  ↓
Frontend: document.fullPath = "C:\\Users\\garci\\Documents\\TruckingApp-Files..." ❌
  ↓
Frontend: FileViewer tries to load old path
  ↓
❌ FAIL: 404 Not Found
```

**The scan function must run and override the documents!**

---

## 🚀 **Next Steps**

1. **Verify code changes saved** in `DriverService.js`
2. **Restart backend server** completely
3. **Hard refresh browser** (`Ctrl + Shift + R`)
4. **Open browser console** and watch for scan logs
5. **Edit driver "Nanit"**
6. **Check console** for "🔍 DRIVER DOCUMENT SCAN START"

**If logs appear**: Scan is working, check results
**If NO logs**: Scan function not being called - need to debug

---

## 📞 **Report Back**

Please check:
1. ✅ / ❌ Do you see "🔍 DRIVER DOCUMENT SCAN START" in console?
2. ✅ / ❌ Do you see "📂 Scanning folder: ID-Photos"?
3. ✅ / ❌ Does it find files with "DriverNanit"?
4. ✅ / ❌ Does it say "✅ Overriding database documents"?

**Copy the console logs** and send them - that will show exactly what's happening!
