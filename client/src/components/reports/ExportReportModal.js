import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  TbX,
  TbTruck,
  TbUser,
  TbUsers,
  TbPackage,
  TbBuilding,
  TbClipboard,
  TbDownload,
  TbRefresh,
  TbReceipt,
} from "react-icons/tb";
import TruckFilters from "./filters/TruckFilters";
import DriverFilters from "./filters/DriverFilters";
import HelperFilters from "./filters/HelperFilters";
import DeliveryFilters from "./filters/DeliveryFilters";
import ClientFilters from "./filters/ClientFilters";
import StaffFilters from "./filters/StaffFilters";
import BillingFilters from "./filters/BillingFilters";
import { exportToPDFWithCharts } from "../../utils/pdfExportEnhanced";

const ExportReportModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState("all");
  const [filters, setFilters] = useState({});
  const [recordCount, setRecordCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  const reportTabs = [
    { id: "all", label: "All Records", icon: TbDownload, color: "#6366f1" },
    { id: "trucks", label: "Trucks", icon: TbTruck, color: "#3b82f6" },
    { id: "drivers", label: "Drivers", icon: TbUser, color: "#10b981" },
    { id: "helpers", label: "Helpers", icon: TbUsers, color: "#8b5cf6" },
    {
      id: "deliveries",
      label: "Deliveries",
      icon: TbPackage,
      color: "#f59e0b",
    },
    { id: "clients", label: "Clients", icon: TbBuilding, color: "#ef4444" },
    { id: "staff", label: "Staff", icon: TbClipboard, color: "#06b6d4" },
    { id: "billings", label: "Billings", icon: TbReceipt, color: "#ec4899" },
  ];

  // Reset filters when tab changes
  useEffect(() => {
    setFilters({});
    setRecordCount(0);
    setPreviewData(null);
  }, [activeTab]);

  // Fetch record count when filters change
  useEffect(() => {
    if (isOpen) {
      fetchRecordCount();
    }
  }, [filters, activeTab, isOpen]);

  const fetchRecordCount = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Handle "All Records" tab
      if (activeTab === "all") {
        // Fetch counts for all entity types
        const entityTypes = [
          "trucks",
          "drivers",
          "helpers",
          "deliveries",
          "clients",
          "staff",
          "billings",
        ];
        const promises = entityTypes.map((type) =>
          axios
            .get(`/api/reports/${type}/count`, { headers })
            .catch(() => ({ data: { count: 0 } })),
        );

        const results = await Promise.all(promises);
        const totalCount = results.reduce(
          (sum, res) => sum + (res.data.count || 0),
          0,
        );

        setRecordCount(totalCount);
        setPreviewData({
          Trucks: results[0].data.count || 0,
          Drivers: results[1].data.count || 0,
          Helpers: results[2].data.count || 0,
          Deliveries: results[3].data.count || 0,
          Clients: results[4].data.count || 0,
          Staff: results[5].data.count || 0,
          Billings: results[6].data.count || 0,
        });
      } else {
        const queryParams = new URLSearchParams(filters).toString();
        const response = await axios.get(
          `/api/reports/${activeTab}/count?${queryParams}`,
          { headers },
        );

        setRecordCount(response.data.count || 0);
        setPreviewData(response.data.preview || null);
      }
    } catch (error) {
      console.error("Error fetching record count:", error);
      setRecordCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    setFilters({});
  };

  const handleExportPDF = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Handle "All Records" export
      if (activeTab === "all") {
        const entityTypes = [
          "trucks",
          "drivers",
          "helpers",
          "deliveries",
          "clients",
          "staff",
          "billings",
        ];
        const promises = entityTypes.map((type) =>
          axios
            .get(`/api/reports/${type}`, { headers })
            .catch(() => ({ data: { data: [] } })),
        );

        const results = await Promise.all(promises);

        // Generate separate PDFs for each entity type
        for (let i = 0; i < entityTypes.length; i++) {
          if (results[i].data.data && results[i].data.data.length > 0) {
            await exportToPDFWithCharts(results[i].data, {
              reportType: entityTypes[i],
              filters: {},
              recordCount: results[i].data.data.length,
            });
          }
        }

        alert(
          `✅ All records exported successfully! (${recordCount} total records across 7 PDFs)`,
        );
      } else {
        // Fetch full data with filters
        const queryParams = new URLSearchParams(filters).toString();
        const response = await axios.get(
          `/api/reports/${activeTab}?${queryParams}`,
          { headers },
        );

        // Generate PDF with charts and graphs
        await exportToPDFWithCharts(response.data, {
          reportType: activeTab,
          filters: filters,
          recordCount: recordCount,
        });

        // Show success message
        alert(
          `✅ ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} report exported successfully! (${recordCount} records)`,
        );
      }
    } catch (error) {
      console.error("Error exporting PDF:", error);
      alert("❌ Failed to export report. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderFilterForm = () => {
    const filterProps = {
      filters,
      onChange: handleFilterChange,
    };

    switch (activeTab) {
      case "all":
        return (
          <div className="all-records-info">
            <div className="info-icon">📊</div>
            <h3>Export All Records</h3>
            <p>
              This will export <strong>all records</strong> from all entity
              types into separate PDF files.
            </p>
            <ul>
              <li>✅ Trucks Report</li>
              <li>✅ Drivers Report</li>
              <li>✅ Helpers Report</li>
              <li>✅ Deliveries Report</li>
              <li>✅ Clients Report</li>
              <li>✅ Staff Report</li>
              <li>✅ Billings Report</li>
            </ul>
            <p className="note">
              Note: 7 PDF files will be generated and downloaded automatically.
            </p>
          </div>
        );
      case "trucks":
        return <TruckFilters {...filterProps} />;
      case "drivers":
        return <DriverFilters {...filterProps} />;
      case "helpers":
        return <HelperFilters {...filterProps} />;
      case "deliveries":
        return <DeliveryFilters {...filterProps} />;
      case "clients":
        return <ClientFilters {...filterProps} />;
      case "staff":
        return <StaffFilters {...filterProps} />;
      case "billings":
        return <BillingFilters {...filterProps} />;
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="export-modal-overlay" onClick={onClose}>
      <div className="export-modal" onClick={(e) => e.stopPropagation()}>
        <div className="export-modal-header">
          <div className="modal-header-content">
            <h2>Export Report</h2>
            <p>Select report type and apply filters</p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <TbX size={24} />
          </button>
        </div>

        <div className="export-modal-tabs">
          {reportTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`export-tab ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  "--tab-color": activeTab === tab.id ? tab.color : "#64748b",
                }}
              >
                <Icon size={20} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="export-modal-body">
          <div className="filter-section">
            <div className="filter-header">
              <h3>Filters</h3>
              <button
                className="reset-filters-btn"
                onClick={handleResetFilters}
              >
                <TbRefresh size={16} />
                Reset
              </button>
            </div>
            <div className="filter-form">{renderFilterForm()}</div>
          </div>

          <div className="preview-section">
            <div className="preview-card">
              <div className="preview-stat">
                <span className="stat-label">Records Found</span>
                <span className="stat-value">
                  {isLoading ? "..." : recordCount.toLocaleString()}
                </span>
              </div>
              {previewData && (
                <div className="preview-summary">
                  <h4>Summary</h4>
                  {Object.entries(previewData).map(([key, value]) => (
                    <div key={key} className="summary-item">
                      <span>{key}:</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="export-modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleExportPDF}
            disabled={isLoading || recordCount === 0}
          >
            <TbDownload size={18} />
            {isLoading
              ? "Generating..."
              : `Export PDF (${recordCount} records)`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportReportModal;
