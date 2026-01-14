import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import axios from 'axios';
import '../../styles/DesignSystem.css';
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
  IconButton,
  TextField,
  InputAdornment
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import MapIcon from '@mui/icons-material/Map';
import { format } from 'date-fns';

const DeliveriesList = () => {
  const history = useHistory();
  const [deliveries, setDeliveries] = useState([]);
  const [filteredDeliveries, setFilteredDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchDeliveries = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          setError('Authentication token missing. Please login again.');
          setLoading(false);
          return;
        }
        
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const response = await axios.get('/api/clients/deliveries');
        setDeliveries(response.data);
        setFilteredDeliveries(response.data);
      } catch (error) {
        console.error('Error fetching deliveries:', error);
        setError(error.response?.data?.message || 'Failed to load deliveries');
      } finally {
        setLoading(false);
      }
    };

    fetchDeliveries();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredDeliveries(deliveries);
      return;
    }
    
    const filtered = deliveries.filter(delivery => {
      const searchTermLower = searchTerm.toLowerCase();
      return (
        (delivery.DeliveryAddress && delivery.DeliveryAddress.toLowerCase().includes(searchTermLower)) ||
        (delivery.TruckPlate && delivery.TruckPlate.toLowerCase().includes(searchTermLower)) ||
        (delivery.TruckType && delivery.TruckType.toLowerCase().includes(searchTermLower)) ||
        (delivery.DeliveryStatus && delivery.DeliveryStatus.toLowerCase().includes(searchTermLower))
      );
    });
    
    setFilteredDeliveries(filtered);
  }, [searchTerm, deliveries]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy h:mm a');
    } catch (e) {
      return 'Invalid date';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#FFA000'; // Amber
      case 'in-progress':
        return '#2196F3'; // Blue
      case 'completed':
        return '#4CAF50'; // Green
      case 'cancelled':
        return '#F44336'; // Red
      default:
        return '#9E9E9E'; // Grey
    }
  };

  const viewDeliveryDetails = (id) => {
    history.push(`/client/deliveries/${id}`);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Card elevation={3}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5" component="h1">
              <LocalShippingIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              My Deliveries
            </Typography>
            <Button 
              variant="contained" 
              color="primary"
              startIcon={<MapIcon />}
              onClick={() => history.push('/client/delivery-tracker')}
            >
              Delivery Tracker
            </Button>
          </Box>

          <TextField
            fullWidth
            margin="normal"
            label="Search deliveries"
            variant="outlined"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 3 }}
          />

          {filteredDeliveries.length === 0 ? (
            <Alert severity="info">
              No deliveries found. Book a truck to create a new delivery.
            </Alert>
          ) : (
            <TableContainer component={Paper} sx={{ mb: 3 }}>
              <Table sx={{ minWidth: 650 }} aria-label="deliveries table">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell>ID</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Delivery Date</TableCell>
                    <TableCell>Truck</TableCell>
                    <TableCell>Destination</TableCell>
                    <TableCell>Rate</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredDeliveries.map((delivery) => (
                    <TableRow 
                      key={delivery.DeliveryID}
                      sx={{ '&:hover': { backgroundColor: '#f9f9f9' } }}
                    >
                      <TableCell component="th" scope="row">
                        {delivery.DeliveryID.substring(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={delivery.DeliveryStatus} 
                          style={{ 
                            backgroundColor: getStatusColor(delivery.DeliveryStatus),
                            color: 'white'
                          }}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{formatDate(delivery.DeliveryDate)}</TableCell>
                      <TableCell>
                        {delivery.TruckPlate ? (
                          <>
                            <Typography variant="body2">
                              <strong>{delivery.TruckPlate}</strong>
                            </Typography>
                            <Typography variant="caption" display="block" color="textSecondary">
                              {delivery.TruckType || 'Unknown type'}
                            </Typography>
                          </>
                        ) : (
                          'N/A'
                        )}
                      </TableCell>
                      <TableCell>
                        {delivery.DeliveryAddress?.length > 25 
                          ? `${delivery.DeliveryAddress.substring(0, 25)}...` 
                          : delivery.DeliveryAddress || 'N/A'}
                      </TableCell>
                      <TableCell>${delivery.DeliveryRate || 'N/A'}</TableCell>
                      <TableCell align="center">
                        <IconButton 
                          color="primary" 
                          onClick={() => viewDeliveryDetails(delivery.DeliveryID)}
                          title="View details"
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <Button 
            variant="outlined" 
            color="primary" 
            onClick={() => history.push('/client/dashboard')}
          >
            Book a Truck
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default DeliveriesList; 