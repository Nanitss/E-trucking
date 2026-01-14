import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FaArrowLeft } from 'react-icons/fa';
import Loader from '../../components/common/Loader';
import { AlertContext } from '../../context/AlertContext';
import StatusBadge from '../../components/common/StatusBadge';

const DeliveryAssignment = () => {
  const { showAlert } = useContext(AlertContext);
  const [deliveries, setDeliveries] = useState([]);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [availableHelpers, setAvailableHelpers] = useState([]);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [assignmentForm, setAssignmentForm] = useState({
    driverName: '',
    helperName: '',
    deliveryStatus: 'in-progress'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [deliveriesRes, driversRes, helpersRes] = await Promise.all([
        axios.get('/api/operators/pending-deliveries'),
        axios.get('/api/operators/available-drivers'),
        axios.get('/api/operators/available-helpers')
      ]);

      setDeliveries(deliveriesRes.data);
      setAvailableDrivers(driversRes.data);
      setAvailableHelpers(helpersRes.data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching assignment data:', error);
      showAlert('Error loading data', 'danger');
      setIsLoading(false);
    }
  };

  const handleDeliverySelect = (delivery) => {
    setSelectedDelivery(delivery);
    setAssignmentForm({
      driverName: delivery.DriverName || '',
      helperName: delivery.HelperName || '',
      deliveryStatus: delivery.DeliveryStatus
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAssignmentForm({
      ...assignmentForm,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedDelivery) {
      showAlert('Please select a delivery first', 'warning');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await axios.put(`/api/deliveries/${selectedDelivery.DeliveryID}`, {
        ...assignmentForm
      });
      
      showAlert('Delivery assignment updated successfully', 'success');
      fetchData();
      setSelectedDelivery(null);
    } catch (error) {
      console.error('Error updating delivery assignment:', error);
      showAlert(error.response?.data?.message || 'Error updating assignment', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Delivery Assignment Manager</h2>
          <Link to="/operator/dashboard" className="btn btn-secondary">
            <FaArrowLeft /> Back to Dashboard
          </Link>
        </div>
        
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <h3>Pending Deliveries</h3>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Client</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveries.length > 0 ? (
                      deliveries.map(delivery => (
                        <tr 
                          key={delivery.DeliveryID}
                          className={selectedDelivery?.DeliveryID === delivery.DeliveryID ? 'selected-row' : ''}
                        >
                          <td>{delivery.DeliveryID}</td>
                          <td>{delivery.ClientName}</td>
                          <td>{new Date(delivery.DeliveryDate).toLocaleDateString()}</td>
                          <td><StatusBadge status={delivery.DeliveryStatus} /></td>
                          <td>
                            <button 
                              className="btn btn-sm btn-primary"
                              onClick={() => handleDeliverySelect(delivery)}
                            >
                              Select
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="text-center">No pending deliveries found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="col-md-6">
              {selectedDelivery ? (
                <div className="assignment-form">
                  <h3>Assign Resources to Delivery #{selectedDelivery.DeliveryID}</h3>
                  <form onSubmit={handleSubmit}>
                    <div className="form-group">
                      <label className="form-label">Client</label>
                      <input
                        type="text"
                        className="form-control"
                        value={selectedDelivery.ClientName}
                        disabled
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">Delivery Address</label>
                      <textarea
                        className="form-control"
                        value={selectedDelivery.DeliveryAddress}
                        disabled
                        rows="2"
                      ></textarea>
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label" htmlFor="driverName">Assign Driver *</label>
                      <select
                        id="driverName"
                        name="driverName"
                        className="form-select"
                        value={assignmentForm.driverName}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select Driver</option>
                        {availableDrivers.map(driver => (
                          <option key={driver.DriverID} value={driver.DriverName}>
                            {driver.DriverName}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label" htmlFor="helperName">Assign Helper *</label>
                      <select
                        id="helperName"
                        name="helperName"
                        className="form-select"
                        value={assignmentForm.helperName}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select Helper</option>
                        {availableHelpers.map(helper => (
                          <option key={helper.HelperID} value={helper.HelperName}>
                            {helper.HelperName}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label" htmlFor="deliveryStatus">Status</label>
                      <select
                        id="deliveryStatus"
                        name="deliveryStatus"
                        className="form-select"
                        value={assignmentForm.deliveryStatus}
                        onChange={handleInputChange}
                      >
                        <option value="pending">Pending</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    
                    <div className="form-actions">
                      <button 
                        type="submit" 
                        className="btn btn-primary"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Saving...' : 'Update Assignment'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setSelectedDelivery(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="assignment-placeholder">
                  <h3>Delivery Assignment</h3>
                  <p>Select a delivery from the list to manage its assignment.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryAssignment;