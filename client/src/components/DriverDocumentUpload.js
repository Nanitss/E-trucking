import React, { useState, useEffect } from 'react';
import EnhancedFileUpload from './EnhancedFileUpload';

const DriverDocumentUpload = ({ 
  driverId, 
  driverName,
  onUploadSuccess = () => {},
  onUploadError = () => {},
  showFileList = true 
}) => {
  const [identifier, setIdentifier] = useState('');

  // Set identifier based on driver ID or name
  useEffect(() => {
    if (driverId) {
      setIdentifier(`driver_${driverId}`);
    } else if (driverName) {
      setIdentifier(driverName.replace(/[^a-zA-Z0-9]/g, ''));
    }
  }, [driverId, driverName]);

  const handleUploadSuccess = (files) => {
    console.log('Driver document upload successful:', files);
    onUploadSuccess(files);
  };

  const handleUploadError = (error) => {
    console.error('Driver document upload error:', error);
    onUploadError(error);
  };

  return (
    <div className="driver-document-upload">
      <h4>Driver Documents</h4>
      <p>Upload required documents for driver: <strong>{driverName || driverId}</strong></p>
      
      <div style={{ marginBottom: '20px' }}>
        <h5>ID Photo</h5>
        <EnhancedFileUpload
          documentType="Driver-Documents"
          subFolder="ID-Photos"
          identifier={identifier}
          onUploadSuccess={handleUploadSuccess}
          onUploadError={handleUploadError}
          showFileList={showFileList}
          allowMultiple={false}
          acceptedTypes=".jpg,.jpeg,.png"
          maxFileSize={10 * 1024 * 1024}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h5>Driver's License</h5>
        <EnhancedFileUpload
          documentType="Driver-Documents"
          subFolder="Licenses"
          identifier={identifier}
          onUploadSuccess={handleUploadSuccess}
          onUploadError={handleUploadError}
          showFileList={showFileList}
          allowMultiple={false}
          acceptedTypes=".pdf,.jpg,.jpeg,.png"
          maxFileSize={25 * 1024 * 1024}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h5>Medical Certificate</h5>
        <EnhancedFileUpload
          documentType="Driver-Documents"
          subFolder="Medical-Certificates"
          identifier={identifier}
          onUploadSuccess={handleUploadSuccess}
          onUploadError={handleUploadError}
          showFileList={showFileList}
          allowMultiple={false}
          acceptedTypes=".pdf,.jpg,.jpeg,.png"
          maxFileSize={25 * 1024 * 1024}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h5>NBI Clearance</h5>
        <EnhancedFileUpload
          documentType="Driver-Documents"
          subFolder="NBI-Clearances"
          identifier={identifier}
          onUploadSuccess={handleUploadSuccess}
          onUploadError={handleUploadError}
          showFileList={showFileList}
          allowMultiple={false}
          acceptedTypes=".pdf,.jpg,.jpeg,.png"
          maxFileSize={25 * 1024 * 1024}
        />
      </div>
    </div>
  );
};

export default DriverDocumentUpload;
