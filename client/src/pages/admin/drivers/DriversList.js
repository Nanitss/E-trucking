import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './DriversTableView.css';
import { 
  TbUser, 
  TbEye, 
  TbEdit, 
  TbTruck, 
  TbChartBar,
  TbMail,
  TbPhone,
  TbCalendar,
  TbCheck,
  TbX,
  TbClock,
  TbList,
  TbLayoutGrid,
  TbAlertCircle,
  TbFileText,
  TbPlus,
  TbActivity,
  TbId,
  TbArrowUp,
  TbArrowDown
} from 'react-icons/tb';
import { useTimeframe } from '../../../contexts/TimeframeContext';
import { useExportData } from '../../../contexts/ExportDataContext';
import '../../../styles/ModernForms.css';
import '../../../styles/DesignSystem.css';
import './DriversList.css';
import DriverForm from './DriverForm';
import FileViewer from '../../../components/FileViewer';
import AdminHeader from '../../../components/common/AdminHeader';

const DriversList = ({ currentUser }) => {
  const { isWithinTimeframe, getFormattedDateRange } = useTimeframe();
  const { updateExportData } = useExportData();
  
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filteredDrivers, setFilteredDrivers] = useState([]);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const driversPerPage = 20;
  const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5007';

  // Helper function to calculate document compliance
  const calculateDocumentCompliance = (documents) => {
    if (!documents) return { 
      documentCount: 0, 
      requiredDocumentCount: 0, 
      optionalDocumentCount: 0,
      overallStatus: 'pending'
    };
    
    const requiredDocs = ['licenseDocument', 'medicalCertificate', 'idPhoto'];
    const optionalDocs = ['nbiClearance'];
    
    const requiredCount = requiredDocs.filter(doc => documents[doc]).length;
    const optionalCount = optionalDocs.filter(doc => documents[doc]).length;
    
    // Determine overall status
    let overallStatus = 'pending';
    if (requiredCount === 3) {
      overallStatus = 'complete'; // All 3 required docs uploaded
    } else if (requiredCount > 0) {
      overallStatus = 'incomplete'; // Some docs uploaded but not all
    }
    
    return {
      documentCount: requiredCount + optionalCount,
      requiredDocumentCount: requiredCount,
      optionalDocumentCount: optionalCount,
      overallStatus: overallStatus
    };
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  // Sorting function
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get sorted and paginated drivers
  const getSortedAndPaginatedDrivers = () => {
    let sorted = [...filteredDrivers];
    
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
    const startIndex = (currentPage - 1) * driversPerPage;
    const endIndex = startIndex + driversPerPage;
    return sorted.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredDrivers.length / driversPerPage);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      
      // Get auth token for admin endpoint
      const token = localStorage.getItem('token');
      const headers = token ? { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      } : {};
      
      // Fetch drivers from admin endpoint (has document scanning logic)
      const response = await fetch(`${baseURL}/api/admin/drivers`, { headers });
      if (response.ok) {
        const driversData = await response.json();
        console.log('✅ Fetched drivers from admin endpoint:', driversData.length);
        console.log('📋 First driver data:', driversData[0]);
        console.log('🔍 Raw emergency contact from API:', {
          name: driversData[0]?.emergencyContactName,
          phone: driversData[0]?.emergencyContactPhone,
          relationship: driversData[0]?.emergencyContactRelationship
        });
        
        // Transform the data to match expected format
        const transformedDrivers = driversData.map(driver => {
          const transformed = {
            id: driver.DriverID || driver.id, // Handle both field names
            name: driver.DriverName,
            contactNumber: driver.DriverNumber,
            address: driver.DriverAddress,
            status: driver.DriverStatus || 'active',
            employmentDate: driver.DriverEmploymentDate,
            licenseType: driver.licenseType,
            licenseNumber: driver.licenseNumber,
            licenseExpiryDate: driver.licenseExpiryDate,
            licenseRegistrationDate: driver.licenseRegistrationDate,
            emergencyContactName: driver.emergencyContactName,
            emergencyContactPhone: driver.emergencyContactPhone,
            emergencyContactRelationship: driver.emergencyContactRelationship,
            documents: driver.documents || {},
            documentCompliance: calculateDocumentCompliance(driver.documents || {})
          };
          
          // Log if ID is missing
          if (!transformed.id) {
            console.error('⚠️ Driver missing ID:', driver);
          }
          
          return transformed;
        });
        
        console.log('✅ Transformed drivers:', transformedDrivers.length);
        console.log('📋 First transformed driver:', transformedDrivers[0]);
        console.log('🚨 First driver emergency contact:', {
          name: transformedDrivers[0]?.emergencyContactName,
          phone: transformedDrivers[0]?.emergencyContactPhone,
          relationship: transformedDrivers[0]?.emergencyContactRelationship
        });
        setDrivers(transformedDrivers);
      } else {
        console.error('Error fetching drivers:', response.statusText);
        // Fallback to basic driver data if admin endpoint fails
        await fetchBasicDrivers();
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
      // Fallback to basic driver data if admin endpoint fails
      await fetchBasicDrivers();
    } finally {
      setLoading(false);
    }
  };

  const fetchBasicDrivers = async () => {
    try {
      // Get auth token
      const token = localStorage.getItem('token');
      const config = token ? {
        headers: { 'Authorization': `Bearer ${token}` }
      } : {};
      
      const response = await axios.get(`${baseURL}/api/drivers`, config);
      const driversData = response.data || [];
      
      // Transform to ensure consistent field names
      const transformedDrivers = driversData.map(driver => ({
        id: driver.DriverID || driver.id, // Handle both field names
        name: driver.DriverName,
        contactNumber: driver.DriverNumber,
        address: driver.DriverAddress,
        status: driver.DriverStatus || 'active',
        employmentDate: driver.DriverEmploymentDate,
        licenseType: driver.licenseType,
        licenseNumber: driver.licenseNumber,
        licenseExpiryDate: driver.licenseExpiryDate,
        licenseRegistrationDate: driver.licenseRegistrationDate,
        emergencyContactName: driver.emergencyContactName,
        emergencyContactPhone: driver.emergencyContactPhone,
        emergencyContactRelationship: driver.emergencyContactRelationship,
        documents: driver.documents || {},
        documentCompliance: calculateDocumentCompliance(driver.documents || {})
      }));
      
      setDrivers(transformedDrivers);
    } catch (error) {
      console.error('Error fetching basic drivers:', error);
      alert('Error fetching drivers');
    }
  };

  const handleAddDriver = () => {
    // No longer needed - using routing instead
  };

  const handleEditDriver = (driver) => {
    // No longer needed - using routing instead
  };

  const handleDeleteDriver = async (driverId) => {
    if (window.confirm('Are you sure you want to delete this driver?')) {
      try {
        // Get auth token
        const token = localStorage.getItem('token');
        const config = token ? {
          headers: { 'Authorization': `Bearer ${token}` }
        } : {};
        
        await axios.delete(`${baseURL}/api/admin/drivers/${driverId}`, config);
        alert('Driver deleted successfully!');
        fetchDrivers();
      } catch (error) {
        console.error('Error deleting driver:', error);
        alert('Error deleting driver');
      }
    }
  };

  const handleSaveDriver = (driverData) => {
    // No longer needed - using routing instead
    fetchDrivers();
  };

  const handleViewDetails = async (driver) => {
    try {
      // Get auth token for admin endpoint
      const token = localStorage.getItem('token');
      const headers = token ? { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      } : {};
      
      // Fetch fresh driver data with scanned documents
      const response = await fetch(`${baseURL}/api/admin/drivers/${driver.id}`, { headers });
      if (response.ok) {
        const freshDriver = await response.json();
        console.log('🔍 Fresh driver data from API:', freshDriver);
        console.log('🚨 Emergency contact from API:', {
          name: freshDriver.emergencyContactName,
          phone: freshDriver.emergencyContactPhone,
          relationship: freshDriver.emergencyContactRelationship
        });
        
        // Transform to match expected format
        const transformedDriver = {
          id: freshDriver.DriverID || freshDriver.id, // Handle both field names
          name: freshDriver.DriverName,
          contactNumber: freshDriver.DriverNumber,
          address: freshDriver.DriverAddress,
          status: freshDriver.DriverStatus || 'active',
          employmentDate: freshDriver.DriverEmploymentDate,
          licenseType: freshDriver.licenseType,
          licenseNumber: freshDriver.licenseNumber,
          licenseExpiryDate: freshDriver.licenseExpiryDate,
          licenseRegistrationDate: freshDriver.licenseRegistrationDate,
          emergencyContactName: freshDriver.emergencyContactName,
          emergencyContactPhone: freshDriver.emergencyContactPhone,
          emergencyContactRelationship: freshDriver.emergencyContactRelationship,
          documents: freshDriver.documents || {},
          documentCompliance: calculateDocumentCompliance(freshDriver.documents || {})
        };
        
        console.log('✅ Transformed driver for modal:', transformedDriver);
        console.log('✅ Emergency contacts in transformed:', {
          name: transformedDriver.emergencyContactName,
          phone: transformedDriver.emergencyContactPhone,
          relationship: transformedDriver.emergencyContactRelationship
        });
        
        setSelectedDriver(transformedDriver);
        setShowDetailsModal(true);
      } else {
        console.error('Error fetching driver details');
        // Fallback to cached data
        setSelectedDriver(driver);
        setShowDetailsModal(true);
      }
    } catch (error) {
      console.error('Error fetching driver details:', error);
      // Fallback to cached data
      setSelectedDriver(driver);
      setShowDetailsModal(true);
    }
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedDriver(null);
  };

  // Calculate status counts
  const statusCounts = {
    total: drivers.length,
    active: drivers.filter(driver => driver.status === 'Active').length,
    inactive: drivers.filter(driver => driver.status === 'Inactive').length,
    onLeave: drivers.filter(driver => driver.status === 'On Leave').length,
    terminated: drivers.filter(driver => driver.status === 'Terminated').length
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...drivers];

    // Apply timeframe filter - only filter if there's a specific timeframe selected
    // If no timeframe is selected, show all drivers
    if (isWithinTimeframe) {
      filtered = filtered.filter(driver => {
        if (driver.employmentDate || driver.createdAt || driver.CreatedAt) {
          return isWithinTimeframe(driver.employmentDate || driver.createdAt || driver.CreatedAt);
        }
        // If no creation date, include the driver (don't exclude it)
        return true;
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(driver => driver.status === statusFilter);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(driver => 
        driver.name?.toLowerCase().includes(query) ||
        driver.contactNumber?.includes(query) ||
        driver.licenseType?.toLowerCase().includes(query) ||
        driver.address?.toLowerCase().includes(query)
      );
    }

    setFilteredDrivers(filtered);
  }, [drivers, statusFilter, searchQuery, isWithinTimeframe]);

  // Update export data whenever filtered drivers change
  useEffect(() => {
    const columns = [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'status', label: 'Status', type: 'status' },
      { key: 'contactNumber', label: 'Contact', type: 'text' },
      { key: 'licenseType', label: 'License Type', type: 'text' },
      { key: 'address', label: 'Address', type: 'text' }
    ];

    const summary = {
      total: filteredDrivers.length,
      active: filteredDrivers.filter(driver => driver.status === 'Active').length,
      inactive: filteredDrivers.filter(driver => driver.status === 'Inactive').length,
      onLeave: filteredDrivers.filter(driver => driver.status === 'On Leave').length,
      terminated: filteredDrivers.filter(driver => driver.status === 'Terminated').length
    };

    updateExportData({
      data: filteredDrivers,
      columns,
      summary,
      entityType: 'drivers',
      title: 'Drivers Management Report'
    });
  }, [filteredDrivers, updateExportData]);

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
      case 'license-expiring':
        return 'status-license-expiring';
      case 'license-expired':
        return 'status-license-expired';
      default:
        return 'status-default';
    }
  };

  const getComplianceClass = (driver) => {
    // License expiry takes priority over document compliance
    if (driver.status === 'license-expired') {
      return 'compliance-license-expired';
    } else if (driver.status === 'license-expiring') {
      return 'compliance-license-expiring';
    }
    
    if (driver.documentCompliance?.overallStatus === 'complete') {
      return 'compliance-complete';
    } else if (driver.documentCompliance?.overallStatus === 'incomplete') {
      return 'compliance-incomplete';
    } else {
      return 'compliance-pending';
    }
  };

  const getComplianceIcon = (driver) => {
    // License expiry takes priority over document compliance
    if (driver.status === 'license-expired') {
      return '❌';
    } else if (driver.status === 'license-expiring') {
      return '⚠️';
    }
    
    if (driver.documentCompliance?.overallStatus === 'complete') {
      return '✅';
    } else if (driver.documentCompliance?.overallStatus === 'incomplete') {
      return '⚠️';
    } else {
      return '⚙️';
    }
  };

  const getComplianceStatus = (driver) => {
    // Check license expiry first - highest priority
    if (driver.status === 'license-expired') {
      return 'License Expired';
    } else if (driver.status === 'license-expiring') {
      return 'License Expiring Soon';
    }
    
    // Then check document compliance
    if (driver.documentCompliance?.overallStatus === 'complete') {
      return 'Ready to Drive';
    } else if (driver.documentCompliance?.overallStatus === 'incomplete') {
      return 'Compliance Incomplete';
    } else {
      return 'Compliance Pending';
    }
  };

  const getComplianceDetails = (driver) => {
    const required = driver.documentCompliance?.requiredDocumentCount || 0;
    const optional = driver.documentCompliance?.optionalDocumentCount || 0;
    const overall = driver.documentCompliance?.overallStatus || 'Incomplete';

    let details = [];
    if (required > 0) {
      details.push(`${required} required`);
    }
    if (optional > 0) {
      details.push(`${optional} optional`);
    }
    if (overall === 'complete') {
      details.push('Overall: Complete');
    } else if (overall === 'incomplete') {
      details.push('Overall: Incomplete');
    } else {
      details.push('Overall: Pending');
    }
    return details.join(', ');
  };

  // Get license expiry warning text
  const getLicenseExpiryWarning = (driver) => {
    if (driver.status === 'license-expired') {
      return '❌ License Expired - Driver on Leave';
    }
    if (driver.status === 'license-expiring' && driver.licenseExpiryDaysRemaining !== undefined) {
      const days = driver.licenseExpiryDaysRemaining;
      return `⚠️ License expires in ${days} day${days !== 1 ? 's' : ''} - Driver on Leave`;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading drivers...</p>
      </div>
    );
  }

  return (
    <div className="admin-page-container">
      <AdminHeader currentUser={currentUser} />
      
      <div className="admin-content">
        {/* Greeting and Summary Cards */}
        <div className="greeting-section">
          <h2 className="greeting-text">Drivers Management</h2>
          <p className="greeting-subtitle">Manage drivers, licenses, and driving credentials</p>
          <div className="timeframe-indicator">
            <span className="timeframe-label">Showing data for: {getFormattedDateRange()}</span>
          </div>
          
          <div className="summary-cards">
            <div className="summary-card">
              <div className="card-icon">
                <TbUser size={24} />
              </div>
              <div className="card-content">
                <div className="card-value">{drivers.length}</div>
                <div className="card-label">Total Drivers</div>
                <div className="card-change positive">
                  <TbArrowUp size={12} />
                  +3.2%
                </div>
              </div>
            </div>
            
            <div className="summary-card">
              <div className="card-icon">
                <TbCheck size={24} />
              </div>
              <div className="card-content">
                <div className="card-value">{drivers.filter(d => d.DriverStatus === 'active').length}</div>
                <div className="card-label">Active</div>
                <div className="card-change positive">
                  <TbArrowUp size={12} />
                  +2.1%
                </div>
              </div>
            </div>
            
            <div className="summary-card">
              <div className="card-icon">
                <TbClock size={24} />
              </div>
              <div className="card-content">
                <div className="card-value">{drivers.filter(d => d.DriverStatus === 'inactive').length}</div>
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
                <div className="card-value">{drivers.filter(d => d.licenseExpiryDate && new Date(d.licenseExpiryDate) < new Date()).length}</div>
                <div className="card-label">Expired Licenses</div>
                <div className="card-change negative">
                  <TbArrowDown size={12} />
                  -1.2%
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

      {/* Drivers Content */}
      {filteredDrivers.length === 0 ? (
        <div className="drivers-empty-state">
          <div className="empty-state-icon">👤</div>
          <h3 className="empty-state-title">No drivers found</h3>
          <p className="empty-state-description">
            No drivers match your current filters. Try adjusting your search criteria or add a new driver.
          </p>
          <Link to="/admin/drivers/add" className="btn btn-primary">
            ➕ Add Your First Driver
          </Link>
        </div>
      ) : viewMode === 'table' ? (
        // TABLE VIEW
        <div className="drivers-table-container">
          <div className="table-wrapper">
            <table className="drivers-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('name')} className="sortable">
                    Driver Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
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
                {getSortedAndPaginatedDrivers().map(driver => (
                  <tr key={driver.id} className="driver-row">
                    <td className="driver-name-cell">
                      <div className="driver-name-wrapper">
                        <TbUser className="driver-icon" />
                        <span className="driver-name-text">{driver.name}</span>
                      </div>
                    </td>
                    <td>{driver.contactNumber || 'N/A'}</td>
                    <td>
                      <span className="license-badge">{driver.licenseType || 'N/A'}</span>
                    </td>
                    <td>{driver.licenseNumber || 'N/A'}</td>
                    <td>
                      <div className="status-cell">
                        <span className={`status-badge ${getStatusBadgeClass(driver.status)}`}>
                          {driver.status || 'Active'}
                        </span>
                        {getLicenseExpiryWarning(driver) && (
                          <div className="license-warning-badge">
                            {getLicenseExpiryWarning(driver)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="compliance-cell">
                        <span className="compliance-icon">{getComplianceIcon(driver)}</span>
                        <span className="compliance-text">{driver.documentCompliance?.requiredDocumentCount || 0}/3</span>
                      </div>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          onClick={() => handleViewDetails(driver)}
                          className="action-btn view-btn"
                          title="View Details"
                        >
                          <TbEye size={18} />
                        </button>
                        <Link
                          to={`/admin/drivers/edit/${driver.id}`}
                          className="action-btn edit-btn"
                          title="Edit Driver"
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
                Page {currentPage} of {totalPages} ({filteredDrivers.length} drivers)
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
        <div className="driver-cards-grid">
          {filteredDrivers.map(driver => {
            const statusClass = getStatusBadgeClass(driver.status);
            
            return (
              <div key={driver.id} className="driver-card">
                {/* Card Header */}
                <div className="driver-card-header">
                  <div className="driver-card-title">
                    <div className="driver-card-icon">
                      <TbUser />
                    </div>
                    <div className="driver-card-main">
                      <h3 className="driver-name">{driver.name}</h3>
                      <p className="driver-type">{driver.licenseType || 'No License'}</p>
                    </div>
                  </div>
                  <div className="driver-card-status">
                    <span className={`driver-status-primary ${statusClass.replace('status-', '')}`}>
                      {driver.status || 'Active'}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="driver-card-content">
                  <div className="driver-card-info">
                    <div className="driver-info-item">
                      <span className="driver-info-label">Contact</span>
                      <span className="driver-info-value">{driver.contactNumber || 'N/A'}</span>
                    </div>
                    <div className="driver-info-item">
                      <span className="driver-info-label">Address</span>
                      <span className="driver-info-value">{driver.address || 'N/A'}</span>
                    </div>
                    <div className="driver-info-item">
                      <span className="driver-info-label">License #</span>
                      <span className="driver-info-value">{driver.licenseNumber || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="driver-card-info">
                    <div className="driver-info-item">
                      <span className="driver-info-label">License Type</span>
                      <span className="driver-info-value">{driver.licenseType || 'N/A'}</span>
                    </div>
                    <div className="driver-info-item">
                      <span className="driver-info-label">Expiry</span>
                      <span className="driver-info-value">
                        {driver.licenseExpiryDate ? new Date(driver.licenseExpiryDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div className="driver-info-item">
                      <span className="driver-info-label">Hired</span>
                      <span className="driver-info-value">
                        {driver.employmentDate ? new Date(driver.employmentDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Document Compliance */}
                <div className={`driver-card-compliance ${getComplianceClass(driver)}`}>
                  <div className="compliance-info">
                    <div className="compliance-icon-large">
                      {getComplianceIcon(driver)}
                    </div>
                    <div className="compliance-text">
                      <div className="compliance-status">
                        {getComplianceStatus(driver)}
                      </div>
                      <div className="compliance-details">
                        {getComplianceDetails(driver)}
                      </div>
                    </div>
                  </div>
                  {/* File Counter Badge */}
                  <div className="file-counter-badge">
                    <span className="file-count-icon">📁</span>
                    <span className="file-count-text">
                      {Object.keys(driver.documents || {}).length} files
                    </span>
                    <div className="file-count-breakdown">
                      <span className="required-count">
                        {driver.documentCompliance?.requiredDocumentCount || 0}/3 required
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="driver-card-actions">
                  <div className="driver-card-actions-left">
                    {driver.id ? (
                      <Link
                        to={`/admin/drivers/edit/${driver.id}`}
                        className="card-action-btn primary"
                      >
                        <TbEdit className="btn-icon" />
                        Edit
                      </Link>
                    ) : (
                      <button
                        className="card-action-btn primary disabled"
                        disabled
                        title="Driver ID missing"
                      >
                        <TbEdit className="btn-icon" />
                        Edit (No ID)
                      </button>
                    )}
                  </div>
                  <button 
                    className="view-details-btn"
                    onClick={() => handleViewDetails(driver)}
                  >
                    <TbEye className="btn-icon" />
                    View Details →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Driver Details Modal */}
      {showDetailsModal && selectedDriver && (
        <div className="modal-overlay" onClick={closeDetailsModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Driver Details - {selectedDriver.name}</h2>
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
                      <span className="detail-value">{selectedDriver.name}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Contact Number:</span>
                      <span className="detail-value">{selectedDriver.contactNumber || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Address:</span>
                      <span className="detail-value">{selectedDriver.address || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Status:</span>
                      <span className={`detail-badge ${getStatusBadgeClass(selectedDriver.status)}`}>
                        {selectedDriver.status}
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
                        {selectedDriver.employmentDate ? new Date(selectedDriver.employmentDate).toLocaleDateString() : 'N/A'}
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
                      <span className="detail-value">{selectedDriver.licenseType || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">License Number:</span>
                      <span className="detail-value">{selectedDriver.licenseNumber || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">License Expiry:</span>
                      <span className="detail-value">
                        {selectedDriver.licenseExpiryDate ? new Date(selectedDriver.licenseExpiryDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Emergency Contact Information */}
                <div className="details-section">
                  <h3>🚨 Emergency Contact</h3>
                  <div className="details-items">
                    <div className="detail-item">
                      <span className="detail-label">Contact Name:</span>
                      <span className="detail-value">{selectedDriver.emergencyContactName || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Contact Phone:</span>
                      <span className="detail-value">{selectedDriver.emergencyContactPhone || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Relationship:</span>
                      <span className="detail-value">{selectedDriver.emergencyContactRelationship || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Document Compliance */}
                <div className="details-section">
                  <h3>📄 Document Compliance</h3>
                  <div className="details-items">
                    <div className="detail-item">
                      <span className="detail-label">Overall Status:</span>
                      <span className={`detail-badge compliance-${getComplianceClass(selectedDriver).replace('compliance-', '')}`}>
                        {getComplianceStatus(selectedDriver)}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Documents Completed:</span>
                      <span className="detail-value">{getComplianceDetails(selectedDriver)}</span>
                    </div>
                    
                    {/* Document Status List */}
                    <div className="documents-list">
                      <div key="licenseDocument" className="document-item">
                        <span className="doc-name">License Document:</span>
                        <span className={`doc-status ${selectedDriver.documents?.licenseDocument ? 'complete' : 'missing'}`}>
                          {selectedDriver.documents?.licenseDocument ? '✓ Complete' : '✗ Missing'}
                        </span>
                      </div>
                      <div key="medicalCertificate" className="document-item">
                        <span className="doc-name">Medical Certificate:</span>
                        <span className={`doc-status ${selectedDriver.documents?.medicalCertificate ? 'complete' : 'missing'}`}>
                          {selectedDriver.documents?.medicalCertificate ? '✓ Complete' : '✗ Missing'}
                        </span>
                      </div>
                      <div key="idPhoto" className="document-item">
                        <span className="doc-name">ID Photo:</span>
                        <span className={`doc-status ${selectedDriver.documents?.idPhoto ? 'complete' : 'missing'}`}>
                          {selectedDriver.documents?.idPhoto ? '✓ Complete' : '✗ Missing'}
                        </span>
                      </div>
                      <div key="nbiClearance" className="document-item">
                        <span className="doc-name">NBI Clearance:</span>
                        <span className={`doc-status ${selectedDriver.documents?.nbiClearance ? 'complete' : 'optional'}`}>
                          {selectedDriver.documents?.nbiClearance ? '✓ Complete' : '○ Optional'}
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
                      {selectedDriver.documentCompliance?.documentCount || 0} files uploaded
                    </span>
                  </div>
                  <div className="document-breakdown">
                    <span className="required-docs">
                      Required: {selectedDriver.documentCompliance?.requiredDocumentCount || 0}/3
                    </span>
                    <span className="optional-docs">
                      Optional: {selectedDriver.documentCompliance?.optionalDocumentCount || 0}/1
                    </span>
                  </div>
                </div>
                {selectedDriver.documents && Object.keys(selectedDriver.documents).length > 0 ? (
                  <div className="details-items">
                    <FileViewer 
                      documents={selectedDriver.documents} 
                      entityType="driver"
                      entityName={selectedDriver.name}
                    />
                  </div>
                ) : (
                  <div className="no-documents-message">
                    <div className="no-docs-icon">📄</div>
                    <p>No documents have been uploaded for this driver yet.</p>
                    <Link to={`/admin/drivers/edit/${selectedDriver.id}`} className="btn btn-primary btn-sm">
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

export default DriversList;
