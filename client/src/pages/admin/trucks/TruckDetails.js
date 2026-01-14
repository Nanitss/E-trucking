import React, { useState, useEffect, useContext } from 'react';
import { useParams, useHistory, Link } from 'react-router-dom';
import axios from 'axios';
import { FaArrowLeft } from 'react-icons/fa';
import TruckForm from '../../../components/forms/TruckForm';
import Loader from '../../../components/common/Loader';
import { AlertContext } from '../../../context/AlertContext';

const TruckDetails = () => {
  const { id } = useParams();
  const history = useHistory();
  const { showAlert } = useContext(AlertContext);
  const [truck, setTruck] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isNewTruck = id === 'new';

  useEffect(() => {
    if (!isNewTruck) {
      fetchTruck();
    } else {
      setIsLoading(false);
    }
  }, [id]);

  const fetchTruck = async () => {
    try {
      const res = await axios.get(`/api/trucks/${id}`);
      setTruck(res.data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching truck details:', error);
      showAlert('Error loading truck details', 'danger');
      setIsLoading(false);
    }
  };

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    
    try {
      if (isNewTruck) {
        await axios.post('/api/trucks', formData);
        showAlert('Truck created successfully', 'success');
        history.push('/admin/trucks');
      } else {
        await axios.put(`/api/trucks/${id}`, formData);
        showAlert('Truck updated successfully', 'success');
        history.push('/admin/trucks');
      }
    } catch (error) {
        console.error('Error saving truck:', error);
        showAlert(error.response?.data?.message || 'Error saving truck', 'danger');
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
          <h2 className="card-title">{isNewTruck ? 'Add New Truck' : 'Edit Truck'}</h2>
          <Link to="/admin/trucks" className="btn btn-secondary">
            <FaArrowLeft /> Back to List
          </Link>
        </div>
        <div className="card-body">
          {isSubmitting ? (
            <Loader />
          ) : (
            <TruckForm 
              truck={truck} 
              onSubmit={handleSubmit} 
              isEditMode={!isNewTruck} 
            />
          )}
        </div>
      </div>
    );
  };
  
  export default TruckDetails;