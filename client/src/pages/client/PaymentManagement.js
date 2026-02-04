import React, { useState, useEffect, useContext } from "react";
import { useHistory } from "react-router-dom";
import axios from "axios";
import {
  FaCreditCard,
  FaWallet,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaMoneyBillWave,
  FaArrowLeft,
  FaTimes,
  FaCalendarAlt,
  FaReceipt,
  FaExternalLinkAlt,
  FaHistory,
  FaUpload,
  FaFileAlt,
  FaFilter,
} from "react-icons/fa";
import { format, differenceInDays } from "date-fns";
import { AuthContext } from "../../context/AuthContext";
import Loader from "../../components/common/Loader";

const PaymentManagement = () => {
  const history = useHistory();
  const { authUser } = useContext(AuthContext) || { authUser: null };
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentStep, setPaymentStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [alert, setAlert] = useState({
    show: false,
    type: "info",
    message: "",
  });

  // New states for proof upload feature
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedDeliveries, setSelectedDeliveries] = useState([]);
  const [proofUploadModalOpen, setProofUploadModalOpen] = useState(false);
  const [proofFile, setProofFile] = useState(null);
  const [proofForm, setProofForm] = useState({
    referenceNumber: "",
    notes: "",
  });
  const [uploadingProof, setUploadingProof] = useState(false);

  // Payment form states
  const [cardForm, setCardForm] = useState({
    cardNumber: "",
    expiryMonth: "",
    expiryYear: "",
    cvc: "",
    cardholderName: "",
  });

  const [billingInfo, setBillingInfo] = useState({
    email: "",
    phone: "",
    name: "",
  });

  useEffect(() => {
    fetchPaymentSummary();
    const userData = getUserData();
    if (userData) {
      setBillingInfo({
        email: userData.email || "",
        phone: userData.phone || "",
        name: userData.name || "",
      });
    }
  }, [authUser]);

  const getUserData = () => {
    if (authUser) {
      return {
        id: authUser.id || authUser.clientId,
        email: authUser.email,
        phone: authUser.phone,
        name: authUser.clientName || authUser.username || authUser.name,
      };
    }
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return {
          id: payload.id || payload.clientId || payload.sub,
          email: payload.email,
          phone: payload.phone,
          name: payload.clientName || payload.username || payload.name,
        };
      } catch (e) {
        console.error("Error parsing token:", e);
      }
    }
    return null;
  };

  const fetchPaymentSummary = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication token missing. Please login again.");
        return;
      }

      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      const userData = getUserData();
      if (!userData || !userData.id) {
        setError("Unable to identify client. Please login again.");
        return;
      }

      const response = await axios.get(`/api/payments/client/${userData.id}`);
      setPaymentSummary(response.data.data);
    } catch (error) {
      console.error("Error fetching payment summary:", error);
      setError(
        error.response?.data?.message || "Failed to load payment information",
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = (payment) => {
    setSelectedPayment(payment);
    setPaymentModalOpen(true);
    setPaymentStep(1);
    setPaymentMethod("");
  };

  const handlePaymentMethodSelect = (method) => {
    setPaymentMethod(method);
    setPaymentStep(2);
  };

  const handleCardInputChange = (field, value) => {
    let formattedValue = value;
    if (field === "cardNumber") {
      formattedValue = value
        .replace(/\s/g, "")
        .replace(/(.{4})/g, "$1 ")
        .trim();
      if (formattedValue.length > 19) return;
    }
    if (field === "expiryMonth" || field === "expiryYear") {
      formattedValue = value.replace(/\D/g, "");
      if (field === "expiryMonth" && formattedValue.length > 2) return;
      if (field === "expiryYear" && formattedValue.length > 4) return;
    }
    if (field === "cvc") {
      formattedValue = value.replace(/\D/g, "");
      if (formattedValue.length > 4) return;
    }

    setCardForm((prev) => ({
      ...prev,
      [field]: formattedValue,
    }));
  };

  const processCardPayment = async () => {
    try {
      setProcessingPayment(true);
      const { cardNumber, expiryMonth, expiryYear, cvc, cardholderName } =
        cardForm;
      if (
        !cardNumber ||
        !expiryMonth ||
        !expiryYear ||
        !cvc ||
        !cardholderName
      ) {
        throw new Error("Please fill in all card details");
      }

      const token = localStorage.getItem("token");
      const userData = getUserData();

      const response = await axios.post(
        "/api/payments/process-card",
        {
          deliveryId: selectedPayment.id,
          cardDetails: {
            number: cardNumber.replace(/\s/g, ""),
            exp_month: expiryMonth,
            exp_year: expiryYear,
            cvc: cvc,
          },
          billingDetails: {
            name: cardholderName,
            email: billingInfo.email || userData?.email,
            phone: billingInfo.phone || userData?.phone,
          },
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.success) {
        setPaymentStep(3); // Success step
        await fetchPaymentSummary();
      } else {
        throw new Error(response.data.error || "Payment failed");
      }
    } catch (error) {
      console.error("Payment error:", error);
      setAlert({
        show: true,
        type: "error",
        message:
          error.response?.data?.message || error.message || "Payment failed",
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  const processEWalletPayment = async () => {
    try {
      setProcessingPayment(true);
      const token = localStorage.getItem("token");
      const userData = getUserData();

      const response = await axios.post(
        "/api/payments/process-ewallet",
        {
          deliveryId: selectedPayment.id,
          paymentMethod: paymentMethod,
          billingDetails: {
            name: billingInfo.name || userData?.name,
            email: billingInfo.email || userData?.email,
            phone: billingInfo.phone || userData?.phone,
          },
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.success && response.data.data.checkoutUrl) {
        window.location.href = response.data.data.checkoutUrl;
      } else {
        throw new Error(
          response.data.error || "Failed to initiate e-wallet payment",
        );
      }
    } catch (error) {
      console.error("E-Wallet error:", error);
      setAlert({
        show: true,
        type: "error",
        message:
          error.response?.data?.message ||
          error.message ||
          "E-wallet payment failed",
      });
      setProcessingPayment(false);
    }
  };

  const handlePaymentSubmit = () => {
    if (paymentMethod === "card") {
      processCardPayment();
    } else if (["gcash", "grab_pay", "paymaya"].includes(paymentMethod)) {
      processEWalletPayment();
    }
  };

  const handleProofUpload = () => {
    if (selectedDeliveries.length === 0) {
      setAlert({
        show: true,
        type: "error",
        message: "Please select at least one delivery to pay",
      });
      return;
    }
    setProofUploadModalOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setAlert({
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
      setAlert({
        show: true,
        type: "error",
        message: "Please select a file to upload",
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
        setAlert({
          show: true,
          type: "success",
          message: response.data.message,
        });
        setProofUploadModalOpen(false);
        setProofFile(null);
        setProofForm({ referenceNumber: "", notes: "" });
        setSelectedDeliveries([]);
        await fetchPaymentSummary();
      }
    } catch (error) {
      console.error("Error uploading proof:", error);
      setAlert({
        show: true,
        type: "error",
        message:
          error.response?.data?.message || "Failed to upload payment proof",
      });
    } finally {
      setUploadingProof(false);
    }
  };

  const handleSelectDelivery = (deliveryId) => {
    setSelectedDeliveries((prev) =>
      prev.includes(deliveryId)
        ? prev.filter((id) => id !== deliveryId)
        : [...prev, deliveryId],
    );
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const filtered = getFilteredPayments();
      setSelectedDeliveries(filtered.map((p) => p.id));
    } else {
      setSelectedDeliveries([]);
    }
  };

  const getFilteredPayments = () => {
    if (!paymentSummary?.pendingPayments) return [];

    if (selectedMonth === "all") return paymentSummary.pendingPayments;

    return paymentSummary.pendingPayments.filter((payment) => {
      if (!payment.dueDate) return false;
      const paymentDate = new Date(payment.dueDate);
      const [year, month] = selectedMonth.split("-");
      return (
        paymentDate.getFullYear() === parseInt(year) &&
        paymentDate.getMonth() === parseInt(month) - 1
      );
    });
  };

  const getAvailableMonths = () => {
    if (!paymentSummary?.pendingPayments) return [];

    const months = new Set();
    paymentSummary.pendingPayments.forEach((payment) => {
      if (payment.dueDate) {
        const date = new Date(payment.dueDate);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        months.add(monthKey);
      }
    });

    return Array.from(months).sort().reverse();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    let colors = "bg-gray-100 text-gray-600";
    if (status === "paid") colors = "bg-emerald-100 text-emerald-700";
    if (status === "pending") colors = "bg-amber-100 text-amber-700";
    if (status === "overdue") colors = "bg-red-100 text-red-700";
    if (status === "pending_verification") colors = "bg-blue-100 text-blue-700";

    const displayStatus = status === "pending_verification" ? "Pending Verification" : status;

    return (
      <span
        className={`px-2 py-1 rounded text-xs font-bold uppercase ${colors}`}
      >
        {displayStatus}
      </span>
    );
  };

  if (loading) return <Loader />;

  return (
    <div className="w-full max-w-[1400px] mx-auto p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => history.push("/client/dashboard")}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <FaArrowLeft className="text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaMoneyBillWave className="text-blue-600" /> Payment Management
          </h1>
          <p className="text-gray-500 text-sm">
            Manage your billing and payments
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 mb-6 flex items-center gap-3">
          <FaExclamationTriangle />
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute right-0 top-0 p-4 opacity-10">
            <FaMoneyBillWave size={100} />
          </div>
          <p className="text-gray-500 font-medium mb-1">Total Outstanding</p>
          <h2 className="text-3xl font-bold text-gray-800">
            {formatCurrency(paymentSummary?.totalOutstanding || 0)}
          </h2>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute right-0 top-0 p-4 opacity-10">
            <FaCheckCircle size={100} className="text-emerald-500" />
          </div>
          <p className="text-gray-500 font-medium mb-1">Total Paid</p>
          <h2 className="text-3xl font-bold text-gray-800">
            {formatCurrency(paymentSummary?.totalPaid || 0)}
          </h2>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute right-0 top-0 p-4 opacity-10">
            <FaHistory size={100} className="text-blue-500" />
          </div>
          <p className="text-gray-500 font-medium mb-1">Last Payment</p>
          <h2 className="text-xl font-bold text-gray-800">
            {paymentSummary?.lastPaymentDate
              ? format(new Date(paymentSummary.lastPaymentDate), "MMM dd, yyyy")
              : "No payments yet"}
          </h2>
        </div>
      </div>

      {/* Pending Payments Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-amber-50 flex justify-between items-center">
          <h3 className="font-bold text-amber-800 flex items-center gap-2">
            <FaClock className="text-amber-600" /> Pending Payments
          </h3>
          <div className="flex gap-2 items-center">
            {/* Month Filter */}
            <div className="flex items-center gap-2">
              <FaFilter className="text-gray-400" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
              >
                <option value="all">All Months</option>
                {getAvailableMonths().map((monthKey) => {
                  const [year, month] = monthKey.split("-");
                  const monthName = format(
                    new Date(year, parseInt(month) - 1),
                    "MMMM yyyy",
                  );
                  return (
                    <option key={monthKey} value={monthKey}>
                      {monthName}
                    </option>
                  );
                })}
              </select>
            </div>
            {/* Upload Proof Button */}
            {selectedDeliveries.length > 0 && (
              <button
                onClick={handleProofUpload}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-colors shadow-sm flex items-center gap-2"
              >
                <FaUpload /> Upload Payment Proof ({selectedDeliveries.length})
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
              <tr>
                <th className="p-4">
                  <input
                    type="checkbox"
                    checked={
                      getFilteredPayments().length > 0 &&
                      selectedDeliveries.length ===
                      getFilteredPayments().length
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 accent-blue-600"
                  />
                </th>
                <th className="p-4">Delivery ID</th>
                <th className="p-4">Due Date</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {getFilteredPayments().length > 0 ? (
                getFilteredPayments().map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedDeliveries.includes(payment.id)}
                        onChange={() => handleSelectDelivery(payment.id)}
                        className="w-4 h-4 accent-blue-600"
                        disabled={payment.status === "pending_verification"}
                      />
                    </td>
                    <td className="p-4 font-mono text-sm">
                      #{payment.id.substring(0, 8)}
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {payment.dueDate
                        ? format(new Date(payment.dueDate), "MMM dd, yyyy")
                        : "N/A"}
                    </td>
                    <td className="p-4 font-bold text-gray-800">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="p-4">{getStatusBadge(payment.status)}</td>
                    <td className="p-4 text-center">
                      {payment.status === "pending_verification" ? (
                        <span className="text-blue-600 text-sm font-medium">
                          Awaiting Approval
                        </span>
                      ) : (
                        <button
                          onClick={() => handlePayNow(payment)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
                        >
                          Pay Now
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-500">
                    No pending payments. You're all caught up!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment History Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <FaHistory className="text-gray-400" /> Payment History
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
              <tr>
                <th className="p-4">Transaction ID</th>
                <th className="p-4">Date</th>
                <th className="p-4">Method</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paymentSummary?.recentTransactions?.length > 0 ? (
                paymentSummary.recentTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="p-4 font-mono text-sm">
                      #{transaction.id.substring(0, 8)}
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {format(
                        new Date(transaction.createdAt),
                        "MMM dd, yyyy HH:mm",
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-600 capitalize">
                      {transaction.method.replace("_", " ")}
                    </td>
                    <td className="p-4 font-bold text-gray-800">
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(transaction.status)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">
                    No payment history found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">Complete Payment</h3>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-6">
              {paymentStep === 1 && (
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handlePaymentMethodSelect("card")}
                    className="p-4 border rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all flex flex-col items-center gap-2 group"
                  >
                    <FaCreditCard className="text-2xl text-gray-400 group-hover:text-blue-500" />
                    <span className="font-bold text-gray-700 group-hover:text-blue-700">
                      Credit Card
                    </span>
                  </button>
                  <button
                    onClick={() => handlePaymentMethodSelect("gcash")}
                    className="p-4 border rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all flex flex-col items-center gap-2 group"
                  >
                    <FaWallet className="text-2xl text-gray-400 group-hover:text-blue-500" />
                    <span className="font-bold text-gray-700 group-hover:text-blue-700">
                      GCash
                    </span>
                  </button>
                  <button
                    onClick={() => handlePaymentMethodSelect("grab_pay")}
                    className="p-4 border rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all flex flex-col items-center gap-2 group"
                  >
                    <FaWallet className="text-2xl text-gray-400 group-hover:text-blue-500" />
                    <span className="font-bold text-gray-700 group-hover:text-blue-700">
                      GrabPay
                    </span>
                  </button>
                  <button
                    onClick={() => handlePaymentMethodSelect("paymaya")}
                    className="p-4 border rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all flex flex-col items-center gap-2 group"
                  >
                    <FaWallet className="text-2xl text-gray-400 group-hover:text-blue-500" />
                    <span className="font-bold text-gray-700 group-hover:text-blue-700">
                      Maya
                    </span>
                  </button>
                </div>
              )}

              {paymentStep === 2 && paymentMethod === "card" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                      value={cardForm.cardholderName}
                      onChange={(e) =>
                        handleCardInputChange("cardholderName", e.target.value)
                      }
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Card Number
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                      value={cardForm.cardNumber}
                      onChange={(e) =>
                        handleCardInputChange("cardNumber", e.target.value)
                      }
                      placeholder="0000 0000 0000 0000"
                    />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-bold text-gray-700 mb-1">
                        Expiry Date
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                          value={cardForm.expiryMonth}
                          onChange={(e) =>
                            handleCardInputChange("expiryMonth", e.target.value)
                          }
                          placeholder="MM"
                        />
                        <input
                          type="text"
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                          value={cardForm.expiryYear}
                          onChange={(e) =>
                            handleCardInputChange("expiryYear", e.target.value)
                          }
                          placeholder="YYYY"
                        />
                      </div>
                    </div>
                    <div className="w-1/3">
                      <label className="block text-sm font-bold text-gray-700 mb-1">
                        CVC
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                        value={cardForm.cvc}
                        onChange={(e) =>
                          handleCardInputChange("cvc", e.target.value)
                        }
                        placeholder="123"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setPaymentStep(1)}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      Back
                    </button>
                    <button
                      onClick={handlePaymentSubmit}
                      disabled={processingPayment}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg shadow-md disabled:opacity-50"
                    >
                      {processingPayment
                        ? "Processing..."
                        : `Pay ${formatCurrency(selectedPayment?.amount || 0)}`}
                    </button>
                  </div>
                </div>
              )}

              {paymentStep === 2 && paymentMethod !== "card" && (
                <div className="text-center py-6">
                  <p className="text-gray-600 mb-6">
                    You will be redirected to{" "}
                    {paymentMethod === "gcash"
                      ? "GCash"
                      : paymentMethod === "grab_pay"
                        ? "GrabPay"
                        : "Maya"}{" "}
                    to complete your payment securely.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => setPaymentStep(1)}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      Back
                    </button>
                    <button
                      onClick={handlePaymentSubmit}
                      disabled={processingPayment}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow-md disabled:opacity-50"
                    >
                      {processingPayment
                        ? "Redirecting..."
                        : "Proceed to Payment"}
                    </button>
                  </div>
                </div>
              )}

              {paymentStep === 3 && (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaCheckCircle className="text-3xl text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    Payment Successful!
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Your payment has been processed successfully.
                  </p>
                  <button
                    onClick={() => setPaymentModalOpen(false)}
                    className="bg-gray-800 text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-900"
                  >
                    Close
                  </button>
                </div>
              )}

              {alert.show && (
                <div
                  className={`mt-4 p-3 rounded-lg text-sm ${alert.type === "error" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}
                >
                  {alert.message}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Proof Upload Modal */}
      {proofUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-emerald-50">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <FaUpload className="text-emerald-600" /> Upload Payment Proof
              </h3>
              <button
                onClick={() => setProofUploadModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Selected Deliveries:</strong> {selectedDeliveries.length}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Upload proof for batch payment
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Payment Proof File *
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,application/pdf"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none text-sm"
                />
                {proofFile && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                    <FaFileAlt className="text-emerald-600" />
                    <span className="font-medium">{proofFile.name}</span>
                    <span className="text-xs text-gray-400">
                      ({(proofFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Accepted: JPG, PNG, PDF (max 5MB)
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Reference Number
                </label>
                <input
                  type="text"
                  value={proofForm.referenceNumber}
                  onChange={(e) =>
                    setProofForm({ ...proofForm, referenceNumber: e.target.value })
                  }
                  placeholder="e.g., Bank transaction reference"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={proofForm.notes}
                  onChange={(e) =>
                    setProofForm({ ...proofForm, notes: e.target.value })
                  }
                  placeholder="Additional information..."
                  rows="3"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none text-sm resize-none"
                />
              </div>

              {alert.show && (
                <div
                  className={`p-3 rounded-lg text-sm ${alert.type === "error"
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}
                >
                  {alert.message}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setProofUploadModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                  disabled={uploadingProof}
                >
                  Cancel
                </button>
                <button
                  onClick={handleProofSubmit}
                  disabled={uploadingProof || !proofFile}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingProof ? "Uploading..." : "Upload Proof"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentManagement;
