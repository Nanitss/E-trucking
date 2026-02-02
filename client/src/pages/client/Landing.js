import React, { useState, useEffect, useContext } from "react";
import { useHistory } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";
import {
  FaTruck,
  FaClipboardList,
  FaEye,
  FaUser,
  FaSignOutAlt,
  FaMapMarkerAlt,
  FaPhone,
  FaEnvelope,
} from "react-icons/fa";

const ClientLanding = () => {
  const { authUser, logout } = useContext(AuthContext);
  const history = useHistory();
  const [clientData, setClientData] = useState(null);
  const [allocatedTrucks, setAllocatedTrucks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up axios with token
    const token = localStorage.getItem("token");
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }

    const fetchClientData = async () => {
      try {
        setIsLoading(true);

        // Fetch client profile
        const profileRes = await axios.get("/api/clients/profile");
        setClientData(profileRes.data);

        // Fetch allocated trucks
        const trucksRes = await axios.get("/api/clients/profile/trucks");
        setAllocatedTrucks(trucksRes.data || []);

        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching client data:", error);
        setIsLoading(false);
      }
    };

    fetchClientData();
  }, []);

  // Redirect to profile page since we now have sidebar navigation
  useEffect(() => {
    const timer = setTimeout(() => {
      history.push("/client/profile");
    }, 2000);

    return () => clearTimeout(timer);
  }, [history]);

  const handleLogout = () => {
    logout();
    history.push("/login");
  };

  return (
    <div className="landing-container">
      <div className="landing-header">
        <div className="header-content">
          <div className="user-info">
            <div className="user-avatar">
              <FaUser />
            </div>
            <div className="user-details">
              <h1>
                Welcome,{" "}
                {clientData?.ClientName || authUser?.username || "Client"}!
              </h1>
              <p>Client Dashboard</p>
            </div>
          </div>
          <div className="header-actions">
            <button onClick={handleLogout} className="logout-btn">
              <FaSignOutAlt /> Logout
            </button>
          </div>
        </div>
      </div>

      <div className="landing-content">
        <div className="welcome-section">
          <h2>Welcome to Your Trucking Dashboard</h2>
          <p>
            Redirecting you to your comprehensive dashboard with all your
            trucking services...
          </p>

          <div className="loading-indicator">
            <div className="loading-spinner"></div>
            <span>Loading your dashboard...</span>
          </div>

          <div className="quick-info">
            <div className="info-card">
              <FaTruck />
              <div>
                <h3>{allocatedTrucks.length}</h3>
                <p>Allocated Trucks</p>
              </div>
            </div>

            <div className="info-card">
              <FaClipboardList />
              <div>
                <h3>Ready</h3>
                <p>To Book</p>
              </div>
            </div>

            <div className="info-card">
              <FaEye />
              <div>
                <h3>Track</h3>
                <p>Your Orders</p>
              </div>
            </div>
          </div>

          <div className="manual-redirect">
            <p>
              Taking too long?
              <button
                onClick={() => history.push("/client/profile")}
                className="link-btn"
              >
                Click here to go to your dashboard
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientLanding;
