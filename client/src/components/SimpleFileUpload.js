import React from 'react';
import EnhancedFileUpload from './EnhancedFileUpload';

const SimpleFileUpload = () => {
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
      <p>This is now using the enhanced file upload system with better organization and file replacement.</p>
      
      <EnhancedFileUpload
        documentType="general"
        subFolder="test-files"
        onUploadSuccess={handleUploadSuccess}
        onUploadError={handleUploadError}
        showFileList={true}
        allowMultiple={true}
        acceptedTypes="*"
        maxFileSize={25 * 1024 * 1024}
      />
    </div>
  );
};

export default SimpleFileUpload;