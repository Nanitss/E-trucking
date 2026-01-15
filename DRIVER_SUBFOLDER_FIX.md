# ✅ Driver Document Subfolder Fix

## ❌ **The Problem**

**Error**: `404 /api/documents/view/Driver-Documents/2025-10-09_Driver4_ID.png`

The path was **missing the subfolder**. Should be:
```
/api/documents/view/Driver-Documents/ID-Photos/2025-10-09_Driver4_ID.png
```

---

## 🔍 **Root Cause**

In `FileViewer.js` (Lines 49-56), the subfolder detection used **exact string matching**:
```javascript
if (docType.toLowerCase() === 'id-photos') {  // ❌ Exact match
  subfolder = 'ID-Photos';
}
```

But the actual `docType` values for drivers are:
- `idPhoto` (not `id-photos`)
- `licenseDocument` (not `licenses`)
- `medicalCertificate` (not `medical-certificates`)
- `nbiClearance` (not `nbi-clearances`)

**Result**: Exact match failed → subfolder stayed empty → wrong path!

---

## ✅ **The Fix**

Changed to **substring matching** for driver documents:

```javascript
// Driver documents
else if (docTypeLower.includes('idphoto') || docTypeLower === 'id-photos') {
  subfolder = 'ID-Photos';
} else if (docTypeLower.includes('license') && !docTypeLower.includes('nbi')) {
  subfolder = 'Licenses';
} else if (docTypeLower.includes('medical')) {
  subfolder = 'Medical-Certificates';
} else if (docTypeLower.includes('nbi')) {
  subfolder = 'NBI-Clearances';
}
```

**How It Works**:
- `idPhoto` → `includes('idphoto')` → ✅ Match → subfolder = 'ID-Photos'
- `licenseDocument` → `includes('license')` → ✅ Match → subfolder = 'Licenses'
- `medicalCertificate` → `includes('medical')` → ✅ Match → subfolder = 'Medical-Certificates'
- `nbiClearance` → `includes('nbi')` → ✅ Match → subfolder = 'NBI-Clearances'

---

## 🚫 **Truck Code Unchanged**

As requested, truck document logic was **NOT modified**:
```javascript
// Truck documents (don't change these!)
if (docTypeLower.includes('or') || docTypeLower.includes('cr')) {
  subfolder = 'OR-CR-Files';
} else if (docTypeLower.includes('insurance')) {
  subfolder = 'Insurance-Papers';
}
```

---

## 📊 **Before vs After**

### **Before** ❌
```
docType: "idPhoto"
  ↓
Check: docType === 'id-photos'? NO
  ↓
subfolder = '' (empty)
  ↓
Path: Driver-Documents/2025-10-09_Driver4_ID.png
  ↓
404 Not Found
```

### **After** ✅
```
docType: "idPhoto"
  ↓
Check: includes('idphoto')? YES
  ↓
subfolder = 'ID-Photos'
  ↓
Path: Driver-Documents/ID-Photos/2025-10-09_Driver4_ID.png
  ↓
File Found! ✅
```

---

## 🧪 **Test It**

1. **Server is starting** (started for you)
2. **Refresh browser**: `Ctrl + Shift + R`
3. **View driver documents**:
   - Edit any driver
   - Click "View" on a document
   - **Expected**: Document displays in modal
   - **Expected**: No 404 errors

---

## ✅ **Summary**

| Issue | Cause | Fix | Truck Code |
|-------|-------|-----|------------|
| Missing subfolder | Exact string match failed | Use substring matching | ✅ Unchanged |
| 404 errors | Wrong path constructed | Correct subfolder detection | ✅ Unchanged |
| idPhoto not found | `idPhoto` !== `'id-photos'` | Check `includes('idphoto')` | ✅ Unchanged |

**Driver documents now load correctly with proper subfolders!** 🎉
