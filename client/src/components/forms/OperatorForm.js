import React, { useState, useEffect } from 'react';

const OperatorForm = ({ operator, onSubmit, isEditMode }) => {
  const [formData, setFormData] = useState({
    OperatorName: '',
    OperatorAddress: '',
    OperatorNumber: '',
    OperatorEmploymentDate: '',
    OperatorUserName: '',
    OperatorPassword: '',
    OperatorStatus: 'active',
    document: null
  });

  const [documentName, setDocumentName] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);

  useEffect(() => {
    if (operator && isEditMode) {
      // Format date for input field (YYYY-MM-DD)
      const formattedDate = operator.OperatorEmploymentDate 
        ? new Date(operator.OperatorEmploymentDate).toISOString().split('T')[0]
        : '';
        
      setFormData({
        OperatorName: operator.OperatorName || '',
        OperatorAddress: operator.OperatorAddress || '',
        OperatorNumber: operator.OperatorNumber || '',
        OperatorEmploymentDate: formattedDate,
        OperatorUserName: operator.OperatorUserName || '',
        OperatorPassword: '',
        OperatorStatus: operator.OperatorStatus || 'active',
        document: null
      });
      
      if (operator.OperatorDocuments) {
        const documentParts = operator.OperatorDocuments.split('/');
        setDocumentName(documentParts[documentParts.length - 1]);
      }
    }
  }, [operator, isEditMode]);

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
    data.append('userType', 'operator');
    
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="OperatorName">Full Name *</label>
          <input
            type="text"
            id="OperatorName"
            name="OperatorName"
            className="form-control"
            value={formData.OperatorName}
            onChange={onChange}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="OperatorNumber">Contact Number *</label>
          <input
            type="text"
            id="OperatorNumber"
            name="OperatorNumber"
            className="form-control"
            value={formData.OperatorNumber}
            onChange={onChange}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="OperatorAddress">Address *</label>
        <input
          type="text"
          id="OperatorAddress"
          name="OperatorAddress"
          className="form-control"
          value={formData.OperatorAddress}
          onChange={onChange}
          required
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="OperatorEmploymentDate">Employment Date *</label>
          <input
            type="date"
            id="OperatorEmploymentDate"
            name="OperatorEmploymentDate"
            className="form-control"
            value={formData.OperatorEmploymentDate}
            onChange={onChange}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="OperatorStatus">Status</label>
          <select
            id="OperatorStatus"
            name="OperatorStatus"
            className="form-select"
            value={formData.OperatorStatus}
            onChange={onChange}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="OperatorUserName">Username *</label>
          <input
            type="text"
            id="OperatorUserName"
            name="OperatorUserName"
            className="form-control"
            value={formData.OperatorUserName}
            onChange={onChange}
            required
            disabled={isEditMode} // Username cannot be changed in edit mode
          />
        </div>

        {!isEditMode && (
          <div className="form-group">
            <label className="form-label" htmlFor="OperatorPassword">Password *</label>
            <div className="password-input">
              <input
                type={passwordVisible ? "text" : "password"}
                id="OperatorPassword"
                name="OperatorPassword"
                className="form-control"
                value={formData.OperatorPassword}
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
              {operator?.OperatorDocuments && (
                <a 
                  href={`/uploads/${operator.OperatorDocuments}`} 
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
          {isEditMode ? 'Update Operator' : 'Create Operator'}
        </button>
      </div>
    </form>
  );
};

export default OperatorForm;