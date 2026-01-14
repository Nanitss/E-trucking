import React from 'react';
import ClientHeader from '../common/ClientHeader';
import './ClientLayout.css';

const ClientLayout = ({ children }) => {
  return (
    <div className="client-layout">
      <ClientHeader />
      <div className="client-content">
        {children}
      </div>
    </div>
  );
};

export default ClientLayout;