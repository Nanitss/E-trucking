// src/pages/admin/helpers/HelperForm.js
import React, { useState, useEffect } from "react";
import { useParams, useHistory } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../../../config/api";
import {
  TbUser,
  TbPhone,
  TbMapPin,
  TbBriefcase,
  TbCalendar,
  TbFileText,
  TbId,
  TbHeartRateMonitor,
  TbShieldCheck,
  TbAlertTriangle,
  TbCheck,
  TbUpload,
  TbTrash,
  TbEye,
  TbArrowLeft,
  TbDeviceFloppy,
  TbX,
  TbLock,
} from "react-icons/tb";

const HelperForm = () => {
  const { id } = useParams();
  const history = useHistory();
  const isEditMode = Boolean(id);
  const baseURL = API_BASE_URL;

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
  const [documentErrors, setDocumentErrors] = useState({});
  const [existingDocuments, setExistingDocuments] = useState({});
  const [originalDocuments, setOriginalDocuments] = useState({});
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewDocument, setPreviewDocument] = useState(null);

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
          setOriginalDocuments(helper.documents);
        }
      } catch (err) {
        console.error("Error fetching helper:", err);
        if (err.response) {
          setError(
            `Server error (${err.response.status}): ${err.response.data.sqlMessage || err.response.data.message
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e, documentType) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        setDocumentErrors((prev) => ({ ...prev, [documentType]: "File size must be less than 25MB" }));
        return;
      }
      const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
      if (!allowedTypes.includes(file.type)) {
        setDocumentErrors((prev) => ({ ...prev, [documentType]: "Only PDF, JPG, and PNG files are allowed" }));
        return;
      }
      setDocumentErrors((prev) => ({ ...prev, [documentType]: null }));
      setUploadedFiles((prev) => ({ ...prev, [documentType]: file }));
    }
  };

  const removeFile = (documentType) => {
    setUploadedFiles((prev) => ({ ...prev, [documentType]: null }));
    setDocumentErrors((prev) => ({ ...prev, [documentType]: null }));
  };

  const handleReplaceDocument = (documentType) => {
    setUploadedFiles((prev) => ({ ...prev, [documentType]: null }));
    setDocumentErrors((prev) => ({ ...prev, [documentType]: null }));
    setExistingDocuments((prev) => ({ ...prev, [documentType]: null }));
    const fileInput = document.getElementById(documentType);
    if (fileInput) fileInput.click();
  };

  const handleViewDocument = (documentType) => {
    const doc = existingDocuments[documentType];
    if (!doc) return;

    try {
      const filename = doc.filename;
      let subfolder = "";
      if (documentType === "validId") subfolder = "Valid-IDs";
      else if (documentType === "barangayClearance") subfolder = "Barangay-Clearances";
      else if (documentType === "medicalCertificate") subfolder = "Medical-Certificates";
      else if (documentType === "helperLicense") subfolder = "Helper-Licenses";

      const relativePath = subfolder ? `Helper-Documents/${subfolder}/${filename}` : `Helper-Documents/${filename}`;
      const encodedPath = relativePath.split("/").map((part) => encodeURIComponent(part)).join("/");
      const apiUrl = `${baseURL}/api/documents/view/${encodedPath}`;

      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);
      if (isImage) {
        setPreviewDocument({ url: apiUrl, filename: filename, type: documentType });
        setShowPreviewModal(true);
      } else {
        window.open(apiUrl, "_blank");
      }
    } catch (error) {
      setError("Failed to view document. Please try again.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formDataToSend = new FormData();

      formDataToSend.append("name", formData.name);
      formDataToSend.append("helperName", formData.name);
      formDataToSend.append("contactNumber", formData.contactNumber);
      formDataToSend.append("address", formData.address);
      formDataToSend.append("emergencyContact", formData.emergencyContact || "");
      formDataToSend.append("emergencyContactNumber", formData.emergencyContactNumber || "");
      formDataToSend.append("dateHired", formData.dateHired);
      formDataToSend.append("status", formData.status);
      formDataToSend.append("licenseType", formData.licenseType);
      formDataToSend.append("licenseNumber", formData.licenseNumber || "");
      formDataToSend.append("licenseExpiryDate", formData.licenseExpiryDate || "");
      formDataToSend.append("HelperUserName", formData.HelperUserName);
      if (formData.HelperPassword) {
        formDataToSend.append("HelperPassword", formData.HelperPassword);
      }

      Object.entries(uploadedFiles).forEach(([key, file]) => {
        if (file) formDataToSend.append(key, file);
      });

      if (isEditMode) {
        Object.entries(originalDocuments).forEach(([docType, docData]) => {
          if (!uploadedFiles[docType] && docData) {
            formDataToSend.append(`existing_${docType}`, JSON.stringify(docData));
          }
        });
      }

      const url = isEditMode ? `${baseURL}/api/admin/helpers/${id}` : `${baseURL}/api/admin/helpers`;
      const method = isEditMode ? "put" : "post";
      const token = localStorage.getItem("token");
      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      };

      await axios[method](url, formDataToSend, config);

      setSuccessMessage(isEditMode ? "Helper updated successfully!" : "Helper added successfully!");
      setError(null);

      if (!isEditMode) {
        setFormData({
          name: "", contactNumber: "", address: "", emergencyContact: "", emergencyContactNumber: "",
          dateHired: "", status: "Active", licenseType: "Class C", licenseNumber: "",
          licenseExpiryDate: "", HelperUserName: "", HelperPassword: "",
        });
        setUploadedFiles({ validId: null, barangayClearance: null, medicalCertificate: null, helperLicense: null });
        setDocumentErrors({});
      }

      setTimeout(() => history.push("/admin/helpers"), 1500);
    } catch (err) {
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        setError(err.response.data.errors.join(", "));
      } else if (err.response) {
        setError(`Server error (${err.response.status}): ${err.response.data.message || err.response.data.error || "Unknown error"}`);
      } else {
        setError(`Request error: ${err.message}`);
      }
    }
  };

  const renderSectionHeader = (icon, title, description) => (
    <div className="flex items-start gap-3 mb-6 border-b border-gray-100 pb-4">
      <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </div>
  );

  const renderFileInput = (inputId, label, docType, icon, required = false) => (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-primary-300 transition-all">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input type="file" id={inputId} accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileChange(e, docType)} className="hidden" />

      {!uploadedFiles[docType] && !existingDocuments[docType] && (
        <div onClick={() => document.getElementById(inputId).click()} className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-primary-400 transition-colors">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-3">
            <TbUpload size={24} />
          </div>
          <span className="text-sm font-medium text-primary-600 mb-1">Click to upload</span>
          <span className="text-xs text-gray-500">PDF, JPG, PNG up to 25MB</span>
        </div>
      )}

      {documentErrors[docType] && (
        <div className="mt-2 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
          <TbAlertTriangle size={16} />
          {documentErrors[docType]}
        </div>
      )}

      {uploadedFiles[docType] && (
        <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gray-200 flex items-center justify-center text-gray-500">
              {icon}
            </div>
            <div className="text-sm truncate max-w-[150px] font-medium text-gray-700">
              {uploadedFiles[docType].name}
            </div>
          </div>
          <button onClick={() => removeFile(docType)} className="text-red-500 hover:text-red-700 p-1">
            <TbTrash size={18} />
          </button>
        </div>
      )}

      {existingDocuments[docType] && !uploadedFiles[docType] && (
        <div className="mt-2 bg-green-50 border border-green-100 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-green-700">
              <TbCheck size={16} />
              <span className="text-sm font-medium">Uploaded</span>
            </div>
            <div className="flex gap-1">
              <button onClick={() => handleViewDocument(docType)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="View">
                <TbEye size={18} />
              </button>
              <button onClick={() => handleReplaceDocument(docType)} className="p-1.5 text-orange-600 hover:bg-orange-50 rounded" title="Replace">
                <TbUpload size={18} />
              </button>
            </div>
          </div>
          <div className="text-xs text-green-600 truncate">{existingDocuments[docType].originalName}</div>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <TbUser className="text-primary-600" size={32} />
          {isEditMode ? "Edit Helper" : "Add New Helper"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {isEditMode ? "Update helper information and documents" : "Register a new helper with required documentation"}
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <TbAlertTriangle className="text-red-500 mt-0.5" size={20} />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <div className="mt-3 flex gap-3">
              <button onClick={() => setError(null)} className="text-xs font-medium text-red-600 hover:text-red-800">Dismiss</button>
              <button onClick={() => window.location.reload()} className="text-xs font-medium text-red-600 hover:text-red-800">Refresh Page</button>
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <TbCheck className="text-green-500" size={20} />
          <div>
            <h3 className="text-sm font-medium text-green-800">Success</h3>
            <p className="text-sm text-green-700">{successMessage}</p>
          </div>
        </div>
      )}

      <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
        <form onSubmit={handleSubmit} className="p-8">

          {/* Basic Information */}
          <section className="mb-10">
            {renderSectionHeader(<TbUser size={24} />, "Basic Information", "Enter the helper's personal and contact information")}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name <span className="text-red-500">*</span></label>
                <div className="relative">
                  <TbUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input type="text" name="name" value={formData.name} onChange={handleChange} required maxLength="100" placeholder="e.g. Juan Dela Cruz"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number <span className="text-red-500">*</span></label>
                <div className="relative">
                  <TbPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input type="text" name="contactNumber" value={formData.contactNumber} onChange={handleChange} required maxLength="20" placeholder="e.g. +63 912 345 6789"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none" />
                </div>
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Address <span className="text-red-500">*</span></label>
              <div className="relative">
                <TbMapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input type="text" name="address" value={formData.address} onChange={handleChange} required maxLength="255" placeholder="e.g. 123 Main St, Barangay Sample, City, Province"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact</label>
                <div className="relative">
                  <TbUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input type="text" name="emergencyContact" value={formData.emergencyContact} onChange={handleChange} maxLength="100" placeholder="Emergency contact name"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact Number</label>
                <div className="relative">
                  <TbPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input type="text" name="emergencyContactNumber" value={formData.emergencyContactNumber} onChange={handleChange} maxLength="20" placeholder="Emergency contact number"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none" />
                </div>
              </div>
            </div>
          </section>

          {/* Employment Information */}
          <section className="mb-10">
            {renderSectionHeader(<TbBriefcase size={24} />, "Employment Information", "Employment details and current status")}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Employment Date <span className="text-red-500">*</span></label>
                <div className="relative">
                  <TbCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input type="date" name="dateHired" value={formData.dateHired} onChange={handleChange} required
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Employment Status <span className="text-red-500">*</span></label>
                <select name="status" value={formData.status} onChange={handleChange} required
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Terminated">Terminated</option>
                </select>
              </div>
            </div>
          </section>

          {/* License Information */}
          <section className="mb-10">
            {renderSectionHeader(<TbId size={24} />, "License Information", "Helper license details and qualifications")}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">License Type <span className="text-red-500">*</span></label>
                <select name="licenseType" value={formData.licenseType} onChange={handleChange} required
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none">
                  <option value="Class C">Class C</option>
                  <option value="Class CE">Class CE</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {formData.licenseType === "Class C" ? "Can assist with mini trucks only" : "Can assist with all truck types"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">License Number</label>
                <input type="text" name="licenseNumber" value={formData.licenseNumber} onChange={handleChange} placeholder="Enter license number"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">License Expiry Date</label>
                <div className="relative">
                  <TbCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input type="date" name="licenseExpiryDate" value={formData.licenseExpiryDate} onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none" />
                </div>
              </div>
            </div>
          </section>

          {/* Account Credentials */}
          <section className="mb-10">
            {renderSectionHeader(<TbLock size={24} />, "Account Credentials", "Login credentials for the helper portal")}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Username <span className="text-red-500">*</span></label>
                <div className="relative">
                  <TbUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input type="text" name="HelperUserName" value={formData.HelperUserName} onChange={handleChange} required maxLength="50" placeholder="e.g. jdelacruz"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none" />
                </div>
              </div>
              {!isEditMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <TbLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input type="password" name="HelperPassword" value={formData.HelperPassword || ""} onChange={handleChange} required maxLength="255" placeholder="Minimum 6 characters"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none" />
                  </div>
                </div>
              )}
              {isEditMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center gap-2 text-sm text-blue-700">
                    <TbLock size={16} />
                    Password cannot be changed by admin. Helper must change their own password through their account settings.
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Documents */}
          <section className="mb-8">
            {renderSectionHeader(<TbFileText size={24} />, "Required Documents", "Upload legal documents")}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {renderFileInput("validId", "Valid ID", "validId", <TbId />, true)}
              {renderFileInput("barangayClearance", "Barangay Clearance", "barangayClearance", <TbShieldCheck />, true)}
              {renderFileInput("medicalCertificate", "Medical Certificate", "medicalCertificate", <TbHeartRateMonitor />)}
              {renderFileInput("helperLicense", "Helper License", "helperLicense", <TbFileText />)}
            </div>
          </section>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-100">
            <button type="button" onClick={() => history.push("/admin/helpers")}
              className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-all flex items-center gap-2">
              <TbArrowLeft size={18} /> Cancel
            </button>
            <button type="submit"
              className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 rounded-xl shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 transition-all flex items-center gap-2">
              <TbDeviceFloppy size={18} /> {isEditMode ? "Update Helper" : "Save Helper"}
            </button>
          </div>
        </form>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && previewDocument && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowPreviewModal(false)}>
          <div className="bg-white rounded-2xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <TbEye size={20} className="text-primary-600" />
                {previewDocument.filename}
              </h3>
              <button onClick={() => setShowPreviewModal(false)} className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 transition-colors">
                <TbX size={18} />
              </button>
            </div>
            <div className="p-4 bg-gray-100 flex-1 overflow-auto flex items-center justify-center">
              <img src={previewDocument.url} alt="Document Preview" className="max-w-full max-h-full object-contain shadow-lg rounded-lg" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelperForm;
