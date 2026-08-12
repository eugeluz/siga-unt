/**
 * Formatting helper for dates in Argentina short format (DD/MM/YYYY)
 */
export const formatDateAR = (dateStr: string | Date | null | undefined): string => {
  if (!dateStr) return '—';
  
  // If it's a string like YYYY-MM-DD
  if (typeof dateStr === 'string') {
    const trimmed = dateStr.trim();
    if (!trimmed) return '—';
    
    // Check YYYY-MM-DD format
    const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoMatch) {
      const [, yyyy, mm, dd] = isoMatch;
      return `${dd.padStart(2, '0')}/${mm.padStart(2, '0')}/${yyyy}`;
    }
    
    // If already DD/MM/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
      const [dd, mm, yyyy] = trimmed.split('/');
      return `${dd.padStart(2, '0')}/${mm.padStart(2, '0')}/${yyyy}`;
    }

    // Try parsing Date object
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }
    
    return trimmed;
  }

  if (dateStr instanceof Date && !isNaN(dateStr.getTime())) {
    const dd = String(dateStr.getDate()).padStart(2, '0');
    const mm = String(dateStr.getMonth() + 1).padStart(2, '0');
    const yyyy = dateStr.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  return '—';
};
