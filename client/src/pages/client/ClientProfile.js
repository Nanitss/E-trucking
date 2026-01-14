import React, { useState, useEffect, useContext } from 'react';
import { Link, useHistory, useLocation } from 'react-router-dom';
import axios from 'axios';
import '../../components/common/ContentAdjust.css';
import { 
  FaUser, 
  FaTruck, 
  FaShippingFast, 
  FaCalendarAlt, 
  FaMapMarkerAlt, 
  FaDollarSign,
  FaEye,
  FaSignOutAlt,
  FaEdit,
  FaPhone,
  FaEnvelope,
  FaBuilding,
  FaHistory,
  FaCreditCard,
  FaChartLine,
  FaFileInvoiceDollar,
  FaPlus,
  FaSearch,
  FaRoute,
  FaFilter,
  FaExclamationTriangle,
  FaInfoCircle,
  FaArrowRight,
  FaExclamationCircle,
  FaCheckCircle,
  FaMobile,
  FaRedo,
  FaClock,
  FaTimes,
  FaExchangeAlt,
  FaCalendar,
  FaSync,
  FaCalendarPlus
} from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';
import { useModernToast } from '../../context/ModernToastContext';
import { ModernToastContainer } from '../../components/common/ModernToast';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import WarningModal from '../../components/common/WarningModal';
import RouteMap from '../../components/maps/RouteMap';
import enhancedIsolatedMapModal from '../../components/maps/EnhancedIsolatedMapModal';
import useWarningModal from '../../hooks/useWarningModal';
import './ClientProfile.css';
import '../../styles/DesignSystem.css';

// Modern Billing Section Component
const ModernBillingSection = ({ onBillingDataUpdate }) => {
  const [billingData, setBillingData] = useState(null);
  const [deliveryData, setDeliveryData] = useState({ active: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Utility to get clientId from multiple sources (mirrors PaymentManagement)
  const getClientId = () => {
    try {
      // 1) Check AuthContext (if available via window object)
      if (window?.authUser && (window.authUser.clientId || window.authUser.id)) {
        return window.authUser.clientId || window.authUser.id;
      }

      // 2) localStorage keys
      if (typeof Storage !== 'undefined' && typeof localStorage !== 'undefined') {
        const userDataRaw = localStorage.getItem('userData') || localStorage.getItem('currentUser');
        if (userDataRaw) {
          const userData = JSON.parse(userDataRaw);
          return userData.clientId || userData.id;
        }

        // 3) decode token payload if present
        const token = localStorage.getItem('token');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          return payload.clientId || payload.id || payload.sub;
        }
      }
    } catch (e) {
      console.warn('Unable to resolve clientId', e);
    }
    return null;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Enhanced token validation
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required - Please log in again');
      }

      // Validate token format
      if (!token.includes('.')) {
        throw new Error('Invalid token format - Please log in again');
      }

      // Enhanced client ID resolution with debugging
      const clientId = getClientId();
      console.log('🔍 Resolved client ID:', clientId);
      
      if (!clientId) {
        console.error('❌ Failed to resolve client ID from any source');
        console.log('🔍 Available localStorage keys:', Object.keys(localStorage));
        console.log('🔍 Token payload preview:', token ? token.split('.')[1].substring(0, 50) + '...' : 'No token');
        throw new Error('Unable to identify your account - Please refresh the page or log in again');
      }

      // Set authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      console.log('🔄 Fetching billing data for client:', clientId);

      // Fetch payment summary from backend with enhanced error handling
      const response = await axios.get(`/api/payments/client/${clientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-client-id': clientId
        },
        timeout: 10000 // 10 second timeout
      });

      // The API returns a summary object with payments array
      const summaryData = response.data?.data || response.data || {};
      const payments = summaryData.payments || [];

      console.log('✅ Billing data received:', summaryData);

      const billingDataToSet = {
        totalAmountDue: summaryData.totalAmountDue || 0,
        totalAmountPaid: summaryData.totalAmountPaid || 0,
        overdueAmount: summaryData.overdueAmount || 0,
        overduePayments: summaryData.overduePayments || 0,
        pendingPayments: summaryData.pendingPayments || 0,
        paidPayments: summaryData.paidPayments || 0,
        payments: payments,
        canBookTrucks: summaryData.canBookTrucks !== false
      };

      setBillingData(billingDataToSet);

      // Pass billing data to parent component for header
      if (onBillingDataUpdate) {
        onBillingDataUpdate(billingDataToSet);
      }

      // Fetch delivery data for active services count
      try {
        const deliveriesResponse = await axios.get(`/api/clients/deliveries`);
        const deliveries = deliveriesResponse.data || [];
        
        const activeDeliveries = deliveries.filter(d => 
          d.DeliveryStatus === 'pending' || d.DeliveryStatus === 'in-progress'
        ).length;
        
        const completedDeliveries = deliveries.filter(d => 
          d.DeliveryStatus === 'completed'
        ).length;

        setDeliveryData({
          active: activeDeliveries,
          completed: completedDeliveries
        });
      } catch (deliveryErr) {
        console.error('Error fetching delivery data:', deliveryErr);
        // Use fallback data if delivery fetch fails
        setDeliveryData({ active: 0, completed: 0 });
      }
    } catch (err) {
      console.error('❌ Error fetching billing data:', err);
      
      // Enhanced error handling with specific messages
      let errorMessage = 'Failed to load billing information';
      
      if (err.code === 'ECONNREFUSED' || err.message.includes('Network Error')) {
        errorMessage = 'Server connection failed - Please ensure the backend server is running';
      } else if (err.response?.status === 401) {
        errorMessage = 'Authentication expired - Please log out and log in again';
      } else if (err.response?.status === 403) {
        errorMessage = 'Access denied - Please check your account permissions';
      } else if (err.response?.status === 404) {
        errorMessage = 'Payment service not found - Please contact support';
      } else if (err.response?.status >= 500) {
        errorMessage = 'Server error - Please try again later or contact support';
      } else if (err.message.includes('timeout')) {
        errorMessage = 'Request timeout - Please check your internet connection and try again';
      } else {
        errorMessage = err.response?.data?.message || err.message || errorMessage;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  if (loading) {
    return (
      <div className="modern-billing-section">
        <div className="billing-loader">
          <div className="spinner"></div>
          <p>Loading billing information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="modern-billing-section">
        <div className="billing-error">
          <FaExclamationTriangle className="error-icon" />
          <h3>Unable to load billing information</h3>
          <p>{error}</p>
          
          {/* Debug information for development */}
          {process.env.NODE_ENV === 'development' && (
            <details style={{ marginTop: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '4px', fontSize: '0.85rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Debug Information (Development Only)</summary>
              <div style={{ marginTop: '0.5rem' }}>
                <p><strong>Client ID:</strong> {getClientId() || 'Not found'}</p>
                <p><strong>Token exists:</strong> {localStorage.getItem('token') ? 'Yes' : 'No'}</p>
                <p><strong>Token length:</strong> {localStorage.getItem('token')?.length || 0}</p>
                <p><strong>LocalStorage keys:</strong> {Object.keys(localStorage).join(', ')}</p>
                <p><strong>Current URL:</strong> {window.location.href}</p>
              </div>
            </details>
          )}
          
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            <button onClick={fetchBillingData} className="btn btn-primary">
              <FaRedo /> Try Again
            </button>
            <button 
              onClick={() => {
                localStorage.clear();
                window.location.href = '/login';
              }} 
              className="btn btn-secondary"
            >
              <FaSignOutAlt /> Clear Session & Login
            </button>
            <button 
              onClick={() => window.location.reload()} 
              className="btn btn-outline"
            >
              <FaSync /> Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  const unpaidBalance = billingData?.totalAmountDue || 0;
  const totalPaid = billingData?.totalAmountPaid || 0;
  
  // Calculate overdue payments and amount dynamically based on current date
  const currentDate = new Date();
  const overduePaymentsData = (billingData?.payments || []).filter(payment => {
    const dueDate = new Date(payment.dueDate);
    return currentDate > dueDate && payment.status !== 'paid';
  });
  
  const overduePayments = overduePaymentsData.length;
  const overdueAmount = overduePaymentsData.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  
  const pendingPayments = (billingData?.payments || []).filter(payment => {
    const dueDate = new Date(payment.dueDate);
    return payment.status === 'pending' && currentDate <= dueDate;
  }).length;

  return (
    <div className="modern-billing-section">
      {/* Header */}
      <div className="billing-header">
        <div className="header-content">
          <h2>Billing Records</h2>
          <p className="header-subtitle">View your delivery charges and payment history</p>
        </div>
      </div>

      {/* Outstanding Balance Alert */}
      {unpaidBalance > 0 && (
        <div className={`balance-alert ${overdueAmount > 0 ? 'alert-danger' : 'alert-warning'}`}>
          <div className="alert-icon">
            {overdueAmount > 0 ? <FaExclamationTriangle /> : <FaInfoCircle />}
          </div>
          <div className="alert-content">
            <h4>{overdueAmount > 0 ? 'Overdue Balance' : 'Pending Balance'}</h4>
            <p>
              {overdueAmount > 0 
                ? `You have ${formatCurrency(overdueAmount)} in overdue payments.`
                : `You have ${formatCurrency(unpaidBalance)} in pending payments.`
              }
            </p>
          </div>
        </div>
      )}

      {/* Billing Cards Grid */}
      <div className="billing-cards-grid">
        {/* Outstanding Balance Card */}
        <div className="billing-card primary-card">
          <div className="card-header">
            <div className="card-icon outstanding">
              <FaExclamationCircle />
            </div>
            <div className="card-title">
              <h3>Outstanding Balance</h3>
              <span className="card-subtitle">Amount due</span>
            </div>
          </div>
          <div className="card-amount">
            <span className="amount">{formatCurrency(unpaidBalance)}</span>
            {unpaidBalance > 0 && (
              <span className="amount-note">
                {pendingPayments + overduePayments} payment{pendingPayments + overduePayments !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Paid This Month Card */}
        <div className="billing-card success-card">
          <div className="card-header">
            <div className="card-icon paid">
              <FaCheckCircle />
            </div>
            <div className="card-title">
              <h3>Paid This Month</h3>
              <span className="card-subtitle">Current period</span>
            </div>
          </div>
          <div className="card-amount">
            <span className="amount">{formatCurrency(totalPaid)}</span>
            <span className="amount-note">
              {billingData?.paidPayments || 0} payment{billingData?.paidPayments !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Overdue Payments Card */}
        <div className="billing-card danger-card">
          <div className="card-header">
            <div className="card-icon overdue">
              <FaClock />
            </div>
            <div className="card-title">
              <h3>Overdue Payments</h3>
              <span className="card-subtitle">Requires attention</span>
            </div>
          </div>
          <div className="card-amount">
            <span className="amount">{overduePayments}</span>
            <span className="amount-note">
              {formatCurrency(overdueAmount)}
            </span>
          </div>
        </div>

        {/* Active Services Card */}
        <div className="billing-card">
          <div className="card-header">
            <div className="card-icon services">
              <FaTruck />
            </div>
            <div className="card-title">
              <h3>Active Services</h3>
              <span className="card-subtitle">Current deliveries</span>
            </div>
          </div>
          <div className="card-amount">
            <span className="amount">{deliveryData.active}</span>
            <span className="amount-note">
              {deliveryData.completed} completed
            </span>
          </div>
        </div>
      </div>

      {/* Detailed Billing Records */}
      <div className="billing-records-section">
        <div className="section-header">
          <h3>Billing Records</h3>
          <p className="section-subtitle">All your delivery charges and payment status</p>
        </div>
        
        {billingData?.payments?.length > 0 ? (
          <div className="billing-table-container">
            <table className="billing-table">
              <thead>
                <tr>
                  <th>Delivery ID</th>
                  <th>Route</th>
                  <th>Delivery Date</th>
                  <th>Due Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {billingData.payments.map((payment, index) => {
                  // Check if current date is past due date
                  const currentDate = new Date();
                  const dueDate = new Date(payment.dueDate);
                  const isOverdueByDate = currentDate > dueDate && payment.status !== 'paid';
                  
                  // Determine actual status (override backend status if overdue by date)
                  const actualStatus = isOverdueByDate ? 'overdue' : payment.status;
                  const isOverdue = actualStatus === 'overdue';
                  const isPaid = actualStatus === 'paid';
                  const isPending = actualStatus === 'pending';
                  
                  return (
                    <tr key={payment.id || index} className={`billing-row ${actualStatus}`}>
                      <td>
                        <div className="delivery-id">
                          <span className="id-text">#{payment.deliveryId}</span>
                          <span className="delivery-status">
                            {payment.metadata?.deliveryStatus || 'pending'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="route-info">
                          <div className="route-from">
                            <FaMapMarkerAlt className="location-icon pickup" />
                            {payment.metadata?.pickupLocation || 'Pickup Location'}
                          </div>
                          <div className="route-to">
                            <FaMapMarkerAlt className="location-icon dropoff" />
                            {payment.metadata?.deliveryAddress || 'Delivery Address'}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="date-info">
                          {formatDate(payment.deliveryDate)}
                        </div>
                      </td>
                      <td>
                        <div className="date-info">
                          {formatDate(payment.dueDate)}
                          {isOverdue && (
                            <span className="overdue-badge">
                              <FaExclamationTriangle /> Overdue
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="amount-info">
                          <span className="amount">{formatCurrency(payment.amount)}</span>
                          {payment.testMode && (
                            <span className="test-badge">TEST</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${actualStatus}`}>
                          {isPaid && <FaCheckCircle />}
                          {isOverdue && <FaExclamationTriangle />}
                          {isPending && <FaClock />}
                          {actualStatus.charAt(0).toUpperCase() + actualStatus.slice(1)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-billing-state">
            <div className="empty-icon">
              <FaFileInvoiceDollar />
            </div>
            <h4>No Billing Records Found</h4>
            <p>You don't have any delivery charges yet. Start by booking a truck delivery.</p>
            <Link to="/client/dashboard?tab=book-truck" className="btn btn-primary">
              <FaTruck /> Book Your First Delivery
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

const ClientProfile = () => {
  const { authUser, logout } = useContext(AuthContext) || { authUser: null, logout: () => {} };
  const history = useHistory();
  const location = useLocation();
  const [clientData, setClientData] = useState(null);
  const [allocatedTrucks, setAllocatedTrucks] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Get active tab from URL query parameters
  const urlParams = new URLSearchParams(location.search);
  const [activeTab, setActiveTab] = useState(urlParams.get('tab') || 'overview');

  // Booking states
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingData, setBookingData] = useState({
    pickupLocation: '',
    pickupCoordinates: null,
    dropoffLocation: '',
    dropoffCoordinates: null,
    weight: '',
    deliveryDate: '',
    deliveryTime: '',
    selectedTrucks: [],
    pickupContactPerson: '',
    pickupContactNumber: '',
    dropoffContactPerson: '',
    dropoffContactNumber: '',
  });
  const [recommendedTrucks, setRecommendedTrucks] = useState([]);
  const [showRoutePreview, setShowRoutePreview] = useState(false);
  const [routeDetails, setRouteDetails] = useState(null);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [selectedDeliveryRoute, setSelectedDeliveryRoute] = useState(null);
  
  // Real-time availability checking states
  const [availableTrucksForDate, setAvailableTrucksForDate] = useState([]);
  const [bookedDatesForTruck, setBookedDatesForTruck] = useState([]);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  
  // State for vehicle rates from staff dashboard
  const [vehicleRates, setVehicleRates] = useState([]);

  // Truck filtering and display states
  const [truckFilters, setTruckFilters] = useState({
    type: 'all',
    status: 'all',
    search: ''
  });
  const [trucksPerPage, setTrucksPerPage] = useState(12);
  const [currentTruckPage, setCurrentTruckPage] = useState(1);

  // Transaction filtering states
  const [transactionSearchQuery, setTransactionSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [filteredDeliveries, setFilteredDeliveries] = useState([]);
  
  // Table pagination and sorting states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [sortField, setSortField] = useState('DeliveryDate');
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' or 'desc'
  
  // View details modal state
  const [showViewDetailsModal, setShowViewDetailsModal] = useState(false);
  const [viewingDelivery, setViewingDelivery] = useState(null);
  
  // Truck details modal state
  const [showTruckDetailsModal, setShowTruckDetailsModal] = useState(false);
  const [viewingTruck, setViewingTruck] = useState(null);

  // Filter deliveries based on search and filters
  useEffect(() => {
    let filtered = [...deliveries];

    // Search filter
    if (transactionSearchQuery) {
      filtered = filtered.filter(delivery => 
        delivery.DeliveryID?.toString().toLowerCase().includes(transactionSearchQuery.toLowerCase()) ||
        delivery.TruckPlate?.toLowerCase().includes(transactionSearchQuery.toLowerCase()) ||
        delivery.TruckBrand?.toLowerCase().includes(transactionSearchQuery.toLowerCase()) ||
        delivery.DriverName?.toLowerCase().includes(transactionSearchQuery.toLowerCase()) ||
        delivery.PickupLocation?.toLowerCase().includes(transactionSearchQuery.toLowerCase()) ||
        delivery.DropoffLocation?.toLowerCase().includes(transactionSearchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(delivery => 
        delivery.DeliveryStatus?.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    // Date filter
    if (dateFilter && dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(delivery => {
        const deliveryDate = new Date(delivery.DeliveryDate);
        
        switch (dateFilter) {
          case 'today':
            return deliveryDate >= today && deliveryDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
          case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            return deliveryDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
            return deliveryDate >= monthAgo;
          case 'year':
            const yearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
            return deliveryDate >= yearAgo;
          default:
            return true;
        }
      });
    }

    setFilteredDeliveries(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [deliveries, transactionSearchQuery, statusFilter, dateFilter]);

  // Edit profile states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    clientName: '',
    clientEmail: '',
    clientNumber: ''
  });
  const [passwordFormData, setPasswordFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Warning modal hook
  const {
    modalState,
    hideModal,
    showWarning,
    showError,
    showSuccess,
    showInfo,
    showConfirm
  } = useWarningModal();

  // Modern toast hook
  const { 
    toasts,
    removeToast,
    showSuccess: showToastSuccess, 
    showError: showToastError, 
    showWarning: showToastWarning, 
    showInfo: showToastInfo, 
    showDeliveryUpdate 
  } = useModernToast();

  // Add state for billing data in the main component
  const [billingData, setBillingData] = useState(null);

  // New delivery management modal states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showChangeRouteModal, setShowChangeRouteModal] = useState(false);
  const [showRebookModal, setShowRebookModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  
  // Change route modal data
  const [changeRouteData, setChangeRouteData] = useState({
    pickupLocation: '',
    pickupCoordinates: null,
    dropoffLocation: '',
    dropoffCoordinates: null,
    newDistance: 0,
    newCost: 0
  });
  
  // Rebook modal data
  const [rebookData, setRebookData] = useState({
    newDate: '',
    newTime: ''
  });

  // Change route map modal states
  const [showChangeRouteMapModal, setShowChangeRouteMapModal] = useState(false);
  const [changeRouteMapType, setChangeRouteMapType] = useState('pickup'); // 'pickup' or 'dropoff'

  // Callback to receive billing data from ModernBillingSection
  const handleBillingDataUpdate = (data) => {
    setBillingData(data);
  };

  // Listen for booking modal events from sidebar
  useEffect(() => {
    const handleOpenBookingModal = () => {
      setShowBookingModal(true);
    };
    
    window.addEventListener('openBookingModal', handleOpenBookingModal);
    
    return () => {
      window.removeEventListener('openBookingModal', handleOpenBookingModal);
    };
  }, []);

  // Clear used locations and availability data when booking modal closes
  useEffect(() => {
    if (!showBookingModal) {
      // Closing booking modal - clear for next time
      enhancedIsolatedMapModal.clearUsedLocations();
      setAvailableTrucksForDate([]);
      setBookedDatesForTruck([]);
      console.log('🔄 Booking modal closed - cleared used locations and availability data');
    }
  }, [showBookingModal]);

  // Check truck availability when modal opens with a pre-filled date
  useEffect(() => {
    if (showBookingModal && bookingData.deliveryDate) {
      console.log('📅 Modal opened with date:', bookingData.deliveryDate);
      checkAvailableTrucksForDate(bookingData.deliveryDate);
    }
  }, [showBookingModal, bookingData.deliveryDate]);

  // Update active tab when URL changes
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const tabFromUrl = urlParams.get('tab') || 'overview';
    setActiveTab(tabFromUrl);
  }, [location.search]);

  // Set default date and time for booking
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const formattedDate = tomorrow.toISOString().split('T')[0];
    const defaultTime = '12:00';
    
    setBookingData(prev => ({
      ...prev,
      deliveryDate: formattedDate,
      deliveryTime: defaultTime
    }));
  }, []);

  // Set up axios with token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, []);

  // Fetch client data function - moved outside useEffect for reusability
    const fetchClientData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch client profile
        try {
          const profileRes = await axios.get('/api/clients/profile');
          setClientData(profileRes.data);
        } catch (profileError) {
          console.error('Error fetching profile:', profileError);
          setError('Failed to load profile data.');
        }
        
        // Fetch allocated trucks
        try {
          console.log('🔄 Fetching allocated trucks...');
          const trucksRes = await axios.get('/api/clients/profile/trucks');
          console.log('🔍 Raw trucks response:', trucksRes.data);
          console.log('🔍 Trucks with status:', trucksRes.data?.map(t => ({ plate: t.TruckPlate, status: t.TruckStatus })));
          setAllocatedTrucks(trucksRes.data || []);
        } catch (trucksError) {
          console.error('Error fetching trucks:', trucksError);
          setAllocatedTrucks([]);
        }
        
        // Fetch deliveries
        try {
          const deliveriesRes = await axios.get('/api/clients/profile/deliveries');
          const deliveriesData = deliveriesRes.data || [];
          setDeliveries(deliveriesData);
        } catch (deliveriesError) {
          console.error('Error fetching deliveries:', deliveriesError);
          setDeliveries([]);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error in fetchClientData:', error);
        setError('Failed to load dashboard data.');
        setIsLoading(false);
      }
    };

  // Helper function to extract city from full address
  const extractCity = (address) => {
    if (!address) return 'N/A';
    
    // Split by comma and clean up
    const parts = address.split(',').map(p => p.trim());
    
    // Common patterns:
    // "503 Quezon Blvd, 302 Quiapo, Manila, 1001 Metro Manila, Philippines"
    // Try to find city - usually before province or "Metro Manila" or "Philippines"
    
    // Look for the part that comes before "Metro Manila" or province
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      // Skip street addresses (contains numbers at start)
      if (/^\d/.test(part)) continue;
      // Skip postal codes
      if (/^\d{4}/.test(part)) continue;
      // Skip provinces and countries
      if (part.toLowerCase().includes('metro manila') || 
          part.toLowerCase().includes('philippines') ||
          part.toLowerCase().includes('bulacan') ||
          part.toLowerCase().includes('cavite') ||
          part.toLowerCase().includes('laguna')) {
        // Return the previous part if it exists
        if (i > 0 && !/^\d/.test(parts[i-1])) {
          return parts[i-1];
        }
        continue;
      }
      // Return first non-address part
      if (!part.toLowerCase().includes('hwy') && 
          !part.toLowerCase().includes('highway') &&
          !part.toLowerCase().includes('road') &&
          !part.toLowerCase().includes('avenue') &&
          !part.toLowerCase().includes('street')) {
        return part;
      }
    }
    
    // Fallback: return second part if available (skip street address)
    return parts.length > 1 ? parts[1] : parts[0];
  };

  // Function to fetch vehicle rates
  const fetchVehicleRates = async () => {
    try {
      console.log('🔄 Fetching vehicle rates...');
      const response = await axios.get('/api/clients/vehicle-rates', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.data.success) {
        console.log('✅ Vehicle rates fetched:', response.data.data);
        setVehicleRates(response.data.data || []);
      }
    } catch (error) {
      console.error('❌ Error fetching vehicle rates:', error);
      // Keep empty array if fetch fails - will use default rates
      setVehicleRates([]);
    }
  };

  // Fetch client data on component mount
  useEffect(() => {
    fetchClientData();
    fetchVehicleRates();
  }, []);

  // Real-time updates - poll for delivery status changes every 30 seconds with modern notifications
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        console.log('🔄 Polling for delivery updates...');
        const deliveriesRes = await axios.get('/api/clients/profile/deliveries');
        const newDeliveries = deliveriesRes.data || [];
        
        // Check if any delivery status has changed
        const hasChanges = newDeliveries.some(newDelivery => {
          const oldDelivery = deliveries.find(d => d.DeliveryID === newDelivery.DeliveryID);
          return oldDelivery && oldDelivery.DeliveryStatus !== newDelivery.DeliveryStatus;
        });
        
        if (hasChanges) {
          console.log('✅ Delivery status changes detected, updating...');
          setDeliveries(newDeliveries);
          
          // Show notification for status changes
          const changedDeliveries = newDeliveries.filter(newDelivery => {
            const oldDelivery = deliveries.find(d => d.DeliveryID === newDelivery.DeliveryID);
            return oldDelivery && oldDelivery.DeliveryStatus !== newDelivery.DeliveryStatus;
          });
          
          changedDeliveries.forEach(delivery => {
            const statusMessage = getStatusMessage(delivery.DeliveryStatus);
            showToastInfo('Delivery Status Updated', `Delivery #${delivery.DeliveryID.substring(0, 8)} is now ${statusMessage}`);
          });
        }
      } catch (error) {
        console.error('Error polling for updates:', error);
      }
    }, 30000); // Poll every 30 seconds
    
    return () => clearInterval(pollInterval);
  }, [deliveries, showToastInfo]); // Re-setup polling when deliveries change
  
  // Helper function to get user-friendly status messages
  const getStatusMessage = (status) => {
    switch (status) {
      case 'pending': return 'pending driver assignment';
      case 'accepted': return 'accepted by driver';
      case 'started': return 'started by driver';
      case 'picked-up': return 'picked up by driver';
      case 'awaiting-confirmation': return 'delivered and awaiting your confirmation';
      case 'completed': return 'completed';
      case 'cancelled': return 'cancelled';
      default: return status;
    }
  };

  // Booking functions
  const handleCapacityChange = async (e) => {
    const capacity = parseFloat(e.target.value);
    setBookingData(prev => ({
      ...prev,
      weight: e.target.value
    }));
    
    if (!isNaN(capacity) && capacity > 0) {
      // Use smart booking algorithm to automatically select optimal trucks
      await handleSmartBooking(capacity);
    } else {
      setRecommendedTrucks([]);
      setBookingData(prev => ({
        ...prev,
        selectedTrucks: []
      }));
    }
  };

  const handleTruckSelection = (truckId) => {
    // Find truck in allocatedTrucks (not just recommended ones)
    const selectedTruck = allocatedTrucks.find(truck => truck.TruckID === truckId);
    
    if (!selectedTruck) {
      console.warn('Truck not found:', truckId);
      return;
    }
    
    // Check availability (though we should only be showing available trucks)
    const operationalStatus = selectedTruck.operationalStatus?.toLowerCase() || selectedTruck.OperationalStatus?.toLowerCase();
    const availabilityStatus = selectedTruck.availabilityStatus?.toLowerCase() || selectedTruck.AvailabilityStatus?.toLowerCase();
    
    const isAvailable = (
      operationalStatus === 'active' && 
      availabilityStatus === 'free'
    );
    
    if (!isAvailable) {
      showWarning('Truck Unavailable', `This truck is not available for booking - Operational: ${operationalStatus}, Availability: ${availabilityStatus}`);
      return;
    }
    
    setBookingData(prev => {
      const currentSelection = [...prev.selectedTrucks];
      
      if (currentSelection.includes(truckId)) {
        return {
          ...prev,
          selectedTrucks: currentSelection.filter(id => id !== truckId)
        };
      } else {
        return {
          ...prev,
          selectedTrucks: [...currentSelection, truckId]
        };
      }
    });
  };

  const openMapModal = (type) => {
    // Get the currently selected location for this type
    const currentLocation = type === 'pickup' ? bookingData.pickupLocation : bookingData.dropoffLocation;
    
    // If there's already a location selected for this type, we need to clear it from used
    // so user can change their mind and select it again or select a different one
    if (currentLocation) {
      console.log(`🔄 Re-opening ${type} picker - clearing used locations to allow reselection`);
      enhancedIsolatedMapModal.clearUsedLocations();
    }
    
    // Get the other selected location to prevent duplicate selection
    const otherSelectedLocation = type === 'pickup' 
      ? { address: bookingData.dropoffLocation, coordinates: bookingData.dropoffCoordinates }
      : { address: bookingData.pickupLocation, coordinates: bookingData.pickupCoordinates };
    
    enhancedIsolatedMapModal.init({
      locationType: type,
      initialAddress: type === 'pickup' ? bookingData.pickupLocation : bookingData.dropoffLocation,
      title: `Select ${type === 'pickup' ? 'Pickup' : 'Dropoff'} Location`,
      otherSelectedLocation: otherSelectedLocation,
      onSelectCallback: (address, coordinates, locationData) => {
        const updates = {
          [type === 'pickup' ? 'pickupLocation' : 'dropoffLocation']: address,
          [type === 'pickup' ? 'pickupCoordinates' : 'dropoffCoordinates']: coordinates
        };
        
        // Auto-fill contact information if location data is available (saved location selected)
        if (locationData) {
          if (type === 'pickup') {
            // Fill pickup contact fields
            if (locationData.contactPerson) updates.pickupContactPerson = locationData.contactPerson;
            if (locationData.contactNumber) updates.pickupContactNumber = locationData.contactNumber;
          } else {
            // Fill dropoff contact fields
            if (locationData.contactPerson) updates.dropoffContactPerson = locationData.contactPerson;
            if (locationData.contactNumber) updates.dropoffContactNumber = locationData.contactNumber;
          }
          console.log(`✅ Auto-filled ${type} contact info from saved location:`, locationData.contactPerson, locationData.contactNumber);
        } else {
          // Manual location selected - clear the contact fields for this type
          if (type === 'pickup') {
            updates.pickupContactPerson = '';
            updates.pickupContactNumber = '';
          } else {
            updates.dropoffContactPerson = '';
            updates.dropoffContactNumber = '';
          }
          console.log(`🔄 Manual location selected for ${type}, cleared contact fields`);
        }
        
        setBookingData(prev => ({
          ...prev,
          ...updates
        }));
      }
    });
  };

  const toggleRoutePreview = () => {
    if (bookingData.pickupCoordinates && bookingData.dropoffCoordinates) {
      setShowRoutePreview(!showRoutePreview);
    } else {
      showInfo(
        'Route Preview Unavailable',
        'Select both locations on map for route preview, or continue booking with address text only.'
      );
    }
  };

  const handleRouteCalculated = (routeInfo) => {
    setRouteDetails(routeInfo);
    setBookingData(prev => ({
      ...prev,
      deliveryDistance: routeInfo.distanceValue,
      estimatedDuration: routeInfo.durationValue
    }));
  };

  const calculateEstimatedCostPerTruck = () => {
    if (!routeDetails || !bookingData.selectedTrucks.length) return 0;
    
    // Get the first selected truck to determine vehicle type
    const firstTruck = allocatedTrucks.find(truck => 
      bookingData.selectedTrucks.includes(truck.TruckID)
    );
    
    if (!firstTruck) return 0;
    
    // Use vehicle type to estimate cost based on vehicle rate system
    const vehicleType = firstTruck.TruckType || 'mini truck';
    const distance = routeDetails.distanceValue || 0; // in km
    
    // Try to find the rate from staff-configured vehicle rates
    let rate = null;
    if (vehicleRates.length > 0) {
      rate = vehicleRates.find(r => r.vehicleType === vehicleType);
      console.log(`🔍 Looking for rate for ${vehicleType}, found:`, rate);
    }
    
    // Fallback to default rates if no staff-configured rate found
    if (!rate) {
      console.log(`⚠️ No staff rate found for ${vehicleType}, using default rates`);
      const defaultRates = {
        'mini truck': { baseRate: 100, ratePerKm: 15 },
        '4 wheeler': { baseRate: 150, ratePerKm: 20 },
        '6 wheeler': { baseRate: 200, ratePerKm: 25 },
        '8 wheeler': { baseRate: 250, ratePerKm: 30 },
        '10 wheeler': { baseRate: 300, ratePerKm: 35 }
      };
      rate = defaultRates[vehicleType] || defaultRates['mini truck'];
    }
    
    const baseRate = parseFloat(rate.baseRate) || 0;
    const ratePerKm = parseFloat(rate.ratePerKm) || 0;
    const totalCost = baseRate + (distance * ratePerKm);
    
    console.log(`💰 Cost calculation for ${vehicleType}: Base ₱${baseRate} + (${distance}km × ₱${ratePerKm}/km) = ₱${totalCost}`);
    
    return Math.round(totalCost);
  };

  const calculateTotalEstimatedCost = () => {
    const costPerTruck = calculateEstimatedCostPerTruck();
    return Math.round(costPerTruck * bookingData.selectedTrucks.length);
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // REAL-TIME AVAILABILITY CHECKING
  // ═══════════════════════════════════════════════════════════════════════════════

  // Fetch available trucks when date is selected
  const checkAvailableTrucksForDate = async (selectedDate) => {
    if (!selectedDate) {
      setAvailableTrucksForDate([]);
      return;
    }

    try {
      setIsCheckingAvailability(true);
      console.log(`🔍 Checking available trucks for date: ${selectedDate}`);

      const response = await axios.get(`/api/clients/availability/trucks-for-date/${selectedDate}`);
      
      if (response.data.success) {
        const availableTruckIds = response.data.availableTrucks.map(t => t.id);
        setAvailableTrucksForDate(availableTruckIds);
        
        console.log(`✅ ${response.data.totalAvailable}/${response.data.totalAllocated} trucks available on ${selectedDate}`);
        console.log(`❌ ${response.data.totalBooked} trucks booked:`, response.data.bookedTruckIds);
        
        // Auto-remove booked trucks from selection
        setBookingData(prev => ({
          ...prev,
          selectedTrucks: prev.selectedTrucks.filter(truckId => availableTruckIds.includes(truckId))
        }));
      }
    } catch (error) {
      console.error('❌ Error checking truck availability:', error);
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  // Fetch booked dates when truck is selected
  const checkBookedDatesForTruck = async (truckId) => {
    if (!truckId) {
      setBookedDatesForTruck([]);
      return;
    }

    try {
      console.log(`🔍 Checking booked dates for truck: ${truckId}`);

      const response = await axios.get(`/api/clients/availability/dates-for-truck/${truckId}`);
      
      if (response.data.success) {
        setBookedDatesForTruck(response.data.bookedDateStrings);
        console.log(`📅 Truck ${truckId} has ${response.data.totalBooked} booked dates:`, response.data.bookedDateStrings);
      }
    } catch (error) {
      console.error('❌ Error checking truck booked dates:', error);
    }
  };

  // Handle date change with availability checking
  const handleDateChange = (e) => {
    const newDate = e.target.value;
    
    // Check if selected date is booked for any selected truck
    if (newDate && bookedDatesForTruck.length > 0 && bookedDatesForTruck.includes(newDate)) {
      showWarning(
        'Date Not Available',
        'The selected date is already booked for one of your selected trucks. Please choose a different date.'
      );
      return; // Don't update the date
    }
    
    setBookingData(prev => ({...prev, deliveryDate: newDate}));
    
    // Check available trucks for this date
    if (newDate) {
      checkAvailableTrucksForDate(newDate);
    } else {
      setAvailableTrucksForDate([]);
    }
  };

  // Handle truck selection with booked dates checking
  const handleTruckSelectionWithAvailability = (truckId) => {
    // First check if truck is currently selected
    const isCurrentlySelected = bookingData.selectedTrucks.includes(truckId);
    
    // Call existing truck selection logic
    handleTruckSelection(truckId);
    
    // Check booked dates for this truck
    if (!isCurrentlySelected) {
      // Truck is being selected, check its booked dates
      checkBookedDatesForTruck(truckId);
    } else {
      // Truck is being deselected
      if (bookingData.selectedTrucks.length === 1) {
        // This was the last truck, clear booked dates
        setBookedDatesForTruck([]);
      }
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    
    console.log('🚀 Starting booking submission...');
    
    try {
      if (!bookingData.pickupLocation || !bookingData.dropoffLocation || 
          !bookingData.weight || !bookingData.deliveryDate || 
          !bookingData.deliveryTime || !bookingData.pickupContactNumber || 
          !bookingData.dropoffContactNumber) {
        
        const missingFields = [];
        if (!bookingData.pickupLocation) missingFields.push('Pickup Location');
        if (!bookingData.dropoffLocation) missingFields.push('Dropoff Location');
        if (!bookingData.weight) missingFields.push('Cargo Weight');
        if (!bookingData.deliveryDate) missingFields.push('Delivery Date');
        if (!bookingData.deliveryTime) missingFields.push('Delivery Time');
        if (!bookingData.pickupContactNumber) missingFields.push('Pickup Contact Number');
        if (!bookingData.dropoffContactNumber) missingFields.push('Dropoff Contact Number');
        
        console.log('❌ Missing required fields:', missingFields);
        showWarning(
          'Missing Required Fields',
          `Please fill in the following required fields:\n\n${missingFields.join('\n')}`
        );
        return;
      }
      
      if (bookingData.selectedTrucks.length === 0) {
        console.log('❌ No trucks selected');
        showWarning(
          'No Trucks Selected',
          'Please select at least one truck for the delivery'
        );
        return;
      }
      
      console.log('📋 Booking data:', bookingData);
      
      // Double-check truck availability before submission
      const unavailableTrucks = [];
      for (const truckId of bookingData.selectedTrucks) {
        const selectedTruck = allocatedTrucks.find(truck => truck.TruckID === truckId);
        
        if (!selectedTruck) {
          unavailableTrucks.push(`Truck ${truckId} not found`);
          continue;
        }
        
        // SIMPLIFIED availability check - Only check Operational and Availability status
        const operationalStatus = selectedTruck.operationalStatus?.toLowerCase() || selectedTruck.OperationalStatus?.toLowerCase();
        const availabilityStatus = selectedTruck.availabilityStatus?.toLowerCase() || selectedTruck.AvailabilityStatus?.toLowerCase();
        
        const isAvailable = (
          operationalStatus === 'active' && 
          availabilityStatus === 'free'
        );
        
        if (!isAvailable) {
          unavailableTrucks.push(`${selectedTruck.TruckPlate} - Operational: ${operationalStatus}, Availability: ${availabilityStatus}`);
        }
      }
      
      if (unavailableTrucks.length > 0) {
        console.log('❌ Some trucks unavailable:', unavailableTrucks);
        const unavailableMessage = `Some trucks are not available:\n${unavailableTrucks.join('\n')}\n\nPlease select different trucks.`;
        
        showWarning('Trucks Unavailable', unavailableMessage, {
          onConfirm: () => {
            // Reset selection and re-calculate recommended trucks
            setBookingData(prev => ({
              ...prev,
              selectedTrucks: []
            }));
            
            handleSmartBooking(parseFloat(bookingData.weight));
          }
        });
        return;
      }
      
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('❌ No authentication token');
        showError(
          'Authentication Error',
          'Authentication token missing. Please login again.'
        );
        return;
      }
      
      const defaultPickupCoordinates = bookingData.pickupCoordinates || { lat: 14.5995, lng: 120.9842 };
      const defaultDropoffCoordinates = bookingData.dropoffCoordinates || { lat: 14.6091, lng: 121.0223 };
      
      const bookingRequestData = {
        pickupLocation: bookingData.pickupLocation,
        dropoffLocation: bookingData.dropoffLocation,
        pickupCoordinates: defaultPickupCoordinates,
        dropoffCoordinates: defaultDropoffCoordinates,
        weight: bookingData.weight,
        deliveryDate: bookingData.deliveryDate,
        deliveryTime: bookingData.deliveryTime,
        selectedTrucks: bookingData.selectedTrucks, // Send array for multiple trucks
        deliveryDistance: bookingData.deliveryDistance || 0,
        estimatedDuration: bookingData.estimatedDuration || 0,
        pickupContactPerson: bookingData.pickupContactPerson,
        pickupContactNumber: bookingData.pickupContactNumber,
        dropoffContactPerson: bookingData.dropoffContactPerson,
        dropoffContactNumber: bookingData.dropoffContactNumber
      };
      
      console.log('📤 Sending booking request:', bookingRequestData);
      
      setIsLoading(true);
      try {
        console.log('📤 Submitting booking request...');
        const response = await axios.post('/api/clients/truck-rental', bookingRequestData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('✅ Booking response:', response.data);
        
        if (response.data.success) {
          const totalBookings = response.data.createdDeliveries?.length || bookingData.selectedTrucks.length;
          
          showToastSuccess(
            '✅ Booking Successful!',
            `${totalBookings} delivery${totalBookings !== 1 ? 'ies' : 'y'} scheduled successfully.`
          );
          
          // Clear used locations to allow reuse
          enhancedIsolatedMapModal.clearUsedLocations();
          
          // Close modal and refresh data
          setShowBookingModal(false);
          setBookingData({
            pickupLocation: '',
            pickupCoordinates: null,
            dropoffLocation: '',
            dropoffCoordinates: null,
            weight: '',
            deliveryDate: '',
            deliveryTime: '',
            selectedTrucks: [],
            pickupContactPerson: '',
            pickupContactNumber: '',
            dropoffContactPerson: '',
            dropoffContactNumber: '',
          });
          
          // Refresh data
          fetchClientData();
        } else {
          throw new Error(response.data.message || 'Booking failed');
        }
      } catch (error) {
        console.error('❌ Booking failed:', error);
        console.error('❌ Error response data:', error.response?.data);
        console.error('❌ Error status:', error.response?.status);
        
        let errorTitle = 'Booking Failed';
        let errorMessage = 'Unknown error occurred';
        
        if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
          console.error('❌ Backend error message:', errorMessage);
          
          // Log failed bookings details for debugging
          if (error.response.data.failedBookings) {
            console.error('❌ Failed bookings details:', error.response.data.failedBookings);
            error.response.data.failedBookings.forEach(fb => {
              console.error(`   - Truck ${fb.truckId}: ${fb.reason}`);
            });
          }
          
          // Log common issues if available
          if (error.response.data.debug?.commonIssues) {
            console.error('❌ Common issues:', error.response.data.debug.commonIssues);
          }
          
          // Handle specific allocation-related errors
          if (errorMessage.includes('allocated to another client')) {
            errorTitle = 'Truck Not Available';
            errorMessage = `${errorMessage}\n\nThis truck is not currently allocated to your account. Please:\n1. Contact your account manager to reallocate this truck\n2. Select a different truck from your allocated trucks`;
          } else if (errorMessage.includes('not allocated to your account')) {
            errorTitle = 'Truck Not Allocated';
            errorMessage = `${errorMessage}\n\nPlease:\n1. Contact your account manager to allocate this truck to your account\n2. Select a truck from your allocated trucks list`;
          } else if (errorMessage.includes('insufficient capacity') || errorMessage.includes('no trucks available')) {
            errorTitle = 'Insufficient Truck Capacity';
          } else if (errorMessage.includes('quota exceeded') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
            errorTitle = 'Service Temporarily Unavailable';
            errorMessage = 'The service is experiencing high usage. Please try again in a few minutes.';
          }
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        showToastError(errorTitle, errorMessage);
      } finally {
        setIsLoading(false);
      }
    } catch (apiError) {
      console.error('💥 Booking error:', apiError);
      console.error('💥 Error response:', apiError.response?.data);
      console.error('💥 Error status:', apiError.response?.status);
      
      setIsLoading(false);
      let errorMessage = 'Error booking truck rental. Please try again.';
      
      if (apiError.response?.status === 403) {
        errorMessage = 'Some trucks are not available for booking. Please select different trucks.';
        setBookingData(prev => ({ ...prev, selectedTrucks: [] }));
        handleSmartBooking(parseFloat(bookingData.weight));
      } else if (apiError.response?.data) {
        const errorData = apiError.response.data;
        errorMessage = errorData.message || 'Unknown error occurred';
        
        // Show detailed debug info if available
        if (errorData.debug) {
          console.log('🔍 Debug info:', errorData.debug);
          errorMessage += `\n\nDebug Info:`;
          errorMessage += `\n• Requested trucks: ${errorData.debug.requestedTrucks}`;
          errorMessage += `\n• Available drivers: ${errorData.debug.availableDrivers}`;
          errorMessage += `\n• Available helpers: ${errorData.debug.availableHelpers}`;
          
          if (errorData.failedBookings && errorData.failedBookings.length > 0) {
            errorMessage += `\n\nFailed trucks:`;
            errorData.failedBookings.forEach(failure => {
              errorMessage += `\n• ${failure.truckId}: ${failure.reason}`;
            });
          }
        }
        
        // Handle legacy driver shortage error
        if (errorData.error === 'INSUFFICIENT_DRIVERS') {
          const { required, available, shortage } = errorData;
          errorMessage = `⚠️ Driver Shortage Alert!\n\n` +
                        `Cannot proceed with booking - all drivers are deployed.\n\n` +
                        `• Required drivers: ${required}\n` +
                        `• Available drivers: ${available}\n` +
                        `• Shortage: ${shortage} driver${shortage !== 1 ? 's' : ''}\n\n` +
                        `Please try booking fewer trucks or wait for drivers to become available.`;
          
          // Reset truck selection and weight to allow user to try again
          setBookingData(prev => ({ 
            ...prev, 
            selectedTrucks: [],
            weight: '' 
          }));
          setRecommendedTrucks([]);
        }
      } else if (apiError.response?.data?.error === 'INSUFFICIENT_HELPERS') {
        const { required, available, shortage } = apiError.response.data;
        errorMessage = `⚠️ Helper Shortage Alert!\n\n` +
                      `Cannot proceed with booking - all helpers are deployed.\n\n` +
                      `• Required helpers: ${required}\n` +
                      `• Available helpers: ${available}\n` +
                      `• Shortage: ${shortage} helper${shortage !== 1 ? 's' : ''}\n\n` +
                      `Please try booking fewer trucks or wait for helpers to become available.`;
        
        // Reset truck selection and weight to allow user to try again
        setBookingData(prev => ({ 
          ...prev, 
          selectedTrucks: [],
          weight: '' 
        }));
        setRecommendedTrucks([]);
      } else if (apiError.response?.data?.message) {
        errorMessage = apiError.response.data.message;
      }
      
      showError('Booking Failed', errorMessage, { size: 'large' });
    }
  };

  const handleLogout = () => {
    logout();
    history.push('/login');
  };

  // Edit profile functions
  const handleEditProfile = () => {
    setEditFormData({
      clientName: clientData?.ClientName || '',
      clientEmail: clientData?.ClientEmail || '',
      clientNumber: clientData?.ClientNumber || ''
    });
    setShowEditModal(true);
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      const response = await axios.put('/api/clients/profile', editFormData);
      
      if (response.data.client) {
        setClientData(response.data.client);
        showToastSuccess('Profile Updated', 'Your profile has been updated successfully');
        setShowEditModal(false);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      showToastError('Update Failed', error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasswordFormChange = (e) => {
    const { name, value } = e.target;
    setPasswordFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
      showToastError('Password Mismatch', 'New password and confirm password do not match');
      return;
    }

    if (passwordFormData.newPassword.length < 6) {
      showToastError('Invalid Password', 'Password must be at least 6 characters long');
      return;
    }

    setIsUpdating(true);

    try {
      await axios.put('/api/clients/profile/password', {
        currentPassword: passwordFormData.currentPassword,
        newPassword: passwordFormData.newPassword
      });
      
      showToastSuccess('Password Changed', 'Your password has been changed successfully');
      setShowPasswordModal(false);
      setPasswordFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error changing password:', error);
      showToastError('Password Change Failed', error.response?.data?.message || 'Failed to change password');
    } finally {
      setIsUpdating(false);
    }
  };

  const calculateTotalSpent = () => {
    return deliveries.reduce((total, delivery) => {
      return total + (delivery.deliveryRate || 750); // ₱750 fallback
    }, 0);
  };

  const getActiveDeliveries = () => {
    return deliveries.filter(d => d.DeliveryStatus === 'pending' || d.DeliveryStatus === 'in-progress');
  };

  const getCompletedDeliveries = () => {
    return deliveries.filter(d => d.DeliveryStatus === 'completed');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const formatDate = (dateString, delivery = null) => {
    // Try the primary date first
    let dateToProcess = dateString;
    
    // If no primary date, try alternative fields from delivery object
    if (!dateToProcess && delivery) {
      const alternativeFields = [
        delivery.DeliveryDate,
        delivery.deliveryDate,
        delivery.created_at,
        delivery.createdAt,
        delivery.scheduledFor,
        delivery.CreatedAt
      ];
      
      for (const field of alternativeFields) {
        if (field) {
          dateToProcess = field;
          break;
        }
      }
    }
    
    // If still no date, return fallback
    if (!dateToProcess) {
      return 'Date N/A';
    }
    
    try {
      let dateToFormat = null;
      
      // Handle Firestore timestamp with seconds
      if (dateToProcess && typeof dateToProcess === 'object' && (dateToProcess.seconds || dateToProcess._seconds)) {
        const seconds = dateToProcess.seconds || dateToProcess._seconds;
        dateToFormat = new Date(seconds * 1000);
      } 
      // Handle Firestore timestamp with toDate method
      else if (dateToProcess && typeof dateToProcess.toDate === 'function') {
        dateToFormat = dateToProcess.toDate();
      }
      // Handle regular Date object
      else if (dateToProcess instanceof Date) {
        dateToFormat = dateToProcess;
      }
      // Handle string dates
      else if (typeof dateToProcess === 'string') {
        const cleanDateString = dateToProcess.trim();
        
        // Skip empty or invalid strings
        if (!cleanDateString || 
            cleanDateString.toLowerCase() === 'null' || 
            cleanDateString.toLowerCase() === 'undefined' ||
            cleanDateString === 'Invalid Date') {
          return 'Date N/A';
        }
        
        // Try parsing the string
        dateToFormat = new Date(cleanDateString);
      }
      // Handle numeric timestamps
      else if (typeof dateToProcess === 'number') {
        if (dateToProcess === 0 || isNaN(dateToProcess)) {
          return 'Date N/A';
        }
        
        // Convert seconds to milliseconds if needed
        if (dateToProcess < 10000000000) {
          dateToFormat = new Date(dateToProcess * 1000);
        } else {
          dateToFormat = new Date(dateToProcess);
        }
      }
      
      // Validate the resulting date
      if (dateToFormat && !isNaN(dateToFormat.getTime())) {
        // Check if date is reasonable (not too far in past/future)
        const now = new Date();
        const yearDiff = Math.abs(now.getFullYear() - dateToFormat.getFullYear());
        
        if (yearDiff > 50) {
          return 'Date N/A';
        }
        
        return dateToFormat.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      } else {
        return 'Date N/A';
      }
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date N/A';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'pending';
      case 'in-progress':
        return 'in-progress';
      case 'awaiting-confirmation':
        return 'awaiting-confirmation';
      case 'delivered': // Handle both old and new delivered statuses
        return 'awaiting-confirmation'; // Treat old "delivered" as awaiting confirmation
      case 'completed':
        return 'completed';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'pending';
    }
  };

  // Function to handle tab changes with URL updates
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    history.push(`/client/profile?tab=${tab}`);
  };

  // Function to view delivery route
  const viewDeliveryRoute = (delivery) => {
    console.log('Viewing route for delivery:', delivery);
    
    // Check if we have route information
    if (delivery.RouteInfo && delivery.RouteInfo.pickupCoordinates && delivery.RouteInfo.dropoffCoordinates) {
      setSelectedDeliveryRoute(delivery.RouteInfo);
      setShowRouteModal(true);
    } else if (delivery.pickupCoordinates && delivery.dropoffCoordinates) {
      // Use lowercase coordinates (correct schema)
      setSelectedDeliveryRoute({
        pickupLocation: delivery.PickupLocation,
        dropoffLocation: delivery.DropoffLocation,
        pickupCoordinates: delivery.pickupCoordinates,
        dropoffCoordinates: delivery.dropoffCoordinates,
        distance: delivery.DeliveryDistance,
        duration: delivery.EstimatedDuration
      });
      setShowRouteModal(true);
    } else if (delivery.PickupCoordinates && delivery.DropoffCoordinates) {
      // Fallback to uppercase coordinates for old records
      setSelectedDeliveryRoute({
        pickupLocation: delivery.PickupLocation,
        dropoffLocation: delivery.DropoffLocation,
        pickupCoordinates: delivery.PickupCoordinates,
        dropoffCoordinates: delivery.DropoffCoordinates,
        distance: delivery.DeliveryDistance,
        duration: delivery.EstimatedDuration
      });
      setShowRouteModal(true);
    } else {
      showInfo('Route Unavailable', 'Route information not available for this delivery');
    }
  };

  // Enhanced function to find the most efficient truck combination for cargo weight
  const findBestTruckCombination = (availableTrucks, targetWeight) => {
    console.log(`🔍 Finding most efficient truck combination for ${targetWeight} tons`);
    console.log('Available trucks:', availableTrucks.map(t => `${t.TruckPlate}: ${t.TruckCapacity}t`));
    
    if (!availableTrucks || availableTrucks.length === 0) {
      console.log('❌ No trucks available');
      return [];
    }
    
    // Sort trucks by capacity for analysis
    const sortedTrucks = [...availableTrucks].sort((a, b) => {
      const capacityA = parseFloat(a.TruckCapacity) || 0;
      const capacityB = parseFloat(b.TruckCapacity) || 0;
      return capacityA - capacityB; // Smallest first for efficiency analysis
    });
    
    console.log('Available trucks by capacity:', sortedTrucks.map(t => `${t.TruckPlate}: ${t.TruckCapacity}t`));
    
    // Strategy 1: Find the most efficient single truck (closest capacity match)
    let bestSingleTruck = null;
    let smallestWaste = Infinity;
    
    for (const truck of sortedTrucks) {
      const capacity = parseFloat(truck.TruckCapacity) || 0;
      if (capacity >= targetWeight) {
        const waste = capacity - targetWeight;
        if (waste < smallestWaste) {
          smallestWaste = waste;
          bestSingleTruck = truck;
        }
      }
    }
    
    if (bestSingleTruck) {
      const efficiency = ((targetWeight / parseFloat(bestSingleTruck.TruckCapacity)) * 100).toFixed(1);
      console.log(`✅ Most efficient single truck: ${bestSingleTruck.TruckPlate} (${bestSingleTruck.TruckCapacity}t capacity, ${efficiency}% efficiency)`);
      return [bestSingleTruck];
    }
    
    console.log('🔄 No single truck can handle the cargo, finding optimal combination...');
    
    // Strategy 2: Find the most efficient combination using a smart approach
    const findOptimalCombination = () => {
      let bestCombination = [];
      let bestEfficiency = 0;
      let bestWaste = Infinity;
      
      // Try all possible combinations (for small sets) or use heuristic for larger sets
      const maxCombinations = Math.min(Math.pow(2, sortedTrucks.length), 1000); // Limit for performance
      
      for (let i = 1; i < maxCombinations; i++) {
        const combination = [];
        let totalCapacity = 0;
        
        for (let j = 0; j < sortedTrucks.length; j++) {
          if (i & (1 << j)) {
            combination.push(sortedTrucks[j]);
            totalCapacity += parseFloat(sortedTrucks[j].TruckCapacity) || 0;
          }
        }
        
        if (totalCapacity >= targetWeight) {
          const efficiency = (targetWeight / totalCapacity) * 100;
          const waste = totalCapacity - targetWeight;
          
          // Prefer combinations with:
          // 1. Fewer trucks
          // 2. Higher efficiency (less waste)
          // 3. Smaller total capacity (if efficiency is similar)
          const isBetter = bestCombination.length === 0 ||
                          combination.length < bestCombination.length ||
                          (combination.length === bestCombination.length && efficiency > bestEfficiency) ||
                          (combination.length === bestCombination.length && efficiency === bestEfficiency && waste < bestWaste);
          
          if (isBetter) {
            bestCombination = combination;
            bestEfficiency = efficiency;
            bestWaste = waste;
          }
        }
      }
      
      return bestCombination;
    };
    
    // For larger truck sets, use a greedy heuristic approach
    const findGreedyOptimal = () => {
      // Sort trucks by efficiency for the target weight
      const trucksWithEfficiency = sortedTrucks.map(truck => {
        const capacity = parseFloat(truck.TruckCapacity) || 0;
        let efficiency = 0;
        
        if (capacity <= targetWeight) {
          efficiency = capacity / targetWeight; // How much of the target this truck can handle
        } else {
          efficiency = targetWeight / capacity; // Efficiency if used alone
        }
        
        return { truck, capacity, efficiency };
      }).sort((a, b) => b.efficiency - a.efficiency);
      
      console.log('Trucks sorted by efficiency:', trucksWithEfficiency.map(t => `${t.truck.TruckPlate}: ${t.capacity}t (${(t.efficiency * 100).toFixed(1)}%)`));
      
      const selectedTrucks = [];
      let remainingWeight = targetWeight;
      
      for (const { truck, capacity } of trucksWithEfficiency) {
        if (remainingWeight <= 0) break;
        
        // Add truck if it helps and doesn't create too much waste
        if (capacity > 0) {
          const wouldRemain = remainingWeight - capacity;
          
          // Add if it fits perfectly, reduces remaining weight significantly, or is the last needed
          if (wouldRemain >= -1 || capacity >= remainingWeight * 0.5) {
            selectedTrucks.push(truck);
            remainingWeight -= capacity;
            console.log(`➕ Added efficient truck: ${truck.TruckPlate} (${capacity}t), remaining: ${remainingWeight.toFixed(1)}t`);
          }
        }
      }
      
      return selectedTrucks;
    };
    
    // Choose approach based on number of trucks
    let optimalTrucks;
    if (sortedTrucks.length <= 10) {
      optimalTrucks = findOptimalCombination();
    } else {
      optimalTrucks = findGreedyOptimal();
    }
    
    // Validate the solution
    if (optimalTrucks.length > 0) {
      const totalCapacity = optimalTrucks.reduce((sum, truck) => sum + (parseFloat(truck.TruckCapacity) || 0), 0);
      
      if (totalCapacity >= targetWeight) {
        const efficiency = ((targetWeight / totalCapacity) * 100).toFixed(1);
        const waste = (totalCapacity - targetWeight).toFixed(1);
        
        console.log(`✅ Optimal solution found:`);
        console.log(`   Trucks: ${optimalTrucks.length}`);
        console.log(`   Total capacity: ${totalCapacity}t`);
        console.log(`   Cargo weight: ${targetWeight}t`);
        console.log(`   Efficiency: ${efficiency}%`);
        console.log(`   Waste: ${waste}t`);
        console.log(`   Combination: ${optimalTrucks.map(t => `${t.TruckPlate}(${t.TruckCapacity}t)`).join(', ')}`);
        
        return optimalTrucks;
      } else {
        console.log(`❌ Insufficient capacity: ${totalCapacity}t < ${targetWeight}t`);
        return [];
      }
    }
    
    // No suitable combination found
    console.log('❌ No suitable truck combination found');
    return [];
  };

  // Function to check staff availability
  const checkStaffAvailability = async (requiredTrucks) => {
    // Staff availability is validated during the actual booking process on the backend
    // No need for preemptive check - just return success
    return { sufficient: true, message: 'Staff availability checked during booking' };
  };

  // Function to handle smart booking
  const handleSmartBooking = async (cargoWeight) => {
    console.log(`🚀 Smart booking triggered for ${cargoWeight} tons`);
    
    if (!cargoWeight || cargoWeight <= 0) {
      console.log('❌ Invalid cargo weight');
      setRecommendedTrucks([]);
      return;
    }
    
    // Filter available trucks - allow trucks with active deliveries on different dates
    let availableTrucks = allocatedTrucks.filter(truck => {
      // Only exclude trucks under maintenance or broken
      const operationalStatus = truck.operationalStatus?.toLowerCase() || truck.OperationalStatus?.toLowerCase();
      
      if (operationalStatus === 'maintenance' || operationalStatus === 'broken') {
        console.log(`❌ Truck ${truck.TruckPlate} is ${operationalStatus}`);
        return false;
      }
      
      // Check date-specific availability if date is selected
      if (bookingData.deliveryDate) {
        const hasDateConflict = deliveries.some(delivery => {
          if ((delivery.TruckID || delivery.truckId) !== truck.TruckID) return false;
          
          const deliveryStatus = (delivery.DeliveryStatus || delivery.deliveryStatus || '').toLowerCase();
          if (!['pending', 'in-progress', 'started', 'picked-up'].includes(deliveryStatus)) return false;
          
          // Extract delivery date
          let deliveryDateStr = delivery.deliveryDateString;
          if (!deliveryDateStr && delivery.DeliveryDate) {
            if (delivery.DeliveryDate.seconds) {
              deliveryDateStr = new Date(delivery.DeliveryDate.seconds * 1000).toISOString().split('T')[0];
            } else {
              deliveryDateStr = new Date(delivery.DeliveryDate).toISOString().split('T')[0];
            }
          }
          
          const selectedDateStr = new Date(bookingData.deliveryDate).toISOString().split('T')[0];
          return deliveryDateStr === selectedDateStr;
        });
        
        if (hasDateConflict) {
          console.log(`❌ Truck ${truck.TruckPlate} is booked on ${bookingData.deliveryDate}`);
          return false;
        }
      }
      
      console.log(`✅ Truck ${truck.TruckPlate} is available for booking`);
      return true;
    });
    
    console.log(`📋 Available trucks for booking: ${availableTrucks.length}/${allocatedTrucks.length}`);
    
    if (availableTrucks.length === 0) {
      console.log('❌ No trucks available for booking');
      setRecommendedTrucks([]);
      showWarning(
        'No Available Trucks',
        'No trucks are currently available for booking. Please wait for trucks to become available or contact support.'
      );
      return;
    }
    
    // Calculate total capacity of all available trucks
    const totalAvailableCapacity = availableTrucks.reduce((sum, truck) => {
      return sum + (parseFloat(truck.TruckCapacity) || 0);
    }, 0);
    
    console.log(`📊 Total available capacity: ${totalAvailableCapacity} tons vs cargo weight: ${cargoWeight} tons`);
    
    // Check if total capacity is insufficient
    if (totalAvailableCapacity < cargoWeight) {
      console.log(`❌ Insufficient total capacity: ${totalAvailableCapacity}t < ${cargoWeight}t`);
      
      // Calculate how many more trucks are needed
      const shortfall = cargoWeight - totalAvailableCapacity;
      const averageTruckCapacity = allocatedTrucks.length > 0 
        ? allocatedTrucks.reduce((sum, truck) => sum + (parseFloat(truck.TruckCapacity) || 0), 0) / allocatedTrucks.length
        : 5; // Default assumption of 5 tons per truck
      
      const estimatedAdditionalTrucks = Math.ceil(shortfall / averageTruckCapacity);
      
      // Show detailed warning message
      let warningMessage = `⚠️ INSUFFICIENT TRUCK CAPACITY\n\n`;
      warningMessage += `📦 Your cargo weight: ${cargoWeight} tons\n`;
      warningMessage += `🚛 Available truck capacity: ${totalAvailableCapacity} tons\n`;
      warningMessage += `📉 Shortfall: ${shortfall.toFixed(1)} tons\n\n`;
      warningMessage += `SOLUTIONS:\n`;
      warningMessage += `1. 📞 Contact admin to allocate approximately ${estimatedAdditionalTrucks} more truck${estimatedAdditionalTrucks !== 1 ? 's' : ''}\n`;
      warningMessage += `2. ⏳ Wait for other trucks to complete their deliveries\n`;
      warningMessage += `3. 📦 Split your cargo into smaller shipments\n\n`;
      
      // Show currently available trucks for reference
      warningMessage += `Currently available trucks:\n`;
      availableTrucks.forEach((truck, index) => {
        warningMessage += `• ${truck.TruckPlate}: ${truck.TruckCapacity} tons\n`;
      });
      
      // Show trucks that are currently in use
      const trucksInUse = allocatedTrucks.filter(truck => {
        const isInUse = deliveries.some(
          delivery => delivery.TruckID === truck.TruckID && 
          (delivery.DeliveryStatus === 'pending' || delivery.DeliveryStatus === 'in-progress')
        );
        return isInUse;
      });
      
      if (trucksInUse.length > 0) {
        warningMessage += `\nTrucks currently in use:\n`;
        trucksInUse.forEach((truck, index) => {
          warningMessage += `• ${truck.TruckPlate}: ${truck.TruckCapacity} tons (in delivery)\n`;
        });
      }
      
      showWarning('Insufficient Truck Capacity', warningMessage, { size: 'large' });
      setRecommendedTrucks([]);
      return;
    }
    
    // Find optimal truck combination
    const optimalTrucks = findBestTruckCombination(availableTrucks, cargoWeight);
    
    if (optimalTrucks.length > 0) {
      console.log(`✅ Recommended ${optimalTrucks.length} trucks for ${cargoWeight} tons`);
      
      // Check staff availability for the recommended trucks
      const staffCheck = await checkStaffAvailability(optimalTrucks.length);
      
      setRecommendedTrucks(optimalTrucks);
      
      // Auto-select the recommended trucks
      const truckIds = optimalTrucks.map(truck => truck.TruckID);
      setBookingData(prev => ({
        ...prev,
        selectedTrucks: truckIds
      }));
      
      console.log('🎯 Auto-selected trucks:', truckIds);
      
      // Show warning if staff might be insufficient
      if (!staffCheck.sufficient && staffCheck.message !== 'Will check during booking') {
        showWarning(
          'Staff Availability Warning',
          `${staffCheck.message}\n\nYou can still proceed, but the booking may fail if there aren't enough available drivers or helpers.`
        );
      }
    } else {
      console.log('❌ No suitable truck combination found');
      setRecommendedTrucks([]);
      showWarning(
        'No Suitable Combination',
        'Unable to find a suitable truck combination. Please try a different cargo weight or contact support.'
      );
    }
  };

  // Booking Modal Component
  const renderBookingModal = () => {
    if (!showBookingModal) return null;
    
    return (
      <Modal
        title="Book Truck Rental"
        onClose={() => setShowBookingModal(false)}
        size="large"
      >
        <form onSubmit={handleBookingSubmit}>
          <div className="form-group">
            <label htmlFor="weight">Cargo Weight (tons)</label>
            <div className="input-group">
              <input
                type="number"
                id="weight"
                name="weight"
                value={bookingData.weight}
                onChange={handleCapacityChange}
                className="form-control"
                required
                min="0.1"
                step="0.1"
                placeholder="Enter cargo weight in tons"
              />
              <div className="input-group-append">
                <button 
                  type="button" 
                  className="btn btn-success"
                  onClick={async () => {
                    const weight = parseFloat(bookingData.weight);
                    if (weight && weight > 0) {
                      console.log(`🚀 Smart booking triggered for ${weight} tons`);
                      await handleSmartBooking(weight);
                    } else {
                      showWarning('Invalid Input', 'Please enter a valid cargo weight first');
                    }
                  }}
                  disabled={!bookingData.weight || parseFloat(bookingData.weight) <= 0}
                >
                  🚀 Smart Book
                </button>
              </div>
            </div>
            <small className="form-text text-muted">
              Enter cargo weight and click "Smart Book" to automatically find the optimal truck combination
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="pickupLocation">
              <FaMapMarkerAlt /> Pickup Location
            </label>
            <div className="input-group">
              <input
                type="text"
                id="pickupLocation"
                name="pickupLocation"
                value={bookingData.pickupLocation}
                onChange={(e) => setBookingData(prev => ({...prev, pickupLocation: e.target.value}))}
                className="form-control"
                required
                placeholder="Enter pickup address"
              />
              <div className="input-group-append">
                <button 
                  type="button" 
                  className="btn btn-outline-secondary"
                  onClick={() => openMapModal('pickup')}
                >
                  <FaSearch /> Map
                </button>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="dropoffLocation">
              <FaMapMarkerAlt /> Drop-off Location
            </label>
            <div className="input-group">
              <input
                type="text"
                id="dropoffLocation"
                name="dropoffLocation"
                value={bookingData.dropoffLocation}
                onChange={(e) => setBookingData(prev => ({...prev, dropoffLocation: e.target.value}))}
                className="form-control"
                required
                placeholder="Enter delivery address"
              />
              <div className="input-group-append">
                <button 
                  type="button" 
                  className="btn btn-outline-secondary"
                  onClick={() => openMapModal('dropoff')}
                >
                  <FaSearch /> Map
                </button>
              </div>
            </div>
          </div>
          
          <div className="form-group">
            <button 
              type="button" 
              className="btn btn-outline-primary"
              onClick={toggleRoutePreview}
              disabled={!bookingData.pickupCoordinates || !bookingData.dropoffCoordinates}
            >
              <FaRoute className="me-2" /> {showRoutePreview ? 'Hide Route Preview' : 'Show Route Preview'}
            </button>
          </div>
          
          {/* Automatically show route info when both coordinates are available */}
          {(bookingData.pickupCoordinates && bookingData.dropoffCoordinates) && (
            <div className="route-info-container">
              <div className="route-info-header">
                <h4>
                  🚛 Delivery Route Information (Philippines Only)
                </h4>
              </div>
              
              {/* Always show RouteMap when coordinates are available for calculation */}
              <div style={{ display: 'none' }}>
                <RouteMap 
                  pickupCoordinates={bookingData.pickupCoordinates}
                  dropoffCoordinates={bookingData.dropoffCoordinates}
                  pickupAddress={bookingData.pickupLocation}
                  dropoffAddress={bookingData.dropoffLocation}
                  onRouteCalculated={handleRouteCalculated}
                />
              </div>
              
              {routeDetails && (
                <div className="route-summary-card">
                  <div className="route-summary-item">
                    <div className="route-summary-icon">📏</div>
                    <div className="route-summary-content">
                      <div className="route-summary-label">Distance</div>
                      <div className="route-summary-value">{routeDetails.distanceText}</div>
                    </div>
                  </div>
                  
                  <div className="route-summary-item">
                    <div className="route-summary-icon">⏱️</div>
                    <div className="route-summary-content">
                      <div className="route-summary-label">Travel Time</div>
                      <div className="route-summary-value">{routeDetails.durationText}</div>
                    </div>
                  </div>
                  
                  {routeDetails.averageSpeed && (
                    <div className="route-summary-item">
                      <div className="route-summary-icon">🚗</div>
                      <div className="route-summary-content">
                        <div className="route-summary-label">Avg Speed</div>
                        <div className="route-summary-value">{routeDetails.averageSpeed} km/h</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {routeDetails && routeDetails.isShortestRoute && (
                <div className="shortest-route-badge">
                  ✅ Shortest route automatically selected ({routeDetails.totalRoutes} routes analyzed)
                </div>
              )}
              
              {routeDetails && routeDetails.isEstimate && (
                <div className="estimate-badge">
                  ℹ️ Estimated values based on Philippines road conditions
                </div>
              )}
              
              <div className="form-group">
                <button 
                  type="button" 
                  className="btn btn-outline-primary"
                  onClick={toggleRoutePreview}
                >
                  <FaRoute className="me-2" /> {showRoutePreview ? 'Hide Map Preview' : 'Show Map Preview'}
                </button>
              </div>
            </div>
          )}
          
          {showRoutePreview && (
            <div className="route-preview-container">
              <h4>Delivery Route Map Preview</h4>
              <div className="route-preview-map">
                <RouteMap 
                  pickupCoordinates={bookingData.pickupCoordinates}
                  dropoffCoordinates={bookingData.dropoffCoordinates}
                  pickupAddress={bookingData.pickupLocation}
                  dropoffAddress={bookingData.dropoffLocation}
                  onRouteCalculated={handleRouteCalculated}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="deliveryDate">
              <FaCalendarAlt /> Delivery Date
            </label>
            <input
              type="date"
              id="deliveryDate"
              name="deliveryDate"
              value={bookingData.deliveryDate}
              onChange={handleDateChange}
              className="form-control"
              required
              min={new Date().toISOString().split('T')[0]}
              disabled={isCheckingAvailability}
            />
            {isCheckingAvailability && (
              <small className="text-muted">🔍 Checking truck availability...</small>
            )}
            {bookingData.deliveryDate && availableTrucksForDate.length > 0 && (
              <small className="text-success">✅ {availableTrucksForDate.length} truck(s) available on this date</small>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="deliveryTime">Delivery Time</label>
            <input
              type="time"
              id="deliveryTime"
              name="deliveryTime"
              value={bookingData.deliveryTime}
              onChange={(e) => setBookingData(prev => ({...prev, deliveryTime: e.target.value}))}
              className="form-control"
              required
            />
          </div>

          {/* Contact Information Tip */}
          <div className="alert alert-info" style={{ marginTop: '20px' }}>
            💡 <strong>Tip:</strong> If you select a saved location, contact info will be auto-filled
          </div>

          {/* Pickup Contact Information */}
          <div className="contact-section" style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <h5 style={{ marginBottom: '15px', color: '#2c5282' }}>
              📍 Pickup Contact Information
            </h5>
            
            <div className="form-group">
              <label htmlFor="pickupContactPerson">
                <FaUser /> Contact Person <span style={{ color: '#6c757d', fontSize: '0.9em' }}>(Optional)</span>
              </label>
              <input
                type="text"
                id="pickupContactPerson"
                name="pickupContactPerson"
                value={bookingData.pickupContactPerson || ''}
                onChange={(e) => setBookingData(prev => ({...prev, pickupContactPerson: e.target.value}))}
                className="form-control"
                placeholder="Enter contact person name at pickup location"
              />
              <small className="form-text text-muted">
                Who should we contact at the pickup location?
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="pickupContactNumber">
                <FaPhone /> Contact Number <span style={{ color: '#dc3545' }}>*</span>
              </label>
              <input
                type="tel"
                id="pickupContactNumber"
                name="pickupContactNumber"
                value={bookingData.pickupContactNumber || ''}
                onChange={(e) => setBookingData(prev => ({...prev, pickupContactNumber: e.target.value}))}
                className="form-control"
                required
                placeholder="e.g., 09605877964"
              />
              <small className="form-text text-muted">
                Phone number for pickup coordination
              </small>
            </div>
          </div>

          {/* Dropoff Contact Information */}
          <div className="contact-section" style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <h5 style={{ marginBottom: '15px', color: '#2c5282' }}>
              📍 Dropoff Contact Information
            </h5>
            
            <div className="form-group">
              <label htmlFor="dropoffContactPerson">
                <FaUser /> Contact Person <span style={{ color: '#6c757d', fontSize: '0.9em' }}>(Optional)</span>
              </label>
              <input
                type="text"
                id="dropoffContactPerson"
                name="dropoffContactPerson"
                value={bookingData.dropoffContactPerson || ''}
                onChange={(e) => setBookingData(prev => ({...prev, dropoffContactPerson: e.target.value}))}
                className="form-control"
                placeholder="Enter contact person name at dropoff location"
              />
              <small className="form-text text-muted">
                Who should we contact at the dropoff/delivery location?
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="dropoffContactNumber">
                <FaPhone /> Contact Number <span style={{ color: '#dc3545' }}>*</span>
              </label>
              <input
                type="tel"
                id="dropoffContactNumber"
                name="dropoffContactNumber"
                value={bookingData.dropoffContactNumber || ''}
                onChange={(e) => setBookingData(prev => ({...prev, dropoffContactNumber: e.target.value}))}
                className="form-control"
                required
                placeholder="e.g., 09605877964"
              />
              <small className="form-text text-muted">
                Phone number for dropoff/delivery coordination
                <br />
                💡 <strong>Tip:</strong> If you select a saved location, contact info will be auto-filled
              </small>
            </div>
          </div>

          {/* Price Estimation Section */}
          {bookingData.selectedTrucks.length > 0 && routeDetails && (
            <div className="price-estimation-section">
              <h4>🧮 Estimated Cost</h4>
              <div className="price-breakdown">
                <div className="price-item">
                  <span className="price-label">Distance:</span>
                  <span className="price-value">{routeDetails.distanceText}</span>
                </div>
                <div className="price-item">
                  <span className="price-label">Selected Trucks:</span>
                  <span className="price-value">{bookingData.selectedTrucks.length} truck{bookingData.selectedTrucks.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="price-item">
                  <span className="price-label">Estimated Cost per Truck:</span>
                  <span className="price-value price-highlight">
                    ₱{calculateEstimatedCostPerTruck()}
                  </span>
                </div>
                <div className="price-item">
                  <span className="price-label">Total Estimated Cost:</span>
                  <span className="price-value price-highlight">
                    ₱{calculateTotalEstimatedCost()}
                  </span>
                </div>
                {(() => {
                  if (!routeDetails || !bookingData.selectedTrucks.length) return null;
                  const firstTruck = allocatedTrucks.find(truck => 
                    bookingData.selectedTrucks.includes(truck.TruckID)
                  );
                  if (!firstTruck) return null;
                  
                  const vehicleType = firstTruck.TruckType || 'mini truck';
                  const distance = routeDetails.distanceValue || 0;
                  let rate = vehicleRates.find(r => r.vehicleType === vehicleType);
                  
                  if (rate) {
                    const baseRate = parseFloat(rate.baseRate) || 0;
                    const ratePerKm = parseFloat(rate.ratePerKm) || 0;
                    return (
                      <div className="price-breakdown-detail">
                        <small>
                          {vehicleType}: ₱{baseRate} base + {distance}km × ₱{ratePerKm}/km × {bookingData.selectedTrucks.length} truck{bookingData.selectedTrucks.length !== 1 ? 's' : ''}
                        </small>
                      </div>
                    );
                  }
                  return null;
                })()}
                <div className="price-note">
                  * Final pricing calculated using current vehicle rates set by staff
                </div>
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Select Trucks for Booking</label>
            <p className="form-help-text">
              📋 Only trucks allocated to your account can be booked. Contact your account manager if you need additional trucks.
            </p>
            {bookingData.weight && recommendedTrucks.length > 0 && (
              <div className="alert alert-info" style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#e3f2fd', border: '1px solid #2196f3', borderRadius: '4px' }}>
                ⚙️ <strong>Smart Recommendation:</strong> {recommendedTrucks.length} truck{recommendedTrucks.length !== 1 ? 's' : ''} recommended for {bookingData.weight} tons cargo
              </div>
            )}
            {(() => {
              // Filter trucks - allow trucks with active deliveries as long as dates don't conflict
              console.log(`🔍 UI Filter: Checking ${allocatedTrucks.length} allocated trucks`);
              let availableTrucks = allocatedTrucks.filter(truck => {
                // Only exclude trucks that are under maintenance or broken
                const operationalStatus = truck.operationalStatus?.toLowerCase() || truck.OperationalStatus?.toLowerCase();
                
                if (operationalStatus === 'maintenance' || operationalStatus === 'broken') {
                  console.log(`🚫 Excluding truck ${truck.TruckPlate} - ${operationalStatus}`);
                  return false;
                }
                
                return true; // Show all other trucks
              });
              
              console.log(`✅ After operational filter: ${availableTrucks.length} trucks`);
              
              // REAL-TIME DATE-BASED AVAILABILITY: Filter by selected date
              if (bookingData.deliveryDate && availableTrucksForDate.length > 0) {
                // Only show trucks available on the selected date (from backend API)
                availableTrucks = availableTrucks.filter(truck => 
                  availableTrucksForDate.includes(truck.TruckID)
                );
                console.log(`📅 Date filter applied: ${availableTrucks.length} trucks available on ${bookingData.deliveryDate}`);
              } else if (bookingData.deliveryDate) {
                // If date is selected but API hasn't returned yet, do client-side date checking
                availableTrucks = availableTrucks.filter(truck => {
                  const hasDateConflict = deliveries.some(delivery => {
                    if ((delivery.TruckID || delivery.truckId) !== truck.TruckID) return false;
                    
                    const deliveryStatus = (delivery.DeliveryStatus || delivery.deliveryStatus || '').toLowerCase();
                    if (!['pending', 'in-progress', 'started', 'picked-up'].includes(deliveryStatus)) return false;
                    
                    // Extract delivery date
                    let deliveryDateStr = delivery.deliveryDateString;
                    if (!deliveryDateStr && delivery.DeliveryDate) {
                      if (delivery.DeliveryDate.seconds) {
                        deliveryDateStr = new Date(delivery.DeliveryDate.seconds * 1000).toISOString().split('T')[0];
                      } else {
                        deliveryDateStr = new Date(delivery.DeliveryDate).toISOString().split('T')[0];
                      }
                    }
                    
                    const selectedDateStr = new Date(bookingData.deliveryDate).toISOString().split('T')[0];
                    return deliveryDateStr === selectedDateStr;
                  });
                  
                  if (hasDateConflict) {
                    console.log(`📅 Truck ${truck.TruckPlate} unavailable on ${bookingData.deliveryDate}`);
                  }
                  return !hasDateConflict;
                });
                console.log(`📅 Client-side date filter: ${availableTrucks.length} trucks available`);
              } else {
                console.log(`✅ No date filter: showing all ${availableTrucks.length} operational trucks`);
              }
              
              return availableTrucks.length > 0 ? (
              <div>
                <div className="truck-selection-grid">
                  {availableTrucks.map((truck, index) => {
                    const isRecommended = recommendedTrucks.some(rt => rt.TruckID === truck.TruckID);
                    const isSelected = bookingData.selectedTrucks.includes(truck.TruckID);
                    const capacity = parseFloat(truck.TruckCapacity) || 0;
                    const cargoWeight = parseFloat(bookingData.weight) || 0;
                    
                    // Calculate cargo distribution only for selected trucks
                    let assignedCargo = 0;
                    let utilizationPercentage = 0;
                    
                    if (isSelected && cargoWeight > 0) {
                      // Get all selected trucks and sort by capacity (biggest first)
                      const selectedTruckObjects = bookingData.selectedTrucks
                        .map(id => availableTrucks.find(t => t.TruckID === id))
                        .filter(t => t)
                        .sort((a, b) => (parseFloat(b.TruckCapacity) || 0) - (parseFloat(a.TruckCapacity) || 0));
                      
                      // Calculate total capacity of selected trucks
                      const totalSelectedCapacity = selectedTruckObjects
                        .reduce((sum, t) => sum + (parseFloat(t.TruckCapacity) || 0), 0);
                      
                      // Distribute cargo proportionally
                      if (totalSelectedCapacity > 0) {
                        assignedCargo = (capacity / totalSelectedCapacity) * cargoWeight;
                        utilizationPercentage = (assignedCargo / capacity) * 100;
                      }
                    }
                    
                    return (
                      <div 
                        key={truck.TruckID}
                        className={`truck-selection-card ${isSelected ? 'selected' : ''} ${isRecommended ? 'recommended' : ''}`}
                        onClick={() => handleTruckSelectionWithAvailability(truck.TruckID)}
                      >
                        {isRecommended && (
                          <div style={{
                            position: 'absolute',
                            top: '5px',
                            right: '5px',
                            background: '#ffc107',
                            color: '#000',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 'bold'
                          }}>
                            RECOMMENDED
                          </div>
                        )}
                        <div className="truck-icon"><FaTruck /></div>
                        <div className="truck-details">
                          <div className="truck-plate">{truck.TruckPlate}</div>
                          <div className="truck-type">{truck.TruckType}</div>
                          <div className="truck-capacity">{truck.TruckCapacity} tons capacity</div>
                          {assignedCargo > 0 && (
                            <div className="truck-cargo-estimate">
                              {assignedCargo > 0 ? `${assignedCargo.toFixed(1)}t cargo` : 'Backup truck'}
                            </div>
                          )}
                        </div>
                        <div className="selection-indicator">
                          {isSelected && '✓'}
                        </div>
                        <div className="utilization-bar">
                          <div 
                            className="utilization-fill" 
                            style={{ width: `${Math.min(100, utilizationPercentage)}%` }}
                          ></div>
                        </div>
                        <div className="utilization-text">
                          {utilizationPercentage.toFixed(0)}% utilized
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="no-trucks-message">
                <p>No available trucks for booking.</p>
                <p>All trucks are currently in use or contact your account manager to get trucks allocated.</p>
              </div>
            );
            })()}
            <small className="form-text text-muted">
              {bookingData.selectedTrucks.length} truck{bookingData.selectedTrucks.length !== 1 ? 's' : ''} selected 
              {bookingData.selectedTrucks.length > 0 && (
                <span> • Total capacity: {
                  bookingData.selectedTrucks
                    .map(id => allocatedTrucks.find(t => t.TruckID === id))
                    .filter(t => t)
                    .reduce((sum, truck) => sum + (parseFloat(truck.TruckCapacity) || 0), 0)
                } tons</span>
              )}
            </small>
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={bookingData.selectedTrucks.length === 0}
            >
              Book {bookingData.selectedTrucks.length} Truck{bookingData.selectedTrucks.length !== 1 ? 's' : ''}
            </button>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => setShowBookingModal(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    );
  };

  // Truck filtering and pagination functions
  const getFilteredTrucks = () => {
    let filtered = [...allocatedTrucks];

    // Filter by type
    if (truckFilters.type !== 'all') {
      filtered = filtered.filter(truck => 
        truck.TruckType?.toLowerCase().includes(truckFilters.type.toLowerCase())
      );
    }

    // Filter by status - TEMPORARILY SHOW ALL TRUCKS FOR DEBUGGING
    if (truckFilters.status !== 'all') {
      const shouldShowAvailable = truckFilters.status === 'available';
      filtered = filtered.filter(truck => {
        // Use enhanced truck status fields and active delivery status for availability
        const truckStatus = truck.TruckStatus?.toLowerCase();
        const allocationStatus = truck.allocationStatus?.toLowerCase() || truck.AllocationStatus?.toLowerCase();
        const operationalStatus = truck.operationalStatus?.toLowerCase() || truck.OperationalStatus?.toLowerCase();
        const availabilityStatus = truck.availabilityStatus?.toLowerCase() || truck.AvailabilityStatus?.toLowerCase();
        const isActivelyInUse = truck.activeDelivery === true;
        
        const statusAvailable = (
          // Check legacy status for backward compatibility
          truckStatus === 'allocated' || truckStatus === 'available'
        ) && (
          // Check enhanced allocation status (preferred)
          !allocationStatus || allocationStatus === 'allocated' || allocationStatus === 'available'
        ) && (
          // Check operational status
          !operationalStatus || operationalStatus === 'active'
        ) && (
          // Check availability status  
          !availabilityStatus || availabilityStatus === 'free' || availabilityStatus === 'busy'
        );
        
        const truckIsAvailable = statusAvailable && !isActivelyInUse;
        
        // DEBUG: Log truck status
        console.log(`🔍 Truck ${truck.TruckPlate}: status="${truckStatus}", activeDelivery=${isActivelyInUse}, isAvailable=${truckIsAvailable}, shouldShow=${truckIsAvailable === shouldShowAvailable}`);
        
        return truckIsAvailable === shouldShowAvailable;
      });
    }

    // Filter by search
    if (truckFilters.search) {
      const searchTerm = truckFilters.search.toLowerCase();
      filtered = filtered.filter(truck => 
        truck.TruckPlate?.toLowerCase().includes(searchTerm) ||
        truck.TruckType?.toLowerCase().includes(searchTerm)
      );
    }

    return filtered;
  };

  const getPaginatedTrucks = () => {
    const filtered = getFilteredTrucks();
    const startIndex = (currentTruckPage - 1) * trucksPerPage;
    const endIndex = startIndex + trucksPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    const filtered = getFilteredTrucks();
    return Math.ceil(filtered.length / trucksPerPage);
  };

  const getUniqueTypes = () => {
    const types = [...new Set(allocatedTrucks.map(truck => truck.TruckType).filter(Boolean))];
    return types.sort();
  };

  const handleFilterChange = (filterType, value) => {
    setTruckFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
    setCurrentTruckPage(1); // Reset to first page when filtering
  };

  const resetFilters = () => {
    setTruckFilters({
      type: 'all',
      status: 'all',
      search: ''
    });
    setCurrentTruckPage(1);
  };

  // Handle delivery received confirmation
  const handleDeliveryReceived = async (deliveryId) => {
    try {
      console.log('🔄 Confirming delivery received for:', deliveryId);
      
      // Validate deliveryId
      if (!deliveryId) {
        console.error('❌ No delivery ID provided');
        showError('Error', 'Invalid delivery ID. Please refresh the page and try again.');
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        console.error('❌ No authentication token found');
        showError('Authentication Error', 'Please login again.');
        return;
      }

      // Show confirmation dialog
      const confirmed = window.confirm(
        'Are you sure you want to confirm that you have received this delivery? This action cannot be undone.'
      );
      
      if (!confirmed) {
        console.log('🚫 User cancelled confirmation');
        return;
      }

      // Set loading state for this specific delivery
      setIsLoading(true);
      console.log('🔄 Making API call to confirm delivery...');

      // Construct the API URL carefully
      const apiUrl = `/api/clients/deliveries/${deliveryId}/confirm-received`;
      console.log('🌐 API URL:', apiUrl);

      // Make API call to confirm delivery received
      const response = await axios.put(
        apiUrl,
        {
          clientConfirmed: true,
          confirmedAt: new Date().toISOString(),
          notes: 'Client confirmed delivery received'
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      );

      console.log('✅ Delivery confirmation response:', response.data);

      if (response.data.success) {
        // Update the local deliveries state to reflect the confirmation
        setDeliveries(prevDeliveries => 
          prevDeliveries.map(delivery => 
            delivery.DeliveryID === deliveryId 
              ? { 
                  ...delivery, 
                  clientConfirmed: true, 
                  confirmedAt: new Date().toISOString(),
                  DeliveryStatus: 'completed' // Mark as completed after client confirmation
                }
              : delivery
          )
        );

        // Show success message
        showSuccess(
          'Delivery Confirmed!', 
          'Thank you for confirming that you have received your delivery. The driver and our team have been notified.'
        );
      } else {
        throw new Error(response.data.message || 'Confirmation failed');
      }

    } catch (error) {
      console.error('❌ Error confirming delivery received:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
      
      let errorMessage = 'Failed to confirm delivery received. Please try again.';
      
      if (error.response?.status === 404) {
        errorMessage = 'Delivery not found. Please refresh the page and try again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You are not authorized to confirm this delivery.';
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.message || 'This delivery cannot be confirmed at this time.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      }
      
      showError('Confirmation Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // New delivery management handlers
  const handleCancelDelivery = (delivery) => {
    setSelectedDelivery(delivery);
    setShowCancelModal(true);
  };

  const handleChangeRoute = (delivery) => {
    setSelectedDelivery(delivery);
    setChangeRouteData({
      pickupLocation: delivery.PickupLocation || '',
      pickupCoordinates: delivery.pickupCoordinates || delivery.PickupCoordinates || null,
      dropoffLocation: delivery.DropoffLocation || delivery.DeliveryAddress || '',
      dropoffCoordinates: delivery.dropoffCoordinates || delivery.DropoffCoordinates || null,
      newDistance: 0,
      newCost: 0
    });
    setShowChangeRouteModal(true);
  };

  const handleRebookDelivery = (delivery) => {
    setSelectedDelivery(delivery);
    const currentDate = new Date(delivery.DeliveryDate);
    setRebookData({
      newDate: currentDate.toISOString().split('T')[0],
      newTime: '12:00'
    });
    setShowRebookModal(true);
  };

  // Cancel delivery confirmation
  const confirmCancelDelivery = async () => {
    try {
      setIsLoading(true);
      
      const response = await axios.post(`/api/clients/deliveries/${selectedDelivery.DeliveryID}/cancel`);
      
      if (response.data.success) {
        // Update local state
        setDeliveries(prevDeliveries => 
          prevDeliveries.map(delivery => 
            delivery.DeliveryID === selectedDelivery.DeliveryID 
              ? { ...delivery, DeliveryStatus: 'cancelled' }
            : delivery
          )
        );

        showToastSuccess('Delivery Cancelled', 'Your delivery has been cancelled successfully. No payment is required.');
        setShowCancelModal(false);
        setSelectedDelivery(null);
      }
    } catch (error) {
      console.error('Error cancelling delivery:', error);
      showToastError('Cancellation Failed', error.response?.data?.message || 'Failed to cancel delivery');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate new route distance and cost
  const calculateNewRoute = async () => {
    if (!changeRouteData.pickupLocation || !changeRouteData.dropoffLocation) {
      return;
    }

    try {
      let estimatedDistance;
      
      // If we have coordinates from map selection, calculate actual distance
      if (changeRouteData.pickupCoordinates && changeRouteData.dropoffCoordinates) {
        const pickup = changeRouteData.pickupCoordinates;
        const dropoff = changeRouteData.dropoffCoordinates;
        
        // Calculate distance using Haversine formula
        const R = 6371; // Earth's radius in kilometers
        const dLat = (dropoff.lat - pickup.lat) * Math.PI / 180;
        const dLon = (dropoff.lng - pickup.lng) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(pickup.lat * Math.PI / 180) * Math.cos(dropoff.lat * Math.PI / 180) * 
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        estimatedDistance = Math.round(R * c * 100) / 100; // Round to 2 decimal places
      } else {
        // Fallback to mock calculation
        estimatedDistance = Math.floor(Math.random() * 50) + 10; // 10-60 km
      }
      
      // Get vehicle type from selected delivery
      console.log('🔍 Selected delivery data:', selectedDelivery);
      const vehicleType = selectedDelivery?.VehicleType || selectedDelivery?.vehicleType || 'mini truck';
      console.log('🚛 Vehicle type for calculation:', vehicleType);
      console.log('📊 Available vehicle rates:', vehicleRates);
      
      // Find the matching rate with improved matching logic
      const rate = vehicleRates.find(r => {
        const rateType = r.vehicleType || r.VehicleType || '';
        const deliveryType = vehicleType || '';
        
        // Exact match
        if (rateType === deliveryType) return true;
        
        // Case insensitive match
        if (rateType.toLowerCase() === deliveryType.toLowerCase()) return true;
        
        // Handle common variations
        const normalizedRateType = rateType.toLowerCase().replace(/\s+/g, '');
        const normalizedDeliveryType = deliveryType.toLowerCase().replace(/\s+/g, '');
        
        // Map common variations
        const typeMapping = {
          'smalltruck': 'minitruck',
          'small': 'mini',
          'minitruck': 'minitruck',
          'mini': 'mini'
        };
        
        const mappedRateType = typeMapping[normalizedRateType] || normalizedRateType;
        const mappedDeliveryType = typeMapping[normalizedDeliveryType] || normalizedDeliveryType;
        
        return mappedRateType === mappedDeliveryType;
      });
      
      console.log('💰 Found rate:', rate);
      
      let newCost = 750; // Default fallback cost
      if (rate) {
        // Use the correct formula: base rate + (distance × rate per km)
        const baseRate = rate.baseRate || rate.BaseRate || 100;
        const ratePerKm = rate.ratePerKm || rate.RatePerKm || 15;
        
        newCost = baseRate + (estimatedDistance * ratePerKm);
        console.log(`💰 Calculation: ${baseRate} + (${estimatedDistance} × ${ratePerKm}) = ${newCost}`);
      } else {
        console.warn('⚠️ No rate found for vehicle type:', vehicleType);
        // Try to use the original delivery rate as reference
        if (selectedDelivery?.DeliveryRate && selectedDelivery?.DeliveryDistance) {
          const originalRate = selectedDelivery.DeliveryRate / selectedDelivery.DeliveryDistance;
          newCost = 100 + (estimatedDistance * originalRate); // Assume 100 base rate
        }
      }
      
      // Round the cost to 2 decimal places
      newCost = Math.round(newCost * 100) / 100;
      
      setChangeRouteData(prev => ({
        ...prev,
        newDistance: estimatedDistance,
        newCost: newCost
      }));
      
    } catch (error) {
      console.error('Error calculating new route:', error);
    }
  };

  // Change route confirmation
  const confirmChangeRoute = async () => {
    try {
      setIsLoading(true);
      
      // Calculate route if not already calculated
      if (changeRouteData.newDistance === 0) {
        await calculateNewRoute();
      }
      
      const response = await axios.post(`/api/clients/deliveries/${selectedDelivery.DeliveryID}/change-route`, {
        pickupLocation: changeRouteData.pickupLocation,
        pickupCoordinates: changeRouteData.pickupCoordinates,
        dropoffLocation: changeRouteData.dropoffLocation,
        dropoffCoordinates: changeRouteData.dropoffCoordinates,
        newDistance: changeRouteData.newDistance,
        newCost: changeRouteData.newCost
      });
      
      if (response.data.success) {
        // Update local state
        setDeliveries(prevDeliveries => 
          prevDeliveries.map(delivery => 
            delivery.DeliveryID === selectedDelivery.DeliveryID 
              ? { 
                ...delivery, 
                PickupLocation: changeRouteData.pickupLocation,
                DropoffLocation: changeRouteData.dropoffLocation,
                DeliveryDistance: changeRouteData.newDistance,
                DeliveryRate: changeRouteData.newCost
              }
            : delivery
          )
        );

        showToastSuccess('Route Updated', `Route changed successfully. New cost: ${formatCurrency(changeRouteData.newCost)}`);
        setShowChangeRouteModal(false);
        setSelectedDelivery(null);
      }
    } catch (error) {
      console.error('Error changing route:', error);
      showToastError('Route Change Failed', error.response?.data?.message || 'Failed to change route');
    } finally {
      setIsLoading(false);
    }
  };

  // Rebook delivery confirmation
  const confirmRebookDelivery = async () => {
    try {
      setIsLoading(true);
      
      const response = await axios.post(`/api/clients/deliveries/${selectedDelivery.DeliveryID}/rebook`, {
        newDate: rebookData.newDate,
        newTime: rebookData.newTime
      });
      
      if (response.data.success) {
        // Update local state
        setDeliveries(prevDeliveries => 
          prevDeliveries.map(delivery => 
            delivery.DeliveryID === selectedDelivery.DeliveryID 
              ? { 
                ...delivery, 
                DeliveryDate: new Date(`${rebookData.newDate}T${rebookData.newTime}`)
              }
            : delivery
          )
        );

        showToastSuccess('Delivery Rescheduled', `Delivery rescheduled to ${new Date(`${rebookData.newDate}T${rebookData.newTime}`).toLocaleDateString()}`);
        setShowRebookModal(false);
        setSelectedDelivery(null);
      }
    } catch (error) {
      console.error('Error rebooking delivery:', error);
      showToastError('Rebooking Failed', error.response?.data?.message || 'Failed to reschedule delivery');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to check if delivery can be modified (before driver starts)
  const canModifyDelivery = (delivery) => {
    const status = delivery.DeliveryStatus?.toLowerCase();
    return status === 'pending' || status === 'accepted';
  };
  
  // Helper function to check if delivery can be rescheduled
  const canRescheduleDelivery = (delivery) => {
    if (!canModifyDelivery(delivery)) return false;
    
    const deliveryDate = new Date(delivery.DeliveryDate);
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
    const twentyFourHoursFromNow = new Date(now.getTime() + (24 * 60 * 60 * 1000));
    
    // Can reschedule if:
    // 1. Delivery is more than 3 days away OR
    // 2. Delivery is more than 24 hours away (not within 24 hours of same day)
    return deliveryDate > threeDaysFromNow || 
           (deliveryDate > twentyFourHoursFromNow && deliveryDate.getDate() !== now.getDate());
  };
  
  // Helper function to sort deliveries
  const sortDeliveries = (deliveriesToSort) => {
    return [...deliveriesToSort].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      // Handle date sorting
      if (sortField === 'DeliveryDate') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };
  
  // Handle sort column click
  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to desc
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };
  
  // Get paginated and sorted deliveries
  const getPaginatedDeliveries = () => {
    const sorted = sortDeliveries(filteredDeliveries);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sorted.slice(startIndex, endIndex);
  };
  
  // Get total pages
  const getTotalPagesForBookings = () => {
    return Math.ceil(filteredDeliveries.length / itemsPerPage);
  };
  
  // Handle view details
  const handleViewDetails = (delivery) => {
    setViewingDelivery(delivery);
    setShowViewDetailsModal(true);
  };
  
  // Handle view truck details
  const handleViewTruckDetails = (truck) => {
    setViewingTruck(truck);
    setShowTruckDetailsModal(true);
  };

  // Change route map modal handlers
  const openChangeRouteMapModal = (type) => {
    setChangeRouteMapType(type);
    setShowChangeRouteMapModal(true);
    
    // Initialize the isolated map modal
    const initialAddress = type === 'pickup' 
      ? changeRouteData.pickupLocation 
      : changeRouteData.dropoffLocation;
      
    isolatedMapModal.init({
      onSelectCallback: (address, coordinates) => {
        handleChangeRouteLocationSelected({ address, coordinates });
      },
      locationType: type,
      initialAddress: initialAddress,
      title: `Select ${type === 'pickup' ? 'Pickup' : 'Dropoff'} Location`
    }).show();
  };

  const handleChangeRouteLocationSelected = (locationData) => {
    const { address, coordinates } = locationData;
    
    if (changeRouteMapType === 'pickup') {
      setChangeRouteData(prev => ({
        ...prev,
        pickupLocation: address,
        pickupCoordinates: coordinates
      }));
    } else {
      setChangeRouteData(prev => ({
        ...prev,
        dropoffLocation: address,
        dropoffCoordinates: coordinates
      }));
    }
    
    setShowChangeRouteMapModal(false);
    
    // Auto-calculate route if both locations are set
    setTimeout(() => {
      const updatedData = changeRouteMapType === 'pickup' 
        ? { ...changeRouteData, pickupLocation: address, pickupCoordinates: coordinates }
        : { ...changeRouteData, dropoffLocation: address, dropoffCoordinates: coordinates };
        
      if (updatedData.pickupLocation && updatedData.dropoffLocation) {
        calculateNewRoute();
      }
    }, 100);
  };

  if (isLoading) {
    return <Loader />;
  }

  if (error) {
    return (
      <div className="error-message">
        <h2>Error Loading Profile</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className="btn">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="profile-container">
            {/* Profile Header removed - ClientHeader already provides navigation */}

            {/* Booking Modal */}
      {renderBookingModal()}

      {/* Warning Modal */}
      <WarningModal
        isOpen={modalState.isOpen}
        onClose={hideModal}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        onConfirm={modalState.onConfirm}
        size={modalState.size}
      />

      {/* Route Modal for viewing delivery routes */}
      {showRouteModal && selectedDeliveryRoute && (
        <Modal
          title="Delivery Route"
          onClose={() => setShowRouteModal(false)}
          size="large"
        >
          <div className="route-modal-content">
            <div className="route-info-header">
              <h4>📍 Route Details</h4>
              <div className="route-addresses">
                <div className="route-address">
                  <strong>Pickup:</strong> {selectedDeliveryRoute.pickupLocation}
                </div>
                <div className="route-address">
                  <strong>Dropoff:</strong> {selectedDeliveryRoute.dropoffLocation}
                </div>
              </div>
            </div>
            
            {selectedDeliveryRoute.pickupCoordinates && selectedDeliveryRoute.dropoffCoordinates && (
              <div className="route-map-container">
                <RouteMap 
                  pickupCoordinates={selectedDeliveryRoute.pickupCoordinates}
                  dropoffCoordinates={selectedDeliveryRoute.dropoffCoordinates}
                  pickupAddress={selectedDeliveryRoute.pickupLocation}
                  dropoffAddress={selectedDeliveryRoute.dropoffLocation}
                  onRouteCalculated={() => {}} // No need to handle route calculation for viewing
                />
              </div>
            )}
            
            <div className="route-summary">
              <div className="route-stat">
                <span className="route-stat-label">Distance:</span>
                <span className="route-stat-value">{selectedDeliveryRoute.distance} km</span>
              </div>
              <div className="route-stat">
                <span className="route-stat-label">Duration:</span>
                <span className="route-stat-value">{selectedDeliveryRoute.duration} min</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Content Sections */}
      <div className="profile-content">
        {activeTab === 'overview' && (
          <div className="overview-section">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon bg-blue">
                  <FaTruck />
                </div>
                <div className="stat-details">
                  <h3>{allocatedTrucks.length}</h3>
                  <p>Allocated Trucks</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon bg-green">
                  <FaShippingFast />
                </div>
                <div className="stat-details">
                  <h3>{getActiveDeliveries().length}</h3>
                  <p>Active Deliveries</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon bg-purple">
                  <FaHistory />
                </div>
                <div className="stat-details">
                  <h3>{getCompletedDeliveries().length}</h3>
                  <p>Completed</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon bg-orange">
                  <FaDollarSign />
                </div>
                <div className="stat-details">
                  <h3>{formatCurrency(calculateTotalSpent())}</h3>
                  <p>Total Spent</p>
                </div>
              </div>
            </div>

            <div className="recent-activity">
              <h3>Recent Activity</h3>
              <div className="activity-list">
                {deliveries.slice(0, 5).map(delivery => (
                  <div key={delivery.DeliveryID} className="activity-item">
                    <div className="activity-icon">
                      <FaShippingFast />
                    </div>
                    <div className="activity-details">
                      <h4>Delivery #{delivery.DeliveryID}</h4>
                      <p>{delivery.PickupLocation} → {delivery.DropoffLocation}</p>
                      <span className="activity-date">{formatDate(delivery.DeliveryDate, delivery)}</span>
                    </div>
                    <div className={`activity-status ${getStatusBadgeClass(delivery.DeliveryStatus)}`}>
                      {delivery.DeliveryStatus}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="transactions-section">
            <div className="section-header">
              <h3>Booking History</h3>
            </div>
            
            {/* Modern Filters Section - Like Admin Pages */}
            <div className="modern-filters">
              <div className="filters-grid">
                {/* Search */}
                <div className="search-container">
                  <label className="search-label">Search</label>
                  <div className="search-input-wrapper">
                    <input
                      type="text"
                      placeholder="Search bookings..."
                      value={transactionSearchQuery || ''}
                      onChange={(e) => setTransactionSearchQuery(e.target.value)}
                      className="modern-search-input"
                    />
                    <FaSearch className="search-icon" />
                  </div>
                </div>

                {/* Status Filter */}
                <div className="filter-group">
                  <label className="filter-label">Status</label>
                  <select
                    value={statusFilter || 'all'}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="modern-filter-select"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="delivered">Delivered</option>
                  </select>
                </div>

                {/* Date Filter */}
                <div className="filter-group">
                  <label className="filter-label">Date Range</label>
                  <select
                    value={dateFilter || 'all'}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="modern-filter-select"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                  </select>
                </div>
              </div>

              <div className="filter-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setTransactionSearchQuery('');
                    setStatusFilter('all');
                    setDateFilter('all');
                  }}
                >
                  Clear Filters
                </button>
                
                <div className="filter-summary">
                  Showing {filteredDeliveries.length} of {deliveries.length} bookings
                </div>
              </div>
            </div>

            {/* Modern Bookings Table */}
            {filteredDeliveries.length === 0 ? (
              <div className="trucks-empty-state">
                <div className="empty-state-icon">📋</div>
                <h3 className="empty-state-title">No bookings found</h3>
                <p className="empty-state-description">
                  No bookings match your current filters. Try adjusting your search criteria.
                </p>
              </div>
            ) : (
              <>
                <div className="modern-bookings-table-wrapper">
                  <table className="modern-bookings-table">
                    <thead>
                      <tr>
                        <th className="sortable" onClick={() => handleSort('DeliveryID')}>
                          <div className="th-content">
                            <span>Delivery ID</span>
                            {sortField === 'DeliveryID' && <span className="sort-indicator">{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                          </div>
                        </th>
                        <th className="sortable" onClick={() => handleSort('DeliveryDate')}>
                          <div className="th-content">
                            <FaCalendarAlt />
                            <span>Delivery Date</span>
                            {sortField === 'DeliveryDate' && <span className="sort-indicator">{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                          </div>
                        </th>
                        <th>
                          <div className="th-content">
                            <FaTruck />
                            <span>Truck</span>
                          </div>
                        </th>
                        <th className="sortable" onClick={() => handleSort('DeliveryStatus')}>
                          <div className="th-content">
                            <span>Status</span>
                            {sortField === 'DeliveryStatus' && <span className="sort-indicator">{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                          </div>
                        </th>
                        <th className="actions-th">
                          <div className="th-content">
                            <span>Actions</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPaginatedDeliveries().map(delivery => (
                        <tr key={delivery.DeliveryID} className="modern-booking-row">
                          <td className="delivery-id-col">
                            <div className="id-badge">
                              #{delivery.DeliveryID?.substring(0, 12) || 'N/A'}
                            </div>
                          </td>
                          <td className="date-col">
                            <div className="date-value">
                              {formatDate(delivery.DeliveryDate, delivery)}
                            </div>
                          </td>
                          <td className="truck-col">
                            <div className="truck-info">
                              <span className="truck-plate">{delivery.TruckPlate || 'N/A'}</span>
                              {delivery.TruckBrand && delivery.TruckBrand !== 'Unknown' && (
                                <span className="truck-brand">{delivery.TruckBrand}</span>
                              )}
                            </div>
                          </td>
                          <td className="status-col">
                            <span className={`modern-status-badge ${delivery.DeliveryStatus?.toLowerCase()}`}>
                              {delivery.DeliveryStatus}
                            </span>
                          </td>
                          <td className="actions-col">
                            <div className="modern-action-buttons">
                              <button
                                className="modern-action-btn view"
                                onClick={() => handleViewDetails(delivery)}
                                title="View details"
                              >
                                <FaEye />
                              </button>
                              
                              {canRescheduleDelivery(delivery) && (
                                <button
                                  className="modern-action-btn reschedule"
                                  onClick={() => handleRebookDelivery(delivery)}
                                  title="Reschedule"
                                >
                                  <FaCalendarAlt />
                                </button>
                              )}
                              
                              {canRescheduleDelivery(delivery) && (
                                <button
                                  className="modern-action-btn reroute"
                                  onClick={() => handleChangeRoute(delivery)}
                                  title="Reroute"
                                >
                                  <FaRoute />
                                </button>
                              )}
                              
                              {canModifyDelivery(delivery) && (
                                <button
                                  className="modern-action-btn cancel"
                                  onClick={() => handleCancelDelivery(delivery)}
                                  title="Cancel"
                                >
                                  <FaTimes />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {getTotalPagesForBookings() > 1 && (
                  <div className="table-pagination">
                    <div className="pagination-info">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredDeliveries.length)} of {filteredDeliveries.length} bookings
                    </div>
                    <div className="pagination-controls">
                      <button
                        className="btn btn-pagination"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(1)}
                      >
                        First
                      </button>
                      <button
                        className="btn btn-pagination"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(currentPage - 1)}
                      >
                        Previous
                      </button>
                      <span className="page-indicator">
                        Page {currentPage} of {getTotalPagesForBookings()}
                      </span>
                      <button
                        className="btn btn-pagination"
                        disabled={currentPage === getTotalPagesForBookings()}
                        onClick={() => setCurrentPage(currentPage + 1)}
                      >
                        Next
                      </button>
                      <button
                        className="btn btn-pagination"
                        disabled={currentPage === getTotalPagesForBookings()}
                        onClick={() => setCurrentPage(getTotalPagesForBookings())}
                      >
                        Last
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'trucks' && (
          <div className="trucks-section">
            <div className="section-header">
              <h3>My Allocated Trucks ({allocatedTrucks.length})</h3>
              <div className="section-actions">
                <button onClick={() => setShowBookingModal(true)} className="btn btn-primary">
                  <FaPlus /> Book Truck
                </button>
              </div>
            </div>

            {/* Modern Filters Section - Like Admin Pages */}
                <div className="modern-filters">
                  <div className="filters-grid">
                    {/* Search */}
                    <div className="search-container">
                      <label className="search-label">Search</label>
                      <div className="search-input-wrapper">
                        <input
                          type="text"
                          placeholder="Search trucks..."
                          value={truckFilters.search}
                          onChange={(e) => handleFilterChange('search', e.target.value)}
                          className="modern-search-input"
                        />
                        <FaSearch className="search-icon" />
                      </div>
                    </div>

                    {/* Type Filter */}
                    <div className="filter-group">
                      <label className="filter-label">Type</label>
                      <select
                        value={truckFilters.type}
                        onChange={(e) => handleFilterChange('type', e.target.value)}
                        className="modern-filter-select"
                      >
                        <option value="all">All Types</option>
                        {getUniqueTypes().map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>

                    {/* Status Filter */}
                    <div className="filter-group">
                      <label className="filter-label">Status</label>
                      <select
                        value={truckFilters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="modern-filter-select"
                      >
                        <option value="all">All Status</option>
                        <option value="available">Available</option>
                        <option value="busy">In Use</option>
                      </select>
                    </div>

                    {/* Per Page Filter */}
                    <div className="filter-group">
                      <label className="filter-label">Per Page</label>
                      <select
                        value={trucksPerPage}
                        onChange={(e) => {
                          setTrucksPerPage(Number(e.target.value));
                          setCurrentTruckPage(1);
                        }}
                        className="modern-filter-select"
                      >
                        <option value={6}>6 per page</option>
                        <option value={12}>12 per page</option>
                        <option value={24}>24 per page</option>
                        <option value={48}>48 per page</option>
                      </select>
                    </div>
                  </div>

                  <div className="filter-actions">
                    <button
                      className="btn btn-secondary"
                      onClick={resetFilters}
                    >
                      Clear Filters
                    </button>
                    
                    <div className="filter-summary">
                      Showing {getPaginatedTrucks().length} of {getFilteredTrucks().length} trucks
                    </div>
                  </div>
                </div>
                
                {/* Modern Trucks Table */}
                {getPaginatedTrucks().length === 0 ? (
                  <div className="trucks-empty-state">
                    <div className="empty-state-icon">🚛</div>
                    <h3 className="empty-state-title">No trucks found</h3>
                    <p className="empty-state-description">
                      No trucks match your current filters. Try adjusting your search criteria.
                    </p>
                  </div>
                ) : (
                  <div className="modern-trucks-table-wrapper">
                    <table className="modern-trucks-table">
                      <thead>
                        <tr>
                          <th>
                            <div className="th-content">
                              <FaTruck />
                              <span>Truck Plate</span>
                            </div>
                          </th>
                          <th>
                            <div className="th-content">
                              <span>Type</span>
                            </div>
                          </th>
                          <th>
                            <div className="th-content">
                              <span>Brand</span>
                            </div>
                          </th>
                          <th>
                            <div className="th-content">
                              <span>Capacity</span>
                            </div>
                          </th>
                          <th>
                            <div className="th-content">
                              <span>Deliveries</span>
                            </div>
                          </th>
                          <th>
                            <div className="th-content">
                              <span>Total KM</span>
                            </div>
                          </th>
                          <th>
                            <div className="th-content">
                              <span>Status</span>
                            </div>
                          </th>
                          <th className="actions-th">
                            <div className="th-content">
                              <span>Actions</span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {getPaginatedTrucks().map(truck => {
                          // Use enhanced truck status fields and active delivery status for availability
                          const truckStatus = truck.TruckStatus?.toLowerCase();
                          const allocationStatus = truck.allocationStatus?.toLowerCase() || truck.AllocationStatus?.toLowerCase();
                          const operationalStatus = truck.operationalStatus?.toLowerCase() || truck.OperationalStatus?.toLowerCase();
                          
                          // Check if truck is in an active delivery
                          const isInActiveDelivery = deliveries.some(
                            delivery => delivery.TruckID === truck.TruckID && 
                            (delivery.DeliveryStatus === 'pending' || delivery.DeliveryStatus === 'in-progress')
                          );
                          
                          // ALLOW BOOKING EVEN IF TRUCK HAS ACTIVE DELIVERY - date checking happens at booking time
                          // Only disable book button if truck is under maintenance or out of service
                          const isAvailable = truckStatus !== 'maintenance' && 
                                             truckStatus !== 'out-of-service' &&
                                             operationalStatus !== 'maintenance' &&
                                             operationalStatus !== 'out-of-service';
                          
                          // Determine status for display - show "In Use" if has active delivery
                          const displayStatus = isInActiveDelivery ? 'In Use' : 'Available';
                          const statusClass = isInActiveDelivery ? 'busy' : 'available';
                          
                          return (
                            <tr key={truck.TruckID} className="modern-truck-row">
                              <td className="truck-plate-col">
                                <div className="plate-badge">
                                  {truck.TruckPlate}
                                </div>
                              </td>
                              <td className="truck-type-col">
                                <span className="truck-type-badge">{truck.TruckType}</span>
                              </td>
                              <td className="truck-brand-col">
                                {truck.TruckBrand}
                              </td>
                              <td className="truck-capacity-col">
                                <span className="capacity-value">{truck.TruckCapacity} tons</span>
                              </td>
                              <td className="truck-deliveries-col">
                                <span className="deliveries-count">{truck.TotalCompletedDeliveries || 0}</span>
                              </td>
                              <td className="truck-km-col">
                                {truck.TotalKilometers || 0} km
                              </td>
                              <td className="truck-status-col">
                                <span className={`modern-truck-status-badge ${statusClass}`}>
                                  {displayStatus}
                                </span>
                              </td>
                              <td className="truck-actions-col">
                                <div className="modern-truck-action-buttons">
                                  {isAvailable && (
                                    <button 
                                      className="modern-action-btn book"
                                      onClick={() => setShowBookingModal(true)}
                                      title={isInActiveDelivery ? "Book this truck (has active delivery but can be booked on different dates)" : "Book this truck"}
                                    >
                                      <FaCalendarPlus />
                                    </button>
                                  )}
                                  <button 
                                    className="modern-action-btn view"
                                    onClick={() => handleViewTruckDetails(truck)}
                                    title="View details"
                                  >
                                    <FaEye />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {/* Pagination */}
                {getTotalPages() > 1 && (
                  <div className="pagination-container">
                    <div className="pagination">
                      <button
                        className="btn btn-outline-secondary"
                        disabled={currentTruckPage === 1}
                        onClick={() => setCurrentTruckPage(prev => prev - 1)}
                      >
                        Previous
                      </button>
                      
                      <div className="page-info">
                        Page {currentTruckPage} of {getTotalPages()}
                      </div>
                      
                      <button
                        className="btn btn-outline-secondary"
                        disabled={currentTruckPage === getTotalPages()}
                        onClick={() => setCurrentTruckPage(prev => prev + 1)}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
            
            {allocatedTrucks.length === 0 && (
              <div className="trucks-empty-state">
                <div className="empty-state-icon">🚛</div>
                <h3 className="empty-state-title">No Trucks Allocated</h3>
                <p className="empty-state-description">
                  Contact your account manager to allocate trucks to your account.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'billing' && <ModernBillingSection onBillingDataUpdate={handleBillingDataUpdate} />}

        {activeTab === 'profile' && (
          <div className="profile-info-section">
            {/* Modern Profile Header Card */}
            <div className="profile-card-modern">
              <div className="profile-card-content">
                <div className="profile-avatar-modern">
                  <FaUser />
                </div>
                <h2 className="profile-name-modern">
                  {clientData?.ClientName || 'Client Name'}
                </h2>
                <p className="profile-role-modern">
                  Transportation Client • ID: {clientData?.ClientID?.substring(0, 8) || 'Unknown'}
                </p>
                <div className="profile-stats-modern">
                  <div className="profile-stat-modern">
                    <span className="profile-stat-number">{getActiveDeliveries().length}</span>
                    <span className="profile-stat-label">Active Deliveries</span>
                  </div>
                  <div className="profile-stat-modern">
                    <span className="profile-stat-number">{getCompletedDeliveries().length}</span>
                    <span className="profile-stat-label">Completed</span>
                  </div>
                  <div className="profile-stat-modern">
                    <span className="profile-stat-number">{allocatedTrucks.length}</span>
                    <span className="profile-stat-label">Trucks</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Information Card */}
            <div className="info-card">
              <button className="edit-btn" onClick={handleEditProfile}>
                <FaEdit /> Edit Profile
              </button>
              <div className="info-header">
                <h3>Account Information</h3>
              </div>
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-icon">
                    <FaUser />
                  </div>
                  <div className="info-details">
                    <label>Full Name</label>
                    <span>{clientData?.ClientName || 'Not specified'}</span>
                  </div>
                </div>
                <div className="info-item">
                  <div className="info-icon">
                    <FaEnvelope />
                  </div>
                  <div className="info-details">
                    <label>Email Address</label>
                    <span>{clientData?.ClientEmail || 'Not specified'}</span>
                  </div>
                </div>
                <div className="info-item">
                  <div className="info-icon">
                    <FaPhone />
                  </div>
                  <div className="info-details">
                    <label>Phone Number</label>
                    <span>{clientData?.ClientNumber || 'Not specified'}</span>
                  </div>
                </div>
                <div className="info-item">
                  <div className="info-icon">
                    <FaBuilding />
                  </div>
                  <div className="info-details">
                    <label>Client ID</label>
                    <span>{clientData?.ClientID || 'Not specified'}</span>
                  </div>
                </div>
                <div className="info-item">
                  <div className="info-icon">
                    <FaMapMarkerAlt />
                  </div>
                  <div className="info-details">
                    <label>Account Status</label>
                    <span style={{
                      color: clientData?.ClientStatus === 'active' ? '#10b981' : '#ef4444',
                      fontWeight: '600',
                      textTransform: 'capitalize'
                    }}>
                      {clientData?.ClientStatus || 'Unknown'}
                    </span>
                  </div>
                </div>
                <div className="info-item">
                  <div className="info-icon">
                    <FaCalendarAlt />
                  </div>
                  <div className="info-details">
                    <label>Member Since</label>
                    <span>{clientData?.ClientCreationDate ? formatDate(clientData.ClientCreationDate) : 'Not specified'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Edit Profile Modal */}
      {showEditModal && (
        <Modal
          title="Edit Profile"
          onClose={() => setShowEditModal(false)}
          size="medium"
        >
          <form onSubmit={handleUpdateProfile} className="edit-profile-form">
            <div className="form-group">
              <label htmlFor="clientName">Full Name</label>
              <input
                type="text"
                id="clientName"
                name="clientName"
                value={editFormData.clientName}
                onChange={handleEditFormChange}
                className="form-control"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="clientEmail">Email Address</label>
              <input
                type="email"
                id="clientEmail"
                name="clientEmail"
                value={editFormData.clientEmail}
                onChange={handleEditFormChange}
                className="form-control"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="clientNumber">Phone Number</label>
              <input
                type="tel"
                id="clientNumber"
                name="clientNumber"
                value={editFormData.clientNumber}
                onChange={handleEditFormChange}
                className="form-control"
              />
            </div>
            
            <div className="form-actions">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="btn btn-outline-secondary"
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isUpdating}
              >
                {isUpdating ? 'Updating...' : 'Update Profile'}
              </button>
            </div>
            
            <div className="password-section">
              <hr />
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setShowPasswordModal(true);
                }}
                className="btn btn-outline"
              >
                <FaEdit /> Change Password
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <Modal
          title="Change Password"
          onClose={() => setShowPasswordModal(false)}
          size="medium"
        >
          <form onSubmit={handleChangePassword} className="password-form">
            <div className="form-group">
              <label htmlFor="currentPassword">Current Password</label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                value={passwordFormData.currentPassword}
                onChange={handlePasswordFormChange}
                className="form-control"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={passwordFormData.newPassword}
                onChange={handlePasswordFormChange}
                className="form-control"
                minLength="6"
                required
              />
              <small className="form-text">Password must be at least 6 characters long</small>
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={passwordFormData.confirmPassword}
                onChange={handlePasswordFormChange}
                className="form-control"
                required
              />
            </div>
            
            <div className="form-actions">
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="btn btn-outline-secondary"
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isUpdating}
              >
                {isUpdating ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Cancel Delivery Modal */}
      {showCancelModal && selectedDelivery && (
        <Modal
          title="Cancel Delivery"
          onClose={() => setShowCancelModal(false)}
          size="medium"
        >
          <div className="cancel-delivery-modal">
            <div className="warning-message">
              <FaExclamationTriangle className="warning-icon" />
              <h4>Are you sure you want to cancel this delivery?</h4>
              <p>This action cannot be undone. The delivery will be marked as cancelled and no payment will be required.</p>
            </div>
            
            <div className="delivery-details">
              <h5>Delivery Details:</h5>
              <div className="detail-row">
                <strong>ID:</strong> #{selectedDelivery.DeliveryID}
              </div>
              <div className="detail-row">
                <strong>Route:</strong> {selectedDelivery.PickupLocation} → {selectedDelivery.DropoffLocation || selectedDelivery.DeliveryAddress}
              </div>
              <div className="detail-row">
                <strong>Date:</strong> {formatDate(selectedDelivery.DeliveryDate)}
              </div>
              <div className="detail-row">
                <strong>Amount:</strong> {formatCurrency(selectedDelivery.DeliveryRate || 0)}
              </div>
            </div>
            
            <div className="form-actions">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="btn btn-outline-secondary"
                disabled={isLoading}
              >
                Keep Delivery
              </button>
              <button
                type="button"
                onClick={confirmCancelDelivery}
                className="btn btn-danger"
                disabled={isLoading}
              >
                {isLoading ? 'Cancelling...' : 'Yes, Cancel Delivery'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Change Route Modal */}
      {showChangeRouteModal && selectedDelivery && (
        <Modal
          title="Change Route"
          onClose={() => setShowChangeRouteModal(false)}
          size="large"
        >
          <div className="change-route-modal">
            <div className="info-message">
              <FaInfoCircle className="info-icon" />
              <p>Update the pickup and dropoff locations. The billing will be recalculated based on the new distance. Note: Route changes must be made at least 3 days before delivery or with more than 24 hours notice.</p>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); confirmChangeRoute(); }}>
              <div className="form-group">
                <label htmlFor="newPickupLocation">New Pickup Location</label>
                <div className="input-group">
                  <input
                    type="text"
                    id="newPickupLocation"
                    value={changeRouteData.pickupLocation}
                    onChange={(e) => setChangeRouteData(prev => ({ ...prev, pickupLocation: e.target.value }))}
                    className="form-control"
                    placeholder="Enter new pickup address"
                    required
                  />
                  <div className="input-group-append">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => openChangeRouteMapModal('pickup')}
                      title="Select pickup location on map"
                    >
                      <FaMapMarkerAlt />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="newDropoffLocation">New Dropoff Location</label>
                <div className="input-group">
                  <input
                    type="text"
                    id="newDropoffLocation"
                    value={changeRouteData.dropoffLocation}
                    onChange={(e) => setChangeRouteData(prev => ({ ...prev, dropoffLocation: e.target.value }))}
                    className="form-control"
                    placeholder="Enter new dropoff address"
                    required
                  />
                  <div className="input-group-append">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => openChangeRouteMapModal('dropoff')}
                      title="Select dropoff location on map"
                    >
                      <FaMapMarkerAlt />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="form-group">
                <button
                  type="button"
                  onClick={calculateNewRoute}
                  className="btn btn-outline-primary"
                  disabled={!changeRouteData.pickupLocation || !changeRouteData.dropoffLocation}
                >
                  <FaRoute /> Calculate New Route & Cost
                </button>
              </div>
              
              <div className="route-comparison">
                <div className="current-route">
                  <h5>Current Route:</h5>
                  <p>{selectedDelivery.PickupLocation} → {selectedDelivery.DropoffLocation || selectedDelivery.DeliveryAddress}</p>
                  <p><strong>Distance:</strong> {selectedDelivery.DeliveryDistance ? parseFloat(selectedDelivery.DeliveryDistance).toFixed(2) : '0.00'} km</p>
                  <p><strong>Cost:</strong> {formatCurrency(selectedDelivery.DeliveryRate || 0)}</p>
                </div>
                
                {changeRouteData.newDistance > 0 && (
                  <div className="new-route">
                    <h5>New Route:</h5>
                    <p>{changeRouteData.pickupLocation} → {changeRouteData.dropoffLocation}</p>
                    <p><strong>Distance:</strong> {changeRouteData.newDistance ? changeRouteData.newDistance.toFixed(2) : '0.00'} km</p>
                    <p><strong>New Cost:</strong> {formatCurrency(changeRouteData.newCost)}</p>
                  </div>
                )}
              </div>
              
              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setShowChangeRouteModal(false)}
                  className="btn btn-outline-secondary"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-warning"
                  disabled={isLoading || !changeRouteData.pickupLocation || !changeRouteData.dropoffLocation}
                >
                  {isLoading ? 'Updating Route...' : 'Update Route'}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Rebook Delivery Modal */}
      {showRebookModal && selectedDelivery && (
        <Modal
          title="Reschedule Delivery"
          onClose={() => setShowRebookModal(false)}
          size="medium"
        >
          <div className="rebook-delivery-modal">
            <div className="info-message">
              <FaCalendar className="info-icon" />
              <p>Choose a new date and time for your delivery. The driver and staff will be notified of the change.</p>
            </div>
            
            <div className="current-schedule">
              <h5>Current Schedule:</h5>
              <p><strong>Date:</strong> {formatDate(selectedDelivery.DeliveryDate)}</p>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); confirmRebookDelivery(); }}>
              <div className="form-group">
                <label htmlFor="newDeliveryDate">New Delivery Date</label>
                <input
                  type="date"
                  id="newDeliveryDate"
                  value={rebookData.newDate}
                  onChange={(e) => setRebookData(prev => ({ ...prev, newDate: e.target.value }))}
                  className="form-control"
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="newDeliveryTime">Preferred Time</label>
                <select
                  id="newDeliveryTime"
                  value={rebookData.newTime}
                  onChange={(e) => setRebookData(prev => ({ ...prev, newTime: e.target.value }))}
                  className="form-control"
                  required
                >
                  <option value="08:00">8:00 AM</option>
                  <option value="09:00">9:00 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="12:00">12:00 PM</option>
                  <option value="13:00">1:00 PM</option>
                  <option value="14:00">2:00 PM</option>
                  <option value="15:00">3:00 PM</option>
                  <option value="16:00">4:00 PM</option>
                  <option value="17:00">5:00 PM</option>
                </select>
              </div>
              
              <div className="delivery-details">
                <h5>Delivery Details:</h5>
                <div className="detail-row">
                  <strong>Route:</strong> {selectedDelivery.PickupLocation} → {selectedDelivery.DropoffLocation || selectedDelivery.DeliveryAddress}
                </div>
                <div className="detail-row">
                  <strong>Amount:</strong> {formatCurrency(selectedDelivery.DeliveryRate || 0)}
                </div>
              </div>
              
              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setShowRebookModal(false)}
                  className="btn btn-outline-secondary"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-info"
                  disabled={isLoading || !rebookData.newDate || !rebookData.newTime}
                >
                  {isLoading ? 'Rescheduling...' : 'Reschedule Delivery'}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* View Details Modal */}
      {showViewDetailsModal && viewingDelivery && (
        <Modal
          title="Booking Details"
          onClose={() => setShowViewDetailsModal(false)}
          size="large"
        >
          <div className="view-details-modal">
            <div className="details-grid">
              <div className="detail-section">
                <h4>📦 Delivery Information</h4>
                <div className="detail-item">
                  <label>Delivery ID:</label>
                  <span>#{viewingDelivery.DeliveryID}</span>
                </div>
                <div className="detail-item">
                  <label>Status:</label>
                  <span className={`status-badge modern ${viewingDelivery.DeliveryStatus?.toLowerCase()}`}>
                    {viewingDelivery.DeliveryStatus}
                  </span>
                </div>
                <div className="detail-item">
                  <label>Delivery Date:</label>
                  <span>{formatDate(viewingDelivery.DeliveryDate, viewingDelivery)}</span>
                </div>
                <div className="detail-item">
                  <label>Amount:</label>
                  <span className="amount-highlight">{formatCurrency(viewingDelivery.DeliveryRate || viewingDelivery.deliveryRate || 0)}</span>
                </div>
              </div>

              <div className="detail-section">
                <h4>🗺️ Route Information</h4>
                <div className="detail-item">
                  <label>Pickup Location:</label>
                  <span>{viewingDelivery.PickupLocation || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>Dropoff Location:</label>
                  <span>{viewingDelivery.DropoffLocation || viewingDelivery.DeliveryAddress || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>Distance:</label>
                  <span>{viewingDelivery.DeliveryDistance ? `${viewingDelivery.DeliveryDistance} km` : 'N/A'}</span>
                </div>
                {((viewingDelivery.pickupCoordinates && viewingDelivery.dropoffCoordinates) || 
                  (viewingDelivery.PickupCoordinates && viewingDelivery.DropoffCoordinates)) && (
                  <button
                    className="btn btn-outline"
                    onClick={() => {
                      viewDeliveryRoute(viewingDelivery);
                      setShowViewDetailsModal(false);
                    }}
                  >
                    <FaMapMarkerAlt /> View Route on Map
                  </button>
                )}
              </div>

              <div className="detail-section">
                <h4>🚛 Truck & Driver Information</h4>
                <div className="detail-item">
                  <label>Truck Plate:</label>
                  <span>{viewingDelivery.TruckPlate || 'Not Assigned'}</span>
                </div>
                <div className="detail-item">
                  <label>Truck Type:</label>
                  <span>{viewingDelivery.TruckBrand || viewingDelivery.TruckType || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>Driver:</label>
                  <span>{viewingDelivery.DriverName || 'Not Assigned'}</span>
                </div>
                <div className="detail-item">
                  <label>Helper:</label>
                  <span>{viewingDelivery.HelperName || 'Not Assigned'}</span>
                </div>
              </div>

              <div className="detail-section">
                <h4>📞 Contact Information</h4>
                
                <div style={{ marginBottom: '15px' }}>
                  <strong style={{ color: '#2c5282', display: 'block', marginBottom: '8px' }}>📍 Pickup Contact</strong>
                  <div className="detail-item">
                    <label>Contact Person:</label>
                    <span>{viewingDelivery.PickupContactPerson || 'Not specified'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Contact Number:</label>
                    <span>{viewingDelivery.PickupContactNumber || 'N/A'}</span>
                  </div>
                </div>

                <div>
                  <strong style={{ color: '#2c5282', display: 'block', marginBottom: '8px' }}>📍 Dropoff Contact</strong>
                  <div className="detail-item">
                    <label>Contact Person:</label>
                    <span>{viewingDelivery.DropoffContactPerson || 'Not specified'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Contact Number:</label>
                    <span>{viewingDelivery.DropoffContactNumber || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowViewDetailsModal(false)}
              >
                Close
              </button>
              {canModifyDelivery(viewingDelivery) && (
                <>
                  {canRescheduleDelivery(viewingDelivery) && (
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        setShowViewDetailsModal(false);
                        handleRebookDelivery(viewingDelivery);
                      }}
                    >
                      <FaCalendarAlt /> Reschedule
                    </button>
                  )}
                  {canRescheduleDelivery(viewingDelivery) && (
                    <button
                      className="btn btn-outline"
                      onClick={() => {
                        setShowViewDetailsModal(false);
                        handleChangeRoute(viewingDelivery);
                      }}
                    >
                      <FaRoute /> Change Route
                    </button>
                  )}
                  <button
                    className="btn btn-danger"
                    onClick={() => {
                      setShowViewDetailsModal(false);
                      handleCancelDelivery(viewingDelivery);
                    }}
                  >
                    <FaTimes /> Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Truck Details Modal */}
      {showTruckDetailsModal && viewingTruck && (
        <Modal
          title="Truck Details"
          onClose={() => setShowTruckDetailsModal(false)}
          size="medium"
        >
          <div className="view-details-modal">
            <div className="details-grid">
              <div className="detail-section">
                <h4>🚛 Truck Information</h4>
                <div className="detail-item">
                  <label>Truck Plate:</label>
                  <span className="plate-badge">{viewingTruck.TruckPlate}</span>
                </div>
                <div className="detail-item">
                  <label>Type:</label>
                  <span>{viewingTruck.TruckType || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>Brand:</label>
                  <span>{viewingTruck.TruckBrand}</span>
                </div>
                <div className="detail-item">
                  <label>Capacity:</label>
                  <span className="capacity-value">{viewingTruck.TruckCapacity} tons</span>
                </div>
              </div>

              <div className="detail-section">
                <h4>📊 Performance Statistics</h4>
                <div className="detail-item">
                  <label>Total Deliveries:</label>
                  <span className="deliveries-count">{viewingTruck.TotalCompletedDeliveries || 0}</span>
                </div>
                <div className="detail-item">
                  <label>Total Kilometers:</label>
                  <span>{viewingTruck.TotalKilometers || 0} km</span>
                </div>
                <div className="detail-item">
                  <label>Allocation Status:</label>
                  <span>{viewingTruck.allocationStatus || viewingTruck.AllocationStatus || 'Allocated'}</span>
                </div>
                <div className="detail-item">
                  <label>Current Status:</label>
                  <span className={`modern-truck-status-badge ${
                    deliveries.some(
                      delivery => delivery.TruckID === viewingTruck.TruckID && 
                      (delivery.DeliveryStatus === 'pending' || delivery.DeliveryStatus === 'in-progress')
                    ) ? 'busy' : 'available'
                  }`}>
                    {deliveries.some(
                      delivery => delivery.TruckID === viewingTruck.TruckID && 
                      (delivery.DeliveryStatus === 'pending' || delivery.DeliveryStatus === 'in-progress')
                    ) ? 'In Use' : 'Available'}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowTruckDetailsModal(false)}
              >
                Close
              </button>
              {!deliveries.some(
                delivery => delivery.TruckID === viewingTruck.TruckID && 
                (delivery.DeliveryStatus === 'pending' || delivery.DeliveryStatus === 'in-progress')
              ) && (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setShowTruckDetailsModal(false);
                    setShowBookingModal(true);
                  }}
                >
                  <FaCalendarPlus /> Book This Truck
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Modern Toast Notifications */}
      <ModernToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
};

export default ClientProfile;