import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { FaUsers, FaTruck, FaShippingFast, FaFileAlt, FaDollarSign, FaChartBar, FaSignOutAlt } from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';
import Loader from '../../components/common/Loader';
import './Dashboard.css';
import '../../styles/DesignSystem.css';

const Dashboard = () => {
  // Fix: Change authUser to currentUser 
  const { currentUser } = useContext(AuthContext);
  const [staffData, setStaffData] = useState(null);
  const [stats, setStats] = useState({
    clients: 0,
    trucks: 0,
    deliveries: 0,
    pendingDeliveries: 0
  });
  const [recentClients, setRecentClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStaffData = async () => {
      try {
        setIsLoading(true);
        
        const [staffRes, statsRes, clientsRes] = await Promise.all([
          axios.get('/api/staffs/profile'),
          axios.get('/api/staffs/stats'),
          axios.get('/api/staffs/recent-clients')
        ]);

        setStaffData(staffRes.data);
        setStats(statsRes.data);
        setRecentClients(clientsRes.data);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setIsLoading(false);
        
        // Show error message instead of using mock data
        setStaffData({
          StaffName: currentUser?.username || 'Staff Member',
          StaffDepartment: 'Customer Service',
          StaffStatus: 'Active',
          StaffEmploymentDate: new Date().toISOString()
        });
        
        setStats({
          clients: 0,
          trucks: 0,
          deliveries: 0,
          pendingDeliveries: 0
        });
        
        setRecentClients([]);
      }
    };

    fetchStaffData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    window.location.href = '/login';
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="staff-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="staff-info">
            <div className="staff-avatar">
              <FaUsers />
            </div>
            <div className="staff-details">
              <h1>Welcome, {staffData?.StaffName && staffData.StaffName !== 'Staff Member' ? staffData.StaffName : (currentUser?.username || 'John Smith')}</h1>
              <p className="staff-role">Staff Dashboard - {staffData?.StaffDepartment || 'Customer Service'}</p>
            </div>
          </div>
          <div className="header-actions">
            <button onClick={handleLogout} className="btn btn-outline">
              <FaSignOutAlt /> Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="dashboard-content">
        {/* Statistics Cards */}
        <div className="stats-section">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon bg-blue">
                <FaUsers />
              </div>
              <div className="stat-details">
                <h3>{stats.clients}</h3>
                <p>Total Clients</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon bg-green">
                <FaTruck />
              </div>
              <div className="stat-details">
                <h3>{stats.trucks}</h3>
                <p>Total Trucks</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon bg-purple">
                <FaShippingFast />
              </div>
              <div className="stat-details">
                <h3>{stats.deliveries}</h3>
                <p>Total Deliveries</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon bg-orange">
                <FaShippingFast />
              </div>
              <div className="stat-details">
                <h3>{stats.pendingDeliveries}</h3>
                <p>Pending Deliveries</p>
              </div>
            </div>
          </div>
        </div>

        {/* Management Tools */}
        <div className="management-section">
          <div className="section-header">
            <h2>Staff Management Tools</h2>
            <p>Access your management tools and resources</p>
          </div>
          
          <div className="tools-grid">
            <Link to="/staff/vehicle-rates" className="tool-card">
              <div className="tool-icon">
                <FaDollarSign />
              </div>
              <div className="tool-content">
                <h3>Vehicle Rate Management</h3>
                <p>Manage per-kilometer rates for different vehicle types used in booking calculations</p>
              </div>
            </Link>
            
            <Link to="/staff/reports" className="tool-card">
              <div className="tool-icon">
                <FaChartBar />
              </div>
              <div className="tool-content">
                <h3>Reports & Analytics</h3>
                <p>Generate detailed reports on deliveries, truck utilization, and operational statistics</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Content Grid */}
        <div className="content-grid">
          {/* Recent Clients */}
          <div className="content-card">
            <div className="card-header">
              <h3>Recent Clients</h3>
              <Link to="/staff/reports" className="btn btn-primary btn-sm">
                <FaFileAlt /> View Reports
              </Link>
            </div>
            <div className="card-body">
              {recentClients.length > 0 ? (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Contact</th>
                        <th>Email</th>
                        <th>Creation Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentClients.map(client => (
                        <tr key={client.ClientID}>
                          <td>{client.ClientName}</td>
                          <td>{client.ClientNumber}</td>
                          <td>{client.ClientEmail}</td>
                          <td>{new Date(client.ClientCreationDate).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <FaUsers />
                  <p>No recent clients found.</p>
                </div>
              )}
            </div>
          </div>

          {/* Department Information */}
          <div className="content-card">
            <div className="card-header">
              <h3>Department Information</h3>
            </div>
            <div className="card-body">
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-label">Department:</div>
                  <div className="info-value">{staffData?.StaffDepartment || 'Not assigned'}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Status:</div>
                  <div className="info-value">
                    <span className="status-badge active">{staffData?.StaffStatus || 'Active'}</span>
                  </div>
                </div>
                <div className="info-item">
                  <div className="info-label">Employment Date:</div>
                  <div className="info-value">
                    {staffData?.StaffEmploymentDate 
                      ? new Date(staffData.StaffEmploymentDate).toLocaleDateString()
                      : 'Not available'}
                  </div>
                </div>
              </div>
              
              <div className="department-message">
                <h4>Welcome to E-Trucking Staff Dashboard</h4>
                <p>Here you can view client data, manage vehicle rates, generate reports, and access your management tools.</p>
                <p>If you have any questions or need assistance, please contact your supervisor.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;