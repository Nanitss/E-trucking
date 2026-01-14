/**
 * IsolatedMapModal.js
 * This component creates a completely isolated map component that operates outside
 * of React's DOM reconciliation to avoid "removeChild" errors.
 */

class IsolatedMapModal {
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
  }
  
  // Initialize the modal with all necessary parameters
  init(options = {}) {
    // Clear any existing modal first
    if (this.modalNode) {
      this.close();
    }
    
    this.onSelectCallback = options.onSelectCallback || (() => {});
    this.locationType = options.locationType || 'pickup';
    this.initialAddress = options.initialAddress || '';
    this.title = options.title || `Select ${this.locationType} Location`;
    
    // Create container for modal
    if (!this.modalNode) {
      this.modalNode = document.createElement('div');
      this.modalNode.className = 'isolated-map-modal';
      this.modalNode.innerHTML = `
        <div class="isolated-map-content">
          <div class="isolated-map-header">
            <h2>${this.title}</h2>
            <button type="button" class="isolated-map-close">&times;</button>
          </div>
          <div class="isolated-map-body">
            <div class="isolated-map-search">
              <input type="text" placeholder="Search for ${this.locationType} location..." class="isolated-map-input"/>
              <div class="isolated-map-search-icon">🔍</div>
            </div>
            <div class="isolated-map-container"></div>
            <div class="isolated-map-footer">
              <button type="button" class="isolated-map-confirm" disabled>Confirm ${this.locationType} Location</button>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(this.modalNode);
      
      // Cache DOM references
      this.mapNode = this.modalNode.querySelector('.isolated-map-container');
      this.searchInput = this.modalNode.querySelector('.isolated-map-input');
      this.confirmBtn = this.modalNode.querySelector('.isolated-map-confirm');
      this.closeBtn = this.modalNode.querySelector('.isolated-map-close');
      
      // Set up event listeners
      this.closeBtn.addEventListener('click', () => this.close());
      this.confirmBtn.addEventListener('click', () => this.confirmLocation());
      
      // Set initial value for search input
      if (this.initialAddress) {
        this.searchInput.value = this.initialAddress;
      }
      
      // Add styles
      this.addStyles();
    }
    
    // Initialize map
    if (window.google && window.google.maps) {
      this.initMap();
    } else {
      console.error('Google Maps API not loaded');
      this.mapNode.innerHTML = `
        <div class="isolated-map-fallback">
          <div class="isolated-map-fallback-icon">📍</div>
          <h3>Map could not be loaded</h3>
          <p>Please enter your address manually:</p>
          <input type="text" class="isolated-map-manual-input" value="${this.initialAddress}" placeholder="Enter address"/>
        </div>
      `;
      
      const manualInput = this.mapNode.querySelector('.isolated-map-manual-input');
      if (manualInput) {
        manualInput.addEventListener('input', (e) => {
          this.address = e.target.value;
          this.confirmBtn.disabled = !this.address;
        });
      }
    }
    
    return this;
  }
  
  // Add CSS styles directly to avoid external dependencies
  addStyles() {
    const styleNode = document.createElement('style');
    styleNode.textContent = `
      .isolated-map-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.5);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .isolated-map-content {
        background-color: white;
        border-radius: 8px;
        width: 90%;
        max-width: 900px;
        height: 80vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
      }
      
      .isolated-map-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 20px;
        border-bottom: 1px solid #eaeaea;
      }
      
      .isolated-map-header h2 {
        margin: 0;
        font-size: 1.25rem;
        color: #333;
      }
      
      .isolated-map-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
      }
      
      .isolated-map-body {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        padding: 20px;
        overflow: hidden;
      }
      
      .isolated-map-search {
        margin-bottom: 15px;
        position: relative;
      }
      
      .isolated-map-input {
        width: 100%;
        padding: 10px 36px 10px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        height: 40px;
      }
      
      .isolated-map-search-icon {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        color: #666;
        pointer-events: none;
      }
      
      .isolated-map-container {
        flex-grow: 1;
        min-height: 300px;
        border: 1px solid #ddd;
        border-radius: 4px;
        margin-bottom: 15px;
        position: relative;
      }
      
      .isolated-map-footer {
        display: flex;
        justify-content: flex-end;
      }
      
      .isolated-map-confirm {
        padding: 10px 16px;
        background-color: #0056b3;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      
      .isolated-map-confirm:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      
      .isolated-map-fallback {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 20px;
        text-align: center;
      }
      
      .isolated-map-fallback-icon {
        font-size: 48px;
        margin-bottom: 15px;
      }
      
      .isolated-map-manual-input {
        width: 100%;
        max-width: 300px;
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        margin-top: 10px;
      }

      /* Fix for Google's autocomplete dropdown */
      .pac-container {
        z-index: 10001 !important;
      }
    `;
    
    document.head.appendChild(styleNode);
  }
  
  // Initialize Google Maps
  initMap() {
    if (!window.google || !this.mapNode) return;
    
    // Wait for Google Maps API to be fully loaded
    const initializeMapWhenReady = () => {
      if (!window.googleMapsLoaded && !window.google?.maps) {
        console.log('⏳ Waiting for Google Maps API to load...');
        setTimeout(initializeMapWhenReady, 500);
        return;
      }
      
      try {
        console.log('🗺️ Initializing map modal with Philippines restriction...');
        
        // Philippines coordinates bounds
        const philippinesBounds = new window.google.maps.LatLngBounds(
          new window.google.maps.LatLng(4.5893, 114.0952), // Southwest (lowest lat, lowest lng)
          new window.google.maps.LatLng(21.1217, 126.6044)  // Northeast (highest lat, highest lng)
        );
        
        // Default center to Manila, Philippines
        const defaultCenter = { lat: 14.5995, lng: 120.9842 };
        
        // Create map with Philippines focus
        this.map = new window.google.maps.Map(this.mapNode, {
          center: defaultCenter,
          zoom: 6,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          zoomControl: true,
          restriction: {
            latLngBounds: philippinesBounds,
            strictBounds: true
          }
        });
        
        // Initialize geocoder
        this.geocoder = new window.google.maps.Geocoder();
        
        // Set up autocomplete with Philippines restriction
        this.autocomplete = new window.google.maps.places.Autocomplete(this.searchInput, {
          types: ['geocode', 'establishment'],
          componentRestrictions: { country: 'ph' }, // Restrict to Philippines
          bounds: philippinesBounds
        });
        this.autocomplete.bindTo('bounds', this.map);
        
        // Try geocoding initial address with Philippines bias
        if (this.initialAddress && this.initialAddress.length > 3) {
          this.geocoder.geocode({ 
            address: this.initialAddress,
            componentRestrictions: { country: 'ph' },
            bounds: philippinesBounds
          }, (results, status) => {
            if (status === 'OK' && results[0]) {
              const position = results[0].geometry.location;
              this.map.setCenter(position);
              this.map.setZoom(15);
              
              // Create marker for initial position
              this.marker = new window.google.maps.Marker({
                position: position,
                map: this.map,
                draggable: true,
                animation: window.google.maps.Animation.DROP,
                title: `${this.locationType} Location`
              });
              
              // Add drag listener to marker
              this.marker.addListener('dragend', () => {
                this.updateAddressFromLatLng(this.marker.getPosition());
              });
              
              this.address = results[0].formatted_address;
              this.confirmBtn.disabled = false;
            }
          });
        }
        
        // Set up event listeners
        this.map.addListener('click', (event) => {
          // Remove existing marker first
          if (this.marker) {
            this.marker.setMap(null);
          }
          
          // Create a new marker with animation
          this.marker = new window.google.maps.Marker({
            position: event.latLng,
            map: this.map,
            draggable: true,
            animation: window.google.maps.Animation.DROP,
            title: `${this.locationType} Location`
          });
          
          // Add drag listener to new marker
          this.marker.addListener('dragend', () => {
            this.updateAddressFromLatLng(this.marker.getPosition());
          });
          
          // Update address
          this.updateAddressFromLatLng(event.latLng);
        });
        
        this.autocomplete.addListener('place_changed', () => {
          const place = this.autocomplete.getPlace();
          
          // If no place details returned (e.g. just entered text), try geocoding with Philippines restriction
          if (!place.geometry) {
            this.geocoder.geocode({ 
              address: this.searchInput.value,
              componentRestrictions: { country: 'ph' },
              bounds: philippinesBounds
            }, (results, status) => {
              if (status === 'OK' && results[0]) {
                this.handlePlaceSelection(results[0]);
              }
            });
            return;
          }
          
          this.handlePlaceSelection(place);
        });
        
        // Also listen for enter key in search input
        this.searchInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            // Try geocoding the entered text with Philippines restriction
            if (this.searchInput.value) {
              this.geocoder.geocode({ 
                address: this.searchInput.value,
                componentRestrictions: { country: 'ph' },
                bounds: philippinesBounds
              }, (results, status) => {
                if (status === 'OK' && results[0]) {
                  this.handlePlaceSelection(results[0]);
                }
              });
            }
          }
        });
        
        console.log('✅ Map modal initialization complete');
      } catch (error) {
        console.error('❌ Error initializing map modal:', error);
        this.showFallbackInput();
      }
    };
    
    // Check if Google Maps failed to load
    if (window.googleMapsError) {
      console.error('❌ Google Maps API failed to load');
      this.showFallbackInput();
      return;
    }
    
    // Start initialization
    initializeMapWhenReady();
  }
  
  // Show fallback input when maps fail
  showFallbackInput() {
    this.mapNode.innerHTML = `
      <div class="isolated-map-fallback">
        <div class="isolated-map-fallback-icon">📍</div>
        <h3>Map Service Unavailable</h3>
        <p>Please enter your Philippines address manually:</p>
        <input type="text" class="isolated-map-manual-input" value="${this.initialAddress}" placeholder="Enter Philippines address"/>
        <small>Address will be validated for Philippines locations only</small>
      </div>
    `;
    
    const manualInput = this.mapNode.querySelector('.isolated-map-manual-input');
    if (manualInput) {
      manualInput.addEventListener('input', (e) => {
        this.address = e.target.value;
        this.confirmBtn.disabled = !this.address || this.address.length < 3;
      });
      
      // Auto-focus the input
      manualInput.focus();
      
      // Enable confirm button if there's initial address
      if (this.initialAddress) {
        this.address = this.initialAddress;
        this.confirmBtn.disabled = false;
      }
    }
  }
  
  // Handle place selection from autocomplete or geocoding
  handlePlaceSelection(place) {
    if (!place || !place.geometry) return;
    
    // Check if map is available before using it
    if (!this.map) {
      console.warn('Map not initialized, falling back to address-only mode');
      this.address = place.formatted_address;
      if (this.searchInput) {
        this.searchInput.value = place.formatted_address;
      }
      if (this.confirmBtn) {
        this.confirmBtn.disabled = false;
      }
      return;
    }
    
    try {
      if (place.geometry.viewport) {
        this.map.fitBounds(place.geometry.viewport);
      } else {
        this.map.setCenter(place.geometry.location);
        this.map.setZoom(17);
      }
      
      // Remove existing marker
      if (this.marker) {
        this.marker.setMap(null);
      }
      
      // Create new marker with animation
      this.marker = new window.google.maps.Marker({
        position: place.geometry.location,
        map: this.map,
        draggable: true,
        animation: window.google.maps.Animation.DROP,
        title: `${this.locationType} Location`
      });
      
      // Add drag listener to new marker
      this.marker.addListener('dragend', () => {
        this.updateAddressFromLatLng(this.marker.getPosition());
      });
      
      this.address = place.formatted_address;
      if (this.searchInput) {
        this.searchInput.value = place.formatted_address;
      }
      if (this.confirmBtn) {
        this.confirmBtn.disabled = false;
      }
    } catch (error) {
      console.error('Error handling place selection:', error);
      // Fallback to address-only mode
      this.address = place.formatted_address;
      if (this.searchInput) {
        this.searchInput.value = place.formatted_address;
      }
      if (this.confirmBtn) {
        this.confirmBtn.disabled = false;
      }
    }
  }
  
  // Update address from coordinates
  updateAddressFromLatLng(latLng) {
    if (!this.geocoder || !latLng) return;
    
    try {
      this.geocoder.geocode({ 
        location: latLng,
        componentRestrictions: { country: 'ph' } // Restrict to Philippines
      }, (results, status) => {
        if (status === 'OK' && results[0]) {
          this.address = results[0].formatted_address;
          if (this.searchInput) {
            this.searchInput.value = this.address;
          }
          if (this.confirmBtn) {
            this.confirmBtn.disabled = false;
          }
        }
      });
    } catch (error) {
      console.error('Error updating address from coordinates:', error);
    }
  }
  
  // Confirm selected location
  confirmLocation() {
    if (this.onSelectCallback && this.address) {
      let coordinates = null;
      
      if (this.marker && this.marker.getPosition()) {
        coordinates = {
          lat: this.marker.getPosition().lat(),
          lng: this.marker.getPosition().lng()
        };
      }
      
      this.onSelectCallback(this.address, coordinates);
      this.close();
    }
  }
  
  // Show the modal
  show() {
    if (this.modalNode) {
      this.modalNode.style.display = 'flex';
    }
    return this;
  }
  
  // Close and clean up
  close() {
    if (this.modalNode) {
      // First hide it
      this.modalNode.style.display = 'none';
      
      // Then clean up after a delay
      setTimeout(() => {
        if (this.map) {
          // Clean up Google Maps objects
          window.google.maps.event.clearInstanceListeners(this.map);
          
          if (this.marker) {
            this.marker.setMap(null);
            window.google.maps.event.clearInstanceListeners(this.marker);
          }
          
          if (this.autocomplete) {
            window.google.maps.event.clearInstanceListeners(this.autocomplete);
          }
        }
        
        // Remove from DOM completely
        try {
          if (this.modalNode.parentNode) {
            document.body.removeChild(this.modalNode);
          }
        } catch (e) {
          console.warn('Error removing modal node:', e);
        }
        
        this.modalNode = null;
        this.mapNode = null;
        this.marker = null;
        this.map = null;
        this.autocomplete = null;
      }, 300);
    }
  }
}

// Create a singleton instance
const isolatedMapModal = new IsolatedMapModal();

export default isolatedMapModal; 