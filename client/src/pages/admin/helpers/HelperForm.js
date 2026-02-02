// src/pages/admin/helpers/HelperForm.js
import React, { useState, useEffect } from "react";
import { useParams, useHistory } from "react-router-dom";
import axios from "axios";

// Sidebar import removed - using header navigation now

const HelperForm = () => {
  const { id } = useParams();
  const history = useHistory();
  const isEditMode = Boolean(id);
  const baseURL = process.env.REACT_APP_API_URL || "http://localhost:5007";

  const [formData, setFormData] = useState({
    name: "",
    contactNumber: "",
    address: "",
    emergencyContact: "",
    emergencyContactNumber: "",
    dateHired: "",
    status: "Active",
    licenseType: "Class C",
    licenseNumber: "",
    licenseExpiryDate: "",
    HelperUserName: "",
    HelperPassword: "",
  });

  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState({
    validId: null,
    barangayClearance: null,
    medicalCertificate: null,
    helperLicense: null,
  });
  const [existingDocuments, setExistingDocuments] = useState({});

  // Fetch helper data if in edit mode
  useEffect(() => {
    const fetchHelper = async () => {
      if (!isEditMode) return;

      try {
        setLoading(true);
        console.log(`Fetching helper with ID: ${id}`);
        console.log("API Base URL:", baseURL);

        const response = await axios.get(`${baseURL}/api/admin/helpers/${id}`);
        console.log("API Response:", response);

        const helper = response.data;

        setFormData({
          name: helper.name || helper.HelperName || "",
          contactNumber: helper.contactNumber || helper.HelperNumber || "",
          address: helper.address || helper.HelperAddress || "",
          emergencyContact: helper.emergencyContact || "",
          emergencyContactNumber: helper.emergencyContactNumber || "",
          dateHired:
            helper.dateHired || helper.HelperEmploymentDate
              ? new Date(helper.dateHired || helper.HelperEmploymentDate)
                  .toISOString()
                  .split("T")[0]
              : "",
          status: helper.status || helper.HelperStatus || "Active",
          licenseType: helper.licenseType || "Class C",
          licenseNumber: helper.licenseNumber || "",
          licenseExpiryDate: helper.licenseExpiryDate
            ? new Date(helper.licenseExpiryDate).toISOString().split("T")[0]
            : "",
          HelperUserName: helper.HelperUserName || "",
          HelperPassword: "", // Always start with empty password for security
        });

        // Set existing documents
        if (helper.documents) {
          setExistingDocuments(helper.documents);
        }
      } catch (err) {
        console.error("Error fetching helper:", err);
        if (err.response) {
          setError(
            `Server error (${err.response.status}): ${
              err.response.data.sqlMessage || err.response.data.message
            }`,
          );
        } else if (err.request) {
          setError(
            "No response received from server. Please check your API connection.",
          );
        } else {
          setError(`Request error: ${err.message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchHelper();
  }, [id, isEditMode, baseURL]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle file changes
  const handleFileChange = (e, fieldName) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        [fieldName]: file,
      }));
      setUploadedFiles((prev) => ({
        ...prev,
        [fieldName]: file.name,
      }));
    }
  };

  // Remove file
  const removeFile = (fieldName) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: null,
    }));
    setUploadedFiles((prev) => {
      const newFiles = { ...prev };
      delete newFiles[fieldName];
      return newFiles;
    });
  };

  // Handle document replacement - show upload zone
  const handleReplaceDocument = (documentType) => {
    console.log("🔄 Replace clicked for:", documentType);
    // Clear any existing uploaded file for this type
    setUploadedFiles((prev) => ({
      ...prev,
      [documentType]: null,
    }));
    // IMPORTANT: Temporarily hide existing document view so new file preview shows
    setExistingDocuments((prev) => ({
      ...prev,
      [documentType]: null,
    }));
    // Trigger file input click
    const fileInput = document.getElementById(documentType);
    console.log("📄 File input element:", fileInput);
    if (fileInput) {
      console.log("✅ Clicking file input");
      fileInput.click();
    } else {
      console.error("❌ File input not found for:", documentType);
    }
  };

  // Handle viewing document - show in modal for images, open in new tab for PDFs
  const handleViewDocument = (documentType) => {
    console.log("👁️ View clicked for:", documentType);
    const document = existingDocuments[documentType];
    if (!document) {
      console.error("❌ No document found for:", documentType);
      return;
    }

    try {
      // Get filename from document
      const filename = document.filename;
      console.log("📄 Document:", document);

      // Determine subfolder based on document type
      let subfolder = "";
      if (documentType === "validId") {
        subfolder = "Valid-IDs";
      } else if (documentType === "barangayClearance") {
        subfolder = "Barangay-Clearances";
      } else if (documentType === "medicalCertificate") {
        subfolder = "Medical-Certificates";
      } else if (documentType === "helperLicense") {
        subfolder = "Helper-Licenses";
      }

      // Construct the relative path
      const relativePath = subfolder
        ? `Helper-Documents/${subfolder}/${filename}`
        : `Helper-Documents/${filename}`;

      // Create the API URL - encode each part
      const encodedPath = relativePath
        .split("/")
        .map((part) => encodeURIComponent(part))
        .join("/");
      const apiUrl = `${baseURL}/api/documents/view/${encodedPath}`;
      console.log("🔗 API URL:", apiUrl);

      // Check if it's an image
      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);
      console.log("🖼️ Is image:", isImage);

      // Always open in new tab (simpler approach)
      window.open(apiUrl, "_blank");
    } catch (error) {
      console.error("❌ Error viewing document:", error);
      setError("Failed to view document. Please try again.");
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Create FormData to handle file uploads
      const formDataToSend = new FormData();

      // Append text fields
      formDataToSend.append("name", formData.name);
      formDataToSend.append("helperName", formData.name); // For middleware to create unique filenames
      formDataToSend.append("contactNumber", formData.contactNumber);
      formDataToSend.append("address", formData.address);
      formDataToSend.append(
        "emergencyContact",
        formData.emergencyContact || "",
      );
      formDataToSend.append(
        "emergencyContactNumber",
        formData.emergencyContactNumber || "",
      );
      formDataToSend.append("dateHired", formData.dateHired);
      formDataToSend.append("status", formData.status);
      formDataToSend.append("licenseType", formData.licenseType);
      formDataToSend.append("licenseNumber", formData.licenseNumber || "");
      formDataToSend.append(
        "licenseExpiryDate",
        formData.licenseExpiryDate || "",
      );
      formDataToSend.append("HelperUserName", formData.HelperUserName);
      if (formData.HelperPassword) {
        formDataToSend.append("HelperPassword", formData.HelperPassword);
      }

      // Append file uploads if they exist
      if (formData.validId) {
        formDataToSend.append("validId", formData.validId);
      }
      if (formData.barangayClearance) {
        formDataToSend.append("barangayClearance", formData.barangayClearance);
      }
      if (formData.medicalCertificate) {
        formDataToSend.append(
          "medicalCertificate",
          formData.medicalCertificate,
        );
      }
      if (formData.helperLicense) {
        formDataToSend.append("helperLicense", formData.helperLicense);
      }

      // Don't set Content-Type manually - let axios set it with boundary
      const config = {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      };

      console.log("Sending helper data...");
      console.log("Is edit mode:", isEditMode);
      console.log("FormData keys:", Array.from(formDataToSend.keys()));

      if (isEditMode) {
        // Update existing helper
        console.log(`Updating helper ${id}...`);
        await axios.put(
          `${baseURL}/api/admin/helpers/${id}`,
          formDataToSend,
          config,
        );
        setSuccessMessage("Helper updated successfully!");
      } else {
        // Create new helper
        console.log("Creating new helper...");
        const response = await axios.post(
          `${baseURL}/api/admin/helpers`,
          formDataToSend,
          config,
        );
        setSuccessMessage("Helper created successfully!");
      }

      // Header navigation will update counts automatically
      setTimeout(() => {
        history.push("/admin/helpers");
      }, 1500);
    } catch (error) {
      console.error("Error saving helper:", error);
      if (error.response) {
        setError(
          `Server error (${error.response.status}): ${
            error.response.data.message ||
            error.response.data.error ||
            "Unknown error"
          }`,
        );
      } else if (error.request) {
        setError(
          "No response received from server. Please check your API connection.",
        );
      } else {
        setError(`Request error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="modern-form-container">
        <div className="modern-loading">
          <div className="loading-spinner"></div>
          Loading helper data...
        </div>
      </div>
    );
  }

  return (
    <div className="modern-form-container">
      <div className="modern-form-header">
        <h1>{isEditMode ? "Edit Helper" : "Add New Helper"}</h1>
        <p>
          {isEditMode
            ? "Update helper information and documents"
            : "Register a new helper with required documentation"}
        </p>
      </div>

      {error && (
        <div className="modern-alert modern-alert-error">
          <div className="modern-alert-icon">⚠️</div>
          <div className="modern-alert-content">
            <div className="modern-alert-title">Error</div>
            <div>{error}</div>
            <div style={{ marginTop: "10px", display: "flex", gap: "8px" }}>
              <button
                className="modern-btn modern-btn-secondary"
                style={{ padding: "4px 12px", fontSize: "12px" }}
                onClick={() => setError(null)}
              >
                Dismiss
              </button>
              <button
                className="modern-btn modern-btn-secondary"
                style={{ padding: "4px 12px", fontSize: "12px" }}
                onClick={() => window.location.reload()}
              >
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
              <div className="form-section-icon">👤</div>
              <div>
                <h3 className="form-section-title">Basic Information</h3>
                <p className="form-section-description">
                  Enter the helper's personal and contact information
                </p>
              </div>
            </div>

            <div className="form-grid form-grid-2">
              <div className="modern-form-group">
                <label htmlFor="name" className="modern-form-label">
                  Full Name <span className="required-indicator">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="modern-form-input"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  maxLength="100"
                  placeholder="e.g. Juan Dela Cruz"
                />
                <div className="form-help-text">
                  Enter the helper's complete legal name
                </div>
              </div>

              <div className="modern-form-group">
                <label htmlFor="contactNumber" className="modern-form-label">
                  Phone Number <span className="required-indicator">*</span>
                </label>
                <input
                  type="text"
                  id="contactNumber"
                  name="contactNumber"
                  className="modern-form-input"
                  value={formData.contactNumber}
                  onChange={handleChange}
                  required
                  maxLength="20"
                  placeholder="e.g. +63 912 345 6789"
                />
                <div className="form-help-text">
                  Primary contact number for the helper
                </div>
              </div>
            </div>

            <div className="form-grid form-grid-1">
              <div className="modern-form-group">
                <label htmlFor="address" className="modern-form-label">
                  Address <span className="required-indicator">*</span>
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  className="modern-form-input"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  maxLength="255"
                  placeholder="e.g. 123 Main St, Barangay Sample, City, Province"
                />
                <div className="form-help-text">
                  Complete residential address
                </div>
              </div>
            </div>

            <div className="form-grid form-grid-2">
              <div className="modern-form-group">
                <label htmlFor="emergencyContact" className="modern-form-label">
                  Emergency Contact
                </label>
                <input
                  type="text"
                  id="emergencyContact"
                  name="emergencyContact"
                  className="modern-form-input"
                  value={formData.emergencyContact}
                  onChange={handleChange}
                  maxLength="100"
                  placeholder="Emergency contact name"
                />
                <div className="form-help-text">
                  Name of emergency contact person
                </div>
              </div>

              <div className="modern-form-group">
                <label
                  htmlFor="emergencyContactNumber"
                  className="modern-form-label"
                >
                  Emergency Contact Number
                </label>
                <input
                  type="text"
                  id="emergencyContactNumber"
                  name="emergencyContactNumber"
                  className="modern-form-input"
                  value={formData.emergencyContactNumber}
                  onChange={handleChange}
                  maxLength="20"
                  placeholder="Emergency contact number"
                />
                <div className="form-help-text">
                  Phone number of emergency contact
                </div>
              </div>
            </div>
          </div>

          {/* Employment Information Section */}
          <div className="form-section">
            <div className="form-section-header">
              <div className="form-section-icon">💼</div>
              <div>
                <h3 className="form-section-title">Employment Information</h3>
                <p className="form-section-description">
                  Employment details and current status
                </p>
              </div>
            </div>

            <div className="form-grid form-grid-2">
              <div className="modern-form-group">
                <label htmlFor="dateHired" className="modern-form-label">
                  Employment Date <span className="required-indicator">*</span>
                </label>
                <input
                  type="date"
                  id="dateHired"
                  name="dateHired"
                  className="modern-form-input"
                  value={formData.dateHired}
                  onChange={handleChange}
                  required
                />
                <div className="form-help-text">
                  Date when the helper was hired
                </div>
              </div>

              <div className="modern-form-group">
                <label htmlFor="status" className="modern-form-label">
                  Employment Status{" "}
                  <span className="required-indicator">*</span>
                </label>
                <select
                  id="status"
                  name="status"
                  className="modern-form-select"
                  value={formData.status}
                  onChange={handleChange}
                  required
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Terminated">Terminated</option>
                </select>
                <div className="form-help-text">Current employment status</div>
              </div>
            </div>
          </div>

          {/* License Information Section */}
          <div className="form-section">
            <div className="form-section-header">
              <div className="form-section-icon">🚗</div>
              <div>
                <h3 className="form-section-title">License Information</h3>
                <p className="form-section-description">
                  Helper license details and qualifications
                </p>
              </div>
            </div>

            <div className="form-grid form-grid-3">
              {/* License Type */}
              <div className="modern-form-group">
                <label htmlFor="licenseType" className="modern-form-label">
                  License Type <span className="required-indicator">*</span>
                </label>
                <select
                  id="licenseType"
                  name="licenseType"
                  className="modern-form-select"
                  value={formData.licenseType}
                  onChange={handleChange}
                  required
                >
                  <option value="Class C">Class C</option>
                  <option value="Class CE">Class CE</option>
                </select>
                <div className="form-help-text">
                  {formData.licenseType === "Class C"
                    ? "Can assist with mini trucks only"
                    : "Can assist with all truck types"}
                </div>
              </div>

              {/* License Number */}
              <div className="modern-form-group">
                <label htmlFor="licenseNumber" className="modern-form-label">
                  License Number
                </label>
                <input
                  type="text"
                  id="licenseNumber"
                  name="licenseNumber"
                  className="modern-form-input"
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  placeholder="Enter license number"
                />
                <div className="form-help-text">
                  Helper's license number (optional)
                </div>
              </div>

              {/* License Expiry Date */}
              <div className="modern-form-group">
                <label
                  htmlFor="licenseExpiryDate"
                  className="modern-form-label"
                >
                  License Expiry Date
                </label>
                <input
                  type="date"
                  id="licenseExpiryDate"
                  name="licenseExpiryDate"
                  className="modern-form-input"
                  value={formData.licenseExpiryDate}
                  onChange={handleChange}
                />
                <div className="form-help-text">
                  When the license expires (optional)
                </div>
              </div>
            </div>

            {/* License Type Information */}
            <div
              className="modern-alert modern-alert-info"
              style={{ marginTop: "16px" }}
            >
              <div className="modern-alert-icon">ℹ️</div>
              <div className="modern-alert-content">
                <div className="modern-alert-title">License Type Details</div>
                <div>
                  <strong>Class C:</strong> Can assist with mini trucks and
                  light vehicles only
                  <br />
                  <strong>Class CE:</strong> Can assist with all truck types
                  including heavy vehicles
                </div>
              </div>
            </div>
          </div>

          {/* Account Credentials Section */}
          <div className="form-section">
            <div className="form-section-header">
              <div className="form-section-icon">🔐</div>
              <div>
                <h3 className="form-section-title">Account Credentials</h3>
                <p className="form-section-description">
                  Login credentials for the helper portal
                </p>
              </div>
            </div>

            <div className="form-grid form-grid-2">
              <div className="modern-form-group">
                <label htmlFor="HelperUserName" className="modern-form-label">
                  Username <span className="required-indicator">*</span>
                </label>
                <input
                  type="text"
                  id="HelperUserName"
                  name="HelperUserName"
                  className="modern-form-input"
                  value={formData.HelperUserName}
                  onChange={handleChange}
                  required
                  maxLength="50"
                  placeholder="e.g. jdelacruz"
                />
                <div className="form-help-text">
                  Unique username for system login
                </div>
              </div>

              {!isEditMode && (
                <div className="modern-form-group">
                  <label htmlFor="HelperPassword" className="modern-form-label">
                    Password <span className="required-indicator">*</span>
                  </label>
                  <input
                    type="password"
                    id="HelperPassword"
                    name="HelperPassword"
                    className="modern-form-input"
                    value={formData.HelperPassword || ""}
                    onChange={handleChange}
                    required
                    maxLength="255"
                    placeholder="Minimum 6 characters"
                  />
                  <div className="form-help-text">
                    Secure password for helper login
                  </div>
                </div>
              )}

              {isEditMode && (
                <div className="modern-form-group">
                  <label className="modern-form-label">Password</label>
                  <div
                    className="modern-alert modern-alert-info"
                    style={{ margin: 0 }}
                  >
                    <div className="modern-alert-icon">🔒</div>
                    <div className="modern-alert-content">
                      <div>
                        Password cannot be changed by admin. Helper must change
                        their own password through their account settings.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Document Upload Section */}
          <div className="form-section">
            <div className="form-section-header">
              <div className="form-section-icon">📄</div>
              <div>
                <h3 className="form-section-title">Required Documents</h3>
                <p className="form-section-description">
                  All documents are required for new helpers. Please upload
                  clear, readable copies.
                </p>
              </div>
            </div>

            <div className="form-grid form-grid-2">
              {/* Valid ID */}
              <div className="modern-form-group">
                <label htmlFor="validId" className="modern-form-label">
                  Valid ID <span className="required-indicator">*</span>
                </label>

                {!uploadedFiles.validId && !existingDocuments.validId && (
                  <div className="modern-file-upload">
                    <input
                      type="file"
                      id="validId"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange(e, "validId")}
                    />
                    <div className="file-upload-icon">🪪</div>
                    <div className="file-upload-text">
                      <div className="file-upload-primary">
                        Click to upload valid ID
                      </div>
                      <div className="file-upload-secondary">
                        PDF, JPG, PNG up to 25MB
                      </div>
                    </div>
                  </div>
                )}

                {uploadedFiles.validId && (
                  <div className="file-preview">
                    <div className="file-preview-info">
                      <div className="file-preview-icon">🪪</div>
                      <div className="file-preview-name">
                        {uploadedFiles.validId.name}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile("validId")}
                      className="file-remove-btn"
                    >
                      ❌
                    </button>
                  </div>
                )}

                {existingDocuments.validId && !uploadedFiles.validId && (
                  <div className="existing-file">
                    <div className="existing-file-info">
                      <div className="existing-file-icon">🪪</div>
                      <div className="existing-file-name">
                        Current: {existingDocuments.validId.originalName}
                      </div>
                    </div>
                    <div className="existing-file-actions">
                      <button
                        type="button"
                        onClick={() => handleViewDocument("validId")}
                        className="file-view-btn"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReplaceDocument("validId")}
                        className="file-replace-btn"
                      >
                        Replace
                      </button>
                    </div>
                  </div>
                )}

                <div className="form-help-text">
                  Upload valid government-issued ID (PDF, JPG, PNG - max 25MB)
                </div>
              </div>

              {/* Barangay Clearance */}
              <div className="modern-form-group">
                <label
                  htmlFor="barangayClearance"
                  className="modern-form-label"
                >
                  Barangay Clearance{" "}
                  <span className="required-indicator">*</span>
                </label>

                {!uploadedFiles.barangayClearance &&
                  !existingDocuments.barangayClearance && (
                    <div className="modern-file-upload">
                      <input
                        type="file"
                        id="barangayClearance"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) =>
                          handleFileChange(e, "barangayClearance")
                        }
                      />
                      <div className="file-upload-icon">📋</div>
                      <div className="file-upload-text">
                        <div className="file-upload-primary">
                          Click to upload barangay clearance
                        </div>
                        <div className="file-upload-secondary">
                          PDF, JPG, PNG up to 25MB
                        </div>
                      </div>
                    </div>
                  )}

                {uploadedFiles.barangayClearance && (
                  <div className="file-preview">
                    <div className="file-preview-info">
                      <div className="file-preview-icon">📋</div>
                      <div className="file-preview-name">
                        {uploadedFiles.barangayClearance.name}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile("barangayClearance")}
                      className="file-remove-btn"
                    >
                      ❌
                    </button>
                  </div>
                )}

                {existingDocuments.barangayClearance &&
                  !uploadedFiles.barangayClearance && (
                    <div className="existing-file">
                      <div className="existing-file-info">
                        <div className="existing-file-icon">📄</div>
                        <div className="existing-file-name">
                          Current:{" "}
                          {existingDocuments.barangayClearance.originalName}
                        </div>
                      </div>
                      <div className="existing-file-actions">
                        <button
                          type="button"
                          onClick={() =>
                            handleViewDocument("barangayClearance")
                          }
                          className="file-view-btn"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleReplaceDocument("barangayClearance")
                          }
                          className="file-replace-btn"
                        >
                          Replace
                        </button>
                      </div>
                    </div>
                  )}

                <div className="form-help-text">
                  Upload barangay clearance certificate (PDF, JPG, PNG - max
                  25MB)
                </div>
              </div>
            </div>

            <div className="form-grid form-grid-2">
              {/* Medical Certificate */}
              <div className="modern-form-group">
                <label
                  htmlFor="medicalCertificate"
                  className="modern-form-label"
                >
                  Medical Certificate
                </label>

                {!uploadedFiles.medicalCertificate &&
                  !existingDocuments.medicalCertificate && (
                    <div className="modern-file-upload">
                      <input
                        type="file"
                        id="medicalCertificate"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) =>
                          handleFileChange(e, "medicalCertificate")
                        }
                      />
                      <div className="file-upload-icon">🏥</div>
                      <div className="file-upload-text">
                        <div className="file-upload-primary">
                          Click to upload medical certificate
                        </div>
                        <div className="file-upload-secondary">
                          PDF, JPG, PNG up to 25MB
                        </div>
                      </div>
                    </div>
                  )}

                {uploadedFiles.medicalCertificate && (
                  <div className="file-preview">
                    <div className="file-preview-info">
                      <div className="file-preview-icon">🏥</div>
                      <div className="file-preview-name">
                        {uploadedFiles.medicalCertificate.name}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile("medicalCertificate")}
                      className="file-remove-btn"
                    >
                      ❌
                    </button>
                  </div>
                )}

                {existingDocuments.medicalCertificate &&
                  !uploadedFiles.medicalCertificate && (
                    <div className="existing-file">
                      <div className="existing-file-info">
                        <div className="existing-file-icon">🏥</div>
                        <div className="existing-file-name">
                          Current:{" "}
                          {existingDocuments.medicalCertificate.originalName}
                        </div>
                      </div>
                      <div className="existing-file-actions">
                        <button
                          type="button"
                          onClick={() =>
                            handleViewDocument("medicalCertificate")
                          }
                          className="file-view-btn"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleReplaceDocument("medicalCertificate")
                          }
                          className="file-replace-btn"
                        >
                          Replace
                        </button>
                      </div>
                    </div>
                  )}

                <div className="form-help-text">
                  Optional: Upload medical fitness certificate (PDF, JPG, PNG -
                  max 25MB)
                </div>
              </div>

              {/* Helper License */}
              <div className="modern-form-group">
                <label htmlFor="helperLicense" className="modern-form-label">
                  Helper License
                </label>

                {!uploadedFiles.helperLicense &&
                  !existingDocuments.helperLicense && (
                    <div className="modern-file-upload">
                      <input
                        type="file"
                        id="helperLicense"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange(e, "helperLicense")}
                      />
                      <div className="file-upload-icon">📜</div>
                      <div className="file-upload-text">
                        <div className="file-upload-primary">
                          Click to upload helper license
                        </div>
                        <div className="file-upload-secondary">
                          PDF, JPG, PNG up to 25MB
                        </div>
                      </div>
                    </div>
                  )}

                {uploadedFiles.helperLicense && (
                  <div className="file-preview">
                    <div className="file-preview-info">
                      <div className="file-preview-icon">📜</div>
                      <div className="file-preview-name">
                        {uploadedFiles.helperLicense.name}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile("helperLicense")}
                      className="file-remove-btn"
                    >
                      ❌
                    </button>
                  </div>
                )}

                {existingDocuments.helperLicense &&
                  !uploadedFiles.helperLicense && (
                    <div className="existing-file">
                      <div className="existing-file-info">
                        <div className="existing-file-icon">📜</div>
                        <div className="existing-file-name">
                          Current:{" "}
                          {existingDocuments.helperLicense.originalName}
                        </div>
                      </div>
                      <div className="existing-file-actions">
                        <button
                          type="button"
                          onClick={() => handleViewDocument("helperLicense")}
                          className="file-view-btn"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReplaceDocument("helperLicense")}
                          className="file-replace-btn"
                        >
                          Replace
                        </button>
                      </div>
                    </div>
                  )}

                <div className="form-help-text">
                  Optional: Upload helper license if applicable (PDF, JPG, PNG -
                  max 25MB)
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="modern-btn-group">
            <button
              type="button"
              className="modern-btn modern-btn-secondary"
              onClick={() => history.push("/admin/helpers")}
            >
              ← Cancel
            </button>
            <button type="submit" className="modern-btn modern-btn-primary">
              {isEditMode ? "💾 Update Helper" : "✅ Add Helper"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HelperForm;
