// src/pages/admin/Dashboard.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { 
  TbTruckDelivery,
  TbUsers,
  TbPackage,
  TbCurrencyDollar,
  TbEye,
  TbClock,
  TbCircleCheck,
  TbChartLine,
  TbActivity,
  TbPlus,
  TbFilter,
  TbBuilding,
  TbUserCheck,
  TbTruck,
  TbFileText,
  TbSettings,
  TbTrendingUp,
  TbAlertCircle,
  TbCircleX,
  TbBell,
  TbMail,
  TbSearch,
  TbDownload,
  TbCalendar,
  TbChevronDown,
  TbMapPin,
  TbPhone,
  TbMessage,
  TbArrowUp,
  TbArrowDown,
  TbDots,
  TbChevronLeft,
  TbChevronRight
} from 'react-icons/tb';
import '../../styles/ModernForms.css';
import '../../styles/DesignSystem.css';
import './Dashboard.css';
import AdminHeader from '../../components/common/AdminHeader';

const Dashboard = ({ currentUser }) => {
  const location = useLocation();
  
  const [stats, setStats] = useState({
    trucks: 0,
    drivers: 0,
    deliveries: 0,
    revenue: 0
  });
  
  // Header counts state
  const [headerCounts, setHeaderCounts] = useState({
    trucks: 0,
    drivers: 0,
    helpers: 0,
    staff: 0,
    clients: 0,
    deliveries: 0,
    pendingDeliveries: 0,
    unreadNotifications: 0
  });
  
  const [deliveryStats, setDeliveryStats] = useState({
    pending: 0,
    inProgress: 0,
    completed: 0
  });
  
  const [recentActivity, setRecentActivity] = useState([]);
  const [filteredActivity, setFilteredActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [availableActions, setAvailableActions] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [totalDeliveries, setTotalDeliveries] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeframe, setTimeframe] = useState('Dec 2023');
  const [shipmentsData, setShipmentsData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [chartPeriod, setChartPeriod] = useState('daily'); // daily, weekly, monthly
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'delivered': return 'text-green-600 bg-green-100';
      case 'in transit': return 'text-blue-600 bg-blue-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'processing': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // Process deliveries into chart data
  const processChartData = (deliveries, period) => {
    console.log('📊 Processing chart data:', { 
      deliveriesCount: deliveries?.length, 
      period,
      sampleDelivery: deliveries?.[0]
    });

    if (!deliveries || deliveries.length === 0) {
      console.log('⚠️ No deliveries to process');
      setChartData([]);
      return;
    }

    const now = new Date();
    const dateCounts = {};

    deliveries.forEach((delivery, index) => {
      // Log first delivery to see structure
      if (index === 0) {
        console.log('📦 First delivery structure:', {
          deliveryDate: delivery.deliveryDate,
          deliveryDateType: typeof delivery.deliveryDate,
          DeliveryDate: delivery.DeliveryDate,
          DeliveryDateType: typeof delivery.DeliveryDate,
          scheduledDate: delivery.scheduledDate,
          created_at: delivery.created_at,
          CreatedAt: delivery.CreatedAt,
          CreatedAtType: typeof delivery.CreatedAt,
          allKeys: Object.keys(delivery).filter(key => key.toLowerCase().includes('date') || key.toLowerCase().includes('created'))
        });
      }

      let deliveryDate;
      
      // Helper function to parse various date formats
      const parseDate = (dateValue) => {
        // Handle null, undefined, or empty string
        if (!dateValue || dateValue === '') return null;
        
        try {
          // Firestore Timestamp object with seconds
          if (typeof dateValue === 'object' && dateValue !== null && 'seconds' in dateValue) {
            const parsed = new Date(dateValue.seconds * 1000);
            return !isNaN(parsed.getTime()) ? parsed : null;
          }
          
          // Firestore Timestamp with toDate method
          if (typeof dateValue === 'object' && dateValue !== null && typeof dateValue.toDate === 'function') {
            const parsed = dateValue.toDate();
            return !isNaN(parsed.getTime()) ? parsed : null;
          }
          
          // String or number
          if (typeof dateValue === 'string' || typeof dateValue === 'number') {
            const parsed = new Date(dateValue);
            // Check if valid date
            return !isNaN(parsed.getTime()) ? parsed : null;
          }
        } catch (error) {
          console.log('Error parsing date:', error, dateValue);
        }
        
        return null;
      };

      // Try deliveryDate field (both lowercase and PascalCase)
      deliveryDate = parseDate(delivery.deliveryDate) || parseDate(delivery.DeliveryDate);
      
      // Try scheduledDate field
      if (!deliveryDate) {
        deliveryDate = parseDate(delivery.scheduledDate) || parseDate(delivery.ScheduledDate);
      }
      
      // Try created_at field (both snake_case and PascalCase)
      if (!deliveryDate) {
        deliveryDate = parseDate(delivery.created_at) || parseDate(delivery.CreatedAt);
      }

      // If still no date found, log and skip
      if (!deliveryDate || isNaN(deliveryDate.getTime())) {
        console.log(`⚠️ Delivery ${index} has no valid date field or invalid date`);
        return;
      }

      if (index === 0) {
        console.log('📅 Sample delivery date:', deliveryDate);
      }

      let dateKey;
      if (period === 'daily') {
        dateKey = deliveryDate.getDate(); // Day of month
      } else if (period === 'weekly') {
        const weekStart = new Date(deliveryDate);
        weekStart.setDate(deliveryDate.getDate() - deliveryDate.getDay());
        dateKey = `Week ${Math.ceil(deliveryDate.getDate() / 7)}`;
      } else { // monthly
        dateKey = `${deliveryDate.toLocaleDateString('en-US', { month: 'short' })} ${deliveryDate.getFullYear()}`;
      }

      dateCounts[dateKey] = (dateCounts[dateKey] || 0) + 1;
    });

    console.log('📊 Date counts:', dateCounts);

    // Convert to array and sort
    let chartArray = Object.entries(dateCounts).map(([label, count]) => ({
      label,
      count,
      percentage: 0 // Will calculate below
    }));

    // For daily view, ensure we show last 10 days
    if (period === 'daily') {
      const last10Days = [];
      for (let i = 9; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const day = date.getDate();
        last10Days.push({
          label: day.toString(),
          count: dateCounts[day] || 0,
          percentage: 0
        });
      }
      chartArray = last10Days;
    } else if (period === 'monthly') {
      // For monthly view, show last 12 months
      const last12Months = [];
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = `${date.toLocaleDateString('en-US', { month: 'short' })} ${date.getFullYear()}`;
        last12Months.push({
          label: date.toLocaleDateString('en-US', { month: 'short' }),
          count: dateCounts[monthKey] || 0,
          percentage: 0
        });
      }
      chartArray = last12Months;
    }

    // Calculate percentages for bar heights
    const maxCount = Math.max(...chartArray.map(d => d.count), 1);
    chartArray = chartArray.map(d => ({
      ...d,
      percentage: d.count > 0 ? Math.max((d.count / maxCount) * 100, 10) : 0 // Minimum 10% height for visibility when count > 0
    }));

    console.log('📊 Final chart data:', chartArray);
    setChartData(chartArray);
  };

  // Handle chart period change
  const handleChartPeriodChange = async (e) => {
    const newPeriod = e.target.value.toLowerCase();
    setChartPeriod(newPeriod);
    
    // Re-fetch and reprocess data
    try {
      const deliveriesResponse = await axios.get('/api/deliveries');
      processChartData(deliveriesResponse.data || [], newPeriod);
    } catch (error) {
      console.error('Error fetching deliveries for chart:', error);
    }
  };

  // Fetch header counts (same as header functionality)
  const fetchHeaderCounts = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const axiosWithAuth = axios.create({ headers });
      
      const requests = [
        axiosWithAuth.get('/api/trucks').catch(err => ({ data: [] })),
        axiosWithAuth.get('/api/drivers').catch(err => ({ data: [] })),
        axiosWithAuth.get('/api/helpers').catch(err => ({ data: [] })),
        axiosWithAuth.get('/api/staffs').catch(err => ({ data: [] })),
        axiosWithAuth.get('/api/clients').catch(err => ({ data: [] })),
        axiosWithAuth.get('/api/deliveries').catch(err => ({ data: [] })),
        axiosWithAuth.get('/api/deliveries/status/pending').catch(err => ({ data: [] }))
      ];
      
      const [
        trucksRes,
        driversRes, 
        helpersRes,
        staffRes,
        clientsRes,
        deliveriesRes,
        pendingDeliveriesRes
      ] = await Promise.all(requests);

      setHeaderCounts({
        trucks: trucksRes.data.length || 0,
        drivers: driversRes.data.filter(d => d.DriverStatus === 'active' || d.driverStatus === 'active').length || 0,
        helpers: helpersRes.data.filter(h => h.HelperStatus === 'active' || h.helperStatus === 'active').length || 0,
        staff: staffRes.data.filter(s => s.StaffStatus === 'active' || s.staffStatus === 'active').length || 0,
        clients: clientsRes.data.filter(c => c.ClientStatus === 'active' || c.clientStatus === 'active').length || 0,
        deliveries: deliveriesRes.data.length || 0,
        pendingDeliveries: pendingDeliveriesRes.data.length || 0,
        unreadNotifications: 3
      });
    } catch (error) {
      console.error('Error fetching header counts:', error);
    }
  }, []);

  // Check if a menu item is active
  const isActive = (path) => {
    return location.pathname.startsWith(path) ? 'active' : '';
  };
  
  // Handle filter changes
  const handleActionFilterChange = (e) => {
    setActionFilter(e.target.value);
  };
  
  const handleUserFilterChange = (e) => {
    setUserFilter(e.target.value);
  };
  
  const resetFilters = () => {
    setActionFilter('');
    setUserFilter('');
  };
  
  // Apply filters
  useEffect(() => {
    if (recentActivity.length > 0) {
      let filtered = [...recentActivity];
      
      if (actionFilter) {
        filtered = filtered.filter(activity => activity.action === actionFilter);
      }
      
      if (userFilter) {
        filtered = filtered.filter(activity => activity.user === userFilter);
      }
      
      setFilteredActivity(filtered);
    }
  }, [recentActivity, actionFilter, userFilter]);
  
  // Extract available filters from data
  useEffect(() => {
    if (recentActivity.length > 0) {
      const actions = [...new Set(recentActivity.map(activity => activity.action))].filter(Boolean);
      const users = [...new Set(recentActivity.map(activity => activity.user))].filter(Boolean);
      
      setAvailableActions(actions);
      setAvailableUsers(users);
    }
  }, [recentActivity]);
  
  // Load dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch audit trail data - request more entries
        const activityResponse = await axios.get('/api/audit/recent?limit=30');
        
        // Fetch pending deliveries
        const pendingResponse = await axios.get('/api/deliveries/status/pending');
        
        // Fetch in-progress deliveries
        const inProgressResponse = await axios.get('/api/deliveries/status/in-progress');
        
        // Fetch completed deliveries
        const completedResponse = await axios.get('/api/deliveries/status/completed');
        
        // Fetch active trucks
        const trucksResponse = await axios.get('/api/trucks');
        
        // Fetch active drivers
        const driversResponse = await axios.get('/api/drivers');
        
        // Fetch all deliveries
        const deliveriesResponse = await axios.get('/api/deliveries');
        
        // Set total deliveries count (ALL statuses)
        setTotalDeliveries(deliveriesResponse.data.length || 0);
        
        // Fetch shipments data for the table
        const shipmentsResponse = await axios.get('/api/deliveries?limit=60');
        setShipmentsData(shipmentsResponse.data || []);
        
        // Process deliveries for chart
        processChartData(deliveriesResponse.data || [], chartPeriod);
        
        // Fetch header counts
        await fetchHeaderCounts();
        
        // Update delivery stats
        setDeliveryStats({
          pending: pendingResponse.data.length || 0,
          inProgress: inProgressResponse.data.length || 0,
          completed: completedResponse.data.length || 0
        });
        
        // Calculate total revenue from ALL paid payments
        let totalRevenue = 0;
        try {
          const paymentsResponse = await axios.get('/api/payments/successful');
          
          // Sum ALL paid payments (no date filtering)
          totalRevenue = paymentsResponse.data.reduce((total, payment) => {
            return total + (parseFloat(payment.amount) || 0);
          }, 0);
          
          console.log(`💰 Total revenue from ${paymentsResponse.data.length} paid payments: ₱${totalRevenue}`);
        } catch (paymentError) {
          console.error('Error fetching payments:', paymentError);
          // If payment API fails, calculate from deliveries with paid status
          try {
            const deliveriesResponse = await axios.get('/api/deliveries');
            const paidDeliveries = deliveriesResponse.data.filter(d => 
              d.paymentStatus === 'paid' || d.PaymentStatus === 'paid'
            );
            totalRevenue = paidDeliveries.reduce((total, delivery) => {
              const amount = parseFloat(delivery.deliveryRate) || 
                           parseFloat(delivery.DeliveryRate) || 
                           parseFloat(delivery.amount) || 0;
              return total + amount;
            }, 0);
            console.log(`💰 Total revenue from ${paidDeliveries.length} paid deliveries: ₱${totalRevenue}`);
          } catch (deliveryError) {
            console.error('Error fetching deliveries for revenue:', deliveryError);
          }
        }
        
        // Update overall stats
        setStats({
          trucks: trucksResponse.data.length || 0,
          drivers: driversResponse.data.filter(d => d.DriverStatus === 'active').length || 0,
          deliveries: (pendingResponse.data.length || 0) + (inProgressResponse.data.length || 0),
          revenue: totalRevenue
        });
        
        // Update activity feed
        const activityData = activityResponse.data || [];
        setRecentActivity(activityData);
        setFilteredActivity(activityData);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
        setLoading(false);
        
        // Set empty data instead of demo data
        setRecentActivity([]);
        setFilteredActivity([]);
        setAvailableActions([]);
        setAvailableUsers([]);
        setTotalDeliveries(0);
        
        // Show zero stats on error
        setDeliveryStats({
          pending: 0,
          inProgress: 0,
          completed: 0
        });
        
        setStats({
          trucks: 0,
          drivers: 0,
          deliveries: 0,
          revenue: 0
        });
      }
    };
    
    fetchDashboardData();
  }, []);
  
  // Note: totalDeliveries is now set directly from /api/deliveries response
  // to include ALL delivery statuses (pending, in-progress, completed, cancelled, etc.)
  
  // Show loading state if currentUser is not yet loaded
  if (!currentUser) {
    return (
      <div className="admin-page-container">
        <div className="modern-loading" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
          <div className="loading-spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="admin-page-container">
      <AdminHeader currentUser={currentUser} />
    
    <div className="admin-content">
      {/* Main Content */}
      <div className="dashboard-content">
        {/* Greeting and Summary Cards */}
        <div className="greeting-section">
          <h2 className="greeting-text">Hello {currentUser?.username || 'Admin'}, Good Morning</h2>
          
          <div className="summary-cards">
            <div className="summary-card">
              <div className="card-icon">
                <TbPackage size={24} />
              </div>
              <div className="card-content">
                <div className="card-value">{totalDeliveries || 0}</div>
                <div className="card-label">Total Shipments</div>
                <div className="card-change positive">
                  <TbArrowUp size={12} />
                  +1.92%
                </div>
              </div>
            </div>
            
            <div className="summary-card">
              <div className="card-icon">
                <TbClock size={24} />
              </div>
              <div className="card-content">
                <div className="card-value">{deliveryStats.pending}</div>
                <div className="card-label">Pending Package</div>
                <div className="card-change positive">
                  <TbArrowUp size={12} />
                  +1.89%
                </div>
              </div>
            </div>
            
            <div className="summary-card">
              <div className="card-icon">
                <TbTruckDelivery size={24} />
              </div>
              <div className="card-content">
                <div className="card-value">{deliveryStats.completed}</div>
                <div className="card-label">Delivery Shipments</div>
                <div className="card-change negative">
                  <TbArrowDown size={12} />
                  -0.98%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Widgets */}
        <div className="analytics-widgets">
          {/* Shipments Statistics */}
          <div className="widget shipments-stats">
            <div className="widget-header">
              <h3>Shipments Statistics</h3>
              <p>Total number of deliveries: {totalDeliveries || 0}</p>
            </div>
            <div className="widget-filters">
              <div className="filter-dots">
                <span className="dot active"></span>
                <span className="dot"></span>
              </div>
              <select className="filter-select" onChange={handleChartPeriodChange} value={chartPeriod}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="chart-container">
              <div className="chart-placeholder">
                {chartData.length > 0 ? (
                  <>
                    <div className="chart-bars">
                      {chartData.map((data, index) => (
                        <div key={index} className="chart-bar" style={{height: `${data.percentage}%`}}>
                          <div className="bar shipment" title={`${data.count} deliveries`}></div>
                          <div className="bar delivery"></div>
                        </div>
                      ))}
                    </div>
                    <div className="chart-labels">
                      {chartData.map((data, index) => (
                        <span key={index}>{data.label}</span>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                    No delivery data available
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Revenue Overview */}
          <div className="widget revenue-overview">
            <div className="widget-header">
              <h3>Analytic view - Total shipping revenue overview</h3>
            </div>
            <div className="revenue-content">
              <div className="revenue-amount">{formatCurrency(stats.revenue)}</div>
              <div className="revenue-change positive">
                Total from all paid deliveries
              </div>
            </div>
          </div>

          {/* Tracking Delivery */}
          <div className="widget tracking-delivery">
            <div className="widget-header">
              <h3>Tracking Delivery - Last viewed delivery history</h3>
            </div>
            <div className="tracking-content">
              {shipmentsData.length > 0 ? (
                <>
                  <div className="tracking-id">
                    <span>Tracking ID #{shipmentsData[0].id || shipmentsData[0].DeliveryID || 'N/A'}</span>
                    <span className={`status-badge ${getStatusColor(shipmentsData[0].status || shipmentsData[0].deliveryStatus || 'pending')}`}>
                      {shipmentsData[0].status || shipmentsData[0].deliveryStatus || 'Pending'}
                    </span>
                  </div>
                  <div className="tracking-timeline">
                    <div className="timeline-item completed">
                      <div className="timeline-dot"></div>
                      <div className="timeline-content">
                        <span>
                          {formatDate(shipmentsData[0].created_at || shipmentsData[0].CreatedAt)} Created
                        </span>
                      </div>
                    </div>
                    <div className={`timeline-item ${shipmentsData[0].driverAcceptedAt || shipmentsData[0].DriverAcceptedAt ? 'completed' : ''}`}>
                      <div className="timeline-dot"></div>
                      <div className="timeline-content">
                        <span>
                          {shipmentsData[0].driverAcceptedAt || shipmentsData[0].DriverAcceptedAt 
                            ? `${formatDate(shipmentsData[0].driverAcceptedAt || shipmentsData[0].DriverAcceptedAt)} Driver Accepted`
                            : 'Waiting for driver acceptance'}
                        </span>
                      </div>
                    </div>
                    <div className="timeline-item">
                      <div className="timeline-dot"></div>
                      <div className="timeline-content">
                        <span>
                          {shipmentsData[0].deliveryDate || shipmentsData[0].DeliveryDate
                            ? `${formatDate(shipmentsData[0].deliveryDate || shipmentsData[0].DeliveryDate)} Delivery`
                            : 'Awaiting delivery'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="courier-info">
                    <div className="courier-avatar">
                      {(shipmentsData[0].driverName || shipmentsData[0].DriverName)?.charAt(0) || 'D'}
                    </div>
                    <div className="courier-details">
                      <span className="courier-name">
                        {shipmentsData[0].driverName || shipmentsData[0].DriverName || 'No driver assigned'}
                      </span>
                      <span className="courier-role">Driver</span>
                    </div>
                    <div className="courier-actions">
                      <TbPhone size={16} />
                      <TbMessage size={16} />
                    </div>
                  </div>
                </>
              ) : (
                <p style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  No delivery data available
                </p>
              )}
            </div>
          </div>

          {/* Delivery Vehicles */}
          <div className="widget delivery-vehicles">
            <div className="widget-header">
              <h3>Delivery Vehicles - Vehicles operating on the road</h3>
            </div>
            <div className="vehicles-content">
              <div className="vehicles-count">{stats.trucks}</div>
              <div className="vehicles-change positive">
                <TbArrowUp size={16} />
                +2.29% than last week
              </div>
              <div className="vehicle-image">
                <TbTruck size={48} />
              </div>
              <div className="vehicle-status">
                <div className="status-indicator"></div>
                <span>On-Route</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Dashboard;