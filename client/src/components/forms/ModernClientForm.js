import React, { useState, useEffect } from 'react';
import { 
  ModernForm, 
  FormGroup, 
  ModernInput, 
  ModernSelect, 
  FormActions, 
  ModernButton 
} from '../common/ModernForm';

/**
 * Modern Client Form - Using Standardized Design System
 * Preserves your exact navy blue and yellow color scheme
 */
const ModernClientForm = ({ client, onSubmit, isEditMode, onCancel }) => {
  const [formData, setFormData] = useState({
    ClientName: '',
    ClientNumber: '',
    ClientEmail: '',
    ClientPassword: '',
    ClientStatus: 'active'
  });

  const [errors, setErrors] = useState({});
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

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.ClientName.trim()) {
      newErrors.ClientName = 'Client name is required';
    }
    
    if (!formData.ClientNumber.trim()) {
      newErrors.ClientNumber = 'Contact number is required';
    } else if (!/^[\d\s\-\+\(\)]+$/.test(formData.ClientNumber)) {
      newErrors.ClientNumber = 'Please enter a valid phone number';
    }
    
    if (!formData.ClientEmail.trim()) {
      newErrors.ClientEmail = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.ClientEmail)) {
      newErrors.ClientEmail = 'Please enter a valid email address';
    }
    
    if (!isEditMode && !formData.ClientPassword.trim()) {
      newErrors.ClientPassword = 'Password is required';
    } else if (!isEditMode && formData.ClientPassword.length < 6) {
      newErrors.ClientPassword = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  return (
    <ModernForm
      title={isEditMode ? 'Edit Client' : 'Add New Client'}
      subtitle={isEditMode ? 'Update client information' : 'Enter client details to add to your system'}
      onSubmit={handleSubmit}
      gridColumns={2}
    >
      <FormGroup
        label="Client Name"
        required
        error={errors.ClientName}
        help="Enter the full name of the client"
      >
        <ModernInput
          type="text"
          name="ClientName"
          value={formData.ClientName}
          onChange={onChange}
          placeholder="e.g. John Doe"
          required
          error={!!errors.ClientName}
        />
      </FormGroup>

      <FormGroup
        label="Contact Number"
        required
        error={errors.ClientNumber}
        help="Enter the client's phone number"
      >
        <ModernInput
          type="tel"
          name="ClientNumber"
          value={formData.ClientNumber}
          onChange={onChange}
          placeholder="e.g. +63 912 345 6789"
          required
          error={!!errors.ClientNumber}
        />
      </FormGroup>

      <FormGroup
        label="Email Address"
        required
        error={errors.ClientEmail}
        help={isEditMode ? "Email cannot be changed as it's used for login" : "This will be used for client login"}
        className="col-span-2"
      >
        <ModernInput
          type="email"
          name="ClientEmail"
          value={formData.ClientEmail}
          onChange={onChange}
          placeholder="e.g. john.doe@email.com"
          required
          disabled={isEditMode}
          error={!!errors.ClientEmail}
        />
      </FormGroup>

      {!isEditMode && (
        <FormGroup
          label="Password"
          required
          error={errors.ClientPassword}
          help="Minimum 6 characters"
          className="col-span-2"
        >
          <div className="position-relative">
            <ModernInput
              type={passwordVisible ? "text" : "password"}
              name="ClientPassword"
              value={formData.ClientPassword}
              onChange={onChange}
              placeholder="Enter a secure password"
              required
              error={!!errors.ClientPassword}
            />
            <button
              type="button"
              className="position-absolute"
              style={{
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--gray-500)',
                cursor: 'pointer',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)'
              }}
              onClick={togglePasswordVisibility}
            >
              {passwordVisible ? 'Hide' : 'Show'}
            </button>
          </div>
        </FormGroup>
      )}

      <FormGroup
        label="Status"
        help="Current status of the client account"
      >
        <ModernSelect
          name="ClientStatus"
          value={formData.ClientStatus}
          onChange={onChange}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </ModernSelect>
      </FormGroup>

      <FormActions>
        <ModernButton
          type="button"
          variant="secondary"
          onClick={handleCancel}
        >
          Cancel
        </ModernButton>
        <ModernButton
          type="submit"
          variant="primary"
        >
          {isEditMode ? 'Update Client' : 'Create Client'}
        </ModernButton>
      </FormActions>
    </ModernForm>
  );
};

export default ModernClientForm;
