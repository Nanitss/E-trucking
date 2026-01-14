import React, { useState, useEffect } from 'react';

const ClientForm = ({ client, onSubmit, isEditMode }) => {
  const [formData, setFormData] = useState({
    ClientName: '',
    ClientNumber: '',
    ClientEmail: '',
    ClientPassword: '',
    ClientStatus: 'active'
  });

  const [passwordVisible, setPasswordVisible] = useState(false);

  useEffect(() => {
    if (client && isEditMode) {
      setFormData({
        ClientName: client.ClientName || '',
        ClientNumber: client.ClientNumber || '',
        ClientEmail: client.ClientEmail || '',
        ClientPassword: '',
        ClientStatus: client.ClientStatus || 'active'
      });
    }
  }, [client, isEditMode]);

  const onChange = e => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = e => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="ClientName">Client Name *</label>
          <input
            type="text"
            id="ClientName"
            name="ClientName"
            className="form-control"
            value={formData.ClientName}
            onChange={onChange}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="ClientNumber">Contact Number *</label>
          <input
            type="text"
            id="ClientNumber"
            name="ClientNumber"
            className="form-control"
            value={formData.ClientNumber}
            onChange={onChange}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="ClientEmail">Email * (will be used for login)</label>
        <input
          type="email"
          id="ClientEmail"
          name="ClientEmail"
          className="form-control"
          value={formData.ClientEmail}
          onChange={onChange}
          required
          disabled={isEditMode} // Email cannot be changed in edit mode as it's used for login
        />
        {isEditMode && (
          <small className="form-text text-muted">
            Email cannot be changed as it is used for client login.
          </small>
        )}
      </div>

      {!isEditMode && (
        <div className="form-group">
          <label className="form-label" htmlFor="ClientPassword">Password *</label>
          <div className="password-input">
            <input
              type={passwordVisible ? "text" : "password"}
              id="ClientPassword"
              name="ClientPassword"
              className="form-control"
              value={formData.ClientPassword}
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

      <div className="form-group">
        <label className="form-label" htmlFor="ClientStatus">Status</label>
        <select
          id="ClientStatus"
          name="ClientStatus"
          className="form-select"
          value={formData.ClientStatus}
          onChange={onChange}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">
          {isEditMode ? 'Update Client' : 'Create Client'}
        </button>
      </div>
    </form>
  );
};

export default ClientForm;