import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
  TbEdit, 
  TbEye, 
  TbTruck, 
  TbUser, 
  TbBuilding,
  TbCalendar,
  TbCheck,
  TbX,
  TbClock,
  TbAlertCircle,
  TbFileText,
  TbPlus,
  TbActivity,
  TbTruckDelivery,
  TbArrowUp,
  TbArrowDown,
  TbMapPin
} from 'react-icons/tb';
import StatusBadge from '../../../components/common/StatusBadge';
import Loader from '../../../components/common/Loader';
import '../../../styles/DesignSystem.css';
import { AlertContext } from '../../../context/AlertContext';
import './DeliveryList.css';
import AdminHeader from '../../../components/common/AdminHeader';
import LiveMapTracker from '../../../components/tracking/LiveMapTracker';

const DeliveryList = ({ currentUser }) => {
  const [deliveries, setDeliveries] = useState([]);
  const [filteredDeliveries, setFilteredDeliveries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortField, setSortField] = useState('DeliveryID');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const deliveriesPerPage = 20;
  const { showAlert } = useContext(AlertContext);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState(null);
  const [selectedTruckId, setSelectedTruckId] = useState(null);
  const [showTrackingModal, setShowTrackingModal] = useState(false);

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const fetchDeliveries = async () => {
    try {
      const res = await axios.get('/api/deliveries');
      setDeliveries(res.data);
      setFilteredDeliveries(res.data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      showAlert('Error fetching delivery data', 'danger');
      setIsLoading(false);
    }
  };

  // Filter deliveries
  useEffect(() => {
    let filtered = [...deliveries];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(d => d.DeliveryStatus?.toLowerCase() === statusFilter.toLowerCase());
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(d =>
        d.DeliveryID?.toLowerCase().includes(query) ||
        d.ClientName?.toLowerCase().includes(query) ||
        d.DriverName?.toLowerCase().includes(query) ||
        d.HelperName?.toLowerCase().includes(query) ||
        d.TruckPlate?.toLowerCase().includes(query)
      );
    }

    // Apply date range filter
    if (startDate || endDate) {
      filtered = filtered.filter(d => {
        // Get the delivery date (try multiple field names)
        const deliveryDate = d.created_at || d.CreatedAt || d.deliveryDate || d.DeliveryDate;
        if (!deliveryDate) return true; // Include deliveries without dates
        
        const date = new Date(deliveryDate);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        
        // Set time to start/end of day for accurate comparison
        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);
        
        if (start && end) {
          return date >= start && date <= end;
        } else if (start) {
          return date >= start;
        } else if (end) {
          return date <= end;
        }
        return true;
      });
    }

    setFilteredDeliveries(filtered);
  }, [deliveries, statusFilter, searchQuery, startDate, endDate]);

  // Sorting function
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get sorted and paginated deliveries
  const getSortedAndPaginatedDeliveries = () => {
    let sorted = [...filteredDeliveries];
    
    // Sort
    sorted.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    // Paginate
    const startIndex = (currentPage - 1) * deliveriesPerPage;
    const endIndex = startIndex + deliveriesPerPage;
    return sorted.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredDeliveries.length / deliveriesPerPage);

  // Helper functions
  const formatDriverStatus = (status, approvalStatus) => {
    if (!status || status === 'unknown') return 'Unknown';
    
    switch(status.toLowerCase()) {
      case 'awaiting_approval': return 'Awaiting Approval';
      case 'accepted': return 'Accepted';
      case 'in_progress':
      case 'in progress': return 'In Progress';
      case 'delivered': return 'Delivered';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      case 'assigned': return approvalStatus === 'approved' ? 'Approved' : 'Assigned';
      case 'awaiting_driver': return 'Awaiting';
      default: return 'Unknown';
    }
  };
  
  const formatHelperStatus = (status, approvalStatus) => {
    if (!status || status === 'unknown') return 'Unknown';
    
    switch(status.toLowerCase()) {
      case 'awaiting_approval': return 'Awaiting Approval';
      case 'accepted': return 'Accepted';
      case 'in_progress':
      case 'in progress': return 'In Progress';
      case 'delivered': return 'Delivered';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      case 'assigned': return approvalStatus === 'approved' ? 'Approved' : 'Assigned';
      case 'awaiting_helper': return 'Awaiting';
      default: return 'Unknown';
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="admin-page-container">
      <AdminHeader currentUser={currentUser} />
      
      <div className="admin-content">
        {/* Greeting and Summary Cards */}
        <div className="greeting-section">
          <h2 className="greeting-text">Delivery Management</h2>
          <p className="greeting-subtitle">Manage delivery schedules, track status, and monitor progress</p>
          
          <div className="summary-cards">
            <div className="summary-card">
              <div className="card-icon">
                <TbX size={24} />
              </div>
              <div className="card-content">
                <div className="card-value">{deliveries.filter(d => d.DeliveryStatus?.toLowerCase() === 'cancelled').length}</div>
                <div className="card-label">Cancelled</div>
                <div className="card-change negative">
                  <TbArrowDown size={12} />
                  0.0%
                </div>
              </div>
            </div>
            
            <div className="summary-card">
              <div className="card-icon">
                <TbClock size={24} />
              </div>
              <div className="card-content">
                <div className="card-value">{deliveries.filter(d => d.DeliveryStatus?.toLowerCase() === 'pending').length}</div>
                <div className="card-label">Pending</div>
                <div className="card-change positive">
                  <TbArrowUp size={12} />
                  +3.1%
                </div>
              </div>
            </div>
            
            <div className="summary-card">
              <div className="card-icon">
                <TbActivity size={24} />
              </div>
              <div className="card-content">
                <div className="card-value">{deliveries.filter(d => d.DeliveryStatus?.toLowerCase() === 'in-progress' || d.DeliveryStatus?.toLowerCase() === 'in progress').length}</div>
                <div className="card-label">In Progress</div>
                <div className="card-change neutral">
                  <TbActivity size={12} />
                  0.0%
                </div>
              </div>
            </div>
            
            <div className="summary-card">
              <div className="card-icon">
                <TbCheck size={24} />
              </div>
              <div className="card-content">
                <div className="card-value">{deliveries.filter(d => d.DeliveryStatus?.toLowerCase() === 'delivered' || d.DeliveryStatus?.toLowerCase() === 'completed').length}</div>
                <div className="card-label">Delivered</div>
                <div className="card-change positive">
                  <TbArrowUp size={12} />
                  +2.8%
                </div>
              </div>
            </div>
          </div>
        </div>
      
      {/* Filters Section */}
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
                placeholder="Search by ID, client, driver, helper, truck..."
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
              <option value="all">All</option>
              <option value="Pending">Pending</option>
              <option value="Accepted">Accepted</option>
              <option value="In Progress">In Progress</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Start Date Filter */}
          <div className="filter-group">
            <label className="filter-label">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="modern-filter-select"
              max={endDate || undefined}
            />
          </div>

          {/* End Date Filter */}
          <div className="filter-group">
            <label className="filter-label">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="modern-filter-select"
              min={startDate || undefined}
            />
          </div>
        </div>

        <div className="filter-actions">
          <button
            className="btn btn-secondary"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
              setStartDate('');
              setEndDate('');
            }}
          >
            Clear All Filters
          </button>
          
          <div className="filter-summary">
            Showing {filteredDeliveries.length} of {deliveries.length} deliveries
          </div>
        </div>
      </div>

      {/* Deliveries Table */}
      <div className="deliveries-table-container">
        {filteredDeliveries.length > 0 ? (
          <div className="table-wrapper">
            <table className="deliveries-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('DeliveryID')} className="sortable">
                    Delivery ID {sortField === 'DeliveryID' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('ClientName')} className="sortable">
                    Client {sortField === 'ClientName' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('DriverName')} className="sortable">
                    Driver {sortField === 'DriverName' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('HelperName')} className="sortable">
                    Helper {sortField === 'HelperName' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('TruckPlate')} className="sortable">
                    Truck {sortField === 'TruckPlate' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('DeliveryStatus')} className="sortable">
                    Status {sortField === 'DeliveryStatus' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {getSortedAndPaginatedDeliveries().map(delivery => (
                  <tr key={delivery.DeliveryID} className="delivery-row">
                    <td className="delivery-id-cell">
                      <div className="delivery-id-wrapper">
                        <TbTruckDelivery className="delivery-icon" />
                        <span className="delivery-id-text">{delivery.DeliveryID ? delivery.DeliveryID.substring(0, 12) : 'N/A'}</span>
                      </div>
                    </td>
                    <td>{delivery.ClientName || 'N/A'}</td>
                    <td>
                      <div className="driver-cell">
                        <span>{delivery.DriverName || 'Not Assigned'}</span>
                        <span className="mini-badge">{formatDriverStatus(delivery.DriverStatus, delivery.DriverApprovalStatus)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="helper-cell">
                        <span>{delivery.HelperName || 'Not Assigned'}</span>
                        <span className="mini-badge">{formatHelperStatus(delivery.HelperStatus, delivery.HelperApprovalStatus)}</span>
                      </div>
                    </td>
                    <td>{delivery.TruckPlate || 'N/A'}</td>
                    <td>
                      <StatusBadge status={delivery.DeliveryStatus || 'unknown'} />
                    </td>
                    <td>
                      <div className="table-actions">
                        <Link
                          to={`/admin/deliveries/${delivery.DeliveryID || ''}/view`}
                          className="action-btn view-btn"
                          title="View Details"
                        >
                          <TbEye size={18} />
                        </Link>
                        <Link
                          to={`/admin/deliveries/${delivery.DeliveryID || ''}`}
                          className="action-btn edit-btn"
                          title="Edit Delivery"
                        >
                          <TbEdit size={18} />
                        </Link>
                        <button
                          onClick={() => {
                            const truckIdentifier = delivery.TruckPlate || delivery.TruckID;
                            console.log('🚚 Opening tracking for delivery:', delivery.DeliveryID);
                            console.log('🚚 Truck Plate/ID:', truckIdentifier);
                            
                            if (!truckIdentifier) {
                              showAlert('No truck assigned to this delivery', 'warning');
                              return;
                            }
                            
                            setSelectedDeliveryId(delivery.DeliveryID);
                            setSelectedTruckId(truckIdentifier);
                            window.currentDeliveryData = delivery;
                            setShowTrackingModal(true);
                          }}
                          className="action-btn track-btn"
                          title="Track Live GPS"
                        >
                          <TbMapPin size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="deliveries-empty-state">
            <div className="empty-state-icon">📦</div>
            <h3>No deliveries found</h3>
            <p>No delivery records match your current filters.</p>
          </div>
        )}

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
              Page {currentPage} of {totalPages} ({filteredDeliveries.length} deliveries)
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
      </div>

      {/* Live GPS Tracking Modal */}
      {showTrackingModal && selectedDeliveryId && (
        <LiveMapTracker
          deliveryId={selectedDeliveryId}
          truckId={selectedTruckId}
          onClose={() => {
            setShowTrackingModal(false);
            setSelectedDeliveryId(null);
            setSelectedTruckId(null);
          }}
        />
      )}
    </div>
  );
};

export default DeliveryList;