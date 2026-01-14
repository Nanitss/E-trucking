import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import LocationOnIcon from '@mui/icons-material/LocationOn';

const DeliveryMap = ({ pickupCoordinates, dropoffCoordinates, pickupLocation, dropoffLocation }) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  // Function to initialize the map
  const initializeMap = () => {
    if (!window.google || !pickupCoordinates || !dropoffCoordinates) {
      setMapError('Map could not be loaded or coordinates are missing');
      return;
    }

    try {
      // Create pickup and dropoff LatLng objects
      const pickupLatLng = new window.google.maps.LatLng(
        pickupCoordinates.lat,
        pickupCoordinates.lng
      );
      
      const dropoffLatLng = new window.google.maps.LatLng(
        dropoffCoordinates.lat,
        dropoffCoordinates.lng
      );

      // Create map instance
      const mapInstance = new window.google.maps.Map(mapRef.current, {
        center: pickupLatLng, // Start centered on pickup location
        zoom: 12,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
          position: window.google.maps.ControlPosition.TOP_RIGHT,
        },
        fullscreenControl: true,
        streetViewControl: true,
        zoomControl: true,
      });

      // Store the map instance in the ref
      mapInstanceRef.current = mapInstance;

      // Create bounds to fit both markers
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(pickupLatLng);
      bounds.extend(dropoffLatLng);

      // Create pickup marker
      const pickupMarker = new window.google.maps.Marker({
        position: pickupLatLng,
        map: mapInstance,
        title: 'Pickup Location',
        label: 'P',
        animation: window.google.maps.Animation.DROP,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#4CAF50',
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: '#FFFFFF',
        }
      });

      // Create dropoff marker
      const dropoffMarker = new window.google.maps.Marker({
        position: dropoffLatLng,
        map: mapInstance,
        title: 'Dropoff Location',
        label: 'D',
        animation: window.google.maps.Animation.DROP,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#F44336',
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: '#FFFFFF',
        }
      });

      // Store the markers in the ref
      markersRef.current = [pickupMarker, dropoffMarker];

      // Create info windows for both markers
      const pickupInfoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px;">
            <strong>Pickup Location</strong><br/>
            ${pickupLocation || 'Unknown location'}
          </div>
        `
      });

      const dropoffInfoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px;">
            <strong>Dropoff Location</strong><br/>
            ${dropoffLocation || 'Unknown location'}
          </div>
        `
      });

      // Add click listeners to markers
      pickupMarker.addListener('click', () => {
        dropoffInfoWindow.close();
        pickupInfoWindow.open(mapInstance, pickupMarker);
      });

      dropoffMarker.addListener('click', () => {
        pickupInfoWindow.close();
        dropoffInfoWindow.open(mapInstance, dropoffMarker);
      });

      // Draw route between points if DirectionsService is available
      if (window.google.maps.DirectionsService) {
        const directionsService = new window.google.maps.DirectionsService();
        const directionsRenderer = new window.google.maps.DirectionsRenderer({
          map: mapInstance,
          suppressMarkers: true, // We already have our custom markers
          polylineOptions: {
            strokeColor: '#2196F3',
            strokeWeight: 5,
            strokeOpacity: 0.7
          }
        });

        directionsService.route(
          {
            origin: pickupLatLng,
            destination: dropoffLatLng,
            travelMode: window.google.maps.TravelMode.DRIVING,
          },
          (response, status) => {
            if (status === 'OK') {
              directionsRenderer.setDirections(response);
            } else {
              console.warn('Directions request failed due to ' + status);
              // If directions fail, just draw a straight line
              new window.google.maps.Polyline({
                path: [pickupLatLng, dropoffLatLng],
                geodesic: true,
                strokeColor: '#2196F3',
                strokeOpacity: 0.7,
                strokeWeight: 5,
                map: mapInstance
              });
            }
          }
        );
      } else {
        // Fallback to simple polyline if DirectionsService is not available
        new window.google.maps.Polyline({
          path: [pickupLatLng, dropoffLatLng],
          geodesic: true,
          strokeColor: '#2196F3',
          strokeOpacity: 0.7,
          strokeWeight: 5,
          map: mapInstance
        });
      }

      // Fit the map to show both markers
      mapInstance.fitBounds(bounds);

      // Add some padding to the bounds
      const padBounds = () => {
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        const latDiff = ne.lat() - sw.lat();
        const lngDiff = ne.lng() - sw.lng();
        bounds.extend(new window.google.maps.LatLng(ne.lat() + latDiff * 0.1, ne.lng() + lngDiff * 0.1));
        bounds.extend(new window.google.maps.LatLng(sw.lat() - latDiff * 0.1, sw.lng() - lngDiff * 0.1));
        mapInstance.fitBounds(bounds);
      };

      padBounds();

      // Adjust zoom if it's too high
      const MAX_ZOOM = 15;
      window.google.maps.event.addListenerOnce(mapInstance, 'bounds_changed', () => {
        if (mapInstance.getZoom() > MAX_ZOOM) {
          mapInstance.setZoom(MAX_ZOOM);
        }
      });

      setMapLoaded(true);
    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError('Failed to initialize the map. Please try again later.');
    }
  };

  // Initialize the map when the component mounts and the map is loaded
  useEffect(() => {
    // Safety check for coordinates
    if (!pickupCoordinates || !dropoffCoordinates) {
      setMapError('Pickup or dropoff coordinates are missing');
      return;
    }

    // If Google Maps is already loaded, initialize the map
    if (window.google && window.google.maps) {
      initializeMap();
      return;
    }

    // Otherwise, create a script to load Google Maps API
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = initializeMap;
    script.onerror = () => setMapError('Failed to load Google Maps API');
    document.head.appendChild(script);

    // Cleanup on unmount
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [pickupCoordinates, dropoffCoordinates]);

  // Clean up markers and map on unmount
  useEffect(() => {
    return () => {
      // Clear markers
      if (markersRef.current) {
        markersRef.current.forEach(marker => {
          if (marker) marker.setMap(null);
        });
      }
    };
  }, []);

  if (mapError) {
    return (
      <Paper elevation={2} sx={{ p: 2, textAlign: 'center', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="error">{mapError}</Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
      <Box ref={mapRef} sx={{ height: '100%', width: '100%', borderRadius: 1 }} />
      
      {!mapLoaded && (
        <Box 
          sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            borderRadius: 1
          }}
        >
          <Typography variant="body1">Loading map...</Typography>
        </Box>
      )}

      <Box 
        sx={{ 
          position: 'absolute', 
          bottom: 16, 
          left: 16, 
          backgroundColor: 'white', 
          p: 1, 
          borderRadius: 1,
          boxShadow: 1
        }}
      >
        <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
          <Box 
            sx={{ 
              width: 12, 
              height: 12, 
              backgroundColor: '#4CAF50', 
              borderRadius: '50%',
              mr: 1
            }} 
          />
          <Typography variant="body2" sx={{ mr: 1 }}>
            <strong>P:</strong> Pickup
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
            {pickupLocation?.substring(0, 30)}
            {pickupLocation?.length > 30 ? '...' : ''}
          </Typography>
        </Box>
        <Box display="flex" alignItems="center">
          <Box 
            sx={{ 
              width: 12, 
              height: 12, 
              backgroundColor: '#F44336', 
              borderRadius: '50%',
              mr: 1
            }} 
          />
          <Typography variant="body2" sx={{ mr: 1 }}>
            <strong>D:</strong> Dropoff
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
            {dropoffLocation?.substring(0, 30)}
            {dropoffLocation?.length > 30 ? '...' : ''}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default DeliveryMap; 