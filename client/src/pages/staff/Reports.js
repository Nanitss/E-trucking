// src/pages/staff/Reports.js
import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FaArrowLeft, FaDownload, FaChartBar, FaClock } from 'react-icons/fa';
import Loader from '../../components/common/Loader';
import { AlertContext } from '../../context/AlertContext';
import './Reports.css';
import '../../styles/DesignSystem.css';

const Reports = () => {
  const { showAlert } = useContext(AlertContext);
  const [reportType, setReportType] = useState('client');
  const [dateRange, setDateRange]   = useState({ startDate: '', endDate: '' });
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading]   = useState(false);
  const [summary, setSummary]       = useState({
    totalDeliveries: 0,
    totalDistance:   0,
    totalRevenue:    0,
    activeClients:   0
  });

  // initialize last 30 days
  useEffect(() => {
    const today = new Date();
    const ago30 = new Date();
    ago30.setDate(today.getDate() - 30);
    setDateRange({
      startDate: ago30.toISOString().split('T')[0],
      endDate:   today.toISOString().split('T')[0]
    });
  }, []);

  const handleReportTypeChange = (type) => {
    setReportType(type);
    setReportData(null);
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(dr => ({ ...dr, [name]: value }));
  };

  const generateReport = async () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      showAlert('Please select both start and end dates', 'warning');
      return;
    }
    setIsLoading(true);
    try {
      const res = await axios.get(`/api/staffs/reports/${reportType}`, {
        params: dateRange
      });
      setReportData(res.data.data);
      setSummary(res.data.summary);
    } catch (error) {
      console.error('Error generating report:', error);
      showAlert('Error generating report', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadReport = () => {
    if (!reportData) {
      showAlert('No report data to download', 'warning');
      return;
    }
    let csvContent = '';

    // Build CSV headers & rows per report type
    if (reportType === 'client') {
      csvContent = 'Client ID,Client Name,Deliveries,Total Distance,Total Revenue\n';
      reportData.forEach(c => {
        csvContent += `${c.ClientID},${c.ClientName},${c.DeliveryCount},${c.TotalDistance.toFixed(2)},${c.TotalRevenue.toFixed(2)}\n`;
      });
    } else if (reportType === 'delivery') {
      csvContent = 'Delivery ID,Client,Driver,Date,Status,Distance,Rate\n';
      reportData.forEach(d => {
        const date = new Date(d.DeliveryDate).toLocaleDateString();
        csvContent += `${d.DeliveryID},${d.ClientName},${d.DriverName},${date},${d.DeliveryStatus},${d.DeliveryDistance},${d.DeliveryRate}\n`;
      });
    } else if (reportType === 'truck') {
      csvContent = 'Truck ID,Plate,Type,Deliveries,Total Distance,Utilization (%)\n';
      reportData.forEach(t => {
        csvContent += `${t.TruckID},${t.TruckPlate},${t.TruckType},${t.DeliveryCount},${t.TotalDistance.toFixed(2)},${t.Utilization}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url  = window.URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${reportType}_report_${dateRange.startDate}_to_${dateRange.endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    showAlert('Report downloaded successfully', 'success');
  };

  const renderReport = () => {
    if (!reportData) {
      return (
        <div className="report-placeholder">
          <FaChartBar size={50} />
          <p>Generate a report to view data</p>
        </div>
      );
    }

    // CLIENT REPORT
    if (reportType === 'client') {
      return (
        <div className="report-container">
          <div className="report-summary">
            <div className="summary-card">
              <div className="summary-icon"><FaChartBar /></div>
              <div className="summary-data">
                <h3>{summary.activeClients}</h3>
                <p>Active Clients</p>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon"><FaChartBar /></div>
              <div className="summary-data">
                <h3>{summary.totalDeliveries}</h3>
                <p>Total Deliveries</p>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon"><FaClock /></div>
              <div className="summary-data">
                <h3>${summary.totalRevenue.toFixed(2)}</h3>
                <p>Total Revenue</p>
              </div>
            </div>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client ID</th>
                  <th>Client Name</th>
                  <th>Deliveries</th>
                  <th>Total Distance</th>
                  <th>Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map(c => (
                  <tr key={c.ClientID}>
                    <td>{c.ClientID}</td>
                    <td>{c.ClientName}</td>
                    <td>{c.DeliveryCount}</td>
                    <td>{c.TotalDistance.toFixed(2)} km</td>
                    <td>${c.TotalRevenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // DELIVERY REPORT
    if (reportType === 'delivery') {
      return (
        <div className="report-container">
          <div className="report-summary">
            <div className="summary-card">
              <div className="summary-icon"><FaChartBar /></div>
              <div className="summary-data">
                <h3>{reportData.length}</h3>
                <p>Total Deliveries</p>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon"><FaChartBar /></div>
              <div className="summary-data">
                <h3>{summary.totalDistance.toFixed(2)} km</h3>
                <p>Total Distance</p>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon"><FaClock /></div>
              <div className="summary-data">
                <h3>${summary.totalRevenue.toFixed(2)}</h3>
                <p>Total Revenue</p>
              </div>
            </div>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Delivery ID</th>
                  <th>Client</th>
                  <th>Driver</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Distance</th>
                  <th>Rate</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map(d => (
                  <tr key={d.DeliveryID}>
                    <td>{d.DeliveryID}</td>
                    <td>{d.ClientName}</td>
                    <td>{d.DriverName}</td>
                    <td>{new Date(d.DeliveryDate).toLocaleDateString()}</td>
                    <td>{d.DeliveryStatus}</td>
                    <td>{d.DeliveryDistance} km</td>
                    <td>${d.DeliveryRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // TRUCK UTILIZATION
    if (reportType === 'truck') {
      return (
        <div className="report-container">
          <div className="report-summary">
            <div className="summary-card">
              <div className="summary-icon"><FaChartBar /></div>
              <div className="summary-data">
                <h3>{reportData.length}</h3>
                <p>Active Trucks</p>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon"><FaChartBar /></div>
              <div className="summary-data">
                <h3>{summary.totalDeliveries}</h3>
                <p>Total Deliveries</p>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon"><FaClock /></div>
              <div className="summary-data">
                <h3>{summary.totalDistance.toFixed(2)} km</h3>
                <p>Total Distance</p>
              </div>
            </div>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Truck ID</th>
                  <th>Plate</th>
                  <th>Type</th>
                  <th>Deliveries</th>
                  <th>Total Distance</th>
                  <th>Utilization</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map(t => (
                  <tr key={t.TruckID}>
                    <td>{t.TruckID}</td>
                    <td>{t.TruckPlate}</td>
                    <td>{t.TruckType}</td>
                    <td>{t.DeliveryCount}</td>
                    <td>{t.TotalDistance.toFixed(2)} km</td>
                    <td>{t.Utilization}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="reports-page">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Reports</h2>
          {/* Fixed the path to match your app.js route - changed from /auth/logout to /logout */}
          <Link to="/logout" className="btn btn-secondary">
            <FaArrowLeft /> Logout
          </Link>
        </div>
        <div className="card-body">
          <div className="report-controls">
            <div className="report-type-selection">
              <h3>Report Type</h3>
              <div className="report-types">
                <button
                  className={`btn ${reportType === 'client' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => handleReportTypeChange('client')}
                >
                  Client Report
                </button>
                <button
                  className={`btn ${reportType === 'delivery' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => handleReportTypeChange('delivery')}
                >
                  Delivery Report
                </button>
                <button
                  className={`btn ${reportType === 'truck' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => handleReportTypeChange('truck')}
                >
                  Truck Utilization
                </button>
              </div>
            </div>
            <div className="date-range-selection">
              <h3>Date Range</h3>
              <div className="date-inputs">
                <div className="form-group">
                  <label htmlFor="startDate">Start Date</label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    className="form-control"
                    value={dateRange.startDate}
                    onChange={handleDateChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="endDate">End Date</label>
                  <input
                    type="date"
                    id="endDate"
                    name="endDate"
                    className="form-control"
                    value={dateRange.endDate}
                    onChange={handleDateChange}
                  />
                </div>
              </div>
              <div className="report-actions">
                <button
                  className="btn btn-primary"
                  onClick={generateReport}
                  disabled={isLoading}
                >
                  {isLoading ? 'Generating...' : 'Generate Report'}
                </button>
                {reportData && (
                  <button
                    className="btn btn-success"
                    onClick={downloadReport}
                  >
                    <FaDownload /> Download Report
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="report-content">
            {isLoading ? <Loader /> : renderReport()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;