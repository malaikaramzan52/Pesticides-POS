/**
 * Utility functions for date filtering in ERP modules.
 */

// Helper to format a Date object as YYYY-MM-DD in local time
export function formatDateToYYYYMMDD(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function getPresetRange(preset, customStart = '', customEnd = '') {
  const now = new Date();
  
  // Set time to midday to avoid timezone shifts
  now.setHours(12, 0, 0, 0);

  const todayStr = formatDateToYYYYMMDD(now);
  
  let start = '';
  let end = '';

  switch (preset) {
    case 'Today':
      start = todayStr;
      end = todayStr;
      break;
      
    case 'Yesterday': {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yestStr = formatDateToYYYYMMDD(yesterday);
      start = yestStr;
      end = yestStr;
      break;
    }
    
    case 'This Week': {
      // Start of week: Monday
      const day = now.getDay();
      // adjust day so Monday is 0, Sunday is 6
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const startOfWeek = new Date(now);
      startOfWeek.setDate(diff);
      start = formatDateToYYYYMMDD(startOfWeek);
      end = todayStr;
      break;
    }
    
    case 'This Month': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 12, 0, 0, 0);
      start = formatDateToYYYYMMDD(startOfMonth);
      end = todayStr;
      break;
    }
    
    case 'This Year': {
      const startOfYear = new Date(now.getFullYear(), 0, 1, 12, 0, 0, 0);
      start = formatDateToYYYYMMDD(startOfYear);
      end = todayStr;
      break;
    }
    
    case 'Last 7 Days': {
      const startOfRange = new Date(now);
      startOfRange.setDate(now.getDate() - 6);
      start = formatDateToYYYYMMDD(startOfRange);
      end = todayStr;
      break;
    }
    
    case 'Last 30 Days': {
      const startOfRange = new Date(now);
      startOfRange.setDate(now.getDate() - 29);
      start = formatDateToYYYYMMDD(startOfRange);
      end = todayStr;
      break;
    }
    
    case 'Custom':
      start = customStart;
      end = customEnd;
      break;
      
    case 'All Time':
    default:
      start = '';
      end = '';
      break;
  }

  return { start, end };
}

/**
 * Checks if a given item date (YYYY-MM-DD or containing timestamp YYYY-MM-DD HH:mm:ss) 
 * falls within the start and end range bounds.
 */
export function isItemInDateRange(itemDate, start, end) {
  if (!itemDate) return false;
  
  // Extract just the date part (YYYY-MM-DD) if it contains time
  const dateOnlyStr = itemDate.substring(0, 10);
  
  if (start && dateOnlyStr < start) return false;
  if (end && dateOnlyStr > end) return false;
  return true;
}
