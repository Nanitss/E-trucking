import React from "react";
import {
  TbCheck,
  TbHourglass,
  TbLoader2,
  TbX,
  TbAlertTriangle,
  TbTruck,
  TbClock,
  TbCircleDot,
  TbBan,
  TbSettings,
  TbCalendarPause,
} from "react-icons/tb";

const StatusBadge = ({ status }) => {
  const normalizedStatus = status
    ? status.toLowerCase().replace(/[\s_-]+/g, "")
    : "unknown";

  const getStatusConfig = () => {
    switch (normalizedStatus) {
      // Success / Active / Delivered / Completed
      case "completed":
        return { color: "text-emerald-600", label: "Completed", icon: <TbCheck size={15} /> };
      case "delivered":
        return { color: "text-emerald-600", label: "Delivered", icon: <TbCheck size={15} /> };
      case "active":
      case "available":
      case "free":
        return { color: "text-emerald-600", label: "Active", icon: <TbCheck size={15} /> };

      // Warning / Pending
      case "pending":
        return { color: "text-gray-700", label: "Pending", icon: <TbHourglass size={15} /> };
      case "awaiting":
      case "awaitingapproval":
        return { color: "text-amber-600", label: "Awaiting Approval", icon: <TbClock size={15} /> };
      case "accepted":
        return { color: "text-blue-600", label: "Accepted", icon: <TbCheck size={15} /> };

      // In Progress / On Delivery
      case "inprogress":
      case "started":
        return { color: "text-blue-600", label: "In Progress", icon: <TbLoader2 size={15} className="animate-spin" /> };
      case "ondelivery":
        return { color: "text-blue-600", label: "on-delivery", icon: <TbTruck size={15} /> };
      case "pickedup":
        return { color: "text-blue-600", label: "Picked Up", icon: <TbTruck size={15} /> };

      // Allocated / Reserved / Scheduled
      case "allocated":
      case "reserved":
        return { color: "text-indigo-600", label: status.charAt(0).toUpperCase() + status.slice(1), icon: <TbCircleDot size={15} /> };
      case "scheduled":
      case "standby":
        return { color: "text-purple-600", label: status.charAt(0).toUpperCase() + status.slice(1), icon: <TbClock size={15} /> };

      // Danger / Cancelled / Terminated / Expired
      case "cancelled":
        return { color: "text-red-600", label: "Cancelled", icon: <TbX size={15} /> };
      case "terminated":
        return { color: "text-red-600", label: "Terminated", icon: <TbBan size={15} /> };
      case "suspended":
        return { color: "text-orange-600", label: "Suspended", icon: <TbAlertTriangle size={15} /> };
      case "expired":
      case "registrationexpired":
      case "licenseexpired":
        return { color: "text-red-600", label: "Expired", icon: <TbX size={15} /> };
      case "registrationexpiring":
      case "licenseexpiring":
        return { color: "text-orange-600", label: "Expiring", icon: <TbAlertTriangle size={15} /> };

      // Inactive / Maintenance / Out of Service
      case "inactive":
        return { color: "text-gray-500", label: "Inactive", icon: <TbCircleDot size={15} /> };
      case "maintenance":
        return { color: "text-amber-600", label: "Maintenance", icon: <TbSettings size={15} /> };
      case "outofservice":
        return { color: "text-gray-500", label: "Out of Service", icon: <TbBan size={15} /> };
      case "onleave":
        return { color: "text-amber-600", label: "On Leave", icon: <TbCalendarPause size={15} /> };
      case "busy":
        return { color: "text-amber-600", label: "Busy", icon: <TbTruck size={15} /> };

      default:
        return { color: "text-gray-500", label: status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown", icon: <TbAlertTriangle size={15} /> };
    }
  };

  const { color, label, icon } = getStatusConfig();

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${color}`}>
      {icon}
      {label}
    </span>
  );
};

export default StatusBadge;
