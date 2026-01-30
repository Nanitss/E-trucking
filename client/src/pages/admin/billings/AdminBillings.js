import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TablePagination,
} from "@mui/material";
import {
  Payment as PaymentIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Close as CloseIcon,
  FilterListOff as FilterListOffIcon,
} from "@mui/icons-material";
import { format, differenceInDays } from "date-fns";
import AdminHeader from "../../../components/common/AdminHeader";
import "../../../styles/DesignSystem.css";
import "./AdminBillings.css";

const AdminBillings = ({ currentUser }) => {
  const [allPayments, setAllPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [alert, setAlert] = useState({
    show: false,
    type: "info",
    message: "",
  });

  // Filter states
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);

  // Calculate active filters count
  const activeFilterCount = [
    statusFilter !== "all" ? statusFilter : null,
    startDate ? startDate : null,
    endDate ? endDate : null,
  ].filter(Boolean).length;

  // Summary statistics
  const [stats, setStats] = useState({
    totalPayments: 0,
    totalAmount: 0,
    pendingPayments: 0,
    overduePayments: 0,
    paidPayments: 0,
    pendingAmount: 0,
    overdueAmount: 0,
    paidAmount: 0,
  });

  useEffect(() => {
    fetchAllPayments();
  }, []);

  useEffect(() => {
    filterPayments();
  }, [allPayments, statusFilter, searchQuery, startDate, endDate]);

  useEffect(() => {
    calculateStats();
  }, [filteredPayments]);

  const fetchAllPayments = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");

      if (!token) {
        setError("Authentication token missing. Please login again.");
        setLoading(false);
        return;
      }

      console.log("🔍 Fetching all payments from /api/payments/all");

      const response = await axios.get("/api/payments/all", {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("✅ Payments response:", response.data);
      console.log("📊 Number of payments:", response.data.data?.length || 0);

      const paymentsData = response.data.data || [];
      setAllPayments(paymentsData);

      if (paymentsData.length === 0) {
        console.log(
          "⚠️ No payment records found. This means you have no deliveries in the database.",
        );
      }

      setError(null);
    } catch (error) {
      console.error("❌ Error fetching payments:", error);
      console.error("Error details:", error.response?.data);
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to load payments";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const filterPayments = () => {
    let filtered = [...allPayments];

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.deliveryId?.toLowerCase().includes(query) ||
          p.clientName?.toLowerCase().includes(query) ||
          p.clientId?.toLowerCase().includes(query) ||
          p.metadata?.truckPlate?.toLowerCase().includes(query),
      );
    }

    // Date range filter
    if (startDate || endDate) {
      filtered = filtered.filter((p) => {
        // Get the payment/delivery date (try multiple field names)
        const paymentDate =
          p.dueDate || p.createdAt || p.created_at || p.deliveryDate;
        if (!paymentDate) return true; // Include payments without dates

        const date = new Date(paymentDate);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        // Set time to start/end of day for accurate comparison
        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);

        if (start && end) {
          return date >= start && date <= end;
        } else if (start) {
          return date >= start;
        } else if (end) {
          return date <= end;
        }
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
      pendingAmount: 0,
      overdueAmount: 0,
      paidAmount: 0,
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

      const response = await axios.put(
        `/api/payments/${selectedPayment.id}/status`,
        { status: "paid" },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.success) {
        setAlert({
          show: true,
          type: "success",
          message: "Payment status updated successfully",
        });

        // Refresh payments
        await fetchAllPayments();
        setEditDialogOpen(false);
      }
    } catch (error) {
      console.error("Error updating payment status:", error);
      setAlert({
        show: true,
        type: "error",
        message:
          error.response?.data?.message || "Failed to update payment status",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const formatCurrency = (amount) => {
    return `₱${new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)}`;
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    try {
      return format(new Date(date), "MMM dd, yyyy");
    } catch (error) {
      return "Invalid Date";
    }
  };

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return null;
    const days = differenceInDays(new Date(dueDate), new Date());
    return days;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "paid":
        return "success";
      case "overdue":
        return "error";
      case "failed":
        return "error";
      case "pending":
        return "warning";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "paid":
        return <CheckCircleIcon />;
      case "overdue":
        return <WarningIcon />;
      case "failed":
        return <WarningIcon />;
      case "pending":
        return <ScheduleIcon />;
      default:
        return <PaymentIcon />;
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (loading && allPayments.length === 0) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <AdminHeader currentUser={currentUser} />

      <Box p={3} sx={{ paddingTop: "24px" }}>
        {/* Page Title */}
        <Typography variant="h4" component="h1" mb={3}>
          Billing Management
        </Typography>

        {alert.show && (
          <Alert
            severity={alert.type}
            onClose={() => setAlert({ show: false })}
            sx={{ mb: 3 }}
          >
            {alert.message}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Statistics Cards */}
        {/* Statistics Cards - Custom Grid Layout */}
        <div className="billing-stats-container">
          {/* Total Billings */}
          <div className="billing-stat-card">
            <Typography color="textSecondary" gutterBottom noWrap>
              Total Billings
            </Typography>
            <Typography variant="h5" component="h2">
              {stats.totalPayments}
            </Typography>
            <Typography variant="body2" color="primary" noWrap>
              {formatCurrency(stats.totalAmount)}
            </Typography>
          </div>

          {/* Overdue Payments */}
          <div className="billing-stat-card">
            <Typography color="textSecondary" gutterBottom noWrap>
              Overdue Payments
            </Typography>
            <Typography variant="h5" component="h2" color="error">
              {stats.overduePayments}
            </Typography>
            <Typography variant="body2" color="error" noWrap>
              {formatCurrency(stats.overdueAmount)}
            </Typography>
          </div>

          {/* Pending Payments */}
          <div className="billing-stat-card">
            <Typography color="textSecondary" gutterBottom noWrap>
              Pending Payments
            </Typography>
            <Typography variant="h5" component="h2" color="warning.main">
              {stats.pendingPayments}
            </Typography>
            <Typography variant="body2" color="warning.main" noWrap>
              {formatCurrency(stats.pendingAmount)}
            </Typography>
          </div>

          {/* Paid */}
          <div className="billing-stat-card">
            <Typography color="textSecondary" gutterBottom noWrap>
              Paid
            </Typography>
            <Typography variant="h5" component="h2" color="success.main">
              {stats.paidPayments}
            </Typography>
            <Typography variant="body2" color="success.main" noWrap>
              {formatCurrency(stats.paidAmount)}
            </Typography>
          </div>
        </div>

        {/* Modern Filter Bar - Popup Style */}
        <Box sx={{ position: "relative", mb: 3 }}>
          <Box
            sx={{
              display: "flex",
              gap: 2,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {/* Search Input */}
            <TextField
              placeholder="Search by delivery ID, client, or truck..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <SearchIcon sx={{ color: "action.active", mr: 1 }} />
                ),
              }}
              sx={{ flex: "0 0 350px" }}
              size="small"
            />

            {/* Filter Toggle Button */}
            <Button
              variant={showFilters ? "contained" : "outlined"}
              startIcon={<FilterListIcon />}
              onClick={() => setShowFilters(!showFilters)}
              sx={{
                height: "40px",
                position: "relative",
                paddingRight: activeFilterCount > 0 ? "48px" : "16px",
              }}
            >
              Filters
              {activeFilterCount > 0 && (
                <Box
                  component="span"
                  sx={{
                    position: "absolute",
                    right: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: showFilters
                      ? "rgba(255,255,255,0.3)"
                      : "primary.main",
                    color: showFilters ? "inherit" : "white",
                    borderRadius: "12px",
                    padding: "2px 8px",
                    fontSize: "0.75rem",
                    fontWeight: "bold",
                    minWidth: "20px",
                    textAlign: "center",
                  }}
                >
                  {activeFilterCount}
                </Box>
              )}
            </Button>
          </Box>

          {/* Filter Count Display */}
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1.5 }}>
            Showing {filteredPayments.length} of {allPayments.length}
          </Typography>

          {/* Filter Popup */}
          {showFilters && (
            <Paper
              elevation={4}
              sx={{
                position: "absolute",
                top: "52px",
                left: 0,
                zIndex: 1000,
                width: "480px",
                maxWidth: "90vw",
                p: 2.5,
                borderRadius: 2,
              }}
            >
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Typography variant="h6" sx={{ fontSize: "1.1rem" }}>
                  Filter Options
                </Typography>
                <IconButton size="small" onClick={() => setShowFilters(false)}>
                  <CloseIcon />
                </IconButton>
              </Box>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={statusFilter}
                      label="Status"
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <MenuItem value="all">All Status</MenuItem>
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="overdue">Overdue</MenuItem>
                      <MenuItem value="paid">Paid</MenuItem>
                      <MenuItem value="failed">Failed</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="From Date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ max: endDate || undefined }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="To Date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ min: startDate || undefined }}
                  />
                </Grid>
              </Grid>

              <Box
                display="flex"
                justifyContent="flex-end"
                gap={1}
                pt={2}
                sx={{ borderTop: "1px solid #e0e0e0" }}
              >
                <Button
                  variant="text"
                  startIcon={<FilterListOffIcon />}
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                    setStartDate("");
                    setEndDate("");
                  }}
                  size="small"
                >
                  Reset
                </Button>
                <Button
                  variant="contained"
                  onClick={() => setShowFilters(false)}
                  size="small"
                >
                  Apply Filters
                </Button>
              </Box>
            </Paper>
          )}
        </Box>

        {/* Payments Table */}
        <Card>
          <CardContent>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                    <TableCell>Delivery ID</TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Delivery Date</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Days Until Due</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Box py={6}>
                          <PaymentIcon
                            sx={{ fontSize: 60, color: "text.disabled", mb: 2 }}
                          />
                          <Typography
                            variant="h6"
                            color="textSecondary"
                            gutterBottom
                          >
                            No Billing Records Found
                          </Typography>
                          <Typography
                            variant="body2"
                            color="textSecondary"
                            mb={2}
                          >
                            {allPayments.length === 0
                              ? "There are no deliveries in your system yet. Billing records are automatically created when clients book deliveries."
                              : "No records match your current filters. Try adjusting the search or status filter."}
                          </Typography>
                          {allPayments.length === 0 && (
                            <Typography
                              variant="body2"
                              color="primary"
                              sx={{ mt: 2 }}
                            >
                              💡 To create billing records: Navigate to
                              Deliveries → Add Delivery
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayments
                      .slice(
                        page * rowsPerPage,
                        page * rowsPerPage + rowsPerPage,
                      )
                      .map((payment) => {
                        const daysUntilDue = getDaysUntilDue(payment.dueDate);
                        return (
                          <TableRow key={payment.id} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight="bold">
                                {payment.deliveryId || "N/A"}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="textSecondary"
                              >
                                Truck: {payment.metadata?.truckPlate || "N/A"}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="bold">
                                {payment.clientName ||
                                  payment.metadata?.clientName ||
                                  "Unknown"}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="textSecondary"
                              >
                                ID: {payment.clientId || "N/A"}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body1" fontWeight="bold">
                                {formatCurrency(payment.amount)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {formatDate(payment.deliveryDate)}
                            </TableCell>
                            <TableCell>{formatDate(payment.dueDate)}</TableCell>
                            <TableCell>
                              <Chip
                                icon={getStatusIcon(payment.status)}
                                label={
                                  payment.status?.toUpperCase() || "UNKNOWN"
                                }
                                color={getStatusColor(payment.status)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              {payment.status === "pending" &&
                              daysUntilDue !== null ? (
                                <Typography
                                  variant="body2"
                                  color={
                                    daysUntilDue <= 5
                                      ? "error"
                                      : daysUntilDue <= 10
                                        ? "warning.main"
                                        : "textSecondary"
                                  }
                                >
                                  {daysUntilDue > 0
                                    ? `${daysUntilDue} days`
                                    : `${Math.abs(daysUntilDue)} days overdue`}
                                </Typography>
                              ) : payment.status === "paid" ? (
                                <Typography
                                  variant="body2"
                                  color="success.main"
                                >
                                  Paid
                                </Typography>
                              ) : payment.status === "overdue" ? (
                                <Typography variant="body2" color="error">
                                  Overdue
                                </Typography>
                              ) : (
                                <Typography
                                  variant="body2"
                                  color="textSecondary"
                                >
                                  -
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              {payment.status !== "paid" ? (
                                <Button
                                  variant="contained"
                                  color="success"
                                  size="small"
                                  onClick={() => handleMarkAsPaid(payment)}
                                  sx={{
                                    textTransform: "none",
                                    fontSize: "0.75rem",
                                  }}
                                >
                                  Mark as Paid
                                </Button>
                              ) : (
                                <Typography
                                  variant="body2"
                                  color="success.main"
                                >
                                  ✓ Paid
                                </Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={filteredPayments.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </CardContent>
        </Card>

        {/* Mark as Paid Confirmation Dialog */}
        <Dialog
          open={editDialogOpen}
          onClose={() => !updatingStatus && setEditDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Confirm Payment</DialogTitle>
          <DialogContent>
            {selectedPayment && (
              <Box>
                <Typography variant="body1" gutterBottom>
                  Are you sure you want to mark this payment as{" "}
                  <strong>Paid</strong>?
                </Typography>

                <Box sx={{ mt: 2, p: 2, bgcolor: "#f5f5f5", borderRadius: 1 }}>
                  <Typography variant="body2" gutterBottom>
                    <strong>Delivery ID:</strong> {selectedPayment.deliveryId}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Client:</strong>{" "}
                    {selectedPayment.clientName ||
                      selectedPayment.metadata?.clientName ||
                      "Unknown"}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Amount:</strong>{" "}
                    {formatCurrency(selectedPayment.amount)}
                  </Typography>
                </Box>

                <Alert severity="info" sx={{ mt: 2 }}>
                  This action will update the payment status to Paid.
                </Alert>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setEditDialogOpen(false)}
              disabled={updatingStatus}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmMarkAsPaid}
              variant="contained"
              color="success"
              disabled={updatingStatus}
            >
              {updatingStatus ? (
                <CircularProgress size={20} />
              ) : (
                "Confirm Payment"
              )}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default AdminBillings;
