// src/pages/admin/trucks/TruckForm.js - Enhanced with better status tracking

import React, { useState, useEffect } from "react";
import { useParams, useHistory } from "react-router-dom";
import axios from "axios";
import "../../../styles/ModernForms.css";
import "../../../styles/DesignSystem.css";
import "./TruckForm.css";
// Sidebar import removed - using header navigation now
import FileViewer from "../../../components/FileViewer";
import TruckDocumentUpload from "../../../components/TruckDocumentUpload";

const TruckForm = () => {
  const { id } = useParams();
  const history = useHistory();
  const isEditMode = Boolean(id);
  const baseURL = process.env.REACT_APP_API_URL || "http://localhost:5007";

  const [formData, setFormData] = useState({
    TruckPlate: "",
    TruckType: "mini truck",
    TruckCapacity: "2", // Default capacity for mini truck
    TruckBrand: "Toyota", // Default brand
    ModelYear: new Date().getFullYear(), // Default to current year
    // Registration tracking
    registrationDate: "", // Date when truck was last registered/renewed
    registrationExpiryDate: "", // When registration expires (annual renewal)
    // Legacy status for compatibility
    TruckStatus: "available",
    // Enhanced status tracking
    AllocationStatus: "available",
    OperationalStatus: "active",
    AvailabilityStatus: "free",
    // Additional fields
    MaintenanceScheduled: false,
    StatusReason: "",
  });
  const [isOtherBrand, setIsOtherBrand] = useState(false);
  const [customBrand, setCustomBrand] = useState("");
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState({
    orDocument: null,
    crDocument: null,
    insuranceDocument: null,
    licenseRequirement: null,
  });
  const [documentErrors, setDocumentErrors] = useState({});
  const [existingDocuments, setExistingDocuments] = useState({});

  // Document preview state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewDocument, setPreviewDocument] = useState(null);

  // Debug: Monitor uploadedFiles state changes
  useEffect(() => {
    console.log("🔄 uploadedFiles state changed:", uploadedFiles);
    console.log("📋 OR Document:", uploadedFiles.orDocument?.name || "none");
    console.log("📋 CR Document:", uploadedFiles.crDocument?.name || "none");
    console.log(
      "📋 Insurance Document:",
      uploadedFiles.insuranceDocument?.name || "none"
    );
    console.log(
      "📋 License Requirement:",
      uploadedFiles.licenseRequirement?.name || "none"
    );
  }, [uploadedFiles]);

  // Get capacity based on truck type
  const getCapacityFromType = (truckType) => {
    switch (truckType) {
      case "mini truck":
        return "2";
      case "4 wheeler":
        return "3";
      case "6 wheeler":
        return "4";
      case "8 wheeler":
        return "6";
      default:
        return "2";
    }
  };

  // Fetch truck data when editing
  useEffect(() => {
    const fetchTruck = async () => {
      if (!isEditMode) {
        setLoading(false);
        return;
      }

      try {
        console.log(`Fetching truck data for ID: ${id}`);
        const response = await axios.get(`${baseURL}/api/trucks/${id}`);
        console.log("Truck data fetched:", response.data);

        const truck = response.data;
        const brandValue = truck.truckBrand || "Toyota";
        const predefinedBrands = [
          "Toyota",
          "Isuzu",
          "Mitsubishi",
          "Hyundai",
          "Foton",
          "Hino",
          "Nissan",
          "Ford",
          "Suzuki",
          "Kia",
        ];

        // Check if brand is a custom value (not in predefined list)
        const isCustomBrand = !predefinedBrands.includes(brandValue);

        setFormData({
          TruckPlate: truck.truckPlate || "",
          TruckType: truck.truckType || "mini truck",
          TruckCapacity: truck.truckCapacity || "2",
          TruckBrand: isCustomBrand ? "Other" : brandValue,
          ModelYear: truck.modelYear || new Date().getFullYear(),
          // Registration dates
          registrationDate: truck.registrationDate || "",
          registrationExpiryDate: truck.registrationExpiryDate || "",
          // Legacy status
          TruckStatus: truck.truckStatus || "available",
          // Enhanced status fields
          AllocationStatus: truck.allocationStatus || "available",
          OperationalStatus: truck.operationalStatus || "active",
          AvailabilityStatus: truck.availabilityStatus || "free",
          MaintenanceScheduled:
            truck.maintenanceScheduled === true ||
            truck.maintenanceScheduled === "true",
          StatusReason: truck.lastStatusReason || "",
        });

        // If custom brand, set the state
        if (isCustomBrand) {
          setIsOtherBrand(true);
          setCustomBrand(brandValue);
        }

        // Set existing documents
        if (truck.documents) {
          setExistingDocuments(truck.documents);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching truck:", err);
        setError(
          `Failed to load truck data: ${
            err.response?.data?.message || err.message
          }`
        );
        setLoading(false);
      }
    };

    fetchTruck();
  }, [id, isEditMode, baseURL]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // If truck type is changed, automatically update the capacity
    if (name === "TruckType") {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        TruckCapacity: getCapacityFromType(value),
      }));
    } else if (name === "TruckBrand") {
      // Check if "Other" is selected
      if (value === "Other") {
        setIsOtherBrand(true);
        setCustomBrand(""); // Clear custom brand when switching to Other
      } else {
        setIsOtherBrand(false);
        setCustomBrand("");
      }
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    } else if (type === "checkbox") {
      setFormData((prev) => ({
        ...prev,
        [name]: checked,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Handle custom brand input
  const handleCustomBrandChange = (e) => {
    setCustomBrand(e.target.value);
  };

  // Handle file uploads
  const handleFileChange = (e, documentType) => {
    console.log("📤 File change triggered for:", documentType);
    console.log("📄 Event target:", e.target);
    console.log("📄 Files:", e.target.files);

    const file = e.target.files[0];
    console.log("📄 Selected file:", file);

    if (file) {
      console.log("📄 File details:", {
        name: file.name,
        size: file.size,
        type: file.type,
      });

      // Validate file size (max 25MB)
      if (file.size > 25 * 1024 * 1024) {
        console.error("❌ File too large:", file.size);
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
        console.error("❌ Invalid file type:", file.type);
        setDocumentErrors((prev) => ({
          ...prev,
          [documentType]: "Only PDF, JPG, and PNG files are allowed",
        }));
        return;
      }

      console.log("✅ File validation passed");

      // Clear any previous errors
      setDocumentErrors((prev) => ({
        ...prev,
        [documentType]: null,
      }));

      console.log("📦 Setting uploaded file in state");
      setUploadedFiles((prev) => {
        const newState = {
          ...prev,
          [documentType]: file,
        };
        console.log("📦 New uploadedFiles state:", newState);
        return newState;
      });

      console.log("✅ File upload complete for:", documentType);
    } else {
      console.warn("⚠️ No file selected");
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
      if (documentType === "orDocument" || documentType === "crDocument") {
        subfolder = "OR-CR-Files";
      } else if (documentType === "insuranceDocument") {
        subfolder = "Insurance-Papers";
      } else if (documentType === "licenseRequirement") {
        subfolder = "License-Documents";
      }

      // Construct the relative path
      const relativePath = subfolder
        ? `Truck-Documents/${subfolder}/${filename}`
        : `Truck-Documents/${filename}`;

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

  // Delete functionality removed - users should use Replace instead to update documents

  // Get license requirements based on truck type
  const getLicenseRequirements = (truckType) => {
    const requirements = {
      "mini truck": {
        driverLicense: "Non-professional License",
        helpers: 1,
        helperRequirements: ["Valid ID", "Barangay Clearance"],
      },
      "4 wheeler": {
        driverLicense: "Professional License",
        helpers: 1,
        helperRequirements: [
          "Valid ID",
          "Barangay Clearance",
          "Medical Certificate",
        ],
      },
      "6 wheeler": {
        driverLicense: "Professional License",
        helpers: 2,
        helperRequirements: [
          "Valid ID",
          "Barangay Clearance",
          "Medical Certificate",
        ],
      },
      "8 wheeler": {
        driverLicense: "Professional License",
        helpers: 2,
        helperRequirements: [
          "Valid ID",
          "Barangay Clearance",
          "Medical Certificate",
        ],
      },
      "10 wheeler": {
        driverLicense: "Professional License",
        helpers: 3,
        helperRequirements: [
          "Valid ID",
          "Barangay Clearance",
          "Medical Certificate",
        ],
      },
    };

    return requirements[truckType] || requirements["mini truck"];
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log(
        "Form submission:",
        isEditMode ? "UPDATE" : "CREATE",
        formData
      );

      // Validate custom brand if "Other" is selected
      if (isOtherBrand && !customBrand.trim()) {
        setError('Please enter a custom brand name when "Other" is selected');
        return;
      }

      // Document validation - make OR, CR, and Insurance required
      if (!isEditMode) {
        const requiredDocs = ["orDocument", "crDocument", "insuranceDocument"];
        const missingDocs = requiredDocs.filter((doc) => !uploadedFiles[doc]);

        if (missingDocs.length > 0) {
          setError(
            `Please upload all required documents: ${missingDocs
              .map((doc) => doc.replace("Document", "").toUpperCase())
              .join(", ")}`
          );
          return;
        }
      }

      // Create FormData for file upload
      const formDataToSend = new FormData();

      // Add form fields
      formDataToSend.append("truckPlate", formData.TruckPlate);
      formDataToSend.append("truckType", formData.TruckType);
      formDataToSend.append("truckCapacity", formData.TruckCapacity);
      // Use custom brand if "Other" is selected, otherwise use dropdown value
      const brandToSave =
        isOtherBrand && customBrand.trim()
          ? customBrand.trim()
          : formData.TruckBrand;
      formDataToSend.append("truckBrand", brandToSave);
      formDataToSend.append("modelYear", formData.ModelYear);
      // Registration dates
      formDataToSend.append("registrationDate", formData.registrationDate);
      formDataToSend.append(
        "registrationExpiryDate",
        formData.registrationExpiryDate
      );
      formDataToSend.append("truckStatus", formData.TruckStatus);
      formDataToSend.append("allocationStatus", formData.AllocationStatus);
      formDataToSend.append("operationalStatus", formData.OperationalStatus);
      formDataToSend.append("availabilityStatus", formData.AvailabilityStatus);
      formDataToSend.append(
        "maintenanceScheduled",
        formData.MaintenanceScheduled
      );
      formDataToSend.append("lastStatusReason", formData.StatusReason);

      // Add uploaded files (new files)
      Object.entries(uploadedFiles).forEach(([key, file]) => {
        if (file) {
          console.log(`📄 Adding new file ${key}:`, file.name, file.size);
          formDataToSend.append(key, file);
        }
      });

      // For edit mode, preserve existing documents if no new files are uploaded
      if (isEditMode) {
        Object.entries(existingDocuments).forEach(([key, doc]) => {
          if (doc && !uploadedFiles[key]) {
            console.log(
              `📄 Preserving existing document ${key}:`,
              doc.filename
            );
            // Add existing document info to preserve it
            formDataToSend.append(`existing_${key}`, JSON.stringify(doc));
          }
        });
      }

      console.log("Sending form data with files...");
      console.log("Uploaded files:", uploadedFiles);
      console.log("FormData entries:");
      for (let [key, value] of formDataToSend.entries()) {
        console.log(
          `  ${key}:`,
          value instanceof File ? `${value.name} (${value.size} bytes)` : value
        );
      }

      const url = isEditMode
        ? `${baseURL}/api/admin/trucks/${id}`
        : `${baseURL}/api/admin/trucks`;
      const method = isEditMode ? "put" : "post";

      console.log(`Making ${method.toUpperCase()} request to ${url}`);
      console.log("Full URL:", url);
      console.log("Base URL:", baseURL);

      // Use multipart/form-data for file upload - let axios set the Content-Type automatically
      const config = {
        headers: {
          // Don't set Content-Type - let axios handle it with proper boundary
        },
      };

      console.log("About to send request...");
      const response = await axios[method](url, formDataToSend, config);
      console.log(
        isEditMode ? "Update response:" : "Create response:",
        response
      );

      setSuccessMessage(
        isEditMode ? "Truck updated successfully!" : "Truck added successfully!"
      );
      setError(null);

      // Header navigation will update counts automatically

      if (!isEditMode) {
        // Reset form for new create
        setFormData({
          TruckPlate: "",
          TruckType: "mini truck",
          TruckCapacity: "2",
          TruckBrand: "Toyota",
          ModelYear: new Date().getFullYear(),
          registrationDate: "",
          registrationExpiryDate: "",
          TruckStatus: "available",
          AllocationStatus: "available",
          OperationalStatus: "active",
          AvailabilityStatus: "free",
          MaintenanceScheduled: false,
          StatusReason: "",
        });

        // Reset file uploads
        setUploadedFiles({
          orDocument: null,
          crDocument: null,
          insuranceDocument: null,
          licenseRequirement: null,
        });
        setDocumentErrors({});

        // Reset custom brand states
        setIsOtherBrand(false);
        setCustomBrand("");
      }

      // Redirect back to list after a brief pause
      setTimeout(() => {
        history.push("/admin/trucks");
      }, 1500);
    } catch (err) {
      console.error("Error saving truck:", err);
      console.error("Error details:", {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        url: err.config?.url,
        method: err.config?.method,
      });

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
          }`
        );
      } else if (err.request) {
        setError(
          "No response received from server. Please check your API connection."
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
          Loading truck data...
        </div>
      </div>
    );
  }

  return (
    <div className="modern-form-container">
      <div className="modern-form-header">
        <h1>{isEditMode ? "Edit Truck" : "Add New Truck"}</h1>
        <p>
          {isEditMode
            ? "Update truck information and documents"
            : "Register a new truck with required documentation"}
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
              <div className="form-section-icon">🚛</div>
              <div>
                <h3 className="form-section-title">Basic Information</h3>
                <p className="form-section-description">
                  Enter the truck's basic identification and specifications
                </p>
              </div>
            </div>

            <div className="form-grid form-grid-2">
              <div className="modern-form-group">
                <label htmlFor="TruckPlate" className="modern-form-label">
                  Plate Number <span className="required-indicator">*</span>
                </label>
                <input
                  type="text"
                  id="TruckPlate"
                  name="TruckPlate"
                  className="modern-form-input"
                  value={formData.TruckPlate}
                  onChange={handleChange}
                  required
                  maxLength="20"
                  placeholder="e.g. ABC-1234"
                />
                <div className="form-help-text">
                  Enter the official license plate number
                </div>
              </div>

              <div className="modern-form-group">
                <label htmlFor="TruckType" className="modern-form-label">
                  Truck Type <span className="required-indicator">*</span>
                </label>
                <select
                  id="TruckType"
                  name="TruckType"
                  className="modern-form-select"
                  value={formData.TruckType}
                  onChange={handleChange}
                  required
                >
                  <option value="mini truck">Mini Truck</option>
                  <option value="4 wheeler">4 Wheeler</option>
                  <option value="6 wheeler">6 Wheeler</option>
                  <option value="8 wheeler">8 Wheeler</option>
                  <option value="10 wheeler">10 Wheeler</option>
                </select>
                <div className="form-help-text">
                  Select the truck classification
                </div>
              </div>
            </div>

            <div className="form-grid form-grid-3">
              <div className="modern-form-group">
                <label
                  htmlFor="TruckCapacityDisplay"
                  className="modern-form-label"
                >
                  Capacity <span className="required-indicator">*</span>
                </label>
                <input
                  type="text"
                  id="TruckCapacityDisplay"
                  className="modern-form-input"
                  value={`${formData.TruckCapacity} tons`}
                  disabled
                  style={{
                    backgroundColor: "var(--gray-100)",
                    color: "var(--gray-600)",
                  }}
                />
                <div className="form-help-text">
                  Automatically calculated based on truck type
                </div>
                <input
                  type="hidden"
                  id="TruckCapacity"
                  name="TruckCapacity"
                  value={formData.TruckCapacity}
                />
              </div>

              <div className="modern-form-group">
                <label htmlFor="TruckBrand" className="modern-form-label">
                  Brand <span className="required-indicator">*</span>
                </label>
                <select
                  id="TruckBrand"
                  name="TruckBrand"
                  className="modern-form-select"
                  value={formData.TruckBrand}
                  onChange={handleChange}
                  required
                >
                  <option value="Toyota">Toyota</option>
                  <option value="Isuzu">Isuzu</option>
                  <option value="Mitsubishi">Mitsubishi</option>
                  <option value="Hyundai">Hyundai</option>
                  <option value="Foton">Foton</option>
                  <option value="Hino">Hino</option>
                  <option value="Nissan">Nissan</option>
                  <option value="Ford">Ford</option>
                  <option value="Suzuki">Suzuki</option>
                  <option value="Kia">Kia</option>
                  <option value="Other">Other (Enter custom brand)</option>
                </select>
                <div className="form-help-text">
                  {isOtherBrand
                    ? "Enter custom brand name below"
                    : "Select the truck manufacturer"}
                </div>
              </div>

              {/* Show custom brand input when "Other" is selected */}
              {isOtherBrand && (
                <div className="modern-form-group">
                  <label htmlFor="CustomBrand" className="modern-form-label">
                    Custom Brand Name{" "}
                    <span className="required-indicator">*</span>
                  </label>
                  <input
                    type="text"
                    id="CustomBrand"
                    name="CustomBrand"
                    className="modern-form-input"
                    value={customBrand}
                    onChange={handleCustomBrandChange}
                    placeholder="e.g. Mercedes-Benz, Volvo, etc."
                    required
                    maxLength="50"
                  />
                  <div className="form-help-text">
                    Enter the custom truck brand name
                  </div>
                </div>
              )}

              <div className="modern-form-group">
                <label htmlFor="ModelYear" className="modern-form-label">
                  Model Year
                </label>
                <input
                  type="number"
                  id="ModelYear"
                  name="ModelYear"
                  className="modern-form-input"
                  value={formData.ModelYear}
                  onChange={handleChange}
                  min="1990"
                  max={new Date().getFullYear() + 1}
                  placeholder="e.g. 2023"
                />
                <div className="form-help-text">
                  Year the truck was manufactured
                </div>
              </div>
            </div>
          </div>

          {/* Registration Information Section */}
          <div className="form-section">
            <div className="form-section-header">
              <div className="form-section-icon">📋</div>
              <div>
                <h3 className="form-section-title">Registration Information</h3>
                <p className="form-section-description">
                  Track truck registration dates and expiry (Annual renewal)
                </p>
              </div>
            </div>

            <div className="form-grid form-grid-2">
              {/* Registration Date */}
              <div className="modern-form-group">
                <label htmlFor="registrationDate" className="modern-form-label">
                  Registration Date
                </label>
                <input
                  type="date"
                  id="registrationDate"
                  name="registrationDate"
                  className="modern-form-input"
                  value={formData.registrationDate}
                  onChange={handleChange}
                />
                <div className="form-help-text">
                  Date when truck was last registered/renewed
                </div>
              </div>

              {/* Registration Expiry Date */}
              <div className="modern-form-group">
                <label
                  htmlFor="registrationExpiryDate"
                  className="modern-form-label"
                >
                  Registration Expiry Date{" "}
                  <span className="required-indicator">*</span>
                </label>
                <input
                  type="date"
                  id="registrationExpiryDate"
                  name="registrationExpiryDate"
                  className="modern-form-input"
                  value={formData.registrationExpiryDate}
                  onChange={handleChange}
                  required
                />
                <div className="form-help-text">
                  When the truck registration expires (annual)
                </div>
              </div>
            </div>

            {/* Registration Warning Info */}
            <div
              className="modern-alert modern-alert-warning"
              style={{ marginTop: "16px" }}
            >
              <div className="modern-alert-icon">⚠️</div>
              <div className="modern-alert-content">
                <div className="modern-alert-title">
                  Registration Monitoring
                </div>
                <div>
                  The system will automatically block this truck from allocation
                  and booking when registration is expiring within 30 days or
                  has expired. The truck cannot be booked if its registration
                  will expire during the delivery period.
                </div>
              </div>
            </div>
          </div>

          {/* Status Management Section */}
          <div className="form-section">
            <div className="form-section-header">
              <div className="form-section-icon">📊</div>
              <div>
                <h3 className="form-section-title">Status Management</h3>
                <p className="form-section-description">
                  Configure the truck's operational and allocation status
                </p>
              </div>
            </div>

            <div className="form-grid form-grid-2">
              <div className="modern-form-group">
                <label htmlFor="AllocationStatus" className="modern-form-label">
                  Allocation Status{" "}
                  <span className="required-indicator">*</span>
                </label>
                <select
                  id="AllocationStatus"
                  name="AllocationStatus"
                  className="modern-form-select"
                  value={formData.AllocationStatus}
                  onChange={handleChange}
                  required
                >
                  <option value="available">Available</option>
                  <option value="allocated">Allocated</option>
                  <option value="reserved">Reserved</option>
                </select>
                <div className="form-help-text">
                  Whether the truck is allocated to a client
                </div>
              </div>

              <div className="modern-form-group">
                <label
                  htmlFor="OperationalStatus"
                  className="modern-form-label"
                >
                  Operational Status{" "}
                  <span className="required-indicator">*</span>
                </label>
                <select
                  id="OperationalStatus"
                  name="OperationalStatus"
                  className="modern-form-select"
                  value={formData.OperationalStatus}
                  onChange={handleChange}
                  required
                >
                  <option value="active">Active</option>
                  <option value="maintenance">Under Maintenance</option>
                  <option value="out-of-service">Out of Service</option>
                  <option value="standby">Standby</option>
                </select>
                <div className="form-help-text">
                  The operational condition of the truck
                </div>
              </div>
            </div>

            <div className="form-grid form-grid-2">
              <div className="modern-form-group">
                <label
                  htmlFor="AvailabilityStatus"
                  className="modern-form-label"
                >
                  Availability Status{" "}
                  <span className="required-indicator">*</span>
                </label>
                <select
                  id="AvailabilityStatus"
                  name="AvailabilityStatus"
                  className="modern-form-select"
                  value={formData.AvailabilityStatus}
                  onChange={handleChange}
                  required
                >
                  <option value="free">Free</option>
                  <option value="busy">Busy</option>
                  <option value="scheduled">Scheduled</option>
                </select>
                <div className="form-help-text">
                  Current availability for new assignments
                </div>
              </div>

              <div className="modern-form-group">
                <label htmlFor="TruckStatus" className="modern-form-label">
                  Legacy Status <span className="required-indicator">*</span>
                </label>
                <select
                  id="TruckStatus"
                  name="TruckStatus"
                  className="modern-form-select"
                  value={formData.TruckStatus}
                  onChange={handleChange}
                  required
                >
                  <option value="available">Available</option>
                  <option value="allocated">Allocated</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="on-delivery">On Delivery</option>
                </select>
                <div className="form-help-text">
                  Legacy status field for compatibility
                </div>
              </div>
            </div>

            <div className="form-grid form-grid-2">
              <div className="modern-form-group">
                <label className="modern-form-label">
                  <input
                    type="checkbox"
                    name="MaintenanceScheduled"
                    checked={formData.MaintenanceScheduled}
                    onChange={handleChange}
                    style={{ marginRight: "8px" }}
                  />
                  Maintenance Scheduled
                </label>
                <div className="form-help-text">
                  Check if maintenance is scheduled for this truck
                </div>
              </div>

              <div className="modern-form-group">
                <label htmlFor="StatusReason" className="modern-form-label">
                  Status Reason (Optional)
                </label>
                <textarea
                  id="StatusReason"
                  name="StatusReason"
                  className="modern-form-textarea"
                  value={formData.StatusReason}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Optional reason for the current status..."
                />
                <div className="form-help-text">
                  Optional explanation for the current status
                </div>
              </div>
            </div>
          </div>

          {/* License Requirements Section */}
          <div className="form-section">
            <div className="form-section-header">
              <div className="form-section-icon">🪪</div>
              <div>
                <h3 className="form-section-title">
                  License Requirements for {formData.TruckType}
                </h3>
                <p className="form-section-description">
                  Required licenses and personnel for this truck type
                </p>
              </div>
            </div>

            {(() => {
              const requirements = getLicenseRequirements(formData.TruckType);
              return (
                <div className="requirements-display">
                  <div className="requirement-item">
                    <div className="requirement-icon">👤</div>
                    <div className="requirement-content">
                      <strong>Driver License Required:</strong>{" "}
                      {requirements.driverLicense}
                    </div>
                  </div>
                  <div className="requirement-item">
                    <div className="requirement-icon">👥</div>
                    <div className="requirement-content">
                      <strong>Number of Helpers Required:</strong>{" "}
                      {requirements.helpers}
                    </div>
                  </div>
                  <div className="requirement-item">
                    <div className="requirement-icon">📋</div>
                    <div className="requirement-content">
                      <strong>Helper Requirements:</strong>
                      <ul>
                        {requirements.helperRequirements.map((req, index) => (
                          <li key={index}>{req}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Document Upload Section */}
          <div className="form-section">
            <div className="form-section-header">
              <div className="form-section-icon">📄</div>
              <div>
                <h3 className="form-section-title">Required Documents</h3>
                <p className="form-section-description">
                  All documents are required for new trucks. Please ensure OR/CR
                  documents contain the correct plate number.
                </p>
              </div>
            </div>

            <div className="form-grid form-grid-2">
              {/* OR Document */}
              <div className="modern-form-group">
                <label htmlFor="orDocument" className="modern-form-label">
                  Original Receipt (OR){" "}
                  <span className="required-indicator">*</span>
                </label>

                {/* Hidden file input - always rendered for Replace functionality */}
                <input
                  type="file"
                  id="orDocument"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(e, "orDocument")}
                  style={{ display: "none" }}
                />

                {!uploadedFiles.orDocument && !existingDocuments.orDocument && (
                  <div
                    className="modern-file-upload"
                    onClick={() =>
                      document.getElementById("orDocument").click()
                    }
                  >
                    <div className="file-upload-icon">📄</div>
                    <div className="file-upload-text">
                      <div className="file-upload-primary">
                        Click to upload OR document
                      </div>
                      <div className="file-upload-secondary">
                        PDF, JPG, PNG up to 25MB
                      </div>
                    </div>
                  </div>
                )}

                {documentErrors.orDocument && (
                  <div
                    className="modern-alert modern-alert-error"
                    style={{ marginTop: "8px" }}
                  >
                    <div className="modern-alert-icon">⚠️</div>
                    <div className="modern-alert-content">
                      {documentErrors.orDocument}
                    </div>
                  </div>
                )}

                {uploadedFiles.orDocument && (
                  <div className="file-preview">
                    <div className="file-preview-info">
                      <div className="file-preview-icon">📄</div>
                      <div className="file-preview-name">
                        {uploadedFiles.orDocument.name}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile("orDocument")}
                      className="file-remove-btn"
                    >
                      ❌
                    </button>
                  </div>
                )}

                {existingDocuments.orDocument && !uploadedFiles.orDocument && (
                  <div className="existing-file">
                    <div className="existing-file-info">
                      <div className="existing-file-icon">📄</div>
                      <div className="existing-file-name">
                        Current: {existingDocuments.orDocument.originalName}
                      </div>
                    </div>
                    <div className="existing-file-actions">
                      <button
                        type="button"
                        onClick={() => handleViewDocument("orDocument")}
                        className="file-view-btn"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReplaceDocument("orDocument")}
                        className="file-replace-btn"
                      >
                        Replace
                      </button>
                    </div>
                  </div>
                )}

                <div className="form-help-text">
                  Upload the Original Receipt document (PDF, JPG, PNG - max
                  25MB)
                </div>
              </div>

              {/* Certificate of Registration (CR) */}
              <div className="modern-form-group">
                <label htmlFor="crDocument" className="modern-form-label">
                  Certificate of Registration (CR){" "}
                  <span className="required-indicator">*</span>
                </label>

                {/* Hidden file input - always rendered for Replace functionality */}
                <input
                  type="file"
                  id="crDocument"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(e, "crDocument")}
                  style={{ display: "none" }}
                />

                {!uploadedFiles.crDocument && !existingDocuments.crDocument && (
                  <div
                    className="modern-file-upload"
                    onClick={() =>
                      document.getElementById("crDocument").click()
                    }
                  >
                    <div className="file-upload-icon">📋</div>
                    <div className="file-upload-text">
                      <div className="file-upload-primary">
                        Click to upload CR document
                      </div>
                      <div className="file-upload-secondary">
                        PDF, JPG, PNG up to 25MB
                      </div>
                    </div>
                  </div>
                )}

                {documentErrors.crDocument && (
                  <div
                    className="modern-alert modern-alert-error"
                    style={{ marginTop: "8px" }}
                  >
                    <div className="modern-alert-icon">⚠️</div>
                    <div className="modern-alert-content">
                      {documentErrors.crDocument}
                    </div>
                  </div>
                )}

                {uploadedFiles.crDocument && (
                  <div className="file-preview">
                    <div className="file-preview-info">
                      <div className="file-preview-icon">📋</div>
                      <div className="file-preview-name">
                        {uploadedFiles.crDocument.name}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile("crDocument")}
                      className="file-remove-btn"
                    >
                      ❌
                    </button>
                  </div>
                )}

                {existingDocuments.crDocument && !uploadedFiles.crDocument && (
                  <div className="existing-file">
                    <div className="existing-file-info">
                      <div className="existing-file-icon">📋</div>
                      <div className="existing-file-name">
                        Current: {existingDocuments.crDocument.originalName}
                      </div>
                    </div>
                    <div className="existing-file-actions">
                      <button
                        type="button"
                        onClick={() => handleViewDocument("crDocument")}
                        className="file-view-btn"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReplaceDocument("crDocument")}
                        className="file-replace-btn"
                      >
                        Replace
                      </button>
                    </div>
                  </div>
                )}

                <div className="form-help-text">
                  Upload Certificate of Registration document (PDF, JPG, PNG -
                  max 25MB)
                </div>
              </div>
            </div>

            <div className="form-grid form-grid-1">
              {/* Insurance Document */}
              <div className="modern-form-group">
                <label
                  htmlFor="insuranceDocument"
                  className="modern-form-label"
                >
                  Insurance Papers <span className="required-indicator">*</span>
                </label>

                {/* Hidden file input - always rendered for Replace functionality */}
                <input
                  type="file"
                  id="insuranceDocument"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(e, "insuranceDocument")}
                  style={{ display: "none" }}
                />

                {!uploadedFiles.insuranceDocument &&
                  !existingDocuments.insuranceDocument && (
                    <div
                      className="modern-file-upload"
                      onClick={() =>
                        document.getElementById("insuranceDocument").click()
                      }
                    >
                      <div className="file-upload-icon">🛡️</div>
                      <div className="file-upload-text">
                        <div className="file-upload-primary">
                          Click to upload insurance documents
                        </div>
                        <div className="file-upload-secondary">
                          PDF, JPG, PNG up to 25MB
                        </div>
                      </div>
                    </div>
                  )}

                {documentErrors.insuranceDocument && (
                  <div
                    className="modern-alert modern-alert-error"
                    style={{ marginTop: "8px" }}
                  >
                    <div className="modern-alert-icon">⚠️</div>
                    <div className="modern-alert-content">
                      {documentErrors.insuranceDocument}
                    </div>
                  </div>
                )}

                {uploadedFiles.insuranceDocument && (
                  <div className="file-preview">
                    <div className="file-preview-info">
                      <div className="file-preview-icon">🛡️</div>
                      <div className="file-preview-name">
                        {uploadedFiles.insuranceDocument.name}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile("insuranceDocument")}
                      className="file-remove-btn"
                    >
                      ❌
                    </button>
                  </div>
                )}

                {existingDocuments.insuranceDocument &&
                  !uploadedFiles.insuranceDocument && (
                    <div className="existing-file">
                      <div className="existing-file-info">
                        <div className="existing-file-icon">🛡️</div>
                        <div className="existing-file-name">
                          Current:{" "}
                          {existingDocuments.insuranceDocument.originalName}
                        </div>
                      </div>
                      <div className="existing-file-actions">
                        <button
                          type="button"
                          onClick={() =>
                            handleViewDocument("insuranceDocument")
                          }
                          className="file-view-btn"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleReplaceDocument("insuranceDocument")
                          }
                          className="file-replace-btn"
                        >
                          Replace
                        </button>
                      </div>
                    </div>
                  )}

                <div className="form-help-text">
                  Upload insurance documents (PDF, JPG, PNG - max 25MB)
                </div>
              </div>
            </div>

            <div className="form-grid form-grid-1">
              {/* License Requirement Document (Optional) */}
              <div className="modern-form-group">
                <label
                  htmlFor="licenseRequirement"
                  className="modern-form-label"
                >
                  License Requirement Document (Optional)
                </label>

                {/* Hidden file input - always rendered for Replace functionality */}
                <input
                  type="file"
                  id="licenseRequirement"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(e, "licenseRequirement")}
                  style={{ display: "none" }}
                />

                {!uploadedFiles.licenseRequirement &&
                  !existingDocuments.licenseRequirement && (
                    <div
                      className="modern-file-upload"
                      onClick={() =>
                        document.getElementById("licenseRequirement").click()
                      }
                    >
                      <div className="file-upload-icon">📜</div>
                      <div className="file-upload-text">
                        <div className="file-upload-primary">
                          Click to upload license requirements
                        </div>
                        <div className="file-upload-secondary">
                          PDF, JPG, PNG up to 25MB
                        </div>
                      </div>
                    </div>
                  )}

                {documentErrors.licenseRequirement && (
                  <div
                    className="modern-alert modern-alert-error"
                    style={{ marginTop: "8px" }}
                  >
                    <div className="modern-alert-icon">⚠️</div>
                    <div className="modern-alert-content">
                      {documentErrors.licenseRequirement}
                    </div>
                  </div>
                )}

                {uploadedFiles.licenseRequirement && (
                  <div className="file-preview">
                    <div className="file-preview-info">
                      <div className="file-preview-icon">📜</div>
                      <div className="file-preview-name">
                        {uploadedFiles.licenseRequirement.name}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile("licenseRequirement")}
                      className="file-remove-btn"
                    >
                      ❌
                    </button>
                  </div>
                )}

                {existingDocuments.licenseRequirement &&
                  !uploadedFiles.licenseRequirement && (
                    <div className="existing-file">
                      <div className="existing-file-info">
                        <div className="existing-file-icon">📜</div>
                        <div className="existing-file-name">
                          Current:{" "}
                          {existingDocuments.licenseRequirement.originalName}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleViewDocument("licenseRequirement")}
                        className="file-view-btn"
                      >
                        View
                      </button>
                    </div>
                  )}

                <div className="form-help-text">
                  Optional: Upload specific license requirements for this truck
                  (PDF, JPG, PNG - max 25MB)
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="modern-btn-group">
            <button
              type="button"
              className="modern-btn modern-btn-secondary"
              onClick={() => history.push("/admin/trucks")}
            >
              ← Cancel
            </button>
            <button type="submit" className="modern-btn modern-btn-primary">
              {isEditMode ? "💾 Update Truck" : "✅ Add Truck"}
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
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
          }}
        >
          <div
            className="image-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              maxWidth: "90vw",
              maxHeight: "90vh",
              overflow: "auto",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.3)",
            }}
          >
            <div
              className="image-modal-header"
              style={{
                padding: "20px",
                borderBottom: "1px solid #e0e0e0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "#f8f9fa",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 600 }}>
                Document Preview - {previewDocument.filename}
              </h3>
              <button
                className="close-button"
                onClick={() => {
                  setShowPreviewModal(false);
                  setPreviewDocument(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "28px",
                  cursor: "pointer",
                  color: "#666",
                  padding: "0",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "4px",
                  transition: "all 0.2s",
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = "#f0f0f0";
                  e.target.style.color = "#000";
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = "transparent";
                  e.target.style.color = "#666";
                }}
              >
                ✕
              </button>
            </div>
            <div
              className="image-modal-content"
              style={{
                padding: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "300px",
              }}
            >
              <img
                src={previewDocument.url}
                alt={previewDocument.filename}
                style={{
                  maxWidth: "100%",
                  maxHeight: "70vh",
                  objectFit: "contain",
                  borderRadius: "8px",
                }}
                onError={(e) => {
                  console.error("Image failed to load:", previewDocument.url);
                  e.target.style.display = "none";
                  const errorDiv = document.createElement("div");
                  errorDiv.style.padding = "40px";
                  errorDiv.style.textAlign = "center";
                  errorDiv.innerHTML = `
                    <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                    <div style="font-size: 18px; color: #666;">Failed to load image</div>
                    <div style="font-size: 14px; color: #999; margin-top: 8px;">${previewDocument.filename}</div>
                  `;
                  e.target.parentElement.appendChild(errorDiv);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TruckForm;
