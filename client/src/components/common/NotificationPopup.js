// src/components/common/NotificationPopup.js - Popup notification component
import React, { useState, useEffect } from "react";
import { TbCheck, TbX, TbDownload, TbAlertCircle } from "react-icons/tb";

const NotificationPopup = ({
  message,
  type = "success",
  duration = 3000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        if (onClose) onClose();
      }, 300); // Wait for fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case "success":
        return <TbCheck size={20} />;
      case "error":
        return <TbX size={20} />;
      case "download":
        return <TbDownload size={20} />;
      case "warning":
        return <TbAlertCircle size={20} />;
      default:
        return <TbCheck size={20} />;
    }
  };

  const getTypeClass = () => {
    switch (type) {
      case "success":
        return "notification-success";
      case "error":
        return "notification-error";
      case "download":
        return "notification-download";
      case "warning":
        return "notification-warning";
      default:
        return "notification-success";
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className={`notification-popup ${getTypeClass()} ${isVisible ? "show" : "hide"}`}
    >
      <div className="notification-content">
        <div className="notification-icon">{getIcon()}</div>
        <div className="notification-message">{message}</div>
        <button
          className="notification-close"
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => {
              if (onClose) onClose();
            }, 300);
          }}
        >
          <TbX size={16} />
        </button>
      </div>
    </div>
  );
};

export default NotificationPopup;
