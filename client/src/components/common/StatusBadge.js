import React from "react";
import {
  FaCheck,
  FaHourglass,
  FaSpinner,
  FaTimes,
  FaExclamationTriangle,
} from "react-icons/fa";

const StatusBadge = ({ status }) => {
  const normalizedStatus = status ? status.toLowerCase() : "unknown";

  const getStatusConfig = () => {
    switch (normalizedStatus) {
      case "completed":
        return {
          className: "status-badge-success",
          label: "Completed",
          icon: <FaCheck />,
        };
      case "delivered":
        return {
          className: "status-badge-success",
          label: "Delivered",
          icon: <FaCheck />,
        };
      case "pending":
        return {
          className: "status-badge-warning",
          label: "Pending",
          icon: <FaHourglass />,
        };
      case "accepted":
        return {
          className: "status-badge-info",
          label: "Accepted",
          icon: <FaCheck />,
        };
      case "in-progress":
      case "in progress":
      case "in_progress":
      case "started":
        return {
          className: "status-badge-info",
          label: "In Progress",
          icon: <FaSpinner className="spinning-icon" />,
        };
      case "picked-up":
      case "picked_up":
      case "picked up":
        return {
          className: "status-badge-info",
          label: "Picked Up",
          icon: <FaSpinner className="spinning-icon" />,
        };
      case "cancelled":
        return {
          className: "status-badge-danger",
          label: "Cancelled",
          icon: <FaTimes />,
        };
      default:
        return {
          className: "status-badge-secondary",
          label: "Unknown",
          icon: <FaExclamationTriangle />,
        };
    }
  };

  const { className, label, icon } = getStatusConfig();

  return (
    <div className={`status-badge ${className}`}>
      {icon}
      <span>{label}</span>
    </div>
  );
};

export default StatusBadge;
