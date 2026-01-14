// src/pages/admin/helpers/HelpersList.js - Enhanced with truck-like functionality

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  TbList,
  TbLayoutGrid
} from 'react-icons/tb';
import { useTimeframe } from '../../../contexts/TimeframeContext';
import './HelpersList.css';
import '../../../styles/ModernForms.css';
import '../../../styles/DesignSystem.css';
import FileViewer from '../../../components/FileViewer';
import AdminHeader from '../../../components/common/AdminHeader';

const HelpersList = ({ currentUser }) => {
  // Define baseURL for API calls
  const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5007';
  const { isWithinTimeframe, getFormattedDateRange } = useTimeframe();
  
  const [helpers, setHelpers] = useState([]);
  const [filteredHelpers, setFilteredHelpers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHelper, setSelectedHelper] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const helpersPerPage = 20;

  // Handle viewing helper details
  const handleViewDetails = (helper) => {
    setSelectedHelper(helper);
    setShowDetailsModal(true);
  };

  // Close details modal
  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedHelper(null);
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

  // Get sorted and paginated helpers
  const getSortedAndPaginatedHelpers = () => {
    let sorted = [...filteredHelpers];
    
    // Sort
    sorted.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      // Handle special cases
      if (sortField === 'documentCompliance') {
        aVal = a.documentCompliance?.requiredDocumentCount || 0;
        bVal = b.documentCompliance?.requiredDocumentCount || 0;
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    // Paginate
    const startIndex = (currentPage - 1) * helpersPerPage;
    const endIndex = startIndex + helpersPerPage;
    return sorted.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredHelpers.length / helpersPerPage);

  // Fetch helpers data
  useEffect(() => {
    const fetchHelpers = async () => {
      try {
        setLoading(true);
        
        // Get helpers with actual documents from file system (all in one call)
        const response = await axios.get(`${baseURL}/api/simple-files/helpers-with-documents`);
        console.log('Raw API response (helpers with actual documents):', response.data);
        
        // Handle both array response and object with helpers property
        const helpersData = Array.isArray(response.data) ? response.data : response.data.helpers;
        
        if (helpersData && helpersData.length > 0) {
          const formattedHelpers = helpersData.map(helper => {
            console.log('Processing helper data:', helper);
            console.log('📊 Document Compliance:', helper.documentCompliance);
            console.log('📁 Documents:', helper.documents);
            return {
              id: helper.id || helper.HelperID,
              name: helper.name || helper.HelperName,
              contactNumber: helper.contactNumber || helper.HelperNumber,
              address: helper.address || helper.HelperAddress,
              status: helper.status || helper.HelperStatus || 'Active',
              employmentDate: helper.employmentDate || helper.HelperEmploymentDate,
              licenseType: helper.licenseType || 'Class C',
              licenseNumber: helper.licenseNumber || '',
              licenseExpiryDate: helper.licenseExpiryDate || '',
              documents: helper.documents || {},
              documentCompliance: helper.documentCompliance || null
            };
          });
          
          setHelpers(formattedHelpers);
        } else {
          console.log('No helpers data received, setting empty array');
          setHelpers([]);
        }
      } catch (err) {
        console.error('Error fetching helpers:', err);
        setError(`Failed to fetch helpers: ${err.message}`);
        setHelpers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHelpers();
  }, [baseURL]);

  // Calculate status counts
  const statusCounts = {
    total: helpers.length,
    active: helpers.filter(helper => helper.status === 'Active').length,
    inactive: helpers.filter(helper => helper.status === 'Inactive').length,
    onLeave: helpers.filter(helper => helper.status === 'On Leave').length,
    terminated: helpers.filter(helper => helper.status === 'Terminated').length
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...helpers];

    // Apply timeframe filter - only filter if there's a specific timeframe selected
    if (isWithinTimeframe) {
      filtered = filtered.filter(helper => {
        if (helper.employmentDate) {
          return isWithinTimeframe(helper.employmentDate);
        }
        // If no employment date, include the helper (don't exclude it)
        return true;
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(helper => helper.status === statusFilter);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(helper => 
        helper.name?.toLowerCase().includes(query) ||
        helper.contactNumber?.includes(query) ||
        helper.licenseType?.toLowerCase().includes(query) ||
        helper.address?.toLowerCase().includes(query)
      );
    }

    setFilteredHelpers(filtered);
  }, [helpers, statusFilter, searchQuery, isWithinTimeframe]);

  // Helper function to get status badge class
  const getStatusBadgeClass = (status) => {
    switch(status?.toLowerCase()) {
      case 'active':
        return 'status-active';
      case 'available':
        return 'status-active'; // Available should display same as active
      case 'inactive':
        return 'status-inactive';
      case 'on leave':
        return 'status-on-leave';
      case 'on-delivery':
      case 'on_delivery':
      case 'on delivery':
        return 'status-on-delivery';
      case 'terminated':
        return 'status-terminated';
      default:
        return 'status-default';
    }
  };

  // Helper functions for compliance
  const getComplianceClass = (helper) => {
    if (!helper.documentCompliance) return 'compliance-pending';
    const status = helper.documentCompliance.overallStatus;
    if (status === 'complete') return 'compliance-complete';
    if (status === 'incomplete') return 'compliance-incomplete';
    return 'compliance-pending';
  };

  const getComplianceIcon = (helper) => {
    if (!helper.documentCompliance) return '⚙️';
    const status = helper.documentCompliance.overallStatus;
    if (status === 'complete') return '✅';
    if (status === 'incomplete') return '⚠️';
    return '⚙️';
  };

  const getComplianceStatus = (helper) => {
    if (!helper.documentCompliance) return 'Compliance Pending';
    const status = helper.documentCompliance.overallStatus;
    if (status === 'complete') return 'Compliance Complete';
    if (status === 'incomplete') return 'Compliance Incomplete';
    return 'Compliance Pending';
  };

  const getComplianceDetails = (helper) => {
    if (!helper.documentCompliance) return 'No compliance data';
    const { requiredDocumentCount = 0, optionalDocumentCount = 0, overallStatus = 'pending' } = helper.documentCompliance;
    return `${requiredDocumentCount} required, ${optionalDocumentCount} optional - ${overallStatus}`;
  };

  if (loading) {
    return (
      <div className="helpers-list-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading helpers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="helpers-list-container">
        <div className="error-container">
          <h2>Error Loading Helpers</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page-container">
      <AdminHeader currentUser={null} />
      
      <div className="admin-content">
        {/* Greeting and Summary Cards */}
        <div className="greeting-section">
          <h2 className="greeting-text">Helpers Management</h2>
          <p className="greeting-subtitle">Manage helpers, assistant drivers, and support personnel</p>
          <div className="timeframe-indicator">
            <span className="timeframe-label">Showing data for: {getFormattedDateRange()}</span>
          </div>
          
          <div className="summary-cards">
            <div className="summary-card">
              <div className="card-icon">
                <TbUser size={24} />
              </div>
              <div className="card-content">
                <div className="card-value">{helpers.length}</div>
                <div className="card-label">Total Helpers</div>
                <div className="card-change positive">
                  <TbArrowUp size={12} />
                  +2.5%
                </div>
              </div>
            </div>
            
            <div className="summary-card">
              <div className="card-icon">
                <TbCheck size={24} />
              </div>
              <div className="card-content">
                <div className="card-value">{helpers.filter(h => h.status === 'active').length}</div>
                <div className="card-label">Active</div>
                <div className="card-change positive">
                  <TbArrowUp size={12} />
                  +1.8%
                </div>
              </div>
            </div>
            
            <div className="summary-card">
              <div className="card-icon">
                <TbClock size={24} />
              </div>
              <div className="card-content">
                <div className="card-value">{helpers.filter(h => h.status === 'inactive').length}</div>
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
                <div className="card-value">{helpers.filter(h => h.licenseExpiryDate && new Date(h.licenseExpiryDate) < new Date()).length}</div>
                <div className="card-label">Expired Licenses</div>
                <div className="card-change negative">
                  <TbArrowDown size={12} />
                  -0.3%
                </div>
              </div>
            </div>
          </div>
        </div>


      {/* Modern Filters */}
      <div className="modern-filters">
        <div className="filters-header">
          <div className="filters-header-icon">🔍</div>
          <h3>Search & Filter</h3>
        </div>
        
        <div className="filters-grid">
          {/* Search */}
          <div className="search-container">
            <label className="search-label">Search</label>
            <div className="search-input-wrapper">
              <div className="search-icon">🔍</div>
              <input
                type="text"
                placeholder="Search by name, contact, license type, address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="modern-search-input"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="filter-group">
            <label className="filter-label">Status</label>
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

          {/* Clear Filters */}
          <div className="filter-actions">
            <button
              onClick={() => {
                setStatusFilter('all');
                setSearchQuery('');
              }}
              className="modern-btn modern-btn-secondary"
            >
              Clear All Filters
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="view-mode-toggle">
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
      </div>

      {/* Helpers Content */}
      {filteredHelpers.length === 0 ? (
        <div className="helpers-empty-state">
          <div className="empty-state-icon">👤</div>
          <h3 className="empty-state-title">No helpers found</h3>
          <p className="empty-state-description">
            No helpers match your current filters. Try adjusting your search criteria or add a new helper.
          </p>
          <Link to="/admin/helpers/add" className="btn btn-primary">
            ➕ Add Your First Helper
          </Link>
        </div>
      ) : viewMode === 'table' ? (
        // TABLE VIEW
        <div className="helpers-table-container">
          <div className="table-wrapper">
            <table className="helpers-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('name')} className="sortable">
                    Helper Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('contactNumber')} className="sortable">
                    Contact {sortField === 'contactNumber' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('licenseType')} className="sortable">
                    License Type {sortField === 'licenseType' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('licenseNumber')} className="sortable">
                    License # {sortField === 'licenseNumber' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('status')} className="sortable">
                    Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('documentCompliance')} className="sortable">
                    Compliance {sortField === 'documentCompliance' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {getSortedAndPaginatedHelpers().map(helper => (
                  <tr key={helper.id} className="helper-row">
                    <td className="helper-name-cell">
                      <div className="helper-name-wrapper">
                        <TbUser className="helper-icon" />
                        <span className="helper-name-text">{helper.name}</span>
                      </div>
                    </td>
                    <td>{helper.contactNumber || 'N/A'}</td>
                    <td>
                      <span className="license-badge">{helper.licenseType || 'N/A'}</span>
                    </td>
                    <td>{helper.licenseNumber || 'N/A'}</td>
                    <td>
                      <span className={`status-badge ${getStatusBadgeClass(helper.status)}`}>
                        {helper.status || 'Active'}
                      </span>
                    </td>
                    <td>
                      <div className="compliance-cell">
                        <span className="compliance-icon">{getComplianceIcon(helper)}</span>
                        <span className="compliance-text">{helper.documentCompliance?.requiredDocumentCount || 0}/2</span>
                      </div>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          onClick={() => handleViewDetails(helper)}
                          className="action-btn view-btn"
                          title="View Details"
                        >
                          <TbEye size={18} />
                        </button>
                        <Link
                          to={`/admin/helpers/edit/${helper.id}`}
                          className="action-btn edit-btn"
                          title="Edit Helper"
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
                Page {currentPage} of {totalPages} ({filteredHelpers.length} helpers)
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
      ) : (
        // CARD VIEW
        <div className="helper-cards-grid">
          {filteredHelpers.map(helper => {
            const statusClass = getStatusBadgeClass(helper.status);
            
            return (
              <div key={helper.id} className="helper-card">
                {/* Card Header */}
                <div className="helper-card-header">
                  <div className="helper-card-title">
                    <div className="helper-card-icon">👤</div>
                    <div className="helper-card-main">
                      <h3 className="helper-name">{helper.name}</h3>
                      <p className="helper-type">{helper.licenseType || 'No License'}</p>
                    </div>
                  </div>
                  <div className="helper-card-status">
                    <span className={`helper-status-primary ${statusClass.replace('status-', '')}`}>
                      {helper.status || 'Active'}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="helper-card-content">
                  <div className="helper-card-info">
                    <div className="helper-info-item">
                      <span className="helper-info-label">Contact</span>
                      <span className="helper-info-value">{helper.contactNumber || 'N/A'}</span>
                    </div>
                    <div className="helper-info-item">
                      <span className="helper-info-label">Address</span>
                      <span className="helper-info-value">{helper.address || 'N/A'}</span>
                    </div>
                    <div className="helper-info-item">
                      <span className="helper-info-label">License #</span>
                      <span className="helper-info-value">{helper.licenseNumber || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="helper-card-info">
                    <div className="helper-info-item">
                      <span className="helper-info-label">License Type</span>
                      <span className="helper-info-value">{helper.licenseType || 'N/A'}</span>
                    </div>
                    <div className="helper-info-item">
                      <span className="helper-info-label">Expiry</span>
                      <span className="helper-info-value">
                        {helper.licenseExpiryDate ? new Date(helper.licenseExpiryDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div className="helper-info-item">
                      <span className="helper-info-label">Hired</span>
                      <span className="helper-info-value">
                        {helper.employmentDate ? new Date(helper.employmentDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Document Compliance */}
                <div className={`helper-card-compliance ${getComplianceClass(helper)}`}>
                  <div className="compliance-info">
                    <div className="compliance-icon-large">
                      {getComplianceIcon(helper)}
                    </div>
                    <div className="compliance-text">
                      <div className="compliance-status">
                        {getComplianceStatus(helper)}
                      </div>
                      <div className="compliance-details">
                        {getComplianceDetails(helper)}
                      </div>
                    </div>
                  </div>
                  {/* File Counter Badge */}
                  <div className="file-counter-badge">
                    <span className="file-count-icon">📁</span>
                    <span className="file-count-text">
                      {Object.keys(helper.documents || {}).length} files
                    </span>
                    <div className="file-count-breakdown">
                      <span className="required-count">
                        {helper.documentCompliance?.requiredDocumentCount || 0}/2 required
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="helper-card-actions">
                  <div className="helper-card-actions-left">
                    <Link
                      to={`/admin/helpers/edit/${helper.id}`}
                      className="card-action-btn primary"
                    >
                      ✎ Edit
                    </Link>
                  </div>
                  <button 
                    className="view-details-btn"
                    onClick={() => handleViewDetails(helper)}
                  >
                    📊 View Details →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Helper Details Modal */}
      {showDetailsModal && selectedHelper && (
        <div className="modal-overlay" onClick={closeDetailsModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Helper Details - {selectedHelper.name}</h2>
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
                      <span className="detail-value">{selectedHelper.name}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Contact Number:</span>
                      <span className="detail-value">{selectedHelper.contactNumber || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Address:</span>
                      <span className="detail-value">{selectedHelper.address || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Status:</span>
                      <span className={`detail-badge ${getStatusBadgeClass(selectedHelper.status)}`}>
                        {selectedHelper.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Employment Information */}
                <div className="details-section">
                  <h3>💼 Employment Information</h3>
                  <div className="details-items">
                    <div className="detail-item">
                      <span className="detail-label">Employment Date:</span>
                      <span className="detail-value">
                        {selectedHelper.employmentDate ? new Date(selectedHelper.employmentDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* License Information */}
                <div className="details-section">
                  <h3>📜 License Information</h3>
                  <div className="details-items">
                    <div className="detail-item">
                      <span className="detail-label">License Type:</span>
                      <span className="detail-value">{selectedHelper.licenseType || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">License Number:</span>
                      <span className="detail-value">{selectedHelper.licenseNumber || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">License Expiry:</span>
                      <span className="detail-value">
                        {selectedHelper.licenseExpiryDate ? new Date(selectedHelper.licenseExpiryDate).toLocaleDateString() : 'N/A'}
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
                      <span className={`detail-badge compliance-${getComplianceClass(selectedHelper).replace('compliance-', '')}`}>
                        {getComplianceStatus(selectedHelper)}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Documents Completed:</span>
                      <span className="detail-value">{getComplianceDetails(selectedHelper)}</span>
                    </div>
                    
                    {/* Document Status List */}
                    <div className="documents-list">
                      <div className="document-item">
                        <span className="doc-name">Valid ID:</span>
                        <span className={`doc-status ${selectedHelper.documents?.validId ? 'complete' : 'missing'}`}>
                          {selectedHelper.documents?.validId ? '✓ Complete' : '✗ Missing'}
                        </span>
                      </div>
                      <div className="document-item">
                        <span className="doc-name">Barangay Clearance:</span>
                        <span className={`doc-status ${selectedHelper.documents?.barangayClearance ? 'complete' : 'missing'}`}>
                          {selectedHelper.documents?.barangayClearance ? '✓ Complete' : '✗ Missing'}
                        </span>
                      </div>
                      <div className="document-item">
                        <span className="doc-name">Medical Certificate:</span>
                        <span className={`doc-status ${selectedHelper.documents?.medicalCertificate ? 'complete' : 'optional'}`}>
                          {selectedHelper.documents?.medicalCertificate ? '✓ Complete' : '○ Optional'}
                        </span>
                      </div>
                      <div className="document-item">
                        <span className="doc-name">Helper License:</span>
                        <span className={`doc-status ${selectedHelper.documents?.helperLicense ? 'complete' : 'optional'}`}>
                          {selectedHelper.documents?.helperLicense ? '✓ Complete' : '○ Optional'}
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
                      {selectedHelper.documentCompliance?.documentCount || 0} files uploaded
                    </span>
                  </div>
                  <div className="document-breakdown">
                    <span className="required-docs">
                      Required: {selectedHelper.documentCompliance?.requiredDocumentCount || 0}/2
                    </span>
                    <span className="optional-docs">
                      Optional: {selectedHelper.documentCompliance?.optionalDocumentCount || 0}/2
                    </span>
                  </div>
                </div>
                {selectedHelper.documents && Object.keys(selectedHelper.documents).length > 0 ? (
                  <div className="details-items">
                    <FileViewer 
                      documents={selectedHelper.documents} 
                      entityType="helper"
                      entityName={selectedHelper.name}
                    />
                  </div>
                ) : (
                  <div className="no-documents-message">
                    <div className="no-docs-icon">📄</div>
                    <p>No documents have been uploaded for this helper yet.</p>
                    <Link to={`/admin/helpers/edit/${selectedHelper.id}`} className="btn btn-primary btn-sm">
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
    </div>
  );
};

export default HelpersList;