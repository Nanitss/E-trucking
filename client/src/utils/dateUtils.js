// Format date to YYYY-MM-DD
export const formatDate = (date) => {
  const d = new Date(date);
  let month = '' + (d.getMonth() + 1);
  let day = '' + d.getDate();
  const year = d.getFullYear();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;

  return [year, month, day].join('-');
};

// Format date to locale string
export const formatDateLocale = (date) => {
  return new Date(date).toLocaleDateString();
};

// Get current date
export const getCurrentDate = () => {
  return formatDate(new Date());
};

// Calculate days between two dates
export const daysBetween = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Format date and time
export const formatDateTime = (date) => {
  const d = new Date(date);
  return d.toLocaleString();
};

// Get date range for the past days
export const getDateRangeForPastDays = (days) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate)
  };
};