import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Loader from '../common/Loader';

const DeliveryForm = ({ delivery, onSubmit, isEditMode }) => {
  const [formData, setFormData] = useState({
    ClientID: '',
    DriverName: '',
    HelperName: '',
    TruckID: '',
    DeliveryDate: '',
    DeliveryStatus: 'pending',
    DeliveryDistance: '',
    DeliveryRate: '',
    DeliveryAddress: ''
  });

  const [clients, setClients] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [helpers, setHelpers] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientsRes, driversRes, helpersRes, trucksRes] = await Promise.all([
          axios.get('/api/clients'),
          axios.get('/api/drivers'),
          axios.get('/api/helpers'),
          axios.get('/api/trucks/available')
        ]);

        setClients(clientsRes.data);
        setDrivers(driversRes.data);
        setHelpers(helpersRes.data);
        setTrucks(trucksRes.data);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching form data:', error);
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (delivery && isEditMode && !isLoading) {
      // Format date for input field (YYYY-MM-DD)
      const formattedDate = delivery.DeliveryDate 
        ? new Date(delivery.DeliveryDate).toISOString().split('T')[0]
        : '';
        
      setFormData({
        ClientID: delivery.ClientID || '',
        DriverName: delivery.DriverName || '',
        HelperName: delivery.HelperName || '',
        TruckID: delivery.TruckID || '',
        DeliveryDate: formattedDate,
        DeliveryStatus: delivery.DeliveryStatus || 'pending',
        DeliveryDistance: delivery.DeliveryDistance || '',
        DeliveryRate: delivery.DeliveryRate || '',
        DeliveryAddress: delivery.DeliveryAddress || ''
      });
    }
  }, [delivery, isEditMode, isLoading]);

  const onChange = e => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = e => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="ClientID">Client *</label>
          <select
            id="ClientID"
            name="ClientID"
            className="form-select"
            value={formData.ClientID}
            onChange={onChange}
            required
            disabled={isEditMode} // Can't change client after creation
          >
            <option value="">Select Client</option>
            {clients.map(client => (
              <option key={client.ClientID} value={client.ClientID}>
                {client.ClientName}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="TruckID">Truck *</label>
          <select
            id="TruckID"
            name="TruckID"
            className="form-select"
            value={formData.TruckID}
            onChange={onChange}
            required
            disabled={isEditMode} // Can't change truck after creation
          >
            <option value="">Select Truck</option>
            {trucks.map(truck => (
              <option key={truck.TruckID} value={truck.TruckID}>
                {truck.TruckPlate} - {truck.TruckType}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="DriverName">Driver *</label>
          <select
            id="DriverName"
            name="DriverName"
            className="form-select"
            value={formData.DriverName}
            onChange={onChange}
            required
          >
            <option value="">Select Driver</option>
            {drivers.map(driver => (
              <option key={driver.DriverID} value={driver.DriverName}>
                {driver.DriverName}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="HelperName">Helper *</label>
          <select
            id="HelperName"
            name="HelperName"
            className="form-select"
            value={formData.HelperName}
            onChange={onChange}
            required
          >
            <option value="">Select Helper</option>
            {helpers.map(helper => (
              <option key={helper.HelperID} value={helper.HelperName}>
                {helper.HelperName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="DeliveryDate">Delivery Date *</label>
          <input
            type="date"
            id="DeliveryDate"
            name="DeliveryDate"
            className="form-control"
            value={formData.DeliveryDate}
            onChange={onChange}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="DeliveryStatus">Status</label>
          <select
            id="DeliveryStatus"
            name="DeliveryStatus"
            className="form-select"
            value={formData.DeliveryStatus}
            onChange={onChange}
          >
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="DeliveryDistance">Distance (km) *</label>
          <input
            type="number"
            id="DeliveryDistance"
            name="DeliveryDistance"
            className="form-control"
            value={formData.DeliveryDistance}
            onChange={onChange}
            min="0.1"
            step="0.1"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="DeliveryRate">Rate ($) *</label>
          <input
            type="number"
            id="DeliveryRate"
            name="DeliveryRate"
            className="form-control"
            value={formData.DeliveryRate}
            onChange={onChange}
            min="0.01"
            step="0.01"
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="DeliveryAddress">Delivery Address *</label>
        <textarea
          id="DeliveryAddress"
          name="DeliveryAddress"
          className="form-control"
          value={formData.DeliveryAddress}
          onChange={onChange}
          rows="3"
          required
        ></textarea>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">
          {isEditMode ? 'Update Delivery' : 'Create Delivery'}
        </button>
      </div>
    </form>
  );
};

export default DeliveryForm;