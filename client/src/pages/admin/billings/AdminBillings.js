import React, { useState, useEffect } from "react";
import axios from "axios";
import { format, differenceInDays } from "date-fns";
import {
  TbReceipt,
  TbAlertTriangle,
  TbCheck,
  TbClock,
  TbEdit,
  TbSearch,
  TbFilter,
  TbX,
  TbFilterOff,
  TbEye,
  TbFileInvoice,
  TbChevronLeft,
  TbChevronRight,
  TbCreditCard,
  TbCalendar,
  TbBuilding,
  TbTruck,
  TbCurrencyPeso
} from "react-icons/tb";
import AdminHeader from "../../../components/common/AdminHeader";
import { useTimeframe } from "../../../contexts/TimeframeContext";

const AdminBillings = ({ currentUser }) => {
  const { isWithinTimeframe } = useTimeframe();
  const [allPayments, setAllPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [alert, setAlert] = useState({
    show: false,
    type: "info",
    message: "",
  });

  // Proof viewer state
  const [proofViewerOpen, setProofViewerOpen] = useState(false);
  const [viewingProof, setViewingProof] = useState(null);
  const [approvingProof, setApprovingProof] = useState(false);
  const [rejectingProof, setRejectingProof] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Filter states
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);

  // Stats state
  const [stats, setStats] = useState({
    totalPayments: 0,
    totalAmount: 0,
    pendingPayments: 0,
    overduePayments: 0,
    paidPayments: 0,
    pendingVerificationPayments: 0,
    pendingAmount: 0,
    overdueAmount: 0,
    paidAmount: 0,
    pendingVerificationAmount: 0,
  });

  const activeFilterCount = [
    statusFilter !== "all",
    startDate,
    endDate,
  ].filter(Boolean).length;

  useEffect(() => {
    fetchAllPayments();
  }, []);

  // Re-filter when timeframe changes from header
  useEffect(() => {
    filterPayments();
  }, [allPayments, statusFilter, searchQuery, startDate, endDate, isWithinTimeframe]);

  useEffect(() => {
    calculateStats();
  }, [filteredPayments]);

  const fetchAllPayments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication token missing");

      const response = await axios.get("/api/payments/all", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setAllPayments(response.data.data || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching payments:", err);
      setError(err.response?.data?.message || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  const filterPayments = () => {
    let filtered = [...allPayments];

    // Apply timeframe filter from header
    filtered = filtered.filter((p) => {
      const paymentDate = p.dueDate || p.createdAt || p.created_at || p.deliveryDate;
      return isWithinTimeframe(paymentDate);
    });

    if (statusFilter !== "all") {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.deliveryId?.toLowerCase().includes(query) ||
          p.clientName?.toLowerCase().includes(query) ||
          p.clientId?.toLowerCase().includes(query) ||
          p.metadata?.truckPlate?.toLowerCase().includes(query)
      );
    }

    if (startDate || endDate) {
      filtered = filtered.filter((p) => {
        const paymentDate = p.dueDate || p.createdAt || p.created_at || p.deliveryDate;
        if (!paymentDate) return true;

        const date = new Date(paymentDate);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);

        if (start && end) return date >= start && date <= end;
        if (start) return date >= start;
        if (end) return date <= end;
        return true;
      });
    }

    setFilteredPayments(filtered);
    setPage(0);
  };

  const calculateStats = () => {
    const newStats = {
      totalPayments: filteredPayments.length,
      totalAmount: 0,
      pendingPayments: 0,
      overduePayments: 0,
      paidPayments: 0,
      pendingVerificationPayments: 0,
      pendingAmount: 0,
      overdueAmount: 0,
      paidAmount: 0,
      pendingVerificationAmount: 0,
    };

    filteredPayments.forEach((payment) => {
      newStats.totalAmount += payment.amount || 0;
      if (payment.status === "paid") {
        newStats.paidPayments++;
        newStats.paidAmount += payment.amount || 0;
      } else if (payment.status === "overdue") {
        newStats.overduePayments++;
        newStats.overdueAmount += payment.amount || 0;
      } else if (payment.status === "pending") {
        newStats.pendingPayments++;
        newStats.pendingAmount += payment.amount || 0;
      } else if (payment.status === "pending_verification") {
        newStats.pendingVerificationPayments++;
        newStats.pendingVerificationAmount += payment.amount || 0;
      }
    });

    setStats(newStats);
  };

  const handleMarkAsPaid = (payment) => {
    setSelectedPayment(payment);
    setEditDialogOpen(true);
  };

  const handleConfirmMarkAsPaid = async () => {
    if (!selectedPayment) return;
    try {
      setUpdatingStatus(true);
      const token = localStorage.getItem("token");
      await axios.put(
        `/api/payments/${selectedPayment.id}/status`,
        { status: "paid" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAlert({ show: true, type: "success", message: "Payment updated successfully" });
      await fetchAllPayments();
      setEditDialogOpen(false);
    } catch (err) {
      setAlert({ show: true, type: "error", message: err.response?.data?.message || "Update failed" });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleViewProof = async (payment) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`/api/payments/${payment.id}/proof`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setViewingProof({ ...response.data.data, payment });
        setProofViewerOpen(true);
      }
    } catch (err) {
      setAlert({ show: true, type: "error", message: "Failed to load proof" });
    }
  };

  const handleApproveProof = async () => {
    if (!viewingProof?.id) return;
    try {
      setApprovingProof(true);
      const token = localStorage.getItem("token");
      await axios.post("/api/payments/approve-proof", { proofId: viewingProof.id }, { headers: { Authorization: `Bearer ${token}` } });
      setAlert({ show: true, type: "success", message: "Payment approved!" });
      setProofViewerOpen(false);
      await fetchAllPayments();
    } catch (err) {
      setAlert({ show: true, type: "error", message: "Failed to approve proof" });
    } finally {
      setApprovingProof(false);
    }
  };

  const handleRejectProof = async () => {
    if (!viewingProof?.id || !rejectionReason.trim()) return;
    try {
      setRejectingProof(true);
      const token = localStorage.getItem("token");
      await axios.post("/api/payments/reject-proof", { proofId: viewingProof.id, rejectionReason: rejectionReason.trim() }, { headers: { Authorization: `Bearer ${token}` } });
      setAlert({ show: true, type: "info", message: "Proof rejected" });
      setRejectDialogOpen(false);
      setProofViewerOpen(false);
      await fetchAllPayments();
    } catch (err) {
      setAlert({ show: true, type: "error", message: "Failed to reject proof" });
    } finally {
      setRejectingProof(false);
    }
  };

  // Helper functions
  const formatCurrency = (amount) => `₱${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 }).format(amount)}`;
  const formatDate = (date) => date ? format(new Date(date), "MMM dd, yyyy") : "N/A";
  const getStatusColor = (status) => {
    switch (status) {
      case "paid": return "bg-green-100 text-green-800 border-green-200";
      case "overdue": return "bg-red-100 text-red-800 border-red-200";
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "pending_verification": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusLabel = (status) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <AdminHeader currentUser={currentUser} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Billing Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and track all payment records</p>
        </div>

        {/* Alerts */}
        {alert.show && (
          <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 ${alert.type === "error" ? "bg-red-50 border-red-200 text-red-700" :
            alert.type === "success" ? "bg-green-50 border-green-200 text-green-700" :
              "bg-blue-50 border-blue-200 text-blue-700"
            }`}>
            {alert.type === "error" ? <TbAlertTriangle size={20} /> : <TbCheck size={20} />}
            <span className="text-sm font-medium">{alert.message}</span>
            <button onClick={() => setAlert({ ...alert, show: false })} className="ml-auto hover:opacity-75">
              <TbX size={18} />
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <TbFileInvoice size={24} />
              </div>
              <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-full">Total</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stats.totalPayments}</h3>
            <p className="text-sm text-gray-500 mt-1">Total Billings</p>
            <div className="mt-4 pt-4 border-t border-gray-50">
              <span className="text-sm font-semibold text-indigo-600">{formatCurrency(stats.totalAmount)}</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                <TbAlertTriangle size={24} />
              </div>
              <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">Overdue</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stats.overduePayments}</h3>
            <p className="text-sm text-gray-500 mt-1">Overdue Payments</p>
            <div className="mt-4 pt-4 border-t border-gray-50">
              <span className="text-sm font-semibold text-red-600">{formatCurrency(stats.overdueAmount)}</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-50 text-yellow-600 rounded-xl">
                <TbClock size={24} />
              </div>
              <span className="text-xs font-medium text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">Pending</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stats.pendingPayments}</h3>
            <p className="text-sm text-gray-500 mt-1">Pending Payments</p>
            <div className="mt-4 pt-4 border-t border-gray-50">
              <span className="text-sm font-semibold text-yellow-600">{formatCurrency(stats.pendingAmount)}</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                <TbCheck size={24} />
              </div>
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">Paid</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stats.paidPayments}</h3>
            <p className="text-sm text-gray-500 mt-1">Completed Payments</p>
            <div className="mt-4 pt-4 border-t border-gray-50">
              <span className="text-sm font-semibold text-green-600">{formatCurrency(stats.paidAmount)}</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <TbSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search delivery ID, client, or truck..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${showFilters || activeFilterCount > 0 ? "bg-primary-50 border-primary-200 text-primary-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
            >
              <TbFilter size={18} />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-primary-600 text-white text-xs px-1.5 py-0.5 rounded-full ml-1">{activeFilterCount}</span>
              )}
            </button>
            {activeFilterCount > 0 && (
              <button
                onClick={() => { setSearchQuery(""); setStatusFilter("all"); setStartDate(""); setEndDate(""); }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 text-sm font-medium transition-all"
              >
                <TbFilterOff size={18} /> Reset
              </button>
            )}
          </div>
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6 grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-down">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="pending_verification">Pending Verification</option>
                <option value="overdue">Overdue</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
              />
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-12 flex justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                <TbReceipt size={32} />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No records found</h3>
              <p className="text-gray-500 mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Delivery ID</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPayments.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900 block">{payment.deliveryId || "N/A"}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                            {payment.clientName?.charAt(0).toUpperCase() || "C"}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{payment.clientName || "Unknown Client"}</div>
                            <div className="text-xs text-gray-500">ID: {payment.clientId?.substring(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-gray-900">{formatCurrency(payment.amount)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(payment.status)}`}>
                          {getStatusLabel(payment.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(payment.dueDate)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {payment.status === "pending_verification" && (
                            <button
                              onClick={() => handleViewProof(payment)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                              title="View Proof"
                            >
                              <TbEye size={18} />
                            </button>
                          )}
                          {payment.status !== "paid" && (
                            <button
                              onClick={() => handleMarkAsPaid(payment)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-transparent hover:border-green-100"
                              title="Mark as Paid"
                            >
                              <TbCheck size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && filteredPayments.length > 0 && (
            <div className="bg-white px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing <span className="font-medium">{page * rowsPerPage + 1}</span> to <span className="font-medium">{Math.min((page + 1) * rowsPerPage, filteredPayments.length)}</span> of <span className="font-medium">{filteredPayments.length}</span> results
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <TbChevronLeft size={18} />
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={(page + 1) * rowsPerPage >= filteredPayments.length}
                  className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <TbChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Status Modal */}
      {editDialogOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl animate-scale-up">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Mark as Paid?</h3>
            <p className="text-gray-500 mb-6">Are you sure you want to mark this payment of <span className="font-semibold text-gray-900">{formatCurrency(selectedPayment.amount)}</span> as paid?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setEditDialogOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleConfirmMarkAsPaid} disabled={updatingStatus} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-lg shadow-green-500/30 transition-all flex items-center gap-2">
                {updatingStatus ? "Updating..." : "Confirm Payment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proof Viewer Modal */}
      {proofViewerOpen && viewingProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setProofViewerOpen(false)}>
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <TbEye className="text-primary-600" />
                Payment Proof
              </h3>
              <button onClick={() => setProofViewerOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><TbX /></button>
            </div>

            <div className="flex-1 overflow-auto bg-gray-100 p-4 flex items-center justify-center">
              {viewingProof.proofUrl ? (
                <img src={viewingProof.proofUrl} alt="Proof" className="max-w-full max-h-full object-contain shadow-lg rounded-lg" />
              ) : (
                <div className="text-gray-500 flex flex-col items-center gap-2">
                  <TbAlertTriangle size={32} />
                  No proof image available
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 bg-white flex justify-end gap-3">
              <button onClick={handleOpenRejectDialog} disabled={approvingProof || rejectingProof} className="px-4 py-2 text-red-600 border border-red-200 hover:bg-red-50 rounded-lg transition-all font-medium">
                Reject Proof
              </button>
              <button onClick={handleApproveProof} disabled={approvingProof || rejectingProof} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-lg shadow-green-500/30 transition-all font-medium flex items-center gap-2">
                {approvingProof ? "Approving..." : <> <TbCheck /> Approve Payment </>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      {rejectDialogOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl animate-scale-up">
            <h3 className="text-xl font-semibold text-gray-900 mb-2 text-red-600 flex items-center gap-2"><TbAlertTriangle /> Reject Proof</h3>
            <p className="text-gray-500 mb-4 text-sm">Please provide a reason for rejecting this payment proof. The client will be notified.</p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none min-h-[100px] mb-4 text-sm"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setRejectDialogOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleRejectProof} disabled={rejectingProof} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-lg shadow-red-500/30 transition-all">
                {rejectingProof ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBillings;
