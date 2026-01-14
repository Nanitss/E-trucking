import React, { useState, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, Grid, Typography, Button, Box, Chip, LinearProgress, Paper } from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import MapIcon from '@mui/icons-material/Map';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ScheduleIcon from '@mui/icons-material/Schedule';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import LoadingComponent from '../../components/common/LoadingComponent';
import ErrorComponent from '../../components/common/ErrorComponent';

// Map component for displaying delivery route
import DeliveryMap from '../../components/maps/DeliveryMap';

const DeliveryDetails = () => {
  const { id } = useParams();
  const history = useHistory();
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    const fetchDelivery = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          setError('Authentication token missing. Please login again.');
          setLoading(false);
          return;
        }
        
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const response = await axios.get(`/api/clients/deliveries/${id}`);
        setDelivery(response.data);
      } catch (error) {
        console.error('Error fetching delivery details:', error);
        setError(error.response?.data?.message || 'Failed to load delivery details');
      } finally {
        setLoading(false);
      }
    };

    fetchDelivery();
  }, [id]);

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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const toggleMap = () => {
    setShowMap(!showMap);
  };

  if (loading) return <LoadingComponent />;
  if (error) return <ErrorComponent message={error} />;
  if (!delivery) return <ErrorComponent message="Delivery not found" />;

  return (
    <Box sx={{ p: 3 }}>
      <Button 
        variant="outlined" 
        onClick={() => history.push('/client/deliveries')}
        sx={{ mb: 3 }}
      >
        Back to Deliveries
      </Button>
      
      <Card elevation={3}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5" component="h1">
              Delivery Details
            </Typography>
            <Chip 
              label={delivery.DeliveryStatus} 
              style={{ 
                backgroundColor: getStatusColor(delivery.DeliveryStatus),
                color: 'white'
              }}
            />
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  <LocalShippingIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Truck Information
                </Typography>
                <Typography variant="body1">
                  <strong>Truck ID:</strong> {delivery.TruckID}
                </Typography>
                <Typography variant="body1">
                  <strong>Truck Plate:</strong> {delivery.TruckPlate || 'N/A'}
                </Typography>
                <Typography variant="body1">
                  <strong>Truck Type:</strong> {delivery.TruckType || 'N/A'}
                </Typography>
                {delivery.DriverName && (
                  <Typography variant="body1">
                    <strong>Driver:</strong> {delivery.DriverName}
                  </Typography>
                )}
                {delivery.HelperName && (
                  <Typography variant="body1">
                    <strong>Helper:</strong> {delivery.HelperName}
                  </Typography>
                )}
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  <ScheduleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Delivery Schedule
                </Typography>
                <Typography variant="body1">
                  <strong>Scheduled For:</strong> {formatDate(delivery.DeliveryDate)}
                </Typography>
                <Typography variant="body1">
                  <strong>Estimated Distance:</strong> {delivery.DeliveryDistance ? `${delivery.DeliveryDistance} km` : 'N/A'}
                </Typography>
                <Typography variant="body1">
                  <strong>Estimated Duration:</strong> {delivery.EstimatedDuration ? `${delivery.EstimatedDuration} minutes` : 'N/A'}
                </Typography>
                <Typography variant="body1">
                  <strong>Delivery Rate:</strong> ${delivery.DeliveryRate || 'N/A'}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6" gutterBottom>
                    <LocationOnIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Location Information
                  </Typography>
                  <Button 
                    variant="contained" 
                    startIcon={<MapIcon />}
                    onClick={toggleMap}
                  >
                    {showMap ? 'Hide Map' : 'Show Map'}
                  </Button>
                </Box>
                <Typography variant="body1">
                  <strong>Pickup Location:</strong> {delivery.PickupLocation || 'N/A'}
                </Typography>
                <Typography variant="body1">
                  <strong>Delivery Address:</strong> {delivery.DeliveryAddress || 'N/A'}
                </Typography>
                
                {showMap && (
                  <Box mt={2} height={400} width="100%">
                    <DeliveryMap 
                      pickupCoordinates={delivery.pickupCoordinates || delivery.PickupCoordinates}
                      dropoffCoordinates={delivery.dropoffCoordinates || delivery.DropoffCoordinates}
                      pickupLocation={delivery.PickupLocation}
                      dropoffLocation={delivery.DeliveryAddress}
                    />
                  </Box>
                )}
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  <MonetizationOnIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Delivery Progress
                </Typography>
                
                {(() => {
                  let progress = 0;
                  let statusText = '';
                  
                  switch(delivery.DeliveryStatus) {
                    case 'pending':
                      progress = 25;
                      statusText = 'Your delivery is scheduled and pending pickup';
                      break;
                    case 'in-progress':
                      progress = 75;
                      statusText = 'Your delivery is currently in transit';
                      break;
                    case 'completed':
                      progress = 100;
                      statusText = 'Your delivery has been completed successfully';
                      break;
                    case 'cancelled':
                      progress = 0;
                      statusText = 'This delivery has been cancelled';
                      break;
                    default:
                      progress = 0;
                      statusText = 'Unknown status';
                  }
                  
                  return (
                    <>
                      <LinearProgress 
                        variant="determinate" 
                        value={progress} 
                        sx={{ 
                          height: 10, 
                          borderRadius: 5,
                          mb: 1,
                          backgroundColor: delivery.DeliveryStatus === 'cancelled' ? '#ffcdd2' : undefined,
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: getStatusColor(delivery.DeliveryStatus)
                          }
                        }}
                      />
                      <Typography variant="body1">{statusText}</Typography>
                    </>
                  );
                })()}
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default DeliveryDetails; 