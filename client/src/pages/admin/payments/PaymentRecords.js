import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  TbCurrencyDollar,
  TbEye,
  TbEdit,
  TbSettings,
  TbCheck,
  TbClock,
  TbFileText,
  TbActivity,
  TbArrowUp,
  TbArrowDown,
} from "react-icons/tb";
import AdminHeader from "../../../components/common/AdminHeader";

const PaymentRecords = () => {
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch payments on component mount
  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("token");
        if (token) {
          axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        }

        const response = await axios.get("/api/payments");

        if (response.data && response.data.data) {
          setPayments(response.data.data);
          setFilteredPayments(response.data.data);
        } else {
          setPayments([]);
          setFilteredPayments([]);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching payments:", err);
        setError(
          err.response?.data?.message || "Failed to load payment records",
        );
        setLoading(false);
      }
    };

    fetchPayments();
  }, []);

  // Filter payments based on status and search
  useEffect(() => {
    let filtered = payments;

    if (statusFilter !== "all") {
      filtered = filtered.filter((payment) => payment.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (payment) =>
          payment.deliveryId
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          payment.metadata?.clientName
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          payment.id.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    setFilteredPayments(filtered);
  }, [payments, statusFilter, searchTerm]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "paid":
        return "status-paid";
      case "pending":
        return "status-pending";
      case "overdue":
        return "status-overdue";
      case "failed":
        return "status-failed";
      default:
        return "status-unknown";
    }
  };

  // Get status counts for summary
  const getStatusCounts = () => {
    return {
      total: payments.length,
      paid: payments.filter((p) => p.status === "paid").length,
      pending: payments.filter((p) => p.status === "pending").length,
      overdue: payments.filter((p) => p.status === "overdue").length,
      failed: payments.filter((p) => p.status === "failed").length,
    };
  };

  const statusCounts = getStatusCounts();

  if (loading) {
    return <div className="loading">Loading payment records...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">
          {error}
          <div style={{ marginTop: "10px" }}>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page-container">
      <AdminHeader currentUser={null} />

      <div className="admin-content">
        {/* Greeting and Summary Cards */}
        <div className="greeting-section">
          <h2 className="greeting-text">Payment Records</h2>
          <p className="greeting-subtitle">
            Track and manage payment transactions and financial records
          </p>

          <div className="summary-cards">
            <div className="summary-card">
              <div className="card-icon">
                <TbCurrencyDollar size={24} />
              </div>
              <div className="card-content">
                <div className="card-value">{payments.length}</div>
                <div className="card-label">Total Payments</div>
                <div className="card-change positive">
                  <TbArrowUp size={12} />
                  +3.7%
                </div>
              </div>
            </div>

            <div className="summary-card">
              <div className="card-icon">
                <TbCheck size={24} />
              </div>
              <div className="card-content">
                <div className="card-value">
                  {payments.filter((p) => p.status === "completed").length}
                </div>
                <div className="card-label">Completed</div>
                <div className="card-change positive">
                  <TbArrowUp size={12} />
                  +2.9%
                </div>
              </div>
            </div>

            <div className="summary-card">
              <div className="card-icon">
                <TbClock size={24} />
              </div>
              <div className="card-content">
                <div className="card-value">
                  {payments.filter((p) => p.status === "pending").length}
                </div>
                <div className="card-label">Pending</div>
                <div className="card-change neutral">
                  <TbActivity size={12} />
                  0.0%
                </div>
              </div>
            </div>

            <div className="summary-card">
              <div className="card-icon">
                <TbFileText size={24} />
              </div>
              <div className="card-content">
                <div className="card-value">
                  {payments.filter((p) => p.status === "failed").length}
                </div>
                <div className="card-label">Failed</div>
                <div className="card-change negative">
                  <TbArrowDown size={12} />
                  -0.2%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Filters */}
        <div className="modern-filters">
          <div className="filters-header">
            <div className="filters-header-icon">🔍</div>
            <h3>Search & Filter</h3>
          </div>

          <div className="filters-grid">
            {/* Search */}
            <div className="search-container">
              <label className="search-label">Search</label>
              <div className="search-input-wrapper">
                <div className="search-icon">🔍</div>
                <input
                  type="text"
                  placeholder="Search by Payment ID, Client, or Delivery ID"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="modern-search-input"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="filter-group">
              <label className="filter-label">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="modern-filter-select"
              >
                <option value="all">All Status</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {/* Clear Filters */}
            <div className="filter-actions">
              <button
                onClick={() => {
                  setStatusFilter("all");
                  setSearchTerm("");
                }}
                className="modern-btn modern-btn-secondary"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        </div>

        {/* Payment Records Table */}
        <div className="table-container">
          <table className="records-table">
            <thead>
              <tr>
                <th>Payment ID</th>
                <th>Client</th>
                <th>Delivery ID</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Due Date</th>
                <th>Payment Method</th>
                <th>Created Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length > 0 ? (
                filteredPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td>
                      <span className="payment-id">{payment.id}</span>
                    </td>
                    <td>
                      <span className="client-name">
                        {payment.metadata?.clientName || "Unknown Client"}
                      </span>
                    </td>
                    <td>
                      <span className="delivery-id">
                        {payment.deliveryId || "N/A"}
                      </span>
                    </td>
                    <td>
                      <span className="amount">
                        {formatCurrency(payment.amount)}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${getStatusBadgeClass(payment.status)}`}
                      >
                        {payment.status
                          ? payment.status.charAt(0).toUpperCase() +
                            payment.status.slice(1)
                          : "Unknown"}
                      </span>
                    </td>
                    <td>
                      <span className="due-date">
                        {formatDate(payment.dueDate)}
                      </span>
                    </td>
                    <td>
                      <span className="payment-method">
                        {payment.metadata?.paymentMethod ||
                          payment.paymentMethod ||
                          "N/A"}
                      </span>
                    </td>
                    <td>
                      <span className="created-date">
                        {formatDate(payment.createdAt)}
                      </span>
                    </td>
                    <td>
                      <div className="actions">
                        <Link
                          to={`/admin/payments/${payment.id}`}
                          className="btn btn-sm btn-view"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="no-records">
                    No payment records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Summary info */}
        <div className="table-footer">
          <p>
            Showing {filteredPayments.length} of {payments.length} payment
            records
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentRecords;
