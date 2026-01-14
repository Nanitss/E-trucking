import React, { useState, useEffect } from 'react';

const TruckForm = ({ truck, onSubmit, isEditMode }) => {
  const [formData, setFormData] = useState({
    TruckPlate: '',
    TruckType: 'mini truck',
    TruckCapacity: '',
    TruckBrand: 'Toyota',
    ModelYear: new Date().getFullYear(),
    TruckStatus: 'available'
  });

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

  const onChange = e => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = e => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label" htmlFor="TruckPlate">Plate Number *</label>
        <input
          type="text"
          id="TruckPlate"
          name="TruckPlate"
          className="form-control"
          value={formData.TruckPlate}
          onChange={onChange}
          required
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="TruckType">Truck Type *</label>
          <select
            id="TruckType"
            name="TruckType"
            className="form-select"
            value={formData.TruckType}
            onChange={onChange}
            required
          >
            <option value="mini truck">Mini Truck</option>
            <option value="4 wheeler">4 Wheeler</option>
            <option value="6 wheeler">6 Wheeler</option>
            <option value="8 wheeler">8 Wheeler</option>
            <option value="10 wheeler">10 Wheeler</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="TruckCapacity">Capacity (tons) *</label>
          <input
            type="number"
            id="TruckCapacity"
            name="TruckCapacity"
            className="form-control"
            value={formData.TruckCapacity}
            onChange={onChange}
            min="0.1"
            step="0.1"
            required
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="TruckBrand">Brand *</label>
          <select
            id="TruckBrand"
            name="TruckBrand"
            className="form-select"
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
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="ModelYear">Model Year</label>
          <input
            type="number"
            id="ModelYear"
            name="ModelYear"
            className="form-control"
            value={formData.ModelYear}
            onChange={onChange}
            min="1990"
            max={new Date().getFullYear() + 1}
            placeholder="e.g. 2023"
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="TruckStatus">Status</label>
        <select
          id="TruckStatus"
          name="TruckStatus"
          className="form-select"
          value={formData.TruckStatus}
          onChange={onChange}
        >
          <option value="available">Available</option>
          <option value="allocated">Allocated</option>
          <option value="in-use">In Use</option>
          <option value="on-delivery">On Delivery</option>
          <option value="maintenance">Maintenance</option>
        </select>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">
          {isEditMode ? 'Update Truck' : 'Create Truck'}
        </button>
      </div>
    </form>
  );
};

export default TruckForm;