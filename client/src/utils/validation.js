// Validate email
export const isValidEmail = (email) => {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  };
  
  // Validate phone number
  export const isValidPhone = (phone) => {
    const re = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
    return re.test(String(phone));
  };
  
  // Validate password (minimum 6 characters)
  export const isValidPassword = (password) => {
    return password.length >= 6;
  };
  
  // Validate license plate
  export const isValidLicensePlate = (plate) => {
    // This is a simple validation, adjust according to your country's format
    return plate.length >= 3 && plate.length <= 10;
  };
  
  // Validate required fields
  export const validateRequiredFields = (data, requiredFields) => {
    const errors = {};
    
    requiredFields.forEach(field => {
      if (!data[field] || data[field].trim() === '') {
        errors[field] = `${field} is required`;
      }
    });
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };
  
  // Validate date (must be in YYYY-MM-DD format)
  export const isValidDate = (dateStr) => {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    
    if (!regex.test(dateStr)) return false;
    
    const date = new Date(dateStr);
    const timestamp = date.getTime();
    
    if (typeof timestamp !== 'number' || Number.isNaN(timestamp)) {
      return false;
    }
    
    return date.toISOString().startsWith(dateStr);
  };
  
  // Validate numeric value
  export const isValidNumber = (value) => {
    return !isNaN(parseFloat(value)) && isFinite(value);
  };