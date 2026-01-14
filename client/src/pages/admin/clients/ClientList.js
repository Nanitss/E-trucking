// src/pages/admin/clients/ClientList.js - Enhanced with improved design

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
  TbBuilding, 
  TbEye, 
  TbEdit, 
  TbTruck, 
  TbChartBar,
  TbUser,
  TbMail,
  TbPhone,
  TbCalendar,
  TbCheck,
  TbX,
  TbClock,
  TbAlertCircle,
  TbFileText,
  TbActivity,
  TbArrowUp,
  TbArrowDown
} from 'react-icons/tb';
import { useTimeframe } from '../../../contexts/TimeframeContext';
import './ClientList.css';
import '../../../styles/ModernForms.css';
import '../../../styles/DesignSystem.css';
import AdminHeader from '../../../components/common/AdminHeader';

const ClientList = ({ currentUser }) => {
  const { isWithinTimeframe, getFormattedDateRange } = useTimeframe();
  
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedClient, setSelectedClient] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [sortField, setSortField] = useState('ClientName');
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const clientsPerPage = 20;
  
  // Overdue payment tracking
  const [clientPayments, setClientPayments] = useState({});
  const OVERDUE_PAYMENT_THRESHOLD = 3;

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
  
  // Fetch payment data for all clients
  const fetchAllClientPayments = async (clientsList) => {
    try {
      const token = localStorage.getItem('token');
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5007';
      const paymentsData = {};
      
      for (const client of clientsList) {
        try {
          const response = await axios.get(`${baseURL}/api/payments/client/${client.ClientID}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          const payments = response.data.payments || [];
          
          // Calculate overdue payments
          const currentDate = new Date();
          const overduePayments = payments.filter(payment => {
            const dueDate = new Date(payment.dueDate);
            return currentDate > dueDate && payment.status !== 'paid';
          });
          
          paymentsData[client.ClientID] = {
            overdueCount: overduePayments.length,
            overdueAmount: overduePayments.reduce((sum, p) => sum + (p.amount || 0), 0),
            hasOverdueRisk: overduePayments.length >= OVERDUE_PAYMENT_THRESHOLD
          };
          
          console.log(`Client ${client.ClientName}: ${overduePayments.length} overdue payments`);
        } catch (err) {
          console.warn(`Failed to fetch payments for client ${client.ClientID}:`, err.message);
        }
      }
      
      setClientPayments(paymentsData);
    } catch (error) {
      console.error('Error fetching client payments:', error);
    }
  };

  // Fetch clients on component mount
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching clients from API...');
        const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5007';
        console.log('API Base URL:', baseURL);

        const response = await axios.get(`${baseURL}/api/clients`);
        console.log('API Response:', response.data);

        if (response.data && Array.isArray(response.data)) {
          // Map the response data to standardize field names
          const formattedClients = response.data.map(client => ({
            ClientID: client.id || client.ClientID,
            ClientName: client.clientName || client.ClientName,
            ClientEmail: client.clientEmail || client.ClientEmail,
            ClientNumber: client.clientNumber || client.ClientNumber,
            ClientStatus: client.clientStatus || client.ClientStatus || 'active',
            ClientCreationDate: client.clientCreationDate || client.ClientCreationDate,
            UserID: client.userId || client.UserID
          }));
          setClients(formattedClients);
          console.log('Clients loaded:', formattedClients.length);
          
          // Fetch payment data for each client
          fetchAllClientPayments(formattedClients);
        } else {
          console.warn('API returned unexpected data format:', response.data);
          setClients([]);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching clients:', err);
        
        // More specific error handling
        if (err.code === 'ERR_NETWORK') {
          setError('Network error. Please check your connection and try again.');
        } else if (err.response) {
          if (err.response.status === 404) {
            setError('Client data not found. The API endpoint may not be configured properly.');
          } else if (err.response.status === 500) {
            setError('Server error. Please try again later.');
          } else {
            setError(`Server error (${err.response.status}): ${err.response.data?.message || 'Unknown error'}`);
          }
        } else if (err.request) {
          setError('No response received from server. Please check if the backend is running.');
        } else {
          setError(`Request error: ${err.message}`);
        }
        
        setLoading(false);
        setClients([]);
      }
    };

    fetchClients();
  }, []);

  // Filter clients based on search, status, and timeframe
  const filteredClients = useMemo(() => {
    let filtered = clients;

    // Apply timeframe filter - only filter if there's a specific timeframe selected
    if (isWithinTimeframe) {
      filtered = filtered.filter(client => {
        if (client.CreatedAt || client.createdAt || client.registrationDate) {
          return isWithinTimeframe(client.CreatedAt || client.createdAt || client.registrationDate);
        }
        // If no creation date, include the client (don't exclude it)
        return true;
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(client => 
        client.ClientStatus?.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(client =>
        client.ClientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.ClientEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.ClientNumber?.includes(searchTerm)
      );
    }

    return filtered;
  }, [clients, searchTerm, statusFilter, isWithinTimeframe]);

  // Sorting function
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

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

  // Get summary data
  const getSummaryData = () => {
    const total = clients.length;
    const active = clients.filter(c => c.ClientStatus?.toLowerCase() === 'active').length;
    const inactive = clients.filter(c => c.ClientStatus?.toLowerCase() === 'inactive').length;
    const pending = clients.filter(c => c.ClientStatus?.toLowerCase() === 'pending').length;
    
    return { total, active, inactive, pending };
  };

  const summaryData = getSummaryData();

  // Get unique statuses for filter dropdown
  const uniqueStatuses = [...new Set(clients.map(c => c.ClientStatus).filter(Boolean))];

  // Handle error dismissal
  const dismissError = () => {
    setError(null);
  };

  // Handle retry
  const retryFetch = () => {
    setError(null);
    setLoading(true);
    // Re-run the effect
    const fetchClients = async () => {
      try {
        const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5007';
        const response = await axios.get(`${baseURL}/api/clients`);
        
        if (response.data && Array.isArray(response.data)) {
          // Map the response data to standardize field names
          const formattedClients = response.data.map(client => ({
            ClientID: client.id || client.ClientID,
            ClientName: client.clientName || client.ClientName,
            ClientEmail: client.clientEmail || client.ClientEmail,
            ClientNumber: client.clientNumber || client.ClientNumber,
            ClientStatus: client.clientStatus || client.ClientStatus || 'active',
            ClientCreationDate: client.clientCreationDate || client.ClientCreationDate,
            UserID: client.userId || client.UserID
          }));
          setClients(formattedClients);
        } else {
          setClients([]);
        }
        setLoading(false);
      } catch (err) {
        console.error('Retry failed:', err);
        setError('Retry failed. Please check your connection and try again.');
        setLoading(false);
      }
    };
    fetchClients();
  };



  // Helper function to format status
  const formatStatus = (status) => {
    if (!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Helper function to get status badge class
  const getStatusBadgeClass = (status) => {
    switch(status?.toLowerCase()) {
      case 'active':
        return 'status-active';
      case 'inactive':
        return 'status-inactive';
      case 'pending':
        return 'status-pending';
      default:
        return 'status-unknown';
    }
  };

  if (loading) {
    return <div className="loading">Loading clients data...</div>;
  }

  return (
    <div className="admin-page-container">
      <AdminHeader currentUser={null} />
      
      <div className="admin-content">
        {/* Greeting and Summary Cards */}
        <div className="greeting-section">
          <h2 className="greeting-text">Clients Management</h2>
          <p className="greeting-subtitle">Manage client accounts, contracts, and business relationships</p>
          <div className="timeframe-indicator">
            <span className="timeframe-label">Showing data for: {getFormattedDateRange()}</span>
          </div>
          
          <div className="summary-cards">
            <div className="summary-card">
              <div className="card-icon">
                <TbBuilding size={24} />
              </div>
              <div className="card-content">
                <div className="card-value">{clients.length}</div>
                <div className="card-label">Total Clients</div>
                <div className="card-change positive">
                  <TbArrowUp size={12} />
                  +4.1%
                </div>
              </div>
            </div>
            
            <div className="summary-card">
              <div className="card-icon">
                <TbCheck size={24} />
              </div>
              <div className="card-content">
                <div className="card-value">{clients.filter(c => c.status === 'active').length}</div>
                <div className="card-label">Active</div>
                <div className="card-change positive">
                  <TbArrowUp size={12} />
                  +2.8%
                </div>
              </div>
            </div>
            
            <div className="summary-card">
              <div className="card-icon">
                <TbClock size={24} />
              </div>
              <div className="card-content">
                <div className="card-value">{clients.filter(c => c.status === 'inactive').length}</div>
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
                <div className="card-value">{clients.filter(c => c.contractExpiryDate && new Date(c.contractExpiryDate) < new Date()).length}</div>
                <div className="card-label">Expired Contracts</div>
                <div className="card-change negative">
                  <TbArrowDown size={12} />
                  -0.5%
                </div>
              </div>
            </div>
          </div>
        </div>

      {error && (
        <div className="error-message">
          {error}
          <div style={{ marginTop: '10px' }}>
            <button onClick={dismissError} className="btn btn-secondary btn-sm" style={{ marginRight: '10px' }}>
              Dismiss
            </button>
            <button onClick={retryFetch} className="btn btn-primary btn-sm">
              Retry
            </button>
          </div>
          <button onClick={dismissError} className="close-btn">×</button>
        </div>
      )}


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
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
            {uniqueStatuses.map(status => (
              <option key={status} value={status}>
                {formatStatus(status)}
              </option>
            ))}
          </select>
          </div>
        </div>

        <div className="filter-actions">
        <button
          className="btn btn-secondary"
          onClick={() => {
            setSearchTerm('');
            setStatusFilter('all');
          }}
        >
            Clear All Filters
        </button>
          
          <div className="filter-summary">
            Showing {filteredClients.length} of {clients.length} clients
          </div>
        </div>
      </div>

      {/* Client Cards */}
      {filteredClients.length === 0 && !loading ? (
        <div className="trucks-empty-state">
          <div className="empty-state-icon">
            <TbBuilding />
          </div>
          <h3 className="empty-state-title">No clients found</h3>
          <p className="empty-state-description">
            {searchTerm || statusFilter !== 'all' 
              ? 'No clients match your current filters. Try adjusting your search criteria or add a new client.' 
              : 'No client records found. Add your first client to get started.'
            }
          </p>
          <Link to="/admin/clients/add" className="modern-btn modern-btn-primary">
            <TbUser className="btn-icon" />
            Add Your First Client
          </Link>
        </div>
      ) : (
        <div className="clients-table-container">
          <div className="table-wrapper">
            <table className="clients-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('ClientName')} className="sortable">
                    Client Name {sortField === 'ClientName' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('ClientEmail')} className="sortable">
                    Email {sortField === 'ClientEmail' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('ClientNumber')} className="sortable">
                    Contact {sortField === 'ClientNumber' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('ClientCreationDate')} className="sortable">
                    Created {sortField === 'ClientCreationDate' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('ClientStatus')} className="sortable">
                    Status {sortField === 'ClientStatus' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {getSortedAndPaginatedClients().map(client => {
                  const paymentData = clientPayments[client.ClientID] || {};
                  const hasOverdueRisk = paymentData.hasOverdueRisk || false;
                  const overdueCount = paymentData.overdueCount || 0;
                  
                  return (
                  <tr 
                    key={client.ClientID} 
                    className={`client-row ${hasOverdueRisk ? 'client-overdue-risk' : ''}`}
                    title={hasOverdueRisk ? `⚠️ ${overdueCount} overdue payments` : ''}
                  >
                    <td className="client-name-cell">
                      <div className="client-name-wrapper">
                        <TbBuilding className="client-icon" />
                        <span className="client-name-text">{client.ClientName}</span>
                        {hasOverdueRisk && (
                          <span className="overdue-warning-icon" title={`${overdueCount} overdue payments`}>
                            <TbAlertCircle size={20} />
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{client.ClientEmail || 'N/A'}</td>
                    <td>{client.ClientNumber || 'N/A'}</td>
                    <td>
                      {client.ClientCreationDate ? new Date(client.ClientCreationDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusBadgeClass(client.ClientStatus)}`}>
                        {formatStatus(client.ClientStatus)}
                      </span>
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
                          to={`/admin/clients/edit/${client.ClientID}`}
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
              <h2>🏢 {selectedClient.ClientName} Details</h2>
              <button className="modal-close-btn" onClick={closeDetailsModal}>✕</button>
            </div>
            
            <div className="modal-body">
              <div className="details-grid">
                {/* Basic Information */}
                <div className="details-section">
                  <h3>📋 Basic Information</h3>
                  <div className="details-items">
                    <div className="detail-item">
                      <span className="detail-label">Client ID:</span>
                      <span className="detail-value">{selectedClient.ClientID}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Client Name:</span>
                      <span className="detail-value">{selectedClient.ClientName}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Email:</span>
                      <span className="detail-value">{selectedClient.ClientEmail || 'Not provided'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Phone Number:</span>
                      <span className="detail-value">{selectedClient.ClientNumber || 'Not provided'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">User ID:</span>
                      <span className="detail-value">{selectedClient.UserID || 'Not linked'}</span>
                    </div>
                  </div>
                </div>

                {/* Status Information */}
                <div className="details-section">
                  <h3>🚦 Status Information</h3>
                  <div className="details-items">
                    <div className="detail-item">
                      <span className="detail-label">Current Status:</span>
                      <span className={`detail-badge status-${selectedClient.ClientStatus?.toLowerCase() || 'unknown'}`}>
                        {formatStatus(selectedClient.ClientStatus)}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Account Created:</span>
                      <span className="detail-value">
                        {selectedClient.ClientCreationDate 
                          ? new Date(selectedClient.ClientCreationDate).toLocaleDateString()
                          : 'Unknown'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <Link
                to={`/admin/clients/edit/${selectedClient.ClientID}`}
                className="modern-btn modern-btn-primary"
              >
                ✎ Edit Client
              </Link>
              <Link
                to={`/admin/clients/${selectedClient.ClientID}/trucks`}
                className="modern-btn modern-btn-secondary"
              >
                🚛 Manage Trucks
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

export default ClientList;