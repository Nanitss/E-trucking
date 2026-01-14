// Storage utility to safely access localStorage with error handling

/**
 * Safely get an item from localStorage with error handling
 * @param {string} key - The key to retrieve from localStorage
 * @returns {any|null} - The parsed value or null if not found/error
 */
export const getFromStorage = (key) => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;
    
    // Special handling for token - don't parse it
    if (key === 'token') {
      return item; // Return token as a string
    }
    
    try {
      return JSON.parse(item);
    } catch (parseError) {
      console.error(`Error parsing item ${key} from localStorage:`, parseError);
      // Remove the corrupted item to prevent future errors
      localStorage.removeItem(key);
      return null;
    }
  } catch (error) {
    console.error(`Error getting item ${key} from localStorage:`, error);
    return null;
  }
};

/**
 * Safely set an item in localStorage with error handling
 * @param {string} key - The key to store in localStorage
 * @param {any} value - The value to store (will be JSON stringified)
 * @returns {boolean} - True if successful, false if failed
 */
export const setInStorage = (key, value) => {
  try {
    // Special handling for token - store as is
    if (key === 'token') {
      localStorage.setItem(key, value);
      return true;
    }
    
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error setting item ${key} in localStorage:`, error);
    return false;
  }
};

/**
 * Safely remove an item from localStorage with error handling
 * @param {string} key - The key to remove from localStorage
 * @returns {boolean} - True if successful, false if failed
 */
export const removeFromStorage = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing item ${key} from localStorage:`, error);
    return false;
  }
};

/**
 * Safely check if localStorage is available
 * @returns {boolean} - True if localStorage is available
 */
export const isStorageAvailable = () => {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}; 