import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { FaShippingFast, FaCheckCircle, FaClipboardList } from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';
import Loader from '../../components/common/Loader';
import StatusBadge from '../../components/common/StatusBadge';
import '../../styles/DesignSystem.css';

const Dashboard = () => {
  const { authUser } = useContext(AuthContext);
  const [driverData, setDriverData] = useState(null);
  const [activeDeliveries, setActiveDeliveries] = useState([]);
  const [completedDeliveries, setCompletedDeliveries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDriverData = async () => {
      try {
        const [driverRes, deliveriesRes] = await Promise.all([
          axios.get('/api/drivers/profile'),
          axios.get('/api/drivers/deliveries')
        ]);

        setDriverData(driverRes.data);
        
        const active = [];
        const completed = [];
        deliveriesRes.data.forEach(delivery => {
          if (delivery.DeliveryStatus === 'pending' || delivery.DeliveryStatus === 'in-progress') {
            active.push(delivery);
          } else {
            completed.push(delivery);
          }
        });
        
        setActiveDeliveries(active);
        setCompletedDeliveries(completed);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching driver data:', error);
        setIsLoading(false);
      }
    };

    fetchDriverData();
  }, []);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Welcome, {driverData?.driverName || authUser.username}</h1>
      </div>
      
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#F39C12' }}>
            <FaShippingFast size={20} />
          </div>
          <div className="stat-info">
            <h3>{activeDeliveries.length}</h3>
            <p>Active Deliveries</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#2ECC71' }}>
            <FaCheckCircle size={20} />
          </div>
          <div className="stat-info">
            <h3>{completedDeliveries.length}</h3>
            <p>Completed Deliveries</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#0056b3' }}>
            <FaClipboardList size={20} />
          </div>
          <div className="stat-info">
            <h3>{activeDeliveries.length + completedDeliveries.length}</h3>
            <p>Total Deliveries</p>
          </div>
        </div>
      </div>
      
      <div className="dashboard-content">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Active Deliveries</h2>
          </div>
          <div className="card-body">
            {activeDeliveries.length > 0 ? (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Client</th>
                      <th>Helper</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeDeliveries.map(delivery => (
                      <tr key={delivery.DeliveryID || delivery.id}>
                        <td>{delivery.DeliveryID || delivery.id}</td>
                        <td>{delivery.ClientName || delivery.clientName}</td>
                        <td>{delivery.HelperName || delivery.helperName}</td>
                        <td>{new Date(delivery.DeliveryDate || delivery.deliveryDate).toLocaleDateString()}</td>
                        <td><StatusBadge status={delivery.DeliveryStatus || delivery.deliveryStatus} /></td>
                        <td>{delivery.DeliveryAddress || delivery.deliveryAddress}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty-state">No active deliveries assigned to you.</p>
            )}
          </div>
        </div>
        
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Recent Completed Deliveries</h2>
          </div>
          <div className="card-body">
            {completedDeliveries.length > 0 ? (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Client</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Distance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedDeliveries.slice(0, 5).map(delivery => (
                      <tr key={delivery.DeliveryID || delivery.id}>
                        <td>{delivery.DeliveryID || delivery.id}</td>
                        <td>{delivery.ClientName || delivery.clientName}</td>
                        <td>{new Date(delivery.DeliveryDate || delivery.deliveryDate).toLocaleDateString()}</td>
                        <td><StatusBadge status={delivery.DeliveryStatus || delivery.deliveryStatus} /></td>
                        <td>{delivery.DeliveryDistance || delivery.deliveryDistance} km</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty-state">No completed deliveries found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;