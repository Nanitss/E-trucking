import React, { useState, useEffect } from 'react';
import { 
  ModernForm, 
  FormGroup, 
  ModernInput, 
  ModernSelect, 
  FormActions, 
  ModernButton 
} from '../common/ModernForm';

/**
 * Modern Truck Form - Using Standardized Design System
 * Preserves your exact navy blue and yellow color scheme
 */
const ModernTruckForm = ({ truck, onSubmit, isEditMode, onCancel }) => {
  const [formData, setFormData] = useState({
    TruckPlate: '',
    TruckType: 'mini truck',
    TruckCapacity: '',
    TruckBrand: 'Toyota',
    ModelYear: new Date().getFullYear(),
    TruckStatus: 'available'
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (truck && isEditMode) {
      setFormData({
        TruckPlate: truck.TruckPlate || '',
        TruckType: truck.TruckType || 'mini truck',
        TruckCapacity: truck.TruckCapacity || '',
        TruckBrand: truck.TruckBrand || truck.truckBrand || 'Toyota',
        ModelYear: truck.ModelYear || truck.modelYear || new Date().getFullYear(),
        TruckStatus: truck.TruckStatus || 'available'
      });
    }
  }, [truck, isEditMode]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.TruckPlate.trim()) {
      newErrors.TruckPlate = 'Plate number is required';
    }
    
    if (!formData.TruckCapacity || formData.TruckCapacity <= 0) {
      newErrors.TruckCapacity = 'Capacity must be greater than 0';
    }
    
    if (!formData.ModelYear || formData.ModelYear < 1990 || formData.ModelYear > new Date().getFullYear() + 1) {
      newErrors.ModelYear = 'Please enter a valid model year';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <ModernForm
      title={isEditMode ? 'Edit Truck' : 'Add New Truck'}
      subtitle={isEditMode ? 'Update truck information' : 'Enter truck details to add to your fleet'}
      onSubmit={handleSubmit}
      gridColumns={2}
    >
      <FormGroup
        label="Plate Number"
        required
        error={errors.TruckPlate}
        help="Enter the vehicle's license plate number"
      >
        <ModernInput
          type="text"
          name="TruckPlate"
          value={formData.TruckPlate}
          onChange={onChange}
          placeholder="e.g. ABC-1234"
          required
          error={!!errors.TruckPlate}
        />
      </FormGroup>

      <FormGroup
        label="Truck Type"
        required
        help="Select the type of truck"
      >
        <ModernSelect
          name="TruckType"
          value={formData.TruckType}
          onChange={onChange}
          required
        >
          <option value="mini truck">Mini Truck</option>
          <option value="4 wheeler">4 Wheeler</option>
          <option value="6 wheeler">6 Wheeler</option>
          <option value="8 wheeler">8 Wheeler</option>
          <option value="10 wheeler">10 Wheeler</option>
        </ModernSelect>
      </FormGroup>

      <FormGroup
        label="Capacity (tons)"
        required
        error={errors.TruckCapacity}
        help="Enter the maximum load capacity"
      >
        <ModernInput
          type="number"
          name="TruckCapacity"
          value={formData.TruckCapacity}
          onChange={onChange}
          placeholder="e.g. 2.5"
          min="0.1"
          step="0.1"
          required
          error={!!errors.TruckCapacity}
        />
      </FormGroup>

      <FormGroup
        label="Brand"
        required
        help="Select the truck manufacturer"
      >
        <ModernSelect
          name="TruckBrand"
          value={formData.TruckBrand}
          onChange={onChange}
          required
        >
          <option value="Toyota">Toyota</option>
          <option value="Isuzu">Isuzu</option>
          <option value="Mitsubishi">Mitsubishi</option>
          <option value="Hyundai">Hyundai</option>
          <option value="Foton">Foton</option>
          <option value="Hino">Hino</option>
          <option value="Nissan">Nissan</option>
          <option value="Ford">Ford</option>
          <option value="Suzuki">Suzuki</option>
          <option value="Kia">Kia</option>
          <option value="Other">Other</option>
        </ModernSelect>
      </FormGroup>

      <FormGroup
        label="Model Year"
        error={errors.ModelYear}
        help="Enter the year the truck was manufactured"
      >
        <ModernInput
          type="number"
          name="ModelYear"
          value={formData.ModelYear}
          onChange={onChange}
          placeholder="e.g. 2023"
          min="1990"
          max={new Date().getFullYear() + 1}
          error={!!errors.ModelYear}
        />
      </FormGroup>

      <FormGroup
        label="Status"
        help="Current operational status of the truck"
      >
        <ModernSelect
          name="TruckStatus"
          value={formData.TruckStatus}
          onChange={onChange}
        >
          <option value="available">Available</option>
          <option value="allocated">Allocated</option>
          <option value="in-use">In Use</option>
          <option value="on-delivery">On Delivery</option>
          <option value="maintenance">Maintenance</option>
        </ModernSelect>
      </FormGroup>

      <FormActions>
        <ModernButton
          type="button"
          variant="secondary"
          onClick={handleCancel}
        >
          Cancel
        </ModernButton>
        <ModernButton
          type="submit"
          variant="primary"
        >
          {isEditMode ? 'Update Truck' : 'Create Truck'}
        </ModernButton>
      </FormActions>
    </ModernForm>
  );
};

export default ModernTruckForm;
