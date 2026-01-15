import React, { useState, useEffect } from 'react';
import { Link, useHistory } from 'react-router-dom';
import axios from 'axios';
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
  TbLayoutGrid
} from 'react-icons/tb';
import './StaffList.css'; // copy your DriversList.css → StaffList.css
import '../../../styles/ModernForms.css';
import '../../../styles/DesignSystem.css';
import AdminHeader from '../../../components/common/AdminHeader';

const StaffList = ({ currentUser }) => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'
  const [sortField, setSortField] = useState('StaffName');
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const staffPerPage = 20;
  const history = useHistory();

  // Calculate active filters count
  const activeFilterCount = [
    statusFilter !== 'all' ? statusFilter : null,
    departmentFilter !== 'all' ? departmentFilter : null,
  ].filter(Boolean).length;

  // Fetch staff on component mount
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        setLoading(true);
        console.log('Fetching staff from API...');
        const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5007';
        console.log('API Base URL:', baseURL);

        const response = await axios.get(`${baseURL}/api/staffs`);
        console.log('API Response:', response);

        if (response.data && Array.isArray(response.data)) {
          setStaff(response.data);
          console.log('Staff loaded:', response.data.length);
        } else {
          console.warn('API returned unexpected data format:', response.data);
          setStaff([]);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching staff:', err);
        if (err.response) {
          setError(`Server error (${err.response.status}): ${err.response.data?.message || 'Unknown error'}`);
        } else if (err.request) {
          setError('No response received from server. Please check your API connection.');
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
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter staff based on search and filters
  const filteredStaff = staff.filter(staffMember => {
    const matchesSearch = !searchTerm ||
      staffMember.StaffName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staffMember.StaffUserName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staffMember.StaffNumber?.includes(searchTerm) ||
      staffMember.StaffDepartment?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' ||
      staffMember.StaffStatus?.toLowerCase() === statusFilter.toLowerCase();

    const matchesDepartment = departmentFilter === 'all' ||
      staffMember.StaffDepartment?.toLowerCase() === departmentFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesDepartment;
  });

  // Get sorted and paginated staff
  const getSortedAndPaginatedStaff = () => {
    let sorted = [...filteredStaff];

    // Sort
    sorted.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    // Paginate
    const startIndex = (currentPage - 1) * staffPerPage;
    const endIndex = startIndex + staffPerPage;
    return sorted.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredStaff.length / staffPerPage);

  // Get unique values for filters
  const uniqueStatuses = [...new Set(staff.map(s => s.StaffStatus).filter(Boolean))];
  const uniqueDepartments = [...new Set(staff.map(s => s.StaffDepartment).filter(Boolean))];

  // Calculate summary data
  const getSummaryData = () => {
    const total = staff.length;
    const active = staff.filter(s => s.StaffStatus?.toLowerCase() === 'active').length;
    const inactive = staff.filter(s => s.StaffStatus?.toLowerCase() === 'inactive').length;
    const departments = uniqueDepartments.length;

    return { total, active, inactive, departments };
  };

  const summaryData = getSummaryData();

  // Helper function to format status
  const formatStatus = (status) => {
    if (!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="admin-page-container">
      <AdminHeader currentUser={null} />

      <div className="admin-content">
        {/* Greeting and Summary Cards */}
        <div className="greeting-section">
          <h2 className="greeting-text">Staff Management</h2>
          <p className="greeting-subtitle">Manage staff members, departments, and administrative roles</p>

          <div className="summary-cards">
            <div className="summary-card">
              <div className="card-icon">
                <TbUser size={24} />
              </div>
              <div className="card-content">
                <div className="card-value">{staff.length}</div>
                <div className="card-label">Total Staff</div>
                <div className="card-change positive">
                  <TbArrowUp size={12} />
                  +1.9%
                </div>
              </div>
            </div>

            <div className="summary-card">
              <div className="card-icon">
                <TbCheck size={24} />
              </div>
              <div className="card-content">
                <div className="card-value">{staff.filter(s => s.status === 'active').length}</div>
                <div className="card-label">Active</div>
                <div className="card-change positive">
                  <TbArrowUp size={12} />
                  +1.2%
                </div>
              </div>
            </div>

            <div className="summary-card">
              <div className="card-icon">
                <TbClock size={24} />
              </div>
              <div className="card-content">
                <div className="card-value">{staff.filter(s => s.status === 'inactive').length}</div>
                <div className="card-label">Inactive</div>
                <div className="card-change neutral">
                  <TbActivity size={12} />
                  0.0%
                </div>
              </div>
            </div>

            <div className="summary-card">
              <div className="card-icon">
                <TbFileText size={24} />
              </div>
              <div className="card-content">
                <div className="card-value">{staff.filter(s => s.role === 'admin').length}</div>
                <div className="card-label">Administrators</div>
                <div className="card-change positive">
                  <TbArrowUp size={12} />
                  +0.5%
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
            <div style={{ marginTop: '10px', fontSize: '12px' }}>
              <button onClick={() => window.location.reload()}>Refresh Page</button>
            </div>
          </div>
        )}


        {/* Modern Filter Bar - Popup Style */}
        <div className="modern-filter-bar" style={{ position: 'relative', marginBottom: '24px' }}>
          <div className="search-filter-row" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search (Top Left) */}
            <div className="search-container" style={{ flex: '0 0 350px' }}>
              <div className="search-input-wrapper">
                <div className="search-icon">🔍</div>
                <input
                  type="text"
                  placeholder="Search by name, username, department, phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="modern-search-input"
                />
              </div>
            </div>

            {/* Filter Toggle Button */}
            <button
              className={`btn btn-secondary ${showFilters ? 'active' : ''}`}
              style={{
                height: '42px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                position: 'relative',
                paddingRight: activeFilterCount > 0 ? '36px' : '16px'
              }}
              onClick={() => setShowFilters(!showFilters)}
            >
              <TbFilter size={18} />
              Filters
              {activeFilterCount > 0 && (
                <span
                  className="filter-count-badge"
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    borderRadius: '12px',
                    padding: '2px 8px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold'
                  }}
                >
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* View Mode Toggle (Aligned Right) */}
            <div className="view-mode-toggle" style={{ marginLeft: 'auto' }}>
              <button
                onClick={() => setViewMode('table')}
                className={`view-mode-btn ${viewMode === 'table' ? 'active' : ''}`}
                title="Table View"
              >
                <TbList size={20} />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`view-mode-btn ${viewMode === 'cards' ? 'active' : ''}`}
                title="Card View"
              >
                <TbLayoutGrid size={20} />
              </button>
            </div>
          </div>

          <div className="filter-summary" style={{ marginTop: '12px', color: '#64748b', fontSize: '0.9rem' }}>
            Showing {filteredStaff.length} of {staff.length} staff members
          </div>

          {/* Filter Popup */}
          {showFilters && (
            <div
              className="filter-popup-card"
              style={{
                position: 'absolute',
                top: '48px',
                left: '0',
                zIndex: 1000,
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                border: '1px solid #f1f5f9',
                width: '320px',
                maxWidth: '90vw',
                padding: '20px'
              }}
            >
              <div className="popup-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                <h4 style={{ margin: 0, color: '#1e293b', fontSize: '1.1rem' }}>Filter Options</h4>
                <button
                  className="btn-ghost"
                  onClick={() => setShowFilters(false)}
                  style={{ height: '32px', padding: '0 8px', width: 'auto' }}
                >
                  <TbX />
                </button>
              </div>

              <div className="filters-grid-popup" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '20px' }}>
                {/* Status Filter */}
                <div className="filter-group-popup">
                  <label className="filter-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#64748b' }}>Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="modern-filter-select"
                    style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '0 12px' }}
                  >
                    <option value="all">All Status</option>
                    {uniqueStatuses.map(status => (
                      <option key={status} value={status}>
                        {formatStatus(status)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Department Filter */}
                <div className="filter-group-popup">
                  <label className="filter-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#64748b' }}>Department</label>
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="modern-filter-select"
                    style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '0 12px' }}
                  >
                    <option value="all">All Departments</option>
                    {uniqueDepartments.map(dept => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Clear Filters Button */}
              <button
                className="btn btn-secondary"
                style={{ width: '100%' }}
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setDepartmentFilter('all');
                }}
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="modern-loading">
            <div className="loading-spinner"></div>
            Loading staff data...
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="trucks-empty-state">
            <div className="empty-state-icon">👨‍💼</div>
            <h3 className="empty-state-title">No staff found</h3>
            <p className="empty-state-description">
              {searchTerm || statusFilter !== 'all' || departmentFilter !== 'all'
                ? 'No staff members match your current filters. Try adjusting your search criteria or add a new staff member.'
                : 'No staff records found. Add your first staff member to get started.'
              }
            </p>
            <Link to="/admin/staffs/add" className="modern-btn modern-btn-primary">
              ➕ Add Your First Staff Member
            </Link>
          </div>
        ) : (
          <div className="staff-table-container">
            <div className="table-wrapper">
              <table className="staff-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('StaffName')} className="sortable">
                      Staff Name {sortField === 'StaffName' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('StaffDepartment')} className="sortable">
                      Department {sortField === 'StaffDepartment' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('StaffNumber')} className="sortable">
                      Contact {sortField === 'StaffNumber' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('StaffEmploymentDate')} className="sortable">
                      Employment Date {sortField === 'StaffEmploymentDate' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('StaffStatus')} className="sortable">
                      Status {sortField === 'StaffStatus' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getSortedAndPaginatedStaff().map(staffMember => (
                    <tr key={staffMember.StaffID} className="staff-row">
                      <td className="staff-name-cell">
                        <div className="staff-name-wrapper">
                          <TbUser className="staff-icon" />
                          <span className="staff-name-text">{staffMember.StaffName}</span>
                        </div>
                      </td>
                      <td>
                        <span className="department-badge">{staffMember.StaffDepartment || 'N/A'}</span>
                      </td>
                      <td>{staffMember.StaffNumber || 'N/A'}</td>
                      <td>
                        {staffMember.StaffEmploymentDate ? new Date(staffMember.StaffEmploymentDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td>
                        <span className={`status-badge status-${staffMember.StaffStatus?.toLowerCase() || 'unknown'}`}>
                          {formatStatus(staffMember.StaffStatus)}
                        </span>
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
                            to={`/admin/staffs/edit/${staffMember.StaffID}`}
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
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="pagination-btn"
                >
                  ← Previous
                </button>
                <span className="pagination-info">
                  Page {currentPage} of {totalPages} ({filteredStaff.length} staff)
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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
                <h2>👨‍💼 {selectedStaff.StaffName} Details</h2>
                <button className="modal-close-btn" onClick={closeDetailsModal}>✕</button>
              </div>

              <div className="modal-body">
                <div className="details-grid">
                  {/* Basic Information */}
                  <div className="details-section">
                    <h3>📋 Basic Information</h3>
                    <div className="details-items">
                      <div className="detail-item">
                        <span className="detail-label">Staff ID:</span>
                        <span className="detail-value">{selectedStaff.StaffID}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Full Name:</span>
                        <span className="detail-value">{selectedStaff.StaffName}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Username:</span>
                        <span className="detail-value">@{selectedStaff.StaffUserName}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Phone Number:</span>
                        <span className="detail-value">{selectedStaff.StaffNumber || 'Not provided'}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Address:</span>
                        <span className="detail-value">{selectedStaff.StaffAddress || 'Not provided'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Employment Information */}
                  <div className="details-section">
                    <h3>💼 Employment Information</h3>
                    <div className="details-items">
                      <div className="detail-item">
                        <span className="detail-label">Department:</span>
                        <span className="detail-value">{selectedStaff.StaffDepartment || 'Not assigned'}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Employment Date:</span>
                        <span className="detail-value">
                          {selectedStaff.StaffEmploymentDate
                            ? new Date(selectedStaff.StaffEmploymentDate).toLocaleDateString()
                            : 'Unknown'
                          }
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Status:</span>
                        <span className={`detail-badge status-${selectedStaff.StaffStatus?.toLowerCase() || 'unknown'}`}>
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