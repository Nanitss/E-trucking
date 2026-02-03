/**
 * EnhancedIsolatedMapModal.js
 * Enhanced version of IsolatedMapModal with pinned locations support
 */

class EnhancedIsolatedMapModal {
  constructor() {
    this.modalNode = null;
    this.mapNode = null;
    this.marker = null;
    this.map = null;
    this.autocomplete = null;
    this.geocoder = null;
    this.onSelectCallback = null;
    this.locationType = 'pickup';
    this.initialAddress = '';
    this.savedLocations = [];
    this.selectedCoordinates = null;
    this.selectedAddress = '';
    this.usedLocationIds = new Set(); // Track locations used in other modals
    this.searchTimeout = null;
    this.searchResults = [];
    this.placesApiAvailable = false;
  }

  // Initialize the modal with all necessary parameters
  async init(options = {}) {
    // Clear any existing modal first
    if (this.modalNode) {
      this.close();
    }

    this.onSelectCallback = options.onSelectCallback || (() => { });
    this.locationType = options.locationType || 'pickup';
    this.initialAddress = options.initialAddress || '';
    this.title = options.title || `Select ${this.locationType} Location`;

    // Set used locations to prevent duplicate selection
    if (options.usedLocationIds) {
      this.usedLocationIds = new Set(options.usedLocationIds);
    } else {
      // Use global used locations
      this.usedLocationIds = new Set(EnhancedIsolatedMapModal.usedLocationIds);
    }

    // Also check for other selected location to prevent duplicate selection
    if (options.otherSelectedLocation) {
      this.otherSelectedLocation = options.otherSelectedLocation;
    }

    // Load saved locations and WAIT for them to load before creating modal
    await this.loadSavedLocations();

    // Create container for modal
    this.createModal();

    // Initialize map
    if (window.google && window.google.maps) {
      this.initMap();
    } else {
      console.error('Google Maps API not loaded');
      this.showFallbackUI();
    }

    // Automatically show the modal after initialization
    this.show();

    return this;
  }

  // Convenience method for opening the modal (wraps init with correct param mapping)
  async open(options = {}) {
    return this.init({
      onSelectCallback: options.onSelect,
      locationType: options.locationType,
      initialAddress: options.initialLocation ? '' : '',
      title: options.title,
      usedLocationIds: options.usedLocationIds,
      otherSelectedLocation: options.otherSelectedLocation
    });
  }

  async loadSavedLocations() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        this.savedLocations = [];
        return;
      }

      const response = await fetch('/api/client/pinned-locations', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.savedLocations = data.locations || [];
        console.log(`📍 Loaded ${this.savedLocations.length} saved locations`);
      } else {
        this.savedLocations = [];
      }
    } catch (error) {
      console.error('Error loading saved locations:', error);
      this.savedLocations = [];
    }
  }

  createModal() {
    this.modalNode = document.createElement('div');
    this.modalNode.className = 'enhanced-map-modal';
    this.modalNode.innerHTML = `
      <div class="enhanced-map-content">
        <div class="enhanced-map-header">
          <h2>${this.title}</h2>
          <button type="button" class="enhanced-map-close">&times;</button>
        </div>
        <div class="enhanced-map-body">
          <div class="enhanced-map-sidebar">
            <div class="saved-locations-section">
              <h3>📍 Saved Locations</h3>
              <div class="saved-locations-list">
                ${this.renderSavedLocations()}
              </div>
            </div>
          </div>
          <div class="enhanced-map-main">
            <div class="enhanced-map-search">
              <input type="text" placeholder="Search for ${this.locationType} location..." class="enhanced-map-input"/>
              <div class="enhanced-map-search-icon">🔍</div>
            </div>
            <div class="enhanced-map-container"></div>
            <div class="enhanced-map-footer">
              <div class="selected-location-info">
                <span class="selected-address">No location selected</span>
              </div>
              <button type="button" class="enhanced-map-confirm" disabled>
                Confirm ${this.locationType} Location
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.modalNode);

    // Cache DOM references
    this.mapNode = this.modalNode.querySelector('.enhanced-map-container');
    this.searchInput = this.modalNode.querySelector('.enhanced-map-input');
    this.confirmBtn = this.modalNode.querySelector('.enhanced-map-confirm');
    this.closeBtn = this.modalNode.querySelector('.enhanced-map-close');
    this.selectedAddressSpan = this.modalNode.querySelector('.selected-address');

    // Set up event listeners
    this.closeBtn.addEventListener('click', () => this.close());
    this.confirmBtn.addEventListener('click', () => this.confirmLocation());

    // Set initial value for search input
    if (this.initialAddress) {
      this.searchInput.value = this.initialAddress;
      this.selectedAddress = this.initialAddress;
      this.updateSelectedLocationInfo();
    }

    // Set up saved location click handlers
    this.setupSavedLocationHandlers();

    // Add styles
    this.addStyles();
  }

  renderSavedLocations() {
    if (this.savedLocations.length === 0) {
      return `
        <div class="no-saved-locations">
          <p>No saved locations yet</p>
          <small>Save frequently used locations for quick access</small>
        </div>
      `;
    }

    // Simple list of all locations without categories
    return this.savedLocations.map(location => {
      const isUsed = this.usedLocationIds.has(location.id);
      const isOtherSelected = this.otherSelectedLocation &&
        (location.address === this.otherSelectedLocation ||
          (location.coordinates && this.otherSelectedLocation.coordinates &&
            location.coordinates.lat === this.otherSelectedLocation.coordinates.lat &&
            location.coordinates.lng === this.otherSelectedLocation.coordinates.lng));

      const isDisabled = isUsed || isOtherSelected;
      const isCurrentlySelected = this.selectedAddress === location.address;
      const disabledClass = isDisabled ? 'disabled' : '';
      const disabledAttr = isDisabled ? 'disabled' : '';
      const opacity = isDisabled ? '0.5' : '1';

      let title = location.address || 'No address';
      if (isUsed) {
        title = 'Already selected for ' + (this.locationType === 'pickup' ? 'delivery' : 'pickup');
      } else if (isOtherSelected) {
        title = 'Already selected for ' + (this.locationType === 'pickup' ? 'delivery' : 'pickup');
      } else if (isCurrentlySelected) {
        title = 'Click again to deselect this location';
      }

      return `
        <button class="saved-location-btn ${disabledClass}" 
                data-location-id="${location.id}" 
                title="${title}"
                ${disabledAttr}
                style="opacity: ${opacity}">
          <span class="location-icon">📍</span>
          <span class="location-name">${location.name || 'Unnamed Location'}</span>
          ${isDisabled ? '<span class="used-badge">Used</span>' : ''}
        </button>
      `;
    }).join('');
  }

  setupSavedLocationHandlers() {
    const locationButtons = this.modalNode.querySelectorAll('.saved-location-btn:not(.disabled)');
    locationButtons.forEach(button => {
      const locationId = button.dataset.locationId;

      button.addEventListener('click', () => {
        const location = this.savedLocations.find(loc => loc.id === locationId);
        if (location) {
          this.selectSavedLocation(location);
        }
      });
    });
  }

  selectSavedLocation(location) {
    console.log('📍 Selected saved location:', location.name);

    // Check if this location is already selected
    const isAlreadySelected = this.selectedAddress === location.address;

    if (isAlreadySelected) {
      // Deselect the location
      this.deselectLocation();
      return;
    }

    this.selectedAddress = location.address;
    this.selectedCoordinates = location.coordinates;
    this.selectedLocationData = location; // Store full location data including contact info

    // Update search input
    this.searchInput.value = location.address;

    // Update map if available
    if (this.map && location.coordinates) {
      const position = new google.maps.LatLng(location.coordinates.lat, location.coordinates.lng);

      // Move marker
      if (this.marker) {
        this.marker.setPosition(position);
      } else {
        this.marker = new google.maps.Marker({
          position: position,
          map: this.map,
          draggable: true,
          title: location.name
        });

        this.marker.addListener('dragend', () => {
          this.handleMarkerDragEnd();
        });
      }

      // Center map
      this.map.setCenter(position);
      this.map.setZoom(16);
    }

    // Update UI
    this.updateSelectedLocationInfo();
    this.confirmBtn.disabled = false;

    // Highlight selected location
    this.modalNode.querySelectorAll('.saved-location-btn').forEach(btn => {
      btn.classList.remove('selected');
    });
    this.modalNode.querySelector(`[data-location-id="${location.id}"]`)?.classList.add('selected');
  }

  deselectLocation() {
    console.log('📍 Deselecting location');

    // Find the location that was deselected to clear it from used locations
    const deselectedLocation = this.savedLocations.find(loc =>
      loc.address === this.selectedAddress ||
      (loc.coordinates && this.selectedCoordinates &&
        loc.coordinates.lat === this.selectedCoordinates.lat &&
        loc.coordinates.lng === this.selectedCoordinates.lng)
    );

    // Clear selection
    this.selectedAddress = '';
    this.selectedCoordinates = null;
    this.selectedLocationData = null;

    // Clear search input
    if (this.searchInput) {
      this.searchInput.value = '';
    }

    // Remove marker from map
    if (this.marker) {
      this.marker.setMap(null);
      this.marker = null;
    }

    // Update UI
    this.updateSelectedLocationInfo();
    this.confirmBtn.disabled = true;

    // Remove selection highlighting
    this.modalNode.querySelectorAll('.saved-location-btn').forEach(btn => {
      btn.classList.remove('selected');
    });

    // Reset map to default view
    if (this.map) {
      const defaultCenter = { lat: 14.5995, lng: 120.9842 };
      this.map.setCenter(defaultCenter);
      this.map.setZoom(13);
    }

    // Remove this location from used locations so it becomes available again
    if (deselectedLocation) {
      EnhancedIsolatedMapModal.usedLocationIds.delete(deselectedLocation.id);
      console.log('📍 Location removed from used locations:', deselectedLocation.name);
    }

    // Refresh the modal to update the UI
    this.refreshModal();
  }

  clearSavedLocationSelection() {
    // If there was a previously selected saved location, remove it from used list
    if (this.selectedLocationData && this.selectedLocationData.id) {
      console.log('🔄 Clearing saved location selection, making it available again:', this.selectedLocationData.name);
      EnhancedIsolatedMapModal.usedLocationIds.delete(this.selectedLocationData.id);
    }

    // Clear the selected location data
    this.selectedLocationData = null;

    // Clear selection highlighting
    this.modalNode.querySelectorAll('.saved-location-btn').forEach(btn => {
      btn.classList.remove('selected');
    });

    // Refresh the UI to show the location is available again
    this.refreshModal();
  }

  refreshModal() {
    // Re-render the saved locations to update the UI
    const savedLocationsList = this.modalNode.querySelector('.saved-locations-list');
    if (savedLocationsList) {
      savedLocationsList.innerHTML = this.renderSavedLocations();
      this.setupSavedLocationHandlers();
    }
  }

  async recordLocationUsage(locationId) {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await fetch(`/api/client/pinned-locations/${locationId}/use`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Error recording location usage:', error);
    }
  }

  updateSelectedLocationInfo() {
    if (this.selectedAddress) {
      this.selectedAddressSpan.textContent = this.selectedAddress;
      this.selectedAddressSpan.classList.add('has-selection');
    } else {
      this.selectedAddressSpan.textContent = 'No location selected';
      this.selectedAddressSpan.classList.remove('has-selection');
    }
  }

  initMap() {
    // Default to Manila coordinates
    const defaultCenter = { lat: 14.5995, lng: 120.9842 };

    this.map = new google.maps.Map(this.mapNode, {
      zoom: 13,
      center: defaultCenter,
      mapTypeControl: true, // Enable map type selector
      mapTypeControlOptions: {
        style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
        position: google.maps.ControlPosition.TOP_RIGHT,
        mapTypeIds: ['roadmap', 'satellite', 'hybrid', 'terrain']
      },
      streetViewControl: true,
      streetViewControlOptions: {
        position: google.maps.ControlPosition.RIGHT_BOTTOM
      },
      fullscreenControl: true,
      fullscreenControlOptions: {
        position: google.maps.ControlPosition.RIGHT_BOTTOM
      },
      zoomControl: true,
      zoomControlOptions: {
        position: google.maps.ControlPosition.RIGHT_BOTTOM
      },
      // Enable tilt for 3D buildings
      tilt: 45,
      // Show 3D buildings and landmarks
      mapId: null, // Use default map rendering with buildings
      // No custom styling - show all POIs, businesses, malls, landmarks
      styles: []
    });

    // Try to set up autocomplete with Places API, fall back to manual search if unavailable
    try {
      if (google.maps.places && google.maps.places.Autocomplete) {
        this.autocomplete = new google.maps.places.Autocomplete(this.searchInput, {
          types: ['address'],
          componentRestrictions: { country: 'ph' }
        });

        this.autocomplete.addListener('place_changed', () => {
          this.handlePlaceChanged();
        });

        this.placesApiAvailable = true;
        console.log('✅ Places API Autocomplete enabled');
      } else {
        throw new Error('Places API not available');
      }
    } catch (error) {
      console.warn('⚠️ Places API not available, using manual search fallback:', error.message);
      this.placesApiAvailable = false;
      this.setupManualSearch();
    }

    // Add input event listener to handle manual typing
    this.searchInput.addEventListener('input', (e) => {
      // If user is typing manually, clear any selected saved location
      if (e.target.value !== this.selectedAddress) {
        this.clearSavedLocationSelection();
      }

      // If Places API is not available, trigger manual search
      if (!this.placesApiAvailable) {
        this.handleManualSearch(e.target.value);
      }
    });

    // Set up map click handler
    this.map.addListener('click', (event) => {
      this.handleMapClick(event);
    });

    // If there's an initial address, try to geocode it
    if (this.initialAddress && this.initialAddress.trim()) {
      this.geocodeAddress(this.initialAddress);
    }
  }

  setupManualSearch() {
    // Create a dropdown container for search results
    this.searchDropdown = document.createElement('div');
    this.searchDropdown.className = 'manual-search-dropdown';
    this.searchDropdown.style.display = 'none';

    // Insert after search input
    this.searchInput.parentElement.appendChild(this.searchDropdown);

    // Click outside to close dropdown
    document.addEventListener('click', (e) => {
      if (!this.searchInput.contains(e.target) && !this.searchDropdown.contains(e.target)) {
        this.searchDropdown.style.display = 'none';
      }
    });
  }

  handleManualSearch(query) {
    // Clear previous timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Hide dropdown if query is too short
    if (!query || query.trim().length < 3) {
      this.searchDropdown.style.display = 'none';
      return;
    }

    // Debounce search
    this.searchTimeout = setTimeout(() => {
      this.performGeocodingSearch(query);
    }, 500);
  }

  async performGeocodingSearch(query) {
    if (!this.geocoder) {
      this.geocoder = new google.maps.Geocoder();
    }

    try {
      // Add Philippines bias to the search
      const searchQuery = query.includes('Philippines') ? query : `${query}, Philippines`;

      this.geocoder.geocode(
        {
          address: searchQuery,
          componentRestrictions: { country: 'PH' }
        },
        (results, status) => {
          if (status === 'OK' && results && results.length > 0) {
            this.displaySearchResults(results.slice(0, 5)); // Show top 5 results
          } else {
            this.displaySearchResults([]);
          }
        }
      );
    } catch (error) {
      console.error('Geocoding search error:', error);
      this.displaySearchResults([]);
    }
  }

  displaySearchResults(results) {
    if (!this.searchDropdown) return;

    if (results.length === 0) {
      this.searchDropdown.innerHTML = '<div class="search-result-item no-results">No locations found</div>';
      this.searchDropdown.style.display = 'block';
      return;
    }

    this.searchDropdown.innerHTML = results.map((result, index) => `
      <div class="search-result-item" data-index="${index}">
        <div class="result-icon">📍</div>
        <div class="result-text">${result.formatted_address}</div>
      </div>
    `).join('');

    this.searchDropdown.style.display = 'block';

    // Add click handlers for results
    this.searchDropdown.querySelectorAll('.search-result-item').forEach((item, index) => {
      item.addEventListener('click', () => {
        this.selectSearchResult(results[index]);
      });
    });
  }

  selectSearchResult(result) {
    this.selectedCoordinates = {
      lat: result.geometry.location.lat(),
      lng: result.geometry.location.lng()
    };

    this.selectedAddress = result.formatted_address;
    this.searchInput.value = result.formatted_address;

    this.updateMapMarker(result.geometry.location);
    this.updateSelectedLocationInfo();
    this.confirmBtn.disabled = false;

    // Hide dropdown
    this.searchDropdown.style.display = 'none';

    // Clear saved location selection
    this.clearSavedLocationSelection();
  }

  handlePlaceChanged() {
    const place = this.autocomplete.getPlace();

    if (!place.geometry) {
      console.warn('Place has no geometry');
      return;
    }

    this.selectedCoordinates = {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng()
    };

    this.selectedAddress = place.formatted_address || this.searchInput.value;

    this.updateMapMarker(place.geometry.location);
    this.updateSelectedLocationInfo();
    this.confirmBtn.disabled = false;

    // Clear saved location selection
    this.clearSavedLocationSelection();
  }

  handleMapClick(event) {
    this.selectedCoordinates = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng()
    };

    this.updateMapMarker(event.latLng);
    this.reverseGeocode(event.latLng);

    // Clear saved location selection
    this.clearSavedLocationSelection();
  }

  handleMarkerDragEnd() {
    if (this.marker) {
      const position = this.marker.getPosition();
      this.selectedCoordinates = {
        lat: position.lat(),
        lng: position.lng()
      };
      this.reverseGeocode(position);

      // Clear saved location selection when marker is dragged
      this.clearSavedLocationSelection();
    }
  }

  updateMapMarker(position) {
    if (this.marker) {
      this.marker.setPosition(position);
    } else {
      this.marker = new google.maps.Marker({
        position: position,
        map: this.map,
        draggable: true
      });

      this.marker.addListener('dragend', () => {
        this.handleMarkerDragEnd();
      });
    }

    this.map.setCenter(position);
    this.map.setZoom(16);
  }

  reverseGeocode(latLng) {
    if (!this.geocoder) {
      this.geocoder = new google.maps.Geocoder();
    }

    this.geocoder.geocode({ location: latLng }, (results, status) => {
      if (status === 'OK' && results[0]) {
        this.selectedAddress = results[0].formatted_address;
        this.searchInput.value = this.selectedAddress;
        this.updateSelectedLocationInfo();
        this.confirmBtn.disabled = false;
      }
    });
  }

  geocodeAddress(address) {
    if (!this.geocoder) {
      this.geocoder = new google.maps.Geocoder();
    }

    this.geocoder.geocode({ address: address }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const location = results[0].geometry.location;
        this.selectedCoordinates = {
          lat: location.lat(),
          lng: location.lng()
        };
        this.selectedAddress = results[0].formatted_address;
        this.updateMapMarker(location);
        this.updateSelectedLocationInfo();
        this.confirmBtn.disabled = false;
      }
    });
  }

  confirmLocation() {
    if (this.selectedAddress && this.onSelectCallback) {
      console.log('📍 Confirming location:', this.selectedAddress, this.selectedCoordinates);

      // Mark this location as used only when confirming
      const selectedLocation = this.selectedLocationData || this.savedLocations.find(loc =>
        loc.address === this.selectedAddress ||
        (loc.coordinates && loc.coordinates.lat === this.selectedCoordinates.lat && loc.coordinates.lng === this.selectedCoordinates.lng)
      );

      if (selectedLocation) {
        EnhancedIsolatedMapModal.usedLocationIds.add(selectedLocation.id);
      }

      // Pass address, coordinates, and full location data (for contact info)
      this.onSelectCallback(this.selectedAddress, this.selectedCoordinates, selectedLocation);
      this.close();
    }
  }

  // Static method to mark a location as used
  static markLocationAsUsed(locationId) {
    EnhancedIsolatedMapModal.usedLocationIds.add(locationId);
  }

  // Static method to clear used locations
  static clearUsedLocations() {
    EnhancedIsolatedMapModal.usedLocationIds.clear();
  }

  // Instance method to clear used locations (for convenience)
  clearUsedLocations() {
    EnhancedIsolatedMapModal.usedLocationIds.clear();
  }

  // Static method to get used locations
  static getUsedLocations() {
    return Array.from(EnhancedIsolatedMapModal.usedLocationIds);
  }

  // Static method to get location ID by coordinates
  static getLocationIdByCoordinates(coordinates) {
    // This is a helper method that should be called after locations are loaded
    // For now, we'll return null and handle this in the calling component
    return null;
  }

  show() {
    if (this.modalNode) {
      this.modalNode.style.display = 'flex';

      // Focus search input after a short delay
      setTimeout(() => {
        if (this.searchInput) {
          this.searchInput.focus();
        }
      }, 100);
    }
    return this;
  }

  close() {
    if (this.modalNode) {
      document.body.removeChild(this.modalNode);
      this.modalNode = null;
      this.map = null;
      this.marker = null;
      this.autocomplete = null;
      this.searchDropdown = null;

      // Clear search timeout
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = null;
      }

      // Clear the other selected location reference
      this.otherSelectedLocation = null;

      // Clear selected location data
      this.selectedLocationData = null;
      this.selectedAddress = '';
      this.selectedCoordinates = null;
    }
  }

  showFallbackUI() {
    this.mapNode.innerHTML = `
      <div class="enhanced-map-fallback">
        <div class="enhanced-map-fallback-icon">📍</div>
        <h3>Map could not be loaded</h3>
        <p>Please enter your address manually or select from saved locations:</p>
        <input type="text" class="enhanced-map-manual-input" value="${this.initialAddress}" placeholder="Enter address"/>
      </div>
    `;

    const manualInput = this.mapNode.querySelector('.enhanced-map-manual-input');
    if (manualInput) {
      manualInput.addEventListener('input', (e) => {
        this.selectedAddress = e.target.value;
        this.updateSelectedLocationInfo();
        this.confirmBtn.disabled = !this.selectedAddress;
      });
    }
  }

  addStyles() {
    if (document.querySelector('#enhanced-map-modal-styles')) {
      return; // Styles already added
    }

    const styleNode = document.createElement('style');
    styleNode.id = 'enhanced-map-modal-styles';
    styleNode.textContent = `
      .enhanced-map-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.6);
        backdrop-filter: blur(4px);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      
      .enhanced-map-content {
        background-color: white;
        border-radius: 16px;
        width: 100%;
        max-width: 1200px;
        height: 85vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      }
      
      .enhanced-map-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        border-bottom: 1px solid #e2e8f0;
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      }
      
      .enhanced-map-header h2 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 700;
        color: #1e293b;
      }
      
      .enhanced-map-close {
        width: 36px;
        height: 36px;
        background: #f1f5f9;
        border: none;
        border-radius: 8px;
        font-size: 20px;
        cursor: pointer;
        color: #64748b;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
      }
      
      .enhanced-map-close:hover {
        background: #e2e8f0;
        color: #475569;
      }
      
      .enhanced-map-body {
        flex: 1;
        display: flex;
        overflow: hidden;
      }
      
      .enhanced-map-sidebar {
        width: 280px;
        border-right: 1px solid #e2e8f0;
        background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        overflow-y: auto;
        padding: 0;
      }
      
      .saved-locations-section {
        padding: 20px 16px;
      }
      
      .saved-locations-section h3 {
        margin: 0 0 20px 0;
        font-size: 1.1rem;
        font-weight: 700;
        color: #0f172a;
        text-align: center;
        padding: 14px;
        background: white;
        border-radius: 10px;
        border: 1px solid #f1f5f9;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      }
      
      .no-saved-locations {
        text-align: center;
        padding: 40px 20px;
        color: #64748b;
      }
      
      .no-saved-locations p {
        margin: 0 0 8px 0;
        font-weight: 500;
      }
      
      .no-saved-locations small {
        font-size: 0.875rem;
        color: #94a3b8;
      }
      

      
      .saved-location-btn {
        width: 100%;
        padding: 12px 16px;
        margin-bottom: 8px;
        background: white;
        border: 2px solid #e2e8f0;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 10px;
        text-align: left;
        font-family: inherit;
        position: relative;
        overflow: hidden;
      }
      
      .saved-location-btn:hover {
        border-color: #3b82f6;
        background: #f8fafc;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
      }
      
             .saved-location-btn.selected {
         border-color: #3b82f6;
         background: #eff6ff;
         box-shadow: 0 4px 16px rgba(59, 130, 246, 0.15);
         position: relative;
       }
       
       .saved-location-btn.selected::before {
         content: '';
         position: absolute;
         left: 0;
         top: 0;
         bottom: 0;
         width: 4px;
         background: #3b82f6;
       }
       
       .saved-location-btn.selected::after {
         content: '✓';
         position: absolute;
         right: 12px;
         top: 50%;
         transform: translateY(-50%);
         background: #3b82f6;
         color: white;
         width: 20px;
         height: 20px;
         border-radius: 50%;
         display: flex;
         align-items: center;
         justify-content: center;
         font-size: 12px;
         font-weight: bold;
       }
      
      .saved-location-btn.disabled {
        cursor: not-allowed;
        opacity: 0.5;
        background: #f8fafc;
        border-color: #d1d5db;
      }
      
      .saved-location-btn.disabled:hover {
        transform: none;
        box-shadow: none;
        border-color: #d1d5db;
        background: #f8fafc;
      }
      
      .used-badge {
        background: #ef4444;
        color: white;
        font-size: 0.7rem;
        padding: 2px 6px;
        border-radius: 8px;
        font-weight: 600;
        margin-left: auto;
      }
      
      .location-icon {
        font-size: 1rem;
        color: #64748b;
        flex-shrink: 0;
      }
      
      .location-name {
        font-weight: 600;
        color: #1e293b;
        font-size: 0.9rem;
        line-height: 1.2;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex: 1;
      }
      
      .enhanced-map-main {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      
      .enhanced-map-search {
        padding: 20px;
        border-bottom: 1px solid #e2e8f0;
        position: relative;
      }
      
      .manual-search-dropdown {
        position: absolute;
        top: 100%;
        left: 20px;
        right: 20px;
        background: white;
        border: 2px solid #3b82f6;
        border-top: none;
        border-radius: 0 0 8px 8px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        max-height: 300px;
        overflow-y: auto;
      }
      
      .search-result-item {
        padding: 12px 16px;
        cursor: pointer;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        align-items: center;
        gap: 12px;
        transition: background-color 0.2s ease;
      }
      
      .search-result-item:last-child {
        border-bottom: none;
      }
      
      .search-result-item:hover {
        background-color: #eff6ff;
      }
      
      .search-result-item.no-results {
        color: #64748b;
        font-style: italic;
        cursor: default;
        justify-content: center;
      }
      
      .search-result-item.no-results:hover {
        background-color: white;
      }
      
      .result-icon {
        font-size: 1.2rem;
        flex-shrink: 0;
      }
      
      .result-text {
        flex: 1;
        font-size: 0.9rem;
        color: #1e293b;
        line-height: 1.4;
      }
      
      .enhanced-map-input {
        width: 100%;
        padding: 12px 40px 12px 16px;
        border: 2px solid #e2e8f0;
        border-radius: 8px;
        font-size: 1rem;
        background: #f8fafc;
        transition: all 0.3s ease;
      }
      
      .enhanced-map-input:focus {
        outline: none;
        border-color: #3b82f6;
        background: white;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }
      
      .enhanced-map-search-icon {
        position: absolute;
        right: 32px;
        top: 50%;
        transform: translateY(-50%);
        color: #64748b;
        pointer-events: none;
      }
      
      .enhanced-map-container {
        flex: 1;
        position: relative;
        background: #f1f5f9;
      }
      
      .enhanced-map-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px;
        border-top: 1px solid #e2e8f0;
        background: #f8fafc;
      }
      
      .selected-location-info {
        flex: 1;
        margin-right: 20px;
      }
      
      .selected-address {
        font-size: 0.9rem;
        color: #64748b;
        font-style: italic;
      }
      
      .selected-address.has-selection {
        color: #374151;
        font-style: normal;
        font-weight: 500;
      }
      
      .enhanced-map-confirm {
        padding: 12px 24px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      
      .enhanced-map-confirm:disabled {
        background: #d1d5db;
        cursor: not-allowed;
        transform: none;
      }
      
      .enhanced-map-confirm:not(:disabled):hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
      }
      
      .enhanced-map-fallback {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 40px;
        text-align: center;
        color: #64748b;
      }
      
      .enhanced-map-fallback-icon {
        font-size: 4rem;
        margin-bottom: 20px;
      }
      
      .enhanced-map-fallback h3 {
        margin-bottom: 12px;
        color: #374151;
      }
      
      .enhanced-map-manual-input {
        width: 100%;
        max-width: 400px;
        padding: 12px 16px;
        border: 2px solid #e2e8f0;
        border-radius: 8px;
        font-size: 1rem;
        margin-top: 16px;
      }
      
      /* Fix for Google Maps autocomplete dropdown to appear above modal */
      .pac-container {
        z-index: 10001 !important;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        border: 1px solid #e2e8f0;
        margin-top: 4px;
      }
      
      .pac-item {
        padding: 10px 12px;
        cursor: pointer;
        border-top: 1px solid #e2e8f0;
      }
      
      .pac-item:first-child {
        border-top: none;
      }
      
      .pac-item:hover {
        background-color: #f8fafc;
      }
      
      .pac-item-selected {
        background-color: #eff6ff;
      }
      
      @media (max-width: 768px) {
        .enhanced-map-modal {
          padding: 10px;
        }
        
        .enhanced-map-content {
          height: 95vh;
        }
        
        .enhanced-map-body {
          flex-direction: column;
        }
        
        .enhanced-map-sidebar {
          width: 100%;
          max-height: 200px;
          border-right: none;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .enhanced-map-footer {
          flex-direction: column;
          gap: 12px;
        }
        
        .selected-location-info {
          margin-right: 0;
          text-align: center;
        }
      }
    `;

    document.head.appendChild(styleNode);
  }
}

// Static property to track used locations across all instances
EnhancedIsolatedMapModal.usedLocationIds = new Set();

// Create and export a singleton instance
const enhancedIsolatedMapModal = new EnhancedIsolatedMapModal();
export default enhancedIsolatedMapModal;
