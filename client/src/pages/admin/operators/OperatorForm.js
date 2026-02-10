// src/pages/admin/operators/OperatorForm.js
import React, { useState, useEffect } from "react";
import { useParams, useHistory } from "react-router-dom";
import axios from "axios";
// Sidebar import removed - using header navigation now
import { API_BASE_URL } from "../../../config/api";

const OperatorForm = () => {
  const { id } = useParams();
  const history = useHistory();
  const isEditMode = Boolean(id);
  const baseURL = API_BASE_URL;

  const [formData, setFormData] = useState({
    OperatorName: "",
    OperatorAddress: "",
    OperatorNumber: "",
    OperatorEmploymentDate: "",
    OperatorDocuments: "",
    OperatorUserName: "",
    OperatorPassword: "",
    OperatorStatus: "active",
  });
  const [loading, setLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  // Fetch operator data if in edit mode
  useEffect(() => {
    const fetchOperator = async () => {
      if (!isEditMode) return;

      try {
        setLoading(true);
        console.log(`Fetching operator with ID: ${id}`);
        console.log("API Base URL:", baseURL);

        const response = await axios.get(`${baseURL}/api/operators/${id}`);
        console.log("API Response:", response);

        const operator = response.data;
        if (operator.OperatorEmploymentDate) {
          // Format to YYYY-MM-DD for the date input
          operator.OperatorEmploymentDate = new Date(
            operator.OperatorEmploymentDate,
          )
            .toISOString()
            .split("T")[0];
        }
        setFormData(operator);
      } catch (err) {
        console.error("Error fetching operator:", err);
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

    fetchOperator();
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
        ? `${baseURL}/api/operators/${id}`
        : `${baseURL}/api/operators`;
      const method = isEditMode ? "put" : "post";

      const response = await axios[method](url, formData);
      console.log(
        isEditMode ? "Update response:" : "Create response:",
        response,
      );

      setSuccessMessage(
        isEditMode
          ? "Operator updated successfully!"
          : "Operator added successfully!",
      );
      setError(null);

      // Header navigation will update counts automatically

      if (!isEditMode) {
        // Reset form for new create
        setFormData({
          OperatorName: "",
          OperatorAddress: "",
          OperatorNumber: "",
          OperatorEmploymentDate: "",
          OperatorDocuments: "",
          OperatorUserName: "",
          OperatorPassword: "",
          OperatorStatus: "active",
        });
      }

      // Redirect back to list after a brief pause
      setTimeout(() => {
        history.push("/admin/operators");
      }, 1500);
    } catch (err) {
      console.error("Error saving operator:", err);
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

  if (loading) {
    return <div className="loading">Loading operator data...</div>;
  }

  return (
    <div className="form-container">
      <div className="page-header">
        <h1>{isEditMode ? "Edit Operator" : "Add New Operator"}</h1>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <div style={{ marginTop: "10px", fontSize: "12px" }}>
            <button onClick={() => setError(null)}>Dismiss</button>
            <button
              onClick={() => window.location.reload()}
              style={{ marginLeft: "10px" }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="success-message">{successMessage}</div>
      )}

      <form onSubmit={handleSubmit} className="data-form">
        <div className="form-group">
          <label htmlFor="OperatorName">Operator Name</label>
          <input
            type="text"
            id="OperatorName"
            name="OperatorName"
            value={formData.OperatorName}
            onChange={handleChange}
            required
            maxLength="100"
          />
        </div>

        <div className="form-group">
          <label htmlFor="OperatorAddress">Address</label>
          <input
            type="text"
            id="OperatorAddress"
            name="OperatorAddress"
            value={formData.OperatorAddress}
            onChange={handleChange}
            required
            maxLength="255"
          />
        </div>

        <div className="form-group">
          <label htmlFor="OperatorNumber">Phone Number</label>
          <input
            type="text"
            id="OperatorNumber"
            name="OperatorNumber"
            value={formData.OperatorNumber}
            onChange={handleChange}
            required
            maxLength="20"
          />
        </div>

        <div className="form-group">
          <label htmlFor="OperatorEmploymentDate">Employment Date</label>
          <input
            type="date"
            id="OperatorEmploymentDate"
            name="OperatorEmploymentDate"
            value={formData.OperatorEmploymentDate}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="OperatorDocuments">Documents (Optional)</label>
          <input
            type="text"
            id="OperatorDocuments"
            name="OperatorDocuments"
            value={formData.OperatorDocuments || ""}
            onChange={handleChange}
            maxLength="255"
          />
        </div>

        <div className="form-group">
          <label htmlFor="OperatorUserName">Username</label>
          <input
            type="text"
            id="OperatorUserName"
            name="OperatorUserName"
            value={formData.OperatorUserName}
            onChange={handleChange}
            required
            maxLength="50"
          />
        </div>

        <div className="form-group">
          <label htmlFor="OperatorPassword">
            {isEditMode ? "Password (Leave blank to keep current)" : "Password"}
          </label>
          <input
            type="password"
            id="OperatorPassword"
            name="OperatorPassword"
            value={formData.OperatorPassword || ""}
            onChange={handleChange}
            {...(!isEditMode && { required: true })}
            maxLength="255"
          />
        </div>

        <div className="form-group">
          <label htmlFor="OperatorStatus">Status</label>
          <select
            id="OperatorStatus"
            name="OperatorStatus"
            value={formData.OperatorStatus}
            onChange={handleChange}
            required
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-100 mt-6">
          <button
            type="button"
            onClick={() => history.push("/admin/operators")}
            className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-all flex items-center gap-2"
          >
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 rounded-xl shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
            {isSubmitting ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> Saving...</>
            ) : (
              isEditMode ? "Update Operator" : "Add Operator"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OperatorForm;
