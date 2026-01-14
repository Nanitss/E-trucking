// src/contexts/ExportDataContext.js - Context for sharing export data
import React, { createContext, useContext, useState, useCallback } from 'react';

const ExportDataContext = createContext();

export const useExportData = () => {
  const context = useContext(ExportDataContext);
  if (!context) {
    throw new Error('useExportData must be used within an ExportDataProvider');
  }
  return context;
};

export const ExportDataProvider = ({ children }) => {
  const [exportData, setExportData] = useState({
    data: [],
    columns: [],
    summary: {},
    entityType: '',
    title: ''
  });

  const updateExportData = useCallback((newData) => {
    setExportData(newData);
  }, []);

  const clearExportData = useCallback(() => {
    setExportData({
      data: [],
      columns: [],
      summary: {},
      entityType: '',
      title: ''
    });
  }, []);

  const value = {
    exportData,
    updateExportData,
    clearExportData
  };

  return (
    <ExportDataContext.Provider value={value}>
      {children}
    </ExportDataContext.Provider>
  );
};
