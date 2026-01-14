import React, { createContext, useContext, useState, useCallback } from 'react';

const ModernToastContext = createContext();

export const ModernToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      isVisible: true,
      duration: 5000,
      ...toast
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-remove after duration if specified
    if (newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration + 500); // Add extra time for exit animation
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const updateToast = useCallback((id, updates) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, ...updates } : toast
    ));
  }, []);

  // Convenience methods for different toast types
  const showSuccess = useCallback((title, message, options = {}) => {
    return addToast({
      type: 'success',
      title,
      message,
      ...options
    });
  }, [addToast]);

  const showError = useCallback((title, message, options = {}) => {
    return addToast({
      type: 'error',
      title,
      message,
      duration: 7000, // Longer duration for errors
      ...options
    });
  }, [addToast]);

  const showWarning = useCallback((title, message, options = {}) => {
    return addToast({
      type: 'warning',
      title,
      message,
      ...options
    });
  }, [addToast]);

  const showInfo = useCallback((title, message, options = {}) => {
    return addToast({
      type: 'info',
      title,
      message,
      ...options
    });
  }, [addToast]);

  const showDelivery = useCallback((title, message, options = {}) => {
    return addToast({
      type: 'delivery',
      title,
      message,
      ...options
    });
  }, [addToast]);

  // Special method for delivery status updates
  const showDeliveryUpdate = useCallback((status, data = {}) => {
    const statusConfig = {
      accepted: {
        title: '✅ Delivery Accepted',
        message: `Your delivery has been accepted by ${data.driverName || 'a driver'} and will begin soon.`,
        type: 'delivery'
      },
      started: {
        title: '🚛 Delivery Started',
        message: `Your delivery is now in progress. ${data.driverName || 'The driver'} is on the way to pick up your cargo.`,
        type: 'delivery'
      },
      'picked-up': {
        title: '📦 Cargo Picked Up',
        message: `Your cargo has been picked up by ${data.driverName || 'the driver'} and is now in transit.`,
        type: 'delivery'
      },
      delivered: {
        title: '🎯 Delivery Completed',
        message: 'Your delivery has been completed! Please confirm receipt when convenient.',
        type: 'delivery',
        duration: 0, // Don't auto-dismiss
        actionButton: (
          <button 
            className="btn btn-primary"
            onClick={() => {
              // This will be handled by the parent component
              if (data.onConfirmReceipt) {
                data.onConfirmReceipt();
              }
            }}
          >
            Confirm Receipt
          </button>
        )
      }
    };

    const config = statusConfig[status];
    if (config) {
      return addToast({
        ...config,
        data: {
          deliveryId: data.deliveryId,
          truckPlate: data.truckPlate,
          driverName: data.driverName,
          ...data
        }
      });
    }
  }, [addToast]);

  const value = {
    toasts,
    addToast,
    removeToast,
    updateToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showDelivery,
    showDeliveryUpdate
  };

  return (
    <ModernToastContext.Provider value={value}>
      {children}
    </ModernToastContext.Provider>
  );
};

export const useModernToast = () => {
  const context = useContext(ModernToastContext);
  if (!context) {
    throw new Error('useModernToast must be used within a ModernToastProvider');
  }
  return context;
};

export default ModernToastContext; 