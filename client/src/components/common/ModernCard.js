import React from 'react';
import '../styles/DesignSystem.css';

/**
 * Modern Card Component - Standardized Design
 * Uses your exact navy blue and yellow color scheme
 */
const ModernCard = ({ 
  title,
  subtitle,
  children,
  variant = 'default',
  className = '',
  onClick,
  hoverable = false,
  ...props 
}) => {
  const cardClasses = [
    'card',
    variant !== 'default' ? `card-${variant}` : '',
    hoverable ? 'card-hover' : '',
    onClick ? 'card-clickable' : '',
    className
  ].filter(Boolean).join(' ');

  const CardComponent = onClick ? 'button' : 'div';

  return (
    <CardComponent
      className={cardClasses}
      onClick={onClick}
      {...props}
    >
      {(title || subtitle) && (
        <div className="card-header">
          {title && <h3 className="card-title">{title}</h3>}
          {subtitle && <p className="card-subtitle">{subtitle}</p>}
        </div>
      )}
      
      <div className="card-body">
        {children}
      </div>
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
  variant = 'default',
  className = '',
  onClick 
}) => {
  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up':
        return '↗';
      case 'down':
        return '↘';
      case 'neutral':
        return '→';
      default:
        return '';
    }
  };

  const getTrendColor = (trend) => {
    switch (trend) {
      case 'up':
        return 'text-success';
      case 'down':
        return 'text-danger';
      case 'neutral':
        return 'text-muted';
      default:
        return 'text-muted';
    }
  };

  return (
    <ModernCard
      variant={variant}
      className={`stats-card ${className}`}
      onClick={onClick}
      hoverable={!!onClick}
    >
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div className="stats-icon">
          {icon}
        </div>
        {trend && (
          <div className={`trend-indicator ${getTrendColor(trend)}`}>
            <span className="trend-icon">{getTrendIcon(trend)}</span>
            <span className="trend-value">{trendValue}</span>
          </div>
        )}
      </div>
      
      <div className="stats-content">
        <div className="stats-value">{value}</div>
        <div className="stats-title">{title}</div>
        {subtitle && <div className="stats-subtitle">{subtitle}</div>}
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
  variant = 'default',
  className = '',
  onClick 
}) => {
  return (
    <ModernCard
      variant={variant}
      className={`info-card ${className}`}
      onClick={onClick}
      hoverable={!!onClick}
    >
      <div className="d-flex align-items-start">
        {icon && (
          <div className="info-icon me-3">
            {icon}
          </div>
        )}
        
        <div className="info-content flex-grow-1">
          {title && <h4 className="info-title">{title}</h4>}
          {subtitle && <p className="info-subtitle">{subtitle}</p>}
          {value && <div className="info-value">{value}</div>}
          {description && <p className="info-description">{description}</p>}
        </div>
        
        {action && (
          <div className="info-action">
            {action}
          </div>
        )}
      </div>
    </ModernCard>
  );
};

/**
 * Modern Feature Card - For Feature Highlights
 */
const ModernFeatureCard = ({ 
  title,
  description,
  icon,
  features = [],
  action,
  variant = 'default',
  className = '',
  onClick 
}) => {
  return (
    <ModernCard
      variant={variant}
      className={`feature-card ${className}`}
      onClick={onClick}
      hoverable={!!onClick}
    >
      <div className="feature-header">
        {icon && (
          <div className="feature-icon">
            {icon}
          </div>
        )}
        <h4 className="feature-title">{title}</h4>
      </div>
      
      <div className="feature-body">
        <p className="feature-description">{description}</p>
        
        {features.length > 0 && (
          <ul className="feature-list">
            {features.map((feature, index) => (
              <li key={index} className="feature-item">
                <span className="feature-check">✓</span>
                {feature}
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {action && (
        <div className="feature-footer">
          {action}
        </div>
      )}
    </ModernCard>
  );
};

/**
 * Modern Alert Card - For Notifications and Alerts
 */
const ModernAlertCard = ({ 
  title,
  message,
  type = 'info',
  icon,
  action,
  dismissible = false,
  onDismiss,
  className = ''
}) => {
  const getAlertIcon = (type) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'warning':
        return '⚠';
      case 'danger':
        return '✗';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  return (
    <div className={`alert alert-${type} ${className}`}>
      <div className="d-flex align-items-start">
        <div className="alert-icon me-3">
          {icon || getAlertIcon(type)}
        </div>
        
        <div className="alert-content flex-grow-1">
          {title && <h5 className="alert-title">{title}</h5>}
          <p className="alert-message">{message}</p>
          {action && (
            <div className="alert-action">
              {action}
            </div>
          )}
        </div>
        
        {dismissible && (
          <button
            className="alert-dismiss"
            onClick={onDismiss}
            aria-label="Dismiss"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Modern Loading Card - For Loading States
 */
const ModernLoadingCard = ({ 
  message = "Loading...",
  className = ''
}) => {
  return (
    <div className={`card loading-card ${className}`}>
      <div className="card-body text-center p-5">
        <div className="spinner-border text-primary mb-3" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="text-muted">{message}</p>
      </div>
    </div>
  );
};

/**
 * Modern Empty Card - For Empty States
 */
const ModernEmptyCard = ({ 
  title = "No Data Available",
  description = "There's nothing to show here yet.",
  icon = "📋",
  action,
  className = ''
}) => {
  return (
    <div className={`card empty-card ${className}`}>
      <div className="card-body text-center p-5">
        <div className="empty-icon mb-3">{icon}</div>
        <h5 className="empty-title">{title}</h5>
        <p className="empty-description text-muted">{description}</p>
        {action && (
          <div className="empty-action mt-3">
            {action}
          </div>
        )}
      </div>
    </div>
  );
};

// Export all components
export {
  ModernCard,
  ModernStatsCard,
  ModernInfoCard,
  ModernFeatureCard,
  ModernAlertCard,
  ModernLoadingCard,
  ModernEmptyCard
};

export default ModernCard;
