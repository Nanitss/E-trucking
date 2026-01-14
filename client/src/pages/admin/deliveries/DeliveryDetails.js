import React, { useState, useEffect, useContext } from 'react';
import { useParams, useHistory, Link } from 'react-router-dom';
import axios from 'axios';
import { FaArrowLeft } from 'react-icons/fa';
import DeliveryForm from '../../../components/forms/DeliveryForm';
import Loader from '../../../components/common/Loader';
// Using ProtectedRoute with header navigation
import { AlertContext } from '../../../context/AlertContext';

const DeliveryDetails = ({ currentUser }) => {
  const { id } = useParams();
  const history = useHistory();
  const { showAlert } = useContext(AlertContext);
  const [delivery, setDelivery] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isNewDelivery = id === 'new';

  useEffect(() => {
    if (!isNewDelivery) {
      fetchDelivery();
    } else {
      setIsLoading(false);
    }
  }, [id, isNewDelivery]);

  const fetchDelivery = async () => {
    try {
      const res = await axios.get(`/api/deliveries/${id}`);
      setDelivery(res.data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching delivery details:', error);
      showAlert('Error loading delivery details', 'danger');
      setIsLoading(false);
    }
  };

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    
    try {
      if (isNewDelivery) {
        await axios.post('/api/deliveries', formData);
        showAlert('Delivery created successfully', 'success');
        history.push('/admin/deliveries');
      } else {
        await axios.put(`/api/deliveries/${id}`, formData);
        showAlert('Delivery updated successfully', 'success');
        history.push('/admin/deliveries');
      }
    } catch (error) {
      console.error('Error saving delivery:', error);
      showAlert(error.response?.data?.message || 'Error saving delivery', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="card">
      <div className="card-header">
          <div className="flex items-center justify-between">
            <h2 className="card-title">{isNewDelivery ? 'Create New Delivery' : 'Edit Delivery'}</h2>
            <Link to="/admin/deliveries" className="btn btn-secondary">
              <FaArrowLeft /> Back to List
            </Link>
          </div>
        </div>
        <div className="card-body">
          {isSubmitting ? (
            <Loader />
          ) : (
            <DeliveryForm 
              delivery={delivery} 
              onSubmit={handleSubmit} 
              isEditMode={!isNewDelivery} 
            />
          )}
        </div>
      </div>
  );
};

export default DeliveryDetails;