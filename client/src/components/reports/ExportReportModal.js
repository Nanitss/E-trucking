import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
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
  TbFileExport,
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
    { id: "deliveries", label: "Deliveries", icon: TbPackage, color: "#f59e0b" },
    { id: "clients", label: "Clients", icon: TbBuilding, color: "#ef4444" },
    { id: "staff", label: "Staff", icon: TbClipboard, color: "#06b6d4" },
    { id: "billings", label: "Billings", icon: TbReceipt, color: "#ec4899" },
  ];

  useEffect(() => {
    setFilters({});
    setRecordCount(0);
    setPreviewData(null);
  }, [activeTab]);

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

      if (activeTab === "all") {
        const entityTypes = ["trucks", "drivers", "helpers", "deliveries", "clients", "staff", "billings"];
        const promises = entityTypes.map((type) =>
          axios.get(`/api/reports/${type}/count`, { headers }).catch(() => ({ data: { count: 0 } }))
        );

        const results = await Promise.all(promises);
        const totalCount = results.reduce((sum, res) => sum + (res.data.count || 0), 0);

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
        const response = await axios.get(`/api/reports/${activeTab}/count?${queryParams}`, { headers });
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

      if (activeTab === "all") {
        const entityTypes = ["trucks", "drivers", "helpers", "deliveries", "clients", "staff", "billings"];
        const promises = entityTypes.map((type) =>
          axios.get(`/api/reports/${type}`, { headers }).catch(() => ({ data: { data: [] } }))
        );

        const results = await Promise.all(promises);

        for (let i = 0; i < entityTypes.length; i++) {
          if (results[i].data.data && results[i].data.data.length > 0) {
            await exportToPDFWithCharts(results[i].data, {
              reportType: entityTypes[i],
              filters: {},
              recordCount: results[i].data.data.length,
            });
          }
        }

        alert(`✅ All records exported successfully! (${recordCount} total records across 7 PDFs)`);
      } else {
        const queryParams = new URLSearchParams(filters).toString();
        const response = await axios.get(`/api/reports/${activeTab}?${queryParams}`, { headers });

        await exportToPDFWithCharts(response.data, {
          reportType: activeTab,
          filters: filters,
          recordCount: recordCount,
        });

        alert(`✅ ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} report exported successfully! (${recordCount} records)`);
      }
    } catch (error) {
      console.error("Error exporting PDF:", error);
      alert("❌ Failed to export report. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderFilterForm = () => {
    const filterProps = { filters, onChange: handleFilterChange };

    switch (activeTab) {
      case "all":
        return (
          <div className="flex items-center justify-center h-full min-h-[280px]">
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center">
                <TbFileExport size={32} className="text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Export All Records</h3>
              <p className="text-gray-500 text-sm mb-4">
                This will export <span className="font-semibold text-gray-700">all records</span> from all entity types into separate PDF files.
              </p>
              <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto text-left">
                {["Trucks", "Drivers", "Helpers", "Deliveries", "Clients", "Staff", "Billings"].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-5 h-5 rounded-full bg-success-100 text-success-600 flex items-center justify-center text-xs">✓</span>
                    {item} Report
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-4 bg-gray-50 rounded-lg px-3 py-2 inline-block">
                📥 7 PDF files will be generated and downloaded automatically.
              </p>
            </div>
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

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto" onClick={onClose}>
      {/* Backdrop - no blur */}
      <div className="fixed inset-0 bg-black/50" />

      {/* Modal positioning container - centered */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
          style={{ animation: 'modal-enter 0.2s ease-out forwards' }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <TbFileExport size={22} />
                Export Report
              </h2>
              <p className="text-primary-100 text-sm mt-0.5">Select report type and apply filters</p>
            </div>
            <button
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              onClick={onClose}
            >
              <TbX size={20} />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-100 bg-gray-50/50 px-4 py-2 overflow-x-auto hide-scrollbar flex-shrink-0">
            <div className="flex gap-1 min-w-max">
              {reportTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    className={`flex items-center gap-.5 px-2.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${isActive
                      ? "bg-white shadow-md text-gray-800 border border-gray-200"
                      : "text-gray-500 hover:text-gray-700 hover:bg-white/60"
                      }`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon size={18} style={{ color: isActive ? tab.color : undefined }} />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Filter Section */}
              <div className="lg:col-span-2">
                <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                      <span className="w-1.5 h-5 bg-primary-500 rounded-full"></span>
                      Filters
                    </h3>
                    {activeTab !== "all" && (
                      <button
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-all"
                        onClick={handleResetFilters}
                      >
                        <TbRefresh size={14} />
                        Reset
                      </button>
                    )}
                  </div>
                  <div className="min-h-[180px]">
                    {renderFilterForm()}
                  </div>
                </div>
              </div>

              {/* Preview Section */}
              <div className="lg:col-span-1">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 p-4 h-full">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-success-500 rounded-full"></span>
                    Preview
                  </h3>

                  {/* Record Count */}
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
                    <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Records Found</span>
                    <div className="text-3xl font-bold text-gray-800 mt-1">
                      {isLoading ? (
                        <span className="inline-block w-16 h-8 bg-gray-200 animate-pulse rounded"></span>
                      ) : (
                        recordCount.toLocaleString()
                      )}
                    </div>
                  </div>

                  {/* Summary */}
                  {previewData && (
                    <div className="space-y-2">
                      <h4 className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Summary</h4>
                      {Object.entries(previewData).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 text-sm border border-gray-100">
                          <span className="text-gray-600">{key}</span>
                          <span className="font-semibold text-gray-800">{value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 bg-gray-50/50 px-6 py-4 flex items-center justify-end gap-3 flex-shrink-0">
            <button
              className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-all ${isLoading || recordCount === 0
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40"
                }`}
              onClick={handleExportPDF}
              disabled={isLoading || recordCount === 0}
            >
              <TbDownload size={18} />
              {isLoading ? "Generating..." : `Export PDF (${recordCount} records)`}
            </button>
          </div>
        </div>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes modal-enter {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>,
    document.body
  );
};

export default ExportReportModal;
