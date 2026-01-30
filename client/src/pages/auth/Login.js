import React, { useState, useContext } from "react";
import { useHistory } from "react-router-dom";
import axios from "axios";
import "./login.css";
import "../../styles/DesignSystem.css";
import { AuthContext } from "../../context/AuthContext";

const Login = () => {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const history = useHistory();
  const { login } = useContext(AuthContext);

  // Background styles
  const leftBackgroundStyle = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "50%",
    height: "100%",
    backgroundImage: `url(${process.env.PUBLIC_URL}/images/truck-background.jpg), linear-gradient(135deg, #0a2463 0%, #1e3a8a 100%)`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    zIndex: 1,
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      console.log("Attempting to log in with:", {
        username: formData.username,
        passwordLength: formData.password?.length || 0,
      });

      // Fallback to direct axios login if AuthContext is not available
      if (!login) {
        console.log(
          "AuthContext login function not available, using direct axios call",
        );
        // First make login request
        const loginRes = await axios({
          method: "POST",
          url: "http://localhost:5007/api/auth/login",
          data: {
            username: formData.username.trim(),
            password: formData.password,
          },
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: false,
          cache: "no-cache",
        });

        console.log("Login response:", loginRes.data);
        const { token } = loginRes.data;
        if (!token) {
          throw new Error("Invalid response from server");
        }

        // Store token
        localStorage.setItem("token", token);
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

        // Now get user data with the token
        console.log("Getting user data with token");
        const userRes = await axios.get(
          "http://localhost:5007/api/auth/current-user",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        console.log("User data response:", userRes.data);
        const user = userRes.data;
        localStorage.setItem("currentUser", JSON.stringify(user));

        // explicit role‐based redirect
        console.log("Redirecting based on role:", user.role);
        if (user.role === "admin") {
          history.push("/admin/dashboard");
        } else if (user.role === "staff") {
          history.push("/staff/vehicle-rates");
        } else if (user.role === "client") {
          history.push("/client/landing");
        } else if (user.role === "driver") {
          history.push("/driver/dashboard");
        } else if (user.role === "helper") {
          history.push("/helper/dashboard");
        } else if (user.role === "operator") {
          history.push("/operator/delivery-assignment");
        } else {
          setError("Unknown role. Please contact support.");
          history.push("/login");
        }
      } else {
        // Use the AuthContext login function
        console.log("Using AuthContext login function");
        const result = await login({
          username: formData.username,
          password: formData.password,
        });

        console.log("AuthContext login result:", result);

        if (result.success) {
          // Redirect based on role
          const role = result.role;
          console.log("Login successful, role:", role);
          if (role === "admin") {
            history.push("/admin/dashboard");
          } else if (role === "staff") {
            history.push("/staff/vehicle-rates");
          } else if (role === "client") {
            history.push("/client/landing");
          } else if (role === "driver") {
            history.push("/driver/dashboard");
          } else if (role === "helper") {
            history.push("/helper/dashboard");
          } else if (role === "operator") {
            history.push("/operator/delivery-assignment");
          } else {
            setError("Unknown role. Please contact support.");
            history.push("/login");
          }
        } else {
          console.log("Login failed:", result.message);
          setError(result.message || "Login failed. Please try again.");
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      let errorMessage = "Login failed. Please try again.";
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.status === 403) {
        errorMessage = "Account is inactive. Please contact administrator.";
      } else if (!err.response) {
        errorMessage = "Network error. Please check your connection.";
      }
      console.error("Login error details:", {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
      });
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const Loader = () => <div className="loader-small" />;

  return (
    <div className="auth-container">
      {/* Left Side - Hero Section */}
      <div className="auth-hero">
        {/* Logo in top left */}
        <div className="hero-logo">
          <div className="logo-badge">ET</div>
          <div>
            <div className="logo-text">E-TRUCKING</div>
            <div className="logo-subtitle">Fleet Management System</div>
          </div>
        </div>

        {/* Hero Content */}
        <div className="hero-content">
          <h1 className="hero-title">
            Manage Your <span className="highlight">Fleet</span>
            <br />
            With Professional
            <br />
            Trucking Solutions.
          </h1>
        </div>

        {/* Hero Illustration */}
        <div className="hero-illustration">
          <div className="illustration-scene">
            <div className="truck-element main-truck">🚛</div>
            <div className="truck-element delivery-box">📦</div>
            <div className="truck-element route-pin">📍</div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="auth-form-container">
        <div className="auth-card">
          <div className="auth-header">
            <h2>Welcome Back</h2>
            <p>Sign in to your E-Trucking dashboard</p>
          </div>

          {error && <div className="error-alert">{error}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                required
                disabled={isLoading}
                placeholder="Enter your username"
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-field">
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button type="button" className="password-toggle">
                  👁️
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="login-button">
              {isLoading ? (
                <>
                  <Loader />
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>Need an account? Contact your administrator</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
