import React from "react";
import { Link } from "react-router-dom";
import { FaEdit, FaTrash, FaEye, FaPlus } from "react-icons/fa";
import { TbChevronLeft, TbChevronRight } from "react-icons/tb";

/**
 * Modern Table Component - Standardized Design
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
  className = "",
  loading = false,
}) => {
  if (loading) {
    return (
      <div
        className={`bg-white rounded-xl border border-gray-100 shadow-card p-12 text-center ${className}`}
      >
        <div className="animate-spin w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full mx-auto mb-4"></div>
        <span className="text-gray-500 font-medium">Loading data...</span>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden flex flex-col ${className}`}
    >
      {(title || subtitle || onAdd) && (
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-4">
          <div>
            {title && (
              <h3 className="text-lg font-bold text-gray-800 leading-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-gray-500 mt-1 font-medium">
                {subtitle}
              </p>
            )}
          </div>
          {onAdd && (
            <ModernButton
              variant="primary"
              size="sm"
              onClick={onAdd}
              className="flex-shrink-0"
            >
              <FaPlus className="mr-2" />
              Add New
            </ModernButton>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {columns.map((column, index) => (
                <th
                  key={index}
                  className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                  style={{ width: column.width }}
                >
                  {column.header}
                </th>
              ))}
              {(onEdit || onDelete || onView) && (
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right w-[120px]">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.length > 0 ? (
              data.map((row, rowIndex) => (
                <tr
                  key={row.id || rowIndex}
                  className="hover:bg-gray-50/50 transition-colors group"
                >
                  {columns.map((column, colIndex) => (
                    <td
                      key={colIndex}
                      className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap"
                    >
                      {column.render
                        ? column.render(row[column.key], row, rowIndex)
                        : row[column.key]}
                    </td>
                  ))}
                  {(onEdit || onDelete || onView) && (
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        {onView && (
                          <button
                            className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            onClick={() => onView(row)}
                            title="View Details"
                          >
                            <FaEye size={14} />
                          </button>
                        )}
                        {onEdit && (
                          <button
                            className="p-1.5 text-orange-500 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors"
                            onClick={() => onEdit(row)}
                            title="Edit"
                          >
                            <FaEdit size={14} />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            onClick={() => onDelete(row)}
                            title="Delete"
                          >
                            <FaTrash size={14} />
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
                  colSpan={
                    columns.length + (onEdit || onDelete || onView ? 1 : 0)
                  }
                  className="px-6 py-12 text-center"
                >
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-300 text-2xl">
                      📋
                    </div>
                    <div className="text-gray-900 font-semibold mb-1">
                      No Data Available
                    </div>
                    <div className="text-sm text-gray-500 max-w-xs">
                      {emptyMessage}
                    </div>
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
  variant = "primary",
  size = "md",
  children,
  onClick,
  disabled = false,
  className = "",
  ...props
}) => {
  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const variantClasses = {
    primary:
      "bg-primary-600 hover:bg-primary-700 text-white shadow-sm shadow-primary-500/20 disabled:bg-primary-400",
    secondary:
      "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-sm disabled:bg-gray-50 disabled:text-gray-400",
    success:
      "bg-success-600 hover:bg-success-700 text-white shadow-sm shadow-success-500/20 disabled:bg-success-400",
    danger:
      "bg-danger-600 hover:bg-danger-700 text-white shadow-sm shadow-danger-500/20 disabled:bg-danger-400",
    accent:
      "bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-500/20",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150
        focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500/50 disabled:cursor-not-allowed
        ${variantClasses[variant] || variantClasses.primary}
        ${sizeClasses[size] || sizeClasses.md}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};

/**
 * Modern Status Badge Component
 */
const ModernStatusBadge = ({ status, variant = "default" }) => {
  const getStatusConfig = (status) => {
    const normalizedStatus = status ? status.toLowerCase() : "unknown";

    switch (normalizedStatus) {
      case "active":
      case "available":
      case "completed":
      case "success":
      case "paid":
        return {
          bg: "bg-emerald-500/10",
          text: "text-emerald-700",
          border: "border-emerald-500/20",
          icon: "●",
        };
      case "pending":
      case "allocated":
      case "warning":
      case "partially_paid":
        return {
          bg: "bg-amber-500/10",
          text: "text-amber-700",
          border: "border-amber-500/20",
          icon: "●",
        };
      case "inactive":
      case "unavailable":
      case "cancelled":
      case "danger":
      case "unpaid":
        return {
          bg: "bg-rose-500/10",
          text: "text-rose-700",
          border: "border-rose-500/20",
          icon: "●",
        };
      case "in-use":
      case "on-delivery":
      case "info":
        return {
          bg: "bg-blue-500/10",
          text: "text-blue-700",
          border: "border-blue-500/20",
          icon: "●",
        };
      case "maintenance":
        return {
          bg: "bg-gray-500/10",
          text: "text-gray-700",
          border: "border-gray-500/20",
          icon: "●",
        };
      default:
        return {
          bg: "bg-gray-100",
          text: "text-gray-600",
          border: "border-gray-200",
          icon: "●",
        };
    }
  };

  const { bg, text, border, icon } = getStatusConfig(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${bg} ${text} ${border}`}
    >
      <span className="text-[10px] opacity-75">{icon}</span>
      <span className="capitalize">{status || "Unknown"}</span>
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
  className = "",
  loading = false,
}) => {
  if (loading) {
    return (
      <div
        className={`bg-white rounded-xl border border-gray-100 shadow-card p-12 text-center ${className}`}
      >
        <div className="animate-spin w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full mx-auto mb-4"></div>
        <span className="text-gray-500 font-medium">Loading data...</span>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden flex flex-col ${className}`}
    >
      {(title || subtitle || onAdd) && (
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-4">
          <div>
            {title && (
              <h3 className="text-lg font-bold text-gray-800 leading-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-gray-500 mt-1 font-medium">
                {subtitle}
              </p>
            )}
          </div>
          {onAdd && (
            <ModernButton variant="primary" size="sm" onClick={onAdd}>
              <FaPlus className="mr-2" />
              Add New
            </ModernButton>
          )}
        </div>
      )}

      <div className="p-6">
        {data.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.map((item, index) => (
              <div key={item.id || index} className="w-full">
                {renderCard ? (
                  renderCard(item, index)
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                    <h5 className="font-bold text-gray-900 mb-2">
                      {item.name || item.title}
                    </h5>
                    <p className="text-gray-600 text-sm">{item.description}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300 text-2xl">
              📋
            </div>
            <div className="text-gray-900 font-semibold mb-1">
              No Data Available
            </div>
            <div className="text-sm text-gray-500 max-w-xs mx-auto">
              {emptyMessage}
            </div>
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
  className = "",
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
    <div
      className={`flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 ${className}`}
    >
      {showInfo && (
        <div className="text-sm text-gray-500 font-medium">
          Page{" "}
          <span className="font-semibold text-gray-900">{currentPage}</span> of{" "}
          <span className="font-semibold text-gray-900">{totalPages}</span>
        </div>
      )}

      <div className="flex items-center gap-1.5 p-1 bg-white border border-gray-200 rounded-lg shadow-sm">
        <ModernButton
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="border-none !shadow-none !px-2"
        >
          <TbChevronLeft size={16} />
        </ModernButton>

        {getPageNumbers().map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`
              w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-all
              ${
                page === currentPage
                  ? "bg-primary-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }
            `}
          >
            {page}
          </button>
        ))}

        <ModernButton
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="border-none !shadow-none !px-2"
        >
          <TbChevronRight size={16} />
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
  ModernPagination,
};

export default ModernTable;
