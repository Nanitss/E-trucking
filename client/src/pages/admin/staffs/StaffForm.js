// src/pages/admin/staff/StaffForm.js
import React, { useState, useEffect } from "react";
import { useParams, useHistory } from "react-router-dom";
import axios from "axios";
import {
  TbUsers,
  TbUser,
  TbPhone,
  TbMapPin,
  TbBriefcase,
  TbCalendar,
  TbFileText,
  TbLock,
  TbAlertTriangle,
  TbCheck,
  TbArrowLeft,
  TbDeviceFloppy,
} from "react-icons/tb";
import { API_BASE_URL } from "../../../config/api";

const StaffForm = () => {
  const { id } = useParams();
  const history = useHistory();
  const isEditMode = Boolean(id);
  const baseURL = API_BASE_URL;

  const [formData, setFormData] = useState({
    StaffName: "",
    StaffAddress: "",
    StaffNumber: "",
    StaffDepartment: "",
    StaffEmploymentDate: "",
    StaffDocuments: "",
    StaffUserName: "",
    StaffPassword: "",
    StaffStatus: "active",
  });
  const [loading, setLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  // Fetch staff data if in edit mode
  useEffect(() => {
    const fetchStaff = async () => {
      if (!isEditMode) return;

      try {
        setLoading(true);
        console.log(`Fetching staff member with ID: ${id}`);
        console.log("API Base URL:", baseURL);

        const response = await axios.get(`${baseURL}/api/staffs/${id}`);
        console.log("API Response:", response);

        const staff = response.data;
        if (staff.StaffEmploymentDate) {
          // Format to YYYY-MM-DD for the date input
          staff.StaffEmploymentDate = new Date(staff.StaffEmploymentDate)
            .toISOString()
            .split("T")[0];
        }
        setFormData(staff);
      } catch (err) {
        console.error("Error fetching staff member:", err);
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

    fetchStaff();
  }, [id, isEditMode, baseURL]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      console.log(
        "Form submission:",
        isEditMode ? "UPDATE" : "CREATE",
        formData,
      );
      const url = isEditMode
        ? `${baseURL}/api/staffs/${id}`
        : `${baseURL}/api/staffs`;
      const method = isEditMode ? "put" : "post";

      const response = await axios[method](url, formData);
      console.log(
        isEditMode ? "Update response:" : "Create response:",
        response,
      );

      setSuccessMessage(
        isEditMode
          ? "Staff member updated successfully!"
          : "Staff member added successfully!",
      );
      setError(null);

      // Header navigation will update counts automatically

      if (!isEditMode) {
        // Reset form for new create
        setFormData({
          StaffName: "",
          StaffAddress: "",
          StaffNumber: "",
          StaffDepartment: "",
          StaffEmploymentDate: "",
          StaffDocuments: "",
          StaffUserName: "",
          StaffPassword: "",
          StaffStatus: "active",
        });
      }

      // Redirect back to list after a brief pause
      setTimeout(() => {
        history.push("/admin/staffs");
      }, 1500);
    } catch (err) {
      console.error("Error saving staff member:", err);
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
      setIsSubmitting(false);
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
          <TbUsers className="text-primary-600" size={32} />
          {isEditMode ? "Edit Staff Member" : "Add New Staff Member"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {isEditMode ? "Update staff member information and credentials" : "Register a new staff member with department details"}
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
            {renderSectionHeader(<TbUser size={24} />, "Basic Information", "Enter the staff member's personal and contact information")}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name <span className="text-red-500">*</span></label>
                <div className="relative">
                  <TbUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input type="text" name="StaffName" value={formData.StaffName} onChange={handleChange} required maxLength="100" placeholder="e.g. John Doe"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none" />
                </div>
                <p className="mt-1 text-xs text-gray-500">Enter the staff member's complete legal name</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number <span className="text-red-500">*</span></label>
                <div className="relative">
                  <TbPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input type="text" name="StaffNumber" value={formData.StaffNumber} onChange={handleChange} required maxLength="20" placeholder="e.g. +63 912 345 6789"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none" />
                </div>
                <p className="mt-1 text-xs text-gray-500">Primary contact number for the staff member</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Address <span className="text-red-500">*</span></label>
              <div className="relative">
                <TbMapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input type="text" name="StaffAddress" value={formData.StaffAddress} onChange={handleChange} required maxLength="255" placeholder="e.g. 123 Main St, Barangay Sample, City, Province"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none" />
              </div>
              <p className="mt-1 text-xs text-gray-500">Complete residential address</p>
            </div>
          </section>

          {/* Employment Information */}
          <section className="mb-10">
            {renderSectionHeader(<TbBriefcase size={24} />, "Employment Information", "Department assignment and employment details")}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Department <span className="text-red-500">*</span></label>
                <div className="relative">
                  <TbBriefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input type="text" name="StaffDepartment" value={formData.StaffDepartment} onChange={handleChange} required maxLength="50" placeholder="e.g. Operations, Admin, HR"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none" />
                </div>
                <p className="mt-1 text-xs text-gray-500">Department or division assignment</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Employment Date <span className="text-red-500">*</span></label>
                <div className="relative">
                  <TbCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input type="date" name="StaffEmploymentDate" value={formData.StaffEmploymentDate} onChange={handleChange} required
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none" />
                </div>
                <p className="mt-1 text-xs text-gray-500">Date when the staff member was hired</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Employment Status <span className="text-red-500">*</span></label>
                <select name="StaffStatus" value={formData.StaffStatus} onChange={handleChange} required
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">Current employment status</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Documents Notes (Optional)</label>
              <div className="relative">
                <TbFileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input type="text" name="StaffDocuments" value={formData.StaffDocuments || ""} onChange={handleChange} maxLength="255" placeholder="Additional document notes"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none" />
              </div>
              <p className="mt-1 text-xs text-gray-500">Optional notes about staff documents</p>
            </div>
          </section>

          {/* Account Credentials */}
          <section className="mb-8">
            {renderSectionHeader(<TbLock size={24} />, "Account Credentials", "Login credentials for the staff portal")}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Username <span className="text-red-500">*</span></label>
                <div className="relative">
                  <TbUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input type="text" name="StaffUserName" value={formData.StaffUserName} onChange={handleChange} required maxLength="50" placeholder="e.g. jdoe"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none" />
                </div>
                <p className="mt-1 text-xs text-gray-500">Unique username for system login</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password {!isEditMode && <span className="text-red-500">*</span>}</label>
                <div className="relative">
                  <TbLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input type="password" name="StaffPassword" value={formData.StaffPassword || ""} onChange={handleChange} {...(!isEditMode && { required: true })} maxLength="255"
                    placeholder={isEditMode ? "Leave blank to keep current password" : "Minimum 6 characters"}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none" />
                </div>
                <p className="mt-1 text-xs text-gray-500">{isEditMode ? "Leave blank to keep current password" : "Secure password for staff portal access"}</p>
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-100">
            <button type="button" onClick={() => history.push("/admin/staffs/stafflist")}
              className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-all flex items-center gap-2">
              <TbArrowLeft size={18} /> Cancel
            </button>
            <button type="submit" disabled={isSubmitting}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 rounded-xl shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
              {isSubmitting ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> Saving...</>
              ) : (
                <><TbDeviceFloppy size={18} /> {isEditMode ? "Update Staff Member" : "Save Staff Member"}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StaffForm;
