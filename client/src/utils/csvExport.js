// src/utils/csvExport.js - Utility for exporting data to CSV format

/**
 * Convert array of objects to CSV string
 * @param {Array} data - Array of objects to convert
 * @param {Array} columns - Array of column definitions with {key, label}
 * @returns {string} CSV string
 */
export const convertToCSV = (data, columns) => {
  if (!data || data.length === 0) {
    return '';
  }

  // Create header row
  const headers = columns.map(col => col.label).join(',');
  
  // Create data rows
  const rows = data.map(item => {
    return columns.map(col => {
      const value = item[col.key] || '';
      // Escape commas and quotes in the value
      const escapedValue = String(value).replace(/"/g, '""');
      // Wrap in quotes if contains comma, quote, or newline
      return /[",\n]/.test(escapedValue) ? `"${escapedValue}"` : escapedValue;
    }).join(',');
  });

  return [headers, ...rows].join('\n');
};

/**
 * Download CSV file
 * @param {string} csvContent - CSV string content
 * @param {string} filename - Name of the file to download
 */
export const downloadCSV = (csvContent, filename) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

/**
 * Export data to CSV with proper formatting
 * @param {Array} data - Data to export
 * @param {Array} columns - Column definitions
 * @param {string} filename - Name of the file
 */
export const exportToCSV = (data, columns, filename) => {
  const csvContent = convertToCSV(data, columns);
  downloadCSV(csvContent, filename);
};

/**
 * Get current date string for filename
 * @returns {string} Current date in YYYY-MM-DD format
 */
export const getCurrentDateString = () => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Generate filename with current date and timeframe
 * @param {string} entityType - Type of entity (trucks, drivers, etc.)
 * @param {string} timeframe - Current timeframe
 * @returns {string} Formatted filename
 */
export const generateFilename = (entityType, timeframe) => {
  const date = getCurrentDateString();
  const timeframeStr = timeframe.replace(/\s+/g, '_');
  return `${entityType}_${timeframeStr}_${date}.csv`;
};
