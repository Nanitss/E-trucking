// src/context/AlertContext.js
import React, { createContext, useState } from 'react';

export const AlertContext = createContext();

export const AlertProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);

  // Add alert
  const showAlert = (message, type = 'info', timeout = 5000) => {
    const id = Date.now();
    setAlerts(prev => [...prev, { id, message, type }]);
    setTimeout(() =>
      setAlerts(prev => prev.filter(a => a.id !== id)),
      timeout
    );
  };

  // Remove alert
  const removeAlert = id =>
    setAlerts(prev => prev.filter(a => a.id !== id));

  return (
    <AlertContext.Provider value={{ alerts, showAlert, removeAlert }}>
      {children}
    </AlertContext.Provider>
  );
};
