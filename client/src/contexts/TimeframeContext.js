// src/contexts/TimeframeContext.js - Context for managing timeframe across admin pages
import React, { createContext, useContext, useState, useCallback } from 'react';

const TimeframeContext = createContext();

export const useTimeframe = () => {
  const context = useContext(TimeframeContext);
  if (!context) {
    throw new Error('useTimeframe must be used within a TimeframeProvider');
  }
  return context;
};

export const TimeframeProvider = ({ children }) => {
  const [timeframe, setTimeframe] = useState('All Time');
  const [dateRange, setDateRange] = useState({
    start: null,
    end: null
  });

  // Generate comprehensive timeframe options
  const generateTimeframeOptions = () => {
    const options = [];
    const currentYear = new Date().getFullYear();
    
    // Add current year months
    for (let month = 12; month >= 1; month--) {
      const date = new Date(currentYear, month - 1, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      const daysInMonth = new Date(currentYear, month, 0).getDate();
      
      options.push({
        value: `${monthName} ${currentYear}`,
        label: `${monthName} ${currentYear}`,
        start: `${currentYear}-${month.toString().padStart(2, '0')}-01`,
        end: `${currentYear}-${month.toString().padStart(2, '0')}-${daysInMonth}`
      });
    }
    
    // Add previous years (2024, 2023, 2022, 2021, 2020)
    for (let year = currentYear - 1; year >= currentYear - 5; year--) {
      for (let month = 12; month >= 1; month--) {
        const date = new Date(year, month - 1, 1);
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });
        const daysInMonth = new Date(year, month, 0).getDate();
        
        options.push({
          value: `${monthName} ${year}`,
          label: `${monthName} ${year}`,
          start: `${year}-${month.toString().padStart(2, '0')}-01`,
          end: `${year}-${month.toString().padStart(2, '0')}-${daysInMonth}`
        });
      }
    }
    
    // Add "All Time" option
    options.push({
      value: 'All Time',
      label: 'All Time',
      start: null,
      end: null
    });
    
    return options;
  };

  const timeframeOptions = generateTimeframeOptions();

  // Update timeframe and calculate date range
  const updateTimeframe = (newTimeframe) => {
    setTimeframe(newTimeframe);
    
    const option = timeframeOptions.find(opt => opt.value === newTimeframe);
    if (option) {
      if (option.start && option.end) {
        setDateRange({
          start: new Date(option.start),
          end: new Date(option.end)
        });
      } else {
        // All Time - no date filtering
        setDateRange({
          start: null,
          end: null
        });
      }
    }
  };

  // Get current date range for API calls
  const getDateRange = () => {
    return dateRange;
  };

  // Check if entity was created within timeframe
  const isWithinTimeframe = useCallback((createdDate) => {
    if (!dateRange.start || !dateRange.end) {
      return true; // All Time
    }
    
    if (!createdDate) {
      return false; // No creation date, exclude from specific timeframes
    }
    
    const entityDate = new Date(createdDate);
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    
    // Set time to start of day for start date and end of day for end date
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    return entityDate >= startDate && entityDate <= endDate;
  }, [dateRange]);

  // Format date range for display
  const getFormattedDateRange = useCallback(() => {
    if (!dateRange.start || !dateRange.end) {
      return 'All Time';
    }
    
    return `${dateRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${dateRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }, [dateRange]);

  const value = {
    timeframe,
    dateRange,
    timeframeOptions,
    updateTimeframe,
    getDateRange,
    isWithinTimeframe,
    getFormattedDateRange
  };

  return (
    <TimeframeContext.Provider value={value}>
      {children}
    </TimeframeContext.Provider>
  );
};
