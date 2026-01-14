// src/pages/admin/clients/ClientTruckAllocation.js - Enhanced with improved design

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useHistory, Link } from 'react-router-dom';
import axios from 'axios';
import './ClientTruckAllocation.css';

const ClientTruckAllocation = () => {
  const { id } = useParams();
  const history = useHistory();
  const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5007';

  const [client, setClient] = useState(null);
  const [allocatedTrucks, setAllocatedTrucks] = useState([]);
  const [availableTrucks, setAvailableTrucks] = useState([]);
  const [selectedTrucks, setSelectedTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [allocationType, setAllocationType] = useState('individual'); // 'individual' or 'byType'
  const [truckTypes, setTruckTypes] = useState([]);
  const [selectedType, setSelectedType] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch client data
        console.log('🔄 Fetching client data...');
        const clientResponse = await axios.get(`${baseURL}/api/clients/${id}`);
        console.log('✅ Client data:', clientResponse.data);
        setClient(clientResponse.data);

        // Fetch allocated trucks for this client
        console.log('🔄 Fetching allocated trucks...');
        const allocatedResponse = await axios.get(`${baseURL}/api/clients/${id}/trucks`);
        console.log('✅ Allocated trucks:', allocatedResponse.data);
        setAllocatedTrucks(allocatedResponse.data);

        // Fetch available trucks
        console.log('🔄 Fetching available trucks...');
        const availableResponse = await axios.get(`${baseURL}/api/trucks/available`);
        console.log('✅ Available trucks:', availableResponse.data);
        setAvailableTrucks(availableResponse.data);

        // Extract unique truck types
        const allTrucks = [...allocatedResponse.data, ...availableResponse.data];
        const types = [...new Set(allTrucks.map(truck => truck.truckType || truck.TruckType))];
        setTruckTypes(types);
        if (types.length > 0) {
          setSelectedType(types[0]);
        }

        setLoading(false);
      } catch (err) {
        console.error('❌ Error fetching data:', err);
        setError('Failed to load data. Please try again.');
        setLoading(false);
      }
    };

    fetchData();
  }, [id, baseURL]);

  // Filter available trucks - SHARED ALLOCATION MODEL
  // Trucks can be allocated to multiple clients regardless of status
  // Only exclude trucks already allocated to THIS client
  const filteredAvailableTrucks = useMemo(() => {
    // Get IDs of trucks already allocated to THIS client
    const allocatedTruckIds = allocatedTrucks.map(truck => truck.id || truck.TruckID);
    
    // Filter out only trucks already allocated to THIS client
    // NO STATUS RESTRICTIONS - booking restrictions enforced at delivery creation
    let filtered = availableTrucks.filter(truck => {
      const truckId = truck.id || truck.TruckID;
      
      // Only exclude if already allocated to this client
      return !allocatedTruckIds.includes(truckId);
    });

    if (statusFilter !== 'all') {
      filtered = filtered.filter(truck => (truck.truckStatus || truck.TruckStatus) === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(truck => (truck.truckType || truck.TruckType) === typeFilter);
    }

    return filtered;
  }, [availableTrucks, allocatedTrucks, statusFilter, typeFilter]);

  // Get available trucks count by type - SHARED ALLOCATION MODEL
  const getAvailableTruckCountByType = (type) => {
    const allocatedTruckIds = allocatedTrucks.map(truck => truck.id || truck.TruckID);
    return availableTrucks.filter(truck => {
      const truckId = truck.id || truck.TruckID;
      return (
        (truck.truckType || truck.TruckType) === type && 
        !allocatedTruckIds.includes(truckId)
      );
    }).length;
  };

  // Handle truck selection for individual allocation
  const handleTruckSelection = (truckId) => {
    setSelectedTrucks(prev => 
      prev.includes(truckId) 
        ? prev.filter(id => id !== truckId)
        : [...prev, truckId]
    );
  };

  // Allocate trucks to client
  const handleAllocateTrucks = async () => {
    if (allocationType === 'individual' && selectedTrucks.length === 0) {
      alert('Please select at least one truck to allocate');
      return;
    }

    if (allocationType === 'byType' && (!selectedType || quantity <= 0)) {
      alert('Please select a truck type and specify a valid quantity');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      let truckIds;
      
      if (allocationType === 'individual') {
        truckIds = selectedTrucks;
      } else {
        // Get IDs of trucks already allocated to THIS client
        const allocatedTruckIds = allocatedTrucks.map(truck => truck.id || truck.TruckID);
        
        // Get available trucks of the selected type (SHARED MODEL - exclude only this client's trucks)
        const availableTrucksOfType = availableTrucks
          .filter(truck => {
            const truckId = truck.id || truck.TruckID;
            return (
              (truck.truckType || truck.TruckType) === selectedType &&
              !allocatedTruckIds.includes(truckId)
            );
          })
          .map(truck => truck.id || truck.TruckID);
        
        // Take only the requested quantity
        const availableQuantity = Math.min(availableTrucksOfType.length, quantity);
        
        if (availableQuantity < quantity) {
          alert(`Only ${availableQuantity} trucks of type "${selectedType}" are available. Allocating all available.`);
        }
        
        truckIds = availableTrucksOfType.slice(0, availableQuantity);
        
        if (truckIds.length === 0) {
          setError(`No trucks of type "${selectedType}" are available for allocation.`);
          setLoading(false);
          return;
        }
      }

      console.log('🔄 Allocating trucks:', truckIds);
      console.log('🔄 Client ID:', id);
      
      // Allocate the trucks
      const response = await axios.post(`${baseURL}/api/clients/${id}/allocate-trucks`, {
        truckIds
      });
      
      console.log('✅ Allocation response:', response.data);
      
      if (response.data.failedAllocations && response.data.failedAllocations.length > 0) {
        console.warn('⚠️ Some allocations failed:', response.data.failedAllocations);
        setError(`Some trucks could not be allocated. ${response.data.failedAllocations.map(f => f.reason).join(', ')}`);
      }

      // Refresh data
      await refreshData();
      
      // Clear selection
      setSelectedTrucks([]);
      setQuantity(1);
      
      // Show success message
      const successMsg = response.data.successfulAllocations && response.data.successfulAllocations.length 
        ? `${response.data.successfulAllocations.length} trucks allocated successfully!` 
        : 'Trucks allocated successfully!';
      
      setSuccessMessage(successMsg);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      
      setLoading(false);
    } catch (err) {
      console.error('❌ Error allocating trucks:', err);
      setError('Failed to allocate trucks. Please try again. ' + (err.response?.data?.message || err.message));
      setLoading(false);
    }
  };

  // Deallocate individual truck
  const handleDeallocate = async (truckId) => {
    if (!window.confirm('Are you sure you want to deallocate this truck?')) {
      return;
    }

    try {
      setLoading(true);
      
      await axios.delete(`${baseURL}/api/clients/${id}/trucks/${truckId}`);
      
      // Refresh data
      await refreshData();
      
      setSuccessMessage('Truck deallocated successfully!');
      
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      
      setLoading(false);
    } catch (err) {
      console.error('Error deallocating truck:', err);
      setError('Failed to deallocate truck. Please try again.');
      setLoading(false);
    }
  };

  // Deallocate trucks by type
  const handleDeallocateByType = async (type) => {
    const trucksToRemove = allocatedTrucks.filter(truck => (truck.truckType || truck.TruckType) === type);
    
    if (trucksToRemove.length === 0) {
      alert(`No trucks of type "${type}" are allocated to this client.`);
      return;
    }
    
    if (!window.confirm(`Are you sure you want to deallocate all ${trucksToRemove.length} truck(s) of type "${type}"?`)) {
      return;
    }

    try {
      setLoading(true);
      
      // Deallocate each truck
      const promises = trucksToRemove.map(truck => 
        axios.delete(`${baseURL}/api/clients/${id}/trucks/${truck.id || truck.TruckID}`)
      );
      
      await Promise.all(promises);

      // Refresh data
      await refreshData();

      setSuccessMessage(`${trucksToRemove.length} truck(s) of type "${type}" deallocated successfully!`);
      
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      
      setLoading(false);
    } catch (err) {
      console.error('Error deallocating trucks:', err);
      setError('Failed to deallocate trucks. Please try again.');
      setLoading(false);
    }
  };

  // Refresh data helper
  const refreshData = async () => {
    const [allocatedResponse, availableResponse] = await Promise.all([
      axios.get(`${baseURL}/api/clients/${id}/trucks`),
      axios.get(`${baseURL}/api/trucks/available`)
    ]);
    
    setAllocatedTrucks(allocatedResponse.data);
    setAvailableTrucks(availableResponse.data);
    
    // Update truck types
    const allTrucks = [...allocatedResponse.data, ...availableResponse.data];
    const types = [...new Set(allTrucks.map(truck => truck.truckType || truck.TruckType))];
    setTruckTypes(types);
  };

  // Helper functions
  const formatStatus = (status) => {
    if (!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ');
  };

  const getStatusBadgeClass = (status) => {
    switch(status?.toLowerCase()) {
      case 'available':
        return 'status-available';
      case 'allocated':
        return 'status-allocated';
      case 'on-delivery':
        return 'status-busy';
      case 'maintenance':
        return 'status-maintenance';
      case 'active':
        return 'status-active';
      default:
        return 'status-unknown';
    }
  };

  // Get allocated truck counts by type
  const getAllocatedTrucksByType = () => {
    const counts = {};
    allocatedTrucks.forEach(truck => {
      const type = truck.truckType || truck.TruckType || 'Unknown';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
  };

  // Get summary data - SHARED ALLOCATION MODEL
  const getSummaryData = () => {
    const allocatedByType = getAllocatedTrucksByType();
    const totalAllocated = allocatedTrucks.length;
    // Count trucks available for this client (excluding already allocated to this client)
    const allocatedTruckIds = allocatedTrucks.map(truck => truck.id || truck.TruckID);
    const totalAvailable = availableTrucks.filter(truck => {
      const truckId = truck.id || truck.TruckID;
      return !allocatedTruckIds.includes(truckId);
    }).length;
    
    return {
      totalAllocated,
      totalAvailable,
      allocatedByType
    };
  };

  const summaryData = getSummaryData();

  if (loading && !client) {
    return <div className="loading">Loading data...</div>;
  }

  if (error && !client) {
    return (
      <div className="error-container">
        <div className="error-message">
          {error}
          <div style={{ marginTop: '10px' }}>
            <button onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Truck Allocation - Shared Fleet Model</h1>
          <p className="client-info">
            Client: <strong>{client?.clientName || 'Loading...'}</strong>
          </p>
          <p className="client-info" style={{fontSize: '13px', color: '#6c757d', marginTop: '5px'}}>
            ℹ️ Trucks can be shared across multiple clients. Booking restrictions apply by date - trucks cannot be booked by multiple clients on the same day.
          </p>
        </div>
        <Link to="/admin/clients" className="btn btn-secondary">
          ← Back to Clients
        </Link>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)} className="close-btn">×</button>
        </div>
      )}

      {successMessage && (
        <div className="success-message">
          {successMessage}
          <button onClick={() => setSuccessMessage('')} className="close-btn">×</button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="status-summary">
        <div className="status-card allocated">
          <h3>{summaryData.totalAllocated}</h3>
          <p>Allocated Trucks</p>
        </div>
        <div className="status-card available">
          <h3>{summaryData.totalAvailable}</h3>
          <p>Available Trucks</p>
        </div>
        <div className="status-card">
          <h3>{truckTypes.length}</h3>
          <p>Truck Types</p>
        </div>
      </div>

      {/* Allocated Trucks Section */}
      <div className="allocation-section">
        <h2>Allocated Trucks</h2>
        
        {allocatedTrucks.length === 0 ? (
          <div className="no-data">No trucks allocated to this client yet.</div>
        ) : (
          <>
            {/* Allocation Summary by Type */}
            <div className="allocation-summary">
              <h3>Allocation Summary by Type</h3>
              <div className="summary-grid">
                {summaryData.allocatedByType.map(([type, count]) => (
                  <div className="summary-item" key={type}>
                    <div className="summary-type">{type}</div>
                    <div className="summary-count">{count} truck(s)</div>
                    <button 
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeallocateByType(type)}
                      disabled={loading}
                    >
                      Deallocate All
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Allocated Trucks Table */}
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Truck ID</th>
                    <th>Plate Number</th>
                    <th>Type</th>
                    <th>Capacity</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allocatedTrucks.map((truck) => (
                    <tr key={truck.id || truck.TruckID}>
                      <td>{truck.id || truck.TruckID}</td>
                      <td>{truck.truckPlate || truck.TruckPlate}</td>
                      <td>{truck.truckType || truck.TruckType}</td>
                      <td>{truck.truckCapacity || truck.TruckCapacity} tons</td>
                      <td>
                        <span className={`status-badge ${getStatusBadgeClass(truck.truckStatus || truck.TruckStatus)}`}>
                          {formatStatus(truck.truckStatus || truck.TruckStatus)}
                        </span>
                      </td>
                      <td>
                        <button
                          className="action-btn delete-btn"
                          onClick={() => handleDeallocate(truck.id || truck.TruckID)}
                          disabled={loading}
                          title="Deallocate Truck"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Available Trucks Section */}
      <div className="allocation-section">
        <h2>Allocate New Trucks</h2>
        
        {/* Allocation Type Selector */}
        <div className="allocation-controls">
          <div className="allocation-type-selector">
            <label>
              <input
                type="radio"
                value="individual"
                checked={allocationType === 'individual'}
                onChange={(e) => setAllocationType(e.target.value)}
              />
              Select Individual Trucks
            </label>
            <label>
              <input
                type="radio"
                value="byType"
                checked={allocationType === 'byType'}
                onChange={(e) => setAllocationType(e.target.value)}
              />
              Allocate by Type
            </label>
          </div>
        </div>

        {allocationType === 'byType' && (
          <div className="type-allocation-controls">
            <div className="form-group">
              <label htmlFor="truckType">Truck Type:</label>
              <select
                id="truckType"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                {truckTypes.map(type => (
                  <option key={type} value={type}>
                    {type} ({getAvailableTruckCountByType(type)} available)
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="quantity">Quantity:</label>
              <input
                type="number"
                id="quantity"
                min="1"
                max={getAvailableTruckCountByType(selectedType)}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={handleAllocateTrucks}
              disabled={loading || !selectedType || quantity <= 0}
            >
              Allocate {quantity} {selectedType} Truck(s)
            </button>
          </div>
        )}

        {allocationType === 'individual' && (
          <>
            {/* Filters */}
            <div className="filters-container">
              <div className="filter-group">
                <label htmlFor="statusFilter">Status:</label>
                <select
                  id="statusFilter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="available">Available (Not Allocated)</option>
                  <option value="active">Active (Shared with Others)</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="typeFilter">Type:</label>
                <select
                  id="typeFilter"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="all">All Types</option>
                  {truckTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <button
                className="btn btn-secondary"
                onClick={() => {
                  setStatusFilter('all');
                  setTypeFilter('all');
                }}
              >
                Clear Filters
              </button>

              <button
                className="btn btn-primary"
                onClick={handleAllocateTrucks}
                disabled={loading || selectedTrucks.length === 0}
              >
                Allocate Selected ({selectedTrucks.length})
              </button>
            </div>

            {/* Available Trucks Table */}
            {filteredAvailableTrucks.length === 0 ? (
              <div className="no-data">
                No available trucks found matching the current filters.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Select</th>
                      <th>Truck ID</th>
                      <th>Plate Number</th>
                      <th>Type</th>
                      <th>Capacity</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAvailableTrucks.map((truck) => (
                      <tr key={truck.id || truck.TruckID}>
                        <td className="checkbox-cell">
                          <input
                            type="checkbox"
                            checked={selectedTrucks.includes(truck.id || truck.TruckID)}
                            onChange={() => handleTruckSelection(truck.id || truck.TruckID)}
                            disabled={loading}
                          />
                        </td>
                        <td>{truck.id || truck.TruckID}</td>
                        <td>{truck.truckPlate || truck.TruckPlate}</td>
                        <td>{truck.truckType || truck.TruckType}</td>
                        <td>{truck.truckCapacity || truck.TruckCapacity} tons</td>
                        <td>
                          <span className={`status-badge ${getStatusBadgeClass(truck.truckStatus || truck.TruckStatus)}`}>
                            {formatStatus(truck.truckStatus || truck.TruckStatus)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ClientTruckAllocation;
