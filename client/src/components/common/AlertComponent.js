import React, { useContext } from 'react';
import { AlertContext } from '../../context/AlertContext';
import '../../App.css';

const AlertComponent = () => {
  const { alerts, removeAlert } = useContext(AlertContext);

  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="alerts-container">
      {alerts.map((alert) => (
        <div 
          key={alert.id} 
          className={`alert alert-${alert.type}`}
        >
          {alert.message}
          <button 
            className="btn-close" 
            onClick={() => removeAlert(alert.id)}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default AlertComponent; 