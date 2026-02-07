// src/pages/admin/clients/ClientForm.js - Updated for Firebase

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useHistory, Link } from "react-router-dom";
import {
  TbBriefcase,
  TbUser,
  TbPhone,
  TbMail,
  TbMapPin,
  TbCalendar,
  TbBuilding,
  TbShieldCheck,
  TbFileText,
  TbUpload,
  TbTrash,
  TbAlertTriangle,
  TbCheck,
  TbArrowLeft,
  TbDeviceFloppy,
  TbLock,
} from "react-icons/tb";
import { API_BASE_URL } from "../../../config/api";

const ClientForm = () => {
  const { id } = useParams();
  const history = useHistory();
  const isEditMode = Boolean(id);
  const [formData, setFormData] = useState({
    businessName: "",
    contactPerson: "",
    contactNumber: "",
    email: "",
    address: "",
    businessType: "",
    registrationDate: "",
    status: "Active",
    username: "",
    password: "",
    businessPermit: null,
    validId: null,
    serviceContract: null,
    taxCertificate: null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState({});
  const baseURL = API_BASE_URL;

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
        console.log("Client data fetched:", response.data);

        const client = response.data;
        setFormData({
          businessName: client.businessName || client.ClientName || "",
          contactPerson: client.contactPerson || client.ContactPerson || "",
          contactNumber: client.contactNumber || client.ContactNumber || "",
          email: client.email || client.Email || "",
          address: client.address || client.Address || "",
          businessType: client.businessType || client.BusinessType || "",
          registrationDate:
            client.registrationDate || client.RegistrationDate || "",
          status: client.status || client.Status || "Active",
          username: client.ClientUserName || client.username || "",
          password: "", // Never populate password on edit
          businessPermit: null,
          validId: null,
          serviceContract: null,
          taxCertificate: null,
        });
        setLoading(false);
      } catch (err) {
        console.error("Error fetching client:", err);
        setError("Failed to load client data");
        setLoading(false);
      }
    };

    fetchClient();
  }, [id, isEditMode, baseURL]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

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
        clientCreationDate: isEditMode
          ? undefined
          : new Date().toISOString().split("T")[0],
        // Add username for both create and update
        username: formData.username,
      };

      // Only include password when creating new client
      if (!isEditMode) {
        clientData.password = formData.password;
      }

      if (isEditMode) {
        // Update existing client
        await axios.put(`${baseURL}/api/clients/${id}`, clientData);
        setSuccessMessage("Client updated successfully!");
      } else {
        // Create new client
        await axios.post(`${baseURL}/api/clients`, clientData);
        setSuccessMessage("Client created successfully!");
      }

      // Redirect after short delay
      setTimeout(() => {
        history.push("/admin/clients");
      }, 1500);
    } catch (error) {
      console.error("Error saving client:", error);
      setError("Error saving client. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (
      !isEditMode ||
      !window.confirm("Are you sure you want to delete this client?")
    ) {
      return;
    }

    try {
      await axios.delete(`${baseURL}/api/clients/${id}`);
      setSuccessMessage("Client deleted successfully!");
      setTimeout(() => {
        history.push("/admin/clients");
      }, 1500);
    } catch (error) {
      console.error("Error deleting client:", error);
      setError("Error deleting client. Please try again.");
    }
  };

  const renderSectionHeader = (icon, title, description) => (
    <div className="flex items-start gap-3 mb-6 border-b border-gray-100 pb-4">
      <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </div>
  );

  const renderFileInput = (fieldName, label, isRequired = false) => (
    <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 hover:border-primary-300 transition-colors">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {isRequired && <span className="text-red-500">*</span>}
      </label>
      {uploadedFiles[fieldName] ? (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <TbCheck size={16} />
            <span className="truncate max-w-[180px]">{uploadedFiles[fieldName]}</span>
          </div>
          <button
            type="button"
            onClick={() => removeFile(fieldName)}
            className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
          >
            <TbTrash size={16} />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center gap-2 cursor-pointer py-3">
          <TbUpload size={24} className="text-gray-400" />
          <span className="text-xs text-gray-500">Click to upload</span>
          <input
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={(e) => handleFileChange(e, fieldName)}
            required={isRequired && !isEditMode}
          />
        </label>
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
          <TbBriefcase className="text-primary-600" size={32} />
          {isEditMode ? "Edit Client" : "Add New Client"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {isEditMode ? "Update client information and documents" : "Register a new client with business details"}
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

          {/* Business Information */}
          <section className="mb-10">
            {renderSectionHeader(<TbBuilding size={24} />, "Business Information", "Enter the basic business and contact information")}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Business Name <span className="text-red-500">*</span></label>
                <div className="relative">
                  <TbBuilding className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input type="text" name="businessName" value={formData.businessName} onChange={handleInputChange} required placeholder="Enter business name"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Business Type</label>
                <div className="relative">
                  <TbBriefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input type="text" name="businessType" value={formData.businessType} onChange={handleInputChange} placeholder="Enter business type"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Person <span className="text-red-500">*</span></label>
                <div className="relative">
                  <TbUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input type="text" name="contactPerson" value={formData.contactPerson} onChange={handleInputChange} required placeholder="Enter contact person name"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number <span className="text-red-500">*</span></label>
                <div className="relative">
                  <TbPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input type="tel" name="contactNumber" value={formData.contactNumber} onChange={handleInputChange} required placeholder="Enter contact number"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <div className="relative">
                  <TbMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="Enter email address"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Registration Date</label>
                <div className="relative">
                  <TbCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input type="date" name="registrationDate" value={formData.registrationDate} onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none" />
                </div>
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Business Address</label>
              <div className="relative">
                <TbMapPin className="absolute left-3 top-3 text-gray-400" size={20} />
                <textarea name="address" value={formData.address} onChange={handleInputChange} placeholder="Enter complete business address" rows="3"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none resize-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select name="status" value={formData.status} onChange={handleInputChange}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none max-w-xs">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Suspended">Suspended</option>
                <option value="Terminated">Terminated</option>
              </select>
            </div>
          </section>

          {/* Account Credentials */}
          <section className="mb-10">
            {renderSectionHeader(<TbLock size={24} />, "Account Credentials", isEditMode ? "Username for client login access" : "Create login credentials for the client")}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Username <span className="text-red-500">*</span></label>
                <div className="relative">
                  <TbUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input type="text" name="username" value={formData.username} onChange={handleInputChange} required placeholder="Enter username for login" autoComplete="username"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none" />
                </div>
                <p className="mt-1 text-xs text-gray-500">Client will use this username to log into the system</p>
              </div>

              {!isEditMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <TbLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input type="password" name="password" value={formData.password} onChange={handleInputChange} required minLength="6" placeholder="Enter secure password" autoComplete="new-password"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none" />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Minimum 6 characters. Client can change this later.</p>
                </div>
              )}

              {isEditMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <TbLock className="text-amber-500 mt-0.5 flex-shrink-0" size={20} />
                    <div>
                      <p className="text-sm font-medium text-amber-800">Password cannot be changed by admin</p>
                      <p className="text-xs text-amber-600 mt-1">For security reasons, clients must change their own password through their account settings.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Required Documents */}
          <section className="mb-10">
            {renderSectionHeader(<TbFileText size={24} />, "Required Documents", "Upload required business documents for verification")}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderFileInput("businessPermit", "Business Permit", true)}
              {renderFileInput("validId", "Valid ID", true)}
            </div>
          </section>

          {/* Optional Documents */}
          <section className="mb-8">
            {renderSectionHeader(<TbShieldCheck size={24} />, "Optional Documents", "Additional documents that may be helpful")}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderFileInput("serviceContract", "Service Contract")}
              {renderFileInput("taxCertificate", "Tax Certificate")}
            </div>
          </section>

          {/* Actions */}
          <div className="flex items-center justify-between gap-4 pt-6 border-t border-gray-100">
            <div>
              {isEditMode && (
                <button type="button" onClick={handleDelete} disabled={isSubmitting}
                  className="px-5 py-2.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-all flex items-center gap-2">
                  <TbTrash size={18} /> Delete Client
                </button>
              )}
            </div>
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => history.push("/admin/clients/clientlist")}
                className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-all flex items-center gap-2">
                <TbArrowLeft size={18} /> Cancel
              </button>
              <button type="submit" disabled={isSubmitting}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 rounded-xl shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 transition-all flex items-center gap-2 disabled:opacity-50">
                <TbDeviceFloppy size={18} /> {isSubmitting ? "Saving..." : isEditMode ? "Update Client" : "Save Client"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientForm;
