// src/pages/admin/drivers/DriverForm.js
import React, { useState, useEffect } from "react";
import { useParams, useHistory } from "react-router-dom";
import axios from "axios";
// Sidebar import removed - using header navigation now

const DriverForm = () => {
  const { id } = useParams();
  const history = useHistory();
  const isEditMode = Boolean(id);
  const baseURL = process.env.REACT_APP_API_URL || "http://localhost:5007";

  const [formData, setFormData] = useState({
    DriverName: "",
    DriverAddress: "",
    DriverNumber: "",
    DriverEmploymentDate: "",
    DriverDocuments: "",
    DriverUserName: "",
    DriverPassword: "",
    DriverStatus: "active",
    licenseType: "Class C", // Default license type
    licenseNumber: "",
    licenseExpiryDate: "",
    licenseRegistrationDate: "", // Date when license was last renewed
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelationship: "",
  });
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState({
    licenseDocument: null,
    medicalCertificate: null,
    idPhoto: null,
    nbiClearance: null,
  });
  const [documentErrors, setDocumentErrors] = useState({});
  const [existingDocuments, setExistingDocuments] = useState({});
  const [originalDocuments, setOriginalDocuments] = useState({}); // Store original docs to preserve on replace

  // Document preview state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewDocument, setPreviewDocument] = useState(null);

  // Fetch driver data if in edit mode
  useEffect(() => {
    const fetchDriver = async () => {
      if (!isEditMode) return;

      try {
        setLoading(true);
        console.log(`Fetching driver with ID: ${id}`);
        console.log("API Base URL:", baseURL);

        // Get auth token
        const token = localStorage.getItem("token");
        const config = token
          ? {
              headers: { Authorization: `Bearer ${token}` },
            }
          : {};

        // Use admin endpoint for full driver data with documents
        const response = await axios.get(
          `${baseURL}/api/admin/drivers/${id}`,
          config,
        );
        console.log("API Response:", response);

        const driver = response.data;

        // Helper function to safely format dates
        const formatDateSafely = (dateValue) => {
          if (!dateValue) return "";
          try {
            // Handle Firestore Timestamp objects
            if (dateValue._seconds !== undefined) {
              console.log("Converting Firestore Timestamp:", dateValue);
              const date = new Date(dateValue._seconds * 1000);
              return date.toISOString().split("T")[0];
            }

            // Handle regular dates
            const date = new Date(dateValue);
            if (isNaN(date.getTime())) {
              console.warn("Invalid date value:", dateValue);
              return "";
            }
            return date.toISOString().split("T")[0];
          } catch (error) {
            console.warn("Error formatting date:", dateValue, error);
            return "";
          }
        };

        // Ensure all fields have string values to prevent controlled/uncontrolled warnings
        setFormData({
          DriverName: driver.DriverName || "",
          DriverAddress: driver.DriverAddress || "",
          DriverNumber: driver.DriverNumber || "",
          DriverEmploymentDate: formatDateSafely(driver.DriverEmploymentDate),
          DriverDocuments: driver.DriverDocuments || "",
          DriverUserName: driver.DriverUserName || "",
          DriverPassword: "", // Always start with empty password for security
          DriverStatus: driver.DriverStatus || "active",
          licenseType: driver.licenseType || "Class C",
          licenseNumber: driver.licenseNumber || "",
          licenseExpiryDate: formatDateSafely(driver.licenseExpiryDate),
          licenseRegistrationDate: formatDateSafely(
            driver.licenseRegistrationDate,
          ),
          emergencyContactName: driver.emergencyContactName || "",
          emergencyContactPhone: driver.emergencyContactPhone || "",
          emergencyContactRelationship:
            driver.emergencyContactRelationship || "",
        });

        // Set existing documents
        if (driver.documents) {
          setExistingDocuments(driver.documents);
          setOriginalDocuments(driver.documents); // Keep original copy for preservation
        }
      } catch (err) {
        console.error("Error fetching driver:", err);
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

    fetchDriver();
  }, [id, isEditMode, baseURL]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle file uploads
  const handleFileChange = (e, documentType) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 25MB)
      if (file.size > 25 * 1024 * 1024) {
        setDocumentErrors((prev) => ({
          ...prev,
          [documentType]: "File size must be less than 25MB",
        }));
        return;
      }

      // Validate file type
      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png",
      ];
      if (!allowedTypes.includes(file.type)) {
        setDocumentErrors((prev) => ({
          ...prev,
          [documentType]: "Only PDF, JPG, and PNG files are allowed",
        }));
        return;
      }

      // Clear any previous errors
      setDocumentErrors((prev) => ({
        ...prev,
        [documentType]: null,
      }));

      setUploadedFiles((prev) => ({
        ...prev,
        [documentType]: file,
      }));
    }
  };

  // Remove uploaded file
  const removeFile = (documentType) => {
    setUploadedFiles((prev) => ({
      ...prev,
      [documentType]: null,
    }));
    setDocumentErrors((prev) => ({
      ...prev,
      [documentType]: null,
    }));
  };

  // Handle document replacement - show upload zone
  const handleReplaceDocument = (documentType) => {
    console.log("🔄 Replace clicked for:", documentType);
    // Clear any existing uploaded file for this type
    setUploadedFiles((prev) => ({
      ...prev,
      [documentType]: null,
    }));
    // Clear any errors
    setDocumentErrors((prev) => ({
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
      if (documentType === "licenseDocument") {
        subfolder = "Licenses";
      } else if (documentType === "medicalCertificate") {
        subfolder = "Medical-Certificates";
      } else if (documentType === "idPhoto") {
        subfolder = "ID-Photos";
      } else if (documentType === "nbiClearance") {
        subfolder = "NBI-Clearances";
      }

      // Construct the relative path
      const relativePath = subfolder
        ? `Driver-Documents/${subfolder}/${filename}`
        : `Driver-Documents/${filename}`;

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

      if (isImage) {
        // Show in modal
        setPreviewDocument({
          url: apiUrl,
          filename: filename,
          type: documentType,
        });
        setShowPreviewModal(true);
      } else {
        // Open PDF in new tab
        window.open(apiUrl, "_blank");
      }
    } catch (error) {
      console.error("❌ Error viewing document:", error);
      setError("Failed to view document. Please try again.");
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log(
        "Form submission:",
        isEditMode ? "UPDATE" : "CREATE",
        formData,
      );
      console.log("🚨 Emergency Contact Data:", {
        name: formData.emergencyContactName,
        phone: formData.emergencyContactPhone,
        relationship: formData.emergencyContactRelationship,
      });

      // Validate required documents for new drivers
      if (!isEditMode) {
        const requiredDocs = [
          "licenseDocument",
          "medicalCertificate",
          "idPhoto",
        ];
        const missingDocs = requiredDocs.filter((doc) => !uploadedFiles[doc]);

        if (missingDocs.length > 0) {
          setError(
            `Please upload all required documents: ${missingDocs
              .map((doc) =>
                doc
                  .replace("Document", "")
                  .replace("Certificate", "")
                  .toUpperCase(),
              )
              .join(", ")}`,
          );
          return;
        }
      }

      // Create FormData for file upload
      const formDataToSend = new FormData();

      // Add form fields
      Object.keys(formData).forEach((key) => {
        formDataToSend.append(key, formData[key]);
      });

      // Add uploaded files (new or replacement files)
      Object.entries(uploadedFiles).forEach(([key, file]) => {
        if (file) {
          formDataToSend.append(key, file);
        }
      });

      // IMPORTANT: Preserve existing documents that weren't replaced
      if (isEditMode) {
        console.log("📋 Original documents:", originalDocuments);
        console.log(
          "📤 New uploaded files:",
          Object.keys(uploadedFiles).filter((k) => uploadedFiles[k]),
        );

        Object.entries(originalDocuments).forEach(([docType, docData]) => {
          // Only preserve if no new file was uploaded for this type
          if (!uploadedFiles[docType] && docData) {
            console.log(
              `📄 Preserving existing document: ${docType}`,
              docData.filename,
            );
            formDataToSend.append(
              `existing_${docType}`,
              JSON.stringify(docData),
            );
          } else if (uploadedFiles[docType]) {
            console.log(`🔄 Replacing document: ${docType} with new file`);
          }
        });
      }

      console.log("Sending form data with files...");

      const url = isEditMode
        ? `${baseURL}/api/admin/drivers/${id}`
        : `${baseURL}/api/admin/drivers`;
      const method = isEditMode ? "put" : "post";

      console.log(`Making ${method.toUpperCase()} request to ${url}`);

      // Get auth token and use multipart/form-data for file upload
      const token = localStorage.getItem("token");
      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      };

      const response = await axios[method](url, formDataToSend, config);
      console.log(
        isEditMode ? "Update response:" : "Create response:",
        response,
      );

      setSuccessMessage(
        isEditMode
          ? "Driver updated successfully!"
          : "Driver added successfully!",
      );
      setError(null);

      // Header navigation will update counts automatically

      if (!isEditMode) {
        // Reset form for new create
        setFormData({
          DriverName: "",
          DriverAddress: "",
          DriverNumber: "",
          DriverEmploymentDate: "",
          DriverDocuments: "",
          DriverUserName: "",
          DriverPassword: "",
          DriverStatus: "active",
          licenseType: "Class C",
          licenseNumber: "",
          licenseExpiryDate: "",
          licenseRegistrationDate: "",
          emergencyContactName: "",
          emergencyContactPhone: "",
          emergencyContactRelationship: "",
        });

        // Reset file uploads
        setUploadedFiles({
          licenseDocument: null,
          medicalCertificate: null,
          idPhoto: null,
          nbiClearance: null,
        });
        setDocumentErrors({});
      }

      // Redirect back to list after a brief pause
      setTimeout(() => {
        history.push("/admin/drivers");
      }, 1500);
    } catch (err) {
      console.error("Error saving driver:", err);

      // Handle document upload errors
      if (
        err.response?.data?.errors &&
        Array.isArray(err.response.data.errors)
      ) {
        setError(err.response.data.errors.join(", "));
      } else if (err.response) {
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
    }
  };

  if (loading) {
    return (
      <div className="modern-form-container">
        <div className="modern-loading">
          <div className="loading-spinner"></div>
          Loading driver data...
        </div>
      </div>
    );
  }

  return (
    <div className="modern-form-container">
      <div className="modern-form-header">
        <h1>{isEditMode ? "Edit Driver" : "Add New Driver"}</h1>
        <p>
          {isEditMode
            ? "Update driver information and documents"
            : "Register a new driver with required documentation"}
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
                  Enter the driver's personal and contact information
                </p>
              </div>
            </div>

            <div className="form-grid form-grid-2">
              <div className="modern-form-group">
                <label htmlFor="DriverName" className="modern-form-label">
                  Full Name <span className="required-indicator">*</span>
                </label>
                <input
                  type="text"
                  id="DriverName"
                  name="DriverName"
                  className="modern-form-input"
                  value={formData.DriverName}
                  onChange={handleChange}
                  required
                  maxLength="100"
                  placeholder="e.g. Juan Dela Cruz"
                />
                <div className="form-help-text">
                  Enter the driver's complete legal name
                </div>
              </div>

              <div className="modern-form-group">
                <label htmlFor="DriverNumber" className="modern-form-label">
                  Phone Number <span className="required-indicator">*</span>
                </label>
                <input
                  type="text"
                  id="DriverNumber"
                  name="DriverNumber"
                  className="modern-form-input"
                  value={formData.DriverNumber}
                  onChange={handleChange}
                  required
                  maxLength="20"
                  placeholder="e.g. +63 912 345 6789"
                />
                <div className="form-help-text">
                  Primary contact number for the driver
                </div>
              </div>
            </div>

            <div className="form-grid form-grid-1">
              <div className="modern-form-group">
                <label htmlFor="DriverAddress" className="modern-form-label">
                  Address <span className="required-indicator">*</span>
                </label>
                <input
                  type="text"
                  id="DriverAddress"
                  name="DriverAddress"
                  className="modern-form-input"
                  value={formData.DriverAddress}
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

            <div className="form-grid form-grid-3">
              <div className="modern-form-group">
                <label
                  htmlFor="DriverEmploymentDate"
                  className="modern-form-label"
                >
                  Employment Date <span className="required-indicator">*</span>
                </label>
                <input
                  type="date"
                  id="DriverEmploymentDate"
                  name="DriverEmploymentDate"
                  className="modern-form-input"
                  value={formData.DriverEmploymentDate}
                  onChange={handleChange}
                  required
                />
                <div className="form-help-text">
                  Date when the driver was hired
                </div>
              </div>

              <div className="modern-form-group">
                <label htmlFor="DriverStatus" className="modern-form-label">
                  Employment Status{" "}
                  <span className="required-indicator">*</span>
                </label>
                <select
                  id="DriverStatus"
                  name="DriverStatus"
                  className="modern-form-select"
                  value={formData.DriverStatus}
                  onChange={handleChange}
                  required
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="on-delivery">On Delivery</option>
                </select>
                <div className="form-help-text">Current employment status</div>
              </div>

              <div className="modern-form-group">
                <label htmlFor="DriverDocuments" className="modern-form-label">
                  Documents Notes (Optional)
                </label>
                <input
                  type="text"
                  id="DriverDocuments"
                  name="DriverDocuments"
                  className="modern-form-input"
                  value={formData.DriverDocuments || ""}
                  onChange={handleChange}
                  maxLength="255"
                  placeholder="Additional document notes"
                />
                <div className="form-help-text">
                  Optional notes about driver documents
                </div>
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
                  Driver license details and qualifications
                </p>
              </div>
            </div>

            <div className="form-grid form-grid-2">
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
                    ? "Can drive mini trucks only"
                    : "Can drive all truck types including heavy vehicles"}
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
                  Driver's license number (optional)
                </div>
              </div>
            </div>

            <div className="form-grid form-grid-2">
              {/* License Registration Date */}
              <div className="modern-form-group">
                <label
                  htmlFor="licenseRegistrationDate"
                  className="modern-form-label"
                >
                  License Registration Date
                </label>
                <input
                  type="date"
                  id="licenseRegistrationDate"
                  name="licenseRegistrationDate"
                  className="modern-form-input"
                  value={formData.licenseRegistrationDate}
                  onChange={handleChange}
                />
                <div className="form-help-text">
                  Date when license was last renewed
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
                  <strong>Class C:</strong> Can drive mini trucks and light
                  vehicles only
                  <br />
                  <strong>Class CE:</strong> Can drive all truck types including
                  4-wheeler, 6-wheeler, 8-wheeler, and 10-wheeler trucks
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Contact Section */}
          <div className="form-section">
            <div className="form-section-header">
              <div className="form-section-icon">🆘</div>
              <div>
                <h3 className="form-section-title">Emergency Contact</h3>
                <p className="form-section-description">
                  Contact person in case of emergency
                </p>
              </div>
            </div>

            <div className="form-grid form-grid-3">
              {/* Emergency Contact Name */}
              <div className="modern-form-group">
                <label
                  htmlFor="emergencyContactName"
                  className="modern-form-label"
                >
                  Emergency Contact Name
                </label>
                <input
                  type="text"
                  id="emergencyContactName"
                  name="emergencyContactName"
                  className="modern-form-input"
                  value={formData.emergencyContactName}
                  onChange={handleChange}
                  maxLength="100"
                  placeholder="e.g. Maria Dela Cruz"
                />
                <div className="form-help-text">
                  Full name of emergency contact
                </div>
              </div>

              {/* Emergency Contact Phone */}
              <div className="modern-form-group">
                <label
                  htmlFor="emergencyContactPhone"
                  className="modern-form-label"
                >
                  Emergency Contact Phone
                </label>
                <input
                  type="text"
                  id="emergencyContactPhone"
                  name="emergencyContactPhone"
                  className="modern-form-input"
                  value={formData.emergencyContactPhone}
                  onChange={handleChange}
                  maxLength="20"
                  placeholder="e.g. +63 912 345 6789"
                />
                <div className="form-help-text">Contact phone number</div>
              </div>

              {/* Emergency Contact Relationship */}
              <div className="modern-form-group">
                <label
                  htmlFor="emergencyContactRelationship"
                  className="modern-form-label"
                >
                  Relationship to Driver
                </label>
                <select
                  id="emergencyContactRelationship"
                  name="emergencyContactRelationship"
                  className="modern-form-select"
                  value={formData.emergencyContactRelationship}
                  onChange={handleChange}
                >
                  <option value="">Select relationship</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Parent">Parent</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Child">Child</option>
                  <option value="Friend">Friend</option>
                  <option value="Other">Other</option>
                </select>
                <div className="form-help-text">Relationship to the driver</div>
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
                  Login credentials for the driver portal
                </p>
              </div>
            </div>

            <div className="form-grid form-grid-2">
              <div className="modern-form-group">
                <label htmlFor="DriverUserName" className="modern-form-label">
                  Username <span className="required-indicator">*</span>
                </label>
                <input
                  type="text"
                  id="DriverUserName"
                  name="DriverUserName"
                  className="modern-form-input"
                  value={formData.DriverUserName}
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
                  <label htmlFor="DriverPassword" className="modern-form-label">
                    Password <span className="required-indicator">*</span>
                  </label>
                  <input
                    type="password"
                    id="DriverPassword"
                    name="DriverPassword"
                    className="modern-form-input"
                    value={formData.DriverPassword || ""}
                    onChange={handleChange}
                    required
                    maxLength="255"
                    placeholder="Minimum 6 characters"
                  />
                  <div className="form-help-text">
                    Secure password for driver login
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
                        Password cannot be changed by admin. Driver must change
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
                  All documents are required for new drivers. Please upload
                  clear, readable copies.
                </p>
              </div>
            </div>

            <div className="form-grid form-grid-2">
              {/* Driver License */}
              <div className="modern-form-group">
                <label htmlFor="licenseDocument" className="modern-form-label">
                  Driver's License <span className="required-indicator">*</span>
                </label>

                {!uploadedFiles.licenseDocument &&
                  !existingDocuments.licenseDocument && (
                    <div className="modern-file-upload">
                      <input
                        type="file"
                        id="licenseDocument"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange(e, "licenseDocument")}
                      />
                      <div className="file-upload-icon">🪪</div>
                      <div className="file-upload-text">
                        <div className="file-upload-primary">
                          Click to upload driver's license
                        </div>
                        <div className="file-upload-secondary">
                          PDF, JPG, PNG up to 25MB
                        </div>
                      </div>
                    </div>
                  )}

                {documentErrors.licenseDocument && (
                  <div
                    className="modern-alert modern-alert-error"
                    style={{ marginTop: "8px" }}
                  >
                    <div className="modern-alert-icon">⚠️</div>
                    <div className="modern-alert-content">
                      {documentErrors.licenseDocument}
                    </div>
                  </div>
                )}

                {uploadedFiles.licenseDocument && (
                  <div className="file-preview">
                    <div className="file-preview-info">
                      <div className="file-preview-icon">🪪</div>
                      <div className="file-preview-name">
                        {uploadedFiles.licenseDocument.name}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile("licenseDocument")}
                      className="file-remove-btn"
                    >
                      ❌
                    </button>
                  </div>
                )}

                {existingDocuments.licenseDocument &&
                  !uploadedFiles.licenseDocument && (
                    <div className="existing-file">
                      <div className="existing-file-info">
                        <div className="existing-file-icon">🪪</div>
                        <div className="existing-file-name">
                          Current:{" "}
                          {existingDocuments.licenseDocument.originalName}
                        </div>
                      </div>
                      <div className="existing-file-actions">
                        <button
                          type="button"
                          onClick={() => handleViewDocument("licenseDocument")}
                          className="file-view-btn"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleReplaceDocument("licenseDocument")
                          }
                          className="file-replace-btn"
                        >
                          Replace
                        </button>
                      </div>
                    </div>
                  )}

                <div className="form-help-text">
                  Upload driver's license (PDF, JPG, PNG - max 25MB)
                </div>
              </div>

              {/* Medical Certificate */}
              <div className="modern-form-group">
                <label
                  htmlFor="medicalCertificate"
                  className="modern-form-label"
                >
                  Medical Certificate{" "}
                  <span className="required-indicator">*</span>
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

                {documentErrors.medicalCertificate && (
                  <div
                    className="modern-alert modern-alert-error"
                    style={{ marginTop: "8px" }}
                  >
                    <div className="modern-alert-icon">⚠️</div>
                    <div className="modern-alert-content">
                      {documentErrors.medicalCertificate}
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
                  Upload medical certificate (PDF, JPG, PNG - max 25MB)
                </div>
              </div>
            </div>

            <div className="form-grid form-grid-2">
              {/* ID Photo */}
              <div className="modern-form-group">
                <label htmlFor="idPhoto" className="modern-form-label">
                  ID Photo <span className="required-indicator">*</span>
                </label>

                {!uploadedFiles.idPhoto && !existingDocuments.idPhoto && (
                  <div className="modern-file-upload">
                    <input
                      type="file"
                      id="idPhoto"
                      accept=".jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange(e, "idPhoto")}
                    />
                    <div className="file-upload-icon">📷</div>
                    <div className="file-upload-text">
                      <div className="file-upload-primary">
                        Click to upload ID photo
                      </div>
                      <div className="file-upload-secondary">
                        JPG, PNG up to 25MB
                      </div>
                    </div>
                  </div>
                )}

                {documentErrors.idPhoto && (
                  <div
                    className="modern-alert modern-alert-error"
                    style={{ marginTop: "8px" }}
                  >
                    <div className="modern-alert-icon">⚠️</div>
                    <div className="modern-alert-content">
                      {documentErrors.idPhoto}
                    </div>
                  </div>
                )}

                {uploadedFiles.idPhoto && (
                  <div className="file-preview">
                    <div className="file-preview-info">
                      <div className="file-preview-icon">📷</div>
                      <div className="file-preview-name">
                        {uploadedFiles.idPhoto.name}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile("idPhoto")}
                      className="file-remove-btn"
                    >
                      ❌
                    </button>
                  </div>
                )}

                {existingDocuments.idPhoto && !uploadedFiles.idPhoto && (
                  <div className="existing-file">
                    <div className="existing-file-info">
                      <div className="existing-file-icon">📷</div>
                      <div className="existing-file-name">
                        Current: {existingDocuments.idPhoto.originalName}
                      </div>
                    </div>
                    <div className="existing-file-actions">
                      <button
                        type="button"
                        onClick={() => handleViewDocument("idPhoto")}
                        className="file-view-btn"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReplaceDocument("idPhoto")}
                        className="file-replace-btn"
                      >
                        Replace
                      </button>
                    </div>
                  </div>
                )}

                <div className="form-help-text">
                  Upload clear ID photo (JPG, PNG - max 25MB)
                </div>
              </div>

              {/* NBI Clearance */}
              <div className="modern-form-group">
                <label htmlFor="nbiClearance" className="modern-form-label">
                  NBI Clearance (Optional)
                </label>

                {!uploadedFiles.nbiClearance &&
                  !existingDocuments.nbiClearance && (
                    <div className="modern-file-upload">
                      <input
                        type="file"
                        id="nbiClearance"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange(e, "nbiClearance")}
                      />
                      <div className="file-upload-icon">📋</div>
                      <div className="file-upload-text">
                        <div className="file-upload-primary">
                          Click to upload NBI clearance
                        </div>
                        <div className="file-upload-secondary">
                          PDF, JPG, PNG up to 25MB
                        </div>
                      </div>
                    </div>
                  )}

                {documentErrors.nbiClearance && (
                  <div
                    className="modern-alert modern-alert-error"
                    style={{ marginTop: "8px" }}
                  >
                    <div className="modern-alert-icon">⚠️</div>
                    <div className="modern-alert-content">
                      {documentErrors.nbiClearance}
                    </div>
                  </div>
                )}

                {uploadedFiles.nbiClearance && (
                  <div className="file-preview">
                    <div className="file-preview-info">
                      <div className="file-preview-icon">📋</div>
                      <div className="file-preview-name">
                        {uploadedFiles.nbiClearance.name}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile("nbiClearance")}
                      className="file-remove-btn"
                    >
                      ❌
                    </button>
                  </div>
                )}

                {existingDocuments.nbiClearance &&
                  !uploadedFiles.nbiClearance && (
                    <div className="existing-file">
                      <div className="existing-file-info">
                        <div className="existing-file-icon">📋</div>
                        <div className="existing-file-name">
                          Current: {existingDocuments.nbiClearance.originalName}
                        </div>
                      </div>
                      <div className="existing-file-actions">
                        <button
                          type="button"
                          onClick={() => handleViewDocument("nbiClearance")}
                          className="file-view-btn"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReplaceDocument("nbiClearance")}
                          className="file-replace-btn"
                        >
                          Replace
                        </button>
                      </div>
                    </div>
                  )}

                <div className="form-help-text">
                  Optional: Upload NBI clearance (PDF, JPG, PNG - max 25MB)
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="modern-btn-group">
            <button
              type="button"
              className="modern-btn modern-btn-secondary"
              onClick={() => history.push("/admin/drivers")}
            >
              ← Cancel
            </button>
            <button type="submit" className="modern-btn modern-btn-primary">
              {isEditMode ? "💾 Update Driver" : "✅ Add Driver"}
            </button>
          </div>
        </form>
      </div>

      {/* Document Preview Modal */}
      {showPreviewModal && previewDocument && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowPreviewModal(false);
            setPreviewDocument(null);
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "90%", maxHeight: "90vh" }}
          >
            <div className="modal-header">
              <h3>📄 {previewDocument.filename || "Document Preview"}</h3>
              <button
                className="modal-close-btn"
                onClick={() => {
                  setShowPreviewModal(false);
                  setPreviewDocument(null);
                }}
              >
                ✕
              </button>
            </div>
            <div
              className="modal-body"
              style={{ textAlign: "center", padding: "20px" }}
            >
              <img
                src={previewDocument.url}
                alt={previewDocument.filename}
                style={{
                  maxWidth: "100%",
                  maxHeight: "calc(90vh - 150px)",
                  objectFit: "contain",
                }}
                onError={(e) => {
                  console.error("Error loading image:", previewDocument.url);
                  e.target.style.display = "none";
                  e.target.parentElement.innerHTML +=
                    '<p style="color: red;">Failed to load image. Please check the file exists.</p>';
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverForm;
