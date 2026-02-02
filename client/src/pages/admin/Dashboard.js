// src/pages/admin/Dashboard.js
import React, { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";
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
  TbChevronRight,
} from "react-icons/tb";
import AdminHeader from "../../components/common/AdminHeader";

const Dashboard = ({ currentUser }) => {
  const location = useLocation();

  const [stats, setStats] = useState({
    trucks: 0,
    drivers: 0,
    deliveries: 0,
    revenue: 0,
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
    unreadNotifications: 0,
  });

  const [deliveryStats, setDeliveryStats] = useState({
    pending: 0,
    inProgress: 0,
    completed: 0,
  });

  const [recentActivity, setRecentActivity] = useState([]);
  const [filteredActivity, setFilteredActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionFilter, setActionFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [availableActions, setAvailableActions] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [totalDeliveries, setTotalDeliveries] = useState(0);
  const [activeTab, setActiveTab] = useState("overview");
  const [timeframe, setTimeframe] = useState("Dec 2023");
  const [shipmentsData, setShipmentsData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [chartPeriod, setChartPeriod] = useState("daily"); // daily, weekly, monthly

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case "delivered":
        return "text-green-700 bg-green-100 border-green-200";
      case "in transit":
      case "in-progress":
      case "in progress":
        return "text-blue-700 bg-blue-100 border-blue-200";
      case "pending":
        return "text-amber-700 bg-amber-100 border-amber-200";
      case "processing":
        return "text-purple-700 bg-purple-100 border-purple-200";
      case "cancelled":
        return "text-red-700 bg-red-100 border-red-200";
      default:
        return "text-gray-700 bg-gray-100 border-gray-200";
    }
  };

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // Process deliveries into chart data
  const processChartData = (deliveries, period) => {
    if (!deliveries || deliveries.length === 0) {
      setChartData([]);
      return;
    }

    const dateCounts = {};

    deliveries.forEach((delivery, index) => {
      let deliveryDate;

      // Helper function to parse various date formats
      const parseDate = (dateValue) => {
        if (!dateValue || dateValue === "") return null;

        try {
          if (
            typeof dateValue === "object" &&
            dateValue !== null &&
            "seconds" in dateValue
          ) {
            const parsed = new Date(dateValue.seconds * 1000);
            return !isNaN(parsed.getTime()) ? parsed : null;
          }
          if (
            typeof dateValue === "object" &&
            dateValue !== null &&
            typeof dateValue.toDate === "function"
          ) {
            const parsed = dateValue.toDate();
            return !isNaN(parsed.getTime()) ? parsed : null;
          }
          if (typeof dateValue === "string" || typeof dateValue === "number") {
            const parsed = new Date(dateValue);
            return !isNaN(parsed.getTime()) ? parsed : null;
          }
        } catch (error) {
          console.log("Error parsing date:", error, dateValue);
        }
        return null;
      };

      deliveryDate =
        parseDate(delivery.deliveryDate) || parseDate(delivery.DeliveryDate);

      if (!deliveryDate) {
        deliveryDate =
          parseDate(delivery.scheduledDate) ||
          parseDate(delivery.ScheduledDate);
      }

      if (!deliveryDate) {
        deliveryDate =
          parseDate(delivery.created_at) || parseDate(delivery.CreatedAt);
      }

      if (!deliveryDate || isNaN(deliveryDate.getTime())) {
        return;
      }

      let dateKey;
      if (period === "daily") {
        dateKey = deliveryDate.getDate(); // Day of month
      } else if (period === "weekly") {
        dateKey = `Week ${Math.ceil(deliveryDate.getDate() / 7)}`;
      } else {
        dateKey = `${deliveryDate.toLocaleDateString("en-US", { month: "short" })} ${deliveryDate.getFullYear()}`;
      }

      dateCounts[dateKey] = (dateCounts[dateKey] || 0) + 1;
    });

    let chartArray = Object.entries(dateCounts).map(([label, count]) => ({
      label,
      count,
      percentage: 0,
    }));

    if (period === "daily") {
      const last10Days = [];
      for (let i = 9; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const day = date.getDate();
        last10Days.push({
          label: day.toString(),
          count: dateCounts[day] || 0,
          percentage: 0,
        });
      }
      chartArray = last10Days;
    } else if (period === "monthly") {
      const last12Months = [];
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = `${date.toLocaleDateString("en-US", { month: "short" })} ${date.getFullYear()}`;
        last12Months.push({
          label: date.toLocaleDateString("en-US", { month: "short" }),
          count: dateCounts[monthKey] || 0,
          percentage: 0,
        });
      }
      chartArray = last12Months;
    }

    const maxCount = Math.max(...chartArray.map((d) => d.count), 1);
    chartArray = chartArray.map((d) => ({
      ...d,
      percentage: d.count > 0 ? Math.max((d.count / maxCount) * 100, 10) : 0,
    }));

    setChartData(chartArray);
  };

  // Handle chart period change
  const handleChartPeriodChange = async (e) => {
    const newPeriod = e.target.value.toLowerCase();
    setChartPeriod(newPeriod);

    try {
      const deliveriesResponse = await axios.get("/api/deliveries");
      processChartData(deliveriesResponse.data || [], newPeriod);
    } catch (error) {
      console.error("Error fetching deliveries for chart:", error);
    }
  };

  // Fetch header counts
  const fetchHeaderCounts = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const axiosWithAuth = axios.create({ headers });

      const requests = [
        axiosWithAuth.get("/api/trucks").catch((err) => ({ data: [] })),
        axiosWithAuth.get("/api/drivers").catch((err) => ({ data: [] })),
        axiosWithAuth.get("/api/helpers").catch((err) => ({ data: [] })),
        axiosWithAuth.get("/api/staffs").catch((err) => ({ data: [] })),
        axiosWithAuth.get("/api/clients").catch((err) => ({ data: [] })),
        axiosWithAuth.get("/api/deliveries").catch((err) => ({ data: [] })),
        axiosWithAuth
          .get("/api/deliveries/status/pending")
          .catch((err) => ({ data: [] })),
        axiosWithAuth.get("/api/notifications").catch((err) => ({ data: [] })),
      ];

      const [
        trucksRes,
        driversRes,
        helpersRes,
        staffRes,
        clientsRes,
        deliveriesRes,
        pendingDeliveriesRes,
      ] = await Promise.all(requests);

      setHeaderCounts({
        trucks: trucksRes.data.length || 0,
        drivers:
          driversRes.data.filter(
            (d) => d.DriverStatus === "active" || d.driverStatus === "active",
          ).length || 0,
        helpers:
          helpersRes.data.filter(
            (h) => h.HelperStatus === "active" || h.helperStatus === "active",
          ).length || 0,
        staff:
          staffRes.data.filter(
            (s) => s.StaffStatus === "active" || s.staffStatus === "active",
          ).length || 0,
        clients:
          clientsRes.data.filter(
            (c) => c.ClientStatus === "active" || c.clientStatus === "active",
          ).length || 0,
        deliveries: deliveriesRes.data.length || 0,
        pendingDeliveries: pendingDeliveriesRes.data.length || 0,
        unreadNotifications: 3,
      });
    } catch (error) {
      console.error("Error fetching header counts:", error);
    }
  }, []);

  // Handle filter changes
  const handleActionFilterChange = (e) => {
    setActionFilter(e.target.value);
  };

  const handleUserFilterChange = (e) => {
    setUserFilter(e.target.value);
  };

  const resetFilters = () => {
    setActionFilter("");
    setUserFilter("");
  };

  // Apply filters
  useEffect(() => {
    if (recentActivity.length > 0) {
      let filtered = [...recentActivity];

      if (actionFilter) {
        filtered = filtered.filter(
          (activity) => activity.action === actionFilter,
        );
      }

      if (userFilter) {
        filtered = filtered.filter((activity) => activity.user === userFilter);
      }

      setFilteredActivity(filtered);
    }
  }, [recentActivity, actionFilter, userFilter]);

  // Extract available filters from data
  useEffect(() => {
    if (recentActivity.length > 0) {
      const actions = [
        ...new Set(recentActivity.map((activity) => activity.action)),
      ].filter(Boolean);
      const users = [
        ...new Set(recentActivity.map((activity) => activity.user)),
      ].filter(Boolean);

      setAvailableActions(actions);
      setAvailableUsers(users);
    }
  }, [recentActivity]);

  // Load dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        const activityResponse = await axios.get("/api/audit/recent?limit=30");
        const pendingResponse = await axios.get(
          "/api/deliveries/status/pending",
        );
        const inProgressResponse = await axios.get(
          "/api/deliveries/status/in-progress",
        );
        const completedResponse = await axios.get(
          "/api/deliveries/status/completed",
        );
        const trucksResponse = await axios.get("/api/trucks");
        const driversResponse = await axios.get("/api/drivers");
        const deliveriesResponse = await axios.get("/api/deliveries");

        setTotalDeliveries(deliveriesResponse.data.length || 0);

        const shipmentsResponse = await axios.get("/api/deliveries?limit=60");
        setShipmentsData(shipmentsResponse.data || []);

        processChartData(deliveriesResponse.data || [], chartPeriod);

        await fetchHeaderCounts();

        setDeliveryStats({
          pending: pendingResponse.data.length || 0,
          inProgress: inProgressResponse.data.length || 0,
          completed: completedResponse.data.length || 0,
        });

        let totalRevenue = 0;
        try {
          const paymentsResponse = await axios.get("/api/payments/successful");
          totalRevenue = paymentsResponse.data.reduce((total, payment) => {
            return total + (parseFloat(payment.amount) || 0);
          }, 0);
        } catch (paymentError) {
          try {
            const deliveriesResponse = await axios.get("/api/deliveries");
            const paidDeliveries = deliveriesResponse.data.filter(
              (d) => d.paymentStatus === "paid" || d.PaymentStatus === "paid",
            );
            totalRevenue = paidDeliveries.reduce((total, delivery) => {
              const amount =
                parseFloat(delivery.deliveryRate) ||
                parseFloat(delivery.DeliveryRate) ||
                parseFloat(delivery.amount) ||
                0;
              return total + amount;
            }, 0);
          } catch (deliveryError) {
            console.error(
              "Error fetching deliveries for revenue:",
              deliveryError,
            );
          }
        }

        setStats({
          trucks: trucksResponse.data.length || 0,
          drivers:
            driversResponse.data.filter((d) => d.DriverStatus === "active")
              .length || 0,
          deliveries:
            (pendingResponse.data.length || 0) +
            (inProgressResponse.data.length || 0),
          revenue: totalRevenue,
        });

        const activityData = activityResponse.data || [];
        setRecentActivity(activityData);
        setFilteredActivity(activityData);

        setLoading(false);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Failed to load dashboard data");
        setLoading(false);
        setRecentActivity([]);
        setFilteredActivity([]);
        setTotalDeliveries(0);
        setDeliveryStats({ pending: 0, inProgress: 0, completed: 0 });
        setStats({ trucks: 0, drivers: 0, deliveries: 0, revenue: 0 });
      }
    };

    fetchDashboardData();
  }, []);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center flex-col gap-4">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AdminHeader currentUser={currentUser} />

      <div className="flex-1 p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
        {/* Greeting and Summary Cards */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Hello {currentUser?.username || "Admin"}, Good Morning
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 transition-transform hover:-translate-y-1 hover:shadow-md">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <TbPackage size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {totalDeliveries || 0}
                </div>
                <div className="text-sm text-gray-500 font-medium">
                  Total Shipments
                </div>
                <div className="flex items-center text-xs font-semibold text-emerald-600 mt-1">
                  <TbArrowUp size={12} className="mr-0.5" />
                  +1.92%
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 transition-transform hover:-translate-y-1 hover:shadow-md">
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                <TbClock size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {deliveryStats.pending}
                </div>
                <div className="text-sm text-gray-500 font-medium">
                  Pending Packages
                </div>
                <div className="flex items-center text-xs font-semibold text-emerald-600 mt-1">
                  <TbArrowUp size={12} className="mr-0.5" />
                  +1.89%
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 transition-transform hover:-translate-y-1 hover:shadow-md">
              <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                <TbTruckDelivery size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {deliveryStats.completed}
                </div>
                <div className="text-sm text-gray-500 font-medium">
                  Completed Deliveries
                </div>
                <div className="flex items-center text-xs font-semibold text-rose-600 mt-1">
                  <TbArrowDown size={12} className="mr-0.5" />
                  -0.98%
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 transition-transform hover:-translate-y-1 hover:shadow-md">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                <TbCurrencyDollar size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats.revenue)}
                </div>
                <div className="text-sm text-gray-500 font-medium">
                  Total Revenue
                </div>
                <div className="flex items-center text-xs font-semibold text-emerald-600 mt-1">
                  <TbArrowUp size={12} className="mr-0.5" />
                  +5.4%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 h-auto lg:h-[450px]">
          {/* Shipments Statistics */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  Shipments Statistics
                </h3>
                <p className="text-sm text-gray-500">
                  Total number of deliveries: {totalDeliveries || 0}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex space-x-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span className="w-2 h-2 rounded-full bg-gray-200"></span>
                </div>
                <select
                  className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
                  onChange={handleChartPeriodChange}
                  value={chartPeriod}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>

            <div className="flex-1 min-h-[250px] relative flex items-end justify-between gap-2 px-2 pb-2">
              {chartData.length > 0 ? (
                <>
                  {chartData.map((data, index) => (
                    <div
                      key={index}
                      className="flex flex-col items-center flex-1 h-full justify-end group cursor-pointer relative"
                    >
                      {/* Tooltip */}
                      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs px-2 py-1 rounded pointer-events-none whitespace-nowrap z-10">
                        {data.label}: {data.count}
                      </div>

                      <div
                        className="w-full max-w-[40px] bg-blue-500 rounded-t-sm hover:bg-blue-600 transition-all duration-300 relative"
                        style={{ height: `${data.percentage}%` }}
                      >
                        {/* Dashed line effect simulation or overlay if needed */}
                      </div>
                      <span className="text-[10px] text-gray-400 mt-2 font-medium truncate w-full text-center">
                        {data.label}
                      </span>
                    </div>
                  ))}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No delivery data available
                </div>
              )}
            </div>
          </div>

          {/* Tracking Delivery / Recent */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-full">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-800">
                Tracking Delivery
              </h3>
              <p className="text-xs text-gray-500">Last viewed delivery</p>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
              {shipmentsData.length > 0 ? (
                <div>
                  <div className="flex justify-between items-center mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div>
                      <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">
                        Tracking ID
                      </div>
                      <div className="font-mono text-sm font-bold text-gray-800">
                        #
                        {shipmentsData[0].id ||
                          shipmentsData[0].DeliveryID ||
                          "N/A"}
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold capitalize border ${getStatusColor(shipmentsData[0].status || shipmentsData[0].deliveryStatus || "pending")}`}
                    >
                      {shipmentsData[0].status ||
                        shipmentsData[0].deliveryStatus ||
                        "Pending"}
                    </span>
                  </div>

                  <div className="relative pl-4 space-y-8 before:absolute before:left-[21px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
                    {/* Created */}
                    <div className="relative flex items-center gap-4">
                      <div className="w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-50 z-10"></div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">
                          Order Created
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(
                            shipmentsData[0].created_at ||
                              shipmentsData[0].CreatedAt,
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Driver Assigned/Accepted */}
                    <div className="relative flex items-center gap-4">
                      <div
                        className={`w-3 h-3 rounded-full z-10 ${shipmentsData[0].driverAcceptedAt || shipmentsData[0].DriverAcceptedAt ? "bg-blue-500 ring-4 ring-blue-50" : "bg-gray-300 ring-4 ring-gray-100"}`}
                      ></div>
                      <div>
                        <p
                          className={`text-sm font-bold ${shipmentsData[0].driverAcceptedAt ? "text-gray-800" : "text-gray-400"}`}
                        >
                          Driver Accepted
                        </p>
                        <p className="text-xs text-gray-500">
                          {shipmentsData[0].driverAcceptedAt ||
                          shipmentsData[0].DriverAcceptedAt
                            ? formatDate(
                                shipmentsData[0].driverAcceptedAt ||
                                  shipmentsData[0].DriverAcceptedAt,
                              )
                            : "Pending"}
                        </p>
                      </div>
                    </div>

                    {/* In Transit/Delivered */}
                    <div className="relative flex items-center gap-4">
                      <div
                        className={`w-3 h-3 rounded-full z-10 ${shipmentsData[0].deliveryDate || shipmentsData[0].DeliveryDate ? "bg-blue-500 ring-4 ring-blue-50" : "bg-gray-300 ring-4 ring-gray-100"}`}
                      ></div>
                      <div>
                        <p
                          className={`text-sm font-bold ${shipmentsData[0].deliveryDate ? "text-gray-800" : "text-gray-400"}`}
                        >
                          Delivered
                        </p>
                        <p className="text-xs text-gray-500">
                          {shipmentsData[0].deliveryDate ||
                          shipmentsData[0].DeliveryDate
                            ? formatDate(
                                shipmentsData[0].deliveryDate ||
                                  shipmentsData[0].DeliveryDate,
                              )
                            : "Estimated Delivery"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-100 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold">
                      {(
                        shipmentsData[0].driverName ||
                        shipmentsData[0].DriverName
                      )?.charAt(0) || "D"}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">
                        {shipmentsData[0].driverName ||
                          shipmentsData[0].DriverName ||
                          "No driver assigned"}
                      </p>
                      <p className="text-xs text-gray-500">Assigned Driver</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors">
                        <TbPhone size={16} />
                      </button>
                      <button className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors">
                        <TbMessage size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                  No shipments to track
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
