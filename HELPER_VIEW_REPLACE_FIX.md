# Helper Document View & Replace Functionality - Complete

## ✅ Implemented: Driver-Style View and Replace Buttons

The helper document upload system now has the **exact same View and Replace functionality** as drivers.

---

## 📋 Changes Made

### **File: `HelperForm.js`**

#### **1. Added `handleReplaceDocument` Function**
```javascript
const handleReplaceDocument = (documentType) => {
  console.log('🔄 Replace clicked for:', documentType);
  // Clear any existing uploaded file for this type
  setUploadedFiles(prev => ({
    ...prev,
    [documentType]: null
  }));
  // IMPORTANT: Temporarily hide existing document view so new file preview shows
  setExistingDocuments(prev => ({
    ...prev,
    [documentType]: null
  }));
  // Trigger file input click
  const fileInput = document.getElementById(documentType);
  if (fileInput) {
    fileInput.click();
  }
};
```

**What it does:**
- Clears uploaded file state for the document type
- Hides the existing document display
- Triggers the file input to open file picker
- User selects new file → shows new file preview → uploads on save

#### **2. Added `handleViewDocument` Function**
```javascript
const handleViewDocument = (documentType) => {
  console.log('👁️ View clicked for:', documentType);
  const document = existingDocuments[documentType];
  if (!document) {
    console.error('❌ No document found for:', documentType);
    return;
  }
  
  try {
    const filename = document.filename;
    
    // Determine subfolder based on document type
    let subfolder = '';
    if (documentType === 'validId') {
      subfolder = 'Valid-IDs';
    } else if (documentType === 'barangayClearance') {
      subfolder = 'Barangay-Clearances';
    } else if (documentType === 'medicalCertificate') {
      subfolder = 'Medical-Certificates';
    } else if (documentType === 'helperLicense') {
      subfolder = 'Helper-Licenses';
    }
    
    // Construct the relative path
    const relativePath = `Helper-Documents/${subfolder}/${filename}`;
    
    // Create the API URL - encode each part
    const encodedPath = relativePath.split('/').map(part => encodeURIComponent(part)).join('/');
    const apiUrl = `${baseURL}/api/documents/view/${encodedPath}`;
    
    // Open in new tab
    window.open(apiUrl, '_blank');
  } catch (error) {
    console.error('❌ Error viewing document:', error);
    setError('Failed to view document. Please try again.');
  }
};
```

**What it does:**
- Gets document metadata from state
- Builds correct subfolder path based on document type
- Constructs API URL with proper encoding
- Opens document in new browser tab

#### **3. Updated Existing Document Display (All 4 Document Types)**

**Before:**
```javascript
{existingDocuments.validId && !uploadedFiles.validId && (
  <div className="existing-file">
    <div className="existing-file-info">
      <div className="existing-file-icon">🪪</div>
      <div className="existing-file-name">Current: {existingDocuments.validId.originalName}</div>
    </div>
    <button
      type="button"
      onClick={() => window.open(`${baseURL}/api/admin/helpers/${id}/documents/validId`, '_blank')}
      className="file-view-btn"
    >
      View
    </button>
  </div>
)}
```

**After:**
```javascript
{existingDocuments.validId && !uploadedFiles.validId && (
  <div className="existing-file">
    <div className="existing-file-info">
      <div className="existing-file-icon">🪪</div>
      <div className="existing-file-name">Current: {existingDocuments.validId.originalName}</div>
    </div>
    <div className="existing-file-actions">
      <button
        type="button"
        onClick={() => handleViewDocument('validId')}
        className="file-view-btn"
      >
        View
      </button>
      <button
        type="button"
        onClick={() => handleReplaceDocument('validId')}
        className="file-replace-btn"
      >
        Replace
      </button>
    </div>
  </div>
)}
```

**Applied to all 4 documents:**
- ✅ Valid ID
- ✅ Barangay Clearance
- ✅ Medical Certificate
- ✅ Helper License

---

## 🎨 Styling (Already in ModernForms.css)

The styles are already present in `ModernForms.css`:

```css
/* Existing file actions container */
.existing-file-actions {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
}

/* View button */
.file-view-btn {
  background-color: var(--primary-color);
  color: var(--white);
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

/* Replace button */
.file-replace-btn {
  background-color: var(--warning-color);
  color: var(--white);
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}
```

---

## 🎯 How It Works

### **Viewing Documents**

1. User clicks **"View"** button
2. `handleViewDocument` gets document metadata
3. Constructs correct file path: `Helper-Documents/[Subfolder]/[Filename]`
4. Opens document in new browser tab via `/api/documents/view/...`
5. Document displays (PDF inline, images show)

### **Replacing Documents**

1. User clicks **"Replace"** button
2. `handleReplaceDocument` hides existing document display
3. File input picker opens automatically
4. User selects new file
5. New file preview shows in place of existing document
6. User clicks "Update Helper" to save
7. New file uploads and replaces old one in database

### **Document Flow**

```
┌─────────────────────────────────────────────────────┐
│  Edit Helper Page                                   │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Valid ID:                                          │
│  ┌──────────────────────────────────────────────┐  │
│  │ 🪪 Current: Act1.png                         │  │
│  │                                               │  │
│  │  [View]  [Replace]  ← Two buttons           │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  When "Replace" clicked:                            │
│  ┌──────────────────────────────────────────────┐  │
│  │ 🪪 new-id.pdf             [❌]              │  │
│  └──────────────────────────────────────────────┘  │
│  ↑ Shows new file preview                          │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 🔍 Comparison: Before vs After

### **Before**
- ❌ Only "View" button
- ❌ Couldn't replace document without manual deletion
- ❌ Had to delete helper and re-create to change documents

### **After**
- ✅ Both "View" and "Replace" buttons
- ✅ Click Replace → file picker opens → select new file
- ✅ New file previews immediately
- ✅ Save to upload new document
- ✅ Exactly like driver document management

---

## 📝 Technical Details

### **Document Type to Subfolder Mapping**

| Document Type | Subfolder | Example Path |
|--------------|-----------|--------------|
| `validId` | `Valid-IDs` | `Helper-Documents/Valid-IDs/HelperXYZ_VALID-ID.pdf` |
| `barangayClearance` | `Barangay-Clearances` | `Helper-Documents/Barangay-Clearances/HelperXYZ_BARANGAY.pdf` |
| `medicalCertificate` | `Medical-Certificates` | `Helper-Documents/Medical-Certificates/HelperXYZ_MEDICAL.pdf` |
| `helperLicense` | `Helper-Licenses` | `Helper-Documents/Helper-Licenses/HelperXYZ_HELPER-LICENSE.pdf` |

### **API Endpoint Used**
```
GET /api/documents/view/Helper-Documents/[Subfolder]/[Filename]
```

Example:
```
GET /api/documents/view/Helper-Documents/Valid-IDs/HelperABC123_VALID-ID.pdf
```

### **State Management**

The component uses two key state variables:

```javascript
const [existingDocuments, setExistingDocuments] = useState({
  validId: null,
  barangayClearance: null,
  medicalCertificate: null,
  helperLicense: null
});

const [uploadedFiles, setUploadedFiles] = useState({});
```

**Logic:**
- If `existingDocuments.validId` exists AND `uploadedFiles.validId` is null → Show existing file with View/Replace
- If `uploadedFiles.validId` exists → Show new file preview with Remove button
- Otherwise → Show upload zone

---

## ✅ Testing Checklist

- [ ] **View Button Works**
  - Click "View" on each document type
  - Document opens in new tab
  - PDF shows inline, images display

- [ ] **Replace Button Works**
  - Click "Replace" on existing document
  - File picker opens
  - Select new file
  - New file preview appears
  - Old document display is hidden

- [ ] **Upload New Document**
  - Click "Update Helper"
  - Check server console for upload logs
  - Document saves to correct subfolder
  - Refresh page - new document shows

- [ ] **Multiple Document Types**
  - Test all 4 document types independently
  - Can replace one without affecting others

---

## 🎉 Result

Helpers now have the **exact same document management experience** as drivers:

| Feature | Drivers | Helpers |
|---------|---------|---------|
| View Button | ✅ | ✅ |
| Replace Button | ✅ | ✅ |
| File Preview | ✅ | ✅ |
| Organized Subfolders | ✅ | ✅ |
| Open in New Tab | ✅ | ✅ |

---

*Date: January 16, 2025*  
*Updated By: Cascade AI Assistant*
