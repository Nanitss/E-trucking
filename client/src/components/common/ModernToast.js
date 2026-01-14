import React, { useState, useEffect } from 'react';
import './ModernToast.css';

const ModernToast = ({ 
  isVisible, 
  onClose, 
  type = 'info', 
  title, 
  message, 
  duration = 5000,
  actionButton = null,
  icon = null 
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      
      if (duration > 0) {
        const timer = setTimeout(() => {
          handleClose();
        }, duration);
        
        return () => clearTimeout(timer);
      }
    }
  }, [isVisible, duration]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300); // Wait for animation to complete
  };

  const getIcon = () => {
    if (icon) return icon;
    
    switch (type) {
      case 'success':
        return (
          <svg className="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'delivery':
        return (
          <svg className="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M9 1v6m6-6v6" />
          </svg>
        );
      default:
        return (
          <svg className="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  if (!isVisible) return null;

  return (
    <div className={`modern-toast modern-toast-${type} ${isAnimating ? 'toast-enter' : 'toast-exit'}`}>
      <div className="toast-content">
        <div className="toast-icon-wrapper">
          {getIcon()}
        </div>
        
        <div className="toast-text">
          {title && <div className="toast-title">{title}</div>}
          <div className="toast-message">{message}</div>
        </div>
        
        {actionButton && (
          <div className="toast-action">
            {actionButton}
          </div>
        )}
        
        <button className="toast-close" onClick={handleClose} aria-label="Close notification">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="toast-progress">
        <div 
          className="toast-progress-bar" 
          style={{ 
            animationDuration: `${duration}ms`,
            animationPlayState: isAnimating ? 'running' : 'paused'
          }}
        />
      </div>
    </div>
  );
};

// Toast Container Component
export const ModernToastContainer = ({ toasts, onRemoveToast }) => {
  // Safety check to ensure toasts is an array
  if (!Array.isArray(toasts)) {
    console.warn('ModernToastContainer: toasts prop is not an array:', toasts);
    return null;
  }

  return (
    <div className="modern-toast-container">
      {toasts.map((toast) => (
        <ModernToast
          key={toast.id}
          isVisible={toast.isVisible}
          onClose={() => onRemoveToast(toast.id)}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          duration={toast.duration}
          actionButton={toast.actionButton}
          icon={toast.icon}
        />
      ))}
    </div>
  );
};

export default ModernToast; 