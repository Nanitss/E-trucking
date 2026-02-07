import React, { useState, useEffect } from "react";
import { Link, useHistory } from "react-router-dom";
import axios from "axios";
import {
  TbUser,
  TbEye,
  TbEdit,
  TbSettings,
  TbCheck,
  TbClock,
  TbFileText,
  TbActivity,
  TbArrowUp,
  TbArrowDown,
  TbFilter,
  TbX,
  TbList,
  TbLayoutGrid,
  TbSearch,
  TbPlus,
  TbBriefcase,
  TbPhone,
  TbMail,
} from "react-icons/tb";
import AdminHeader from "../../../components/common/AdminHeader";
import PersonnelSubNav from "../../../components/common/PersonnelSubNav";
import StatusBadge from "../../../components/common/StatusBadge";
import { API_BASE_URL } from "../../../config/api";

const StaffList = ({ currentUser }) => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState("table"); // 'table' or 'cards'
  const [sortField, setSortField] = useState("StaffName");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const staffPerPage = 20;
  const indexOfLastItem = currentPage * staffPerPage;
  const indexOfFirstItem = indexOfLastItem - staffPerPage;
  const history = useHistory();

  // Calculate active filters count
  const activeFilterCount = [
    statusFilter !== "all" ? statusFilter : null,
    departmentFilter !== "all" ? departmentFilter : null,
  ].filter(Boolean).length;

  // Fetch staff on component mount
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        setLoading(true);
        console.log("Fetching staff from API...");
        const baseURL = API_BASE_URL;
        console.log("API Base URL:", baseURL);

        const response = await axios.get(`${baseURL}/api/staffs`);
        console.log("API Response:", response);

        if (response.data && Array.isArray(response.data)) {
          setStaff(response.data);
          console.log("Staff loaded:", response.data.length);
        } else {
          console.warn("API returned unexpected data format:", response.data);
          setStaff([]);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching staff:", err);
        if (err.response) {
          setError(
            `Server error (${err.response.status}): ${err.response.data?.message || "Unknown error"}`,
          );
        } else if (err.request) {
          setError(
            "No response received from server. Please check your API connection.",
          );
        } else {
          setError(`Request error: ${err.message}`);
        }
        setLoading(false);
        setStaff([]);
      }
    };

    fetchStaff();
  }, []);

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

  // Filter staff based on search and filters
  const filteredStaff = staff.filter((staffMember) => {
    const matchesSearch =
      !searchTerm ||
      staffMember.StaffName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staffMember.StaffUserName?.toLowerCase().includes(
        searchTerm.toLowerCase(),
      ) ||
      staffMember.StaffNumber?.includes(searchTerm) ||
      staffMember.StaffDepartment?.toLowerCase().includes(
        searchTerm.toLowerCase(),
      );

    const matchesStatus =
      statusFilter === "all" ||
      staffMember.StaffStatus?.toLowerCase() === statusFilter.toLowerCase();

    const matchesDepartment =
      departmentFilter === "all" ||
      staffMember.StaffDepartment?.toLowerCase() ===
      departmentFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesDepartment;
  });

  // Get sorted and paginated staff
  const getSortedAndPaginatedStaff = () => {
    let sorted = [...filteredStaff];

    // Sort
    sorted.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

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

  // Get unique values for filters
  const uniqueStatuses = [
    ...new Set(staff.map((s) => s.StaffStatus).filter(Boolean)),
  ];
  const uniqueDepartments = [
    ...new Set(staff.map((s) => s.StaffDepartment).filter(Boolean)),
  ];

  // Calculate summary data
  const getSummaryData = () => {
    const total = staff.length;
    const active = staff.filter(
      (s) => s.StaffStatus?.toLowerCase() === "active",
    ).length;
    const inactive = staff.filter(
      (s) => s.StaffStatus?.toLowerCase() === "inactive",
    ).length;
    const departments = uniqueDepartments.length;

    return { total, active, inactive, departments };
  };

  const summaryData = getSummaryData();

  // Helper function to format status
  const formatStatus = (status) => {
    if (!status) return "Unknown";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AdminHeader currentUser={null} />
      <PersonnelSubNav activeTab="staff" />

      <div className="flex-1 p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
        {/* Greeting and Summary Cards */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Staff Management</h2>
          <p className="text-gray-500 mt-1">
            Manage staff members, departments, and administrative roles
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <TbUser size={22} />
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                  <TbArrowUp size={12} />
                  +1.9%
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {staff.length}
                </div>
                <div className="text-sm text-gray-500 font-medium">
                  Total Staff
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                  <TbCheck size={22} />
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                  <TbArrowUp size={12} />
                  +1.2%
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {staff.filter((s) => s.status === "active").length}
                </div>
                <div className="text-sm text-gray-500 font-medium">Active</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-gray-50 text-gray-600 rounded-xl flex items-center justify-center">
                  <TbClock size={22} />
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                  <TbActivity size={12} />
                  0.0%
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {staff.filter((s) => s.status === "inactive").length}
                </div>
                <div className="text-sm text-gray-500 font-medium">
                  Inactive
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                  <TbFileText size={22} />
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                  <TbArrowUp size={12} />
                  +0.5%
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {staff.filter((s) => s.role === "admin").length}
                </div>
                <div className="text-sm text-gray-500 font-medium">
                  Administrators
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
            <div style={{ marginTop: "10px", fontSize: "12px" }}>
              <button onClick={() => window.location.reload()}>
                Refresh Page
              </button>
            </div>
          </div>
        )}

        {/* Modern Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
          {/* Search (Top Left) */}
          <div className="relative flex-1 max-w-lg w-full">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <TbSearch size={20} />
            </div>
            <input
              type="text"
              placeholder="Search by name, department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Filter Toggle Button */}
            <button
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-medium ${showFilters ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <TbFilter size={18} />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200">
              <button
                onClick={() => setViewMode("table")}
                className={`p-2 rounded-md transition-all ${viewMode === "table" ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                title="Table View"
              >
                <TbList size={18} />
              </button>
              <button
                onClick={() => setViewMode("cards")}
                className={`p-2 rounded-md transition-all ${viewMode === "cards" ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                title="Card View"
              >
                <TbLayoutGrid size={18} />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="modern-loading">
            <div className="loading-spinner"></div>
            Loading staff data...
          </div>
        ) : (
          <>
            {filteredStaff.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400">
                  <TbUser size={40} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  No staff found
                </h3>
                <p className="text-gray-500 max-w-md mx-auto mb-8">
                  {searchTerm ||
                    statusFilter !== "all" ||
                    departmentFilter !== "all"
                    ? "No staff members match your current filters. Try adjusting your search criteria."
                    : "No staff records found. Add your first staff member to get started."}
                </p>
                <Link
                  to="/admin/staffs/add"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all shadow-sm shadow-blue-200"
                >
                  <TbPlus size={20} />
                  Add New Staff
                </Link>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-100">
                        <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">
                          ID
                        </th>
                        <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Staff Member
                        </th>
                        <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Department
                        </th>
                        <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {getSortedAndPaginatedStaff().map((s) => (
                        <tr
                          key={s._id || s.id}
                          className="hover:bg-gray-50/80 transition-colors group"
                        >
                          <td className="py-4 px-6 text-sm text-gray-500 font-mono">
                            #{s.StaffID}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold">
                                {s.StaffName?.charAt(0) || "S"}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">
                                  {s.StaffName}
                                </div>
                                <div className="text-xs text-gray-400">
                                  @{s.StaffUserName}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 text-xs font-medium border border-gray-200">
                              <TbBriefcase
                                size={14}
                                className="text-gray-400"
                              />
                              {s.StaffDepartment || "Unassigned"}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex flex-col gap-1">
                              {s.StaffNumber && (
                                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                  <TbPhone
                                    size={14}
                                    className="text-gray-400"
                                  />
                                  {s.StaffNumber}
                                </div>
                              )}
                              {s.email && (
                                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                  <TbMail size={14} className="text-gray-400" />
                                  {s.email}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <StatusBadge status={s.StaffStatus || "Active"} />
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleViewDetails(s)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="View Details"
                              >
                                <TbEye size={18} />
                              </button>
                              <Link
                                to={`/admin/staffs/edit/${s.StaffID}`}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
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
                  <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="text-sm text-gray-500">
                      Showing{" "}
                      <span className="font-medium text-gray-900">
                        {indexOfFirstItem + 1}
                      </span>{" "}
                      to{" "}
                      <span className="font-medium text-gray-900">
                        {Math.min(indexOfLastItem, filteredStaff.length)}
                      </span>{" "}
                      of{" "}
                      <span className="font-medium text-gray-900">
                        {filteredStaff.length}
                      </span>{" "}
                      entries
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-white hover:text-blue-600 hover:border-blue-200 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-600 transition-all"
                      >
                        Previous
                      </button>
                      <div className="flex gap-1">
                        {[...Array(totalPages)].map((_, i) => (
                          <button
                            key={i + 1}
                            onClick={() => handlePageChange(i + 1)}
                            className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${currentPage === i + 1
                                ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                                : "text-gray-600 hover:bg-white hover:text-blue-600 border border-transparent hover:border-gray-200"
                              }`}
                          >
                            {i + 1}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-white hover:text-blue-600 hover:border-blue-200 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-600 transition-all"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Staff Details Modal */}
        {showDetailsModal && selectedStaff && (
          <div className="modal-overlay" onClick={closeDetailsModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>👨‍💼 {selectedStaff.StaffName} Details</h2>
                <button className="modal-close-btn" onClick={closeDetailsModal}>
                  ✕
                </button>
              </div>

              <div className="modal-body">
                <div className="details-grid">
                  {/* Basic Information */}
                  <div className="details-section">
                    <h3>📋 Basic Information</h3>
                    <div className="details-items">
                      <div className="detail-item">
                        <span className="detail-label">Staff ID:</span>
                        <span className="detail-value">
                          {selectedStaff.StaffID}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Full Name:</span>
                        <span className="detail-value">
                          {selectedStaff.StaffName}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Username:</span>
                        <span className="detail-value">
                          @{selectedStaff.StaffUserName}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Phone Number:</span>
                        <span className="detail-value">
                          {selectedStaff.StaffNumber || "Not provided"}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Address:</span>
                        <span className="detail-value">
                          {selectedStaff.StaffAddress || "Not provided"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Employment Information */}
                  <div className="details-section">
                    <h3>💼 Employment Information</h3>
                    <div className="details-items">
                      <div className="detail-item">
                        <span className="detail-label">Department:</span>
                        <span className="detail-value">
                          {selectedStaff.StaffDepartment || "Not assigned"}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Employment Date:</span>
                        <span className="detail-value">
                          {selectedStaff.StaffEmploymentDate
                            ? new Date(
                              selectedStaff.StaffEmploymentDate,
                            ).toLocaleDateString()
                            : "Unknown"}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Status:</span>
                        <span
                          className={`detail-badge status-${selectedStaff.StaffStatus?.toLowerCase() || "unknown"}`}
                        >
                          {formatStatus(selectedStaff.StaffStatus)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <Link
                  to={`/admin/staffs/edit/${selectedStaff.StaffID}`}
                  className="modern-btn modern-btn-primary"
                >
                  ✎ Edit Staff
                </Link>
                <button
                  className="modern-btn modern-btn-secondary"
                  onClick={closeDetailsModal}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffList;
