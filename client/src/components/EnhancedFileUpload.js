import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const EnhancedFileUpload = ({
  documentType = 'general',
  subFolder = '',
  identifier = '',
  onUploadSuccess = () => { },
  onUploadError = () => { },
  showFileList = true,
  allowMultiple = true,
  acceptedTypes = '*',
  maxFileSize = 25 * 1024 * 1024 // 25MB
}) => {
  const [files, setFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [existingFiles, setExistingFiles] = useState([]);

  const baseURL = API_BASE_URL;

  // Fetch existing files when component mounts
  useEffect(() => {
    if (showFileList) {
      fetchExistingFiles();
    }
  }, [documentType, subFolder]);

  const fetchExistingFiles = async () => {
    try {
      const response = await axios.get(`${baseURL}/api/upload/files/${documentType}/${subFolder}`);
      if (response.data.success) {
        setExistingFiles(response.data.files);
      }
    } catch (error) {
      console.error('Error fetching existing files:', error);
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);

    // Validate file size
    const oversizedFiles = selectedFiles.filter(file => file.size > maxFileSize);
    if (oversizedFiles.length > 0) {
      setMessage(`Some files are too large. Maximum size: ${Math.round(maxFileSize / 1024 / 1024)}MB`);
      return;
    }

    // Validate file types if specified
    if (acceptedTypes !== '*') {
      const allowedTypes = acceptedTypes.split(',').map(type => type.trim());
      const invalidFiles = selectedFiles.filter(file => {
        const fileType = file.type;
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        return !allowedTypes.some(type =>
          type.startsWith('.') ? type === fileExtension : fileType.includes(type)
        );
      });

      if (invalidFiles.length > 0) {
        setMessage(`Some files have invalid types. Allowed: ${acceptedTypes}`);
        return;
      }
    }

    setFiles(selectedFiles);
    setMessage('');
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setMessage('Please select files to upload');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      // Add metadata
      formData.append('documentType', documentType);
      formData.append('subFolder', subFolder);
      if (identifier) {
        formData.append('identifier', identifier);
      }

      console.log('📤 Uploading files:', files.map(f => f.name));
      console.log('📤 Document Type:', documentType);
      console.log('📤 Sub Folder:', subFolder);
      console.log('📤 Identifier:', identifier);

      const response = await axios.post(`${baseURL}/api/upload/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      console.log('✅ Upload response:', response.data);

      if (response.data.success) {
        setMessage('Files uploaded successfully!');
        setUploadedFiles(response.data.files);
        setFiles([]);

        // Reset file input
        const fileInput = document.getElementById('fileInput');
        if (fileInput) fileInput.value = '';

        // Fetch updated file list
        if (showFileList) {
          fetchExistingFiles();
        }

        // Call success callback
        onUploadSuccess(response.data.files);
      } else {
        setMessage(`Upload failed: ${response.data.message}`);
        onUploadError(response.data);
      }

    } catch (error) {
      console.error('❌ Upload error:', error);
      const errorMessage = error.response?.data?.message || error.message;
      setMessage(`Upload failed: ${errorMessage}`);
      onUploadError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileDelete = async (filePath) => {
    if (!window.confirm('Are you sure you want to delete this file?')) {
      return;
    }

    try {
      const response = await axios.delete(`${baseURL}/api/upload/delete/${encodeURIComponent(filePath)}`);

      if (response.data.success) {
        setMessage('File deleted successfully');
        fetchExistingFiles(); // Refresh file list
      } else {
        setMessage(`Delete failed: ${response.data.message}`);
      }
    } catch (error) {
      console.error('❌ Delete error:', error);
      setMessage(`Delete failed: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleFileView = (filePath) => {
    const viewUrl = `${baseURL}/api/upload/serve/${encodeURIComponent(filePath)}`;
    window.open(viewUrl, '_blank');
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString();
  };

  return (
    <div className="enhanced-file-upload">
      <div className="upload-section">
        <h3>File Upload</h3>

        <div className="file-input-container">
          <input
            id="fileInput"
            type="file"
            multiple={allowMultiple}
            onChange={handleFileChange}
            accept={acceptedTypes === '*' ? undefined : acceptedTypes}
            style={{ marginBottom: '10px' }}
          />
        </div>

        {files.length > 0 && (
          <div className="selected-files">
            <h4>Selected Files:</h4>
            <ul>
              {files.map((file, index) => (
                <li key={index}>
                  {file.name} ({formatFileSize(file.size)})
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="upload-controls">
          <button
            onClick={handleUpload}
            disabled={loading || files.length === 0}
            className="upload-btn"
          >
            {loading ? 'Uploading...' : 'Upload Files'}
          </button>
        </div>

        {message && (
          <div className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}
      </div>

      {showFileList && (
        <div className="file-list-section">
          <h3>Existing Files</h3>

          {existingFiles.length === 0 ? (
            <p>No files found</p>
          ) : (
            <div className="file-list">
              {existingFiles.map((file, index) => (
                <div key={index} className="file-item">
                  <div className="file-info">
                    <span className="file-name">{file.filename}</span>
                    <span className="file-size">{formatFileSize(file.size)}</span>
                    <span className="file-date">{formatDate(file.modified)}</span>
                  </div>

                  <div className="file-actions">
                    <button
                      onClick={() => handleFileView(file.relativePath)}
                      className="view-btn"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleFileDelete(file.relativePath)}
                      className="delete-btn"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .enhanced-file-upload {
          max-width: 800px;
          margin: 20px auto;
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: #f9f9f9;
        }

        .upload-section, .file-list-section {
          margin-bottom: 30px;
        }

        .file-input-container {
          margin-bottom: 15px;
        }

        .selected-files {
          background: #e8f4fd;
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 15px;
        }

        .selected-files ul {
          margin: 5px 0;
          padding-left: 20px;
        }

        .upload-controls {
          margin-bottom: 15px;
        }

        .upload-btn {
          background: #007bff;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
        }

        .upload-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .message {
          padding: 10px;
          border-radius: 4px;
          margin-top: 10px;
        }

        .message.success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .message.error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .file-list {
          max-height: 400px;
          overflow-y: auto;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .file-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          border-bottom: 1px solid #eee;
        }

        .file-item:last-child {
          border-bottom: none;
        }

        .file-info {
          flex: 1;
        }

        .file-name {
          font-weight: bold;
          display: block;
          margin-bottom: 2px;
        }

        .file-size, .file-date {
          font-size: 0.9em;
          color: #666;
          margin-right: 10px;
        }

        .file-actions {
          display: flex;
          gap: 5px;
        }

        .view-btn, .delete-btn {
          padding: 5px 10px;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          font-size: 0.9em;
        }

        .view-btn {
          background: #28a745;
          color: white;
        }

        .delete-btn {
          background: #dc3545;
          color: white;
        }

        .view-btn:hover, .delete-btn:hover {
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
};

export default EnhancedFileUpload;
