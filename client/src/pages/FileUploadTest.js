import React, { useState } from 'react';
import EnhancedFileUpload from '../components/EnhancedFileUpload';

const FileUploadTest = () => {
  const [selectedType, setSelectedType] = useState('general');
  const [selectedSubFolder, setSelectedSubFolder] = useState('');
  const [identifier, setIdentifier] = useState('');

  const documentTypes = [
    { value: 'general', label: 'General Files' },
    { value: 'Truck-Documents', label: 'Truck Documents' },
    { value: 'Driver-Documents', label: 'Driver Documents' },
    { value: 'Client-Documents', label: 'Client Documents' },
    { value: 'Helper-Documents', label: 'Helper Documents' }
  ];

  const subFolders = {
    'Truck-Documents': ['OR-CR-Files', 'Insurance-Papers', 'License-Documents'],
    'Driver-Documents': ['ID-Photos', 'Licenses', 'Medical-Certificates', 'NBI-Clearances'],
    'Client-Documents': ['Business-Permits', 'Contracts', 'Valid-IDs', 'Tax-Certificates'],
    'Helper-Documents': ['ID-Photos', 'Licenses', 'Medical-Certificates', 'NBI-Clearances'],
    'general': ['documents', 'images', 'files']
  };

  const handleUploadSuccess = (files) => {
    console.log('Upload successful:', files);
    alert(`Successfully uploaded ${files.length} file(s)!`);
  };

  const handleUploadError = (error) => {
    console.error('Upload error:', error);
    alert('Upload failed. Please check the console for details.');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Enhanced File Upload Test</h1>
      
      <div style={{ 
        background: '#f8f9fa', 
        padding: '20px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        border: '1px solid #dee2e6'
      }}>
        <h3>Upload Configuration</h3>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Document Type:
          </label>
          <select 
            value={selectedType} 
            onChange={(e) => {
              setSelectedType(e.target.value);
              setSelectedSubFolder(''); // Reset subfolder when type changes
            }}
            style={{ 
              padding: '8px', 
              borderRadius: '4px', 
              border: '1px solid #ccc',
              width: '200px'
            }}
          >
            {documentTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Sub Folder:
          </label>
          <select 
            value={selectedSubFolder} 
            onChange={(e) => setSelectedSubFolder(e.target.value)}
            style={{ 
              padding: '8px', 
              borderRadius: '4px', 
              border: '1px solid #ccc',
              width: '200px'
            }}
          >
            <option value="">Select subfolder...</option>
            {subFolders[selectedType]?.map(folder => (
              <option key={folder} value={folder}>
                {folder}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Identifier (for file replacement):
          </label>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="e.g., truck123, driver456"
            style={{ 
              padding: '8px', 
              borderRadius: '4px', 
              border: '1px solid #ccc',
              width: '200px'
            }}
          />
          <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
            Files with the same identifier will replace existing files
          </small>
        </div>
      </div>

      <EnhancedFileUpload
        documentType={selectedType}
        subFolder={selectedSubFolder}
        identifier={identifier}
        onUploadSuccess={handleUploadSuccess}
        onUploadError={handleUploadError}
        showFileList={true}
        allowMultiple={true}
        acceptedTypes="*"
        maxFileSize={25 * 1024 * 1024}
      />

      <div style={{ 
        background: '#e9ecef', 
        padding: '15px', 
        borderRadius: '8px', 
        marginTop: '20px',
        fontSize: '14px'
      }}>
        <h4>How to use:</h4>
        <ul>
          <li><strong>Document Type:</strong> Select the main category for your files</li>
          <li><strong>Sub Folder:</strong> Choose a specific subfolder within the document type</li>
          <li><strong>Identifier:</strong> Optional. If provided, new files will replace existing files with the same identifier</li>
          <li><strong>File Upload:</strong> Select files and click upload</li>
          <li><strong>File Management:</strong> View existing files, download them, or delete them</li>
        </ul>
        
        <h4>Features:</h4>
        <ul>
          <li>✅ Files are saved to the correct uploads folder structure</li>
          <li>✅ File replacement when using identifiers</li>
          <li>✅ File viewing and downloading</li>
          <li>✅ File deletion</li>
          <li>✅ File size and type validation</li>
          <li>✅ Organized folder structure</li>
        </ul>
      </div>
    </div>
  );
};

export default FileUploadTest;
