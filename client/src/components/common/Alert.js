import React, { useContext } from 'react';
import { AlertContext } from '../../context/AlertContext';

export default function Alert() {
  const { alert } = useContext(AlertContext);
  if (!alert) return null;

  return (
    <div className={`alert alert-${alert.type}`}>
      {alert.message}
    </div>
  );
}
