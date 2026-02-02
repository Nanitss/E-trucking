import React from "react";
import {
  TbArrowUpRight,
  TbArrowDownRight,
  TbArrowRight,
  TbInfoCircle,
  TbCheck,
  TbAlertTriangle,
  TbX,
} from "react-icons/tb";

/**
 * Modern Card Component - Standardized Design
 */
const ModernCard = ({
  title,
  subtitle,
  children,
  variant = "default",
  className = "",
  onClick,
  hoverable = false,
  ...props
}) => {
  const baseClasses =
    "bg-white rounded-xl border border-gray-100 shadow-card transition-all duration-200 overflow-hidden";
  const hoverClasses =
    hoverable || onClick
      ? "hover:shadow-card-hover hover:-translate-y-1 cursor-pointer"
      : "";
  const variantClasses =
    variant === "highlight" ? "border-l-4 border-l-primary-500" : "";

  const CardComponent = onClick ? "button" : "div";

  return (
    <CardComponent
      className={`${baseClasses} ${hoverClasses} ${variantClasses} ${className} w-full text-left`}
      onClick={onClick}
      {...props}
    >
      {(title || subtitle) && (
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col gap-1">
          {title && (
            <h3 className="text-lg font-bold text-gray-800 leading-tight">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-gray-500 font-medium">{subtitle}</p>
          )}
        </div>
      )}

      <div className="p-6 text-gray-600">{children}</div>
    </CardComponent>
  );
};

/**
 * Modern Stats Card - For Dashboard Statistics
 */
const ModernStatsCard = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  variant = "default",
  className = "",
  onClick,
}) => {
  const getTrendConfig = (trend) => {
    switch (trend) {
      case "up":
        return {
          icon: TbArrowUpRight,
          color: "text-success-600 bg-success-50",
        };
      case "down":
        return {
          icon: TbArrowDownRight,
          color: "text-danger-600 bg-danger-50",
        };
      case "neutral":
        return { icon: TbArrowRight, color: "text-gray-500 bg-gray-100" };
      default:
        return null;
    }
  };

  const trendConfig = getTrendConfig(trend);
  const TrendIcon = trendConfig?.icon;

  return (
    <ModernCard
      variant={variant}
      className={`relative overflow-hidden ${className}`}
      onClick={onClick}
      hoverable={!!onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 rounded-lg bg-primary-50 text-primary-600">
          {icon}
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${trendConfig.color}`}
          >
            <TrendIcon size={14} />
            <span>{trendValue}</span>
          </div>
        )}
      </div>

      <div>
        <div className="text-3xl font-bold text-gray-900 mb-1 tracking-tight">
          {value}
        </div>
        <div className="text-sm font-semibold text-gray-500">{title}</div>
        {subtitle && (
          <div className="text-xs text-gray-400 mt-1">{subtitle}</div>
        )}
      </div>
    </ModernCard>
  );
};

/**
 * Modern Info Card - For Information Display
 */
const ModernInfoCard = ({
  title,
  subtitle,
  icon,
  value,
  description,
  action,
  variant = "default",
  className = "",
  onClick,
}) => {
  return (
    <ModernCard
      variant={variant}
      className={className}
      onClick={onClick}
      hoverable={!!onClick}
    >
      <div className="flex items-start gap-4">
        {icon && (
          <div className="flex-shrink-0 text-primary-500 p-2 bg-primary-50 rounded-lg">
            {icon}
          </div>
        )}

        <div className="flex-1 min-w-0">
          {title && (
            <h4 className="text-base font-bold text-gray-800 mb-1">{title}</h4>
          )}
          {subtitle && (
            <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide font-semibold">
              {subtitle}
            </p>
          )}
          {value && (
            <div className="text-xl font-bold text-gray-900 mb-2">{value}</div>
          )}
          {description && (
            <p className="text-sm text-gray-600 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </ModernCard>
  );
};

/**
 * Modern Alert Card - For Notifications and Alerts
 */
const ModernAlertCard = ({
  title,
  message,
  type = "info",
  icon,
  action,
  dismissible = false,
  onDismiss,
  className = "",
}) => {
  const getConfig = (type) => {
    switch (type) {
      case "success":
        return {
          bg: "bg-success-50",
          border: "border-success-200",
          text: "text-success-800",
          iconColor: "text-success-600",
          Icon: TbCheck,
        };
      case "warning":
        return {
          bg: "bg-warning-50",
          border: "border-warning-200",
          text: "text-warning-800",
          iconColor: "text-warning-600",
          Icon: TbAlertTriangle,
        };
      case "danger":
        return {
          bg: "bg-danger-50",
          border: "border-danger-200",
          text: "text-danger-800",
          iconColor: "text-danger-600",
          Icon: TbAlertTriangle,
        };
      case "info":
      default:
        return {
          bg: "bg-primary-50",
          border: "border-primary-200",
          text: "text-primary-800",
          iconColor: "text-primary-600",
          Icon: TbInfoCircle,
        };
    }
  };

  const { bg, border, text, iconColor, Icon } = getConfig(type);

  return (
    <div className={`p-4 rounded-xl border ${bg} ${border} ${className}`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 ${iconColor}`}>
          {icon || <Icon size={20} />}
        </div>

        <div className={`flex-1 ${text}`}>
          {title && <h5 className="font-bold mb-1 text-sm">{title}</h5>}
          <div className="text-sm opacity-90">{message}</div>
          {action && <div className="mt-3">{action}</div>}
        </div>

        {dismissible && (
          <button
            className={`flex-shrink-0 hover:bg-black/5 rounded p-1 transition-colors ${iconColor}`}
            onClick={onDismiss}
            aria-label="Dismiss"
          >
            <TbX size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Modern Loading Card
 */
const ModernLoadingCard = ({ message = "Loading...", className = "" }) => {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-100 shadow-card p-12 text-center ${className}`}
    >
      <div className="animate-spin w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full mx-auto mb-4"></div>
      <p className="text-gray-500 font-medium">{message}</p>
    </div>
  );
};

/**
 * Modern Empty Card
 */
const ModernEmptyCard = ({
  title = "No Data Available",
  description = "There's nothing to show here yet.",
  icon,
  action,
  className = "",
}) => {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-100 shadow-card p-12 text-center ${className}`}
    >
      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400 text-2xl">
        {icon || "📋"}
      </div>
      <h5 className="text-lg font-bold text-gray-800 mb-2">{title}</h5>
      <p className="text-gray-500 max-w-sm mx-auto mb-6">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};

export {
  ModernCard,
  ModernStatsCard,
  ModernInfoCard,
  ModernAlertCard,
  ModernLoadingCard,
  ModernEmptyCard,
};
