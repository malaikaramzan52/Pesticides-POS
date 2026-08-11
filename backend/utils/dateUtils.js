const isItemInDateRange = (itemDateStr, startDateStr, endDateStr) => {
  if (!itemDateStr) return false;
  if (!startDateStr && !endDateStr) return true;

  const itemDate = new Date(itemDateStr);
  itemDate.setHours(0, 0, 0, 0);

  if (startDateStr) {
    const start = new Date(startDateStr);
    start.setHours(0, 0, 0, 0);
    if (itemDate < start) return false;
  }

  if (endDateStr) {
    const end = new Date(endDateStr);
    end.setHours(23, 59, 59, 999);
    if (itemDate > end) return false;
  }

  return true;
};

const formatDateISO = (date = new Date()) => {
  return date.toISOString().split('T')[0];
};

module.exports = {
  isItemInDateRange,
  formatDateISO
};
