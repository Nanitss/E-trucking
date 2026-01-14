// src/pages/admin/staff/StaffForm.js
import React, { useState, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import axios from 'axios';
import './StaffForm.css';
import '../../../styles/ModernForms.css';
// Sidebar import removed - using header navigation now

const StaffForm = () => {
  const { id } = useParams();
  const history = useHistory();
  const isEditMode = Boolean(id);
  const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5007';

  const [formData, setFormData] = useState({
    StaffName: '',
    StaffAddress: '',
    StaffNumber: '',
    StaffDepartment: '',
    StaffEmploymentDate: '',
    StaffDocuments: '',
    StaffUserName: '',
    StaffPassword: '',
    StaffStatus: 'active'
  });
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch staff data if in edit mode
  useEffect(() => {
    const fetchStaff = async () => {
      if (!isEditMode) return;

      try {
        setLoading(true);
        console.log(`Fetching staff member with ID: ${id}`);
        console.log('API Base URL:', baseURL);

        const response = await axios.get(`${baseURL}/api/staffs/${id}`);
        console.log('API Response:', response);

        const staff = response.data;
        if (staff.StaffEmploymentDate) {
          // Format to YYYY-MM-DD for the date input
          staff.StaffEmploymentDate = new Date(staff.StaffEmploymentDate)
            .toISOString()
            .split('T')[0];
        }
        setFormData(staff);
      } catch (err) {
        console.error('Error fetching staff member:', err);
        if (err.response) {
          setError(
            `Server error (${err.response.status}): ${
              err.response.data.sqlMessage || err.response.data.message
            }`
          );
        } else if (err.request) {
          setError('No response received from server. Please check your API connection.');
        } else {
          setError(`Request error: ${err.message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStaff();
  }, [id, isEditMode, baseURL]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log('Form submission:', isEditMode ? 'UPDATE' : 'CREATE', formData);
      const url = isEditMode
        ? `${baseURL}/api/staffs/${id}`
        : `${baseURL}/api/staffs`;
      const method = isEditMode ? 'put' : 'post';

      const response = await axios[method](url, formData);
      console.log(isEditMode ? 'Update response:' : 'Create response:', response);

      setSuccessMessage(
        isEditMode ? 'Staff member updated successfully!' : 'Staff member added successfully!'
      );
      setError(null);

      // Header navigation will update counts automatically

      if (!isEditMode) {
        // Reset form for new create
        setFormData({
          StaffName: '',
          StaffAddress: '',
          StaffNumber: '',
          StaffDepartment: '',
          StaffEmploymentDate: '',
          StaffDocuments: '',
          StaffUserName: '',
          StaffPassword: '',
          StaffStatus: 'active'
        });
      }

      // Redirect back to list after a brief pause
      setTimeout(() => {
        history.push('/admin/staffs');
      }, 1500);
    } catch (err) {
      console.error('Error saving staff member:', err);
      if (err.response) {
        setError(
          `Server error (${err.response.status}): ${
            err.response.data.sqlMessage || err.response.data.message
          }`
        );
      } else if (err.request) {
        setError('No response received from server. Please check your API connection.');
      } else {
        setError(`Request error: ${err.message}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="modern-form-container">
        <div className="modern-loading">
          <div className="loading-spinner"></div>
          Loading staff data...
        </div>
      </div>
    );
  }

  return (
    <div className="modern-form-container">
      <div className="modern-form-header">
        <h1>{isEditMode ? 'Edit Staff Member' : 'Add New Staff Member'}</h1>
        <p>{isEditMode ? 'Update staff member information and credentials' : 'Register a new staff member with department details'}</p>
      </div>

      {error && (
        <div className="modern-alert modern-alert-error">
          <div className="modern-alert-icon">⚠️</div>
          <div className="modern-alert-content">
            <div className="modern-alert-title">Error</div>
            <div>{error}</div>
            <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
              <button className="modern-btn modern-btn-secondary" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => setError(null)}>
                Dismiss
              </button>
              <button className="modern-btn modern-btn-secondary" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => window.location.reload()}>
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="modern-alert modern-alert-success">
          <div className="modern-alert-icon">✅</div>
          <div className="modern-alert-content">
            <div className="modern-alert-title">Success</div>
            <div>{successMessage}</div>
          </div>
        </div>
      )}

      <div className="modern-form-card">
        <form onSubmit={handleSubmit} className="modern-form-content">
          
          {/* Basic Information Section */}
          <div className="form-section">
            <div className="form-section-header">
              <div className="form-section-icon">👨‍💼</div>
              <div>
                <h3 className="form-section-title">Basic Information</h3>
                <p className="form-section-description">Enter the staff member's personal and contact information</p>
              </div>
            </div>
            
            <div className="form-grid form-grid-2">
              <div className="modern-form-group">
                <label htmlFor="StaffName" className="modern-form-label">
                  Full Name <span className="required-indicator">*</span>
                </label>
                <input
                  type="text"
                  id="StaffName"
                  name="StaffName"
                  className="modern-form-input"
                  value={formData.StaffName}
                  onChange={handleChange}
                  required
                  maxLength="100"
                  placeholder="e.g. John Doe"
                />
                <div className="form-help-text">Enter the staff member's complete legal name</div>
              </div>

              <div className="modern-form-group">
                <label htmlFor="StaffNumber" className="modern-form-label">
                  Phone Number <span className="required-indicator">*</span>
                </label>
                <input
                  type="text"
                  id="StaffNumber"
                  name="StaffNumber"
                  className="modern-form-input"
                  value={formData.StaffNumber}
                  onChange={handleChange}
                  required
                  maxLength="20"
                  placeholder="e.g. +63 912 345 6789"
                />
                <div className="form-help-text">Primary contact number for the staff member</div>
              </div>
            </div>
            
            <div className="form-grid form-grid-1">
              <div className="modern-form-group">
                <label htmlFor="StaffAddress" className="modern-form-label">
                  Address <span className="required-indicator">*</span>
                </label>
                <input
                  type="text"
                  id="StaffAddress"
                  name="StaffAddress"
                  className="modern-form-input"
                  value={formData.StaffAddress}
                  onChange={handleChange}
                  required
                  maxLength="255"
                  placeholder="e.g. 123 Main St, Barangay Sample, City, Province"
                />
                <div className="form-help-text">Complete residential address</div>
              </div>
            </div>
          </div>

          {/* Employment Information Section */}
          <div className="form-section">
            <div className="form-section-header">
              <div className="form-section-icon">🏢</div>
              <div>
                <h3 className="form-section-title">Employment Information</h3>
                <p className="form-section-description">Department assignment and employment details</p>
              </div>
            </div>
            
            <div className="form-grid form-grid-3">
              <div className="modern-form-group">
                <label htmlFor="StaffDepartment" className="modern-form-label">
                  Department <span className="required-indicator">*</span>
                </label>
                <input
                  type="text"
                  id="StaffDepartment"
                  name="StaffDepartment"
                  className="modern-form-input"
                  value={formData.StaffDepartment}
                  onChange={handleChange}
                  required
                  maxLength="50"
                  placeholder="e.g. Operations, Admin, HR"
                />
                <div className="form-help-text">Department or division assignment</div>
              </div>

              <div className="modern-form-group">
                <label htmlFor="StaffEmploymentDate" className="modern-form-label">
                  Employment Date <span className="required-indicator">*</span>
                </label>
                <input
                  type="date"
                  id="StaffEmploymentDate"
                  name="StaffEmploymentDate"
                  className="modern-form-input"
                  value={formData.StaffEmploymentDate}
                  onChange={handleChange}
                  required
                />
                <div className="form-help-text">Date when the staff member was hired</div>
              </div>

              <div className="modern-form-group">
                <label htmlFor="StaffStatus" className="modern-form-label">
                  Employment Status <span className="required-indicator">*</span>
                </label>
                <select
                  id="StaffStatus"
                  name="StaffStatus"
                  className="modern-form-select"
                  value={formData.StaffStatus}
                  onChange={handleChange}
                  required
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
                <div className="form-help-text">Current employment status</div>
              </div>
            </div>
            
            <div className="form-grid form-grid-1">
              <div className="modern-form-group">
                <label htmlFor="StaffDocuments" className="modern-form-label">
                  Documents Notes (Optional)
                </label>
                <input
                  type="text"
                  id="StaffDocuments"
                  name="StaffDocuments"
                  className="modern-form-input"
                  value={formData.StaffDocuments || ''}
                  onChange={handleChange}
                  maxLength="255"
                  placeholder="Additional document notes"
                />
                <div className="form-help-text">Optional notes about staff documents</div>
              </div>
            </div>
          </div>

          {/* Account Credentials Section */}
          <div className="form-section">
            <div className="form-section-header">
              <div className="form-section-icon">🔐</div>
              <div>
                <h3 className="form-section-title">Account Credentials</h3>
                <p className="form-section-description">Login credentials for the staff portal</p>
              </div>
            </div>
            
            <div className="form-grid form-grid-2">
              <div className="modern-form-group">
                <label htmlFor="StaffUserName" className="modern-form-label">
                  Username <span className="required-indicator">*</span>
                </label>
                <input
                  type="text"
                  id="StaffUserName"
                  name="StaffUserName"
                  className="modern-form-input"
                  value={formData.StaffUserName}
                  onChange={handleChange}
                  required
                  maxLength="50"
                  placeholder="e.g. jdoe"
                />
                <div className="form-help-text">Unique username for system login</div>
              </div>

              <div className="modern-form-group">
                <label htmlFor="StaffPassword" className="modern-form-label">
                  Password {!isEditMode && <span className="required-indicator">*</span>}
                </label>
                <input
                  type="password"
                  id="StaffPassword"
                  name="StaffPassword"
                  className="modern-form-input"
                  value={formData.StaffPassword || ''}
                  onChange={handleChange}
                  {...(!isEditMode && { required: true })}
                  maxLength="255"
                  placeholder={isEditMode ? 'Leave blank to keep current password' : 'Minimum 6 characters'}
                />
                <div className="form-help-text">
                  {isEditMode ? 'Leave blank to keep current password' : 'Secure password for staff portal access'}
                </div>
              </div>
            </div>
          </div>
          {/* Form Actions */}
          <div className="modern-btn-group">
            <button
              type="button"
              className="modern-btn modern-btn-secondary"
              onClick={() => history.push('/admin/staffs')}
            >
              ← Cancel
            </button>
            <button type="submit" className="modern-btn modern-btn-primary">
              {isEditMode ? '💾 Update Staff Member' : '✅ Add Staff Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StaffForm;