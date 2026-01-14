import React, { useState, useEffect, useContext } from 'react';
import { useParams, useHistory, Link } from 'react-router-dom';
import axios from 'axios';
import { FaArrowLeft } from 'react-icons/fa';
import ClientForm from '../../../components/forms/ClientForm';
import Loader from '../../../components/common/Loader';
import { AlertContext } from '../../../context/AlertContext';

const ClientDetails = () => {
  const { id } = useParams();
  const history = useHistory();
  const { showAlert } = useContext(AlertContext);
  const [client, setClient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isNewClient = id === 'new';

  useEffect(() => {
    if (!isNewClient) {
      fetchClient();
    } else {
      setIsLoading(false);
    }
  }, [id]);

  const fetchClient = async () => {
    try {
      const res = await axios.get(`/api/clients/${id}`);
      setClient(res.data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching client details:', error);
      showAlert('Error loading client details', 'danger');
      setIsLoading(false);
    }
  };

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    
    try {
      if (isNewClient) {
        await axios.post('/api/clients', formData);
        showAlert('Client created successfully', 'success');
        history.push('/admin/clients');
      } else {
        await axios.put(`/api/clients/${id}`, formData);
        showAlert('Client updated successfully', 'success');
        history.push('/admin/clients');
      }
    } catch (error) {
      console.error('Error saving client:', error);
      showAlert(error.response?.data?.message || 'Error saving client', 'danger');
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
        <h2 className="card-title">{isNewClient ? 'Add New Client' : 'Edit Client'}</h2>
        <Link to="/admin/clients" className="btn btn-secondary">
          <FaArrowLeft /> Back to List
        </Link>
      </div>
      <div className="card-body">
        {isSubmitting ? (
          <Loader />
        ) : (
          <ClientForm 
            client={client} 
            onSubmit={handleSubmit} 
            isEditMode={!isNewClient} 
          />
        )}
      </div>
    </div>
  );
};

export default ClientDetails;