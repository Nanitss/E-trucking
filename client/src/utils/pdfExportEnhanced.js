// Enhanced PDF Export with Charts, Graphs, and Professional Styling
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Company branding colors
const COLORS = {
  primary: [74, 111, 165],
  secondary: [90, 127, 181],
  success: [16, 185, 129],
  warning: [245, 158, 11],
  danger: [239, 68, 68],
  info: [6, 182, 212],
  dark: [30, 41, 59],
  gray: [100, 116, 139],
  lightGray: [241, 245, 249]
};

/**
 * Add company logo and branding header to PDF
 */
const addHeader = (doc, title, subtitle) => {
  // Header background
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, 210, 45, 'F');
  
  // Company logo (E-TRUCKING text logo)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('E-TRUCKING', 20, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('MANAGEMENT SYSTEM', 20, 27);
  
  // Report title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 20, 38);
  
  // Subtitle/date
  if (subtitle) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, 170, 20, { align: 'right' });
  }
  
  // Generation timestamp
  const now = new Date().toLocaleString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.setFontSize(8);
  doc.text(`Generated: ${now}`, 170, 27, { align: 'right' });
};

/**
 * Add footer with page numbers
 */
const addFooter = (doc) => {
  const pageCount = doc.internal.getNumberOfPages();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Footer line
    doc.setDrawColor(...COLORS.gray);
    doc.setLineWidth(0.5);
    doc.line(20, 280, 190, 280);
    
    // Footer text
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.gray);
    doc.text('E-Trucking Management System', 20, 285);
    doc.text(`Page ${i} of ${pageCount}`, 190, 285, { align: 'right' });
    doc.text('Confidential Report', 105, 285, { align: 'center' });
  }
};

/**
 * Create a simple bar chart
 */
const drawBarChart = (doc, data, config, startY) => {
  const { labels, values, title, colors } = config;
  const chartX = 20;
  const chartY = startY;
  const chartWidth = 170;
  const chartHeight = 50;
  const barWidth = (chartWidth - (labels.length - 1) * 5) / labels.length;
  const maxValue = Math.max(...values);
  
  // Chart title
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  doc.text(title, chartX, chartY);
  
  // Draw bars
  labels.forEach((label, index) => {
    const barHeight = (values[index] / maxValue) * (chartHeight - 15);
    const x = chartX + (barWidth + 5) * index;
    const y = chartY + 10 + (chartHeight - 15 - barHeight);
    
    // Bar
    doc.setFillColor(...(colors[index] || COLORS.primary));
    doc.rect(x, y, barWidth, barHeight, 'F');
    
    // Value on top of bar
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.dark);
    doc.text(values[index].toString(), x + barWidth / 2, y - 2, { align: 'center' });
    
    // Label below bar
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.gray);
    const labelText = label.length > 10 ? label.substring(0, 8) + '...' : label;
    doc.text(labelText, x + barWidth / 2, chartY + chartHeight + 2, { 
      align: 'center', 
      maxWidth: barWidth 
    });
  });
  
  return chartY + chartHeight + 10;
};

/**
 * Create a pie chart
 */
const drawPieChart = (doc, data, config, startX, startY) => {
  const { labels, values, title, colors } = config;
  const centerX = startX + 35;
  const centerY = startY + 30;
  const radius = 25;
  const total = values.reduce((a, b) => a + b, 0);
  
  // Chart title
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  doc.text(title, startX, startY);
  
  let currentAngle = -90;
  
  values.forEach((value, index) => {
    const sliceAngle = (value / total) * 360;
    
    // Draw slice
    doc.setFillColor(...(colors[index] || COLORS.primary));
    doc.circle(centerX, centerY, radius, 'F');
    
    // This is simplified - for proper pie slices, you'd need arc drawing
    // For now, we'll create a legend instead
    currentAngle += sliceAngle;
  });
  
  // Legend
  let legendY = startY + 10;
  labels.forEach((label, index) => {
    const legendX = startX + 75;
    const percentage = ((values[index] / total) * 100).toFixed(1);
    
    // Color box
    doc.setFillColor(...(colors[index] || COLORS.primary));
    doc.rect(legendX, legendY - 3, 4, 4, 'F');
    
    // Label and value
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.dark);
    doc.text(`${label}: ${values[index]} (${percentage}%)`, legendX + 6, legendY);
    
    legendY += 6;
  });
  
  return startY + 70;
};

/**
 * Add summary statistics boxes
 */
const addSummaryBoxes = (doc, summaryData, startY) => {
  const boxWidth = 50;
  const boxHeight = 28;
  const spacing = 6;
  const leftMargin = 20;
  const rightMargin = 20;
  const pageWidth = 210; // A4 width in mm
  const maxWidth = pageWidth - leftMargin - rightMargin;
  const boxesPerRow = Math.floor((maxWidth + spacing) / (boxWidth + spacing));
  
  let currentX = leftMargin;
  let currentY = startY;
  
  summaryData.forEach((item, index) => {
    // Move to next row if needed
    if (index > 0 && index % boxesPerRow === 0) {
      currentX = leftMargin;
      currentY += boxHeight + spacing;
    }
    
    // Box background
    doc.setFillColor(...COLORS.lightGray);
    doc.roundedRect(currentX, currentY, boxWidth, boxHeight, 3, 3, 'F');
    
    // Border
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(0.5);
    doc.roundedRect(currentX, currentY, boxWidth, boxHeight, 3, 3, 'S');
    
    // Value
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text(item.value.toString(), currentX + boxWidth / 2, currentY + 14, { align: 'center' });
    
    // Label
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.gray);
    doc.text(item.label, currentX + boxWidth / 2, currentY + 22, { 
      align: 'center',
      maxWidth: boxWidth - 6
    });
    
    currentX += boxWidth + spacing;
  });
  
  // Calculate total height used
  const rows = Math.ceil(summaryData.length / boxesPerRow);
  const totalHeight = rows * boxHeight + (rows - 1) * spacing;
  
  return startY + totalHeight + 10;
};

/**
 * Generate report configuration based on report type
 */
const getReportConfig = (reportType, data) => {
  switch (reportType) {
    case 'trucks':
      return {
        title: 'Trucks Report',
        columns: [
          { header: 'Plate Number', dataKey: 'truckPlate' },
          { header: 'Brand', dataKey: 'truckBrand' },
          { header: 'Type', dataKey: 'truckType' },
          { header: 'Capacity', dataKey: 'truckCapacity' },
          { header: 'Status', dataKey: 'truckStatus' },
          { header: 'Kilometers', dataKey: 'truckKilometers' },
          { header: 'Model Year', dataKey: 'modelYear' }
        ],
        charts: generateTruckCharts(data)
      };
    
    case 'drivers':
      return {
        title: 'Drivers Report',
        columns: [
          { header: 'Name', dataKey: 'driverName' },
          { header: 'Contact', dataKey: 'driverContact' },
          { header: 'License Number', dataKey: 'licenseNumber' },
          { header: 'License Type', dataKey: 'licenseType' },
          { header: 'Status', dataKey: 'driverStatus' },
          { header: 'License Expiry', dataKey: 'licenseExpiry' },
          { header: 'Employment Date', dataKey: 'employmentDate' }
        ],
        charts: generateDriverCharts(data)
      };
    
    case 'helpers':
      return {
        title: 'Helpers Report',
        columns: [
          { header: 'Name', dataKey: 'helperName' },
          { header: 'Contact', dataKey: 'helperContact' },
          { header: 'ID Type', dataKey: 'idType' },
          { header: 'ID Number', dataKey: 'idNumber' },
          { header: 'Status', dataKey: 'helperStatus' },
          { header: 'ID Expiry', dataKey: 'idExpiry' },
          { header: 'Join Date', dataKey: 'joinDate' }
        ],
        charts: generateHelperCharts(data)
      };
    
    case 'deliveries':
      return {
        title: 'Deliveries Report',
        columns: [
          { header: 'Delivery ID', dataKey: 'deliveryId' },
          { header: 'Client', dataKey: 'clientName' },
          { header: 'Truck', dataKey: 'truckPlate' },
          { header: 'Driver', dataKey: 'driverName' },
          { header: 'Status', dataKey: 'deliveryStatus' },
          { header: 'Distance (km)', dataKey: 'deliveryDistance' },
          { header: 'Amount', dataKey: 'totalAmount' },
          { header: 'Date', dataKey: 'deliveryDate' }
        ],
        charts: generateDeliveryCharts(data)
      };
    
    case 'clients':
      return {
        title: 'Clients Report',
        columns: [
          { header: 'Client Name', dataKey: 'clientName' },
          { header: 'Company', dataKey: 'companyName' },
          { header: 'Contact', dataKey: 'clientContact' },
          { header: 'Email', dataKey: 'clientEmail' },
          { header: 'Business Type', dataKey: 'businessType' },
          { header: 'Status', dataKey: 'clientStatus' },
          { header: 'Registration Date', dataKey: 'registrationDate' }
        ],
        charts: generateClientCharts(data)
      };
    
    case 'staff':
      return {
        title: 'Staff Report',
        columns: [
          { header: 'Name', dataKey: 'staffName' },
          { header: 'Role', dataKey: 'staffRole' },
          { header: 'Department', dataKey: 'department' },
          { header: 'Contact', dataKey: 'staffContact' },
          { header: 'Email', dataKey: 'staffEmail' },
          { header: 'Status', dataKey: 'staffStatus' },
          { header: 'Join Date', dataKey: 'joinDate' }
        ],
        charts: generateStaffCharts(data)
      };
    
    case 'billings':
      return {
        title: 'Billings Report',
        columns: [
          { header: 'Delivery ID', dataKey: 'deliveryId' },
          { header: 'Client Name', dataKey: 'clientName' },
          { header: 'Amount', dataKey: 'amount' },
          { header: 'Currency', dataKey: 'currency' },
          { header: 'Status', dataKey: 'status' },
          { header: 'Delivery Date', dataKey: 'deliveryDate' },
          { header: 'Due Date', dataKey: 'dueDate' },
          { header: 'Truck Plate', dataKey: 'truckPlate' }
        ],
        charts: generateBillingCharts(data)
      };
    
    default:
      return {
        title: 'Report',
        columns: [],
        charts: null
      };
  }
};

/**
 * Chart generation functions for each report type
 */
const generateTruckCharts = (data) => {
  // Status distribution
  const statusCount = {};
  data.forEach(truck => {
    const status = truck.truckStatus || truck.TruckStatus || 'Unknown';
    statusCount[status] = (statusCount[status] || 0) + 1;
  });
  
  // Type distribution
  const typeCount = {};
  data.forEach(truck => {
    const type = truck.truckType || truck.TruckType || 'Unknown';
    typeCount[type] = (typeCount[type] || 0) + 1;
  });
  
  return {
    summary: [
      { label: 'Total Trucks', value: data.length },
      { label: 'Available', value: statusCount['available'] || 0 },
      { label: 'In Use', value: statusCount['in-use'] || 0 },
      { label: 'Maintenance', value: statusCount['maintenance'] || 0 }
    ],
    barChart: {
      title: 'Trucks by Type',
      labels: Object.keys(typeCount),
      values: Object.values(typeCount),
      colors: [COLORS.primary, COLORS.success, COLORS.warning, COLORS.info, COLORS.danger]
    },
    pieChart: {
      title: 'Status Distribution',
      labels: Object.keys(statusCount),
      values: Object.values(statusCount),
      colors: [COLORS.success, COLORS.warning, COLORS.danger, COLORS.gray]
    }
  };
};

const generateDriverCharts = (data) => {
  const statusCount = {};
  data.forEach(driver => {
    const status = driver.DriverStatus || 'Unknown';
    statusCount[status] = (statusCount[status] || 0) + 1;
  });
  
  return {
    summary: [
      { label: 'Total Drivers', value: data.length },
      { label: 'Active', value: statusCount['active'] || 0 },
      { label: 'Inactive', value: statusCount['inactive'] || 0 },
      { label: 'On Leave', value: statusCount['on-leave'] || 0 }
    ],
    barChart: {
      title: 'Driver Status Distribution',
      labels: Object.keys(statusCount),
      values: Object.values(statusCount),
      colors: [COLORS.success, COLORS.gray, COLORS.warning, COLORS.danger]
    }
  };
};

const generateHelperCharts = (data) => {
  const statusCount = {};
  data.forEach(helper => {
    const status = helper.HelperStatus || 'Unknown';
    statusCount[status] = (statusCount[status] || 0) + 1;
  });
  
  return {
    summary: [
      { label: 'Total Helpers', value: data.length },
      { label: 'Active', value: statusCount['active'] || 0 },
      { label: 'Inactive', value: statusCount['inactive'] || 0 },
      { label: 'On Leave', value: statusCount['on-leave'] || 0 }
    ],
    barChart: {
      title: 'Helper Status Distribution',
      labels: Object.keys(statusCount),
      values: Object.values(statusCount),
      colors: [COLORS.success, COLORS.gray, COLORS.warning]
    }
  };
};

const generateDeliveryCharts = (data) => {
  const statusCount = {};
  data.forEach(delivery => {
    const status = delivery.DeliveryStatus || 'Unknown';
    statusCount[status] = (statusCount[status] || 0) + 1;
  });
  
  const totalRevenue = data.reduce((sum, d) => sum + (parseFloat(d.TotalAmount) || 0), 0);
  const totalDistance = data.reduce((sum, d) => sum + (parseFloat(d.DeliveryDistance) || 0), 0);
  
  return {
    summary: [
      { label: 'Total Deliveries', value: data.length },
      { label: 'Completed', value: statusCount['completed'] || 0 },
      { label: 'In Progress', value: statusCount['in-progress'] || 0 },
      { label: 'Revenue (₱)', value: totalRevenue.toLocaleString() }
    ],
    barChart: {
      title: 'Delivery Status Distribution',
      labels: Object.keys(statusCount),
      values: Object.values(statusCount),
      colors: [COLORS.warning, COLORS.info, COLORS.success, COLORS.danger]
    },
    pieChart: {
      title: 'Status Breakdown',
      labels: Object.keys(statusCount),
      values: Object.values(statusCount),
      colors: [COLORS.warning, COLORS.info, COLORS.success, COLORS.danger]
    }
  };
};

const generateClientCharts = (data) => {
  const statusCount = {};
  const businessTypeCount = {};
  
  data.forEach(client => {
    const status = client.ClientStatus || 'Unknown';
    statusCount[status] = (statusCount[status] || 0) + 1;
    
    const businessType = client.BusinessType || 'Unknown';
    businessTypeCount[businessType] = (businessTypeCount[businessType] || 0) + 1;
  });
  
  return {
    summary: [
      { label: 'Total Clients', value: data.length },
      { label: 'Active', value: statusCount['active'] || 0 },
      { label: 'Inactive', value: statusCount['inactive'] || 0 },
      { label: 'Business Types', value: Object.keys(businessTypeCount).length }
    ],
    barChart: {
      title: 'Clients by Business Type',
      labels: Object.keys(businessTypeCount).slice(0, 5),
      values: Object.values(businessTypeCount).slice(0, 5),
      colors: [COLORS.primary, COLORS.success, COLORS.warning, COLORS.info, COLORS.danger]
    }
  };
};

const generateStaffCharts = (data) => {
  const roleCount = {};
  const statusCount = {};
  
  data.forEach(staff => {
    const role = staff.StaffRole || 'Unknown';
    roleCount[role] = (roleCount[role] || 0) + 1;
    
    const status = staff.StaffStatus || 'Unknown';
    statusCount[status] = (statusCount[status] || 0) + 1;
  });
  
  return {
    summary: [
      { label: 'Total Staff', value: data.length },
      { label: 'Active', value: statusCount['active'] || 0 },
      { label: 'Departments', value: Object.keys(roleCount).length },
      { label: 'On Leave', value: statusCount['on-leave'] || 0 }
    ],
    barChart: {
      title: 'Staff by Role',
      labels: Object.keys(roleCount).slice(0, 6),
      values: Object.values(roleCount).slice(0, 6),
      colors: [COLORS.primary, COLORS.success, COLORS.warning, COLORS.info, COLORS.danger, COLORS.secondary]
    }
  };
};

const generateBillingCharts = (data) => {
  const statusCount = {};
  let totalAmount = 0;
  let totalPaid = 0;
  let totalOverdue = 0;
  let totalPending = 0;
  
  data.forEach(billing => {
    const status = billing.status || 'pending';
    statusCount[status] = (statusCount[status] || 0) + 1;
    
    const amount = parseFloat(billing.amount) || 0;
    totalAmount += amount;
    
    if (status === 'paid') {
      totalPaid += amount;
    } else if (status === 'overdue') {
      totalOverdue += amount;
    } else if (status === 'pending') {
      totalPending += amount;
    }
  });
  
  return {
    summary: [
      { label: 'Total Billings', value: data.length },
      { label: 'Total Amount', value: `₱${totalAmount.toLocaleString()}` },
      { label: 'Paid', value: statusCount['paid'] || 0 },
      { label: 'Pending', value: statusCount['pending'] || 0 },
      { label: 'Overdue', value: statusCount['overdue'] || 0 },
      { label: 'Amount Paid', value: `₱${totalPaid.toLocaleString()}` }
    ],
    barChart: {
      title: 'Payment Amount by Status',
      labels: ['Paid', 'Pending', 'Overdue'],
      values: [totalPaid, totalPending, totalOverdue],
      colors: [COLORS.success, COLORS.warning, COLORS.danger]
    },
    pieChart: {
      title: 'Payment Status Distribution',
      labels: Object.keys(statusCount),
      values: Object.values(statusCount),
      colors: [COLORS.success, COLORS.warning, COLORS.danger, COLORS.gray]
    }
  };
};

/**
 * Main export function
 */
export const exportToPDFWithCharts = (data, options) => {
  const { reportType, filters, recordCount } = options;
  
  // Debug: Log the data structure
  console.log('📊 PDF Export Data:', data);
  console.log('📊 Report Type:', reportType);
  console.log('📊 First Record:', (data.data || data)[0]);
  
  const config = getReportConfig(reportType, data.data || data);
  
  // Create PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // Add header with branding
  const filterSummary = Object.keys(filters).length > 0 
    ? `Filtered: ${Object.keys(filters).length} criteria applied`
    : 'All Records';
  addHeader(doc, config.title, filterSummary);
  
  let currentY = 55;
  
  // Add summary boxes
  if (config.charts && config.charts.summary) {
    currentY = addSummaryBoxes(doc, config.charts.summary, currentY);
    currentY += 10;
  }
  
  // Add bar chart
  if (config.charts && config.charts.barChart) {
    currentY = drawBarChart(doc, data, config.charts.barChart, currentY);
    currentY += 5;
  }
  
  // Add pie chart (on new page if needed)
  if (config.charts && config.charts.pieChart && currentY > 180) {
    doc.addPage();
    addHeader(doc, config.title, filterSummary);
    currentY = 55;
  }
  
  if (config.charts && config.charts.pieChart) {
    currentY = drawPieChart(doc, data, config.charts.pieChart, 20, currentY);
  }
  
  // Add data table
  doc.addPage();
  addHeader(doc, config.title, filterSummary);
  
  autoTable(doc, {
    startY: 50,
    head: [config.columns.map(col => col.header)],
    body: (data.data || data).map(row => 
      config.columns.map(col => {
        const value = row[col.dataKey];
        if (value === null || value === undefined) return '';
        if (col.dataKey.includes('Date') && value) {
          return new Date(value).toLocaleDateString('en-PH');
        }
        if (col.dataKey.includes('Amount') && value) {
          return `₱${parseFloat(value).toLocaleString()}`;
        }
        return String(value);
      })
    ),
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: COLORS.dark
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { top: 50, left: 20, right: 20 },
    didDrawPage: (data) => {
      // Add page numbers will be done in footer
    }
  });
  
  // Add footer to all pages
  addFooter(doc);
  
  // Generate filename
  const date = new Date().toISOString().split('T')[0];
  const filename = `${reportType}_report_${date}.pdf`;
  
  // Save PDF
  doc.save(filename);
  
  return true;
};
