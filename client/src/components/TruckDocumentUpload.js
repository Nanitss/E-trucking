import React, { useState, useEffect } from 'react';
import EnhancedFileUpload from './EnhancedFileUpload';

const TruckDocumentUpload = ({ 
  truckPlate, 
  onUploadSuccess = () => {},
  onUploadError = () => {},
  showFileList = true 
}) => {
  const [identifier, setIdentifier] = useState('');

  // Set identifier based on truck plate
  useEffect(() => {
    if (truckPlate) {
      setIdentifier(truckPlate.replace(/[^a-zA-Z0-9]/g, ''));
    }
  }, [truckPlate]);

  const handleUploadSuccess = (files) => {
    console.log('Truck document upload successful:', files);
    onUploadSuccess(files);
  };

  const handleUploadError = (error) => {
    console.error('Truck document upload error:', error);
    onUploadError(error);
  };

  return (
    <div className="truck-document-upload">
      <h4>Truck Documents</h4>
      <p>Upload required documents for truck: <strong>{truckPlate}</strong></p>
      
      <EnhancedFileUpload
        documentType="Truck-Documents"
        subFolder="OR-CR-Files"
        identifier={identifier}
        onUploadSuccess={handleUploadSuccess}
        onUploadError={handleUploadError}
        showFileList={showFileList}
        allowMultiple={true}
        acceptedTypes=".pdf,.jpg,.jpeg,.png"
        maxFileSize={25 * 1024 * 1024}
      />

      <div style={{ marginTop: '20px' }}>
        <h5>Insurance Documents</h5>
        <EnhancedFileUpload
          documentType="Truck-Documents"
          subFolder="Insurance-Papers"
          identifier={identifier}
          onUploadSuccess={handleUploadSuccess}
          onUploadError={handleUploadError}
          showFileList={showFileList}
          allowMultiple={true}
          acceptedTypes=".pdf,.jpg,.jpeg,.png"
          maxFileSize={25 * 1024 * 1024}
        />
      </div>

      <div style={{ marginTop: '20px' }}>
        <h5>License Documents</h5>
        <EnhancedFileUpload
          documentType="Truck-Documents"
          subFolder="License-Documents"
          identifier={identifier}
          onUploadSuccess={handleUploadSuccess}
          onUploadError={handleUploadError}
          showFileList={showFileList}
          allowMultiple={true}
          acceptedTypes=".pdf,.jpg,.jpeg,.png"
          maxFileSize={25 * 1024 * 1024}
        />
      </div>
    </div>
  );
};

export default TruckDocumentUpload;
