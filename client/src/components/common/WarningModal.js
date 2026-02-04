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
  children, // For custom content like booking summary
}) => {
  if (!isOpen) return null;

  const getIconConfig = () => {
    const configs = {
      success: {
        icon: FaCheckCircle,
        bgColor: "bg-emerald-500",
        textColor: "text-white",
      },
      error: {
        icon: FaExclamationCircle,
        bgColor: "bg-red-500",
        textColor: "text-white",
      },
      info: {
        icon: FaInfoCircle,
        bgColor: "bg-blue-600",
        textColor: "text-white",
      },
      warning: {
        icon: FaExclamationTriangle,
        bgColor: "bg-amber-500",
        textColor: "text-white",
      },
    };
    return configs[type] || configs.warning;
  };

  const getHeaderBgColor = () => {
    // Use solid colors matching project theme
    const colors = {
      success: "bg-emerald-500",
      error: "bg-red-500",
      info: "bg-blue-600",
      warning: "bg-[#1e3a5f]", // Dark blue matching navbar
    };
    return colors[type] || colors.warning;
  };

  const getButtonColor = () => {
    const colors = {
      success: "bg-emerald-500 hover:bg-emerald-600",
      error: "bg-red-500 hover:bg-red-600",
      info: "bg-blue-600 hover:bg-blue-700",
      warning: "bg-blue-600 hover:bg-blue-700", // Blue for confirm buttons
    };
    return colors[type] || colors.warning;
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

  const sizeClasses = {
    small: "max-w-sm",
    medium: "max-w-md",
    large: "max-w-lg",
  };

  const iconConfig = getIconConfig();
  const IconComponent = iconConfig.icon;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div
        className={`bg-white rounded-xl shadow-2xl ${sizeClasses[size] || sizeClasses.medium} w-full overflow-hidden`}
      >
        {/* Header - Solid color, no gradient */}
        <div className={`${getHeaderBgColor()} p-4 text-white relative`}>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-white/80 hover:text-white transition-colors p-1"
          >
            <FaTimes size={16} />
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-full p-2">
              <IconComponent className="text-xl text-white" />
            </div>
            <h3 className="text-lg font-bold">{title}</h3>
          </div>
        </div>

        {/* Body */}
        <div className="p-5">
          {/* Custom children content (for booking summary) */}
          {children}

          {/* Default message display */}
          {!children && message && (
            <div className="text-gray-700 leading-relaxed">
              {typeof message === "string"
                ? message.split("\n").map((line, index) => (
                    <p key={index} className="mb-2 last:mb-0">
                      {line}
                    </p>
                  ))
                : message}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex justify-end gap-3">
          {cancelText && (
            <button
              className="px-5 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 font-medium rounded-lg transition-colors"
              onClick={onClose}
            >
              {cancelText}
            </button>
          )}
          <button
            className={`px-5 py-2 ${getButtonColor()} text-white font-semibold rounded-lg transition-colors`}
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
