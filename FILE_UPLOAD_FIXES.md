# File Upload System Fixes and Enhancements

## Issues Fixed

### 1. **Inconsistent File Paths**
- **Problem**: Different parts of the codebase were using different paths for the uploads folder
- **Solution**: Unified all paths to use `path.join(process.cwd(), 'uploads')` for consistency

### 2. **Files Not Saving to Correct Location**
- **Problem**: Files were being saved to various locations instead of the main uploads folder
- **Solution**: Created a centralized `FileUploadService` that ensures all files are saved to the correct location

### 3. **No File Replacement Logic**
- **Problem**: When users updated files, old files remained and new files were added with different names
- **Solution**: Implemented identifier-based file replacement system

### 4. **Limited File Viewing**
- **Problem**: File viewing functionality was incomplete
- **Solution**: Enhanced file serving with proper content types and security checks

## New Features Added

### 1. **FileUploadService** (`client/server/services/FileUploadService.js`)
- Centralized file management service
- Automatic directory creation
- File replacement logic using identifiers
- File listing and deletion capabilities
- Proper content type detection

### 2. **Enhanced Upload Routes** (`client/server/routes/enhancedUpload.js`)
- New API endpoints for better file management
- File upload with replacement logic
- File listing, viewing, and deletion
- Proper error handling and validation

### 3. **Enhanced React Component** (`client/src/components/EnhancedFileUpload.js`)
- Modern React component for file uploads
- File replacement functionality
- File viewing and deletion
- File size and type validation
- Real-time file list updates

### 4. **Test Page** (`client/src/pages/FileUploadTest.js`)
- Comprehensive test page for file upload functionality
- Configuration options for different document types
- Visual demonstration of all features

## API Endpoints

### Enhanced Upload API (`/api/enhanced-upload/`)

#### Upload Files
```
POST /api/enhanced-upload/upload
Content-Type: multipart/form-data

Body:
- files: File[] (required)
- documentType: string (optional, default: 'general')
- subFolder: string (optional)
- identifier: string (optional, for file replacement)
```

#### List Files
```
GET /api/enhanced-upload/files/:documentType/:subFolder?
```

#### View File
```
GET /api/enhanced-upload/serve/:filePath
```

#### Delete File
```
DELETE /api/enhanced-upload/delete/:filePath
```

#### Get File Info
```
GET /api/enhanced-upload/info/:filePath
```

### Document API (`/api/documents/`)

#### View Document
```
GET /api/documents/view/:filePath
```

#### List Documents
```
GET /api/documents/list/:documentType/:subFolder?
```

#### Get Document Info
```
GET /api/documents/info/:filePath
```

#### Delete Document
```
DELETE /api/documents/delete/:filePath
```

## File Organization Structure

```
uploads/
├── general/
│   ├── documents/
│   ├── images/
│   └── files/
├── Truck-Documents/
│   ├── OR-CR-Files/
│   ├── Insurance-Papers/
│   └── License-Documents/
├── Driver-Documents/
│   ├── ID-Photos/
│   ├── Licenses/
│   ├── Medical-Certificates/
│   └── NBI-Clearances/
├── Client-Documents/
│   ├── Business-Permits/
│   ├── Contracts/
│   ├── Valid-IDs/
│   └── Tax-Certificates/
└── Helper-Documents/
    ├── ID-Photos/
    ├── Licenses/
    ├── Medical-Certificates/
    └── NBI-Clearances/
```

## How to Use

### 1. **Basic File Upload**
```javascript
// Using the EnhancedFileUpload component
<EnhancedFileUpload
  documentType="Truck-Documents"
  subFolder="OR-CR-Files"
  identifier="truck123"
  onUploadSuccess={(files) => console.log('Uploaded:', files)}
  onUploadError={(error) => console.error('Error:', error)}
  showFileList={true}
  allowMultiple={true}
/>
```

### 2. **File Replacement**
When you provide an `identifier`, new files will automatically replace existing files with the same identifier:

```javascript
// First upload
<EnhancedFileUpload identifier="truck123" />

// Second upload with same identifier will replace the first file
<EnhancedFileUpload identifier="truck123" />
```

### 3. **API Usage**
```javascript
// Upload files
const formData = new FormData();
formData.append('files', file);
formData.append('documentType', 'Truck-Documents');
formData.append('subFolder', 'OR-CR-Files');
formData.append('identifier', 'truck123');

const response = await fetch('/api/enhanced-upload/upload', {
  method: 'POST',
  body: formData
});
```

## Testing

### 1. **Access Test Page**
Navigate to `/enhanced-upload-test` in your application to test the file upload functionality.

### 2. **Test Scenarios**
- Upload files to different document types
- Test file replacement with identifiers
- Test file viewing and deletion
- Test file size and type validation

## Security Features

- Path traversal protection
- File type validation
- File size limits (25MB default)
- Secure file serving with proper content types
- Access control for file operations

## Configuration

### Environment Variables
- `DOCUMENT_ROOT`: Override the default uploads directory path
- `REACT_APP_API_URL`: API base URL for the frontend

### File Size Limits
- Default: 25MB per file
- Configurable in the upload middleware

### Accepted File Types
- Default: All types (`*`)
- Configurable per upload component

## Troubleshooting

### Common Issues

1. **Files not saving**: Check that the uploads directory has write permissions
2. **File viewing not working**: Ensure the document routes are properly configured
3. **File replacement not working**: Make sure the identifier is consistent

### Debug Steps

1. Check server logs for upload errors
2. Verify file permissions on the uploads directory
3. Test with the enhanced upload test page
4. Check browser console for client-side errors

## Migration from Old System

The old file upload system is still available at `/api/upload/` for backward compatibility. The new enhanced system is available at `/api/enhanced-upload/`.

To migrate:
1. Update your frontend components to use the new `EnhancedFileUpload` component
2. Update API calls to use the new endpoints
3. Test thoroughly before removing old code

## Future Enhancements

- File compression and optimization
- Cloud storage integration
- Advanced file metadata
- File versioning system
- Bulk file operations
