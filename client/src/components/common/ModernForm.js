import React from 'react';
import '../styles/DesignSystem.css';

/**
 * Modern Form Component - Standardized Design
 * Uses your exact navy blue and yellow color scheme
 */
const ModernForm = ({ 
  title, 
  subtitle, 
  children, 
  onSubmit, 
  className = '',
  gridColumns = 1 
}) => {
  const gridClass = gridColumns === 2 ? 'form-grid-2' : 
                   gridColumns === 3 ? 'form-grid-3' : '';

  return (
    <div className={`form-container ${className}`}>
      {(title || subtitle) && (
        <div className="form-header">
          {title && <h2 className="form-title">{title}</h2>}
          {subtitle && <p className="form-subtitle">{subtitle}</p>}
        </div>
      )}
      
      <form onSubmit={onSubmit}>
        <div className={`form-grid ${gridClass}`}>
          {children}
        </div>
      </form>
    </div>
  );
};

/**
 * Modern Form Group - Standardized Input Container
 */
const FormGroup = ({ 
  label, 
  required = false, 
  error, 
  help, 
  children, 
  className = '' 
}) => {
  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="required-indicator">*</span>}
        </label>
      )}
      {children}
      {error && (
        <div className="form-error">
          <span>⚠</span>
          {error}
        </div>
      )}
      {help && !error && (
        <div className="form-help">{help}</div>
      )}
    </div>
  );
};

/**
 * Modern Input - Standardized Input Field
 */
const ModernInput = ({ 
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error = false,
  className = '',
  ...props 
}) => {
  return (
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      className={`form-control ${error ? 'error' : ''} ${className}`}
      {...props}
    />
  );
};

/**
 * Modern Select - Standardized Select Field
 */
const ModernSelect = ({ 
  name,
  value,
  onChange,
  required = false,
  disabled = false,
  error = false,
  className = '',
  children,
  ...props 
}) => {
  return (
    <select
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      disabled={disabled}
      className={`form-select ${error ? 'error' : ''} ${className}`}
      {...props}
    >
      {children}
    </select>
  );
};

/**
 * Modern Textarea - Standardized Textarea Field
 */
const ModernTextarea = ({ 
  name,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error = false,
  rows = 4,
  className = '',
  ...props 
}) => {
  return (
    <textarea
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      rows={rows}
      className={`form-textarea ${error ? 'error' : ''} ${className}`}
      {...props}
    />
  );
};

/**
 * Modern Form Actions - Standardized Button Container
 */
const FormActions = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={`form-actions ${className}`}>
      {children}
    </div>
  );
};

/**
 * Modern Button - Standardized Button Component
 */
const ModernButton = ({ 
  type = 'button',
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  disabled = false,
  className = '',
  ...props 
}) => {
  const sizeClass = size === 'sm' ? 'btn-sm' : 
                   size === 'lg' ? 'btn-lg' : '';
  
  const variantClass = variant === 'primary' ? 'btn-primary' :
                      variant === 'secondary' ? 'btn-secondary' :
                      variant === 'accent' ? 'btn-accent' :
                      variant === 'success' ? 'btn-success' :
                      variant === 'danger' ? 'btn-danger' : 'btn-primary';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

/**
 * Modern Checkbox - Standardized Checkbox Component
 */
const ModernCheckbox = ({ 
  name,
  checked,
  onChange,
  label,
  disabled = false,
  className = '',
  ...props 
}) => {
  return (
    <label className={`d-flex align-items-center ${className}`}>
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="me-2"
        {...props}
      />
      {label}
    </label>
  );
};

/**
 * Modern Radio - Standardized Radio Component
 */
const ModernRadio = ({ 
  name,
  value,
  checked,
  onChange,
  label,
  disabled = false,
  className = '',
  ...props 
}) => {
  return (
    <label className={`d-flex align-items-center ${className}`}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="me-2"
        {...props}
      />
      {label}
    </label>
  );
};

/**
 * Modern File Upload - Standardized File Upload Component
 */
const ModernFileUpload = ({ 
  name,
  onChange,
  accept,
  multiple = false,
  disabled = false,
  className = '',
  ...props 
}) => {
  return (
    <input
      type="file"
      name={name}
      onChange={onChange}
      accept={accept}
      multiple={multiple}
      disabled={disabled}
      className={`form-control ${className}`}
      {...props}
    />
  );
};

// Export all components
export {
  ModernForm,
  FormGroup,
  ModernInput,
  ModernSelect,
  ModernTextarea,
  FormActions,
  ModernButton,
  ModernCheckbox,
  ModernRadio,
  ModernFileUpload
};

export default ModernForm;
