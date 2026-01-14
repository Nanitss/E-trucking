import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
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
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab
} from '@mui/material';
import {
  Payment as PaymentIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Receipt as ReceiptIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { format, differenceInDays } from 'date-fns';

const PaymentsDashboard = () => {
  const history = useHistory();
  const [currentTab, setCurrentTab] = useState(0);
  const [payments, setPayments] = useState([]);
  const [overduePayments, setOverduePayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    clientId: '',
    searchTerm: ''
  });
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentDetailsOpen, setPaymentDetailsOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Payment statistics
  const [stats, setStats] = useState({
    totalPayments: 0,
    totalAmount: 0,
    pendingPayments: 0,
    overduePayments: 0,
    paidPayments: 0,
    totalPaid: 0,
    totalOutstanding: 0
  });

  useEffect(() => {
    fetchPaymentData();
  }, [currentTab, filters]);

  const fetchPaymentData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Authentication token missing. Please login again.');
        return;
      }
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      if (currentTab === 0) {
        // All payments
        const params = new URLSearchParams();
        if (filters.status) params.append('status', filters.status);
        if (filters.clientId) params.append('clientId', filters.clientId);
        
        const response = await axios.get(`/api/payments?${params.toString()}`);
        let paymentsData = response.data.data;
        
        // Apply search filter on frontend
        if (filters.searchTerm) {
          paymentsData = paymentsData.filter(payment => 
            payment.deliveryId.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
            payment.metadata?.clientName?.toLowerCase().includes(filters.searchTerm.toLowerCase())
          );
        }
        
        setPayments(paymentsData);
        calculateStats(paymentsData);
      } else if (currentTab === 1) {
        // Overdue payments
        const response = await axios.get('/api/payments/overdue');
        setOverduePayments(response.data.data);
      }
      
    } catch (error) {
      console.error('Error fetching payment data:', error);
      setError(error.response?.data?.message || 'Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (paymentsData) => {
    const stats = paymentsData.reduce((acc, payment) => {
      acc.totalPayments++;
      acc.totalAmount += payment.amount;
      
      if (payment.status === 'pending') {
        acc.pendingPayments++;
        acc.totalOutstanding += payment.amount;
      } else if (payment.status === 'overdue') {
        acc.overduePayments++;
        acc.totalOutstanding += payment.amount;
      } else if (payment.status === 'paid') {
        acc.paidPayments++;
        acc.totalPaid += payment.amount;
      }
      
      return acc;
    }, {
      totalPayments: 0,
      totalAmount: 0,
      pendingPayments: 0,
      overduePayments: 0,
      paidPayments: 0,
      totalPaid: 0,
      totalOutstanding: 0
    });
    
    setStats(stats);
  };

  const handleUpdateClientStatus = async (clientId) => {
    try {
      setActionLoading(true);
      await axios.post(`/api/payments/update-client-status/${clientId}`);
      fetchPaymentData(); // Refresh data
    } catch (error) {
      console.error('Error updating client status:', error);
      setError(error.response?.data?.message || 'Failed to update client status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreatePaymentLink = async (paymentId) => {
    try {
      setActionLoading(true);
      const response = await axios.post(`/api/payments/${paymentId}/create-link`);
      const { paymentLinkUrl } = response.data.data;
      
      // Copy to clipboard or open
      navigator.clipboard.writeText(paymentLinkUrl);
      alert('Payment link copied to clipboard!');
      
    } catch (error) {
      console.error('Error creating payment link:', error);
      setError(error.response?.data?.message || 'Failed to create payment link');
    } finally {
      setActionLoading(false);
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
    return format(new Date(date), 'MMM dd, yyyy');
  };

  const getPaymentStatusColor = (status, dueDate) => {
    if (status === 'paid') return 'success';
    if (status === 'overdue') return 'error';
    if (status === 'failed') return 'error';
    
    if (status === 'pending' && dueDate) {
      const daysUntilDue = differenceInDays(new Date(dueDate), new Date());
      if (daysUntilDue <= 5) return 'warning';
    }
    
    return 'default';
  };

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return null;
    return differenceInDays(new Date(dueDate), new Date());
  };

  const renderStatsCards = () => (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      <Grid item xs={12} md={2}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Total Payments
            </Typography>
            <Typography variant="h5" component="h2">
              {stats.totalPayments}
            </Typography>
            <Typography variant="body2">
              {formatCurrency(stats.totalAmount)}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={2}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Pending
            </Typography>
            <Typography variant="h5" component="h2" color="warning.main">
              {stats.pendingPayments}
            </Typography>
            <Typography variant="body2">
              Awaiting payment
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={2}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Overdue
            </Typography>
            <Typography variant="h5" component="h2" color="error">
              {stats.overduePayments}
            </Typography>
            <Typography variant="body2" color="error">
              Requires action
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={2}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Paid
            </Typography>
            <Typography variant="h5" component="h2" color="success.main">
              {stats.paidPayments}
            </Typography>
            <Typography variant="body2">
              Completed
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={2}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Outstanding
            </Typography>
            <Typography variant="h5" component="h2" color="error">
              {formatCurrency(stats.totalOutstanding)}
            </Typography>
            <Typography variant="body2">
              Due amount
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={2}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Collected
            </Typography>
            <Typography variant="h5" component="h2" color="success.main">
              {formatCurrency(stats.totalPaid)}
            </Typography>
            <Typography variant="body2">
              Paid amount
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderFilters = () => (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={12} md={3}>
        <FormControl fullWidth>
          <InputLabel>Status</InputLabel>
          <Select
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
            label="Status"
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="overdue">Overdue</MenuItem>
            <MenuItem value="paid">Paid</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      
      <Grid item xs={12} md={3}>
        <TextField
          fullWidth
          label="Search"
          value={filters.searchTerm}
          onChange={(e) => setFilters({...filters, searchTerm: e.target.value})}
          placeholder="Delivery ID, Client..."
          InputProps={{
            startAdornment: <SearchIcon />
          }}
        />
      </Grid>
      
      <Grid item xs={12} md={3}>
        <Button
          variant="outlined"
          onClick={fetchPaymentData}
          startIcon={<RefreshIcon />}
          disabled={loading}
        >
          Refresh
        </Button>
      </Grid>
    </Grid>
  );

  const renderPaymentsTable = (paymentsData, isOverdue = false) => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
            <TableCell>Payment ID</TableCell>
            <TableCell>Client</TableCell>
            <TableCell>Delivery ID</TableCell>
            <TableCell>Amount</TableCell>
            <TableCell>Due Date</TableCell>
            <TableCell>Status</TableCell>
            {isOverdue && <TableCell>Days Overdue</TableCell>}
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {paymentsData.map((payment) => {
            const daysUntilDue = getDaysUntilDue(payment.dueDate);
            return (
              <TableRow key={payment.id}>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {payment.id}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {payment.metadata?.clientName || payment.client?.clientName || 'N/A'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {payment.deliveryId}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {payment.metadata?.pickupLocation || 'N/A'} → {payment.metadata?.deliveryAddress || 'N/A'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body1" fontWeight="bold">
                    {formatCurrency(payment.amount)}
                  </Typography>
                  {payment.transactionFee > 0 && (
                    <Typography variant="caption" color="textSecondary">
                      Net: {formatCurrency(payment.netAmount)}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatDate(payment.dueDate)}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Delivery: {formatDate(payment.deliveryDate)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                    color={getPaymentStatusColor(payment.status, payment.dueDate)}
                    size="small"
                  />
                </TableCell>
                {isOverdue && (
                  <TableCell>
                    <Typography variant="body2" color="error">
                      {payment.daysPastDue || Math.abs(daysUntilDue)} days
                    </Typography>
                  </TableCell>
                )}
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedPayment(payment);
                          setPaymentDetailsOpen(true);
                        }}
                      >
                        <ReceiptIcon />
                      </IconButton>
                    </Tooltip>
                    
                    {(payment.status === 'pending' || payment.status === 'overdue') && (
                      <Tooltip title="Create Payment Link">
                        <IconButton
                          size="small"
                          onClick={() => handleCreatePaymentLink(payment.id)}
                          disabled={actionLoading}
                          color="primary"
                        >
                          <PaymentIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    
                    <Tooltip title="Update Client Status">
                      <IconButton
                        size="small"
                        onClick={() => handleUpdateClientStatus(payment.clientId)}
                        disabled={actionLoading}
                      >
                        <RefreshIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" component="h1" gutterBottom>
        Payment Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {renderStatsCards()}

      <Card>
        <CardContent>
          <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)}>
            <Tab label="All Payments" />
            <Tab label="Overdue Payments" />
          </Tabs>

          <Box sx={{ mt: 3 }}>
            {currentTab === 0 && (
              <>
                {renderFilters()}
                {renderPaymentsTable(payments)}
              </>
            )}
            
            {currentTab === 1 && (
              <>
                <Alert severity="error" sx={{ mb: 3 }}>
                  <Typography variant="h6">Overdue Payments Alert</Typography>
                  These payments are past their due date and require immediate attention.
                </Alert>
                {renderPaymentsTable(overduePayments, true)}
              </>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Payment Details Dialog */}
      <Dialog 
        open={paymentDetailsOpen} 
        onClose={() => setPaymentDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Payment Details</DialogTitle>
        <DialogContent>
          {selectedPayment && (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Payment ID:</Typography>
                <Typography variant="body2">{selectedPayment.id}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Delivery ID:</Typography>
                <Typography variant="body2">{selectedPayment.deliveryId}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Amount:</Typography>
                <Typography variant="body2">{formatCurrency(selectedPayment.amount)}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Status:</Typography>
                <Chip
                  label={selectedPayment.status}
                  color={getPaymentStatusColor(selectedPayment.status, selectedPayment.dueDate)}
                  size="small"
                />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Due Date:</Typography>
                <Typography variant="body2">{formatDate(selectedPayment.dueDate)}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Created:</Typography>
                <Typography variant="body2">{formatDate(selectedPayment.createdAt)}</Typography>
              </Grid>
              {selectedPayment.paidAt && (
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Paid Date:</Typography>
                  <Typography variant="body2">{formatDate(selectedPayment.paidAt)}</Typography>
                </Grid>
              )}
              {selectedPayment.paymentMethod && (
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Payment Method:</Typography>
                  <Typography variant="body2">{selectedPayment.paymentMethod}</Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PaymentsDashboard; 