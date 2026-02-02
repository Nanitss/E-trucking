import React, { useState, useEffect, useRef } from "react";
import { database } from "../../config/firebase";
import { ref, onValue, off } from "firebase/database";

const LiveMapTracker = ({ deliveryId, truckId, onClose }) => {
  console.log("🚀 LiveMapTracker component rendering", { deliveryId, truckId });

  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [pickupLocation, setPickupLocation] = useState(null);
  const [dropoffLocation, setDropoffLocation] = useState(null);
  const [rejectedGPSCount, setRejectedGPSCount] = useState(0);
  const hasInitialGPSFix = useRef(false); // Track if we've received first GPS update
  const lastValidLocation = useRef(null); // Store last valid GPS coordinates
  const rejectedGPSTimer = useRef(null);
  const animationFrame = useRef(null); // For smooth animation
  const targetPosition = useRef(null); // Where marker should move to
  const currentPosition = useRef(null); // Current animated position
  const animationStartTime = useRef(null);
  const animationDuration = 2000; // 2 seconds smooth transition
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const dropoffMarkerRef = useRef(null);
  const googleMapRef = useRef(null);
  const pathRef = useRef(null);
  const routeLineRef = useRef(null);
  const pathCoordinates = useRef([]);

  useEffect(() => {
    console.log("🗺️ LiveMapTracker mounted");

    // Add ESC key handler to close modal
    const handleEscKey = (e) => {
      if (e.key === "Escape") {
        console.log("⌨️ ESC key pressed - closing modal");
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscKey);

    // Load Google Maps script dynamically with proper async loading
    if (!window.google) {
      // Create a global callback function name
      window.initGoogleMap = () => {
        console.log("✅ Google Maps loaded via callback");
        initializeMap();
        delete window.initGoogleMap; // Cleanup
      };

      const script = document.createElement("script");
      // Add callback parameter to prevent postMessage errors and use async loading
      script.src = `https://maps.googleapis.com/maps/api/js?key=${
        import.meta.env.VITE_GOOGLE_MAPS_API_KEY
      }&callback=initGoogleMap&loading=async`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        setError(
          "Failed to load Google Maps. Please check your API key and internet connection.",
        );
        setLoading(false);
        delete window.initGoogleMap; // Cleanup on error
      };
      document.head.appendChild(script);
    } else {
      initializeMap();
    }

    // Cleanup function
    return () => {
      console.log("🗺️ LiveMapTracker unmounting");
      document.removeEventListener("keydown", handleEscKey);

      // Cancel any ongoing animation
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }

      if (window.google && window.google.maps) {
        // Cleanup markers if they exist
        if (markerRef.current) markerRef.current.setMap(null);
        if (pathRef.current) pathRef.current.setMap(null);
        if (pickupMarkerRef.current) pickupMarkerRef.current.setMap(null);
        if (dropoffMarkerRef.current) dropoffMarkerRef.current.setMap(null);
        if (routeLineRef.current) routeLineRef.current.setMap(null);
      }
    };
  }, [onClose]);

  useEffect(() => {
    // IMPORTANT: Use main GPS device (truck_12345) for ALL deliveries
    // All trucks share the same GPS hardware device
    const mainTruckId = "truck_12345";

    console.log("🚚 Original truck ID from delivery:", truckId);
    console.log("🚚 Using MAIN GPS truck ID:", mainTruckId);
    console.log("📍 All deliveries will use GPS data from truck:", mainTruckId);

    // Subscribe to MAIN truck location (not individual truck)
    const unsubscribe = subscribeToTruckLocation(mainTruckId);

    // Cleanup Firebase listener on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      const truckDataRef = ref(database, `Trucks/${mainTruckId}/data`);
      off(truckDataRef);
    };
  }, [truckId]);

  const subscribeToTruckLocation = (truckId) => {
    // Read from ESP32 hardware path: /Trucks/{truckId}/data/
    const truckDataRef = ref(database, `Trucks/${truckId}/data`);

    console.log(`📡 Subscribing to ESP32 GPS data at: Trucks/${truckId}/data`);

    const unsubscribe = onValue(
      truckDataRef,
      (snapshot) => {
        const data = snapshot.val();

        console.log("📡 Firebase snapshot received for truck:", truckId);
        console.log("📡 Raw data:", data);

        if (!data) {
          console.warn(
            "⚠️ No GPS data found at path:",
            `Trucks/${truckId}/data`,
          );
          setError(
            `No GPS data from main ESP32 device (truck_12345).\n\nAll deliveries use the shared GPS device.\n\nPlease ensure:\n1. Main ESP32 device (truck_12345) is powered on\n2. Device is connected to WiFi\n3. GPS has satellite fix (may take 2-5 minutes outdoors)\n4. Firebase path: Trucks/truck_12345/data contains GPS data`,
          );
          setLoading(false);
          return;
        }

        console.log("📍 ESP32 GPS data received:", data);
        console.log(
          "📍 RAW lat from Firebase:",
          data.lat,
          "type:",
          typeof data.lat,
        );
        console.log(
          "📍 RAW lon from Firebase:",
          data.lon,
          "type:",
          typeof data.lon,
        );

        // Check if GPS has fix
        if (data.gpsFix === false) {
          console.warn("⚠️ GPS has no satellite fix");
          setError(
            "GPS hardware has no satellite fix. Waiting for signal...\n\nThe device is connected but searching for GPS satellites. This may take a few minutes outdoors.",
          );
          setLoading(false);
          return;
        }

        // Validate latitude and longitude
        const lat = parseFloat(data.lat);
        const lng = parseFloat(data.lon);

        console.log("📍 PARSED lat:", lat, "lng:", lng);
        console.log("📍 Expected Malolos: ~14.838, ~120.870");
        console.log(
          "📍 Actual vs Expected lat diff:",
          Math.abs(lat - 14.838).toFixed(6),
          "degrees",
        );

        if (isNaN(lat) || isNaN(lng)) {
          console.error("❌ Invalid GPS coordinates:", {
            lat: data.lat,
            lng: data.lon,
          });
          setError("Invalid GPS coordinates received from device.");
          setLoading(false);
          return;
        }

        // Check if coordinates are within valid ranges
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          console.error("❌ GPS coordinates out of range:", { lat, lng });
          setError("GPS coordinates out of valid range.");
          setLoading(false);
          return;
        }

        // Validate GPS coordinates before processing
        if (!validateGPSCoordinates(lat, lng)) {
          console.warn("⚠️ GPS update rejected - using last valid location");

          // Increment rejected GPS counter
          setRejectedGPSCount((prev) => prev + 1);

          // Auto-clear warning after 3 seconds
          if (rejectedGPSTimer.current) {
            clearTimeout(rejectedGPSTimer.current);
          }
          rejectedGPSTimer.current = setTimeout(() => {
            setRejectedGPSCount(0);
          }, 3000);

          // Keep using last valid location, don't update map
          return;
        }

        // Valid GPS - clear rejected count
        setRejectedGPSCount(0);

        // Convert ESP32 format to our format
        const locationData = {
          lat: lat,
          lng: lng,
          speed: parseFloat(data.speed) || 0,
          accuracy: 10, // ESP32 doesn't provide accuracy, use default
          timestamp: new Date().toISOString(),
        };

        console.log("✅ Converted GPS data:", locationData);
        console.log("✅ GPS Fix:", data.gpsFix ? "YES" : "NO");
        console.log("✅ Speed:", locationData.speed, "km/h");

        // Store as last valid location
        lastValidLocation.current = { lat, lng };

        setLocation(locationData);
        setLastUpdate(new Date());
        setLoading(false);
        setError(null);

        // Update map if initialized
        if (googleMapRef.current && window.google) {
          updateMapLocation(locationData);
        }
      },
      (err) => {
        console.error("❌ Firebase error fetching ESP32 GPS data:", err);
        console.error("❌ Error code:", err.code);
        console.error("❌ Error message:", err.message);
        setError(
          `Failed to connect to GPS hardware:\n${err.message}\n\nPlease check Firebase Realtime Database configuration.`,
        );
        setLoading(false);
      },
    );

    // Return unsubscribe function
    return unsubscribe;
  };

  // Calculate distance between two GPS coordinates in kilometers (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  };

  // Validate GPS coordinates - reject unrealistic jumps
  const validateGPSCoordinates = (newLat, newLon) => {
    // Check if coordinates are within Philippines bounds
    const isInPhilippines =
      newLat >= 4.5 &&
      newLat <= 21.5 && // Philippines latitude range
      newLon >= 116.0 &&
      newLon <= 127.0; // Philippines longitude range

    if (!isInPhilippines) {
      console.warn("⚠️ GPS coordinates outside Philippines:", {
        lat: newLat,
        lng: newLon,
      });
      return false;
    }

    // MOBILE APP MODE: Just show truck at actual GPS location
    // Don't validate against delivery route - truck can be anywhere
    // This matches mobile app behavior where it just centers on truck
    console.log(
      `📱 Mobile app mode: Showing truck at actual GPS location regardless of delivery route`,
    );

    // If we have a previous valid location, check for unrealistic jumps
    if (lastValidLocation.current) {
      const distance = calculateDistance(
        lastValidLocation.current.lat,
        lastValidLocation.current.lng,
        newLat,
        newLon,
      );

      // Mobile mode: Allow reasonable jumps (truck can drive between cities)
      // Only reject if jump is impossibly fast (e.g., 200km)
      const maxJumpDistance = 50; // 50 km - reasonable for truck movement

      if (distance > maxJumpDistance) {
        console.warn(`❌ GPS REJECTED - Impossibly large jump!`);
        console.warn(`   Jump distance: ${distance.toFixed(2)} km`);
        console.warn(`   Max allowed: ${maxJumpDistance} km`);
        console.warn(
          `   Last valid: ${lastValidLocation.current.lat.toFixed(
            6,
          )}, ${lastValidLocation.current.lng.toFixed(6)}`,
        );
        console.warn(`   Rejected: ${newLat.toFixed(6)}, ${newLon.toFixed(6)}`);
        console.warn("⚠️ Jump too large - likely GPS error!");
        return false;
      }

      console.log(
        `✅ GPS valid - Movement: ${distance.toFixed(
          3,
        )} km from last position (mobile mode)`,
      );
    } else {
      console.log(`✅ First GPS reading - accepting as baseline`);
    }

    return true;
  };

  const geocodeAddress = async (address) => {
    if (!window.google || !address) {
      console.warn("⚠️ Geocoding skipped - no Google Maps or no address");
      return null;
    }

    console.log("🔍 Geocoding address:", address);
    const geocoder = new window.google.maps.Geocoder();

    try {
      const result = await new Promise((resolve, reject) => {
        geocoder.geocode(
          {
            address: address + ", Philippines",
            region: "PH",
          },
          (results, status) => {
            if (status === "OK" && results[0]) {
              console.log("✅ Geocoding success:", {
                input: address,
                formatted: results[0].formatted_address,
                location: {
                  lat: results[0].geometry.location.lat(),
                  lng: results[0].geometry.location.lng(),
                },
              });
              resolve(results[0].geometry.location);
            } else {
              reject(new Error("Geocoding failed: " + status));
            }
          },
        );
      });

      return {
        lat: result.lat(),
        lng: result.lng(),
      };
    } catch (err) {
      console.error("❌ Geocoding error for address:", address, err);
      return null;
    }
  };

  const initializeMap = async () => {
    if (!mapRef.current || !window.google) return;

    // Default location: Malolos (where truck GPS actually is)
    // This prevents initial Manila jump
    const defaultLocation = { lat: 14.838625, lng: 120.87088 };

    googleMapRef.current = new window.google.maps.Map(mapRef.current, {
      center: defaultLocation,
      zoom: 12,
      mapTypeId: "roadmap",
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
      zoomControl: true,
    });

    // Create truck marker
    markerRef.current = new window.google.maps.Marker({
      map: googleMapRef.current,
      position: defaultLocation,
      title: "Truck Location (Live GPS)",
      icon: {
        url: "https://maps.google.com/mapfiles/kml/shapes/truck.png",
        scaledSize: new window.google.maps.Size(40, 40),
      },
      zIndex: 1000,
    });

    // Create path polyline for truck movement history
    pathRef.current = new window.google.maps.Polyline({
      map: googleMapRef.current,
      strokeColor: "#2196F3",
      strokeOpacity: 0.8,
      strokeWeight: 4,
    });

    // Initialize delivery route from window data
    const deliveryData = window.currentDeliveryData;
    if (deliveryData) {
      console.log("📍 Initializing delivery route");
      console.log("📍 Pickup:", deliveryData.pickupLocation);
      console.log("📍 Dropoff:", deliveryData.deliveryAddress);

      // Geocode pickup location
      if (deliveryData.pickupLocation) {
        const pickupCoords = await geocodeAddress(deliveryData.pickupLocation);
        if (pickupCoords) {
          setPickupLocation(pickupCoords);

          // Create pickup marker (green)
          pickupMarkerRef.current = new window.google.maps.Marker({
            map: googleMapRef.current,
            position: pickupCoords,
            title: "Pickup Location",
            label: {
              text: "A",
              color: "white",
              fontWeight: "bold",
            },
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 12,
              fillColor: "#10B981",
              fillOpacity: 1,
              strokeColor: "white",
              strokeWeight: 2,
            },
            zIndex: 999,
          });

          // Add info window for pickup
          const pickupInfo = new window.google.maps.InfoWindow({
            content: `<div style="padding: 10px;"><strong>📍 Pickup Location</strong><br/>${deliveryData.pickupLocation}</div>`,
          });
          pickupMarkerRef.current.addListener("click", () => {
            pickupInfo.open(googleMapRef.current, pickupMarkerRef.current);
          });

          console.log("✅ Pickup marker created:", pickupCoords);
        }
      }

      // Geocode dropoff location
      if (deliveryData.deliveryAddress) {
        const dropoffCoords = await geocodeAddress(
          deliveryData.deliveryAddress,
        );
        if (dropoffCoords) {
          setDropoffLocation(dropoffCoords);

          // Create dropoff marker (red)
          dropoffMarkerRef.current = new window.google.maps.Marker({
            map: googleMapRef.current,
            position: dropoffCoords,
            title: "Dropoff Location",
            label: {
              text: "B",
              color: "white",
              fontWeight: "bold",
            },
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 12,
              fillColor: "#EF4444",
              fillOpacity: 1,
              strokeColor: "white",
              strokeWeight: 2,
            },
            zIndex: 999,
          });

          // Add info window for dropoff
          const dropoffInfo = new window.google.maps.InfoWindow({
            content: `<div style="padding: 10px;"><strong>📍 Dropoff Location</strong><br/>${deliveryData.deliveryAddress}</div>`,
          });
          dropoffMarkerRef.current.addListener("click", () => {
            dropoffInfo.open(googleMapRef.current, dropoffMarkerRef.current);
          });

          console.log("✅ Dropoff marker created:", dropoffCoords);
        }
      }

      // Create route line (dashed) connecting pickup → dropoff
      routeLineRef.current = new window.google.maps.Polyline({
        map: googleMapRef.current,
        strokeColor: "#6B7280",
        strokeOpacity: 0.6,
        strokeWeight: 2,
        path: [],
        icons: [
          {
            icon: {
              path: "M 0,-1 0,1",
              strokeOpacity: 1,
              scale: 3,
            },
            offset: "0",
            repeat: "20px",
          },
        ],
      });

      console.log("✅ Route markers created");
    }

    console.log("✅ Map initialized with delivery route");
  };

  // Smooth interpolation between GPS positions - WAZE-LIKE TRACKING
  const animateMarkerToPosition = (targetPos) => {
    if (!markerRef.current || !googleMapRef.current) return;

    // Cancel any ongoing animation
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
    }

    // Get current marker position (starting point)
    const currentMarkerPos = markerRef.current.getPosition();
    if (!currentMarkerPos) {
      // No current position, just set it directly
      markerRef.current.setPosition(targetPos);
      googleMapRef.current.setCenter(targetPos); // Center camera immediately
      currentPosition.current = targetPos;
      return;
    }

    const startPos = {
      lat: currentMarkerPos.lat(),
      lng: currentMarkerPos.lng(),
    };

    // Set target and start animation
    targetPosition.current = targetPos;
    animationStartTime.current = Date.now();

    const animate = () => {
      const elapsed = Date.now() - animationStartTime.current;
      const progress = Math.min(elapsed / animationDuration, 1); // 0 to 1

      // Easing function (ease-in-out for smooth movement)
      const easeProgress =
        progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      // Interpolate position
      const interpolatedLat =
        startPos.lat + (targetPos.lat - startPos.lat) * easeProgress;
      const interpolatedLng =
        startPos.lng + (targetPos.lng - startPos.lng) * easeProgress;

      const newPos = {
        lat: interpolatedLat,
        lng: interpolatedLng,
      };

      // Update marker position
      markerRef.current.setPosition(newPos);
      currentPosition.current = newPos;

      // 🎯 WAZE-LIKE: Camera follows truck smoothly in real-time!
      // Update map center every frame to keep truck centered
      googleMapRef.current.setCenter(newPos);

      // Continue animation if not complete
      if (progress < 1) {
        animationFrame.current = requestAnimationFrame(animate);
      } else {
        console.log("✅ Animation complete - marker at:", targetPos);
        console.log("✅ Camera locked to truck position");
        animationFrame.current = null;
      }
    };

    console.log(
      "🎬 Starting Waze-like smooth tracking from",
      startPos,
      "to",
      targetPos,
    );
    animate();
  };

  const updateMapLocation = (locationData) => {
    if (!googleMapRef.current || !markerRef.current || !window.google) return;

    const newPosition = {
      lat: locationData.lat,
      lng: locationData.lng,
    };

    console.log("📍 New GPS position received:", newPosition);

    // Animate marker to new position smoothly instead of jumping
    animateMarkerToPosition(newPosition);

    // Add to path history (blue trail showing where truck has been)
    // Only add if significantly different from last point to avoid clutter
    if (
      pathCoordinates.current.length === 0 ||
      Math.abs(
        pathCoordinates.current[pathCoordinates.current.length - 1].lat -
          newPosition.lat,
      ) > 0.0001 ||
      Math.abs(
        pathCoordinates.current[pathCoordinates.current.length - 1].lng -
          newPosition.lng,
      ) > 0.0001
    ) {
      pathCoordinates.current.push(newPosition);
      if (pathRef.current) {
        pathRef.current.setPath(pathCoordinates.current);
      }
    }

    // Update route line connecting pickup → truck → dropoff
    if (routeLineRef.current) {
      const routePath = [];
      if (pickupLocation) routePath.push(pickupLocation);
      routePath.push(newPosition); // Current truck location
      if (dropoffLocation) routePath.push(dropoffLocation);

      if (routePath.length >= 2) {
        routeLineRef.current.setPath(routePath);
      }
    }

    // 🎯 WAZE-LIKE NAVIGATION: Camera is locked to truck
    // Animation handles camera following, no need for panTo here
    if (!hasInitialGPSFix.current) {
      hasInitialGPSFix.current = true;
      console.log("📍 First GPS fix - initializing Waze-like tracking");
      googleMapRef.current.setZoom(17); // Closer zoom like Waze
    } else {
      console.log("📍 GPS update - camera locked to truck (Waze mode)");
    }

    // Update info window
    const infoContent = `
      <div style="padding: 10px;">
        <h3 style="margin: 0 0 10px 0;">🚚 Truck Location</h3>
        <p style="margin: 5px 0;"><strong>Speed:</strong> ${Math.round(
          locationData.speed * 3.6,
        )} km/h</p>
        <p style="margin: 5px 0;"><strong>Accuracy:</strong> ±${Math.round(
          locationData.accuracy,
        )}m</p>
        <p style="margin: 5px 0;"><strong>Updated:</strong> ${new Date(
          locationData.timestamp,
        ).toLocaleTimeString()}</p>
      </div>
    `;

    if (!markerRef.current.infoWindow) {
      markerRef.current.infoWindow = new window.google.maps.InfoWindow({
        content: infoContent,
      });
      markerRef.current.addListener("click", () => {
        markerRef.current.infoWindow.open(
          googleMapRef.current,
          markerRef.current,
        );
      });
    } else {
      markerRef.current.infoWindow.setContent(infoContent);
    }

    // Auto-open truck info on first update
    if (pathCoordinates.current.length === 1) {
      markerRef.current.infoWindow.open(
        googleMapRef.current,
        markerRef.current,
      );
    }
  };

  const handleCenterMap = () => {
    if (location && googleMapRef.current) {
      console.log("🎯 CENTER MAP button clicked");
      console.log("   State location (correct):", location.lat, location.lng);

      if (markerRef.current) {
        const markerPos = markerRef.current.getPosition();
        console.log("   Marker position:", markerPos?.lat(), markerPos?.lng());

        if (markerPos) {
          const stateLat = location.lat;
          const stateLng = location.lng;
          const markerLat = markerPos.lat();
          const markerLng = markerPos.lng();

          // Check if marker is in wrong position
          if (
            Math.abs(stateLat - markerLat) > 0.01 ||
            Math.abs(stateLng - markerLng) > 0.01
          ) {
            console.warn("⚠️ MARKER POSITION MISMATCH!");
            console.warn("   State says:", stateLat, stateLng);
            console.warn("   Marker is at:", markerLat, markerLng);
            console.warn("   CORRECTING marker position now...");

            // Force correct marker position
            markerRef.current.setPosition({ lat: stateLat, lng: stateLng });
          }
        }
      }

      googleMapRef.current.panTo({ lat: location.lat, lng: location.lng });
      googleMapRef.current.setZoom(17);
    }
  };

  const handleViewFullRoute = () => {
    if (!googleMapRef.current) return;

    const bounds = new window.google.maps.LatLngBounds();

    // Add all points to bounds
    if (pickupLocation) bounds.extend(pickupLocation);
    if (dropoffLocation) bounds.extend(dropoffLocation);
    if (location) bounds.extend({ lat: location.lat, lng: location.lng });

    if (!bounds.isEmpty()) {
      googleMapRef.current.fitBounds(bounds);

      // Adjust zoom if too close
      const listener = window.google.maps.event.addListener(
        googleMapRef.current,
        "idle",
        () => {
          if (googleMapRef.current.getZoom() > 14) {
            googleMapRef.current.setZoom(14);
          }
          window.google.maps.event.removeListener(listener);
        },
      );

      console.log("🗺️ Viewing full route overview");
    }
  };

  const handleOpenInGoogleMaps = () => {
    if (location) {
      const url = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
      window.open(url, "_blank");
    }
  };

  return (
    <div className="live-map-tracker-modal">
      <div className="modal-overlay" onClick={onClose}></div>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🚚 Live GPS Tracking - Delivery #{deliveryId}</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
          <div style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
            📡 Using main GPS device (truck_12345) - Shared by all deliveries
          </div>
        </div>

        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Connecting to GPS...</p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <p
              style={{
                whiteSpace: "pre-wrap",
                textAlign: "left",
                maxWidth: "600px",
                margin: "0 auto",
              }}
            >
              {error}
            </p>
            <div
              style={{
                marginTop: "20px",
                display: "flex",
                gap: "10px",
                justifyContent: "center",
              }}
            >
              <button className="btn btn-primary" onClick={onClose}>
                Close
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </button>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="map-controls">
              <div className="location-info">
                {location && (
                  <>
                    <div className="info-item">
                      <span className="label">📍 Position:</span>
                      <span className="value">
                        {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="label">🚗 Speed:</span>
                      <span className="value">
                        {Math.round(location.speed * 3.6)} km/h
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="label">⏰ Last Update:</span>
                      <span className="value">
                        {lastUpdate ? lastUpdate.toLocaleTimeString() : "Never"}
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="label">🎯 Accuracy:</span>
                      <span className="value">
                        ±{Math.round(location.accuracy)}m
                      </span>
                    </div>
                  </>
                )}
              </div>
              <div className="control-buttons">
                <button
                  className="btn btn-secondary"
                  onClick={handleViewFullRoute}
                  title="View complete delivery route"
                >
                  🗺️ Full Route
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={handleCenterMap}
                  title="Center map on truck"
                >
                  🎯 Center Truck
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleOpenInGoogleMaps}
                  title="Open in Google Maps app"
                >
                  📱 Open in Google Maps
                </button>
              </div>
            </div>

            <div className="map-container" ref={mapRef}></div>

            <div className="live-indicator">
              <span className="pulse"></span>
              <span>LIVE</span>
            </div>

            {/* GPS Quality Warning */}
            {rejectedGPSCount > 0 && (
              <div className="gps-quality-warning">
                <span className="warning-icon">⚠️</span>
                <div className="warning-text">
                  <strong>GPS Filtering Active</strong>
                  <div className="warning-detail">
                    Rejected {rejectedGPSCount} bad GPS reading
                    {rejectedGPSCount > 1 ? "s" : ""}
                  </div>
                  <div
                    className="warning-detail"
                    style={{ fontSize: "10px", marginTop: "2px" }}
                  >
                    (Showing last valid location)
                  </div>
                </div>
              </div>
            )}

            {/* Route Legend */}
            <div className="route-legend">
              <h4>🗺️ Delivery Route</h4>
              <div className="legend-item">
                <div className="legend-marker pickup">A</div>
                <span>Pickup Location</span>
              </div>
              <div className="legend-item">
                <div className="legend-marker dropoff">B</div>
                <span>Dropoff Location</span>
              </div>
              <div className="legend-item">
                <div className="legend-marker truck">🚚</div>
                <span>Truck (Live GPS)</span>
              </div>
              <div className="legend-item">
                <div className="legend-line"></div>
                <span>Planned Route</span>
              </div>
              <div className="legend-item">
                <div className="legend-trail"></div>
                <span>Truck Trail</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LiveMapTracker;
