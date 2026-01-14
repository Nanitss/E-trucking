import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
  TablePagination
} from '@mui/material';
import {
  Payment as PaymentIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';
import { format, differenceInDays } from 'date-fns';
import AdminHeader from '../../../components/common/AdminHeader';
import '../../../styles/DesignSystem.css';
import './AdminBillings.css';

const AdminBillings = ({ currentUser }) => {
  const [allPayments, setAllPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [alert, setAlert] = useState({ show: false, type: 'info', message: '' });
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Summary statistics
  const [stats, setStats] = useState({
    totalPayments: 0,
    totalAmount: 0,
    pendingPayments: 0,
    overduePayments: 0,
    paidPayments: 0,
    pendingAmount: 0,
    overdueAmount: 0,
    paidAmount: 0
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
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Authentication token missing. Please login again.');
        setLoading(false);
        return;
      }
      
      console.log('🔍 Fetching all payments from /api/payments/all');
      
      const response = await axios.get('/api/payments/all', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('✅ Payments response:', response.data);
      console.log('📊 Number of payments:', response.data.data?.length || 0);
      
      const paymentsData = response.data.data || [];
      setAllPayments(paymentsData);
      
      if (paymentsData.length === 0) {
        console.log('⚠️ No payment records found. This means you have no deliveries in the database.');
      }
      
      setError(null);
    } catch (error) {
      console.error('❌ Error fetching payments:', error);
      console.error('Error details:', error.response?.data);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to load payments';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const filterPayments = () => {
    let filtered = [...allPayments];
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.deliveryId?.toLowerCase().includes(query) ||
        p.clientName?.toLowerCase().includes(query) ||
        p.clientId?.toLowerCase().includes(query) ||
        p.metadata?.truckPlate?.toLowerCase().includes(query)
      );
    }
    
    // Date range filter
    if (startDate || endDate) {
      filtered = filtered.filter(p => {
        // Get the payment/delivery date (try multiple field names)
        const paymentDate = p.dueDate || p.createdAt || p.created_at || p.deliveryDate;
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
      paidAmount: 0
    };
    
    filteredPayments.forEach(payment => {
      newStats.totalAmount += payment.amount || 0;
      
      if (payment.status === 'paid') {
        newStats.paidPayments++;
        newStats.paidAmount += payment.amount || 0;
      } else if (payment.status === 'overdue') {
        newStats.overduePayments++;
        newStats.overdueAmount += payment.amount || 0;
      } else if (payment.status === 'pending') {
        newStats.pendingPayments++;
        newStats.pendingAmount += payment.amount || 0;
      }
    });
    
    setStats(newStats);
  };

  const handleEditStatus = (payment) => {
    setSelectedPayment(payment);
    setNewStatus(payment.status);
    setEditDialogOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedPayment || !newStatus) return;
    
    try {
      setUpdatingStatus(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.put(
        `/api/payments/${selectedPayment.id}/status`,
        { status: newStatus },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setAlert({
          show: true,
          type: 'success',
          message: 'Payment status updated successfully'
        });
        
        // Refresh payments
        await fetchAllPayments();
        setEditDialogOpen(false);
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
      setAlert({
        show: true,
        type: 'error',
        message: error.response?.data?.message || 'Failed to update payment status'
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      return format(new Date(date), 'MMM dd, yyyy');
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return null;
    const days = differenceInDays(new Date(dueDate), new Date());
    return days;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'success';
      case 'overdue': return 'error';
      case 'failed': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid': return <CheckCircleIcon />;
      case 'overdue': return <WarningIcon />;
      case 'failed': return <WarningIcon />;
      case 'pending': return <ScheduleIcon />;
      default: return <PaymentIcon />;
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
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <AdminHeader currentUser={currentUser} />
      
      <Box p={3} sx={{ paddingTop: '200px' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            Billing Management
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchAllPayments}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>

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
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Billings
                </Typography>
                <Typography variant="h5" component="h2">
                  {stats.totalPayments}
                </Typography>
                <Typography variant="body2" color="primary">
                  {formatCurrency(stats.totalAmount)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Overdue Payments
                </Typography>
                <Typography variant="h5" component="h2" color="error">
                  {stats.overduePayments}
                </Typography>
                <Typography variant="body2" color="error">
                  {formatCurrency(stats.overdueAmount)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Pending Payments
                </Typography>
                <Typography variant="h5" component="h2" color="warning.main">
                  {stats.pendingPayments}
                </Typography>
                <Typography variant="body2" color="warning.main">
                  {formatCurrency(stats.pendingAmount)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Paid
                </Typography>
                <Typography variant="h5" component="h2" color="success.main">
                  {stats.paidPayments}
                </Typography>
                <Typography variant="body2" color="success.main">
                  {formatCurrency(stats.paidAmount)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  placeholder="Search by delivery ID, client, or truck..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Status Filter</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status Filter"
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
              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                  type="date"
                  label="From Date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ max: endDate || undefined }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                  type="date"
                  label="To Date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: startDate || undefined }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                      setStartDate('');
                      setEndDate('');
                    }}
                    sx={{ whiteSpace: 'nowrap' }}
                  >
                    Clear Filters
                  </Button>
                  <Typography variant="body2" color="textSecondary">
                    Showing {filteredPayments.length} of {allPayments.length}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Payments Table */}
        <Card>
          <CardContent>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
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
                          <PaymentIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                          <Typography variant="h6" color="textSecondary" gutterBottom>
                            No Billing Records Found
                          </Typography>
                          <Typography variant="body2" color="textSecondary" mb={2}>
                            {allPayments.length === 0 
                              ? 'There are no deliveries in your system yet. Billing records are automatically created when clients book deliveries.'
                              : 'No records match your current filters. Try adjusting the search or status filter.'}
                          </Typography>
                          {allPayments.length === 0 && (
                            <Typography variant="body2" color="primary" sx={{ mt: 2 }}>
                              💡 To create billing records: Navigate to Deliveries → Add Delivery
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayments
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((payment) => {
                        const daysUntilDue = getDaysUntilDue(payment.dueDate);
                        return (
                          <TableRow key={payment.id} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight="bold">
                                {payment.deliveryId || 'N/A'}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                Truck: {payment.metadata?.truckPlate || 'N/A'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="bold">
                                {payment.clientName || payment.metadata?.clientName || 'Unknown'}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                ID: {payment.clientId || 'N/A'}
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
                            <TableCell>
                              {formatDate(payment.dueDate)}
                            </TableCell>
                            <TableCell>
                              <Chip
                                icon={getStatusIcon(payment.status)}
                                label={payment.status?.toUpperCase() || 'UNKNOWN'}
                                color={getStatusColor(payment.status)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              {payment.status === 'pending' && daysUntilDue !== null ? (
                                <Typography 
                                  variant="body2" 
                                  color={daysUntilDue <= 5 ? 'error' : daysUntilDue <= 10 ? 'warning.main' : 'textSecondary'}
                                >
                                  {daysUntilDue > 0 ? `${daysUntilDue} days` : `${Math.abs(daysUntilDue)} days overdue`}
                                </Typography>
                              ) : payment.status === 'paid' ? (
                                <Typography variant="body2" color="success.main">
                                  Paid
                                </Typography>
                              ) : payment.status === 'overdue' ? (
                                <Typography variant="body2" color="error">
                                  Overdue
                                </Typography>
                              ) : (
                                <Typography variant="body2" color="textSecondary">
                                  -
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Tooltip title="Edit Status">
                                <IconButton
                                  color="primary"
                                  size="small"
                                  onClick={() => handleEditStatus(payment)}
                                >
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
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

        {/* Edit Status Dialog */}
        <Dialog 
          open={editDialogOpen} 
          onClose={() => !updatingStatus && setEditDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Update Payment Status
          </DialogTitle>
          <DialogContent>
            {selectedPayment && (
              <Box>
                <Typography variant="body1" gutterBottom>
                  <strong>Delivery ID:</strong> {selectedPayment.deliveryId}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Client:</strong> {selectedPayment.clientName || selectedPayment.metadata?.clientName || 'Unknown'}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Amount:</strong> {formatCurrency(selectedPayment.amount)}
                </Typography>
                <Typography variant="body1" gutterBottom mb={3}>
                  <strong>Current Status:</strong> {selectedPayment.status?.toUpperCase()}
                </Typography>

                <FormControl fullWidth>
                  <InputLabel>New Status</InputLabel>
                  <Select
                    value={newStatus}
                    label="New Status"
                    onChange={(e) => setNewStatus(e.target.value)}
                    disabled={updatingStatus}
                  >
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="overdue">Overdue</MenuItem>
                    <MenuItem value="paid">Paid</MenuItem>
                    <MenuItem value="failed">Failed</MenuItem>
                  </Select>
                </FormControl>

                <Alert severity="info" sx={{ mt: 2 }}>
                  This will update the payment status in the database and affect the client's billing records.
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
              onClick={handleUpdateStatus}
              variant="contained"
              disabled={updatingStatus || newStatus === selectedPayment?.status}
            >
              {updatingStatus ? <CircularProgress size={20} /> : 'Update Status'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default AdminBillings;
