import React, { useEffect, useRef, useState, memo } from "react";

// Use React.memo to prevent unnecessary re-renders
const RouteMap = memo(
  ({
    pickupCoordinates,
    dropoffCoordinates,
    pickupAddress,
    dropoffAddress,
    onRouteCalculated, // New callback to return route information to parent
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
          console.log("✅ Google Maps API is ready");
          setGoogleMapsReady(true);
          setIsLoading(false);
          return;
        }

        if (window.googleMapsError) {
          console.error("❌ Google Maps API failed to load");
          setMapError(
            "Google Maps API failed to load. Using fallback calculation.",
          );
          setIsLoading(false);
          calculateFallbackRoute();
          return;
        }

        // Still waiting for API to load
        console.log("⏳ Waiting for Google Maps API...");
      };

      // Check immediately
      checkGoogleMapsStatus();

      // Set up event listeners for Google Maps loading
      const handleMapsLoaded = () => {
        console.log("🗺️ Google Maps loaded event received");
        setGoogleMapsReady(true);
        setIsLoading(false);
      };

      const handleMapsError = () => {
        console.error("🚨 Google Maps error event received");
        setMapError(
          "Google Maps API failed to load. Using fallback calculation.",
        );
        setIsLoading(false);
        calculateFallbackRoute();
      };

      window.addEventListener("googleMapsLoaded", handleMapsLoaded);
      window.addEventListener("googleMapsError", handleMapsError);

      // Set timeout for API loading
      timeoutId = setTimeout(() => {
        if (!googleMapsReady && !window.googleMapsLoaded) {
          console.warn("⏰ Google Maps API loading timeout");
          setMapError("Map loading timeout. Using fallback calculation.");
          setIsLoading(false);
          calculateFallbackRoute();
        }
      }, API_TIMEOUT);

      return () => {
        window.removeEventListener("googleMapsLoaded", handleMapsLoaded);
        window.removeEventListener("googleMapsError", handleMapsError);
        if (timeoutId) clearTimeout(timeoutId);
      };
    }, []);

    // Calculate fallback route when coordinates are available but maps failed
    const calculateFallbackRoute = () => {
      if (pickupCoordinates && dropoffCoordinates && onRouteCalculated) {
        console.log("📍 Calculating fallback route...");

        const distance = calculateHaversineDistance(
          pickupCoordinates.lat,
          pickupCoordinates.lng,
          dropoffCoordinates.lat,
          dropoffCoordinates.lng,
        );

        // Enhanced Philippines trucking estimates
        const avgTruckSpeed = 45; // km/h average for trucks in Philippines
        const trafficFactor = 1.3; // 30% additional time for traffic/road conditions
        const estimatedMinutes = Math.round(
          (distance / avgTruckSpeed) * 60 * trafficFactor,
        );

        const hours = Math.floor(estimatedMinutes / 60);
        const minutes = estimatedMinutes % 60;
        const durationText =
          hours > 0 ? `${hours} hr ${minutes} min` : `${minutes} min`;

        const routeDetails = {
          distanceText: `${distance} km (est.)`,
          distanceValue: distance,
          durationText: `${durationText} (est.)`,
          durationValue: estimatedMinutes,
          averageSpeed: avgTruckSpeed,
          isEstimate: true,
          fallbackUsed: true,
        };

        onRouteCalculated(routeDetails);
        setRouteInfo({
          distance: { text: routeDetails.distanceText, value: distance * 1000 },
          duration: {
            text: routeDetails.durationText,
            value: estimatedMinutes * 60,
          },
          averageSpeed: avgTruckSpeed,
          isEstimate: true,
          fallbackUsed: true,
        });
      }
    };

    // Initialize map only when Google Maps API is ready
    useEffect(() => {
      if (!googleMapsReady || mapInstanceRef.current) return;

      const initializeMap = () => {
        if (!mapRef.current) {
          if (initializationAttempts.current < MAX_RETRIES) {
            console.log(
              `🔄 Map container not ready, retry ${initializationAttempts.current + 1}/${MAX_RETRIES}`,
            );
            initializationAttempts.current++;
            setTimeout(initializeMap, 500);
          } else {
            console.error("❌ Map container never became available");
            setMapError(
              "Map container initialization failed. Using fallback calculation.",
            );
            calculateFallbackRoute();
          }
          return;
        }

        try {
          console.log("🗺️ Initializing Google Maps...");

          // Philippines coordinates bounds
          const philippinesBounds = new window.google.maps.LatLngBounds(
            new window.google.maps.LatLng(4.5893, 114.0952), // Southwest
            new window.google.maps.LatLng(21.1217, 126.6044), // Northeast
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
            gestureHandling: "cooperative",
            restriction: {
              latLngBounds: philippinesBounds,
              strictBounds: true,
            },
          });

          mapInstanceRef.current = map;

          setTimeout(() => {
            setMapReady(true);
            console.log("✅ Map initialization complete");
          }, 300);
        } catch (error) {
          console.error("❌ Error initializing map:", error);
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
        console.log("🗺️ Calculating route with Google Maps...");
        const map = mapInstanceRef.current;

        // Clean up previous route
        if (directionsRendererRef.current) {
          directionsRendererRef.current.setMap(null);
          directionsRendererRef.current = null;
        }

        // Convert coordinates to LatLng objects
        const origin = new window.google.maps.LatLng(
          pickupCoordinates.lat,
          pickupCoordinates.lng,
        );

        const destination = new window.google.maps.LatLng(
          dropoffCoordinates.lat,
          dropoffCoordinates.lng,
        );

        // Clear previous markers
        if (map.markers) {
          map.markers.forEach((marker) => marker.setMap(null));
        }
        map.markers = [];

        // Create markers for origin and destination
        const pickupMarker = new window.google.maps.Marker({
          position: origin,
          map: map,
          title: "Pickup Location",
          icon: {
            url:
              "data:image/svg+xml," +
              encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="18" fill="#4CAF50" stroke="white" stroke-width="2"/>
              <text x="20" y="26" text-anchor="middle" fill="white" font-size="16" font-weight="bold">P</text>
            </svg>
          `),
            scaledSize: new window.google.maps.Size(40, 40),
            anchor: new window.google.maps.Point(20, 20),
          },
          animation: window.google.maps.Animation.DROP,
        });

        const dropoffMarker = new window.google.maps.Marker({
          position: destination,
          map: map,
          title: "Dropoff Location",
          icon: {
            url:
              "data:image/svg+xml," +
              encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="18" fill="#f44336" stroke="white" stroke-width="2"/>
              <text x="20" y="26" text-anchor="middle" fill="white" font-size="16" font-weight="bold">D</text>
            </svg>
          `),
            scaledSize: new window.google.maps.Size(40, 40),
            anchor: new window.google.maps.Point(20, 20),
          },
          animation: window.google.maps.Animation.DROP,
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
            strokeColor: "#2196F3",
            strokeWeight: 6,
            strokeOpacity: 0.8,
          },
          suppressInfoWindows: false,
          preserveViewport: false,
        });

        directionsRendererRef.current = directionsRenderer;

        // Request shortest route
        directionsService.route(
          {
            origin: origin,
            destination: destination,
            travelMode: window.google.maps.TravelMode.DRIVING,
            provideRouteAlternatives: true,
            avoidFerries: false,
            avoidHighways: false,
            avoidTolls: false,
            optimizeWaypoints: true,
            region: "ph",
          },
          (result, status) => {
            if (
              status === window.google.maps.DirectionsStatus.OK &&
              result.routes.length > 0
            ) {
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
                googleMapsUsed: true,
              };

              if (onRouteCalculated) {
                onRouteCalculated(routeDetails);
              }

              setRouteInfo({
                distance: {
                  text: leg.distance.text,
                  value: leg.distance.value,
                },
                duration: {
                  text: leg.duration.text,
                  value: leg.duration.value,
                },
                averageSpeed: Math.round(avgSpeed),
                isShortestRoute: result.routes.length > 1,
                totalRoutes: result.routes.length,
                googleMapsUsed: true,
              });
            } else {
              console.warn("⚠️ Google Directions failed, using fallback");
              calculateFallbackRoute();
            }
          },
        );
      } catch (error) {
        console.error("❌ Error in Google Maps route calculation:", error);
        calculateFallbackRoute();
      }
    };

    // Calculate Haversine distance
    const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371; // Earth's radius in km
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
              <small>
                Using GPS-based distance calculation for Philippines routes.
              </small>
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
            📍 Please select both pickup and dropoff locations within the
            Philippines to view the shortest route.
          </div>
        </div>
      );
    }

    // Main render - either with Google Maps or fallback display
    return (
      <div className="route-map-container flex flex-col h-full w-full">
        <div className="relative w-full h-[400px] min-h-[400px] rounded-xl overflow-hidden shadow-inner border border-gray-200">
          {googleMapsReady && !mapError ? (
            <div
              className="route-map w-full h-full absolute inset-0"
              ref={mapRef}
            ></div>
          ) : (
            <div className="route-fallback-display w-full h-full bg-slate-50 flex flex-col items-center justify-center p-6">
              <div className="fallback-header text-center mb-6">
                <h4 className="text-lg font-bold text-gray-700">
                  📍 Route Preview
                </h4>
                <p className="text-sm text-gray-500">
                  Showing estimated route via GPS
                </p>
              </div>
              <div className="fallback-route w-full max-w-md bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="route-point pickup flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                    P
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {pickupAddress}
                  </span>
                </div>
                <div className="pl-4 ml-4 border-l-2 border-dashed border-gray-300 h-8"></div>
                <div className="route-point dropoff flex items-center gap-3 mt-0">
                  <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold shrink-0">
                    D
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {dropoffAddress}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {routeInfo && (
          <div className="route-details mt-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                <span>🚛</span>
                {routeInfo.googleMapsUsed
                  ? "Optimal Delivery Route"
                  : "Estimated Route"}
              </h4>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${routeInfo.googleMapsUsed ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}
              >
                {routeInfo.googleMapsUsed ? "Verified" : "Estimate"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md hover:border-blue-100">
                <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xl shrink-0">
                  <span role="img" aria-label="distance">
                    📏
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider m-0 mb-1">
                    Total Distance
                  </p>
                  <p className="text-xl font-bold text-gray-800 m-0">
                    {routeInfo.distance.text}
                  </p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md hover:border-emerald-100">
                <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shrink-0">
                  <span role="img" aria-label="time">
                    ⏱️
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider m-0 mb-1">
                    Est. Travel Time
                  </p>
                  <p className="text-xl font-bold text-gray-800 m-0">
                    {routeInfo.duration.text}
                  </p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md hover:border-purple-100">
                <div className="w-12 h-12 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-xl shrink-0">
                  <span role="img" aria-label="speed">
                    🚀
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider m-0 mb-1">
                    Avg. Speed
                  </p>
                  <p className="text-xl font-bold text-gray-800 m-0">
                    {routeInfo.averageSpeed} km/h
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {routeInfo.isEstimate && (
                <div className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100 flex items-center gap-2">
                  <span>ℹ️</span> Note: This is a GPS-based estimate pending
                  real-time traffic data.
                </div>
              )}
              {routeInfo.isShortestRoute && (
                <div className="text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100 flex items-center gap-2">
                  <span>✅</span> Smart Route System: Automatically selected the
                  shortest path from {routeInfo.totalRoutes} alternatives.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  },
);

export default RouteMap;
