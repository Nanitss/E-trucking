// src/pages/admin/staff/StaffList.js - Staff Management Dashboard

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { TbUser, TbEye, TbEdit } from "react-icons/tb";
import FileViewer from "../../../components/FileViewer";
import { API_BASE_URL } from "../../../config/api";

const StaffList = () => {
  // Define baseURL for API calls
  const baseURL = API_BASE_URL;

  const [staff, setStaff] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const staffPerPage = 20;

  // Handle viewing staff details
  const handleViewDetails = (staffMember) => {
    setSelectedStaff(staffMember);
    setShowDetailsModal(true);
  };

  // Close details modal
  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedStaff(null);
  };

  // Sorting function
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Get sorted and paginated staff
  const getSortedAndPaginatedStaff = () => {
    let sorted = [...filteredStaff];

    // Sort
    sorted.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle special cases
      if (sortField === "documentCompliance") {
        aVal = a.documentCompliance?.requiredDocumentCount || 0;
        bVal = b.documentCompliance?.requiredDocumentCount || 0;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    // Paginate
    const startIndex = (currentPage - 1) * staffPerPage;
    const endIndex = startIndex + staffPerPage;
    return sorted.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredStaff.length / staffPerPage);

  // Fetch staff data
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        setLoading(true);

        // Get staff with actual documents from file system (all in one call)
        const response = await axios.get(
          `${baseURL}/api/simple-files/staff-with-documents`,
        );
        console.log(
          "Raw API response (staff with actual documents):",
          response.data,
        );

        // Handle both array response and object with staff property
        const staffData = Array.isArray(response.data)
          ? response.data
          : response.data.staff;

        if (staffData && staffData.length > 0) {
          const formattedStaff = staffData.map((staffMember) => {
            console.log("Processing staff data:", staffMember);
            return {
              id: staffMember.id || staffMember.StaffID,
              name: staffMember.name || staffMember.StaffName,
              username:
                staffMember.username ||
                `@${staffMember.name?.replace(/\s+/g, "")}` ||
                "",
              contactNumber:
                staffMember.contactNumber || staffMember.StaffNumber,
              address: staffMember.address || staffMember.StaffAddress,
              status: staffMember.status || staffMember.StaffStatus || "Active",
              employmentDate:
                staffMember.employmentDate || staffMember.StaffEmploymentDate,
              position:
                staffMember.position || staffMember.StaffPosition || "Staff",
              department:
                staffMember.department ||
                staffMember.StaffDepartment ||
                "General",
              rate: staffMember.rate || staffMember.StaffRate || "",
              documents: staffMember.documents || {},
              documentCompliance: staffMember.documentCompliance || null,
            };
          });

          setStaff(formattedStaff);
        } else {
          console.log("No staff data received, setting empty array");
          setStaff([]);
        }
      } catch (err) {
        console.error("Error fetching staff:", err);
        setError(`Failed to fetch staff: ${err.message}`);
        setStaff([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStaff();
  }, [baseURL]);

  // Calculate status counts and get unique departments
  const statusCounts = {
    total: staff.length,
    active: staff.filter((staffMember) => staffMember.status === "Active")
      .length,
    inactive: staff.filter((staffMember) => staffMember.status === "Inactive")
      .length,
    departments: [...new Set(staff.map((s) => s.department).filter(Boolean))]
      .length,
  };

  // Get unique departments for filter
  const getUniqueDepartments = () => {
    return [...new Set(staff.map((s) => s.department).filter(Boolean))].sort();
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...staff];

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (staffMember) => staffMember.status === statusFilter,
      );
    }

    // Apply department filter
    if (departmentFilter !== "all") {
      filtered = filtered.filter(
        (staffMember) => staffMember.department === departmentFilter,
      );
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (staffMember) =>
          staffMember.name?.toLowerCase().includes(query) ||
          staffMember.username?.toLowerCase().includes(query) ||
          staffMember.department?.toLowerCase().includes(query) ||
          staffMember.contactNumber?.includes(query) ||
          staffMember.address?.toLowerCase().includes(query),
      );
    }

    setFilteredStaff(filtered);
  }, [staff, statusFilter, departmentFilter, searchQuery]);

  // Helper function to get status badge class
  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "status-active";
      case "inactive":
        return "status-inactive";
      case "on leave":
        return "status-on-leave";
      case "terminated":
        return "status-terminated";
      default:
        return "status-default";
    }
  };

  // Helper functions for compliance
  const getComplianceClass = (staffMember) => {
    if (!staffMember.documentCompliance) return "compliance-pending";
    const status = staffMember.documentCompliance.overallStatus;
    if (status === "complete") return "compliance-complete";
    if (status === "incomplete") return "compliance-incomplete";
    return "compliance-pending";
  };

  const getComplianceIcon = (staffMember) => {
    if (!staffMember.documentCompliance) return "⚙️";
    const status = staffMember.documentCompliance.overallStatus;
    if (status === "complete") return "✅";
    if (status === "incomplete") return "⚠️";
    return "⚙️";
  };

  const getComplianceStatus = (staffMember) => {
    if (!staffMember.documentCompliance) return "Compliance Pending";
    const status = staffMember.documentCompliance.overallStatus;
    if (status === "complete") return "Compliance Complete";
    if (status === "incomplete") return "Compliance Incomplete";
    return "Compliance Pending";
  };

  const getComplianceDetails = (staffMember) => {
    if (!staffMember.documentCompliance) return "No compliance data";
    const {
      requiredDocumentCount = 0,
      optionalDocumentCount = 0,
      overallStatus = "pending",
    } = staffMember.documentCompliance;
    return `${requiredDocumentCount} required, ${optionalDocumentCount} optional - ${overallStatus}`;
  };

  if (loading) {
    return (
      <div className="staff-list-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading staff...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="staff-list-container">
        <div className="error-container">
          <h2>Error Loading Staff</h2>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="staff-list-container">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-title">
            <h1>👔 Staff Management</h1>
            <p>Manage staff members, departments, and administrative roles</p>
          </div>
          <Link to="/admin/staff/add" className="btn btn-primary">
            ➕ Add New Staff
          </Link>
        </div>
      </div>

      {/* Status Summary Cards */}
      <div className="status-summary-cards">
        <div className="summary-card total">
          <div className="summary-icon">👥</div>
          <div className="summary-content">
            <div className="summary-number">{statusCounts.total}</div>
            <div className="summary-label">TOTAL STAFF</div>
          </div>
        </div>
        <div className="summary-card active">
          <div className="summary-icon">✅</div>
          <div className="summary-content">
            <div className="summary-number">{statusCounts.active}</div>
            <div className="summary-label">ACTIVE</div>
          </div>
        </div>
        <div className="summary-card inactive">
          <div className="summary-icon">❌</div>
          <div className="summary-content">
            <div className="summary-number">{statusCounts.inactive}</div>
            <div className="summary-label">INACTIVE</div>
          </div>
        </div>
        <div className="summary-card departments">
          <div className="summary-icon">🏢</div>
          <div className="summary-content">
            <div className="summary-number">{statusCounts.departments}</div>
            <div className="summary-label">DEPARTMENTS</div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-container">
        <div className="filters-header">
          <h3>🔍 Filter & Search Staff</h3>
          <div className="filters-toggle">
            <span className="filters-count">
              Showing {filteredStaff.length} of {staff.length} staff members
            </span>
          </div>
        </div>

        <div className="filters-content">
          {/* Search */}
          <div className="filter-group">
            <label className="filter-label">SEARCH</label>
            <input
              type="text"
              placeholder="Search by name, username, department, or..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="modern-filter-input"
            />
          </div>

          {/* Status Filter */}
          <div className="filter-group">
            <label className="filter-label">STATUS</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="modern-filter-select"
            >
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="On Leave">On Leave</option>
              <option value="Terminated">Terminated</option>
            </select>
          </div>

          {/* Department Filter */}
          <div className="filter-group">
            <label className="filter-label">DEPARTMENT</label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="modern-filter-select"
            >
              <option value="all">All Departments</option>
              {getUniqueDepartments().map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="filter-actions">
          <button
            className="btn btn-secondary"
            onClick={() => {
              setStatusFilter("all");
              setDepartmentFilter("all");
              setSearchQuery("");
            }}
          >
            Clear All Filters
          </button>

          <div className="filter-summary">
            Showing {filteredStaff.length} of {staff.length} staff members
          </div>
        </div>
      </div>

      {/* Staff Table */}
      {filteredStaff.length === 0 ? (
        <div className="staff-empty-state">
          <div className="empty-state-icon">👤</div>
          <h3 className="empty-state-title">No staff found</h3>
          <p className="empty-state-description">
            No staff match your current filters. Try adjusting your search
            criteria or add a new staff member.
          </p>
          <Link to="/admin/staff/add" className="btn btn-primary">
            ➕ Add Your First Staff
          </Link>
        </div>
      ) : (
        <div className="staff-table-container">
          <div className="table-wrapper">
            <table className="staff-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort("name")} className="sortable">
                    Staff Name{" "}
                    {sortField === "name" &&
                      (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    onClick={() => handleSort("department")}
                    className="sortable"
                  >
                    Department{" "}
                    {sortField === "department" &&
                      (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    onClick={() => handleSort("contactNumber")}
                    className="sortable"
                  >
                    Contact{" "}
                    {sortField === "contactNumber" &&
                      (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    onClick={() => handleSort("employmentDate")}
                    className="sortable"
                  >
                    Employment Date{" "}
                    {sortField === "employmentDate" &&
                      (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th onClick={() => handleSort("status")} className="sortable">
                    Status{" "}
                    {sortField === "status" &&
                      (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    onClick={() => handleSort("documentCompliance")}
                    className="sortable"
                  >
                    Compliance{" "}
                    {sortField === "documentCompliance" &&
                      (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {getSortedAndPaginatedStaff().map((staffMember) => (
                  <tr key={staffMember.id} className="staff-row">
                    <td className="staff-name-cell">
                      <div className="staff-name-wrapper">
                        <TbUser className="staff-icon" />
                        <span className="staff-name-text">
                          {staffMember.name}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="department-badge">
                        {staffMember.department || "N/A"}
                      </span>
                    </td>
                    <td>{staffMember.contactNumber || "N/A"}</td>
                    <td>
                      {staffMember.employmentDate
                        ? new Date(
                          staffMember.employmentDate,
                        ).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td>
                      <span
                        className={`status-badge ${getStatusBadgeClass(staffMember.status)}`}
                      >
                        {staffMember.status || "Active"}
                      </span>
                    </td>
                    <td>
                      <div className="compliance-cell">
                        <span className="compliance-icon">
                          {getComplianceIcon(staffMember)}
                        </span>
                        <span className="compliance-text">
                          {staffMember.documentCompliance
                            ?.requiredDocumentCount || 0}
                          /3
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          onClick={() => handleViewDetails(staffMember)}
                          className="action-btn view-btn"
                          title="View Details"
                        >
                          <TbEye size={18} />
                        </button>
                        <Link
                          to={`/admin/staff/edit/${staffMember.id}`}
                          className="action-btn edit-btn"
                          title="Edit Staff"
                        >
                          <TbEdit size={18} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                ← Previous
              </button>
              <span className="pagination-info">
                Page {currentPage} of {totalPages} ({filteredStaff.length}{" "}
                staff)
              </span>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
                className="pagination-btn"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Staff Details Modal */}
      {showDetailsModal && selectedStaff && (
        <div className="modal-overlay" onClick={closeDetailsModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Staff Details - {selectedStaff.name}</h2>
              <button className="modal-close-btn" onClick={closeDetailsModal}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="details-grid">
                {/* Personal Information */}
                <div className="details-section">
                  <h3>👤 Personal Information</h3>
                  <div className="details-items">
                    <div className="detail-item">
                      <span className="detail-label">Full Name:</span>
                      <span className="detail-value">{selectedStaff.name}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Username:</span>
                      <span className="detail-value">
                        {selectedStaff.username}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Contact Number:</span>
                      <span className="detail-value">
                        {selectedStaff.contactNumber || "N/A"}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Status:</span>
                      <span
                        className={`detail-badge ${getStatusBadgeClass(selectedStaff.status)}`}
                      >
                        {selectedStaff.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Employment Information */}
                <div className="details-section">
                  <h3>💼 Employment Information</h3>
                  <div className="details-items">
                    <div className="detail-item">
                      <span className="detail-label">Position:</span>
                      <span className="detail-value">
                        {selectedStaff.position || "N/A"}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Department:</span>
                      <span className="detail-value">
                        {selectedStaff.department || "N/A"}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Rate:</span>
                      <span className="detail-value">
                        {selectedStaff.rate || "N/A"}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Employment Date:</span>
                      <span className="detail-value">
                        {selectedStaff.employmentDate
                          ? new Date(
                            selectedStaff.employmentDate,
                          ).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Staff ID:</span>
                      <span className="detail-value">
                        {selectedStaff.id || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="details-section">
                  <h3>📍 Contact Information</h3>
                  <div className="details-items">
                    <div className="detail-item">
                      <span className="detail-label">Address:</span>
                      <span className="detail-value">
                        {selectedStaff.address || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Document Compliance */}
                <div className="details-section">
                  <h3>📄 Document Compliance</h3>
                  <div className="details-items">
                    <div className="detail-item">
                      <span className="detail-label">Overall Status:</span>
                      <span
                        className={`detail-badge compliance-${getComplianceClass(selectedStaff).replace("compliance-", "")}`}
                      >
                        {getComplianceStatus(selectedStaff)}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Documents Completed:</span>
                      <span className="detail-value">
                        {getComplianceDetails(selectedStaff)}
                      </span>
                    </div>

                    {/* Document Status List */}
                    <div className="documents-list">
                      <div className="document-item">
                        <span className="doc-name">Valid ID:</span>
                        <span
                          className={`doc-status ${selectedStaff.documents?.validId ? "complete" : "missing"}`}
                        >
                          {selectedStaff.documents?.validId
                            ? "✓ Complete"
                            : "✗ Missing"}
                        </span>
                      </div>
                      <div className="document-item">
                        <span className="doc-name">Medical Certificate:</span>
                        <span
                          className={`doc-status ${selectedStaff.documents?.medicalCertificate ? "complete" : "missing"}`}
                        >
                          {selectedStaff.documents?.medicalCertificate
                            ? "✓ Complete"
                            : "✗ Missing"}
                        </span>
                      </div>
                      <div className="document-item">
                        <span className="doc-name">NBI Clearance:</span>
                        <span
                          className={`doc-status ${selectedStaff.documents?.nbiClearance ? "complete" : "missing"}`}
                        >
                          {selectedStaff.documents?.nbiClearance
                            ? "✓ Complete"
                            : "✗ Missing"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Document Viewer */}
              <div className="details-section">
                <h3>📁 Uploaded Documents</h3>
                <div className="document-summary">
                  <div className="document-count-badge">
                    <span className="count-icon">📁</span>
                    <span className="count-text">
                      {selectedStaff.documentCompliance?.documentCount || 0}{" "}
                      files uploaded
                    </span>
                  </div>
                  <div className="document-breakdown">
                    <span className="required-docs">
                      Required:{" "}
                      {selectedStaff.documentCompliance
                        ?.requiredDocumentCount || 0}
                      /3
                    </span>
                    <span className="optional-docs">
                      Optional:{" "}
                      {selectedStaff.documentCompliance
                        ?.optionalDocumentCount || 0}
                      /0
                    </span>
                  </div>
                </div>
                {selectedStaff.documents &&
                  Object.keys(selectedStaff.documents).length > 0 ? (
                  <div className="details-items">
                    <FileViewer
                      documents={selectedStaff.documents}
                      entityType="staff"
                      entityName={selectedStaff.name}
                    />
                  </div>
                ) : (
                  <div className="no-documents-message">
                    <div className="no-docs-icon">📄</div>
                    <p>
                      No documents have been uploaded for this staff member yet.
                    </p>
                    <Link
                      to={`/admin/staff/edit/${selectedStaff.id}`}
                      className="btn btn-primary btn-sm"
                    >
                      Upload Documents
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffList;
