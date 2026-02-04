import React, { useState, useEffect, useContext } from "react";
import { Link, useHistory, useLocation } from "react-router-dom";
import axios from "axios";
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
  FaCalendarPlus,
  FaUpload,
  FaFileAlt,
} from "react-icons/fa";
import { AuthContext } from "../../context/AuthContext";
import { useModernToast } from "../../context/ModernToastContext";
import { ModernToastContainer } from "../../components/common/ModernToast";
import Loader from "../../components/common/Loader";
import Modal from "../../components/common/Modal";
import WarningModal from "../../components/common/WarningModal";
import RouteMap from "../../components/maps/RouteMap";
import enhancedIsolatedMapModal from "../../components/maps/EnhancedIsolatedMapModal";
import useWarningModal from "../../hooks/useWarningModal";
// Modern Billing Section Component - Converted to Tailwind
const ModernBillingSection = ({ onBillingDataUpdate }) => {
  const [billingData, setBillingData] = useState(null);
  const [deliveryData, setDeliveryData] = useState({ active: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Payment proof upload states
  const [selectedDeliveries, setSelectedDeliveries] = useState([]);
  const [proofUploadModalOpen, setProofUploadModalOpen] = useState(false);
  const [proofFile, setProofFile] = useState(null);
  const [proofForm, setProofForm] = useState({
    referenceNumber: "",
    notes: "",
  });
  const [uploadingProof, setUploadingProof] = useState(false);
  const [uploadAlert, setUploadAlert] = useState({
    show: false,
    type: "",
    message: "",
  });
  // Utility to get clientId from multiple sources (mirrors PaymentManagement)
  const getClientId = () => {
    try {
      // 1) Check AuthContext (if available via window object)
      if (
        window?.authUser &&
        (window.authUser.clientId || window.authUser.id)
      ) {
        return window.authUser.clientId || window.authUser.id;
      }

      // 2) localStorage keys
      if (
        typeof Storage !== "undefined" &&
        typeof localStorage !== "undefined"
      ) {
        const userDataRaw =
          localStorage.getItem("userData") ||
          localStorage.getItem("currentUser");
        if (userDataRaw) {
          const userData = JSON.parse(userDataRaw);
          return userData.clientId || userData.id;
        }

        // 3) decode token payload if present
        const token = localStorage.getItem("token");
        if (token) {
          const payload = JSON.parse(atob(token.split(".")[1]));
          return payload.clientId || payload.id || payload.sub;
        }
      }
    } catch (e) {
      console.warn("Unable to resolve clientId", e);
    }
    return null;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Payment proof handlers
  const handleSelectDelivery = (deliveryId) => {
    setSelectedDeliveries((prev) =>
      prev.includes(deliveryId)
        ? prev.filter((id) => id !== deliveryId)
        : [...prev, deliveryId],
    );
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      // Select only pending/overdue payments (not paid or pending_verification)
      const selectablePayments = (billingData?.payments || []).filter(
        (p) => p.status !== "paid" && p.status !== "pending_verification",
      );
      setSelectedDeliveries(
        selectablePayments.map((p) => p.id || p.deliveryId),
      );
    } else {
      setSelectedDeliveries([]);
    }
  };

  const handleProofFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ["image/png", "application/pdf"];
      if (!allowedTypes.includes(file.type)) {
        setUploadAlert({
          show: true,
          type: "error",
          message: "Please upload a PNG image or PDF file only",
        });
        return;
      }
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setUploadAlert({
          show: true,
          type: "error",
          message: "File size must be less than 5MB",
        });
        return;
      }
      setProofFile(file);
    }
  };

  const handleProofSubmit = async () => {
    if (!proofFile) {
      setUploadAlert({
        show: true,
        type: "error",
        message: "Please select a file to upload",
      });
      return;
    }

    if (selectedDeliveries.length === 0) {
      setUploadAlert({
        show: true,
        type: "error",
        message: "Please select at least one delivery",
      });
      return;
    }

    try {
      setUploadingProof(true);
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("proofFile", proofFile);
      formData.append("deliveryIds", JSON.stringify(selectedDeliveries));
      formData.append("referenceNumber", proofForm.referenceNumber);
      formData.append("notes", proofForm.notes);

      const response = await axios.post(
        "/api/payments/upload-proof",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );

      if (response.data.success) {
        setUploadAlert({
          show: true,
          type: "success",
          message:
            response.data.message ||
            "Payment proof uploaded successfully! Awaiting admin verification.",
        });
        setProofUploadModalOpen(false);
        setProofFile(null);
        setProofForm({ referenceNumber: "", notes: "" });
        setSelectedDeliveries([]);
        // Refresh billing data
        await fetchBillingData();
      }
    } catch (error) {
      console.error("Error uploading proof:", error);
      setUploadAlert({
        show: true,
        type: "error",
        message:
          error.response?.data?.message || "Failed to upload payment proof",
      });
    } finally {
      setUploadingProof(false);
    }
  };

  const getSelectedTotal = () => {
    return (billingData?.payments || [])
      .filter((p) => selectedDeliveries.includes(p.id || p.deliveryId))
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  };

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Enhanced token validation
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication required - Please log in again");
      }

      // Validate token format
      if (!token.includes(".")) {
        throw new Error("Invalid token format - Please log in again");
      }

      // Enhanced client ID resolution with debugging
      const clientId = getClientId();
      console.log("🔍 Resolved client ID:", clientId);

      if (!clientId) {
        console.error("❌ Failed to resolve client ID from any source");
        console.log(
          "🔍 Available localStorage keys:",
          Object.keys(localStorage),
        );
        console.log(
          "🔍 Token payload preview:",
          token ? token.split(".")[1].substring(0, 50) + "..." : "No token",
        );
        throw new Error(
          "Unable to identify your account - Please refresh the page or log in again",
        );
      }

      // Set authorization header
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      console.log("🔄 Fetching billing data for client:", clientId);

      // Fetch payment summary from backend with enhanced error handling
      const response = await axios.get(`/api/payments/client/${clientId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-client-id": clientId,
        },
        timeout: 10000, // 10 second timeout
      });

      // The API returns a summary object with payments array
      const summaryData = response.data?.data || response.data || {};
      const payments = summaryData.payments || [];

      console.log("✅ Billing data received:", summaryData);

      const billingDataToSet = {
        totalAmountDue: summaryData.totalAmountDue || 0,
        totalAmountPaid: summaryData.totalAmountPaid || 0,
        overdueAmount: summaryData.overdueAmount || 0,
        overduePayments: summaryData.overduePayments || 0,
        pendingPayments: summaryData.pendingPayments || 0,
        paidPayments: summaryData.paidPayments || 0,
        payments: payments,
        canBookTrucks: summaryData.canBookTrucks !== false,
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

        const activeDeliveries = deliveries.filter(
          (d) =>
            d.DeliveryStatus === "pending" ||
            d.DeliveryStatus === "in-progress",
        ).length;

        const completedDeliveries = deliveries.filter(
          (d) => d.DeliveryStatus === "completed",
        ).length;

        setDeliveryData({
          active: activeDeliveries,
          completed: completedDeliveries,
        });
      } catch (deliveryErr) {
        console.error("Error fetching delivery data:", deliveryErr);
        // Use fallback data if delivery fetch fails
        setDeliveryData({ active: 0, completed: 0 });
      }
    } catch (err) {
      console.error("❌ Error fetching billing data:", err);

      // Enhanced error handling with specific messages
      let errorMessage = "Failed to load billing information";

      if (
        err.code === "ECONNREFUSED" ||
        err.message.includes("Network Error")
      ) {
        errorMessage =
          "Server connection failed - Please ensure the backend server is running";
      } else if (err.response?.status === 401) {
        errorMessage =
          "Authentication expired - Please log out and log in again";
      } else if (err.response?.status === 403) {
        errorMessage = "Access denied - Please check your account permissions";
      } else if (err.response?.status === 404) {
        errorMessage = "Payment service not found - Please contact support";
      } else if (err.response?.status >= 500) {
        errorMessage =
          "Server error - Please try again later or contact support";
      } else if (err.message.includes("timeout")) {
        errorMessage =
          "Request timeout - Please check your internet connection and try again";
      } else {
        errorMessage =
          err.response?.data?.message || err.message || errorMessage;
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
    if (loading) {
      return (
        <div className="w-full bg-white rounded-xl shadow-lg border border-amber-400/20 p-8 min-h-[400px]">
          <Loader message="Loading billing information..." />
        </div>
      );
    }
  }

  if (error) {
    return (
      <div className="w-full bg-white rounded-xl shadow-lg border border-amber-400/20 p-8 min-h-[400px]">
        <div className="flex flex-col items-center justify-center py-12 text-center text-red-500">
          <FaExclamationTriangle className="text-5xl mb-4" />
          <h3 className="text-xl font-bold mb-2">
            Unable to load billing information
          </h3>
          <p className="text-gray-600 max-w-md mx-auto mb-6">{error}</p>

          {/* Debug information for development */}
          {process.env.NODE_ENV === "development" && (
            <details className="mt-4 p-4 bg-gray-50 rounded text-left text-sm w-full max-w-lg overflow-x-auto">
              <summary className="cursor-pointer font-bold text-gray-700">
                Debug Information (Development Only)
              </summary>
              <div className="mt-2 space-y-1 text-gray-600">
                <p>
                  <strong>Client ID:</strong> {getClientId() || "Not found"}
                </p>
                <p>
                  <strong>Token exists:</strong>{" "}
                  {localStorage.getItem("token") ? "Yes" : "No"}
                </p>
                <p>
                  <strong>Token length:</strong>{" "}
                  {localStorage.getItem("token")?.length || 0}
                </p>
                <p>
                  <strong>LocalStorage keys:</strong>{" "}
                  {Object.keys(localStorage).join(", ")}
                </p>
                <p>
                  <strong>Current URL:</strong> {window.location.href}
                </p>
              </div>
            </details>
          )}

          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <button
              onClick={fetchBillingData}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition-all"
            >
              <FaRedo /> Try Again
            </button>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = "/login";
              }}
              className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all border border-gray-200"
            >
              <FaSignOutAlt /> Clear Session & Login
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-6 py-3 bg-transparent border-2 border-amber-400 text-amber-500 rounded-lg hover:bg-amber-50 transition-all"
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
  const overduePaymentsData = (billingData?.payments || []).filter(
    (payment) => {
      const dueDate = new Date(payment.dueDate);
      return currentDate > dueDate && payment.status !== "paid";
    },
  );

  const overduePayments = overduePaymentsData.length;
  const overdueAmount = overduePaymentsData.reduce(
    (sum, payment) => sum + (payment.amount || 0),
    0,
  );

  const pendingPayments = (billingData?.payments || []).filter((payment) => {
    const dueDate = new Date(payment.dueDate);
    return payment.status === "pending" && currentDate <= dueDate;
  }).length;

  return (
    <div className="w-full bg-slate-50 rounded-xl shadow-lg border border-amber-400/20 box-border p-0 overflow-hidden flex flex-col mb-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-white to-gray-50 border-b border-gray-100 p-8 flex justify-between items-center">
        <div className="header-content">
          <h2 className="text-2xl font-bold text-blue-900 m-0">
            Billing Records
          </h2>
          <p className="text-gray-500 mt-1 mb-0 font-medium">
            View your delivery charges and payment history
          </p>
        </div>
      </div>

      {/* Outstanding Balance Alert */}
      {unpaidBalance > 0 && (
        <div className="px-8 pt-6">
          <div
            className={`flex items-center gap-4 p-4 rounded-xl border-l-[6px] shadow-sm ${overdueAmount > 0 ? "bg-red-50 border-red-500 text-red-800" : "bg-orange-50 border-orange-500 text-orange-900"}`}
          >
            <div
              className={`text-xl ${overdueAmount > 0 ? "text-red-500" : "text-orange-500"}`}
            >
              {overdueAmount > 0 ? <FaExclamationTriangle /> : <FaInfoCircle />}
            </div>
            <div className="flex-1">
              <h4 className="m-0 font-bold mb-0.5 text-base">
                {overdueAmount > 0 ? "Overdue Balance" : "Pending Balance"}
              </h4>
              <p className="m-0 text-sm opacity-90">
                {overdueAmount > 0
                  ? `You have ${formatCurrency(overdueAmount)} in overdue payments.`
                  : `You have ${formatCurrency(unpaidBalance)} in pending payments.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Billing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-8">
        {/* Outstanding Balance Card */}
        <div className="bg-white p-6 rounded-xl border-2 border-blue-500/20 shadow-md relative overflow-hidden group transition-all hover:-translate-y-1 hover:shadow-lg">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center text-xl shadow-sm">
              <FaExclamationCircle />
            </div>
            <div>
              <h3 className="m-0 text-gray-500 text-sm font-semibold uppercase tracking-wider">
                Outstanding Balance
              </h3>
              <span className="text-xs text-blue-400 font-medium">
                Amount due
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-bold text-gray-800 tracking-tight">
              {formatCurrency(unpaidBalance)}
            </span>
            {unpaidBalance > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 w-fit">
                {pendingPayments + overduePayments} payment
                {pendingPayments + overduePayments !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Paid This Month Card */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden group transition-all hover:-translate-y-1 hover:shadow-md hover:border-emerald-200">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl">
              <FaCheckCircle />
            </div>
            <div>
              <h3 className="m-0 text-gray-500 text-sm font-semibold uppercase tracking-wider">
                Paid This Month
              </h3>
              <span className="text-xs text-emerald-500 font-medium">
                Current period
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-bold text-gray-800 tracking-tight">
              {formatCurrency(totalPaid)}
            </span>
            <span className="text-xs text-emerald-600 font-medium">
              {billingData?.paidPayments || 0} payment
              {billingData?.paidPayments !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Overdue Payments Card */}
        <div
          className={`bg-white p-6 rounded-xl border relative overflow-hidden group transition-all hover:-translate-y-1 hover:shadow-md ${overduePayments > 0 ? "border-red-200 shadow-red-100" : "border-gray-100 shadow-sm"}`}
        >
          <div className="flex items-center gap-4 mb-4">
            <div
              className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl ${overduePayments > 0 ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-400"}`}
            >
              <FaClock />
            </div>
            <div>
              <h3 className="m-0 text-gray-500 text-sm font-semibold uppercase tracking-wider">
                Overdue Payments
              </h3>
              <span className="text-xs text-red-400 font-medium">
                Requires attention
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-bold text-gray-800 tracking-tight">
              {overduePayments}
            </span>
            <span
              className={`text-xs font-medium ${overduePayments > 0 ? "text-red-500" : "text-gray-400"}`}
            >
              {formatCurrency(overdueAmount)}
            </span>
          </div>
        </div>

        {/* Active Services Card */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden group transition-all hover:-translate-y-1 hover:shadow-md hover:border-blue-200">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center text-xl">
              <FaTruck />
            </div>
            <div>
              <h3 className="m-0 text-gray-500 text-sm font-semibold uppercase tracking-wider">
                Active Services
              </h3>
              <span className="text-xs text-blue-400 font-medium">
                Current deliveries
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-bold text-gray-800 tracking-tight">
              {deliveryData.active}
            </span>
            <span className="text-xs text-green-600 font-medium">
              {deliveryData.completed} completed
            </span>
          </div>
        </div>
      </div>

      {/* Detailed Billing Records */}
      <div className="px-8 pb-8">
        {/* Alert for upload success/error */}
        {uploadAlert.show && (
          <div
            className={`mb-4 p-4 rounded-lg flex items-center gap-3 ${
              uploadAlert.type === "success"
                ? "bg-green-100 text-green-800 border border-green-200"
                : uploadAlert.type === "error"
                  ? "bg-red-100 text-red-800 border border-red-200"
                  : "bg-blue-100 text-blue-800 border border-blue-200"
            }`}
          >
            {uploadAlert.type === "success" ? (
              <FaCheckCircle />
            ) : (
              <FaExclamationTriangle />
            )}
            <span className="flex-1">{uploadAlert.message}</span>
            <button
              onClick={() =>
                setUploadAlert({ show: false, type: "", message: "" })
              }
              className="text-gray-500 hover:text-gray-700"
            >
              <FaTimes />
            </button>
          </div>
        )}

        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-gray-200 pb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-1">
              Billing Records
            </h3>
            <p className="text-gray-500 text-sm m-0">
              {selectedDeliveries.length > 0
                ? `${selectedDeliveries.length} delivery(s) selected - Total: ${formatCurrency(getSelectedTotal())}`
                : "Select deliveries to upload payment proof"}
            </p>
          </div>
          {selectedDeliveries.length > 0 && (
            <button
              onClick={() => setProofUploadModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition-all font-medium"
            >
              <FaUpload />
              Upload Payment Proof
            </button>
          )}
        </div>

        {billingData?.payments?.length > 0 ? (
          <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200">
            <table className="w-full border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-6 py-4 w-12 border-b border-gray-200">
                    <input
                      type="checkbox"
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      checked={
                        selectedDeliveries.length > 0 &&
                        selectedDeliveries.length ===
                          (billingData?.payments || []).filter(
                            (p) =>
                              p.status !== "paid" &&
                              p.status !== "pending_verification",
                          ).length
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                    Delivery ID
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                    Route
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                    Delivery Date
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                    Due Date
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {billingData.payments.map((payment, index) => {
                  // Check if current date is past due date
                  const currentDate = new Date();
                  const dueDate = new Date(payment.dueDate);
                  const isOverdueByDate =
                    currentDate > dueDate && payment.status !== "paid";

                  // Determine actual status (override backend status if overdue by date)
                  const actualStatus = isOverdueByDate
                    ? "overdue"
                    : payment.status;
                  const isOverdue = actualStatus === "overdue";
                  const isPaid = actualStatus === "paid";
                  const isPending = actualStatus === "pending";

                  let rowClass =
                    "hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-none";
                  if (isOverdue) rowClass += " bg-red-50/30";

                  return (
                    <tr key={payment.id || index} className={rowClass}>
                      <td className="px-6 py-4 w-12 align-middle">
                        {payment.status !== "paid" &&
                          payment.status !== "pending_verification" && (
                            <input
                              type="checkbox"
                              checked={selectedDeliveries.includes(
                                payment.id || payment.deliveryId,
                              )}
                              onChange={() =>
                                handleSelectDelivery(
                                  payment.id || payment.deliveryId,
                                )
                              }
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                            />
                          )}
                      </td>
                      <td className="px-6 py-4 text-sm align-middle">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono font-semibold text-blue-600">
                            #{payment.deliveryId}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm align-middle">
                        <div className="flex flex-col gap-1.5 max-w-[200px]">
                          <div
                            className="flex items-center gap-1.5 text-xs text-gray-600 truncate"
                            title={payment.metadata?.pickupLocation}
                          >
                            <FaMapMarkerAlt className="text-emerald-600 min-w-[12px]" />
                            <span className="truncate">
                              {payment.metadata?.pickupLocation ||
                                "Pickup Location"}
                            </span>
                          </div>
                          <div
                            className="flex items-center gap-1.5 text-xs text-gray-600 truncate"
                            title={payment.metadata?.deliveryAddress}
                          >
                            <FaMapMarkerAlt className="text-red-500 min-w-[12px]" />
                            <span className="truncate">
                              {payment.metadata?.deliveryAddress ||
                                "Delivery Address"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 align-middle">
                        {formatDate(payment.deliveryDate)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 align-middle">
                        <div className="flex flex-col gap-1">
                          {formatDate(payment.dueDate)}
                          {isOverdue && (
                            <span className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                              <FaExclamationTriangle /> Overdue
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800 font-semibold align-middle">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-700">
                            {formatCurrency(payment.amount)}
                          </span>
                          {payment.testMode && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded uppercase font-bold tracking-wider">
                              TEST
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm align-middle">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                          ${isPaid ? "bg-emerald-100 text-emerald-700" : ""}
                          ${isOverdue ? "bg-red-100 text-red-700" : ""}
                          ${isPending ? "bg-amber-100 text-amber-700" : ""}
                        `}
                        >
                          {isPaid && <FaCheckCircle />}
                          {isOverdue && <FaExclamationTriangle />}
                          {isPending && <FaClock />}
                          {actualStatus.charAt(0).toUpperCase() +
                            actualStatus.slice(1)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400 bg-white rounded-xl border border-gray-200 border-dashed">
            <div className="text-5xl mb-4 opacity-50">
              <FaFileInvoiceDollar />
            </div>
            <h4 className="text-lg font-bold text-gray-600 mb-2">
              No Billing Records Found
            </h4>
            <p className="max-w-md mx-auto mb-6">
              You don't have any delivery charges yet. Start by booking a truck
              delivery.
            </p>
            <Link
              to="/client/dashboard?tab=book-truck"
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition-all"
            >
              <FaTruck /> Book Your First Delivery
            </Link>
          </div>
        )}
      </div>
      {/* Payment Proof Upload Modal */}
      {proofUploadModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setProofUploadModalOpen(false)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all w-full max-w-lg">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <FaUpload className="text-blue-600" />
                  Upload Payment Proof
                </h3>
                <button
                  onClick={() => setProofUploadModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Summary of Selection */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-blue-800 font-medium">
                      Selected Deliveries:
                    </span>
                    <span className="text-sm font-bold text-blue-900">
                      {selectedDeliveries.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-blue-800 font-medium">
                      Total Amount:
                    </span>
                    <span className="text-lg font-bold text-blue-700">
                      {formatCurrency(getSelectedTotal())}
                    </span>
                  </div>
                </div>

                {/* File Upload Area */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Proof of Payment (Image/PDF)
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-500 transition-colors bg-gray-50 hover:bg-white cursor-pointer relative">
                    <input
                      type="file"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={handleProofFileChange}
                      accept="image/png,application/pdf"
                    />
                    <div className="space-y-1 text-center">
                      {proofFile ? (
                        <div className="flex flex-col items-center">
                          <FaFileAlt className="mx-auto h-12 w-12 text-blue-500" />
                          <div className="flex text-sm text-gray-600 mt-2">
                            <span className="font-medium text-blue-600 truncate max-w-[200px]">
                              {proofFile.name}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {(proofFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                          <p className="text-xs text-green-600 mt-1 font-medium">
                            Click to change file
                          </p>
                        </div>
                      ) : (
                        <>
                          <FaUpload className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="flex text-sm text-gray-600">
                            <span className="font-medium text-blue-600 hover:text-blue-500">
                              Upload a file
                            </span>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-gray-500">
                            PNG, PDF up to 5MB
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional Fields */}
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reference Number
                    </label>
                    <input
                      type="text"
                      value={proofForm.referenceNumber}
                      onChange={(e) =>
                        setProofForm({
                          ...proofForm,
                          referenceNumber: e.target.value,
                        })
                      }
                      placeholder="e.g. GCash Ref No., Bank Trans ID"
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2 border"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={proofForm.notes}
                      onChange={(e) =>
                        setProofForm({ ...proofForm, notes: e.target.value })
                      }
                      rows={2}
                      placeholder="Any additional details..."
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2 border"
                    />
                  </div>
                </div>

                {/* Alerts inside modal */}
                {uploadAlert.show && (
                  <div
                    className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
                      uploadAlert.type === "error"
                        ? "bg-red-50 text-red-700"
                        : "bg-green-50 text-green-700"
                    }`}
                  >
                    <FaInfoCircle className="mt-0.5 shrink-0" />
                    <span>{uploadAlert.message}</span>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 px-6 py-4 flex flex-row-reverse gap-3">
                <button
                  type="button"
                  onClick={handleProofSubmit}
                  disabled={uploadingProof || !proofFile}
                  className={`inline-flex w-full justify-center rounded-lg px-4 py-2 text-base font-semibold text-white shadow-sm sm:w-auto sm:text-sm transition-all ${
                    uploadingProof || !proofFile
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-500"
                  }`}
                >
                  {uploadingProof ? (
                    <span className="flex items-center gap-2">
                      <FaSync className="animate-spin" /> Uploading...
                    </span>
                  ) : (
                    "Submit Proof"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setProofUploadModalOpen(false)}
                  disabled={uploadingProof}
                  className="inline-flex w-full justify-center rounded-lg bg-white px-4 py-2 text-base font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ClientProfile = () => {
  const { authUser, logout } = useContext(AuthContext) || {
    authUser: null,
    logout: () => {},
  };
  const history = useHistory();
  const location = useLocation();
  const [clientData, setClientData] = useState(null);
  const [allocatedTrucks, setAllocatedTrucks] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get active tab from URL query parameters
  const urlParams = new URLSearchParams(location.search);
  const [activeTab, setActiveTab] = useState(
    urlParams.get("tab") || "overview",
  );

  // Booking states
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingData, setBookingData] = useState({
    pickupLocation: "",
    pickupCoordinates: null,
    dropoffLocation: "",
    dropoffCoordinates: null,
    weight: "",
    deliveryDate: "",
    deliveryTime: "",
    selectedTrucks: [],
    pickupContactPerson: "",
    pickupContactNumber: "",
    dropoffContactPerson: "",
    dropoffContactNumber: "",
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
    type: "all",
    status: "all",
    search: "",
  });
  const [trucksPerPage, setTrucksPerPage] = useState(12);
  const [currentTruckPage, setCurrentTruckPage] = useState(1);
  const [showTruckFilters, setShowTruckFilters] = useState(false);

  // Transaction filtering states
  const [transactionSearchQuery, setTransactionSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [filteredDeliveries, setFilteredDeliveries] = useState([]);
  const [showTransactionFilters, setShowTransactionFilters] = useState(false);

  // Table pagination and sorting states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [sortField, setSortField] = useState("DeliveryDate");
  const [sortDirection, setSortDirection] = useState("desc"); // 'asc' or 'desc'

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
      filtered = filtered.filter(
        (delivery) =>
          delivery.DeliveryID?.toString()
            .toLowerCase()
            .includes(transactionSearchQuery.toLowerCase()) ||
          delivery.TruckPlate?.toLowerCase().includes(
            transactionSearchQuery.toLowerCase(),
          ) ||
          delivery.TruckBrand?.toLowerCase().includes(
            transactionSearchQuery.toLowerCase(),
          ) ||
          delivery.DriverName?.toLowerCase().includes(
            transactionSearchQuery.toLowerCase(),
          ) ||
          delivery.PickupLocation?.toLowerCase().includes(
            transactionSearchQuery.toLowerCase(),
          ) ||
          delivery.DropoffLocation?.toLowerCase().includes(
            transactionSearchQuery.toLowerCase(),
          ),
      );
    }

    // Status filter
    if (statusFilter && statusFilter !== "all") {
      filtered = filtered.filter(
        (delivery) =>
          delivery.DeliveryStatus?.toLowerCase() === statusFilter.toLowerCase(),
      );
    }

    // Date filter
    if (dateFilter && dateFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      filtered = filtered.filter((delivery) => {
        const deliveryDate = new Date(delivery.DeliveryDate);

        switch (dateFilter) {
          case "today":
            return (
              deliveryDate >= today &&
              deliveryDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)
            );
          case "week":
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            return deliveryDate >= weekAgo;
          case "month":
            const monthAgo = new Date(
              today.getFullYear(),
              today.getMonth() - 1,
              today.getDate(),
            );
            return deliveryDate >= monthAgo;
          case "year":
            const yearAgo = new Date(
              today.getFullYear() - 1,
              today.getMonth(),
              today.getDate(),
            );
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
    clientName: "",
    clientEmail: "",
    clientNumber: "",
  });
  const [passwordFormData, setPasswordFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
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
    showConfirm,
  } = useWarningModal();

  // Modern toast hook
  const {
    toasts,
    removeToast,
    showSuccess: showToastSuccess,
    showError: showToastError,
    showWarning: showToastWarning,
    showInfo: showToastInfo,
    showDeliveryUpdate,
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
    pickupLocation: "",
    pickupCoordinates: null,
    dropoffLocation: "",
    dropoffCoordinates: null,
    newDistance: 0,
    newCost: 0,
  });

  // Rebook modal data
  const [rebookData, setRebookData] = useState({
    newDate: "",
    newTime: "",
  });

  // Change route map modal states
  const [showChangeRouteMapModal, setShowChangeRouteMapModal] = useState(false);
  const [changeRouteMapType, setChangeRouteMapType] = useState("pickup"); // 'pickup' or 'dropoff'

  // Callback to receive billing data from ModernBillingSection
  const handleBillingDataUpdate = (data) => {
    setBillingData(data);
  };

  // Listen for booking modal events from sidebar
  useEffect(() => {
    const handleOpenBookingModal = () => {
      setShowBookingModal(true);
    };

    window.addEventListener("openBookingModal", handleOpenBookingModal);

    return () => {
      window.removeEventListener("openBookingModal", handleOpenBookingModal);
    };
  }, []);

  // Clear used locations and availability data when booking modal closes
  useEffect(() => {
    if (!showBookingModal) {
      // Closing booking modal - clear for next time
      enhancedIsolatedMapModal.clearUsedLocations();
      setAvailableTrucksForDate([]);
      setBookedDatesForTruck([]);
      console.log(
        "🔄 Booking modal closed - cleared used locations and availability data",
      );
    }
  }, [showBookingModal]);

  // Check truck availability when modal opens with a pre-filled date
  useEffect(() => {
    if (showBookingModal && bookingData.deliveryDate) {
      console.log("📅 Modal opened with date:", bookingData.deliveryDate);
      checkAvailableTrucksForDate(bookingData.deliveryDate);
    }
  }, [showBookingModal, bookingData.deliveryDate]);

  // Update active tab when URL changes
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const tabFromUrl = urlParams.get("tab") || "overview";
    setActiveTab(tabFromUrl);
  }, [location.search]);

  // Set default date and time for booking
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const formattedDate = tomorrow.toISOString().split("T")[0];
    const defaultTime = "12:00";

    setBookingData((prev) => ({
      ...prev,
      deliveryDate: formattedDate,
      deliveryTime: defaultTime,
    }));
  }, []);

  // Set up axios with token
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
  }, []);

  // Fetch client data function - moved outside useEffect for reusability
  const fetchClientData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch client profile
      try {
        const profileRes = await axios.get("/api/clients/profile");
        setClientData(profileRes.data);
      } catch (profileError) {
        console.error("Error fetching profile:", profileError);
        setError("Failed to load profile data.");
      }

      // Fetch allocated trucks
      try {
        console.log("🔄 Fetching allocated trucks...");
        const trucksRes = await axios.get("/api/clients/profile/trucks");
        console.log("🔍 Raw trucks response:", trucksRes.data);
        console.log(
          "🔍 Trucks with status:",
          trucksRes.data?.map((t) => ({
            plate: t.TruckPlate,
            status: t.TruckStatus,
          })),
        );
        setAllocatedTrucks(trucksRes.data || []);
      } catch (trucksError) {
        console.error("Error fetching trucks:", trucksError);
        setAllocatedTrucks([]);
      }

      // Fetch deliveries
      try {
        const deliveriesRes = await axios.get(
          "/api/clients/profile/deliveries",
        );
        const deliveriesData = deliveriesRes.data || [];
        setDeliveries(deliveriesData);
      } catch (deliveriesError) {
        console.error("Error fetching deliveries:", deliveriesError);
        setDeliveries([]);
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Error in fetchClientData:", error);
      setError("Failed to load dashboard data.");
      setIsLoading(false);
    }
  };

  // Helper function to extract city from full address
  const extractCity = (address) => {
    if (!address) return "N/A";

    // Split by comma and clean up
    const parts = address.split(",").map((p) => p.trim());

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
      if (
        part.toLowerCase().includes("metro manila") ||
        part.toLowerCase().includes("philippines") ||
        part.toLowerCase().includes("bulacan") ||
        part.toLowerCase().includes("cavite") ||
        part.toLowerCase().includes("laguna")
      ) {
        // Return the previous part if it exists
        if (i > 0 && !/^\d/.test(parts[i - 1])) {
          return parts[i - 1];
        }
        continue;
      }
      // Return first non-address part
      if (
        !part.toLowerCase().includes("hwy") &&
        !part.toLowerCase().includes("highway") &&
        !part.toLowerCase().includes("road") &&
        !part.toLowerCase().includes("avenue") &&
        !part.toLowerCase().includes("street")
      ) {
        return part;
      }
    }

    // Fallback: return second part if available (skip street address)
    return parts.length > 1 ? parts[1] : parts[0];
  };

  // Function to fetch vehicle rates
  const fetchVehicleRates = async () => {
    try {
      console.log("🔄 Fetching vehicle rates...");
      const response = await axios.get("/api/clients/vehicle-rates", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.data.success) {
        console.log("✅ Vehicle rates fetched:", response.data.data);
        setVehicleRates(response.data.data || []);
      }
    } catch (error) {
      console.error("❌ Error fetching vehicle rates:", error);
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
        console.log("🔄 Polling for delivery updates...");
        const deliveriesRes = await axios.get(
          "/api/clients/profile/deliveries",
        );
        const newDeliveries = deliveriesRes.data || [];

        // Check if any delivery status has changed
        const hasChanges = newDeliveries.some((newDelivery) => {
          const oldDelivery = deliveries.find(
            (d) => d.DeliveryID === newDelivery.DeliveryID,
          );
          return (
            oldDelivery &&
            oldDelivery.DeliveryStatus !== newDelivery.DeliveryStatus
          );
        });

        if (hasChanges) {
          console.log("✅ Delivery status changes detected, updating...");
          setDeliveries(newDeliveries);

          // Show notification for status changes
          const changedDeliveries = newDeliveries.filter((newDelivery) => {
            const oldDelivery = deliveries.find(
              (d) => d.DeliveryID === newDelivery.DeliveryID,
            );
            return (
              oldDelivery &&
              oldDelivery.DeliveryStatus !== newDelivery.DeliveryStatus
            );
          });

          changedDeliveries.forEach((delivery) => {
            const statusMessage = getStatusMessage(delivery.DeliveryStatus);
            showToastInfo(
              "Delivery Status Updated",
              `Delivery #${delivery.DeliveryID.substring(0, 8)} is now ${statusMessage}`,
            );
          });
        }
      } catch (error) {
        console.error("Error polling for updates:", error);
      }
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(pollInterval);
  }, [deliveries, showToastInfo]); // Re-setup polling when deliveries change

  // Helper function to get user-friendly status messages
  const getStatusMessage = (status) => {
    switch (status) {
      case "pending":
        return "pending driver assignment";
      case "accepted":
        return "accepted by driver";
      case "started":
        return "started by driver";
      case "picked-up":
        return "picked up by driver";
      case "awaiting-confirmation":
        return "delivered and awaiting your confirmation";
      case "completed":
        return "completed";
      case "cancelled":
        return "cancelled";
      default:
        return status;
    }
  };

  // Booking functions
  const handleCapacityChange = async (e) => {
    const capacity = parseFloat(e.target.value);
    setBookingData((prev) => ({
      ...prev,
      weight: e.target.value,
    }));

    if (!isNaN(capacity) && capacity > 0) {
      // Use smart booking algorithm to automatically select optimal trucks
      await handleSmartBooking(capacity);
    } else {
      setRecommendedTrucks([]);
      setBookingData((prev) => ({
        ...prev,
        selectedTrucks: [],
      }));
    }
  };

  const handleTruckSelection = (truckId) => {
    // Find truck in allocatedTrucks (not just recommended ones)
    const selectedTruck = allocatedTrucks.find(
      (truck) => truck.TruckID === truckId,
    );

    if (!selectedTruck) {
      console.warn("Truck not found:", truckId);
      return;
    }

    // Check availability (though we should only be showing available trucks)
    const operationalStatus =
      selectedTruck.operationalStatus?.toLowerCase() ||
      selectedTruck.OperationalStatus?.toLowerCase();
    const availabilityStatus =
      selectedTruck.availabilityStatus?.toLowerCase() ||
      selectedTruck.AvailabilityStatus?.toLowerCase();

    const isAvailable =
      operationalStatus === "active" && availabilityStatus === "free";

    if (!isAvailable) {
      showWarning(
        "Truck Unavailable",
        `This truck is not available for booking - Operational: ${operationalStatus}, Availability: ${availabilityStatus}`,
      );
      return;
    }

    setBookingData((prev) => {
      const currentSelection = [...prev.selectedTrucks];

      if (currentSelection.includes(truckId)) {
        return {
          ...prev,
          selectedTrucks: currentSelection.filter((id) => id !== truckId),
        };
      } else {
        return {
          ...prev,
          selectedTrucks: [...currentSelection, truckId],
        };
      }
    });
  };

  const openMapModal = (type) => {
    // Get the currently selected location for this type
    const currentLocation =
      type === "pickup"
        ? bookingData.pickupLocation
        : bookingData.dropoffLocation;

    // If there's already a location selected for this type, we need to clear it from used
    // so user can change their mind and select it again or select a different one
    if (currentLocation) {
      console.log(
        `🔄 Re-opening ${type} picker - clearing used locations to allow reselection`,
      );
      enhancedIsolatedMapModal.clearUsedLocations();
    }

    // Get the other selected location to prevent duplicate selection
    const otherSelectedLocation =
      type === "pickup"
        ? {
            address: bookingData.dropoffLocation,
            coordinates: bookingData.dropoffCoordinates,
          }
        : {
            address: bookingData.pickupLocation,
            coordinates: bookingData.pickupCoordinates,
          };

    enhancedIsolatedMapModal.init({
      locationType: type,
      initialAddress:
        type === "pickup"
          ? bookingData.pickupLocation
          : bookingData.dropoffLocation,
      title: `Select ${type === "pickup" ? "Pickup" : "Dropoff"} Location`,
      otherSelectedLocation: otherSelectedLocation,
      onSelectCallback: (address, coordinates, locationData) => {
        const updates = {
          [type === "pickup" ? "pickupLocation" : "dropoffLocation"]: address,
          [type === "pickup" ? "pickupCoordinates" : "dropoffCoordinates"]:
            coordinates,
        };

        // Auto-fill contact information if location data is available (saved location selected)
        if (locationData) {
          if (type === "pickup") {
            // Fill pickup contact fields
            if (locationData.contactPerson)
              updates.pickupContactPerson = locationData.contactPerson;
            if (locationData.contactNumber)
              updates.pickupContactNumber = locationData.contactNumber;
          } else {
            // Fill dropoff contact fields
            if (locationData.contactPerson)
              updates.dropoffContactPerson = locationData.contactPerson;
            if (locationData.contactNumber)
              updates.dropoffContactNumber = locationData.contactNumber;
          }
          console.log(
            `✅ Auto-filled ${type} contact info from saved location:`,
            locationData.contactPerson,
            locationData.contactNumber,
          );
        } else {
          // Manual location selected - clear the contact fields for this type
          if (type === "pickup") {
            updates.pickupContactPerson = "";
            updates.pickupContactNumber = "";
          } else {
            updates.dropoffContactPerson = "";
            updates.dropoffContactNumber = "";
          }
          console.log(
            `🔄 Manual location selected for ${type}, cleared contact fields`,
          );
        }

        setBookingData((prev) => ({
          ...prev,
          ...updates,
        }));
      },
    });
  };

  const toggleRoutePreview = () => {
    if (bookingData.pickupCoordinates && bookingData.dropoffCoordinates) {
      setShowRoutePreview(!showRoutePreview);
    } else {
      showInfo(
        "Route Preview Unavailable",
        "Select both locations on map for route preview, or continue booking with address text only.",
      );
    }
  };

  const handleRouteCalculated = (routeInfo) => {
    setRouteDetails(routeInfo);
    setBookingData((prev) => ({
      ...prev,
      deliveryDistance: routeInfo.distanceValue,
      estimatedDuration: routeInfo.durationValue,
    }));
  };

  const calculateEstimatedCostPerTruck = () => {
    if (!routeDetails || !bookingData.selectedTrucks.length) return 0;

    // Get the first selected truck to determine vehicle type
    const firstTruck = allocatedTrucks.find((truck) =>
      bookingData.selectedTrucks.includes(truck.TruckID),
    );

    if (!firstTruck) return 0;

    // Use vehicle type to estimate cost based on vehicle rate system
    const vehicleType = firstTruck.TruckType || "mini truck";
    const distance = routeDetails.distanceValue || 0; // in km

    // Try to find the rate from staff-configured vehicle rates
    let rate = null;
    if (vehicleRates.length > 0) {
      rate = vehicleRates.find((r) => r.vehicleType === vehicleType);
      console.log(`🔍 Looking for rate for ${vehicleType}, found:`, rate);
    }

    // Fallback to default rates if no staff-configured rate found
    if (!rate) {
      console.log(
        `⚠️ No staff rate found for ${vehicleType}, using default rates`,
      );
      const defaultRates = {
        "mini truck": { baseRate: 100, ratePerKm: 15 },
        "4 wheeler": { baseRate: 150, ratePerKm: 20 },
        "6 wheeler": { baseRate: 200, ratePerKm: 25 },
        "8 wheeler": { baseRate: 250, ratePerKm: 30 },
        "10 wheeler": { baseRate: 300, ratePerKm: 35 },
      };
      rate = defaultRates[vehicleType] || defaultRates["mini truck"];
    }

    const baseRate = parseFloat(rate.baseRate) || 0;
    const ratePerKm = parseFloat(rate.ratePerKm) || 0;
    const totalCost = baseRate + distance * ratePerKm;

    console.log(
      `💰 Cost calculation for ${vehicleType}: Base ₱${baseRate} + (${distance}km × ₱${ratePerKm}/km) = ₱${totalCost}`,
    );

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

      const response = await axios.get(
        `/api/clients/availability/trucks-for-date/${selectedDate}`,
      );

      if (response.data.success) {
        const availableTruckIds = response.data.availableTrucks.map(
          (t) => t.id,
        );
        setAvailableTrucksForDate(availableTruckIds);

        console.log(
          `✅ ${response.data.totalAvailable}/${response.data.totalAllocated} trucks available on ${selectedDate}`,
        );
        console.log(
          `❌ ${response.data.totalBooked} trucks booked:`,
          response.data.bookedTruckIds,
        );

        // Auto-remove booked trucks from selection
        setBookingData((prev) => ({
          ...prev,
          selectedTrucks: prev.selectedTrucks.filter((truckId) =>
            availableTruckIds.includes(truckId),
          ),
        }));
      }
    } catch (error) {
      console.error("❌ Error checking truck availability:", error);
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

      const response = await axios.get(
        `/api/clients/availability/dates-for-truck/${truckId}`,
      );

      if (response.data.success) {
        setBookedDatesForTruck(response.data.bookedDateStrings);
        console.log(
          `📅 Truck ${truckId} has ${response.data.totalBooked} booked dates:`,
          response.data.bookedDateStrings,
        );
      }
    } catch (error) {
      console.error("❌ Error checking truck booked dates:", error);
    }
  };

  // Handle date change with availability checking
  const handleDateChange = (e) => {
    const newDate = e.target.value;

    // Check if selected date is booked for any selected truck
    if (
      newDate &&
      bookedDatesForTruck.length > 0 &&
      bookedDatesForTruck.includes(newDate)
    ) {
      showWarning(
        "Date Not Available",
        "The selected date is already booked for one of your selected trucks. Please choose a different date.",
      );
      return; // Don't update the date
    }

    setBookingData((prev) => ({ ...prev, deliveryDate: newDate }));

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

    console.log("🚀 Starting booking submission...");

    try {
      if (
        !bookingData.pickupLocation ||
        !bookingData.dropoffLocation ||
        !bookingData.weight ||
        !bookingData.deliveryDate ||
        !bookingData.deliveryTime ||
        !bookingData.pickupContactNumber ||
        !bookingData.dropoffContactNumber
      ) {
        const missingFields = [];
        if (!bookingData.pickupLocation) missingFields.push("Pickup Location");
        if (!bookingData.dropoffLocation)
          missingFields.push("Dropoff Location");
        if (!bookingData.weight) missingFields.push("Cargo Weight");
        if (!bookingData.deliveryDate) missingFields.push("Delivery Date");
        if (!bookingData.deliveryTime) missingFields.push("Delivery Time");
        if (!bookingData.pickupContactNumber)
          missingFields.push("Pickup Contact Number");
        if (!bookingData.dropoffContactNumber)
          missingFields.push("Dropoff Contact Number");

        console.log("❌ Missing required fields:", missingFields);
        showWarning(
          "Missing Required Fields",
          `Please fill in the following required fields:\n\n${missingFields.join("\n")}`,
        );
        return;
      }

      if (bookingData.selectedTrucks.length === 0) {
        console.log("❌ No trucks selected");
        showWarning(
          "No Trucks Selected",
          "Please select at least one truck for the delivery",
        );
        return;
      }

      console.log("📋 Booking data:", bookingData);

      // Double-check truck availability before submission
      const unavailableTrucks = [];
      for (const truckId of bookingData.selectedTrucks) {
        const selectedTruck = allocatedTrucks.find(
          (truck) => truck.TruckID === truckId,
        );

        if (!selectedTruck) {
          unavailableTrucks.push(`Truck ${truckId} not found`);
          continue;
        }

        // SIMPLIFIED availability check - Only check Operational and Availability status
        const operationalStatus =
          selectedTruck.operationalStatus?.toLowerCase() ||
          selectedTruck.OperationalStatus?.toLowerCase();
        const availabilityStatus =
          selectedTruck.availabilityStatus?.toLowerCase() ||
          selectedTruck.AvailabilityStatus?.toLowerCase();

        const isAvailable =
          operationalStatus === "active" && availabilityStatus === "free";

        if (!isAvailable) {
          unavailableTrucks.push(
            `${selectedTruck.TruckPlate} - Operational: ${operationalStatus}, Availability: ${availabilityStatus}`,
          );
        }
      }

      if (unavailableTrucks.length > 0) {
        console.log("❌ Some trucks unavailable:", unavailableTrucks);
        const unavailableMessage = `Some trucks are not available:\n${unavailableTrucks.join("\n")}\n\nPlease select different trucks.`;

        showWarning("Trucks Unavailable", unavailableMessage, {
          onConfirm: () => {
            // Reset selection and re-calculate recommended trucks
            setBookingData((prev) => ({
              ...prev,
              selectedTrucks: [],
            }));

            handleSmartBooking(parseFloat(bookingData.weight));
          },
        });
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        console.log("❌ No authentication token");
        showError(
          "Authentication Error",
          "Authentication token missing. Please login again.",
        );
        return;
      }

      const defaultPickupCoordinates = bookingData.pickupCoordinates || {
        lat: 14.5995,
        lng: 120.9842,
      };
      const defaultDropoffCoordinates = bookingData.dropoffCoordinates || {
        lat: 14.6091,
        lng: 121.0223,
      };

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
        dropoffContactNumber: bookingData.dropoffContactNumber,
      };

      console.log("📤 Sending booking request:", bookingRequestData);

      setIsLoading(true);
      try {
        console.log("📤 Submitting booking request...");
        const response = await axios.post(
          "/api/clients/truck-rental",
          bookingRequestData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        );

        console.log("✅ Booking response:", response.data);

        if (response.data.success) {
          const totalBookings =
            response.data.createdDeliveries?.length ||
            bookingData.selectedTrucks.length;

          showToastSuccess(
            "✅ Booking Successful!",
            `${totalBookings} delivery${totalBookings !== 1 ? "ies" : "y"} scheduled successfully.`,
          );

          // Clear used locations to allow reuse
          enhancedIsolatedMapModal.clearUsedLocations();

          // Close modal and refresh data
          setShowBookingModal(false);
          setBookingData({
            pickupLocation: "",
            pickupCoordinates: null,
            dropoffLocation: "",
            dropoffCoordinates: null,
            weight: "",
            deliveryDate: "",
            deliveryTime: "",
            selectedTrucks: [],
            pickupContactPerson: "",
            pickupContactNumber: "",
            dropoffContactPerson: "",
            dropoffContactNumber: "",
          });

          // Refresh data
          fetchClientData();
        } else {
          throw new Error(response.data.message || "Booking failed");
        }
      } catch (error) {
        console.error("❌ Booking failed:", error);
        console.error("❌ Error response data:", error.response?.data);
        console.error("❌ Error status:", error.response?.status);

        let errorTitle = "Booking Failed";
        let errorMessage = "Unknown error occurred";

        if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
          console.error("❌ Backend error message:", errorMessage);

          // Log failed bookings details for debugging
          if (error.response.data.failedBookings) {
            console.error(
              "❌ Failed bookings details:",
              error.response.data.failedBookings,
            );
            error.response.data.failedBookings.forEach((fb) => {
              console.error(`   - Truck ${fb.truckId}: ${fb.reason}`);
            });
          }

          // Log common issues if available
          if (error.response.data.debug?.commonIssues) {
            console.error(
              "❌ Common issues:",
              error.response.data.debug.commonIssues,
            );
          }

          // Handle specific allocation-related errors
          if (errorMessage.includes("allocated to another client")) {
            errorTitle = "Truck Not Available";
            errorMessage = `${errorMessage}\n\nThis truck is not currently allocated to your account. Please:\n1. Contact your account manager to reallocate this truck\n2. Select a different truck from your allocated trucks`;
          } else if (errorMessage.includes("not allocated to your account")) {
            errorTitle = "Truck Not Allocated";
            errorMessage = `${errorMessage}\n\nPlease:\n1. Contact your account manager to allocate this truck to your account\n2. Select a truck from your allocated trucks list`;
          } else if (
            errorMessage.includes("insufficient capacity") ||
            errorMessage.includes("no trucks available")
          ) {
            errorTitle = "Insufficient Truck Capacity";
          } else if (
            errorMessage.includes("quota exceeded") ||
            errorMessage.includes("RESOURCE_EXHAUSTED")
          ) {
            errorTitle = "Service Temporarily Unavailable";
            errorMessage =
              "The service is experiencing high usage. Please try again in a few minutes.";
          }
        } else if (error.message) {
          errorMessage = error.message;
        }

        showToastError(errorTitle, errorMessage);
      } finally {
        setIsLoading(false);
      }
    } catch (apiError) {
      console.error("💥 Booking error:", apiError);
      console.error("💥 Error response:", apiError.response?.data);
      console.error("💥 Error status:", apiError.response?.status);

      setIsLoading(false);
      let errorMessage = "Error booking truck rental. Please try again.";

      if (apiError.response?.status === 403) {
        errorMessage =
          "Some trucks are not available for booking. Please select different trucks.";
        setBookingData((prev) => ({ ...prev, selectedTrucks: [] }));
        handleSmartBooking(parseFloat(bookingData.weight));
      } else if (apiError.response?.data) {
        const errorData = apiError.response.data;
        errorMessage = errorData.message || "Unknown error occurred";

        // Show detailed debug info if available
        if (errorData.debug) {
          console.log("🔍 Debug info:", errorData.debug);
          errorMessage += `\n\nDebug Info:`;
          errorMessage += `\n• Requested trucks: ${errorData.debug.requestedTrucks}`;
          errorMessage += `\n• Available drivers: ${errorData.debug.availableDrivers}`;
          errorMessage += `\n• Available helpers: ${errorData.debug.availableHelpers}`;

          if (errorData.failedBookings && errorData.failedBookings.length > 0) {
            errorMessage += `\n\nFailed trucks:`;
            errorData.failedBookings.forEach((failure) => {
              errorMessage += `\n• ${failure.truckId}: ${failure.reason}`;
            });
          }
        }

        // Handle legacy driver shortage error
        if (errorData.error === "INSUFFICIENT_DRIVERS") {
          const { required, available, shortage } = errorData;
          errorMessage =
            `⚠️ Driver Shortage Alert!\n\n` +
            `Cannot proceed with booking - all drivers are deployed.\n\n` +
            `• Required drivers: ${required}\n` +
            `• Available drivers: ${available}\n` +
            `• Shortage: ${shortage} driver${shortage !== 1 ? "s" : ""}\n\n` +
            `Please try booking fewer trucks or wait for drivers to become available.`;

          // Reset truck selection and weight to allow user to try again
          setBookingData((prev) => ({
            ...prev,
            selectedTrucks: [],
            weight: "",
          }));
          setRecommendedTrucks([]);
        }
      } else if (apiError.response?.data?.error === "INSUFFICIENT_HELPERS") {
        const { required, available, shortage } = apiError.response.data;
        errorMessage =
          `⚠️ Helper Shortage Alert!\n\n` +
          `Cannot proceed with booking - all helpers are deployed.\n\n` +
          `• Required helpers: ${required}\n` +
          `• Available helpers: ${available}\n` +
          `• Shortage: ${shortage} helper${shortage !== 1 ? "s" : ""}\n\n` +
          `Please try booking fewer trucks or wait for helpers to become available.`;

        // Reset truck selection and weight to allow user to try again
        setBookingData((prev) => ({
          ...prev,
          selectedTrucks: [],
          weight: "",
        }));
        setRecommendedTrucks([]);
      } else if (apiError.response?.data?.message) {
        errorMessage = apiError.response.data.message;
      }

      showError("Booking Failed", errorMessage, { size: "large" });
    }
  };

  const handleLogout = () => {
    logout();
    history.push("/login");
  };

  // Edit profile functions
  const handleEditProfile = () => {
    setEditFormData({
      clientName: clientData?.ClientName || "",
      clientEmail: clientData?.ClientEmail || "",
      clientNumber: clientData?.ClientNumber || "",
    });
    setShowEditModal(true);
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      const response = await axios.put("/api/clients/profile", editFormData);

      if (response.data.client) {
        setClientData(response.data.client);
        showToastSuccess(
          "Profile Updated",
          "Your profile has been updated successfully",
        );
        setShowEditModal(false);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      showToastError(
        "Update Failed",
        error.response?.data?.message || "Failed to update profile",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasswordFormChange = (e) => {
    const { name, value } = e.target;
    setPasswordFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
      showToastError(
        "Password Mismatch",
        "New password and confirm password do not match",
      );
      return;
    }

    if (passwordFormData.newPassword.length < 6) {
      showToastError(
        "Invalid Password",
        "Password must be at least 6 characters long",
      );
      return;
    }

    setIsUpdating(true);

    try {
      await axios.put("/api/clients/profile/password", {
        currentPassword: passwordFormData.currentPassword,
        newPassword: passwordFormData.newPassword,
      });

      showToastSuccess(
        "Password Changed",
        "Your password has been changed successfully",
      );
      setShowPasswordModal(false);
      setPasswordFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      console.error("Error changing password:", error);
      showToastError(
        "Password Change Failed",
        error.response?.data?.message || "Failed to change password",
      );
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
    return deliveries.filter(
      (d) =>
        d.DeliveryStatus === "pending" || d.DeliveryStatus === "in-progress",
    );
  };

  const getCompletedDeliveries = () => {
    return deliveries.filter((d) => d.DeliveryStatus === "completed");
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
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
        delivery.CreatedAt,
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
      return "Date N/A";
    }

    try {
      let dateToFormat = null;

      // Handle Firestore timestamp with seconds
      if (
        dateToProcess &&
        typeof dateToProcess === "object" &&
        (dateToProcess.seconds || dateToProcess._seconds)
      ) {
        const seconds = dateToProcess.seconds || dateToProcess._seconds;
        dateToFormat = new Date(seconds * 1000);
      }
      // Handle Firestore timestamp with toDate method
      else if (dateToProcess && typeof dateToProcess.toDate === "function") {
        dateToFormat = dateToProcess.toDate();
      }
      // Handle regular Date object
      else if (dateToProcess instanceof Date) {
        dateToFormat = dateToProcess;
      }
      // Handle string dates
      else if (typeof dateToProcess === "string") {
        const cleanDateString = dateToProcess.trim();

        // Skip empty or invalid strings
        if (
          !cleanDateString ||
          cleanDateString.toLowerCase() === "null" ||
          cleanDateString.toLowerCase() === "undefined" ||
          cleanDateString === "Invalid Date"
        ) {
          return "Date N/A";
        }

        // Try parsing the string
        dateToFormat = new Date(cleanDateString);
      }
      // Handle numeric timestamps
      else if (typeof dateToProcess === "number") {
        if (dateToProcess === 0 || isNaN(dateToProcess)) {
          return "Date N/A";
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
        const yearDiff = Math.abs(
          now.getFullYear() - dateToFormat.getFullYear(),
        );

        if (yearDiff > 50) {
          return "Date N/A";
        }

        return dateToFormat.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      } else {
        return "Date N/A";
      }
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Date N/A";
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "pending";
      case "in-progress":
        return "in-progress";
      case "awaiting-confirmation":
        return "awaiting-confirmation";
      case "delivered": // Handle both old and new delivered statuses
        return "awaiting-confirmation"; // Treat old "delivered" as awaiting confirmation
      case "completed":
        return "completed";
      case "cancelled":
        return "cancelled";
      default:
        return "pending";
    }
  };

  // Function to handle tab changes with URL updates
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    history.push(`/client/profile?tab=${tab}`);
  };

  // Function to view delivery route
  const viewDeliveryRoute = (delivery) => {
    console.log("Viewing route for delivery:", delivery);

    // Check if we have route information
    if (
      delivery.RouteInfo &&
      delivery.RouteInfo.pickupCoordinates &&
      delivery.RouteInfo.dropoffCoordinates
    ) {
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
        duration: delivery.EstimatedDuration,
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
        duration: delivery.EstimatedDuration,
      });
      setShowRouteModal(true);
    } else {
      showInfo(
        "Route Unavailable",
        "Route information not available for this delivery",
      );
    }
  };

  // Enhanced function to find the most efficient truck combination for cargo weight
  const findBestTruckCombination = (availableTrucks, targetWeight) => {
    console.log(
      `🔍 Finding most efficient truck combination for ${targetWeight} tons`,
    );
    console.log(
      "Available trucks:",
      availableTrucks.map((t) => `${t.TruckPlate}: ${t.TruckCapacity}t`),
    );

    if (!availableTrucks || availableTrucks.length === 0) {
      console.log("❌ No trucks available");
      return [];
    }

    // Sort trucks by capacity for analysis
    const sortedTrucks = [...availableTrucks].sort((a, b) => {
      const capacityA = parseFloat(a.TruckCapacity) || 0;
      const capacityB = parseFloat(b.TruckCapacity) || 0;
      return capacityA - capacityB; // Smallest first for efficiency analysis
    });

    console.log(
      "Available trucks by capacity:",
      sortedTrucks.map((t) => `${t.TruckPlate}: ${t.TruckCapacity}t`),
    );

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
      const efficiency = (
        (targetWeight / parseFloat(bestSingleTruck.TruckCapacity)) *
        100
      ).toFixed(1);
      console.log(
        `✅ Most efficient single truck: ${bestSingleTruck.TruckPlate} (${bestSingleTruck.TruckCapacity}t capacity, ${efficiency}% efficiency)`,
      );
      return [bestSingleTruck];
    }

    console.log(
      "🔄 No single truck can handle the cargo, finding optimal combination...",
    );

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
          const isBetter =
            bestCombination.length === 0 ||
            combination.length < bestCombination.length ||
            (combination.length === bestCombination.length &&
              efficiency > bestEfficiency) ||
            (combination.length === bestCombination.length &&
              efficiency === bestEfficiency &&
              waste < bestWaste);

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
      const trucksWithEfficiency = sortedTrucks
        .map((truck) => {
          const capacity = parseFloat(truck.TruckCapacity) || 0;
          let efficiency = 0;

          if (capacity <= targetWeight) {
            efficiency = capacity / targetWeight; // How much of the target this truck can handle
          } else {
            efficiency = targetWeight / capacity; // Efficiency if used alone
          }

          return { truck, capacity, efficiency };
        })
        .sort((a, b) => b.efficiency - a.efficiency);

      console.log(
        "Trucks sorted by efficiency:",
        trucksWithEfficiency.map(
          (t) =>
            `${t.truck.TruckPlate}: ${t.capacity}t (${(t.efficiency * 100).toFixed(1)}%)`,
        ),
      );

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
            console.log(
              `➕ Added efficient truck: ${truck.TruckPlate} (${capacity}t), remaining: ${remainingWeight.toFixed(1)}t`,
            );
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
      const totalCapacity = optimalTrucks.reduce(
        (sum, truck) => sum + (parseFloat(truck.TruckCapacity) || 0),
        0,
      );

      if (totalCapacity >= targetWeight) {
        const efficiency = ((targetWeight / totalCapacity) * 100).toFixed(1);
        const waste = (totalCapacity - targetWeight).toFixed(1);

        console.log(`✅ Optimal solution found:`);
        console.log(`   Trucks: ${optimalTrucks.length}`);
        console.log(`   Total capacity: ${totalCapacity}t`);
        console.log(`   Cargo weight: ${targetWeight}t`);
        console.log(`   Efficiency: ${efficiency}%`);
        console.log(`   Waste: ${waste}t`);
        console.log(
          `   Combination: ${optimalTrucks.map((t) => `${t.TruckPlate}(${t.TruckCapacity}t)`).join(", ")}`,
        );

        return optimalTrucks;
      } else {
        console.log(
          `❌ Insufficient capacity: ${totalCapacity}t < ${targetWeight}t`,
        );
        return [];
      }
    }

    // No suitable combination found
    console.log("❌ No suitable truck combination found");
    return [];
  };

  // Function to check staff availability
  const checkStaffAvailability = async (requiredTrucks) => {
    // Staff availability is validated during the actual booking process on the backend
    // No need for preemptive check - just return success
    return {
      sufficient: true,
      message: "Staff availability checked during booking",
    };
  };

  // Function to handle smart booking
  const handleSmartBooking = async (cargoWeight) => {
    console.log(`🚀 Smart booking triggered for ${cargoWeight} tons`);

    if (!cargoWeight || cargoWeight <= 0) {
      console.log("❌ Invalid cargo weight");
      setRecommendedTrucks([]);
      return;
    }

    // Filter available trucks - allow trucks with active deliveries on different dates
    let availableTrucks = allocatedTrucks.filter((truck) => {
      // Only exclude trucks under maintenance or broken
      const operationalStatus =
        truck.operationalStatus?.toLowerCase() ||
        truck.OperationalStatus?.toLowerCase();

      if (
        operationalStatus === "maintenance" ||
        operationalStatus === "broken"
      ) {
        console.log(`❌ Truck ${truck.TruckPlate} is ${operationalStatus}`);
        return false;
      }

      // Check date-specific availability if date is selected
      if (bookingData.deliveryDate) {
        const hasDateConflict = deliveries.some((delivery) => {
          if ((delivery.TruckID || delivery.truckId) !== truck.TruckID)
            return false;

          const deliveryStatus = (
            delivery.DeliveryStatus ||
            delivery.deliveryStatus ||
            ""
          ).toLowerCase();
          if (
            !["pending", "in-progress", "started", "picked-up"].includes(
              deliveryStatus,
            )
          )
            return false;

          // Extract delivery date
          let deliveryDateStr = delivery.deliveryDateString;
          if (!deliveryDateStr && delivery.DeliveryDate) {
            if (delivery.DeliveryDate.seconds) {
              deliveryDateStr = new Date(delivery.DeliveryDate.seconds * 1000)
                .toISOString()
                .split("T")[0];
            } else {
              deliveryDateStr = new Date(delivery.DeliveryDate)
                .toISOString()
                .split("T")[0];
            }
          }

          const selectedDateStr = new Date(bookingData.deliveryDate)
            .toISOString()
            .split("T")[0];
          return deliveryDateStr === selectedDateStr;
        });

        if (hasDateConflict) {
          console.log(
            `❌ Truck ${truck.TruckPlate} is booked on ${bookingData.deliveryDate}`,
          );
          return false;
        }
      }

      console.log(`✅ Truck ${truck.TruckPlate} is available for booking`);
      return true;
    });

    console.log(
      `📋 Available trucks for booking: ${availableTrucks.length}/${allocatedTrucks.length}`,
    );

    if (availableTrucks.length === 0) {
      console.log("❌ No trucks available for booking");
      setRecommendedTrucks([]);
      showWarning(
        "No Available Trucks",
        "No trucks are currently available for booking. Please wait for trucks to become available or contact support.",
      );
      return;
    }

    // Calculate total capacity of all available trucks
    const totalAvailableCapacity = availableTrucks.reduce((sum, truck) => {
      return sum + (parseFloat(truck.TruckCapacity) || 0);
    }, 0);

    console.log(
      `📊 Total available capacity: ${totalAvailableCapacity} tons vs cargo weight: ${cargoWeight} tons`,
    );

    // Check if total capacity is insufficient
    if (totalAvailableCapacity < cargoWeight) {
      console.log(
        `❌ Insufficient total capacity: ${totalAvailableCapacity}t < ${cargoWeight}t`,
      );

      // Calculate how many more trucks are needed
      const shortfall = cargoWeight - totalAvailableCapacity;
      const averageTruckCapacity =
        allocatedTrucks.length > 0
          ? allocatedTrucks.reduce(
              (sum, truck) => sum + (parseFloat(truck.TruckCapacity) || 0),
              0,
            ) / allocatedTrucks.length
          : 5; // Default assumption of 5 tons per truck

      const estimatedAdditionalTrucks = Math.ceil(
        shortfall / averageTruckCapacity,
      );

      // Show detailed warning message
      let warningMessage = `⚠️ INSUFFICIENT TRUCK CAPACITY\n\n`;
      warningMessage += `📦 Your cargo weight: ${cargoWeight} tons\n`;
      warningMessage += `🚛 Available truck capacity: ${totalAvailableCapacity} tons\n`;
      warningMessage += `📉 Shortfall: ${shortfall.toFixed(1)} tons\n\n`;
      warningMessage += `SOLUTIONS:\n`;
      warningMessage += `1. 📞 Contact admin to allocate approximately ${estimatedAdditionalTrucks} more truck${estimatedAdditionalTrucks !== 1 ? "s" : ""}\n`;
      warningMessage += `2. ⏳ Wait for other trucks to complete their deliveries\n`;
      warningMessage += `3. 📦 Split your cargo into smaller shipments\n\n`;

      // Show currently available trucks for reference
      warningMessage += `Currently available trucks:\n`;
      availableTrucks.forEach((truck, index) => {
        warningMessage += `• ${truck.TruckPlate}: ${truck.TruckCapacity} tons\n`;
      });

      // Show trucks that are currently in use
      const trucksInUse = allocatedTrucks.filter((truck) => {
        const isInUse = deliveries.some(
          (delivery) =>
            delivery.TruckID === truck.TruckID &&
            (delivery.DeliveryStatus === "pending" ||
              delivery.DeliveryStatus === "in-progress"),
        );
        return isInUse;
      });

      if (trucksInUse.length > 0) {
        warningMessage += `\nTrucks currently in use:\n`;
        trucksInUse.forEach((truck, index) => {
          warningMessage += `• ${truck.TruckPlate}: ${truck.TruckCapacity} tons (in delivery)\n`;
        });
      }

      showWarning("Insufficient Truck Capacity", warningMessage, {
        size: "large",
      });
      setRecommendedTrucks([]);
      return;
    }

    // Find optimal truck combination
    const optimalTrucks = findBestTruckCombination(
      availableTrucks,
      cargoWeight,
    );

    if (optimalTrucks.length > 0) {
      console.log(
        `✅ Recommended ${optimalTrucks.length} trucks for ${cargoWeight} tons`,
      );

      // Check staff availability for the recommended trucks
      const staffCheck = await checkStaffAvailability(optimalTrucks.length);

      setRecommendedTrucks(optimalTrucks);

      // Auto-select the recommended trucks
      const truckIds = optimalTrucks.map((truck) => truck.TruckID);
      setBookingData((prev) => ({
        ...prev,
        selectedTrucks: truckIds,
      }));

      console.log("🎯 Auto-selected trucks:", truckIds);

      // Show warning if staff might be insufficient
      if (
        !staffCheck.sufficient &&
        staffCheck.message !== "Will check during booking"
      ) {
        showWarning(
          "Staff Availability Warning",
          `${staffCheck.message}\n\nYou can still proceed, but the booking may fail if there aren't enough available drivers or helpers.`,
        );
      }
    } else {
      console.log("❌ No suitable truck combination found");
      setRecommendedTrucks([]);
      showWarning(
        "No Suitable Combination",
        "Unable to find a suitable truck combination. Please try a different cargo weight or contact support.",
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
        <form onSubmit={handleBookingSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="weight" className="text-sm font-bold text-gray-700">
              Cargo Weight (tons)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                id="weight"
                name="weight"
                value={bookingData.weight}
                onChange={handleCapacityChange}
                className="flex-1 w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                required
                min="0.1"
                step="0.1"
                placeholder="Enter cargo weight in tons"
              />
              <button
                type="button"
                className={`px-4 py-2 rounded-xl font-bold text-white transition-all shadow-md ${
                  !bookingData.weight || parseFloat(bookingData.weight) <= 0
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20 active:translate-y-0.5"
                }`}
                onClick={async () => {
                  const weight = parseFloat(bookingData.weight);
                  if (weight && weight > 0) {
                    console.log(
                      `🚀 Smart booking triggered for ${weight} tons`,
                    );
                    await handleSmartBooking(weight);
                  } else {
                    showWarning(
                      "Invalid Input",
                      "Please enter a valid cargo weight first",
                    );
                  }
                }}
                disabled={
                  !bookingData.weight || parseFloat(bookingData.weight) <= 0
                }
              >
                🚀 Smart Book
              </button>
            </div>
            <small className="text-xs text-gray-500">
              Enter cargo weight and click "Smart Book" to automatically find
              the optimal truck combination
            </small>
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="pickupLocation"
              className="text-sm font-bold text-gray-700"
            >
              <FaMapMarkerAlt className="inline mr-1" /> Pickup Location
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="pickupLocation"
                name="pickupLocation"
                value={bookingData.pickupLocation}
                onChange={(e) =>
                  setBookingData((prev) => ({
                    ...prev,
                    pickupLocation: e.target.value,
                  }))
                }
                className="flex-1 w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                required
                placeholder="Enter pickup address"
              />
              <button
                type="button"
                className="px-4 py-2 border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 rounded-xl font-medium transition-colors flex items-center gap-2"
                onClick={() => openMapModal("pickup")}
              >
                <FaSearch /> Map
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="dropoffLocation"
              className="text-sm font-bold text-gray-700"
            >
              <FaMapMarkerAlt className="inline mr-1" /> Drop-off Location
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="dropoffLocation"
                name="dropoffLocation"
                value={bookingData.dropoffLocation}
                onChange={(e) =>
                  setBookingData((prev) => ({
                    ...prev,
                    dropoffLocation: e.target.value,
                  }))
                }
                className="flex-1 w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                required
                placeholder="Enter delivery address"
              />
              <button
                type="button"
                className="px-4 py-2 border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 rounded-xl font-medium transition-colors flex items-center gap-2"
                onClick={() => openMapModal("dropoff")}
              >
                <FaSearch /> Map
              </button>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              className="px-4 py-2 border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl font-bold flex items-center gap-2 transition-colors"
              onClick={toggleRoutePreview}
              disabled={
                !bookingData.pickupCoordinates ||
                !bookingData.dropoffCoordinates
              }
            >
              <FaRoute />{" "}
              {showRoutePreview ? "Hide Route Preview" : "Show Route Preview"}
            </button>
          </div>

          {/* Automatically show route info when both coordinates are available */}
          {bookingData.pickupCoordinates && bookingData.dropoffCoordinates && (
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <div className="mb-3 pb-2 border-b border-blue-200/50">
                <h4 className="text-sm font-bold text-blue-800 m-0 flex items-center gap-2">
                  🚛 Delivery Route Information (Philippines Only)
                </h4>
              </div>

              {/* Always show RouteMap when coordinates are available for calculation */}
              <div style={{ display: "none" }}>
                <RouteMap
                  pickupCoordinates={bookingData.pickupCoordinates}
                  dropoffCoordinates={bookingData.dropoffCoordinates}
                  pickupAddress={bookingData.pickupLocation}
                  dropoffAddress={bookingData.dropoffLocation}
                  onRouteCalculated={handleRouteCalculated}
                />
              </div>

              {routeDetails && (
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="flex items-start gap-3 bg-white p-3 rounded-lg shadow-sm border border-blue-100">
                    <div className="text-2xl mt-1">📏</div>
                    <div>
                      <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                        Distance
                      </div>
                      <div className="text-lg font-bold text-gray-800">
                        {routeDetails.distanceText}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-white p-3 rounded-lg shadow-sm border border-blue-100">
                    <div className="text-2xl mt-1">⏱️</div>
                    <div>
                      <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                        Travel Time
                      </div>
                      <div className="text-lg font-bold text-gray-800">
                        {routeDetails.durationText}
                      </div>
                    </div>
                  </div>

                  {routeDetails.averageSpeed && (
                    <div className="flex items-start gap-3 bg-white p-3 rounded-lg shadow-sm border border-blue-100 col-span-2">
                      <div className="text-2xl mt-1">🚗</div>
                      <div>
                        <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                          Avg Speed
                        </div>
                        <div className="text-lg font-bold text-gray-800">
                          {routeDetails.averageSpeed} km/h
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {routeDetails && routeDetails.isShortestRoute && (
                <div className="bg-emerald-100 text-emerald-800 text-xs px-3 py-2 rounded-lg font-medium mb-2 flex items-center gap-2">
                  ✅ Shortest route automatically selected (
                  {routeDetails.totalRoutes} routes analyzed)
                </div>
              )}

              {routeDetails && routeDetails.isEstimate && (
                <div className="bg-amber-100 text-amber-800 text-xs px-3 py-2 rounded-lg font-medium flex items-center gap-2">
                  ℹ️ Estimated values based on Philippines road conditions
                </div>
              )}

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 underline flex items-center gap-1"
                  onClick={toggleRoutePreview}
                >
                  <FaRoute /> {showRoutePreview ? "Hide Map" : "View Map"}
                </button>
              </div>
            </div>
          )}

          {showRoutePreview && (
            <div className="mt-4 border rounded-xl overflow-hidden shadow-md">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <h4 className="text-sm font-bold text-gray-700 m-0">
                  Delivery Route Map Preview
                </h4>
              </div>
              <div className="h-64 w-full">
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

          <div className="flex flex-col gap-2">
            <label
              htmlFor="deliveryDate"
              className="text-sm font-bold text-gray-700"
            >
              <FaCalendarAlt className="inline mr-1" /> Delivery Date
            </label>
            <input
              type="date"
              id="deliveryDate"
              name="deliveryDate"
              value={bookingData.deliveryDate}
              onChange={handleDateChange}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
              required
              min={new Date().toISOString().split("T")[0]}
              disabled={isCheckingAvailability}
            />
            {isCheckingAvailability && (
              <small className="text-xs text-blue-600 animate-pulse font-medium">
                🔍 Checking truck availability...
              </small>
            )}
            {bookingData.deliveryDate && availableTrucksForDate.length > 0 && (
              <small className="text-xs text-emerald-600 font-medium">
                ✅ {availableTrucksForDate.length} truck(s) available on this
                date
              </small>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="deliveryTime"
              className="text-sm font-bold text-gray-700"
            >
              Delivery Time
            </label>
            <input
              type="time"
              id="deliveryTime"
              name="deliveryTime"
              value={bookingData.deliveryTime}
              onChange={(e) =>
                setBookingData((prev) => ({
                  ...prev,
                  deliveryTime: e.target.value,
                }))
              }
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
              required
            />
          </div>

          {/* Contact Information Tip */}
          <div className="bg-blue-50 text-blue-700 p-3 rounded-xl border border-blue-200 text-sm flex items-start gap-2">
            <span className="text-lg">💡</span>
            <div>
              <strong>Tip:</strong> If you select a saved location, contact info
              will be auto-filled
            </div>
          </div>

          {/* Pickup Contact Information */}
          <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
            <h5 className="text-sm font-bold text-blue-800 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">
              📍 Pickup Contact Information
            </h5>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="pickupContactPerson"
                  className="text-sm font-bold text-gray-700"
                >
                  <FaUser className="inline mr-1" /> Contact Person{" "}
                  <span className="text-gray-400 font-normal text-xs">
                    (Optional)
                  </span>
                </label>
                <input
                  type="text"
                  id="pickupContactPerson"
                  name="pickupContactPerson"
                  value={bookingData.pickupContactPerson || ""}
                  onChange={(e) =>
                    setBookingData((prev) => ({
                      ...prev,
                      pickupContactPerson: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                  placeholder="Person at pickup"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="pickupContactNumber"
                  className="text-sm font-bold text-gray-700"
                >
                  <FaPhone className="inline mr-1" /> Contact Number{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="pickupContactNumber"
                  name="pickupContactNumber"
                  value={bookingData.pickupContactNumber || ""}
                  onChange={(e) =>
                    setBookingData((prev) => ({
                      ...prev,
                      pickupContactNumber: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                  required
                  placeholder="e.g., 09605877964"
                />
              </div>
            </div>
          </div>

          {/* Dropoff Contact Information */}
          <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
            <h5 className="text-sm font-bold text-blue-800 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">
              📍 Dropoff Contact Information
            </h5>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="dropoffContactPerson"
                  className="text-sm font-bold text-gray-700"
                >
                  <FaUser className="inline mr-1" /> Contact Person{" "}
                  <span className="text-gray-400 font-normal text-xs">
                    (Optional)
                  </span>
                </label>
                <input
                  type="text"
                  id="dropoffContactPerson"
                  name="dropoffContactPerson"
                  value={bookingData.dropoffContactPerson || ""}
                  onChange={(e) =>
                    setBookingData((prev) => ({
                      ...prev,
                      dropoffContactPerson: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                  placeholder="Person at dropoff"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="dropoffContactNumber"
                  className="text-sm font-bold text-gray-700"
                >
                  <FaPhone className="inline mr-1" /> Contact Number{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="dropoffContactNumber"
                  name="dropoffContactNumber"
                  value={bookingData.dropoffContactNumber || ""}
                  onChange={(e) =>
                    setBookingData((prev) => ({
                      ...prev,
                      dropoffContactNumber: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                  required
                  placeholder="e.g., 09605877964"
                />
              </div>
            </div>
          </div>

          {/* Price Estimation Section */}
          {bookingData.selectedTrucks.length > 0 && routeDetails && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200 shadow-sm relative overflow-hidden">
              <h4 className="text-base font-bold text-blue-900 mb-3 pb-2 border-b border-blue-200 mx-0 flex items-center gap-2">
                🧮 Estimated Cost
              </h4>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 font-medium">Distance:</span>
                  <span className="font-bold text-gray-800">
                    {routeDetails.distanceText}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 font-medium">
                    Selected Trucks:
                  </span>
                  <span className="font-bold text-gray-800">
                    {bookingData.selectedTrucks.length} truck
                    {bookingData.selectedTrucks.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 font-medium">
                    Estimated Cost per Truck:
                  </span>
                  <span className="font-bold text-blue-700">
                    ₱{calculateEstimatedCostPerTruck()}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 mt-1 border-t border-blue-200/50">
                  <span className="text-base font-bold text-blue-900">
                    Total Estimated Cost:
                  </span>
                  <span className="text-xl font-extrabold text-blue-700">
                    ₱{calculateTotalEstimatedCost()}
                  </span>
                </div>
                {(() => {
                  if (!routeDetails || !bookingData.selectedTrucks.length)
                    return null;
                  const firstTruck = allocatedTrucks.find((truck) =>
                    bookingData.selectedTrucks.includes(truck.TruckID),
                  );
                  if (!firstTruck) return null;

                  const vehicleType = firstTruck.TruckType || "mini truck";
                  const distance = routeDetails.distanceValue || 0;
                  let rate = vehicleRates.find(
                    (r) => r.vehicleType === vehicleType,
                  );

                  if (rate) {
                    const baseRate = parseFloat(rate.baseRate) || 0;
                    const ratePerKm = parseFloat(rate.ratePerKm) || 0;
                    return (
                      <div className="text-xs text-gray-500 mt-1 italic text-right">
                        <small>
                          {vehicleType}: ₱{baseRate} base + {distance}km × ₱
                          {ratePerKm}/km × {bookingData.selectedTrucks.length}{" "}
                          truck
                          {bookingData.selectedTrucks.length !== 1 ? "s" : ""}
                        </small>
                      </div>
                    );
                  }
                  return null;
                })()}
                <div className="text-xs text-gray-500 mt-2 bg-white/50 p-2 rounded border border-blue-100">
                  * Final pricing calculated using current vehicle rates set by
                  staff
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-700">
              Select Trucks for Booking
            </label>
            <p className="text-xs text-gray-500 m-0">
              📋 Only trucks allocated to your account can be booked. Contact
              your account manager if you need additional trucks.
            </p>
            {bookingData.weight && recommendedTrucks.length > 0 && (
              <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl border border-emerald-200 mb-3 flex items-start gap-2 text-sm">
                <span className="text-lg">⚙️</span>
                <div>
                  <strong>Smart Recommendation:</strong>{" "}
                  {recommendedTrucks.length} truck
                  {recommendedTrucks.length !== 1 ? "s" : ""} recommended for{" "}
                  {bookingData.weight} tons cargo
                </div>
              </div>
            )}
            {(() => {
              // Filter trucks - allow trucks with active deliveries as long as dates don't conflict
              console.log(
                `🔍 UI Filter: Checking ${allocatedTrucks.length} allocated trucks`,
              );
              let availableTrucks = allocatedTrucks.filter((truck) => {
                // Only exclude trucks that are under maintenance or broken
                const operationalStatus =
                  truck.operationalStatus?.toLowerCase() ||
                  truck.OperationalStatus?.toLowerCase();

                if (
                  operationalStatus === "maintenance" ||
                  operationalStatus === "broken"
                ) {
                  return false;
                }

                return true; // Show all other trucks
              });

              // REAL-TIME DATE-BASED AVAILABILITY: Filter by selected date
              if (
                bookingData.deliveryDate &&
                availableTrucksForDate.length > 0
              ) {
                // Only show trucks available on the selected date (from backend API)
                availableTrucks = availableTrucks.filter((truck) =>
                  availableTrucksForDate.includes(truck.TruckID),
                );
              } else if (bookingData.deliveryDate) {
                // If date is selected but API hasn't returned yet, do client-side date checking
                availableTrucks = availableTrucks.filter((truck) => {
                  const hasDateConflict = deliveries.some((delivery) => {
                    if (
                      (delivery.TruckID || delivery.truckId) !== truck.TruckID
                    )
                      return false;

                    const deliveryStatus = (
                      delivery.DeliveryStatus ||
                      delivery.deliveryStatus ||
                      ""
                    ).toLowerCase();
                    if (
                      ![
                        "pending",
                        "in-progress",
                        "started",
                        "picked-up",
                      ].includes(deliveryStatus)
                    )
                      return false;

                    // Extract delivery date
                    let deliveryDateStr = delivery.deliveryDateString;
                    if (!deliveryDateStr && delivery.DeliveryDate) {
                      if (delivery.DeliveryDate.seconds) {
                        deliveryDateStr = new Date(
                          delivery.DeliveryDate.seconds * 1000,
                        )
                          .toISOString()
                          .split("T")[0];
                      } else {
                        deliveryDateStr = new Date(delivery.DeliveryDate)
                          .toISOString()
                          .split("T")[0];
                      }
                    }

                    const selectedDateStr = new Date(bookingData.deliveryDate)
                      .toISOString()
                      .split("T")[0];
                    return deliveryDateStr === selectedDateStr;
                  });

                  return !hasDateConflict;
                });
              }

              return availableTrucks.length > 0 ? (
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                    {availableTrucks.map((truck, index) => {
                      const isRecommended = recommendedTrucks.some(
                        (rt) => rt.TruckID === truck.TruckID,
                      );
                      const isSelected = bookingData.selectedTrucks.includes(
                        truck.TruckID,
                      );
                      const capacity = parseFloat(truck.TruckCapacity) || 0;
                      const cargoWeight = parseFloat(bookingData.weight) || 0;

                      // Calculate cargo distribution only for selected trucks
                      let assignedCargo = 0;
                      let utilizationPercentage = 0;

                      if (isSelected && cargoWeight > 0) {
                        // Get all selected trucks and sort by capacity (biggest first)
                        const selectedTruckObjects = bookingData.selectedTrucks
                          .map((id) =>
                            availableTrucks.find((t) => t.TruckID === id),
                          )
                          .filter((t) => t)
                          .sort(
                            (a, b) =>
                              (parseFloat(b.TruckCapacity) || 0) -
                              (parseFloat(a.TruckCapacity) || 0),
                          );

                        // Calculate total capacity of selected trucks
                        const totalSelectedCapacity =
                          selectedTruckObjects.reduce(
                            (sum, t) =>
                              sum + (parseFloat(t.TruckCapacity) || 0),
                            0,
                          );

                        // Distribute cargo proportionally
                        if (totalSelectedCapacity > 0) {
                          assignedCargo =
                            (capacity / totalSelectedCapacity) * cargoWeight;
                          utilizationPercentage =
                            (assignedCargo / capacity) * 100;
                        }
                      }

                      return (
                        <div
                          key={truck.TruckID}
                          className={`relative border rounded-xl p-3 cursor-pointer transition-all hover:translate-y-[-2px] hover:shadow-md ${
                            isSelected
                              ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                              : isRecommended
                                ? "border-amber-400 bg-amber-50"
                                : "border-gray-200 bg-white hover:bg-gray-50"
                          }`}
                          onClick={() =>
                            handleTruckSelectionWithAvailability(truck.TruckID)
                          }
                        >
                          {isRecommended && (
                            <div className="absolute top-2 right-2 bg-amber-400 text-white text-[10px] font-extrabold px-2 py-0.5 rounded shadow-sm z-10">
                              RECOMMENDED
                            </div>
                          )}
                          <div className="flex gap-3 items-center mb-2">
                            <div
                              className={`p-2 rounded-lg ${isSelected ? "bg-blue-200 text-blue-700" : "bg-gray-100 text-gray-500"}`}
                            >
                              <FaTruck className="text-xl" />
                            </div>
                            <div>
                              <div className="font-bold text-gray-800 text-sm">
                                {truck.TruckPlate}
                              </div>
                              <div className="text-xs text-gray-500 uppercase font-medium">
                                {truck.TruckType}
                              </div>
                            </div>
                          </div>

                          <div className="text-sm text-gray-600 mb-2">
                            {truck.TruckCapacity} tons capacity
                          </div>

                          {assignedCargo > 0 && (
                            <div className="text-xs font-bold text-blue-600 mb-2">
                              {assignedCargo > 0
                                ? `${assignedCargo.toFixed(1)}t cargo`
                                : "Backup truck"}
                            </div>
                          )}

                          <div className="absolute top-2 right-2">
                            {isSelected && (
                              <span className="text-blue-600 font-bold text-lg">
                                ✓
                              </span>
                            )}
                          </div>

                          <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                utilizationPercentage > 100
                                  ? "bg-red-500"
                                  : "bg-emerald-500"
                              }`}
                              style={{
                                width: `${Math.min(100, utilizationPercentage)}%`,
                              }}
                            ></div>
                          </div>
                          <div className="text-[10px] text-gray-500 mt-1 text-right font-medium">
                            {utilizationPercentage.toFixed(0)}% utilized
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-6 text-center text-gray-500">
                  <p className="m-0 font-medium">
                    No available trucks for booking.
                  </p>
                  <p className="m-0 text-sm mt-1">
                    All trucks are currently in use or contact your account
                    manager to get trucks allocated.
                  </p>
                </div>
              );
            })()}
            <small className="text-xs text-gray-500 mt-2 block">
              {bookingData.selectedTrucks.length} truck
              {bookingData.selectedTrucks.length !== 1 ? "s" : ""} selected
              {bookingData.selectedTrucks.length > 0 && (
                <span className="font-medium text-gray-700">
                  {" "}
                  • Total capacity:{" "}
                  {bookingData.selectedTrucks
                    .map((id) => allocatedTrucks.find((t) => t.TruckID === id))
                    .filter((t) => t)
                    .reduce(
                      (sum, truck) =>
                        sum + (parseFloat(truck.TruckCapacity) || 0),
                      0,
                    )}{" "}
                  tons
                </span>
              )}
            </small>
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
            <button
              type="button"
              className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 bg-white hover:bg-gray-50 transition-colors font-medium"
              onClick={() => setShowBookingModal(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-bold shadow-md shadow-blue-500/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              disabled={bookingData.selectedTrucks.length === 0}
            >
              Book {bookingData.selectedTrucks.length} Truck
              {bookingData.selectedTrucks.length !== 1 ? "s" : ""}
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
    if (truckFilters.type !== "all") {
      filtered = filtered.filter((truck) =>
        truck.TruckType?.toLowerCase().includes(
          truckFilters.type.toLowerCase(),
        ),
      );
    }

    // Filter by status - TEMPORARILY SHOW ALL TRUCKS FOR DEBUGGING
    if (truckFilters.status !== "all") {
      const shouldShowAvailable = truckFilters.status === "available";
      filtered = filtered.filter((truck) => {
        // Use enhanced truck status fields and active delivery status for availability
        const truckStatus = truck.TruckStatus?.toLowerCase();
        const allocationStatus =
          truck.allocationStatus?.toLowerCase() ||
          truck.AllocationStatus?.toLowerCase();
        const operationalStatus =
          truck.operationalStatus?.toLowerCase() ||
          truck.OperationalStatus?.toLowerCase();
        const availabilityStatus =
          truck.availabilityStatus?.toLowerCase() ||
          truck.AvailabilityStatus?.toLowerCase();
        const isActivelyInUse = truck.activeDelivery === true;

        const statusAvailable =
          // Check legacy status for backward compatibility
          (truckStatus === "allocated" || truckStatus === "available") &&
          // Check enhanced allocation status (preferred)
          (!allocationStatus ||
            allocationStatus === "allocated" ||
            allocationStatus === "available") &&
          // Check operational status
          (!operationalStatus || operationalStatus === "active") &&
          // Check availability status
          (!availabilityStatus ||
            availabilityStatus === "free" ||
            availabilityStatus === "busy");

        const truckIsAvailable = statusAvailable && !isActivelyInUse;

        // DEBUG: Log truck status
        console.log(
          `🔍 Truck ${truck.TruckPlate}: status="${truckStatus}", activeDelivery=${isActivelyInUse}, isAvailable=${truckIsAvailable}, shouldShow=${truckIsAvailable === shouldShowAvailable}`,
        );

        return truckIsAvailable === shouldShowAvailable;
      });
    }

    // Filter by search
    if (truckFilters.search) {
      const searchTerm = truckFilters.search.toLowerCase();
      filtered = filtered.filter(
        (truck) =>
          truck.TruckPlate?.toLowerCase().includes(searchTerm) ||
          truck.TruckType?.toLowerCase().includes(searchTerm),
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
    const types = [
      ...new Set(
        allocatedTrucks.map((truck) => truck.TruckType).filter(Boolean),
      ),
    ];
    return types.sort();
  };

  const handleFilterChange = (filterType, value) => {
    setTruckFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
    setCurrentTruckPage(1); // Reset to first page when filtering
  };

  const resetFilters = () => {
    setTruckFilters({
      type: "all",
      status: "all",
      search: "",
    });
    setCurrentTruckPage(1);
  };

  // Handle delivery received confirmation
  const handleDeliveryReceived = async (deliveryId) => {
    try {
      console.log("🔄 Confirming delivery received for:", deliveryId);

      // Validate deliveryId
      if (!deliveryId) {
        console.error("❌ No delivery ID provided");
        showError(
          "Error",
          "Invalid delivery ID. Please refresh the page and try again.",
        );
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        console.error("❌ No authentication token found");
        showError("Authentication Error", "Please login again.");
        return;
      }

      // Show confirmation dialog
      const confirmed = window.confirm(
        "Are you sure you want to confirm that you have received this delivery? This action cannot be undone.",
      );

      if (!confirmed) {
        console.log("🚫 User cancelled confirmation");
        return;
      }

      // Set loading state for this specific delivery
      setIsLoading(true);
      console.log("🔄 Making API call to confirm delivery...");

      // Construct the API URL carefully
      const apiUrl = `/api/clients/deliveries/${deliveryId}/confirm-received`;
      console.log("🌐 API URL:", apiUrl);

      // Make API call to confirm delivery received
      const response = await axios.put(
        apiUrl,
        {
          clientConfirmed: true,
          confirmedAt: new Date().toISOString(),
          notes: "Client confirmed delivery received",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 10000, // 10 second timeout
        },
      );

      console.log("✅ Delivery confirmation response:", response.data);

      if (response.data.success) {
        // Update the local deliveries state to reflect the confirmation
        setDeliveries((prevDeliveries) =>
          prevDeliveries.map((delivery) =>
            delivery.DeliveryID === deliveryId
              ? {
                  ...delivery,
                  clientConfirmed: true,
                  confirmedAt: new Date().toISOString(),
                  DeliveryStatus: "completed", // Mark as completed after client confirmation
                }
              : delivery,
          ),
        );

        // Show success message
        showSuccess(
          "Delivery Confirmed!",
          "Thank you for confirming that you have received your delivery. The driver and our team have been notified.",
        );
      } else {
        throw new Error(response.data.message || "Confirmation failed");
      }
    } catch (error) {
      console.error("❌ Error confirming delivery received:", error);
      console.error("❌ Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
      });

      let errorMessage =
        "Failed to confirm delivery received. Please try again.";

      if (error.response?.status === 404) {
        errorMessage =
          "Delivery not found. Please refresh the page and try again.";
      } else if (error.response?.status === 403) {
        errorMessage = "You are not authorized to confirm this delivery.";
      } else if (error.response?.status === 400) {
        errorMessage =
          error.response.data?.message ||
          "This delivery cannot be confirmed at this time.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.code === "ECONNABORTED") {
        errorMessage =
          "Request timed out. Please check your connection and try again.";
      }

      showError("Confirmation Failed", errorMessage);
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
      pickupLocation: delivery.PickupLocation || "",
      pickupCoordinates:
        delivery.pickupCoordinates || delivery.PickupCoordinates || null,
      dropoffLocation:
        delivery.DropoffLocation || delivery.DeliveryAddress || "",
      dropoffCoordinates:
        delivery.dropoffCoordinates || delivery.DropoffCoordinates || null,
      newDistance: 0,
      newCost: 0,
    });
    setShowChangeRouteModal(true);
  };

  const handleRebookDelivery = (delivery) => {
    setSelectedDelivery(delivery);
    const currentDate = new Date(delivery.DeliveryDate);
    setRebookData({
      newDate: currentDate.toISOString().split("T")[0],
      newTime: "12:00",
    });
    setShowRebookModal(true);
  };

  // Cancel delivery confirmation
  const confirmCancelDelivery = async () => {
    try {
      setIsLoading(true);

      const response = await axios.post(
        `/api/clients/deliveries/${selectedDelivery.DeliveryID}/cancel`,
      );

      if (response.data.success) {
        // Update local state
        setDeliveries((prevDeliveries) =>
          prevDeliveries.map((delivery) =>
            delivery.DeliveryID === selectedDelivery.DeliveryID
              ? { ...delivery, DeliveryStatus: "cancelled" }
              : delivery,
          ),
        );

        showToastSuccess(
          "Delivery Cancelled",
          "Your delivery has been cancelled successfully. No payment is required.",
        );
        setShowCancelModal(false);
        setSelectedDelivery(null);
      }
    } catch (error) {
      console.error("Error cancelling delivery:", error);
      showToastError(
        "Cancellation Failed",
        error.response?.data?.message || "Failed to cancel delivery",
      );
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
      if (
        changeRouteData.pickupCoordinates &&
        changeRouteData.dropoffCoordinates
      ) {
        const pickup = changeRouteData.pickupCoordinates;
        const dropoff = changeRouteData.dropoffCoordinates;

        // Calculate distance using Haversine formula
        const R = 6371; // Earth's radius in kilometers
        const dLat = ((dropoff.lat - pickup.lat) * Math.PI) / 180;
        const dLon = ((dropoff.lng - pickup.lng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((pickup.lat * Math.PI) / 180) *
            Math.cos((dropoff.lat * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        estimatedDistance = Math.round(R * c * 100) / 100; // Round to 2 decimal places
      } else {
        // Fallback to mock calculation
        estimatedDistance = Math.floor(Math.random() * 50) + 10; // 10-60 km
      }

      // Get vehicle type from selected delivery
      console.log("🔍 Selected delivery data:", selectedDelivery);
      const vehicleType =
        selectedDelivery?.VehicleType ||
        selectedDelivery?.vehicleType ||
        "mini truck";
      console.log("🚛 Vehicle type for calculation:", vehicleType);
      console.log("📊 Available vehicle rates:", vehicleRates);

      // Find the matching rate with improved matching logic
      const rate = vehicleRates.find((r) => {
        const rateType = r.vehicleType || r.VehicleType || "";
        const deliveryType = vehicleType || "";

        // Exact match
        if (rateType === deliveryType) return true;

        // Case insensitive match
        if (rateType.toLowerCase() === deliveryType.toLowerCase()) return true;

        // Handle common variations
        const normalizedRateType = rateType.toLowerCase().replace(/\s+/g, "");
        const normalizedDeliveryType = deliveryType
          .toLowerCase()
          .replace(/\s+/g, "");

        // Map common variations
        const typeMapping = {
          smalltruck: "minitruck",
          small: "mini",
          minitruck: "minitruck",
          mini: "mini",
        };

        const mappedRateType =
          typeMapping[normalizedRateType] || normalizedRateType;
        const mappedDeliveryType =
          typeMapping[normalizedDeliveryType] || normalizedDeliveryType;

        return mappedRateType === mappedDeliveryType;
      });

      console.log("💰 Found rate:", rate);

      let newCost = 750; // Default fallback cost
      if (rate) {
        // Use the correct formula: base rate + (distance × rate per km)
        const baseRate = rate.baseRate || rate.BaseRate || 100;
        const ratePerKm = rate.ratePerKm || rate.RatePerKm || 15;

        newCost = baseRate + estimatedDistance * ratePerKm;
        console.log(
          `💰 Calculation: ${baseRate} + (${estimatedDistance} × ${ratePerKm}) = ${newCost}`,
        );
      } else {
        console.warn("⚠️ No rate found for vehicle type:", vehicleType);
        // Try to use the original delivery rate as reference
        if (
          selectedDelivery?.DeliveryRate &&
          selectedDelivery?.DeliveryDistance
        ) {
          const originalRate =
            selectedDelivery.DeliveryRate / selectedDelivery.DeliveryDistance;
          newCost = 100 + estimatedDistance * originalRate; // Assume 100 base rate
        }
      }

      // Round the cost to 2 decimal places
      newCost = Math.round(newCost * 100) / 100;

      setChangeRouteData((prev) => ({
        ...prev,
        newDistance: estimatedDistance,
        newCost: newCost,
      }));
    } catch (error) {
      console.error("Error calculating new route:", error);
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

      const response = await axios.post(
        `/api/clients/deliveries/${selectedDelivery.DeliveryID}/change-route`,
        {
          pickupLocation: changeRouteData.pickupLocation,
          pickupCoordinates: changeRouteData.pickupCoordinates,
          dropoffLocation: changeRouteData.dropoffLocation,
          dropoffCoordinates: changeRouteData.dropoffCoordinates,
          newDistance: changeRouteData.newDistance,
          newCost: changeRouteData.newCost,
        },
      );

      if (response.data.success) {
        // Update local state
        setDeliveries((prevDeliveries) =>
          prevDeliveries.map((delivery) =>
            delivery.DeliveryID === selectedDelivery.DeliveryID
              ? {
                  ...delivery,
                  PickupLocation: changeRouteData.pickupLocation,
                  DropoffLocation: changeRouteData.dropoffLocation,
                  DeliveryDistance: changeRouteData.newDistance,
                  DeliveryRate: changeRouteData.newCost,
                }
              : delivery,
          ),
        );

        showToastSuccess(
          "Route Updated",
          `Route changed successfully. New cost: ${formatCurrency(changeRouteData.newCost)}`,
        );
        setShowChangeRouteModal(false);
        setSelectedDelivery(null);
      }
    } catch (error) {
      console.error("Error changing route:", error);
      showToastError(
        "Route Change Failed",
        error.response?.data?.message || "Failed to change route",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Rebook delivery confirmation
  const confirmRebookDelivery = async () => {
    try {
      setIsLoading(true);

      const response = await axios.post(
        `/api/clients/deliveries/${selectedDelivery.DeliveryID}/rebook`,
        {
          newDate: rebookData.newDate,
          newTime: rebookData.newTime,
        },
      );

      if (response.data.success) {
        // Update local state
        setDeliveries((prevDeliveries) =>
          prevDeliveries.map((delivery) =>
            delivery.DeliveryID === selectedDelivery.DeliveryID
              ? {
                  ...delivery,
                  DeliveryDate: new Date(
                    `${rebookData.newDate}T${rebookData.newTime}`,
                  ),
                }
              : delivery,
          ),
        );

        showToastSuccess(
          "Delivery Rescheduled",
          `Delivery rescheduled to ${new Date(`${rebookData.newDate}T${rebookData.newTime}`).toLocaleDateString()}`,
        );
        setShowRebookModal(false);
        setSelectedDelivery(null);
      }
    } catch (error) {
      console.error("Error rebooking delivery:", error);
      showToastError(
        "Rebooking Failed",
        error.response?.data?.message || "Failed to reschedule delivery",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to check if delivery can be modified (before driver starts)
  const canModifyDelivery = (delivery) => {
    const status = delivery.DeliveryStatus?.toLowerCase();
    return status === "pending" || status === "accepted";
  };

  // Helper function to check if delivery can be rescheduled
  const canRescheduleDelivery = (delivery) => {
    if (!canModifyDelivery(delivery)) return false;

    const deliveryDate = new Date(delivery.DeliveryDate);
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const twentyFourHoursFromNow = new Date(
      now.getTime() + 24 * 60 * 60 * 1000,
    );

    // Can reschedule if:
    // 1. Delivery is more than 3 days away OR
    // 2. Delivery is more than 24 hours away (not within 24 hours of same day)
    return (
      deliveryDate > threeDaysFromNow ||
      (deliveryDate > twentyFourHoursFromNow &&
        deliveryDate.getDate() !== now.getDate())
    );
  };

  // Helper function to sort deliveries
  const sortDeliveries = (deliveriesToSort) => {
    return [...deliveriesToSort].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle date sorting
      if (sortField === "DeliveryDate") {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (sortDirection === "asc") {
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
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // New field, default to desc
      setSortField(field);
      setSortDirection("desc");
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
    const initialAddress =
      type === "pickup"
        ? changeRouteData.pickupLocation
        : changeRouteData.dropoffLocation;

    isolatedMapModal
      .init({
        onSelectCallback: (address, coordinates) => {
          handleChangeRouteLocationSelected({ address, coordinates });
        },
        locationType: type,
        initialAddress: initialAddress,
        title: `Select ${type === "pickup" ? "Pickup" : "Dropoff"} Location`,
      })
      .show();
  };

  const handleChangeRouteLocationSelected = (locationData) => {
    const { address, coordinates } = locationData;

    if (changeRouteMapType === "pickup") {
      setChangeRouteData((prev) => ({
        ...prev,
        pickupLocation: address,
        pickupCoordinates: coordinates,
      }));
    } else {
      setChangeRouteData((prev) => ({
        ...prev,
        dropoffLocation: address,
        dropoffCoordinates: coordinates,
      }));
    }

    setShowChangeRouteMapModal(false);

    // Auto-calculate route if both locations are set
    setTimeout(() => {
      const updatedData =
        changeRouteMapType === "pickup"
          ? {
              ...changeRouteData,
              pickupLocation: address,
              pickupCoordinates: coordinates,
            }
          : {
              ...changeRouteData,
              dropoffLocation: address,
              dropoffCoordinates: coordinates,
            };

      if (updatedData.pickupLocation && updatedData.dropoffLocation) {
        calculateNewRoute();
      }
    }, 100);
  };

  if (isLoading) {
    return <Loader message="Loading profile..." />;
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
    <div className="w-full max-w-[1400px] mx-auto p-8 box-border animate-fade-in block md:p-4 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-200 md:flex-col md:items-start md:gap-4"></div>

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
          <div className="p-6">
            <div className="flex justify-between items-start mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
              <h4 className="m-0 text-blue-900 font-bold text-lg flex items-center gap-2">
                <FaMapMarkerAlt className="text-amber-500" /> Route Details
              </h4>
              <div className="text-right text-sm">
                <div className="mb-1">
                  <strong className="text-gray-700">Pickup:</strong>{" "}
                  <span className="text-gray-600 block sm:inline">
                    {selectedDeliveryRoute.pickupLocation}
                  </span>
                </div>
                <div>
                  <strong className="text-gray-700">Dropoff:</strong>{" "}
                  <span className="text-gray-600 block sm:inline">
                    {selectedDeliveryRoute.dropoffLocation}
                  </span>
                </div>
              </div>
            </div>

            {selectedDeliveryRoute.pickupCoordinates &&
              selectedDeliveryRoute.dropoffCoordinates && (
                <div className="h-[400px] w-full rounded-xl overflow-hidden border border-gray-200 shadow-inner mb-6 relative">
                  <RouteMap
                    pickupCoordinates={selectedDeliveryRoute.pickupCoordinates}
                    dropoffCoordinates={
                      selectedDeliveryRoute.dropoffCoordinates
                    }
                    pickupAddress={selectedDeliveryRoute.pickupLocation}
                    dropoffAddress={selectedDeliveryRoute.dropoffLocation}
                    onRouteCalculated={() => {}} // No need to handle route calculation for viewing
                  />
                </div>
              )}

            <div className="grid grid-cols-2 gap-4 bg-blue-50 p-5 rounded-xl border border-blue-100">
              <div className="flex flex-col items-center justify-center p-2">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">
                  Distance
                </span>
                <span className="text-2xl font-bold text-blue-900">
                  {selectedDeliveryRoute.distance} km
                </span>
              </div>
              <div className="flex flex-col items-center justify-center p-2 border-l border-blue-200">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">
                  Duration
                </span>
                <span className="text-2xl font-bold text-blue-900">
                  {selectedDeliveryRoute.duration} min
                </span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Content Sections */}
      <div className="w-full flex-1 flex flex-col items-center relative z-10 box-border">
        {activeTab === "overview" && (
          <div className="flex flex-col gap-8 w-full max-w-[1400px] mx-auto box-border">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full mx-auto">
              <div className="bg-white rounded-xl p-6 flex items-center gap-5 shadow-sm border border-amber-400/20 transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-amber-400 min-h-[110px] h-full">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center text-xl text-white shrink-0 shadow-sm bg-gradient-to-br from-blue-700 to-blue-900">
                  <FaTruck />
                </div>
                <div className="flex flex-col">
                  <h3 className="m-0 mb-1 text-2xl font-bold bg-gradient-to-r from-blue-900 to-amber-500 bg-clip-text text-transparent">
                    {allocatedTrucks.length}
                  </h3>
                  <p className="m-0 text-gray-500 font-medium text-sm">
                    Allocated Trucks
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 flex items-center gap-5 shadow-sm border border-amber-400/20 transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-amber-400 min-h-[110px] h-full">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center text-xl text-white shrink-0 shadow-sm bg-gradient-to-br from-emerald-600 to-emerald-800">
                  <FaShippingFast />
                </div>
                <div className="flex flex-col">
                  <h3 className="m-0 mb-1 text-2xl font-bold bg-gradient-to-r from-blue-900 to-amber-500 bg-clip-text text-transparent">
                    {getActiveDeliveries().length}
                  </h3>
                  <p className="m-0 text-gray-500 font-medium text-sm">
                    Active Deliveries
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 flex items-center gap-5 shadow-sm border border-amber-400/20 transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-amber-400 min-h-[110px] h-full">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center text-xl text-white shrink-0 shadow-sm bg-gradient-to-br from-violet-600 to-purple-700">
                  <FaHistory />
                </div>
                <div className="flex flex-col">
                  <h3 className="m-0 mb-1 text-2xl font-bold bg-gradient-to-r from-blue-900 to-amber-500 bg-clip-text text-transparent">
                    {getCompletedDeliveries().length}
                  </h3>
                  <p className="m-0 text-gray-500 font-medium text-sm">
                    Completed
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 flex items-center gap-5 shadow-sm border border-amber-400/20 transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-amber-400 min-h-[110px] h-full">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center text-xl text-white shrink-0 shadow-sm bg-gradient-to-br from-amber-500 to-amber-700">
                  <FaDollarSign />
                </div>
                <div className="flex flex-col">
                  <h3 className="m-0 mb-1 text-2xl font-bold bg-gradient-to-r from-blue-900 to-amber-500 bg-clip-text text-transparent">
                    {formatCurrency(calculateTotalSpent())}
                  </h3>
                  <p className="m-0 text-gray-500 font-medium text-sm">
                    Total Spent
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 md:p-10 shadow-sm border border-amber-400/20 w-full mb-8">
              <h3 className="m-0 mb-6 text-blue-900 text-2xl font-bold">
                Recent Activity
              </h3>
              <div className="flex flex-col gap-5">
                {deliveries.slice(0, 5).map((delivery) => (
                  <div
                    key={delivery.DeliveryID}
                    className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 transition-all hover:bg-white hover:shadow-md hover:border-blue-100 group"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <FaShippingFast />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="m-0 text-gray-800 font-semibold text-sm mb-1 truncate">
                        Delivery #{delivery.DeliveryID}
                      </h4>
                      <p className="m-0 text-gray-500 text-xs truncate">
                        {delivery.PickupLocation} → {delivery.DropoffLocation}
                      </p>
                      <span className="block mt-1 text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                        {formatDate(delivery.DeliveryDate, delivery)}
                      </span>
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusBadgeClass(delivery.DeliveryStatus)}`}
                    >
                      {delivery.DeliveryStatus}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "transactions" && (
          <div className="bg-white rounded-2xl p-0 shadow-sm border border-amber-400/20 box-border w-full flex flex-col mb-8 overflow-hidden">
            <div className="bg-gradient-to-br from-white to-gray-50 border-b border-gray-100 p-8 flex justify-between items-center">
              <h3 className="text-2xl font-bold text-blue-900 m-0">
                Booking History
              </h3>
            </div>

            {/* Modern Filter Bar - Popup Style Like Admin Pages */}
            <div className="p-4 bg-white border-b border-gray-100 relative">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                {/* Search */}
                <div className="relative flex-1 max-w-lg w-full">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search bookings by ID, truck, location..."
                    value={transactionSearchQuery || ""}
                    onChange={(e) => setTransactionSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                  />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  {/* Filter Toggle Button */}
                  <button
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-medium ${showTransactionFilters ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                    onClick={() =>
                      setShowTransactionFilters(!showTransactionFilters)
                    }
                  >
                    <FaFilter size={14} />
                    Filters
                    {(statusFilter !== "all" || dateFilter !== "all") && (
                      <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1">
                        {
                          [statusFilter !== "all", dateFilter !== "all"].filter(
                            Boolean,
                          ).length
                        }
                      </span>
                    )}
                  </button>
                </div>
              </div>

              <div className="mt-3 text-gray-500 text-sm font-medium">
                Showing {filteredDeliveries.length} of {deliveries.length}{" "}
                bookings
              </div>

              {/* Filter Popup */}
              {showTransactionFilters && (
                <div className="absolute top-full mt-2 right-4 z-50 bg-white rounded-xl shadow-xl border border-gray-100 w-[360px] max-w-[90vw] p-5 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-gray-900 text-lg">
                      Filter Options
                    </h4>
                    <button
                      className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                      onClick={() => setShowTransactionFilters(false)}
                    >
                      <FaTimes size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 mb-6">
                    {/* Status Filter */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-500 uppercase">
                        Status
                      </label>
                      <select
                        value={statusFilter || "all"}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="delivered">Delivered</option>
                      </select>
                    </div>

                    {/* Date Filter */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-500 uppercase">
                        Date Range
                      </label>
                      <select
                        value={dateFilter || "all"}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                        <option value="year">This Year</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                      onClick={() => {
                        setTransactionSearchQuery("");
                        setStatusFilter("all");
                        setDateFilter("all");
                        setShowTransactionFilters(false);
                      }}
                    >
                      Reset
                    </button>
                    <button
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm shadow-blue-200 transition-colors"
                      onClick={() => setShowTransactionFilters(false)}
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modern Bookings Table */}
            {filteredDeliveries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400 bg-white">
                <div className="text-5xl mb-4 opacity-50">
                  <FaFileInvoiceDollar />
                </div>
                <h3 className="text-lg font-bold text-gray-600 mb-2">
                  No bookings found
                </h3>
                <p className="max-w-md mx-auto">
                  No bookings match your current filters. Try adjusting your
                  search criteria.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto w-full">
                  <table className="w-full border-collapse min-w-[1000px]">
                    <thead>
                      <tr className="bg-gray-50/50">
                        <th
                          className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 cursor-pointer hover:bg-gray-100 hover:text-blue-600 transition-colors select-none"
                          onClick={() => handleSort("DeliveryID")}
                        >
                          <div className="flex items-center gap-2">
                            <span>Delivery ID</span>
                            {sortField === "DeliveryID" && (
                              <span className="text-blue-500">
                                {sortDirection === "asc" ? "▲" : "▼"}
                              </span>
                            )}
                          </div>
                        </th>
                        <th
                          className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 cursor-pointer hover:bg-gray-100 hover:text-blue-600 transition-colors select-none"
                          onClick={() => handleSort("DeliveryDate")}
                        >
                          <div className="flex items-center gap-2">
                            <FaCalendarAlt />
                            <span>Delivery Date</span>
                            {sortField === "DeliveryDate" && (
                              <span className="text-blue-500">
                                {sortDirection === "asc" ? "▲" : "▼"}
                              </span>
                            )}
                          </div>
                        </th>
                        <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                          <div className="flex items-center gap-2">
                            <FaTruck />
                            <span>Truck</span>
                          </div>
                        </th>
                        <th
                          className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 cursor-pointer hover:bg-gray-100 hover:text-blue-600 transition-colors select-none"
                          onClick={() => handleSort("DeliveryStatus")}
                        >
                          <div className="flex items-center gap-2">
                            <span>Status</span>
                            {sortField === "DeliveryStatus" && (
                              <span className="text-blue-500">
                                {sortDirection === "asc" ? "▲" : "▼"}
                              </span>
                            )}
                          </div>
                        </th>
                        <th className="text-right py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                          <div className="flex items-center justify-end gap-2">
                            <span>Actions</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPaginatedDeliveries().map((delivery) => (
                        <tr
                          key={delivery.DeliveryID}
                          className="group hover:bg-blue-50/30 transition-colors border-b border-gray-100 last:border-none"
                        >
                          <td className="py-4 px-6 text-sm align-middle bg-white group-hover:bg-blue-50/30 transition-colors">
                            <div className="font-mono font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 inline-block text-xs">
                              #{delivery.DeliveryID?.substring(0, 12) || "N/A"}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-sm align-middle bg-white group-hover:bg-blue-50/30 transition-colors">
                            <div className="text-gray-600 font-medium">
                              {formatDate(delivery.DeliveryDate, delivery)}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-sm align-middle bg-white group-hover:bg-blue-50/30 transition-colors">
                            <div className="flex flex-col gap-1">
                              <span className="font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded text-xs border border-gray-200 w-fit">
                                {delivery.TruckPlate || "N/A"}
                              </span>
                              {delivery.TruckBrand &&
                                delivery.TruckBrand !== "Unknown" && (
                                  <span className="text-xs text-gray-500">
                                    {delivery.TruckBrand}
                                  </span>
                                )}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-sm align-middle bg-white group-hover:bg-blue-50/30 transition-colors">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${delivery.DeliveryStatus?.toLowerCase() === "pending" ? "bg-amber-100 text-amber-700" : delivery.DeliveryStatus?.toLowerCase() === "completed" ? "bg-emerald-100 text-emerald-700" : delivery.DeliveryStatus?.toLowerCase() === "cancelled" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}
                            >
                              {delivery.DeliveryStatus}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-sm align-middle bg-white group-hover:bg-blue-50/30 transition-colors">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600 border border-transparent hover:border-blue-200"
                                onClick={() => handleViewDetails(delivery)}
                                title="View details"
                              >
                                <FaEye />
                              </button>

                              {canRescheduleDelivery(delivery) && (
                                <button
                                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-gray-100 text-gray-500 hover:bg-amber-100 hover:text-amber-600 border border-transparent hover:border-amber-200"
                                  onClick={() => handleRebookDelivery(delivery)}
                                  title="Reschedule"
                                >
                                  <FaCalendarAlt />
                                </button>
                              )}

                              {canRescheduleDelivery(delivery) && (
                                <button
                                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-gray-100 text-gray-500 hover:bg-purple-100 hover:text-purple-600 border border-transparent hover:border-purple-200"
                                  onClick={() => handleChangeRoute(delivery)}
                                  title="Reroute"
                                >
                                  <FaRoute />
                                </button>
                              )}

                              {canModifyDelivery(delivery) && (
                                <button
                                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600 border border-transparent hover:border-red-200"
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
                  <div className="flex justify-between items-center p-6 border-t border-gray-200">
                    <div className="text-sm text-gray-500">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                      {Math.min(
                        currentPage * itemsPerPage,
                        filteredDeliveries.length,
                      )}{" "}
                      of {filteredDeliveries.length} bookings
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(1)}
                      >
                        First
                      </button>
                      <button
                        className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(currentPage - 1)}
                      >
                        Previous
                      </button>
                      <span className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg">
                        Page {currentPage} of {getTotalPagesForBookings()}
                      </span>
                      <button
                        className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        disabled={currentPage === getTotalPagesForBookings()}
                        onClick={() => setCurrentPage(currentPage + 1)}
                      >
                        Next
                      </button>
                      <button
                        className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        disabled={currentPage === getTotalPagesForBookings()}
                        onClick={() =>
                          setCurrentPage(getTotalPagesForBookings())
                        }
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

        {activeTab === "trucks" && (
          <div className="bg-white rounded-2xl p-0 shadow-sm border border-amber-400/20 box-border w-full flex flex-col mb-8 overflow-hidden">
            <div className="bg-gradient-to-br from-white to-gray-50 border-b border-gray-100 p-8 flex justify-between items-center bg-white">
              <h3 className="text-2xl font-bold text-blue-900 m-0">
                My Allocated Trucks ({allocatedTrucks.length})
              </h3>
              <div className="flex gap-3">
                <button
                  onClick={() => history.push("/client/book-truck")}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all hover:-translate-y-0.5"
                >
                  <FaPlus /> Book Truck
                </button>
              </div>
            </div>

            {/* Modern Filter Bar - Popup Style Like Admin Pages */}
            <div className="p-4 bg-white border-b border-gray-100 relative">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                {/* Search */}
                <div className="relative flex-1 max-w-lg w-full">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search trucks by plate, type, brand..."
                    value={truckFilters.search}
                    onChange={(e) =>
                      handleFilterChange("search", e.target.value)
                    }
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                  />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  {/* Filter Toggle Button */}
                  <button
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-medium ${showTruckFilters ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                    onClick={() => setShowTruckFilters(!showTruckFilters)}
                  >
                    <FaFilter size={14} />
                    Filters
                    {(truckFilters.type !== "all" ||
                      truckFilters.status !== "all") && (
                      <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1">
                        {
                          [
                            truckFilters.type !== "all",
                            truckFilters.status !== "all",
                          ].filter(Boolean).length
                        }
                      </span>
                    )}
                  </button>

                  {/* Per Page Select */}
                  <select
                    value={trucksPerPage}
                    onChange={(e) => {
                      setTrucksPerPage(Number(e.target.value));
                      setCurrentTruckPage(1);
                    }}
                    className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value={6}>6 per page</option>
                    <option value={12}>12 per page</option>
                    <option value={24}>24 per page</option>
                    <option value={48}>48 per page</option>
                  </select>
                </div>
              </div>

              <div className="mt-3 text-gray-500 text-sm font-medium">
                Showing {getPaginatedTrucks().length} of{" "}
                {getFilteredTrucks().length} trucks
              </div>

              {/* Filter Popup */}
              {showTruckFilters && (
                <div className="absolute top-full mt-2 right-4 z-50 bg-white rounded-xl shadow-xl border border-gray-100 w-[360px] max-w-[90vw] p-5 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-gray-900 text-lg">
                      Filter Options
                    </h4>
                    <button
                      className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                      onClick={() => setShowTruckFilters(false)}
                    >
                      <FaTimes size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 mb-6">
                    {/* Type Filter */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-500 uppercase">
                        Type
                      </label>
                      <select
                        value={truckFilters.type}
                        onChange={(e) =>
                          handleFilterChange("type", e.target.value)
                        }
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      >
                        <option value="all">All Types</option>
                        {getUniqueTypes().map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Status Filter */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-500 uppercase">
                        Status
                      </label>
                      <select
                        value={truckFilters.status}
                        onChange={(e) =>
                          handleFilterChange("status", e.target.value)
                        }
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      >
                        <option value="all">All Status</option>
                        <option value="available">Available</option>
                        <option value="busy">In Use</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                      onClick={() => {
                        resetFilters();
                        setShowTruckFilters(false);
                      }}
                    >
                      Reset
                    </button>
                    <button
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm shadow-blue-200 transition-colors"
                      onClick={() => setShowTruckFilters(false)}
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modern Trucks Table */}
            {getPaginatedTrucks().length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400 bg-white">
                <div className="text-5xl mb-4 opacity-50">🚛</div>
                <h3 className="text-lg font-bold text-gray-600 mb-2">
                  No trucks found
                </h3>
                <p className="max-w-md mx-auto">
                  No trucks match your current filters. Try adjusting your
                  search criteria.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <FaTruck />
                          <span>Truck Plate</span>
                        </div>
                      </th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <span>Type</span>
                        </div>
                      </th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <span>Brand</span>
                        </div>
                      </th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <span>Capacity</span>
                        </div>
                      </th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <span>Deliveries</span>
                        </div>
                      </th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <span>Total KM</span>
                        </div>
                      </th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <span>Status</span>
                        </div>
                      </th>
                      <th className="text-right py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                        <div className="flex items-center justify-end gap-2">
                          <span>Actions</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPaginatedTrucks().map((truck) => {
                      // Use enhanced truck status fields and active delivery status for availability
                      const truckStatus = truck.TruckStatus?.toLowerCase();
                      const allocationStatus =
                        truck.allocationStatus?.toLowerCase() ||
                        truck.AllocationStatus?.toLowerCase();
                      const operationalStatus =
                        truck.operationalStatus?.toLowerCase() ||
                        truck.OperationalStatus?.toLowerCase();

                      // Check if truck is in an active delivery
                      const isInActiveDelivery = deliveries.some(
                        (delivery) =>
                          delivery.TruckID === truck.TruckID &&
                          (delivery.DeliveryStatus === "pending" ||
                            delivery.DeliveryStatus === "in-progress"),
                      );

                      // ALLOW BOOKING EVEN IF TRUCK HAS ACTIVE DELIVERY - date checking happens at booking time
                      // Only disable book button if truck is under maintenance or out of service
                      const isAvailable =
                        truckStatus !== "maintenance" &&
                        truckStatus !== "out-of-service" &&
                        operationalStatus !== "maintenance" &&
                        operationalStatus !== "out-of-service";

                      // Determine status for display - show "In Use" if has active delivery
                      const displayStatus = isInActiveDelivery
                        ? "In Use"
                        : "Available";
                      const statusClass = isInActiveDelivery
                        ? "busy"
                        : "available";

                      return (
                        <tr
                          key={truck.TruckID}
                          className="group hover:bg-blue-50/30 transition-colors border-b border-gray-100 last:border-none"
                        >
                          <td className="py-4 px-6 text-sm align-middle bg-white group-hover:bg-blue-50/30 transition-colors">
                            <div className="font-mono font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded border border-gray-200 inline-block text-xs">
                              {truck.TruckPlate}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-sm align-middle bg-white group-hover:bg-blue-50/30 transition-colors">
                            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-semibold border border-blue-100 uppercase tracking-wide">
                              {truck.TruckType}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-sm align-middle bg-white group-hover:bg-blue-50/30 transition-colors">
                            {truck.TruckBrand}
                          </td>
                          <td className="py-4 px-6 text-sm align-middle bg-white group-hover:bg-blue-50/30 transition-colors">
                            <span className="font-semibold text-gray-700">
                              {truck.TruckCapacity} tons
                            </span>
                          </td>
                          <td className="py-4 px-6 text-sm align-middle bg-white group-hover:bg-blue-50/30 transition-colors">
                            <span className="font-bold text-blue-600">
                              {truck.TotalCompletedDeliveries || 0}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-sm align-middle bg-white group-hover:bg-blue-50/30 transition-colors">
                            {truck.TotalKilometers || 0} km
                          </td>
                          <td className="py-4 px-6 text-sm align-middle bg-white group-hover:bg-blue-50/30 transition-colors">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${statusClass === "busy" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}
                            >
                              {displayStatus}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-sm align-middle bg-white group-hover:bg-blue-50/30 transition-colors">
                            <div className="flex items-center justify-end gap-2">
                              {isAvailable && (
                                <button
                                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600 border border-transparent hover:border-blue-200"
                                  onClick={() =>
                                    history.push("/client/book-truck")
                                  }
                                  title={
                                    isInActiveDelivery
                                      ? "Book this truck (has active delivery but can be booked on different dates)"
                                      : "Book this truck"
                                  }
                                >
                                  <FaCalendarPlus />
                                </button>
                              )}
                              <button
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600 border border-transparent hover:border-blue-200"
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
              <div className="flex justify-center items-center p-6 border-t border-gray-200 gap-4">
                <button
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  disabled={currentTruckPage === 1}
                  onClick={() => setCurrentTruckPage((prev) => prev - 1)}
                >
                  Previous
                </button>

                <div className="text-sm font-medium text-gray-600">
                  Page {currentTruckPage} of {getTotalPages()}
                </div>

                <button
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  disabled={currentTruckPage === getTotalPages()}
                  onClick={() => setCurrentTruckPage((prev) => prev + 1)}
                >
                  Next
                </button>
              </div>
            )}

            {allocatedTrucks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400 bg-white border-t border-gray-100">
                <div className="text-5xl mb-4 opacity-50">🚛</div>
                <h3 className="text-lg font-bold text-gray-600 mb-2">
                  No Trucks Allocated
                </h3>
                <p className="max-w-md mx-auto">
                  Contact your account manager to allocate trucks to your
                  account.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "billing" && (
          <ModernBillingSection onBillingDataUpdate={handleBillingDataUpdate} />
        )}

        {activeTab === "profile" && (
          <div className="flex flex-col gap-6 w-full max-w-[1400px] mx-auto">
            {/* Modern Profile Header Card */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-amber-400/20 w-full flex flex-col items-center text-center max-w-4xl mx-auto">
              <div className="w-full">
                <div className="w-24 h-24 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-4xl mb-4 border-4 border-white shadow-md mx-auto">
                  <FaUser />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 m-0 mb-1">
                  {clientData?.ClientName || "Client Name"}
                </h2>
                <p className="text-sm text-gray-500 font-medium uppercase tracking-wide mb-6">
                  Transportation Client • ID:{" "}
                  {clientData?.ClientID?.substring(0, 8) || "Unknown"}
                </p>
                <div className="flex gap-8 justify-center w-full border-t border-gray-100 pt-6">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xl font-bold text-blue-900">
                      {getActiveDeliveries().length}
                    </span>
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                      Active Deliveries
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xl font-bold text-blue-900">
                      {getCompletedDeliveries().length}
                    </span>
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                      Completed
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xl font-bold text-blue-900">
                      {allocatedTrucks.length}
                    </span>
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                      Trucks
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Information Card */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-amber-400/20 w-full relative max-w-4xl mx-auto">
              <button
                className="absolute top-8 right-8 flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-bold text-sm transition-all hover:bg-blue-100 hover:text-blue-700"
                onClick={handleEditProfile}
              >
                <FaEdit /> Edit Profile
              </button>
              <div className="mb-6 pb-4 border-b border-gray-100">
                <h3 className="m-0 text-xl font-bold text-blue-900">
                  Account Information
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <FaUser />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Full Name
                    </label>
                    <span className="text-base font-semibold text-gray-700 break-words">
                      {clientData?.ClientName || "Not specified"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <FaEnvelope />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Email Address
                    </label>
                    <span className="text-base font-semibold text-gray-700 break-words">
                      {clientData?.ClientEmail || "Not specified"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <FaPhone />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Phone Number
                    </label>
                    <span className="text-base font-semibold text-gray-700 break-words">
                      {clientData?.ClientNumber || "Not specified"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <FaBuilding />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Client ID
                    </label>
                    <span className="text-base font-semibold text-gray-700 break-words">
                      {clientData?.ClientID || "Not specified"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <FaMapMarkerAlt />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Account Status
                    </label>
                    <span
                      style={{
                        color:
                          clientData?.ClientStatus === "active"
                            ? "#10b981"
                            : "#ef4444",
                        fontWeight: "600",
                        textTransform: "capitalize",
                      }}
                    >
                      {clientData?.ClientStatus || "Unknown"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <FaCalendarAlt />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Member Since
                    </label>
                    <span className="text-base font-semibold text-gray-700 break-words">
                      {clientData?.ClientCreationDate
                        ? formatDate(clientData.ClientCreationDate)
                        : "Not specified"}
                    </span>
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
          <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="clientName"
                className="text-sm font-bold text-gray-700"
              >
                Full Name
              </label>
              <input
                type="text"
                id="clientName"
                name="clientName"
                value={editFormData.clientName}
                onChange={handleEditFormChange}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="clientEmail"
                className="text-sm font-bold text-gray-700"
              >
                Email Address
              </label>
              <input
                type="email"
                id="clientEmail"
                name="clientEmail"
                value={editFormData.clientEmail}
                onChange={handleEditFormChange}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="clientNumber"
                className="text-sm font-bold text-gray-700"
              >
                Phone Number
              </label>
              <input
                type="tel"
                id="clientNumber"
                name="clientNumber"
                value={editFormData.clientNumber}
                onChange={handleEditFormChange}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
              />
            </div>

            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 bg-white hover:bg-gray-50 transition-colors font-medium"
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-bold shadow-md shadow-blue-500/20 transition-all hover:-translate-y-0.5"
                disabled={isUpdating}
              >
                {isUpdating ? "Updating..." : "Update Profile"}
              </button>
            </div>

            <div className="mt-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setShowPasswordModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium w-full justify-center"
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
          <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="currentPassword"
                className="text-sm font-bold text-gray-700"
              >
                Current Password
              </label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                value={passwordFormData.currentPassword}
                onChange={handlePasswordFormChange}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="newPassword"
                className="text-sm font-bold text-gray-700"
              >
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={passwordFormData.newPassword}
                onChange={handlePasswordFormChange}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                minLength="6"
                required
              />
              <small className="text-xs text-gray-500">
                Password must be at least 6 characters long
              </small>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="confirmPassword"
                className="text-sm font-bold text-gray-700"
              >
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={passwordFormData.confirmPassword}
                onChange={handlePasswordFormChange}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                required
              />
            </div>

            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 bg-white hover:bg-gray-50 transition-colors font-medium"
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-bold shadow-md shadow-blue-500/20 transition-all hover:-translate-y-0.5"
                disabled={isUpdating}
              >
                {isUpdating ? "Changing..." : "Change Password"}
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
          <div className="flex flex-col gap-6 p-6">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex flex-col items-center text-center gap-3">
              <FaExclamationTriangle className="text-4xl text-red-500 mb-1" />
              <h4 className="text-lg font-bold text-red-700 m-0">
                Are you sure you want to cancel this delivery?
              </h4>
              <p className="text-sm text-red-600/80 m-0">
                This action cannot be undone. The delivery will be marked as
                cancelled and no payment will be required.
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
              <h5 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">
                Delivery Details:
              </h5>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between py-2 border-b border-gray-200/50 last:border-none">
                  <strong className="text-gray-600">ID:</strong>{" "}
                  <span className="font-mono font-medium">
                    #{selectedDelivery.DeliveryID}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200/50 last:border-none">
                  <strong className="text-gray-600">Route:</strong>{" "}
                  <span className="font-medium text-right max-w-[70%]">
                    {selectedDelivery.PickupLocation} →{" "}
                    {selectedDelivery.DropoffLocation ||
                      selectedDelivery.DeliveryAddress}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200/50 last:border-none">
                  <strong className="text-gray-600">Date:</strong>{" "}
                  <span className="font-medium">
                    {formatDate(selectedDelivery.DeliveryDate)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200/50 last:border-none">
                  <strong className="text-gray-600">Amount:</strong>{" "}
                  <span className="font-bold text-gray-800">
                    {formatCurrency(selectedDelivery.DeliveryRate || 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 bg-white hover:bg-gray-50 transition-colors font-medium"
                disabled={isLoading}
              >
                Keep Delivery
              </button>
              <button
                type="button"
                onClick={confirmCancelDelivery}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold shadow-md shadow-red-500/20 transition-all hover:-translate-y-0.5"
                disabled={isLoading}
              >
                {isLoading ? "Cancelling..." : "Yes, Cancel Delivery"}
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
          <div className="flex flex-col gap-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 text-blue-800">
              <FaInfoCircle className="text-xl text-blue-500 shrink-0 mt-0.5" />
              <p className="text-sm m-0">
                Update the pickup and dropoff locations. The billing will be
                recalculated based on the new distance. Note: Route changes must
                be made at least 3 days before delivery or with more than 24
                hours notice.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                confirmChangeRoute();
              }}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="newPickupLocation"
                  className="text-sm font-bold text-gray-700"
                >
                  New Pickup Location
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="newPickupLocation"
                    value={changeRouteData.pickupLocation}
                    onChange={(e) =>
                      setChangeRouteData((prev) => ({
                        ...prev,
                        pickupLocation: e.target.value,
                      }))
                    }
                    className="w-full h-11 pl-4 pr-12 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all placeholder-gray-400"
                    placeholder="Enter new pickup address"
                    required
                  />
                  <div className="absolute right-1 top-1 bottom-1">
                    <button
                      type="button"
                      className="h-9 w-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      onClick={() => openChangeRouteMapModal("pickup")}
                      title="Select pickup location on map"
                    >
                      <FaMapMarkerAlt />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="newDropoffLocation"
                  className="text-sm font-bold text-gray-700"
                >
                  New Dropoff Location
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="newDropoffLocation"
                    value={changeRouteData.dropoffLocation}
                    onChange={(e) =>
                      setChangeRouteData((prev) => ({
                        ...prev,
                        dropoffLocation: e.target.value,
                      }))
                    }
                    className="w-full h-11 pl-4 pr-12 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all placeholder-gray-400"
                    placeholder="Enter new dropoff address"
                    required
                  />
                  <div className="absolute right-1 top-1 bottom-1">
                    <button
                      type="button"
                      className="h-9 w-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      onClick={() => openChangeRouteMapModal("dropoff")}
                      title="Select dropoff location on map"
                    >
                      <FaMapMarkerAlt />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-2">
                <button
                  type="button"
                  onClick={calculateNewRoute}
                  className="px-4 py-2 border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg font-bold flex items-center gap-2 transition-colors text-sm"
                  disabled={
                    !changeRouteData.pickupLocation ||
                    !changeRouteData.dropoffLocation
                  }
                >
                  <FaRoute /> Calculate New Route & Cost
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex flex-col gap-2 p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
                  <h5 className="text-sm font-bold text-gray-500 uppercase tracking-wider m-0">
                    Current Route:
                  </h5>
                  <p className="text-sm font-medium text-gray-700 m-0 break-words line-clamp-2">
                    {selectedDelivery.PickupLocation} →{" "}
                    {selectedDelivery.DropoffLocation ||
                      selectedDelivery.DeliveryAddress}
                  </p>
                  <div className="flex justify-between items-center mt-auto pt-2 border-t border-gray-100 text-xs">
                    <span className="text-gray-500">
                      <strong>Distance:</strong>{" "}
                      {selectedDelivery.DeliveryDistance
                        ? parseFloat(selectedDelivery.DeliveryDistance).toFixed(
                            2,
                          )
                        : "0.00"}{" "}
                      km
                    </span>
                    <span className="font-bold text-gray-700">
                      {formatCurrency(selectedDelivery.DeliveryRate || 0)}
                    </span>
                  </div>
                </div>

                {changeRouteData.newDistance > 0 && (
                  <div className="flex flex-col gap-2 p-3 bg-blue-50/50 rounded-lg border border-blue-100 shadow-sm">
                    <h5 className="text-sm font-bold text-blue-500 uppercase tracking-wider m-0">
                      New Route:
                    </h5>
                    <p className="text-sm font-medium text-gray-700 m-0 break-words line-clamp-2">
                      {changeRouteData.pickupLocation} →{" "}
                      {changeRouteData.dropoffLocation}
                    </p>
                    <div className="flex justify-between items-center mt-auto pt-2 border-t border-blue-100/50 text-xs">
                      <span className="text-gray-500">
                        <strong>Distance:</strong>{" "}
                        {changeRouteData.newDistance
                          ? changeRouteData.newDistance.toFixed(2)
                          : "0.00"}{" "}
                        km
                      </span>
                      <span className="font-bold text-blue-700">
                        {formatCurrency(changeRouteData.newCost)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowChangeRouteModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 bg-white hover:bg-gray-50 transition-colors font-medium"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold shadow-md shadow-amber-500/20 transition-all hover:-translate-y-0.5"
                  disabled={
                    isLoading ||
                    !changeRouteData.pickupLocation ||
                    !changeRouteData.dropoffLocation
                  }
                >
                  {isLoading ? "Updating Route..." : "Update Route"}
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
          <div className="flex flex-col gap-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 text-blue-800">
              <FaCalendar className="text-xl text-blue-500 shrink-0 mt-0.5" />
              <p className="text-sm m-0">
                Choose a new date and time for your delivery. The driver and
                staff will be notified of the change.
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h5 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">
                Current Schedule:
              </h5>
              <p className="m-0 text-sm text-gray-700">
                <strong>Date:</strong>{" "}
                {formatDate(selectedDelivery.DeliveryDate)}
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                confirmRebookDelivery();
              }}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="newDeliveryDate"
                  className="text-sm font-bold text-gray-700"
                >
                  New Delivery Date
                </label>
                <input
                  type="date"
                  id="newDeliveryDate"
                  value={rebookData.newDate}
                  onChange={(e) =>
                    setRebookData((prev) => ({
                      ...prev,
                      newDate: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                  min={new Date().toISOString().split("T")[0]}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="newDeliveryTime"
                  className="text-sm font-bold text-gray-700"
                >
                  Preferred Time
                </label>
                <select
                  id="newDeliveryTime"
                  value={rebookData.newTime}
                  onChange={(e) =>
                    setRebookData((prev) => ({
                      ...prev,
                      newTime: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all cursor-pointer"
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

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <h5 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Delivery Details:
                </h5>
                <div className="flex flex-col gap-1 text-sm text-gray-700">
                  <div className="flex justify-between">
                    <strong className="text-gray-600">Route:</strong>
                    <span className="text-right max-w-[70%]">
                      {selectedDelivery.PickupLocation} →{" "}
                      {selectedDelivery.DropoffLocation ||
                        selectedDelivery.DeliveryAddress}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1 pt-1 border-t border-gray-200/50">
                    <strong className="text-gray-600">Amount:</strong>{" "}
                    <span className="font-bold text-gray-800">
                      {formatCurrency(selectedDelivery.DeliveryRate || 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowRebookModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 bg-white hover:bg-gray-50 transition-colors font-medium"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-bold shadow-md shadow-cyan-500/20 transition-all hover:-translate-y-0.5"
                  disabled={
                    isLoading || !rebookData.newDate || !rebookData.newTime
                  }
                >
                  {isLoading ? "Rescheduling..." : "Reschedule Delivery"}
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
          <div className="flex flex-col gap-6 p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 h-full">
                <h4 className="flex items-center gap-2 text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                  📦 Delivery Information
                </h4>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between py-2 border-b border-gray-200/50 last:border-none items-center">
                    <label className="text-sm text-gray-500 font-medium">
                      Delivery ID:
                    </label>
                    <span className="text-sm font-mono font-bold text-gray-700">
                      #{viewingDelivery.DeliveryID}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200/50 last:border-none items-center">
                    <label className="text-sm text-gray-500 font-medium">
                      Status:
                    </label>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        viewingDelivery.DeliveryStatus === "pending"
                          ? "bg-amber-100 text-amber-700"
                          : viewingDelivery.DeliveryStatus === "in-progress"
                            ? "bg-blue-100 text-blue-700"
                            : viewingDelivery.DeliveryStatus === "completed"
                              ? "bg-emerald-100 text-emerald-700"
                              : viewingDelivery.DeliveryStatus === "cancelled"
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {viewingDelivery.DeliveryStatus}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200/50 last:border-none items-center">
                    <label className="text-sm text-gray-500 font-medium">
                      Delivery Date:
                    </label>
                    <span className="text-sm font-semibold text-gray-700">
                      {formatDate(
                        viewingDelivery.DeliveryDate,
                        viewingDelivery,
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200/50 last:border-none items-center">
                    <label className="text-sm text-gray-500 font-medium">
                      Amount:
                    </label>
                    <span className="text-lg font-bold text-emerald-600">
                      {formatCurrency(
                        viewingDelivery.DeliveryRate ||
                          viewingDelivery.deliveryRate ||
                          0,
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 h-full">
                <h4 className="flex items-center gap-2 text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                  🗺️ Route Information
                </h4>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between py-2 border-b border-gray-200/50 last:border-none items-start">
                    <label className="text-sm text-gray-500 font-medium whitespace-nowrap mr-2">
                      Pickup:
                    </label>
                    <span className="text-sm font-semibold text-gray-700 text-right text-balance">
                      {viewingDelivery.PickupLocation || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200/50 last:border-none items-start">
                    <label className="text-sm text-gray-500 font-medium whitespace-nowrap mr-2">
                      Dropoff:
                    </label>
                    <span className="text-sm font-semibold text-gray-700 text-right text-balance">
                      {viewingDelivery.DropoffLocation ||
                        viewingDelivery.DeliveryAddress ||
                        "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200/50 last:border-none items-center">
                    <label className="text-sm text-gray-500 font-medium">
                      Distance:
                    </label>
                    <span className="text-sm font-semibold text-gray-700">
                      {viewingDelivery.DeliveryDistance
                        ? `${viewingDelivery.DeliveryDistance} km`
                        : "N/A"}
                    </span>
                  </div>
                  {((viewingDelivery.pickupCoordinates &&
                    viewingDelivery.dropoffCoordinates) ||
                    (viewingDelivery.PickupCoordinates &&
                      viewingDelivery.DropoffCoordinates)) && (
                    <button
                      className="mt-2 w-full px-4 py-2 border border-blue-200 text-blue-600 bg-white hover:bg-blue-50 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm font-medium"
                      onClick={() => {
                        viewDeliveryRoute(viewingDelivery);
                        setShowViewDetailsModal(false);
                      }}
                    >
                      <FaMapMarkerAlt /> View Route on Map
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 h-full">
                <h4 className="flex items-center gap-2 text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                  🚛 Truck & Driver Information
                </h4>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between py-2 border-b border-gray-200/50 last:border-none items-center">
                    <label className="text-sm text-gray-500 font-medium">
                      Truck Plate:
                    </label>
                    <span className="font-mono font-bold text-gray-800 bg-white px-2 py-1 rounded border border-gray-200 text-xs">
                      {viewingDelivery.TruckPlate || "Not Assigned"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200/50 last:border-none items-center">
                    <label className="text-sm text-gray-500 font-medium">
                      Truck Type:
                    </label>
                    <span className="text-sm font-semibold text-gray-700">
                      {viewingDelivery.TruckBrand ||
                        viewingDelivery.TruckType ||
                        "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200/50 last:border-none items-center">
                    <label className="text-sm text-gray-500 font-medium">
                      Driver:
                    </label>
                    <span className="text-sm font-semibold text-gray-700">
                      {viewingDelivery.DriverName || "Not Assigned"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200/50 last:border-none items-center">
                    <label className="text-sm text-gray-500 font-medium">
                      Helper:
                    </label>
                    <span className="text-sm font-semibold text-gray-700">
                      {viewingDelivery.HelperName || "Not Assigned"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 h-full">
                <h4 className="flex items-center gap-2 text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                  📞 Contact Information
                </h4>

                <div className="mb-4">
                  <strong className="block text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">
                    📍 Pickup Contact
                  </strong>
                  <div className="flex justify-between py-1 items-center">
                    <label className="text-sm text-gray-500 font-medium">
                      Person:
                    </label>
                    <span className="text-sm font-semibold text-gray-700">
                      {viewingDelivery.PickupContactPerson || "Not specified"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 items-center">
                    <label className="text-sm text-gray-500 font-medium">
                      Phone:
                    </label>
                    <span className="text-sm font-semibold text-gray-700">
                      {viewingDelivery.PickupContactNumber || "N/A"}
                    </span>
                  </div>
                </div>

                <div>
                  <strong className="block text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">
                    📍 Dropoff Contact
                  </strong>
                  <div className="flex justify-between py-1 items-center">
                    <label className="text-sm text-gray-500 font-medium">
                      Person:
                    </label>
                    <span className="text-sm font-semibold text-gray-700">
                      {viewingDelivery.DropoffContactPerson || "Not specified"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 items-center">
                    <label className="text-sm text-gray-500 font-medium">
                      Phone:
                    </label>
                    <span className="text-sm font-semibold text-gray-700">
                      {viewingDelivery.DropoffContactNumber || "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 bg-white hover:bg-gray-50 transition-colors font-medium"
                onClick={() => setShowViewDetailsModal(false)}
              >
                Close
              </button>
              {canModifyDelivery(viewingDelivery) && (
                <>
                  {canRescheduleDelivery(viewingDelivery) && (
                    <button
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold shadow-md shadow-amber-500/20 flex items-center gap-2 transition-all hover:-translate-y-0.5"
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
                      className="px-4 py-2 border border-purple-200 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg font-bold flex items-center gap-2 transition-colors"
                      onClick={() => {
                        setShowViewDetailsModal(false);
                        handleChangeRoute(viewingDelivery);
                      }}
                    >
                      <FaRoute /> Change Route
                    </button>
                  )}
                  <button
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold shadow-md shadow-red-500/20 flex items-center gap-2 transition-all hover:-translate-y-0.5"
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
          <div className="flex flex-col gap-8 p-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 h-full">
                <h4 className="flex items-center gap-2 text-base font-bold text-gray-800 mb-5 pb-3 border-b border-gray-200">
                  🚛 Truck Information
                </h4>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between py-3 border-b border-gray-200/50 last:border-none items-center">
                    <label className="text-sm text-gray-500 font-medium">
                      Truck Plate:
                    </label>
                    <span className="font-mono font-bold text-gray-800 bg-white px-2 py-1 rounded border border-gray-200 text-xs">
                      {viewingTruck.TruckPlate}
                    </span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-gray-200/50 last:border-none items-center">
                    <label className="text-sm text-gray-500 font-medium">
                      Type:
                    </label>
                    <span className="text-sm font-semibold text-gray-700">
                      {viewingTruck.TruckType || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-gray-200/50 last:border-none items-center">
                    <label className="text-sm text-gray-500 font-medium">
                      Brand:
                    </label>
                    <span className="text-sm font-semibold text-gray-700">
                      {viewingTruck.TruckBrand}
                    </span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-gray-200/50 last:border-none items-center">
                    <label className="text-sm text-gray-500 font-medium">
                      Capacity:
                    </label>
                    <span className="text-sm font-semibold text-gray-700">
                      {viewingTruck.TruckCapacity} tons
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 h-full">
                <h4 className="flex items-center gap-2 text-base font-bold text-gray-800 mb-5 pb-3 border-b border-gray-200">
                  📊 Performance Statistics
                </h4>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between py-3 border-b border-gray-200/50 last:border-none items-center">
                    <label className="text-sm text-gray-500 font-medium">
                      Total Deliveries:
                    </label>
                    <span className="font-bold text-blue-600">
                      {viewingTruck.TotalCompletedDeliveries || 0}
                    </span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-gray-200/50 last:border-none items-center">
                    <label className="text-sm text-gray-500 font-medium">
                      Total Kilometers:
                    </label>
                    <span className="text-sm font-semibold text-gray-700">
                      {viewingTruck.TotalKilometers || 0} km
                    </span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-gray-200/50 last:border-none items-center">
                    <label className="text-sm text-gray-500 font-medium">
                      Allocation Status:
                    </label>
                    <span className="text-sm font-semibold text-gray-700">
                      {viewingTruck.allocationStatus ||
                        viewingTruck.AllocationStatus ||
                        "Allocated"}
                    </span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-gray-200/50 last:border-none items-center">
                    <label className="text-sm text-gray-500 font-medium">
                      Current Status:
                    </label>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        deliveries.some(
                          (delivery) =>
                            delivery.TruckID === viewingTruck.TruckID &&
                            (delivery.DeliveryStatus === "pending" ||
                              delivery.DeliveryStatus === "in-progress"),
                        )
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {deliveries.some(
                        (delivery) =>
                          delivery.TruckID === viewingTruck.TruckID &&
                          (delivery.DeliveryStatus === "pending" ||
                            delivery.DeliveryStatus === "in-progress"),
                      )
                        ? "In Use"
                        : "Available"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 bg-white hover:bg-gray-50 transition-colors font-medium"
                onClick={() => setShowTruckDetailsModal(false)}
              >
                Close
              </button>
              {!deliveries.some(
                (delivery) =>
                  delivery.TruckID === viewingTruck.TruckID &&
                  (delivery.DeliveryStatus === "pending" ||
                    delivery.DeliveryStatus === "in-progress"),
              ) && (
                <button
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all hover:-translate-y-0.5"
                  onClick={() => {
                    setShowTruckDetailsModal(false);
                    history.push("/client/book-truck");
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
