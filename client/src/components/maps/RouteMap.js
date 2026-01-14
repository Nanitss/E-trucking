import React, { useEffect, useRef, useState, memo } from 'react';
import './RouteMap.css';

// Use React.memo to prevent unnecessary re-renders
const RouteMap = memo(({ 
  pickupCoordinates, 
  dropoffCoordinates, 
  pickupAddress, 
  dropoffAddress,
  onRouteCalculated // New callback to return route information to parent
}) => {
  const mapRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [mapError, setMapError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [googleMapsReady, setGoogleMapsReady] = useState(false);
  const initializationAttempts = useRef(0);
  const MAX_RETRIES = 5;
  const API_TIMEOUT = 10000; // 10 seconds timeout

  // Check if Google Maps API is loaded
  const isGoogleMapsLoaded = () => {
    return window.google && window.google.maps && window.googleMapsLoaded;
  };

  // Wait for Google Maps API to load
  useEffect(() => {
    let timeoutId;
    
    const checkGoogleMapsStatus = () => {
      if (window.googleMapsLoaded || isGoogleMapsLoaded()) {
        console.log('✅ Google Maps API is ready');
        setGoogleMapsReady(true);
        setIsLoading(false);
        return;
      }
      
      if (window.googleMapsError) {
        console.error('❌ Google Maps API failed to load');
        setMapError('Google Maps API failed to load. Using fallback calculation.');
        setIsLoading(false);
        calculateFallbackRoute();
        return;
      }
      
      // Still waiting for API to load
      console.log('⏳ Waiting for Google Maps API...');
    };

    // Check immediately
    checkGoogleMapsStatus();
    
    // Set up event listeners for Google Maps loading
    const handleMapsLoaded = () => {
      console.log('🗺️ Google Maps loaded event received');
      setGoogleMapsReady(true);
      setIsLoading(false);
    };
    
    const handleMapsError = () => {
      console.error('🚨 Google Maps error event received');
      setMapError('Google Maps API failed to load. Using fallback calculation.');
      setIsLoading(false);
      calculateFallbackRoute();
    };
    
    window.addEventListener('googleMapsLoaded', handleMapsLoaded);
    window.addEventListener('googleMapsError', handleMapsError);
    
    // Set timeout for API loading
    timeoutId = setTimeout(() => {
      if (!googleMapsReady && !window.googleMapsLoaded) {
        console.warn('⏰ Google Maps API loading timeout');
        setMapError('Map loading timeout. Using fallback calculation.');
        setIsLoading(false);
        calculateFallbackRoute();
      }
    }, API_TIMEOUT);
    
    return () => {
      window.removeEventListener('googleMapsLoaded', handleMapsLoaded);
      window.removeEventListener('googleMapsError', handleMapsError);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Calculate fallback route when coordinates are available but maps failed
  const calculateFallbackRoute = () => {
    if (pickupCoordinates && dropoffCoordinates && onRouteCalculated) {
      console.log('📍 Calculating fallback route...');
      
      const distance = calculateHaversineDistance(
        pickupCoordinates.lat, 
        pickupCoordinates.lng,
        dropoffCoordinates.lat,
        dropoffCoordinates.lng
      );
      
      // Enhanced Philippines trucking estimates
      const avgTruckSpeed = 45; // km/h average for trucks in Philippines
      const trafficFactor = 1.3; // 30% additional time for traffic/road conditions
      const estimatedMinutes = Math.round((distance / avgTruckSpeed) * 60 * trafficFactor);
      
      const hours = Math.floor(estimatedMinutes / 60);
      const minutes = estimatedMinutes % 60;
      const durationText = hours > 0 ? 
        `${hours} hr ${minutes} min` : 
        `${minutes} min`;
      
      const routeDetails = {
        distanceText: `${distance} km (est.)`,
        distanceValue: distance,
        durationText: `${durationText} (est.)`,
        durationValue: estimatedMinutes,
        averageSpeed: avgTruckSpeed,
        isEstimate: true,
        fallbackUsed: true
      };
      
      onRouteCalculated(routeDetails);
      setRouteInfo({
        distance: { text: routeDetails.distanceText, value: distance * 1000 },
        duration: { text: routeDetails.durationText, value: estimatedMinutes * 60 },
        averageSpeed: avgTruckSpeed,
        isEstimate: true,
        fallbackUsed: true
      });
    }
  };

  // Initialize map only when Google Maps API is ready
  useEffect(() => {
    if (!googleMapsReady || mapInstanceRef.current) return;

    const initializeMap = () => {
      if (!mapRef.current) {
        if (initializationAttempts.current < MAX_RETRIES) {
          console.log(`🔄 Map container not ready, retry ${initializationAttempts.current + 1}/${MAX_RETRIES}`);
          initializationAttempts.current++;
          setTimeout(initializeMap, 500);
        } else {
          console.error('❌ Map container never became available');
          setMapError('Map container initialization failed. Using fallback calculation.');
          calculateFallbackRoute();
        }
        return;
      }

      try {
        console.log('🗺️ Initializing Google Maps...');
        
        // Philippines coordinates bounds
        const philippinesBounds = new window.google.maps.LatLngBounds(
          new window.google.maps.LatLng(4.5893, 114.0952), // Southwest
          new window.google.maps.LatLng(21.1217, 126.6044)  // Northeast
        );
        
        // Create a map instance with Philippines restriction
        const map = new window.google.maps.Map(mapRef.current, {
          center: { lat: 14.5995, lng: 120.9842 }, // Manila, Philippines
          zoom: 6,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          zoomControl: true,
          scrollwheel: true,
          gestureHandling: 'cooperative',
          restriction: {
            latLngBounds: philippinesBounds,
            strictBounds: true
          }
        });
        
        mapInstanceRef.current = map;
        
        setTimeout(() => {
          setMapReady(true);
          console.log('✅ Map initialization complete');
        }, 300);
      } catch (error) {
        console.error('❌ Error initializing map:', error);
        setMapError(`Map initialization failed: ${error.message}`);
        calculateFallbackRoute();
      }
    };

    initializeMap();
    
    return () => {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current = null;
      }
    };
  }, [googleMapsReady]);

  // Handle coordinate changes - both for Google Maps and fallback
  useEffect(() => {
    if (!pickupCoordinates || !dropoffCoordinates) {
      return;
    }

    // If Google Maps is ready and map is initialized, use Google Maps
    if (googleMapsReady && mapInstanceRef.current && mapReady) {
      handleGoogleMapsRoute();
    } 
    // If Google Maps failed but we have coordinates, use fallback
    else if (mapError && !googleMapsReady) {
      calculateFallbackRoute();
    }
  }, [pickupCoordinates, dropoffCoordinates, mapReady, googleMapsReady]);

  // Handle Google Maps route calculation
  const handleGoogleMapsRoute = () => {
    try {
      console.log('🗺️ Calculating route with Google Maps...');
      const map = mapInstanceRef.current;

      // Clean up previous route
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
        directionsRendererRef.current = null;
      }

      // Convert coordinates to LatLng objects
      const origin = new window.google.maps.LatLng(
        pickupCoordinates.lat, 
        pickupCoordinates.lng
      );
      
      const destination = new window.google.maps.LatLng(
        dropoffCoordinates.lat, 
        dropoffCoordinates.lng
      );

      // Clear previous markers
      if (map.markers) {
        map.markers.forEach(marker => marker.setMap(null));
      }
      map.markers = [];

      // Create markers for origin and destination
      const pickupMarker = new window.google.maps.Marker({
        position: origin,
        map: map,
        title: 'Pickup Location',
        icon: {
          url: 'data:image/svg+xml,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="18" fill="#4CAF50" stroke="white" stroke-width="2"/>
              <text x="20" y="26" text-anchor="middle" fill="white" font-size="16" font-weight="bold">P</text>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(40, 40),
          anchor: new window.google.maps.Point(20, 20)
        },
        animation: window.google.maps.Animation.DROP
      });

      const dropoffMarker = new window.google.maps.Marker({
        position: destination,
        map: map,
        title: 'Dropoff Location',
        icon: {
          url: 'data:image/svg+xml,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="18" fill="#f44336" stroke="white" stroke-width="2"/>
              <text x="20" y="26" text-anchor="middle" fill="white" font-size="16" font-weight="bold">D</text>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(40, 40),
          anchor: new window.google.maps.Point(20, 20)
        },
        animation: window.google.maps.Animation.DROP
      });

      map.markers = [pickupMarker, dropoffMarker];

      // Fit bounds to show both markers
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(origin);
      bounds.extend(destination);
      map.fitBounds(bounds);

      // Create DirectionsService and DirectionsRenderer
      const directionsService = new window.google.maps.DirectionsService();
      const directionsRenderer = new window.google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#2196F3',
          strokeWeight: 6,
          strokeOpacity: 0.8
        },
        suppressInfoWindows: false,
        preserveViewport: false,
      });
      
      directionsRendererRef.current = directionsRenderer;

      // Request shortest route
      directionsService.route({
        origin: origin,
        destination: destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true,
        avoidFerries: false,
        avoidHighways: false,
        avoidTolls: false,
        optimizeWaypoints: true,
        region: 'ph'
      }, (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK && result.routes.length > 0) {
          // Find shortest route
          let shortestRoute = result.routes[0];
          let shortestDistance = result.routes[0].legs[0].distance.value;
          
          for (let i = 1; i < result.routes.length; i++) {
            const routeDistance = result.routes[i].legs[0].distance.value;
            if (routeDistance < shortestDistance) {
              shortestDistance = routeDistance;
              shortestRoute = result.routes[i];
            }
          }
          
          // Display shortest route
          const shortestResult = { ...result, routes: [shortestRoute] };
          directionsRenderer.setDirections(shortestResult);
          
          // Calculate route details
          const leg = shortestRoute.legs[0];
          const distanceKm = leg.distance.value / 1000;
          const durationHours = leg.duration.value / 3600;
          const avgSpeed = distanceKm / durationHours;
          
          const routeDetails = {
            distanceText: leg.distance.text,
            distanceValue: distanceKm,
            durationText: leg.duration.text,
            durationValue: Math.ceil(leg.duration.value / 60),
            averageSpeed: Math.round(avgSpeed),
            isShortestRoute: result.routes.length > 1,
            totalRoutes: result.routes.length,
            googleMapsUsed: true
          };
          
          if (onRouteCalculated) {
            onRouteCalculated(routeDetails);
          }
          
          setRouteInfo({
            distance: { text: leg.distance.text, value: leg.distance.value },
            duration: { text: leg.duration.text, value: leg.duration.value },
            averageSpeed: Math.round(avgSpeed),
            isShortestRoute: result.routes.length > 1,
            totalRoutes: result.routes.length,
            googleMapsUsed: true
          });
        } else {
          console.warn('⚠️ Google Directions failed, using fallback');
          calculateFallbackRoute();
        }
      });
    } catch (error) {
      console.error('❌ Error in Google Maps route calculation:', error);
      calculateFallbackRoute();
    }
  };

  // Calculate Haversine distance
  const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c * 100) / 100;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="route-map-container loading">
        <div className="route-map-loading">
          🗺️ Initializing Philippines route map...
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  // Error state with fallback information
  if (mapError && !routeInfo) {
    return (
      <div className="route-map-container">
        <div className="route-map-error">
          <div className="error-icon">⚠️</div>
          <div className="error-text">
            <h4>Map Service Unavailable</h4>
            <p>Unable to load map, but route calculation is still working.</p>
            <small>Using GPS-based distance calculation for Philippines routes.</small>
          </div>
        </div>
      </div>
    );
  }

  // Missing coordinates state
  if (!pickupCoordinates || !dropoffCoordinates) {
    return (
      <div className="route-map-container">
        <div className="route-missing-coordinates">
          📍 Please select both pickup and dropoff locations within the Philippines to view the shortest route.
        </div>
      </div>
    );
  }

  // Main render - either with Google Maps or fallback display
  return (
    <div className="route-map-container">
      {googleMapsReady && !mapError ? (
        <div className="route-map" ref={mapRef}></div>
      ) : (
        <div className="route-fallback-display">
          <div className="fallback-header">
            <h4>📍 Route Information (GPS Calculation)</h4>
            <p>Showing estimated route within Philippines</p>
          </div>
          <div className="fallback-route">
            <div className="route-point pickup">
              <span className="point-marker">P</span>
              <span className="point-address">{pickupAddress}</span>
            </div>
            <div className="route-line">
              <div className="route-arrow">→</div>
              <div className="route-distance">
                {routeInfo ? routeInfo.distance.text : 'Calculating...'}
              </div>
            </div>
            <div className="route-point dropoff">
              <span className="point-marker">D</span>
              <span className="point-address">{dropoffAddress}</span>
            </div>
          </div>
        </div>
      )}
      
      {routeInfo && (
        <div className="route-details">
          <div className="route-header">
            <h4>
              🚛 {routeInfo.googleMapsUsed ? 'Optimal' : 'Estimated'} Route 
              {routeInfo.isShortestRoute && ` (${routeInfo.totalRoutes} routes analyzed)`}
            </h4>
          </div>
          <div className="route-detail-item">
            <span className="route-detail-label">📏 Distance:</span>
            <span className="route-detail-value">{routeInfo.distance.text}</span>
          </div>
          <div className="route-detail-item">
            <span className="route-detail-label">⏱️ Travel Time:</span>
            <span className="route-detail-value">{routeInfo.duration.text}</span>
          </div>
          <div className="route-detail-item">
            <span className="route-detail-label">🚗 Avg Speed:</span>
            <span className="route-detail-value">{routeInfo.averageSpeed} km/h</span>
          </div>
          {routeInfo.isEstimate && (
            <div className="route-detail-item estimate-note">
              <em>ℹ️ GPS-based estimate for Philippines trucking conditions</em>
            </div>
          )}
          {routeInfo.isShortestRoute && (
            <div className="route-detail-item shortest-note">
              <em>✅ Shortest route automatically selected for optimal delivery</em>
            </div>
          )}
          {routeInfo.fallbackUsed && (
            <div className="route-detail-item fallback-note">
              <em>🛰️ Using GPS calculation - route is estimated for Philippines roads</em>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default RouteMap; 