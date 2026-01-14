// src/pages/admin/clients/ClientForm.js - Updated for Firebase

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useHistory, Link } from 'react-router-dom';
import '../../../styles/ModernForms.css';
import '../../../styles/DesignSystem.css';
import './ClientForm.css';

const ClientForm = () => {
  const { id } = useParams();
  const history = useHistory();
  const isEditMode = Boolean(id);
  const [formData, setFormData] = useState({
    businessName: '',
    contactPerson: '',
    contactNumber: '',
    email: '',
    address: '',
    businessType: '',
    registrationDate: '',
    status: 'Active',
    username: '',
    password: '',
    businessPermit: null,
    validId: null,
    serviceContract: null,
    taxCertificate: null
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState({});
  const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5007';

  // Fetch client data when editing
  useEffect(() => {
    const fetchClient = async () => {
      if (!isEditMode) {
        setLoading(false);
        return;
      }

      try {
        console.log(`Fetching client data for ID: ${id}`);
        const response = await axios.get(`${baseURL}/api/clients/${id}`);
        console.log('Client data fetched:', response.data);
        
        const client = response.data;
        setFormData({
          businessName: client.businessName || client.ClientName || '',
          contactPerson: client.contactPerson || client.ContactPerson || '',
          contactNumber: client.contactNumber || client.ContactNumber || '',
          email: client.email || client.Email || '',
          address: client.address || client.Address || '',
          businessType: client.businessType || client.BusinessType || '',
          registrationDate: client.registrationDate || client.RegistrationDate || '',
          status: client.status || client.Status || 'Active',
          username: client.ClientUserName || client.username || '',
          password: '', // Never populate password on edit
          businessPermit: null,
          validId: null,
          serviceContract: null,
          taxCertificate: null
        });
        setLoading(false);
      } catch (err) {
        console.error('Error fetching client:', err);
        setError('Failed to load client data');
        setLoading(false);
      }
    };

    fetchClient();
  }, [id, isEditMode, baseURL]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e, fieldName) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        [fieldName]: file
      }));
      setUploadedFiles(prev => ({
        ...prev,
        [fieldName]: file.name
      }));
    }
  };

  const removeFile = (fieldName) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: null
    }));
    setUploadedFiles(prev => {
      const newFiles = { ...prev };
      delete newFiles[fieldName];
      return newFiles;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const clientData = {
        clientName: formData.businessName,
        clientNumber: formData.contactNumber,
        clientEmail: formData.email,
        clientStatus: formData.status,
        clientCreationDate: isEditMode ? undefined : new Date().toISOString().split('T')[0],
        // Add username for both create and update
        username: formData.username
      };
      
      // Only include password when creating new client
      if (!isEditMode) {
        clientData.password = formData.password;
      }

      if (isEditMode) {
        // Update existing client
        await axios.put(`${baseURL}/api/clients/${id}`, clientData);
        setSuccessMessage('Client updated successfully!');
      } else {
        // Create new client
        await axios.post(`${baseURL}/api/clients`, clientData);
        setSuccessMessage('Client created successfully!');
      }

      // Redirect after short delay
      setTimeout(() => {
        history.push('/admin/clients');
      }, 1500);
    } catch (error) {
      console.error('Error saving client:', error);
      setError('Error saving client. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditMode || !window.confirm('Are you sure you want to delete this client?')) {
      return;
    }

    try {
      await axios.delete(`${baseURL}/api/clients/${id}`);
      setSuccessMessage('Client deleted successfully!');
      setTimeout(() => {
        history.push('/admin/clients');
      }, 1500);
    } catch (error) {
      console.error('Error deleting client:', error);
      setError('Error deleting client. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="form-container">
        <div className="loading-state">Loading client data...</div>
      </div>
    );
  }

  return (
    <div className="form-container">
      <div className="form-header">
        <div>
          <h1>{isEditMode ? 'Edit Client' : 'Add New Client'}</h1>
          <p className="form-subtitle">Manage client information and documents</p>
        </div>
        <Link to="/admin/clients" className="btn btn-secondary">
          ← Back to Clients
        </Link>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="modern-form">
        <div className="form-section">
          <div className="form-section-header">
            <div className="section-number">01</div>
            <div>
              <h3 className="form-section-title">Business Information</h3>
              <p className="form-section-description">Enter the basic business and contact information</p>
            </div>
          </div>
          
          <div className="form-row">
              <div className="form-group">
                <label htmlFor="businessName">Business Name *</label>
                <input
                  type="text"
                  id="businessName"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter business name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="businessType">Business Type</label>
                <input
                  type="text"
                  id="businessType"
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleInputChange}
                  placeholder="Enter business type"
                />
              </div>
            </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="contactPerson">Contact Person *</label>
              <input
                type="text"
                id="contactPerson"
                name="contactPerson"
                value={formData.contactPerson}
                onChange={handleInputChange}
                required
                placeholder="Enter contact person name"
              />
            </div>
            <div className="form-group">
              <label htmlFor="contactNumber">Contact Number *</label>
              <input
                type="tel"
                id="contactNumber"
                name="contactNumber"
                value={formData.contactNumber}
                onChange={handleInputChange}
                required
                placeholder="Enter contact number"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter email address"
              />
            </div>
            <div className="form-group">
              <label htmlFor="registrationDate">Registration Date</label>
              <input
                type="date"
                id="registrationDate"
                name="registrationDate"
                value={formData.registrationDate}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="address">Business Address</label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Enter complete business address"
              rows="3"
            />
          </div>

          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Suspended">Suspended</option>
              <option value="Terminated">Terminated</option>
            </select>
          </div>
        </div>

        {/* Account Credentials Section */}
        <div className="form-section">
          <div className="form-section-header">
            <div className="section-number">02</div>
            <div>
              <h3 className="form-section-title">Account Credentials</h3>
              <p className="form-section-description">
                {isEditMode 
                  ? 'Username for client login access' 
                  : 'Create login credentials for the client'}
              </p>
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="username">Username *</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                required
                placeholder="Enter username for login"
                autoComplete="username"
              />
              <small>Client will use this username to log into the system</small>
            </div>
            
            {!isEditMode && (
              <div className="form-group">
                <label htmlFor="password">Password *</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  minLength="6"
                  placeholder="Enter secure password"
                  autoComplete="new-password"
                />
                <small>Minimum 6 characters. Client can change this later.</small>
              </div>
            )}
            
            {isEditMode && (
              <div className="form-group">
                <label>Password</label>
                <div className="password-edit-notice">
                  <div className="notice-icon">🔒</div>
                  <div>
                    <strong>Password cannot be changed by admin</strong>
                    <p>For security reasons, clients must change their own password through their account settings.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-header">
            <div className="section-number">03</div>
            <div>
              <h3 className="form-section-title">Required Documents</h3>
              <p className="form-section-description">Upload required business documents for verification</p>
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="businessPermit">Business Permit *</label>
              <input
                type="file"
                id="businessPermit"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => handleFileChange(e, 'businessPermit')}
                required={!isEditMode}
              />
              {uploadedFiles.businessPermit && (
                <div className="file-info">
                  <span>{uploadedFiles.businessPermit}</span>
                  <button type="button" onClick={() => removeFile('businessPermit')} className="remove-file-btn">
                    Remove
                  </button>
                </div>
              )}
              <small>Upload business permit or registration certificate</small>
            </div>
            <div className="form-group">
              <label htmlFor="validId">Valid ID *</label>
              <input
                type="file"
                id="validId"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => handleFileChange(e, 'validId')}
                required={!isEditMode}
              />
              {uploadedFiles.validId && (
                <div className="file-info">
                  <span>{uploadedFiles.validId}</span>
                  <button type="button" onClick={() => removeFile('validId')} className="remove-file-btn">
                    Remove
                  </button>
                </div>
              )}
              <small>Upload a valid government-issued ID of contact person</small>
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-header">
            <div className="section-number">04</div>
            <div>
              <h3 className="form-section-title">Optional Documents</h3>
              <p className="form-section-description">Additional documents that may be helpful</p>
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="serviceContract">Service Contract</label>
              <input
                type="file"
                id="serviceContract"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => handleFileChange(e, 'serviceContract')}
              />
              {uploadedFiles.serviceContract && (
                <div className="file-info">
                  <span>{uploadedFiles.serviceContract}</span>
                  <button type="button" onClick={() => removeFile('serviceContract')} className="remove-file-btn">
                    Remove
                  </button>
                </div>
              )}
              <small>Upload service contract or agreement</small>
            </div>
            <div className="form-group">
              <label htmlFor="taxCertificate">Tax Certificate</label>
              <input
                type="file"
                id="taxCertificate"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => handleFileChange(e, 'taxCertificate')}
              />
              {uploadedFiles.taxCertificate && (
                <div className="file-info">
                  <span>{uploadedFiles.taxCertificate}</span>
                  <button type="button" onClick={() => removeFile('taxCertificate')} className="remove-file-btn">
                    Remove
                  </button>
                </div>
              )}
              <small>Upload tax clearance or certificate</small>
            </div>
          </div>
        </div>

        <div className="form-actions">
          {isEditMode && (
            <button
              type="button"
              onClick={handleDelete}
              className="btn btn-danger"
              disabled={isSubmitting}
            >
              🗑️ Delete Client
            </button>
          )}
          <div className="action-buttons">
            <Link
              to="/admin/clients"
              className="btn btn-secondary"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : (isEditMode ? '💾 Update Client' : '✓ Create Client')}
            </button>
          </div>
        </div>
      </form>
    </div>
    );
};

export default ClientForm;