// src/pages/admin/clients/ClientsList.js - Enhanced with overdue payment tracking

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  TbUser,
  TbEye,
  TbEdit,
  TbAlertTriangle,
  TbClock,
  TbFilter,
  TbX,
  TbList,
  TbLayoutGrid,
  TbArrowUp,
  TbArrowDown,
  TbCheck,
  TbActivity,
  TbPlus
} from 'react-icons/tb';
import './ClientsList.css';
import '../../../styles/ModernForms.css';
import '../../../styles/DesignSystem.css';
import FileViewer from '../../../components/FileViewer';
import AdminHeader from '../../../components/common/AdminHeader';

// ⚙️ CONFIGURABLE THRESHOLD - Change this number to adjust the overdue payment warning threshold
const OVERDUE_PAYMENT_THRESHOLD = 3;

const ClientsList = ({ currentUser }) => {
  // Define baseURL for API calls
  const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5007';

  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const clientsPerPage = 20;

  // Calculate active filters count
  const activeFilterCount = [
    statusFilter !== 'all' ? statusFilter : null,
  ].filter(Boolean).length;

  // Overdue payment tracking
  const [clientPayments, setClientPayments] = useState({});
  const [showOverdueModal, setShowOverdueModal] = useState(false);
  const [selectedOverdueClient, setSelectedOverdueClient] = useState(null);

  // Handle viewing client details
  const handleViewDetails = (client) => {
    setSelectedClient(client);
    setShowDetailsModal(true);
  };

  // Close details modal
  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedClient(null);
  };

  // Handle viewing overdue payment details
  const handleViewOverdueDetails = (client) => {
    setSelectedOverdueClient(client);
    setShowOverdueModal(true);
  };

  // Close overdue modal
  const closeOverdueModal = () => {
    setShowOverdueModal(false);
    setSelectedOverdueClient(null);
  };

  // Format currency helper
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount || 0);
  };

  // Format date helper
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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

  // Fetch clients data and their payment information
  useEffect(() => {
    const fetchClientsAndPayments = async () => {
      try {
        setLoading(true);

        // Get clients with actual documents from file system (all in one call)
        const response = await axios.get(`${baseURL}/api/simple-files/clients-with-documents`);
        console.log('Raw API response (clients with actual documents):', response.data);

        // Handle both array response and object with clients property
        const clientsData = Array.isArray(response.data) ? response.data : response.data.clients;

        if (clientsData && clientsData.length > 0) {
          const formattedClients = clientsData.map(client => {
            console.log('Processing client data:', client);
            return {
              id: client.id || client.ClientID,
              name: client.name || client.ClientName,
              contactNumber: client.contactNumber || client.ClientNumber,
              address: client.address || client.ClientAddress,
              status: client.status || client.ClientStatus || 'Active',
              businessType: client.businessType || client.ClientBusinessType || 'General',
              email: client.email || client.ClientEmail || '',
              documents: client.documents || {},
              documentCompliance: client.documentCompliance || null
            };
          });

          setClients(formattedClients);

          // Fetch payment data for each client
          await fetchAllClientPayments(formattedClients);
        } else {
          console.log('No clients data received, setting empty array');
          setClients([]);
        }
      } catch (err) {
        console.error('Error fetching clients:', err);
        setError(`Failed to fetch clients: ${err.message}`);
        setClients([]);
      } finally {
        setLoading(false);
      }
    };

    fetchClientsAndPayments();
  }, [baseURL]);

  // Fetch payment data for all clients
  const fetchAllClientPayments = async (clientsList) => {
    try {
      const token = localStorage.getItem('token');
      const paymentsData = {};

      // Fetch payments for each client
      for (const client of clientsList) {
        try {
          const response = await axios.get(`${baseURL}/api/payments/client/${client.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          const payments = response.data.payments || [];

          // Calculate overdue payments (current date > due date AND status !== 'paid')
          const currentDate = new Date();
          const overduePayments = payments.filter(payment => {
            const dueDate = new Date(payment.dueDate);
            return currentDate > dueDate && payment.status !== 'paid';
          });

          paymentsData[client.id] = {
            allPayments: payments,
            overduePayments: overduePayments,
            overdueCount: overduePayments.length,
            overdueAmount: overduePayments.reduce((sum, p) => sum + (p.amount || 0), 0),
            hasOverdueRisk: overduePayments.length >= OVERDUE_PAYMENT_THRESHOLD
          };

          console.log(`Client ${client.name}: ${overduePayments.length} overdue payments`);
        } catch (err) {
          console.warn(`Failed to fetch payments for client ${client.id}:`, err.message);
          paymentsData[client.id] = {
            allPayments: [],
            overduePayments: [],
            overdueCount: 0,
            overdueAmount: 0,
            hasOverdueRisk: false
          };
        }
      }

      setClientPayments(paymentsData);
      console.log(`📊 Payment data loaded for ${Object.keys(paymentsData).length} clients`);
    } catch (err) {
      console.error('Error fetching client payments:', err);
    }
  };

  // Calculate status counts
  const statusCounts = {
    total: clients.length,
    active: clients.filter(client => client.status === 'Active').length,
    inactive: clients.filter(client => client.status === 'Inactive').length,
    pending: clients.filter(client => client.status === 'Pending').length,
    terminated: clients.filter(client => client.status === 'Terminated').length
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...clients];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(client => client.status === statusFilter);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(client =>
        client.name?.toLowerCase().includes(query) ||
        client.contactNumber?.includes(query) ||
        client.businessType?.toLowerCase().includes(query) ||
        client.address?.toLowerCase().includes(query) ||
        client.email?.toLowerCase().includes(query)
      );
    }

    setFilteredClients(filtered);
  }, [clients, statusFilter, searchQuery]);

  // Get sorted and paginated clients
  const getSortedAndPaginatedClients = () => {
    let sorted = [...filteredClients];

    // Sort
    sorted.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    // Paginate
    const startIndex = (currentPage - 1) * clientsPerPage;
    const endIndex = startIndex + clientsPerPage;
    return sorted.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredClients.length / clientsPerPage);

  // Helper function to get status badge class
  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'status-active';
      case 'inactive':
        return 'status-inactive';
      case 'pending':
        return 'status-pending';
      case 'terminated':
        return 'status-terminated';
      default:
        return 'status-default';
    }
  };

  // Helper functions for compliance
  const getComplianceClass = (client) => {
    if (!client.documentCompliance) return 'compliance-pending';
    const status = client.documentCompliance.overallStatus;
    if (status === 'complete') return 'compliance-complete';
    if (status === 'incomplete') return 'compliance-incomplete';
    return 'compliance-pending';
  };

  const getComplianceIcon = (client) => {
    if (!client.documentCompliance) return '⚙️';
    const status = client.documentCompliance.overallStatus;
    if (status === 'complete') return '✅';
    if (status === 'incomplete') return '⚠️';
    return '⚙️';
  };

  const getComplianceStatus = (client) => {
    if (!client.documentCompliance) return 'Compliance Pending';
    const status = client.documentCompliance.overallStatus;
    if (status === 'complete') return 'Compliance Complete';
    if (status === 'incomplete') return 'Compliance Incomplete';
    return 'Compliance Pending';
  };

  const getComplianceDetails = (client) => {
    if (!client.documentCompliance) return 'No compliance data';
    const { requiredDocumentCount = 0, optionalDocumentCount = 0, overallStatus = 'pending' } = client.documentCompliance;
    return `${requiredDocumentCount} required, ${optionalDocumentCount} optional - ${overallStatus}`;
  };

  if (loading) {
    return (
      <div className="clients-list-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading clients...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="clients-list-container">
        <div className="error-container">
          <h2>Error Loading Clients</h2>
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
      <AdminHeader currentUser={currentUser} />

      <div className="admin-content">
        {/* Greeting and Summary Cards */}
        <div className="greeting-section">
          <h2 className="greeting-text">Clients Management</h2>
          <p className="greeting-subtitle">Manage client relationships, business contracts, and service agreements</p>

          <div className="summary-cards">
            <div className="summary-card">
              <div className="card-icon">
                <TbUser size={24} />
              </div>
              <div className="card-content">
                <div className="card-value">{clients.length}</div>
                <div className="card-label">Total Clients</div>
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
                <div className="card-value">{statusCounts.active}</div>
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
                <div className="card-value">{statusCounts.inactive}</div>
                <div className="card-label">Inactive</div>
                <div className="card-change neutral">
                  <TbActivity size={12} />
                  0.0%
                </div>
              </div>
            </div>

            <div className="summary-card">
              <div className="card-icon">
                <TbAlertTriangle size={24} />
              </div>
              <div className="card-content">
                <div className="card-value">{statusCounts.terminated}</div>
                <div className="card-label">Terminated</div>
                <div className="card-change negative">
                  <TbArrowDown size={12} />
                  -0.5%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Filter Bar - Popup Style */}
        <div className="modern-filter-bar" style={{ position: 'relative', marginBottom: '24px' }}>
          <div className="search-filter-row" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search (Top Left) */}
            <div className="search-container" style={{ flex: '0 0 350px' }}>
              <div className="search-input-wrapper">
                <div className="search-icon">🔍</div>
                <input
                  type="text"
                  placeholder="Search by name, contact, business type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
            Showing {filteredClients.length} of {clients.length} clients
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
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Pending">Pending</option>
                    <option value="Terminated">Terminated</option>
                  </select>
                </div>
              </div>

              {/* Clear Filters Button */}
              <button
                className="btn btn-secondary"
                style={{ width: '100%' }}
                onClick={() => {
                  setStatusFilter('all');
                  setSearchQuery('');
                }}
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>

        {/* Clients Table */}
        {filteredClients.length === 0 ? (
          <div className="clients-empty-state">
            <div className="empty-state-icon">👤</div>
            <h3 className="empty-state-title">No clients found</h3>
            <p className="empty-state-description">
              No clients match your current filters. Try adjusting your search criteria or add a new client.
            </p>
            <Link to="/admin/clients/add" className="btn btn-primary">
              ➕ Add Your First Client
            </Link>
          </div>
        ) : (
          <div className="clients-table-container">
            <div className="table-wrapper">
              <table className="clients-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('name')} className="sortable">
                      Client Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('businessType')} className="sortable">
                      Business Type {sortField === 'businessType' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('email')} className="sortable">
                      Email {sortField === 'email' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('contactNumber')} className="sortable">
                      Contact {sortField === 'contactNumber' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('status')} className="sortable">
                      Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getSortedAndPaginatedClients().map(client => {
                    const paymentData = clientPayments[client.id] || {};
                    const hasOverdueRisk = paymentData.hasOverdueRisk || false;
                    const overdueCount = paymentData.overdueCount || 0;

                    return (
                      <tr
                        key={client.id}
                        className={`client-row ${hasOverdueRisk ? 'client-overdue-risk' : ''}`}
                        title={hasOverdueRisk ? `⚠️ ${overdueCount} overdue payments - Click warning icon for details` : ''}
                      >
                        <td className="client-name-cell">
                          <div className="client-name-wrapper">
                            <TbUser className="client-icon" />
                            <span className="client-name-text">{client.name}</span>
                            {hasOverdueRisk && (
                              <button
                                className="overdue-warning-icon"
                                onClick={() => handleViewOverdueDetails(client)}
                                title={`${overdueCount} overdue payments`}
                              >
                                <TbAlertTriangle size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="business-badge">{client.businessType || 'N/A'}</span>
                        </td>
                        <td>{client.email || 'N/A'}</td>
                        <td>{client.contactNumber || 'N/A'}</td>
                        <td>
                          <div className="status-cell-wrapper">
                            <span className={`status-badge ${getStatusBadgeClass(client.status)}`}>
                              {client.status || 'Active'}
                            </span>
                            {hasOverdueRisk && (
                              <span className="overdue-badge">
                                <TbClock size={14} /> {overdueCount} Overdue
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button
                              onClick={() => handleViewDetails(client)}
                              className="action-btn view-btn"
                              title="View Details"
                            >
                              <TbEye size={18} />
                            </button>
                            <Link
                              to={`/admin/clients/edit/${client.id}`}
                              className="action-btn edit-btn"
                              title="Edit Client"
                            >
                              <TbEdit size={18} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
                  Page {currentPage} of {totalPages} ({filteredClients.length} clients)
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

        {/* Client Details Modal */}
        {showDetailsModal && selectedClient && (
          <div className="modal-overlay" onClick={closeDetailsModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Client Details - {selectedClient.name}</h2>
                <button className="modal-close-btn" onClick={closeDetailsModal}>
                  ✕
                </button>
              </div>

              <div className="modal-body">
                <div className="details-grid">
                  {/* Personal Information */}
                  <div className="details-section">
                    <h3>👤 Client Information</h3>
                    <div className="details-items">
                      <div className="detail-item">
                        <span className="detail-label">Full Name:</span>
                        <span className="detail-value">{selectedClient.name}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Contact Number:</span>
                        <span className="detail-value">{selectedClient.contactNumber || 'N/A'}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Email:</span>
                        <span className="detail-value">{selectedClient.email || 'N/A'}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Status:</span>
                        <span className={`detail-badge ${getStatusBadgeClass(selectedClient.status)}`}>
                          {selectedClient.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Business Information */}
                  <div className="details-section">
                    <h3>💼 Business Information</h3>
                    <div className="details-items">
                      <div className="detail-item">
                        <span className="detail-label">Business Type:</span>
                        <span className="detail-value">{selectedClient.businessType || 'N/A'}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Address:</span>
                        <span className="detail-value">{selectedClient.address || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Document Compliance */}
                  <div className="details-section">
                    <h3>📄 Document Compliance</h3>
                    <div className="details-items">
                      <div className="detail-item">
                        <span className="detail-label">Overall Status:</span>
                        <span className={`detail-badge compliance-${getComplianceClass(selectedClient).replace('compliance-', '')}`}>
                          {getComplianceStatus(selectedClient)}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Documents Completed:</span>
                        <span className="detail-value">{getComplianceDetails(selectedClient)}</span>
                      </div>

                      {/* Document Status List */}
                      <div className="documents-list">
                        <div className="document-item">
                          <span className="doc-name">Business Permit:</span>
                          <span className={`doc-status ${selectedClient.documents?.businessPermit ? 'complete' : 'missing'}`}>
                            {selectedClient.documents?.businessPermit ? '✓ Complete' : '✗ Missing'}
                          </span>
                        </div>
                        <div className="document-item">
                          <span className="doc-name">Valid ID:</span>
                          <span className={`doc-status ${selectedClient.documents?.validId ? 'complete' : 'missing'}`}>
                            {selectedClient.documents?.validId ? '✓ Complete' : '✗ Missing'}
                          </span>
                        </div>
                        <div className="document-item">
                          <span className="doc-name">Service Contract:</span>
                          <span className={`doc-status ${selectedClient.documents?.serviceContract ? 'complete' : 'optional'}`}>
                            {selectedClient.documents?.serviceContract ? '✓ Complete' : '○ Optional'}
                          </span>
                        </div>
                        <div className="document-item">
                          <span className="doc-name">Tax Certificate:</span>
                          <span className={`doc-status ${selectedClient.documents?.taxCertificate ? 'complete' : 'optional'}`}>
                            {selectedClient.documents?.taxCertificate ? '✓ Complete' : '○ Optional'}
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
                        {selectedClient.documentCompliance?.documentCount || 0} files uploaded
                      </span>
                    </div>
                    <div className="document-breakdown">
                      <span className="required-docs">
                        Required: {selectedClient.documentCompliance?.requiredDocumentCount || 0}/2
                      </span>
                      <span className="optional-docs">
                        Optional: {selectedClient.documentCompliance?.optionalDocumentCount || 0}/2
                      </span>
                    </div>
                  </div>
                  {selectedClient.documents && Object.keys(selectedClient.documents).length > 0 ? (
                    <div className="details-items">
                      <FileViewer
                        documents={selectedClient.documents}
                        entityType="client"
                        entityName={selectedClient.name}
                      />
                    </div>
                  ) : (
                    <div className="no-documents-message">
                      <div className="no-docs-icon">📄</div>
                      <p>No documents have been uploaded for this client yet.</p>
                      <Link to={`/admin/clients/edit/${selectedClient.id}`} className="btn btn-primary btn-sm">
                        Upload Documents
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Overdue Payments Modal */}
        {showOverdueModal && selectedOverdueClient && (
          <div className="modal-overlay" onClick={closeOverdueModal}>
            <div className="modal-content overdue-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title-wrapper">
                  <TbAlertTriangle className="warning-icon" size={24} />
                  <h2>Overdue Payments - {selectedOverdueClient.name}</h2>
                </div>
                <button className="modal-close-btn" onClick={closeOverdueModal}>
                  ✕
                </button>
              </div>

              <div className="modal-body">
                {/* Overdue Summary */}
                <div className="overdue-summary">
                  <div className="summary-item danger">
                    <div className="summary-icon">
                      <TbClock size={32} />
                    </div>
                    <div className="summary-details">
                      <div className="summary-value">{clientPayments[selectedOverdueClient.id]?.overdueCount || 0}</div>
                      <div className="summary-label">Overdue Payments</div>
                    </div>
                  </div>
                  <div className="summary-item danger">
                    <div className="summary-icon">💰</div>
                    <div className="summary-details">
                      <div className="summary-value">
                        {formatCurrency(clientPayments[selectedOverdueClient.id]?.overdueAmount || 0)}
                      </div>
                      <div className="summary-label">Total Overdue Amount</div>
                    </div>
                  </div>
                </div>

                {/* Overdue Payments List */}
                <div className="overdue-payments-section">
                  <h3>📋 Overdue Payment Details</h3>
                  {clientPayments[selectedOverdueClient.id]?.overduePayments?.length > 0 ? (
                    <div className="overdue-payments-table-wrapper">
                      <table className="overdue-payments-table">
                        <thead>
                          <tr>
                            <th>Invoice</th>
                            <th>Due Date</th>
                            <th>Days Overdue</th>
                            <th>Amount</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {clientPayments[selectedOverdueClient.id].overduePayments.map((payment, index) => {
                            const dueDate = new Date(payment.dueDate);
                            const today = new Date();
                            const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

                            return (
                              <tr key={payment.id || index} className="overdue-payment-row">
                                <td>
                                  <strong>{payment.invoiceNumber || `INV-${payment.id?.slice(0, 8)}`}</strong>
                                </td>
                                <td>
                                  <span className="date-badge">{formatDate(payment.dueDate)}</span>
                                </td>
                                <td>
                                  <span className="days-overdue-badge">
                                    {daysOverdue} {daysOverdue === 1 ? 'day' : 'days'}
                                  </span>
                                </td>
                                <td>
                                  <strong className="amount-text">{formatCurrency(payment.amount)}</strong>
                                </td>
                                <td>
                                  <span className="status-badge overdue">
                                    <TbAlertTriangle size={14} /> Overdue
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="no-overdue-message">
                      <p>✅ No overdue payments found</p>
                    </div>
                  )}
                </div>

                {/* Warning Message */}
                <div className="overdue-warning-box">
                  <TbAlertTriangle size={20} />
                  <div>
                    <strong>Payment Risk Alert:</strong> This client has {clientPayments[selectedOverdueClient.id]?.overdueCount || 0} overdue payments
                    ({OVERDUE_PAYMENT_THRESHOLD}+ threshold). Please follow up on outstanding invoices.
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={closeOverdueModal}>
                  Close
                </button>
                <Link
                  to={`/admin/clients/edit/${selectedOverdueClient.id}`}
                  className="btn btn-primary"
                  onClick={closeOverdueModal}
                >
                  View Client Profile
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientsList;
