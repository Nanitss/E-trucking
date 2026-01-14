import React, { useState, useEffect } from 'react';

const DriverForm = ({ driver, onSubmit, isEditMode }) => {
  const [formData, setFormData] = useState({
    DriverName: '',
    DriverAddress: '',
    DriverNumber: '',
    DriverEmploymentDate: '',
    DriverUserName: '',
    DriverPassword: '',
    DriverStatus: 'active',
    document: null
  });

  const [documentName, setDocumentName] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);

  useEffect(() => {
    if (driver && isEditMode) {
      // Format date for input field (YYYY-MM-DD)
      const formattedDate = driver.DriverEmploymentDate 
        ? new Date(driver.DriverEmploymentDate).toISOString().split('T')[0]
        : '';
        
      setFormData({
        DriverName: driver.DriverName || '',
        DriverAddress: driver.DriverAddress || '',
        DriverNumber: driver.DriverNumber || '',
        DriverEmploymentDate: formattedDate,
        DriverUserName: driver.DriverUserName || '',
        DriverPassword: '',
        DriverStatus: driver.DriverStatus || 'active',
        document: null
      });
      
      if (driver.DriverDocuments) {
        const documentParts = driver.DriverDocuments.split('/');
        setDocumentName(documentParts[documentParts.length - 1]);
      }
    }
  }, [driver, isEditMode]);

  const onChange = e => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const onFileChange = e => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      setFormData({ ...formData, document: file });
      setDocumentName(file.name);
    }
  };

  const handleSubmit = e => {
    e.preventDefault();
    
    const data = new FormData();
    
    // Append all form fields to FormData
    Object.keys(formData).forEach(key => {
      if (key === 'document' && formData[key]) {
        data.append('document', formData[key]);
      } else if (key !== 'document') {
        data.append(key, formData[key]);
      }
    });
    
    // Add user type for document upload
    data.append('userType', 'driver');
    
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="DriverName">Full Name *</label>
          <input
            type="text"
            id="DriverName"
            name="DriverName"
            className="form-control"
            value={formData.DriverName}
            onChange={onChange}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="DriverNumber">Contact Number *</label>
          <input
            type="text"
            id="DriverNumber"
            name="DriverNumber"
            className="form-control"
            value={formData.DriverNumber}
            onChange={onChange}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="DriverAddress">Address *</label>
        <input
          type="text"
          id="DriverAddress"
          name="DriverAddress"
          className="form-control"
          value={formData.DriverAddress}
          onChange={onChange}
          required
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="DriverEmploymentDate">Employment Date *</label>
          <input
            type="date"
            id="DriverEmploymentDate"
            name="DriverEmploymentDate"
            className="form-control"
            value={formData.DriverEmploymentDate}
            onChange={onChange}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="DriverStatus">Status</label>
          <select
            id="DriverStatus"
            name="DriverStatus"
            className="form-select"
            value={formData.DriverStatus}
            onChange={onChange}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="on-delivery">On Delivery</option>
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="DriverUserName">Username *</label>
          <input
            type="text"
            id="DriverUserName"
            name="DriverUserName"
            className="form-control"
            value={formData.DriverUserName}
            onChange={onChange}
            required
            disabled={isEditMode} // Username cannot be changed in edit mode
          />
        </div>

        {!isEditMode && (
          <div className="form-group">
            <label className="form-label" htmlFor="DriverPassword">Password *</label>
            <div className="password-input">
              <input
                type={passwordVisible ? "text" : "password"}
                id="DriverPassword"
                name="DriverPassword"
                className="form-control"
                value={formData.DriverPassword}
                onChange={onChange}
                required={!isEditMode}
              />
              <button 
                type="button" 
                className="toggle-password"
                onClick={() => setPasswordVisible(!passwordVisible)}
              >
                {passwordVisible ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="document">Documents (License, Certifications)</label>
        <div className="file-input">
          <input
            type="file"
            id="document"
            name="document"
            onChange={onFileChange}
            className="form-control"
          />
          {documentName && (
            <div className="file-info">
              Current document: {documentName}
              {driver?.DriverDocuments && (
                <a 
                  href={`/uploads/${driver.DriverDocuments}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="view-document"
                >
                  View
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">
          {isEditMode ? 'Update Driver' : 'Create Driver'}
        </button>
      </div>
    </form>
  );
};

export default DriverForm;