import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { FaShippingFast, FaCheckCircle, FaClipboardList } from "react-icons/fa";
import { AuthContext } from "../../context/AuthContext";
import Loader from "../../components/common/Loader";
import StatusBadge from "../../components/common/StatusBadge";

const Dashboard = () => {
  const { authUser } = useContext(AuthContext);
  const [helperData, setHelperData] = useState(null);
  const [activeDeliveries, setActiveDeliveries] = useState([]);
  const [completedDeliveries, setCompletedDeliveries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHelperData = async () => {
      try {
        const [helperRes, deliveriesRes] = await Promise.all([
          axios.get("/api/helpers/profile"),
          axios.get("/api/helpers/deliveries"),
        ]);

        setHelperData(helperRes.data);

        const active = [];
        const completed = [];
        deliveriesRes.data.forEach((delivery) => {
          if (
            delivery.DeliveryStatus === "pending" ||
            delivery.DeliveryStatus === "in-progress"
          ) {
            active.push(delivery);
          } else {
            completed.push(delivery);
          }
        });

        setActiveDeliveries(active);
        setCompletedDeliveries(completed);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching helper data:", error);
        setIsLoading(false);
      }
    };

    fetchHelperData();
  }, []);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="dashboard">
      <h1>Welcome, {helperData?.HelperName || authUser.username}</h1>

      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: "#F39C12" }}>
            <FaShippingFast />
          </div>
          <div className="stat-info">
            <h3>{activeDeliveries.length}</h3>
            <p>Active Deliveries</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: "#2ECC71" }}>
            <FaCheckCircle />
          </div>
          <div className="stat-info">
            <h3>{completedDeliveries.length}</h3>
            <p>Completed Deliveries</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: "#0056b3" }}>
            <FaClipboardList />
          </div>
          <div className="stat-info">
            <h3>{activeDeliveries.length + completedDeliveries.length}</h3>
            <p>Total Deliveries</p>
          </div>
        </div>
      </div>

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
                    <th>Driver</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Address</th>
                  </tr>
                </thead>
                <tbody>
                  {activeDeliveries.map((delivery) => (
                    <tr key={delivery.DeliveryID}>
                      <td>{delivery.DeliveryID}</td>
                      <td>{delivery.ClientName}</td>
                      <td>{delivery.DriverName}</td>
                      <td>
                        {new Date(delivery.DeliveryDate).toLocaleDateString()}
                      </td>
                      <td>
                        <StatusBadge status={delivery.DeliveryStatus} />
                      </td>
                      <td>{delivery.DeliveryAddress}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No active deliveries assigned to you.</p>
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
                  {completedDeliveries.slice(0, 5).map((delivery) => (
                    <tr key={delivery.DeliveryID}>
                      <td>{delivery.DeliveryID}</td>
                      <td>{delivery.ClientName}</td>
                      <td>
                        {new Date(delivery.DeliveryDate).toLocaleDateString()}
                      </td>
                      <td>
                        <StatusBadge status={delivery.DeliveryStatus} />
                      </td>
                      <td>{delivery.DeliveryDistance} km</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No completed deliveries found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
