import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../../styles/ModernForms.css';

const StaffForm = ({ staff = null, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    department: '',
    contactNumber: '',
    email: '',
    address: '',
    dateHired: '',
    salary: '',
    status: 'Active',
    validId: null,
    employmentContract: null,
    medicalCertificate: null,
    certifications: null
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState({});

  useEffect(() => {
    if (staff) {
      setFormData({
        name: staff.name || '',
        position: staff.position || '',
        department: staff.department || '',
        contactNumber: staff.contactNumber || '',
        email: staff.email || '',
        address: staff.address || '',
        dateHired: staff.dateHired || '',
        salary: staff.salary || '',
        status: staff.status || 'Active',
        validId: staff.validId || null,
        employmentContract: staff.employmentContract || null,
        medicalCertificate: staff.medicalCertificate || null,
        certifications: staff.certifications || null
      });
    }
  }, [staff]);

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

    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5007';
      const staffData = {
        name: formData.name,
        position: formData.position,
        department: formData.department,
        contactNumber: formData.contactNumber,
        email: formData.email,
        address: formData.address,
        dateHired: formData.dateHired,
        salary: formData.salary,
        status: formData.status,
        createdAt: staff ? staff.createdAt : new Date(),
        updatedAt: new Date()
      };

      if (staff) {
        // Update existing staff
        await axios.put(`${baseURL}/api/admin/staff/${staff.id}`, staffData);
        alert('Staff updated successfully!');
      } else {
        // Create new staff
        const response = await axios.post(`${baseURL}/api/admin/staff`, staffData);
        staffData.id = response.data.id;
        alert('Staff created successfully!');
      }

      onSave(staffData);
    } catch (error) {
      console.error('Error saving staff:', error);
      alert('Error saving staff. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!staff || !window.confirm('Are you sure you want to delete this staff member?')) {
      return;
    }

    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5007';
      await axios.delete(`${baseURL}/api/admin/staff/${staff.id}`);
      alert('Staff deleted successfully!');
      onClose();
    } catch (error) {
      console.error('Error deleting staff:', error);
      alert('Error deleting staff. Please try again.');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content staff-form-modal">
        <div className="modal-header">
          <h2>{staff ? 'Edit Staff Member' : 'Add New Staff Member'}</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="modern-form">
          <div className="form-section">
            <h3>Basic Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">Full Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter full name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="position">Position *</label>
                <input
                  type="text"
                  id="position"
                  name="position"
                  value={formData.position}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter job position"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="department">Department *</label>
                <input
                  type="text"
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter department"
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
                <label htmlFor="dateHired">Date Hired</label>
                <input
                  type="date"
                  id="dateHired"
                  name="dateHired"
                  value={formData.dateHired}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="salary">Salary</label>
                <input
                  type="text"
                  id="salary"
                  name="salary"
                  value={formData.salary}
                  onChange={handleInputChange}
                  placeholder="Enter salary amount"
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
                  <option value="On Leave">On Leave</option>
                  <option value="Terminated">Terminated</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="address">Address</label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Enter complete address"
                rows="3"
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Required Documents</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="validId">Valid ID *</label>
                <input
                  type="file"
                  id="validId"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => handleFileChange(e, 'validId')}
                  required={!staff}
                />
                {uploadedFiles.validId && (
                  <div className="file-info">
                    <span>{uploadedFiles.validId}</span>
                    <button type="button" onClick={() => removeFile('validId')} className="remove-file-btn">
                      Remove
                    </button>
                  </div>
                )}
                <small>Upload a valid government-issued ID</small>
              </div>
              <div className="form-group">
                <label htmlFor="employmentContract">Employment Contract *</label>
                <input
                  type="file"
                  id="employmentContract"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => handleFileChange(e, 'employmentContract')}
                  required={!staff}
                />
                {uploadedFiles.employmentContract && (
                  <div className="file-info">
                    <span>{uploadedFiles.employmentContract}</span>
                    <button type="button" onClick={() => removeFile('employmentContract')} className="remove-file-btn">
                      Remove
                    </button>
                  </div>
                )}
                <small>Upload employment contract or appointment letter</small>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Optional Documents</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="medicalCertificate">Medical Certificate</label>
                <input
                  type="file"
                  id="medicalCertificate"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => handleFileChange(e, 'medicalCertificate')}
                />
                {uploadedFiles.medicalCertificate && (
                  <div className="file-info">
                    <span>{uploadedFiles.medicalCertificate}</span>
                    <button type="button" onClick={() => removeFile('medicalCertificate')} className="remove-file-btn">
                      Remove
                    </button>
                  </div>
                )}
                <small>Upload medical fitness certificate</small>
              </div>
              <div className="form-group">
                <label htmlFor="certifications">Certifications</label>
                <input
                  type="file"
                  id="certifications"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => handleFileChange(e, 'certifications')}
                />
                {uploadedFiles.certifications && (
                  <div className="file-info">
                    <span>{uploadedFiles.certifications}</span>
                    <button type="button" onClick={() => removeFile('certifications')} className="remove-file-btn">
                      Remove
                    </button>
                  </div>
                )}
                <small>Upload relevant certifications or training documents</small>
              </div>
            </div>
          </div>

          <div className="form-actions">
            {staff && (
              <button
                type="button"
                onClick={handleDelete}
                className="delete-button"
                disabled={isSubmitting}
              >
                Delete Staff
              </button>
            )}
            <div className="action-buttons">
              <button
                type="button"
                onClick={onClose}
                className="cancel-button"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="submit-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : (staff ? 'Update Staff' : 'Create Staff')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StaffForm;
