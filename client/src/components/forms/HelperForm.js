import React, { useState, useEffect } from 'react';

const HelperForm = ({ helper, onSubmit, isEditMode }) => {
  const [formData, setFormData] = useState({
    HelperName: '',
    HelperAddress: '',
    HelperNumber: '',
    HelperEmploymentDate: '',
    HelperUserName: '',
    HelperPassword: '',
    HelperStatus: 'active',
    document: null
  });

  const [documentName, setDocumentName] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);

  useEffect(() => {
    if (helper && isEditMode) {
      // Format date for input field (YYYY-MM-DD)
      const formattedDate = helper.HelperEmploymentDate 
      ? new Date(helper.HelperEmploymentDate).toISOString().split('T')[0]
      : '';
      
    setFormData({
      HelperName: helper.HelperName || '',
      HelperAddress: helper.HelperAddress || '',
      HelperNumber: helper.HelperNumber || '',
      HelperEmploymentDate: formattedDate,
      HelperUserName: helper.HelperUserName || '',
      HelperPassword: '',
      HelperStatus: helper.HelperStatus || 'active',
      document: null
    });
    
    if (helper.HelperDocuments) {
      const documentParts = helper.HelperDocuments.split('/');
      setDocumentName(documentParts[documentParts.length - 1]);
    }
  }
}, [helper, isEditMode]);

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
  data.append('userType', 'helper');
  
  onSubmit(data);
};

return (
  <form onSubmit={handleSubmit}>
    <div className="form-row">
      <div className="form-group">
        <label className="form-label" htmlFor="HelperName">Full Name *</label>
        <input
          type="text"
          id="HelperName"
          name="HelperName"
          className="form-control"
          value={formData.HelperName}
          onChange={onChange}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="HelperNumber">Contact Number *</label>
        <input
          type="text"
          id="HelperNumber"
          name="HelperNumber"
          className="form-control"
          value={formData.HelperNumber}
          onChange={onChange}
          required
        />
      </div>
    </div>

    <div className="form-group">
      <label className="form-label" htmlFor="HelperAddress">Address *</label>
      <input
        type="text"
        id="HelperAddress"
        name="HelperAddress"
        className="form-control"
        value={formData.HelperAddress}
        onChange={onChange}
        required
      />
    </div>

    <div className="form-row">
      <div className="form-group">
        <label className="form-label" htmlFor="HelperEmploymentDate">Employment Date *</label>
        <input
          type="date"
          id="HelperEmploymentDate"
          name="HelperEmploymentDate"
          className="form-control"
          value={formData.HelperEmploymentDate}
          onChange={onChange}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="HelperStatus">Status</label>
        <select
          id="HelperStatus"
          name="HelperStatus"
          className="form-select"
          value={formData.HelperStatus}
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
        <label className="form-label" htmlFor="HelperUserName">Username *</label>
        <input
          type="text"
          id="HelperUserName"
          name="HelperUserName"
          className="form-control"
          value={formData.HelperUserName}
          onChange={onChange}
          required
          disabled={isEditMode} // Username cannot be changed in edit mode
        />
      </div>

      {!isEditMode && (
        <div className="form-group">
          <label className="form-label" htmlFor="HelperPassword">Password *</label>
          <div className="password-input">
            <input
              type={passwordVisible ? "text" : "password"}
              id="HelperPassword"
              name="HelperPassword"
              className="form-control"
              value={formData.HelperPassword}
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
      <label className="form-label" htmlFor="document">Documents</label>
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
            {helper?.HelperDocuments && (
              <a 
                href={`/uploads/${helper.HelperDocuments}`} 
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
        {isEditMode ? 'Update Helper' : 'Create Helper'}
      </button>
    </div>
  </form>
);
};

export default HelperForm;