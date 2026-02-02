import React, { useState, useEffect, useRef } from "react";

const DeliveryMap = ({
  pickupCoordinates,
  dropoffCoordinates,
  pickupLocation,
  dropoffLocation,
}) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  // Function to initialize the map
  const initializeMap = () => {
    if (!window.google || !pickupCoordinates || !dropoffCoordinates) {
      setMapError("Map could not be loaded or coordinates are missing");
      return;
    }

    try {
      // Create pickup and dropoff LatLng objects
      const pickupLatLng = new window.google.maps.LatLng(
        pickupCoordinates.lat,
        pickupCoordinates.lng,
      );

      const dropoffLatLng = new window.google.maps.LatLng(
        dropoffCoordinates.lat,
        dropoffCoordinates.lng,
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
        title: "Pickup Location",
        label: "P",
        animation: window.google.maps.Animation.DROP,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#4CAF50",
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: "#FFFFFF",
        },
      });

      // Create dropoff marker
      const dropoffMarker = new window.google.maps.Marker({
        position: dropoffLatLng,
        map: mapInstance,
        title: "Dropoff Location",
        label: "D",
        animation: window.google.maps.Animation.DROP,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#F44336",
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: "#FFFFFF",
        },
      });

      // Store the markers in the ref
      markersRef.current = [pickupMarker, dropoffMarker];

      // Create info windows for both markers
      const pickupInfoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px;">
            <strong>Pickup Location</strong><br/>
            ${pickupLocation || "Unknown location"}
          </div>
        `,
      });

      const dropoffInfoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px;">
            <strong>Dropoff Location</strong><br/>
            ${dropoffLocation || "Unknown location"}
          </div>
        `,
      });

      // Add click listeners to markers
      pickupMarker.addListener("click", () => {
        dropoffInfoWindow.close();
        pickupInfoWindow.open(mapInstance, pickupMarker);
      });

      dropoffMarker.addListener("click", () => {
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
            strokeColor: "#2196F3",
            strokeWeight: 5,
            strokeOpacity: 0.7,
          },
        });

        directionsService.route(
          {
            origin: pickupLatLng,
            destination: dropoffLatLng,
            travelMode: window.google.maps.TravelMode.DRIVING,
          },
          (response, status) => {
            if (status === "OK") {
              directionsRenderer.setDirections(response);
            } else {
              console.warn("Directions request failed due to " + status);
              // If directions fail, just draw a straight line
              new window.google.maps.Polyline({
                path: [pickupLatLng, dropoffLatLng],
                geodesic: true,
                strokeColor: "#2196F3",
                strokeOpacity: 0.7,
                strokeWeight: 5,
                map: mapInstance,
              });
            }
          },
        );
      } else {
        // Fallback to simple polyline if DirectionsService is not available
        new window.google.maps.Polyline({
          path: [pickupLatLng, dropoffLatLng],
          geodesic: true,
          strokeColor: "#2196F3",
          strokeOpacity: 0.7,
          strokeWeight: 5,
          map: mapInstance,
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
        bounds.extend(
          new window.google.maps.LatLng(
            ne.lat() + latDiff * 0.1,
            ne.lng() + lngDiff * 0.1,
          ),
        );
        bounds.extend(
          new window.google.maps.LatLng(
            sw.lat() - latDiff * 0.1,
            sw.lng() - lngDiff * 0.1,
          ),
        );
        mapInstance.fitBounds(bounds);
      };

      padBounds();

      // Adjust zoom if it's too high
      const MAX_ZOOM = 15;
      window.google.maps.event.addListenerOnce(
        mapInstance,
        "bounds_changed",
        () => {
          if (mapInstance.getZoom() > MAX_ZOOM) {
            mapInstance.setZoom(MAX_ZOOM);
          }
        },
      );

      setMapLoaded(true);
    } catch (error) {
      console.error("Error initializing map:", error);
      setMapError("Failed to initialize the map. Please try again later.");
    }
  };

  // Initialize the map when the component mounts and the map is loaded
  useEffect(() => {
    // Safety check for coordinates
    if (!pickupCoordinates || !dropoffCoordinates) {
      setMapError("Pickup or dropoff coordinates are missing");
      return;
    }

    // If Google Maps is already loaded, initialize the map
    if (window.google && window.google.maps) {
      initializeMap();
      return;
    }

    // Otherwise, create a script to load Google Maps API
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = initializeMap;
    script.onerror = () => setMapError("Failed to load Google Maps API");
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
        markersRef.current.forEach((marker) => {
          if (marker) marker.setMap(null);
        });
      }
    };
  }, []);

  if (mapError) {
    return (
      <div className="p-4 text-center h-full flex items-center justify-center bg-white shadow-sm rounded-lg border border-red-200">
        <p className="text-red-500 font-medium">{mapError}</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={mapRef} className="h-full w-full rounded-lg" />

      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-lg">
          <p className="font-medium text-gray-600">Loading map...</p>
        </div>
      )}

      <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-md border border-gray-100 max-w-[250px]">
        <div className="flex items-center mb-2">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-2 shrink-0"></div>
          <div className="overflow-hidden">
            <span className="font-bold text-xs mr-1 text-gray-800">P:</span>
            <span className="text-xs text-gray-500 truncate block">
              {pickupLocation || "Pickup"}
            </span>
          </div>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-red-500 rounded-full mr-2 shrink-0"></div>
          <div className="overflow-hidden">
            <span className="font-bold text-xs mr-1 text-gray-800">D:</span>
            <span className="text-xs text-gray-500 truncate block">
              {dropoffLocation || "Dropoff"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryMap;
