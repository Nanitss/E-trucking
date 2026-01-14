import React, { useState, useEffect } from 'react';

const StaffForm = ({ staff, onSubmit, isEditMode }) => {
  const [formData, setFormData] = useState({
    StaffName: '',
    StaffAddress: '',
    StaffNumber: '',
    StaffDepartment: '',
    StaffEmploymentDate: '',
    StaffUserName: '',
    StaffPassword: '',
    StaffStatus: 'active',
    document: null
  });

  const [documentName, setDocumentName] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);

  useEffect(() => {
    if (staff && isEditMode) {
      // Format date for input field (YYYY-MM-DD)
      const formattedDate = staff.StaffEmploymentDate 
        ? new Date(staff.StaffEmploymentDate).toISOString().split('T')[0]
        : '';
        
      setFormData({
        StaffName: staff.StaffName || '',
        StaffAddress: staff.StaffAddress || '',
        StaffNumber: staff.StaffNumber || '',
        StaffDepartment: staff.StaffDepartment || '',
        StaffEmploymentDate: formattedDate,
        StaffUserName: staff.StaffUserName || '',
        StaffPassword: '',
        StaffStatus: staff.StaffStatus || 'active',
        document: null
      });
      
      if (staff.StaffDocuments) {
        const documentParts = staff.StaffDocuments.split('/');
        setDocumentName(documentParts[documentParts.length - 1]);
      }
    }
  }, [staff, isEditMode]);

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
    data.append('userType', 'staff');
    
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="StaffName">Full Name *</label>
          <input
            type="text"
            id="StaffName"
            name="StaffName"
            className="form-control"
            value={formData.StaffName}
            onChange={onChange}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="StaffDepartment">Department *</label>
          <input
            type="text"
            id="StaffDepartment"
            name="StaffDepartment"
            className="form-control"
            value={formData.StaffDepartment}
            onChange={onChange}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="StaffAddress">Address *</label>
        <input
          type="text"
          id="StaffAddress"
          name="StaffAddress"
          className="form-control"
          value={formData.StaffAddress}
          onChange={onChange}
          required
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="StaffNumber">Contact Number *</label>
          <input
            type="text"
            id="StaffNumber"
            name="StaffNumber"
            className="form-control"
            value={formData.StaffNumber}
            onChange={onChange}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="StaffEmploymentDate">Employment Date *</label>
          <input
            type="date"
            id="StaffEmploymentDate"
            name="StaffEmploymentDate"
            className="form-control"
            value={formData.StaffEmploymentDate}
            onChange={onChange}
            required
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="StaffUserName">Username *</label>
          <input
            type="text"
            id="StaffUserName"
            name="StaffUserName"
            className="form-control"
            value={formData.StaffUserName}
            onChange={onChange}
            required
            disabled={isEditMode} // Username cannot be changed in edit mode
          />
        </div>

        {!isEditMode && (
          <div className="form-group">
            <label className="form-label" htmlFor="StaffPassword">Password *</label>
            <div className="password-input">
              <input
                type={passwordVisible ? "text" : "password"}
                id="StaffPassword"
                name="StaffPassword"
                className="form-control"
                value={formData.StaffPassword}
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

      <div className="form-row">
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
                {staff?.StaffDocuments && (
                  <a 
                    href={`/uploads/${staff.StaffDocuments}`} 
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

        <div className="form-group">
          <label className="form-label" htmlFor="StaffStatus">Status</label>
          <select
            id="StaffStatus"
            name="StaffStatus"
            className="form-select"
            value={formData.StaffStatus}
            onChange={onChange}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">
          {isEditMode ? 'Update Staff' : 'Create Staff'}
        </button>
      </div>
    </form>
  );
};

export default StaffForm;