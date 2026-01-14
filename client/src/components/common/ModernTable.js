import React from 'react';
import { Link } from 'react-router-dom';
import { FaEdit, FaTrash, FaEye, FaPlus } from 'react-icons/fa';
import '../styles/DesignSystem.css';

/**
 * Modern Table Component - Standardized Design
 * Uses your exact navy blue and yellow color scheme
 */
const ModernTable = ({ 
  data = [], 
  columns = [], 
  onEdit, 
  onDelete, 
  onView,
  onAdd,
  title,
  subtitle,
  emptyMessage = "No data found",
  className = '',
  loading = false 
}) => {
  if (loading) {
    return (
      <div className="table-container">
        <div className="d-flex justify-content-center align-items-center p-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <span className="ms-3">Loading data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`table-container ${className}`}>
      {(title || subtitle || onAdd) && (
        <div className="card-header">
          <div>
            {title && <h3 className="card-title">{title}</h3>}
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
          {onAdd && (
            <ModernButton
              variant="primary"
              size="sm"
              onClick={onAdd}
            >
              <FaPlus className="me-2" />
              Add New
            </ModernButton>
          )}
        </div>
      )}
      
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th key={index} style={{ width: column.width }}>
                  {column.header}
                </th>
              ))}
              {(onEdit || onDelete || onView) && (
                <th style={{ width: '120px' }}>Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.map((row, rowIndex) => (
                <tr key={row.id || rowIndex}>
                  {columns.map((column, colIndex) => (
                    <td key={colIndex}>
                      {column.render ? 
                        column.render(row[column.key], row, rowIndex) : 
                        row[column.key]
                      }
                    </td>
                  ))}
                  {(onEdit || onDelete || onView) && (
                    <td>
                      <div className="table-actions">
                        {onView && (
                          <button
                            className="action-btn view-btn"
                            onClick={() => onView(row)}
                            title="View Details"
                          >
                            <FaEye />
                          </button>
                        )}
                        {onEdit && (
                          <button
                            className="action-btn edit-btn"
                            onClick={() => onEdit(row)}
                            title="Edit"
                          >
                            <FaEdit />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            className="action-btn delete-btn"
                            onClick={() => onDelete(row)}
                            title="Delete"
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td 
                  colSpan={columns.length + (onEdit || onDelete || onView ? 1 : 0)}
                  className="text-center p-5"
                >
                  <div className="empty-state">
                    <div className="empty-state-icon">📋</div>
                    <div className="empty-state-title">No Data Available</div>
                    <div className="empty-state-description">{emptyMessage}</div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * Modern Button Component for Tables
 */
const ModernButton = ({ 
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
 * Modern Status Badge Component
 */
const ModernStatusBadge = ({ status, variant = 'default' }) => {
  const getStatusConfig = (status) => {
    const normalizedStatus = status ? status.toLowerCase() : 'unknown';
    
    switch (normalizedStatus) {
      case 'active':
      case 'available':
      case 'completed':
      case 'success':
        return {
          className: 'status-badge-success',
          label: status,
          icon: '✓'
        };
      case 'pending':
      case 'allocated':
      case 'warning':
        return {
          className: 'status-badge-warning',
          label: status,
          icon: '⏳'
        };
      case 'inactive':
      case 'unavailable':
      case 'cancelled':
      case 'danger':
        return {
          className: 'status-badge-danger',
          label: status,
          icon: '✗'
        };
      case 'in-use':
      case 'on-delivery':
      case 'info':
        return {
          className: 'status-badge-info',
          label: status,
          icon: 'ℹ'
        };
      case 'maintenance':
        return {
          className: 'status-badge-warning',
          label: status,
          icon: '🔧'
        };
      default:
        return {
          className: 'status-badge-secondary',
          label: status || 'Unknown',
          icon: '?'
        };
    }
  };

  const { className, label, icon } = getStatusConfig(status);

  return (
    <span className={`status-badge ${className}`}>
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  );
};

/**
 * Modern Data Card Component - Alternative to Tables
 */
const ModernDataCard = ({ 
  data = [], 
  renderCard,
  title,
  subtitle,
  onAdd,
  emptyMessage = "No data found",
  className = '',
  loading = false 
}) => {
  if (loading) {
    return (
      <div className="card">
        <div className="d-flex justify-content-center align-items-center p-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <span className="ms-3">Loading data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`card ${className}`}>
      {(title || subtitle || onAdd) && (
        <div className="card-header">
          <div>
            {title && <h3 className="card-title">{title}</h3>}
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
          {onAdd && (
            <ModernButton
              variant="primary"
              size="sm"
              onClick={onAdd}
            >
              <FaPlus className="me-2" />
              Add New
            </ModernButton>
          )}
        </div>
      )}
      
      <div className="card-body">
        {data.length > 0 ? (
          <div className="row g-3">
            {data.map((item, index) => (
              <div key={item.id || index} className="col-md-6 col-lg-4">
                {renderCard ? renderCard(item, index) : (
                  <div className="card">
                    <div className="card-body">
                      <h5 className="card-title">{item.name || item.title}</h5>
                      <p className="card-text">{item.description}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state text-center p-5">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No Data Available</div>
            <div className="empty-state-description">{emptyMessage}</div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Modern Pagination Component
 */
const ModernPagination = ({ 
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  showInfo = true,
  className = ''
}) => {
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const start = Math.max(1, currentPage - 2);
      const end = Math.min(totalPages, start + maxVisible - 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className={`d-flex justify-content-between align-items-center ${className}`}>
      {showInfo && (
        <div className="pagination-info">
          Page {currentPage} of {totalPages}
        </div>
      )}
      
      <div className="pagination-controls">
        <ModernButton
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </ModernButton>
        
        {getPageNumbers().map(page => (
          <ModernButton
            key={page}
            variant={page === currentPage ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => onPageChange(page)}
            className="ms-1"
          >
            {page}
          </ModernButton>
        ))}
        
        <ModernButton
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="ms-1"
        >
          Next
        </ModernButton>
      </div>
    </div>
  );
};

// Export all components
export {
  ModernTable,
  ModernButton,
  ModernStatusBadge,
  ModernDataCard,
  ModernPagination
};

export default ModernTable;
