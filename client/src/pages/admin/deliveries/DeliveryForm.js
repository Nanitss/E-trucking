import React, { useState, useEffect, useContext } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import axios from 'axios';
// Using ProtectedRoute with header navigation
import { AlertContext } from '../../../context/AlertContext';

const DeliveryForm = ({ currentUser }) => {
  const { id } = useParams();
  const history = useHistory();
  const { showAlert } = useContext(AlertContext);
  const isEditMode = Boolean(id);
  const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5007';

  const [formData, setFormData] = useState({
    deliveryDate: new Date().toISOString().split('T')[0],
    deliveryStatus: 'pending',
    deliveryAddress: '',
    deliveryDistance: '',
    deliveryRate: '',
    clientId: '',
    truckId: '',
    driverId: '',
    helperId: '',
    notes: ''
  });

  const [loading, setLoading] = useState(isEditMode);
  const [clients, setClients] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [helpers, setHelpers] = useState([]);
  const [error, setError] = useState(null);

  // Fetch delivery data if in edit mode
  useEffect(() => {
    const fetchData = async () => {
      if (isEditMode) {
        try {
          setLoading(true);
          const response = await axios.get(`${baseURL}/api/deliveries/${id}`);
          
          // Format date to YYYY-MM-DD for the date input
          const delivery = response.data;
          if (delivery.deliveryDate) {
            delivery.deliveryDate = new Date(delivery.deliveryDate).toISOString().split('T')[0];
          }
          
          setFormData({
            deliveryDate: delivery.deliveryDate || new Date().toISOString().split('T')[0],
            deliveryStatus: delivery.deliveryStatus || 'pending',
            deliveryAddress: delivery.deliveryAddress || '',
            deliveryDistance: delivery.deliveryDistance || '',
            deliveryRate: delivery.deliveryRate || '',
            clientId: delivery.clientId || '',
            truckId: delivery.truckId || '',
            driverId: delivery.driverId || '',
            helperId: delivery.helperId || '',
            notes: delivery.notes || ''
          });
          
          setLoading(false);
        } catch (err) {
          setError('Error loading delivery data');
          console.error('Error fetching delivery:', err);
          setLoading(false);
        }
      }
    };
    
    fetchData();
  }, [id, isEditMode, baseURL]);

  // Fetch clients, trucks, drivers, and helpers
  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        // Fetch clients
        const clientsResponse = await axios.get(`${baseURL}/api/clients`);
        setClients(clientsResponse.data);
        
        // Fetch available trucks
        const trucksResponse = await axios.get(`${baseURL}/api/trucks`);
        setTrucks(trucksResponse.data);
        
        // Fetch drivers
        const driversResponse = await axios.get(`${baseURL}/api/drivers`);
        setDrivers(driversResponse.data);
        
        // Fetch helpers
        const helpersResponse = await axios.get(`${baseURL}/api/helpers`);
        setHelpers(helpersResponse.data);
      } catch (err) {
        setError('Error loading reference data');
        console.error('Error fetching reference data:', err);
      }
    };
    
    fetchReferenceData();
  }, [baseURL]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (isEditMode) {
        // Update existing delivery
        await axios.put(`${baseURL}/api/deliveries/${id}`, formData);
        showAlert('Delivery updated successfully', 'success');
      } else {
        // Create new delivery
        await axios.post(`${baseURL}/api/deliveries`, formData);
        showAlert('Delivery created successfully', 'success');
      }
      
      // Redirect back to delivery list
      history.push('/admin/deliveries');
    } catch (err) {
      setError('Error saving delivery');
      console.error('Error saving delivery:', err);
      showAlert('Error saving delivery', 'danger');
    }
  };

  if (loading) {
    return <div className="loading">Loading delivery data...</div>;
  }

  return (
    <div>
      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleSubmit} className="data-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="clientId">Client</label>
            <select
              id="clientId"
              name="clientId"
              value={formData.clientId}
              onChange={handleChange}
              required
              className="form-control"
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
            <label htmlFor="deliveryDate">Delivery Date</label>
            <input
              type="date"
              id="deliveryDate"
              name="deliveryDate"
              value={formData.deliveryDate}
              onChange={handleChange}
              required
              className="form-control"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="truckId">Truck</label>
            <select
              id="truckId"
              name="truckId"
              value={formData.truckId}
              onChange={handleChange}
              required
              className="form-control"
            >
              <option value="">Select Truck</option>
              {trucks.map(truck => (
                <option key={truck.TruckID || truck.id} value={truck.TruckID || truck.id}>
                  {truck.TruckPlate} - {truck.TruckType}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="driverId">Driver</label>
            <select
              id="driverId"
              name="driverId"
              value={formData.driverId}
              onChange={handleChange}
              required
              className="form-control"
            >
              <option value="">Select Driver</option>
              {drivers.map(driver => (
                <option key={driver.DriverID || driver.id} value={driver.DriverID || driver.id}>
                  {driver.DriverName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="helperId">Helper (Optional)</label>
            <select
              id="helperId"
              name="helperId"
              value={formData.helperId}
              onChange={handleChange}
              className="form-control"
            >
              <option value="">Select Helper</option>
              {helpers.map(helper => (
                <option key={helper.HelperID || helper.id} value={helper.HelperID || helper.id}>
                  {helper.HelperName}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="deliveryStatus">Status</label>
            <select
              id="deliveryStatus"
              name="deliveryStatus"
              value={formData.deliveryStatus}
              onChange={handleChange}
              required
              className="form-control"
            >
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="in-progress">In Progress</option>
              <option value="delivered">Delivered</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="deliveryAddress">Delivery Address</label>
          <input
            type="text"
            id="deliveryAddress"
            name="deliveryAddress"
            value={formData.deliveryAddress}
            onChange={handleChange}
            required
            className="form-control"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="deliveryDistance">Distance (km)</label>
            <input
              type="number"
              id="deliveryDistance"
              name="deliveryDistance"
              value={formData.deliveryDistance}
              onChange={handleChange}
              required
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="deliveryRate">Rate</label>
            <input
              type="number"
              id="deliveryRate"
              name="deliveryRate"
              value={formData.deliveryRate}
              onChange={handleChange}
              required
              className="form-control"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="notes">Notes (Optional)</label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            className="form-control"
            rows="3"
          ></textarea>
        </div>

        <div className="form-buttons">
          <button
            type="button"
            onClick={() => history.push('/admin/deliveries')}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {isEditMode ? 'Update Delivery' : 'Create Delivery'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DeliveryForm; 