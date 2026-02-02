import React from "react";
import {
  FaExclamationTriangle,
  FaCheckCircle,
  FaInfoCircle,
  FaTimes,
  FaExclamationCircle,
} from "react-icons/fa";

const WarningModal = ({
  isOpen,
  onClose,
  title,
  message,
  type = "warning", // 'warning', 'error', 'success', 'info'
  confirmText = "OK",
  cancelText = null,
  onConfirm = null,
  size = "medium", // 'small', 'medium', 'large'
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case "success":
        return <FaCheckCircle className="modal-icon success" />;
      case "error":
        return <FaExclamationCircle className="modal-icon error" />;
      case "info":
        return <FaInfoCircle className="modal-icon info" />;
      case "warning":
      default:
        return <FaExclamationTriangle className="modal-icon warning" />;
    }
  };

  const getModalClass = () => {
    return `warning-modal-overlay ${type}`;
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else {
      onClose();
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={getModalClass()} onClick={handleBackdropClick}>
      <div className={`warning-modal-content ${size}`}>
        <div className="warning-modal-header">
          <div className="warning-modal-title">
            {getIcon()}
            <h3>{title}</h3>
          </div>
          <button className="warning-modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="warning-modal-body">
          <div className="warning-modal-message">
            {typeof message === "string"
              ? message
                  .split("\n")
                  .map((line, index) => <p key={index}>{line}</p>)
              : message}
          </div>
        </div>

        <div className="warning-modal-footer">
          {cancelText && (
            <button
              className="btn btn-secondary warning-modal-btn"
              onClick={onClose}
            >
              {cancelText}
            </button>
          )}
          <button
            className={`btn warning-modal-btn ${type === "error" ? "btn-danger" : type === "success" ? "btn-success" : "btn-primary"}`}
            onClick={handleConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WarningModal;
