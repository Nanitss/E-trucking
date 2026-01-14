// Format currency
export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  // Format number with commas
  export const formatNumber = (number) => {
    return new Intl.NumberFormat().format(number);
  };
  
  // Format distance
  export const formatDistance = (distance) => {
    return `${parseFloat(distance).toFixed(2)} km`;
  };
  
  // Capitalize first letter
  export const capitalizeFirstLetter = (string) => {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
  };
  
  // Format phone number
  export const formatPhone = (phone) => {
    if (!phone) return '';
    
    // Basic phone formatting for display
    const cleaned = ('' + phone).replace(/\D/g, '');
    
    if (cleaned.length === 10) {
      return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6, 10)}`;
    }
    
    return phone;
  };
  
  // Truncate text
  export const truncateText = (text, maxLength = 50) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    
    return text.substring(0, maxLength) + '...';
  };