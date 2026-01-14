import React, { useState, useEffect, useContext } from 'react';
import { useParams, useHistory, Link } from 'react-router-dom';
import axios from 'axios';
import { FaArrowLeft } from 'react-icons/fa';
import DriverForm from '../../../components/forms/DriverForm';
import Loader from '../../../components/common/Loader';
import { AlertContext } from '../../../context/AlertContext';

const DriverDetails = () => {
  const { id } = useParams();
  const history = useHistory();
  const { showAlert } = useContext(AlertContext);
  const [driver, setDriver] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isNewDriver = id === 'new';

  useEffect(() => {
    if (!isNewDriver) {
      fetchDriver();
    } else {
      setIsLoading(false);
    }
  }, [id]);

  const fetchDriver = async () => {
    try {
      const res = await axios.get(`/api/drivers/${id}`);
      setDriver(res.data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching driver details:', error);
      showAlert('Error loading driver details', 'danger');
      setIsLoading(false);
    }
  };

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    
    try {
      if (isNewDriver) {
        await axios.post('/api/drivers', formData);
        showAlert('Driver created successfully', 'success');
        history.push('/admin/drivers');
      } else {
        await axios.put(`/api/drivers/${id}`, formData);
        showAlert('Driver updated successfully', 'success');
        history.push('/admin/drivers');
      }
    } catch (error) {
      console.error('Error saving driver:', error);
      showAlert(error.response?.data?.message || 'Error saving driver', 'danger');
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
        <h2 className="card-title">{isNewDriver ? 'Add New Driver' : 'Edit Driver'}</h2>
        <Link to="/admin/drivers" className="btn btn-secondary">
          <FaArrowLeft /> Back to List
        </Link>
      </div>
      <div className="card-body">
        {isSubmitting ? (
          <Loader />
        ) : (
          <DriverForm 
            driver={driver} 
            onSubmit={handleSubmit} 
            isEditMode={!isNewDriver} 
          />
        )}
      </div>
    </div>
  );
};

export default DriverDetails;