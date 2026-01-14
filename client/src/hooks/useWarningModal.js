import { useState, useCallback } from 'react';

const useWarningModal = () => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    confirmText: 'OK',
    cancelText: null,
    onConfirm: null,
    size: 'medium'
  });

  const showModal = useCallback((options) => {
    setModalState({
      isOpen: true,
      title: options.title || 'Notification',
      message: options.message || '',
      type: options.type || 'warning',
      confirmText: options.confirmText || 'OK',
      cancelText: options.cancelText || null,
      onConfirm: options.onConfirm || null,
      size: options.size || 'medium'
    });
  }, []);

  const hideModal = useCallback(() => {
    setModalState(prev => ({
      ...prev,
      isOpen: false
    }));
  }, []);

  // Convenience methods for different types of modals
  const showWarning = useCallback((title, message, options = {}) => {
    showModal({
      title,
      message,
      type: 'warning',
      ...options
    });
  }, [showModal]);

  const showError = useCallback((title, message, options = {}) => {
    showModal({
      title,
      message,
      type: 'error',
      ...options
    });
  }, [showModal]);

  const showSuccess = useCallback((title, message, options = {}) => {
    showModal({
      title,
      message,
      type: 'success',
      ...options
    });
  }, [showModal]);

  const showInfo = useCallback((title, message, options = {}) => {
    showModal({
      title,
      message,
      type: 'info',
      ...options
    });
  }, [showModal]);

  const showConfirm = useCallback((title, message, onConfirm, options = {}) => {
    showModal({
      title,
      message,
      type: 'warning',
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      onConfirm,
      ...options
    });
  }, [showModal]);

  return {
    modalState,
    showModal,
    hideModal,
    showWarning,
    showError,
    showSuccess,
    showInfo,
    showConfirm
  };
};

export default useWarningModal; 