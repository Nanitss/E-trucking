import React from 'react';
import { FaTimes } from 'react-icons/fa';
import MapPortal from './MapPortal';
import LocationPicker from './LocationPicker';
import './MapPortal.css';

const PortalLocationPicker = ({ 
  isOpen, 
  onClose, 
  onSelectLocation, 
  initialAddress = '', 
  locationType = 'pickup',
  title
}) => {
  const handleSelectLocation = (address, coordinates) => {
    if (onSelectLocation) {
      onSelectLocation(address, coordinates);
    }
  };

  return (
    <MapPortal isOpen={isOpen}>
      <div className="map-portal-content">
        <div className="map-portal-header">
          <h2>{title || `Select ${locationType === 'pickup' ? 'Pickup' : 'Dropoff'} Location`}</h2>
          <button 
            className="map-portal-close" 
            onClick={onClose}
            type="button"
          >
            <FaTimes />
          </button>
        </div>
        <div className="map-portal-body">
          <LocationPicker
            key={`location-picker-${locationType}-${Date.now()}`}
            onSelectLocation={handleSelectLocation}
            initialAddress={initialAddress}
            locationType={locationType}
          />
        </div>
      </div>
    </MapPortal>
  );
};

export default PortalLocationPicker; 