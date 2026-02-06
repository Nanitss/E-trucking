// src/pages/admin/trucks/TruckForm.js
import React, { useState, useEffect } from "react";
import { useParams, useHistory } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../../../config/api";
import {
  TbTruck,
  TbClipboard,
  TbChartBar,
  TbId,
  TbFileDescription,
  TbAlertTriangle,
  TbCheck,
  TbX,
  TbUpload,
  TbEye,
  TbTrash,
  TbArrowLeft,
  TbDeviceFloppy,
  TbCalendar,
  TbSteeringWheel,
  TbUsers,
  TbFileText
} from "react-icons/tb";

const TruckForm = () => {
  const { id } = useParams();
  const history = useHistory();
  const isEditMode = Boolean(id);
  const baseURL = API_BASE_URL;

  const [formData, setFormData] = useState({
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
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewDocument, setPreviewDocument] = useState(null);

  // Monitor uploadedFiles state changes
  useEffect(() => {
    console.log("🔄 uploadedFiles state changed:", uploadedFiles);
  }, [uploadedFiles]);

  const getCapacityFromType = (truckType) => {
    switch (truckType) {
      case "mini truck": return "2";
      case "4 wheeler": return "3";
      case "6 wheeler": return "4";
      case "8 wheeler": return "6";
      case "10 wheeler": return "10";
      default: return "2";
    }
  };

  useEffect(() => {
    const fetchTruck = async () => {
      if (!isEditMode) {
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${baseURL}/api/trucks/${id}`);
        const truck = response.data;
        const brandValue = truck.truckBrand || "Toyota";
        const predefinedBrands = ["Toyota", "Isuzu", "Mitsubishi", "Hyundai", "Foton", "Hino", "Nissan", "Ford", "Suzuki", "Kia"];
        const isCustomBrand = !predefinedBrands.includes(brandValue);

        setFormData({
          TruckPlate: truck.truckPlate || "",
          TruckType: truck.truckType || "mini truck",
          TruckCapacity: truck.truckCapacity || "2",
          TruckBrand: isCustomBrand ? "Other" : brandValue,
          ModelYear: truck.modelYear || new Date().getFullYear(),
          registrationDate: truck.registrationDate || "",
          registrationExpiryDate: truck.registrationExpiryDate || "",
          TruckStatus: truck.truckStatus || "available",
          AllocationStatus: truck.allocationStatus || "available",
          OperationalStatus: truck.operationalStatus || "active",
          AvailabilityStatus: truck.availabilityStatus || "free",
          MaintenanceScheduled: truck.maintenanceScheduled === true || truck.maintenanceScheduled === "true",
          StatusReason: truck.lastStatusReason || "",
        });

        if (isCustomBrand) {
          setIsOtherBrand(true);
          setCustomBrand(brandValue);
        }

        if (truck.documents) {
          setExistingDocuments(truck.documents);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching truck:", err);
        setError(`Failed to load truck data: ${err.response?.data?.message || err.message}`);
        setLoading(false);
      }
    };

    fetchTruck();
  }, [id, isEditMode, baseURL]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "TruckType") {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        TruckCapacity: getCapacityFromType(value),
      }));
    } else if (name === "TruckBrand") {
      if (value === "Other") {
        setIsOtherBrand(true);
        setCustomBrand("");
      } else {
        setIsOtherBrand(false);
        setCustomBrand("");
      }
      setFormData((prev) => ({ ...prev, [name]: value }));
    } else if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleCustomBrandChange = (e) => {
    setCustomBrand(e.target.value);
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
    const document = existingDocuments[documentType];
    if (!document) return;

    try {
      const filename = document.filename;
      let subfolder = "";
      if (documentType === "orDocument" || documentType === "crDocument") subfolder = "OR-CR-Files";
      else if (documentType === "insuranceDocument") subfolder = "Insurance-Papers";
      else if (documentType === "licenseRequirement") subfolder = "License-Documents";

      const relativePath = subfolder ? `Truck-Documents/${subfolder}/${filename}` : `Truck-Documents/${filename}`;
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

  const getLicenseRequirements = (truckType) => {
    const requirements = {
      "mini truck": { driverLicense: "Non-professional License", helpers: 1, helperRequirements: ["Valid ID", "Barangay Clearance"] },
      "4 wheeler": { driverLicense: "Professional License", helpers: 1, helperRequirements: ["Valid ID", "Barangay Clearance", "Medical Certificate"] },
      "6 wheeler": { driverLicense: "Professional License", helpers: 2, helperRequirements: ["Valid ID", "Barangay Clearance", "Medical Certificate"] },
      "8 wheeler": { driverLicense: "Professional License", helpers: 2, helperRequirements: ["Valid ID", "Barangay Clearance", "Medical Certificate"] },
      "10 wheeler": { driverLicense: "Professional License", helpers: 3, helperRequirements: ["Valid ID", "Barangay Clearance", "Medical Certificate"] },
    };
    return requirements[truckType] || requirements["mini truck"];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isOtherBrand && !customBrand.trim()) {
        setError('Please enter a custom brand name when "Other" is selected');
        return;
      }

      if (!isEditMode) {
        const requiredDocs = ["orDocument", "crDocument", "insuranceDocument"];
        const missingDocs = requiredDocs.filter((doc) => !uploadedFiles[doc]);
        if (missingDocs.length > 0) {
          setError(`Please upload all required documents: ${missingDocs.map((doc) => doc.replace("Document", "").toUpperCase()).join(", ")}`);
          return;
        }
      }

      const formDataToSend = new FormData();
      formDataToSend.append("truckPlate", formData.TruckPlate);
      formDataToSend.append("truckType", formData.TruckType);
      formDataToSend.append("truckCapacity", formData.TruckCapacity);
      formDataToSend.append("truckBrand", isOtherBrand && customBrand.trim() ? customBrand.trim() : formData.TruckBrand);
      formDataToSend.append("modelYear", formData.ModelYear);
      formDataToSend.append("registrationDate", formData.registrationDate);
      formDataToSend.append("registrationExpiryDate", formData.registrationExpiryDate);
      formDataToSend.append("truckStatus", formData.TruckStatus);
      formDataToSend.append("allocationStatus", formData.AllocationStatus);
      formDataToSend.append("operationalStatus", formData.OperationalStatus);
      formDataToSend.append("availabilityStatus", formData.AvailabilityStatus);
      formDataToSend.append("maintenanceScheduled", formData.MaintenanceScheduled);
      formDataToSend.append("lastStatusReason", formData.StatusReason);

      Object.entries(uploadedFiles).forEach(([key, file]) => {
        if (file) formDataToSend.append(key, file);
      });

      if (isEditMode) {
        Object.entries(existingDocuments).forEach(([key, doc]) => {
          if (doc && !uploadedFiles[key]) formDataToSend.append(`existing_${key}`, JSON.stringify(doc));
        });
      }

      const url = isEditMode ? `${baseURL}/api/admin/trucks/${id}` : `${baseURL}/api/admin/trucks`;
      const method = isEditMode ? "put" : "post";
      await axios[method](url, formDataToSend, { headers: {} });

      setSuccessMessage(isEditMode ? "Truck updated successfully!" : "Truck added successfully!");
      setError(null);

      if (!isEditMode) {
        setFormData({
          TruckPlate: "", TruckType: "mini truck", TruckCapacity: "2", TruckBrand: "Toyota",
          ModelYear: new Date().getFullYear(), registrationDate: "", registrationExpiryDate: "",
          TruckStatus: "available", AllocationStatus: "available", OperationalStatus: "active",
          AvailabilityStatus: "free", MaintenanceScheduled: false, StatusReason: "",
        });
        setUploadedFiles({ orDocument: null, crDocument: null, insuranceDocument: null, licenseRequirement: null });
        setDocumentErrors({});
        setIsOtherBrand(false);
        setCustomBrand("");
      }

      setTimeout(() => history.push("/admin/trucks"), 1500);
    } catch (err) {
      console.error("Error saving truck:", err);
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        setError(err.response.data.errors.join(", "));
      } else if (err.response) {
        setError(`Server error (${err.response.status}): ${err.response.data.sqlMessage || err.response.data.message}`);
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

  const renderFileInput = (id, label, docType, icon, required = false) => (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-primary-300 transition-all">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type="file"
        id={id}
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={(e) => handleFileChange(e, docType)}
        className="hidden"
      />

      {!uploadedFiles[docType] && !existingDocuments[docType] && (
        <div
          onClick={() => document.getElementById(id).click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-primary-400 transition-colors"
        >
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
          <TbTruck className="text-primary-600" size={32} />
          {isEditMode ? "Edit Truck" : "Add New Truck"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {isEditMode ? "Update truck information and documents" : "Register a new truck with required documentation"}
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
            {renderSectionHeader(<TbTruck size={24} />, "Basic Information", "Enter the truck's basic identification and specifications")}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Plate Number <span className="text-red-500">*</span></label>
                <input type="text" name="TruckPlate" value={formData.TruckPlate} onChange={handleChange} required maxLength="20" placeholder="e.g. ABC-1234"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Truck Type <span className="text-red-500">*</span></label>
                <select name="TruckType" value={formData.TruckType} onChange={handleChange} required
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none">
                  <option value="mini truck">Mini Truck</option>
                  <option value="4 wheeler">4 Wheeler</option>
                  <option value="6 wheeler">6 Wheeler</option>
                  <option value="8 wheeler">8 Wheeler</option>
                  <option value="10 wheeler">10 Wheeler</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Capacity</label>
                <input type="text" value={`${formData.TruckCapacity} tons`} disabled
                  className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Brand <span className="text-red-500">*</span></label>
                <select name="TruckBrand" value={formData.TruckBrand} onChange={handleChange} required
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none">
                  {["Toyota", "Isuzu", "Mitsubishi", "Hyundai", "Foton", "Hino", "Nissan", "Ford", "Suzuki", "Kia", "Other"].map(b => (
                    <option key={b} value={b}>{b === "Other" ? "Other (Enter custom)" : b}</option>
                  ))}
                </select>
                {isOtherBrand && (
                  <input type="text" value={customBrand} onChange={handleCustomBrandChange} placeholder="Enter brand name" required maxLength="50"
                    className="mt-3 w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none" />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Model Year</label>
                <input type="number" name="ModelYear" value={formData.ModelYear} onChange={handleChange} min="1990" max={new Date().getFullYear() + 1}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none" />
              </div>
            </div>
          </section>

          {/* Registration Information */}
          <section className="mb-10">
            {renderSectionHeader(<TbFileDescription size={24} />, "Registration Information", "Track truck registration dates and expiry")}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Registration Date</label>
                <div className="relative">
                  <TbCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input type="date" name="registrationDate" value={formData.registrationDate} onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date <span className="text-red-500">*</span></label>
                <div className="relative">
                  <TbCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input type="date" name="registrationExpiryDate" value={formData.registrationExpiryDate} onChange={handleChange} required
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none" />
                </div>
              </div>
            </div>
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-3">
              <TbAlertTriangle className="text-yellow-600 mt-0.5" size={20} />
              <p className="text-sm text-yellow-800">
                <strong>Registration Monitoring:</strong> System automatically blocks trucks with expiring registrations (within 30 days) from new allocations.
              </p>
            </div>
          </section>

          {/* Status Management */}
          <section className="mb-10">
            {renderSectionHeader(<TbChartBar size={24} />, "Status Management", "Configure operational and allocation status")}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Allocation Status <span className="text-red-500">*</span></label>
                <select name="AllocationStatus" value={formData.AllocationStatus} onChange={handleChange} required
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none">
                  <option value="available">Available</option>
                  <option value="allocated">Allocated</option>
                  <option value="reserved">Reserved</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Operational Status <span className="text-red-500">*</span></label>
                <select name="OperationalStatus" value={formData.OperationalStatus} onChange={handleChange} required
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none">
                  <option value="active">Active</option>
                  <option value="maintenance">Under Maintenance</option>
                  <option value="out-of-service">Out of Service</option>
                  <option value="standby">Standby</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Availability Status <span className="text-red-500">*</span></label>
                <select name="AvailabilityStatus" value={formData.AvailabilityStatus} onChange={handleChange} required
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none">
                  <option value="free">Free</option>
                  <option value="busy">Busy</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Legacy Status <span className="text-red-500">*</span></label>
                <select name="TruckStatus" value={formData.TruckStatus} onChange={handleChange} required
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none">
                  <option value="available">Available</option>
                  <option value="allocated">Allocated</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="on-delivery">On Delivery</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl bg-gray-50 cursor-pointer hover:bg-white hover:border-primary-300 transition-all">
                  <input type="checkbox" name="MaintenanceScheduled" checked={formData.MaintenanceScheduled} onChange={handleChange}
                    className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500 border-gray-300" />
                  <span className="font-medium text-gray-700">Maintenance Scheduled</span>
                </label>
              </div>
              <div className="flex-[2]">
                <textarea name="StatusReason" value={formData.StatusReason} onChange={handleChange} placeholder="Optional reason for status..." rows="1"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none" />
              </div>
            </div>
          </section>

          {/* License Requirements */}
          <section className="mb-10 bg-blue-50/50 rounded-xl p-6 border border-blue-100">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 rounded bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                <TbId size={20} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">License Requirements</h3>
                <p className="text-sm text-gray-500">Requirements for {formData.TruckType}</p>
              </div>
            </div>
            {(() => {
              const reqs = getLicenseRequirements(formData.TruckType);
              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-2 text-blue-700 font-medium">
                      <TbSteeringWheel size={18} /> Driver License
                    </div>
                    <div className="text-sm text-gray-600">{reqs.driverLicense}</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-2 text-blue-700 font-medium">
                      <TbUsers size={18} /> Helpers
                    </div>
                    <div className="text-sm text-gray-600">{reqs.helpers} Required</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-2 text-blue-700 font-medium">
                      <TbClipboard size={18} /> Helper Docs
                    </div>
                    <ul className="text-sm text-gray-600 list-disc list-inside">
                      {reqs.helperRequirements.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                </div>
              )
            })()}
          </section>

          {/* Documents */}
          <section className="mb-8">
            {renderSectionHeader(<TbFileText size={24} />, "Required Documents", "Upload legal documents (OR/CR, Insurance)")}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {renderFileInput("orDocument", "Original Receipt (OR)", "orDocument", <TbFileText />, true)}
              {renderFileInput("crDocument", "Certificate of Registration (CR)", "crDocument", <TbFileText />, true)}
              {renderFileInput("insuranceDocument", "Insurance Policy", "insuranceDocument", <TbFileText />, true)}
              {renderFileInput("licenseRequirement", "Additional License Docs (Optional)", "licenseRequirement", <TbFileText />)}
            </div>
          </section>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-100">
            <button type="button" onClick={() => history.push("/admin/trucks")}
              className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-all flex items-center gap-2">
              <TbArrowLeft size={18} /> Cancel
            </button>
            <button type="submit"
              className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 rounded-xl shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 transition-all flex items-center gap-2">
              <TbDeviceFloppy size={18} /> {isEditMode ? "Update Truck" : "Save Truck"}
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

export default TruckForm;
