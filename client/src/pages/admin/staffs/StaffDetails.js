import React, { useState, useEffect, useContext } from 'react';
import { useParams, useHistory, Link } from 'react-router-dom';
import axios from 'axios';
import { FaArrowLeft } from 'react-icons/fa';
import StaffForm from '../../../components/forms/StaffForm';
import Loader from '../../../components/common/Loader';
import { AlertContext } from '../../../context/AlertContext';

const StaffDetails = () => {
  const { id } = useParams();
  const history = useHistory();
  const { showAlert } = useContext(AlertContext);
  const [staff, setStaff] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isNewStaff = id === 'new';

  useEffect(() => {
    if (!isNewStaff) {
      fetchStaff();
    } else {
      setIsLoading(false);
    }
  }, [id]);

  const fetchStaff = async () => {
    try {
      const res = await axios.get(`/api/staffs/${id}`);
      setStaff(res.data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching staff details:', error);
      showAlert('Error loading staff details', 'danger');
      setIsLoading(false);
    }
  };

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    
    try {
      if (isNewStaff) {
        await axios.post('/api/staffs', formData);
        showAlert('Staff created successfully', 'success');
        history.push('/admin/staffs');
      } else {
        await axios.put(`/api/staffs/${id}`, formData);
        showAlert('Staff updated successfully', 'success');
        history.push('/admin/staffs');
      }
    } catch (error) {
      console.error('Error saving staff:', error);
      showAlert(error.response?.data?.message || 'Error saving staff', 'danger');
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
        <h2 className="card-title">{isNewStaff ? 'Add New Staff' : 'Edit Staff'}</h2>
        <Link to="/admin/staffs" className="btn btn-secondary">
          <FaArrowLeft /> Back to List
        </Link>
      </div>
      <div className="card-body">
        {isSubmitting ? (
          <Loader />
        ) : (
          <StaffForm 
            staff={staff} 
            onSubmit={handleSubmit} 
            isEditMode={!isNewStaff} 
          />
        )}
      </div>
    </div>
  );
};

export default StaffDetails;