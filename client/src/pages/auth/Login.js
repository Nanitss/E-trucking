import React, { useState, useContext } from "react";
import { useHistory, Link } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";
import { FaTruck, FaEye, FaEyeSlash, FaLock, FaUser } from "react-icons/fa";

// Configure the base URL for API requests - same pattern as AuthContext
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5007'
  : '';

// Helper to get the correct API path
const getApiPath = (path) => {
  const cleanPath = path.startsWith('/api') ? path : `/api${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

const Login = () => {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const history = useHistory();
  const { login } = useContext(AuthContext);

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
          url: getApiPath('/auth/login'),
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
          getApiPath('/auth/current-user'),
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans">
      <div className="flex w-full min-h-screen bg-white shadow-2xl overflow-hidden">

        {/* Left Side - Hero Section */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-blue-900 items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={`${process.env.PUBLIC_URL}/images/truck-background.jpg`}
              alt="Logistics Background"
              className="w-full h-full object-cover opacity-30"
              onError={(e) => {
                e.target.style.display = 'none'; // Hide if fails
                e.target.parentNode.style.backgroundColor = '#1e3a8a'; // Fallback color
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 to-black/60"></div>
          </div>

          <div className="relative z-10 p-12 text-white max-w-lg">
            <div className="flex items-center gap-3 mb-8 animate-fade-in-up">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center shadow-lg">
                <FaTruck className="text-2xl text-white" />
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight">E-TRUCKING</h2>
            </div>

            <h1 className="text-5xl font-bold leading-tight mb-6 animate-fade-in-up animation-delay-150">
              Manage Your <span className="text-blue-400">Fleet</span> With Confidence
            </h1>

            <p className="text-lg text-blue-100 mb-8 leading-relaxed animate-fade-in-up animation-delay-300">
              Access real-time tracking, automated dispatching, and comprehensive analytics all in one secure platform.
            </p>

            <div className="grid grid-cols-2 gap-4 animate-fade-in-up animation-delay-450">
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                <div className="text-2xl font-bold text-blue-300 mb-1">500+</div>
                <div className="text-sm text-gray-300">Trucks Managed</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                <div className="text-2xl font-bold text-blue-300 mb-1">10k+</div>
                <div className="text-sm text-gray-300">Deliveries Completed</div>
              </div>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white relative">
          <div className="w-full max-w-md space-y-8 animate-fade-in">
            <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
              <FaTruck className="text-3xl text-blue-600" />
              <span className="text-2xl font-extrabold text-gray-900">E-TRUCKING</span>
            </div>

            <div className="text-center lg:text-left">
              <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Welcome Back</h2>
              <p className="mt-2 text-sm text-gray-600">
                Please sign in to access your dashboard
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md animate-pulse">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaUser className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      required
                      className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all sm:text-sm bg-gray-50 focus:bg-white"
                      placeholder="Enter your username"
                      value={formData.username}
                      onChange={handleChange}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaLock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      className="appearance-none block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all sm:text-sm bg-gray-50 focus:bg-white"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleChange}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <FaEyeSlash className="h-5 w-5" /> : <FaEye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 cursor-pointer">
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <a href="#" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
                    Forgot password?
                  </a>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-md hover:shadow-lg transform active:scale-[0.98] ${isLoading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5"
                    }`}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing In...
                    </div>
                  ) : (
                    "Sign In"
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                © 2025 E-Trucking Management System. All rights reserved.
              </p>
              <Link to="/" className="inline-block mt-4 text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
