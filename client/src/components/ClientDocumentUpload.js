import React, { useState, useEffect } from 'react';
import EnhancedFileUpload from './EnhancedFileUpload';

const ClientDocumentUpload = ({ 
  clientId, 
  clientName,
  onUploadSuccess = () => {},
  onUploadError = () => {},
  showFileList = true 
}) => {
  const [identifier, setIdentifier] = useState('');

  // Set identifier based on client ID or name
  useEffect(() => {
    if (clientId) {
      setIdentifier(`client_${clientId}`);
    } else if (clientName) {
      setIdentifier(clientName.replace(/[^a-zA-Z0-9]/g, ''));
    }
  }, [clientId, clientName]);

  const handleUploadSuccess = (files) => {
    console.log('Client document upload successful:', files);
    onUploadSuccess(files);
  };

  const handleUploadError = (error) => {
    console.error('Client document upload error:', error);
    onUploadError(error);
  };

  return (
    <div className="client-document-upload">
      <h4>Client Documents</h4>
      <p>Upload required documents for client: <strong>{clientName || clientId}</strong></p>
      
      <div style={{ marginBottom: '20px' }}>
        <h5>Business Permit</h5>
        <EnhancedFileUpload
          documentType="Client-Documents"
          subFolder="Business-Permits"
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
        <h5>Service Contract</h5>
        <EnhancedFileUpload
          documentType="Client-Documents"
          subFolder="Contracts"
          identifier={identifier}
          onUploadSuccess={handleUploadSuccess}
          onUploadError={handleUploadError}
          showFileList={showFileList}
          allowMultiple={false}
          acceptedTypes=".pdf,.doc,.docx"
          maxFileSize={25 * 1024 * 1024}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h5>Valid ID</h5>
        <EnhancedFileUpload
          documentType="Client-Documents"
          subFolder="Valid-IDs"
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
        <h5>Tax Certificate</h5>
        <EnhancedFileUpload
          documentType="Client-Documents"
          subFolder="Tax-Certificates"
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

export default ClientDocumentUpload;
