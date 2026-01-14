import React, { useState, useEffect, useContext } from 'react';
import { useParams, useHistory, Link } from 'react-router-dom';
import axios from 'axios';
import { FaArrowLeft } from 'react-icons/fa';
import OperatorForm from '../../../components/forms/OperatorForm';
import Loader from '../../../components/common/Loader';
import { AlertContext } from '../../../context/AlertContext';

const OperatorDetails = () => {
  const { id } = useParams();
  const history = useHistory();
  const { showAlert } = useContext(AlertContext);
  const [operator, setOperator] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isNewOperator = id === 'new';

  useEffect(() => {
    if (!isNewOperator) {
      fetchOperator();
    } else {
      setIsLoading(false);
    }
  }, [id]);

  const fetchOperator = async () => {
    try {
      const res = await axios.get(`/api/operators/${id}`);
      setOperator(res.data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching operator details:', error);
      showAlert('Error loading operator details', 'danger');
      setIsLoading(false);
    }
  };

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    
    try {
      if (isNewOperator) {
        await axios.post('/api/operators', formData);
        showAlert('Operator created successfully', 'success');
        history.push('/admin/operators');
      } else {
        await axios.put(`/api/operators/${id}`, formData);
        showAlert('Operator updated successfully', 'success');
        history.push('/admin/operators');
      }
    } catch (error) {
      console.error('Error saving operator:', error);
      showAlert(error.response?.data?.message || 'Error saving operator', 'danger');
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
        <h2 className="card-title">{isNewOperator ? 'Add New Operator' : 'Edit Operator'}</h2>
        <Link to="/admin/operators" className="btn btn-secondary">
          <FaArrowLeft /> Back to List
        </Link>
      </div>
      <div className="card-body">
        {isSubmitting ? (
          <Loader />
        ) : (
          <OperatorForm 
            operator={operator} 
            onSubmit={handleSubmit} 
            isEditMode={!isNewOperator} 
          />
        )}
      </div>
    </div>
  );
};

export default OperatorDetails;