import React, { useEffect, useRef, useState, useCallback } from "react";
import { FaSearch, FaMapMarkerAlt } from "react-icons/fa";

const LocationPicker = ({
  onSelectLocation,
  initialAddress = "",
  locationType = "pickup",
}) => {
  // Essential refs
  const mapRef = useRef(null);
  const searchInputRef = useRef(null);

  // Component state
  const [address, setAddress] = useState(initialAddress);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [locationSelected, setLocationSelected] = useState(false);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);

  // Store Google objects in refs to avoid re-renders
  const googleObjectsRef = useRef({
    map: null,
    marker: null,
    autocomplete: null,
  });

  // Safe state setter that won't cause errors if component is unmounting
  const safeSetState = useCallback((setter, value) => {
    try {
      setter(value);
    } catch (error) {
      console.warn("Error setting state:", error);
    }
  }, []);

  // Initialize Google Maps
  useEffect(() => {
    // Check if Google Maps API is loaded
    if (!window.google || !window.google.maps) {
      console.warn("Google Maps API not loaded");
      return;
    }

    setGoogleMapsLoaded(true);

    // Default center coordinates
    const defaultCenter = { lat: 40.7128, lng: -74.006 };

    // If we have a previous location, try to geocode it
    if (initialAddress && initialAddress.length > 3) {
      try {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address: initialAddress }, (results, status) => {
          if (status === "OK" && results[0]) {
            const position = results[0].geometry.location;
            initMap(position);
            setLocationSelected(true);
          } else {
            initMap(defaultCenter);
          }
        });
      } catch (error) {
        console.warn("Geocoding error:", error);
        initMap(defaultCenter);
      }
    } else {
      initMap(defaultCenter);
    }

    return () => {
      // Clean up Google Maps objects
      if (googleObjectsRef.current.map) {
        try {
          window.google.maps.event.clearInstanceListeners(
            googleObjectsRef.current.map,
          );
        } catch (e) {
          console.warn("Error cleaning up map:", e);
        }
      }

      if (googleObjectsRef.current.marker) {
        try {
          googleObjectsRef.current.marker.setMap(null);
          window.google.maps.event.clearInstanceListeners(
            googleObjectsRef.current.marker,
          );
        } catch (e) {
          console.warn("Error cleaning up marker:", e);
        }
      }

      if (googleObjectsRef.current.autocomplete) {
        try {
          window.google.maps.event.clearInstanceListeners(
            googleObjectsRef.current.autocomplete,
          );
        } catch (e) {
          console.warn("Error cleaning up autocomplete:", e);
        }
      }
    };
  }, [initialAddress, safeSetState]);

  // Click outside handler for search results
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showSearchResults &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target)
      ) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSearchResults]);

  // Initialize the map
  const initMap = useCallback(
    (center) => {
      if (!mapRef.current) return;

      try {
        // Create the map
        const mapOptions = {
          center: center,
          zoom: 5,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          zoomControl: true,
        };

        // Create map instance
        const map = new window.google.maps.Map(mapRef.current, mapOptions);
        googleObjectsRef.current.map = map;

        // Create marker
        const marker = new window.google.maps.Marker({
          position: center,
          map: locationSelected ? map : null,
          draggable: true,
          animation: window.google.maps.Animation.DROP,
          title:
            locationType === "pickup" ? "Pickup Location" : "Dropoff Location",
        });
        googleObjectsRef.current.marker = marker;

        // Initialize autocomplete
        if (searchInputRef.current) {
          const autocomplete = new window.google.maps.places.Autocomplete(
            searchInputRef.current,
          );
          autocomplete.bindTo("bounds", map);
          googleObjectsRef.current.autocomplete = autocomplete;

          // Set up place_changed listener
          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            if (!place.geometry) return;

            handlePlaceSelection(place, map, marker);
          });
        }

        // Set up map click listener
        map.addListener("click", (event) => {
          // Hide any search results
          setShowSearchResults(false);

          // Show the marker
          marker.setPosition(event.latLng);
          marker.setMap(map);

          // Update location info
          setLocationSelected(true);
          updateAddressFromLatLng(event.latLng);
        });

        // Set up marker drag listener
        marker.addListener("dragend", () => {
          updateAddressFromLatLng(marker.getPosition());
        });
      } catch (error) {
        console.warn("Error initializing map:", error);
      }
    },
    [locationSelected, locationType],
  );

  // Handle place selection from autocomplete or search results
  const handlePlaceSelection = useCallback(
    (place, map, marker) => {
      if (!map || !marker) {
        map = googleObjectsRef.current.map;
        marker = googleObjectsRef.current.marker;
      }

      if (!map || !marker || !place.geometry) return;

      try {
        // Update map view
        if (place.geometry.viewport) {
          map.fitBounds(place.geometry.viewport);
        } else {
          map.setCenter(place.geometry.location);
          map.setZoom(17);
        }

        // Update marker
        marker.setPosition(place.geometry.location);
        marker.setMap(map);

        // Update state
        setLocationSelected(true);
        setAddress(place.formatted_address);
        setShowSearchResults(false);

        // Notify parent component
        if (onSelectLocation) {
          onSelectLocation(place.formatted_address, {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          });
        }
      } catch (error) {
        console.warn("Error in place selection:", error);
      }
    },
    [onSelectLocation],
  );

  // Update address from map coordinates
  const updateAddressFromLatLng = useCallback(
    (latLng) => {
      if (!window.google || !latLng) return;

      try {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: latLng }, (results, status) => {
          if (status === "OK" && results[0]) {
            const newAddress = results[0].formatted_address;
            setAddress(newAddress);

            if (onSelectLocation) {
              onSelectLocation(newAddress, {
                lat: latLng.lat(),
                lng: latLng.lng(),
              });
            }
          }
        });
      } catch (error) {
        console.warn("Error in reverse geocoding:", error);
      }
    },
    [onSelectLocation],
  );

  // Handle input changes for search
  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    setAddress(value);

    // Don't search if text is too short
    if (value.length < 3) {
      setShowSearchResults(false);
      setSearchResults([]);
      return;
    }

    // Search for places
    if (window.google?.maps?.places) {
      try {
        const service = new window.google.maps.places.AutocompleteService();
        service.getPlacePredictions({ input: value }, (predictions, status) => {
          if (
            status === window.google.maps.places.PlacesServiceStatus.OK &&
            predictions
          ) {
            setSearchResults(predictions);
            setShowSearchResults(true);
          } else {
            setSearchResults([]);
            setShowSearchResults(false);
          }
        });
      } catch (error) {
        console.warn("Error in place prediction:", error);
      }
    }
  }, []);

  // Handle search result selection
  const handleSearchResultClick = useCallback(
    (placeId) => {
      setShowSearchResults(false);

      if (!window.google?.maps?.places || !googleObjectsRef.current.map) return;

      try {
        const placesService = new window.google.maps.places.PlacesService(
          googleObjectsRef.current.map,
        );
        placesService.getDetails({ placeId: placeId }, (place, status) => {
          if (
            status === window.google.maps.places.PlacesServiceStatus.OK &&
            place
          ) {
            handlePlaceSelection(
              place,
              googleObjectsRef.current.map,
              googleObjectsRef.current.marker,
            );
          }
        });
      } catch (error) {
        console.warn("Error in place details:", error);
      }
    },
    [handlePlaceSelection],
  );

  // Confirm button handler
  const handleConfirm = useCallback(() => {
    if (onSelectLocation && address) {
      onSelectLocation(address);
    }
  }, [onSelectLocation, address]);

  // Render fallback UI when Google Maps fails to load
  const renderFallbackUI = () => (
    <div className="map-fallback">
      <div className="map-fallback-icon">
        <FaMapMarkerAlt />
      </div>
      <h3>Map could not be loaded</h3>
      <p>Please enter your address manually below:</p>
      <input
        type="text"
        className="form-control"
        value={address}
        onChange={(e) => {
          setAddress(e.target.value);
          if (onSelectLocation) {
            onSelectLocation(e.target.value);
          }
        }}
        placeholder={`Enter ${locationType} address`}
      />
    </div>
  );

  return (
    <div className="location-picker">
      <div className="search-bar">
        <input
          ref={searchInputRef}
          type="text"
          className="form-control"
          placeholder={`Search for ${locationType} location...`}
          value={address}
          onChange={handleInputChange}
          onClick={() => {
            if (searchResults.length > 0) {
              setShowSearchResults(true);
            }
          }}
        />
        <button className="search-button" type="button">
          <FaSearch />
        </button>

        {showSearchResults && searchResults.length > 0 && (
          <div className="search-results">
            {searchResults.map((result) => (
              <div
                key={result.place_id}
                className="search-result"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSearchResultClick(result.place_id);
                }}
              >
                <FaMapMarkerAlt />
                <span>{result.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div ref={mapRef} className="map-container">
        {!googleMapsLoaded && renderFallbackUI()}
        {googleMapsLoaded && !locationSelected && (
          <div className="select-location-prompt">
            <FaMapMarkerAlt />
            <p>Click on the map to select a {locationType} location</p>
          </div>
        )}
      </div>

      <div className="map-footer">
        <button
          className="btn btn-primary"
          onClick={handleConfirm}
          disabled={!locationSelected}
          type="button"
        >
          Confirm {locationType === "pickup" ? "Pickup" : "Dropoff"} Location
        </button>
      </div>
    </div>
  );
};

export default LocationPicker;
