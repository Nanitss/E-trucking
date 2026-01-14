import React, { useState, useEffect, useContext } from 'react';
import { useParams, useHistory, Link } from 'react-router-dom';
import axios from 'axios';
import { FaArrowLeft } from 'react-icons/fa';
import HelperForm from '../../../components/forms/HelperForm';
import Loader from '../../../components/common/Loader';
import { AlertContext } from '../../../context/AlertContext';

const HelperDetails = () => {
  const { id } = useParams();
  const history = useHistory();
  const { showAlert } = useContext(AlertContext);
  const [helper, setHelper] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isNewHelper = id === 'new';

  useEffect(() => {
    if (!isNewHelper) {
      fetchHelper();
    } else {
      setIsLoading(false);
    }
  }, [id]);

  const fetchHelper = async () => {
    try {
      const res = await axios.get(`/api/helpers/${id}`);
      setHelper(res.data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching helper details:', error);
      showAlert('Error loading helper details', 'danger');
      setIsLoading(false);
    }
  };

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    
    try {
      if (isNewHelper) {
        await axios.post('/api/helpers', formData);
        showAlert('Helper created successfully', 'success');
        history.push('/admin/helpers');
      } else {
        await axios.put(`/api/helpers/${id}`, formData);
        showAlert('Helper updated successfully', 'success');
        history.push('/admin/helpers');
      }
    } catch (error) {
      console.error('Error saving helper:', error);
      showAlert(error.response?.data?.message || 'Error saving helper', 'danger');
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
        <h2 className="card-title">{isNewHelper ? 'Add New Helper' : 'Edit Helper'}</h2>
        <Link to="/admin/helpers" className="btn btn-secondary">
          <FaArrowLeft /> Back to List
        </Link>
      </div>
      <div className="card-body">
        {isSubmitting ? (
          <Loader />
        ) : (
          <HelperForm 
            helper={helper} 
            onSubmit={handleSubmit} 
            isEditMode={!isNewHelper} 
          />
        )}
      </div>
    </div>
  );
};

export default HelperDetails;